#include <WiFi.h>
#include <WiFiManager.h>
#include <Firebase_ESP_Client.h>
#include <NTPClient.h>
#include <WiFiUdp.h>
#include <time.h>
#include "secrets.h"

// Token and RTDB helper inclusions from Firebase library
#include "addons/TokenHelper.h"
#include "addons/RTDBHelper.h"

#define SENSOR_PIN 32
#define BUTTON_PIN 4

// How often today's total is saved to the history record (milliseconds)
#define HISTORY_INTERVAL_MS 60000UL

// How often the device CHECKS whether anything changed in Firebase (milliseconds).
// This is only a tiny check (owner + settings/updated_at). The full settings
// are downloaded only when the owner changed or the user pressed "Save".
#define SETTINGS_INTERVAL_MS 30000UL

// ---------------------------------------------------------------------
// Detection tuning (fixed values)
// ---------------------------------------------------------------------
// Sensor noise filtering
//  • PULSE_DEBOUNCE_US: pulses closer together than this are electrical noise and are ignored.
//    1000 us allows up to 1000 pulses per second, far above what this sensor produces
//    (about 50 Hz at 45 LPM with calibration 1.1).
//  • MIN_PULSE_RATE_HZ / MIN_FLOW_LPM: anything below this is stray pulses or a drip and counts as 0 LPM.
#define PULSE_DEBOUNCE_US 1000UL
#define MIN_PULSE_RATE_HZ 2.0f
#define MIN_FLOW_LPM 0.5f

// Water hammer: flow was >= hammer_threshold_lpm at any of the last
// HAMMER_WINDOW_TICKS readings (1 tick = 1 second) and now it is <= HAMMER_LOW_FLOW_LPM
#define HAMMER_WINDOW_TICKS 3
#define HAMMER_LOW_FLOW_LPM 2.0f
// How long the dashboard shows "Unusual flow" after a hammer event
#define HAMMER_STATUS_HOLD_MS 60000UL
// Minimum gap between two Water Hammer alert records (fixed, not a user setting)
#define HAMMER_COOLDOWN_MS 30000UL

// High flow: flow must stay >= max_flow_threshold for this many ticks (seconds)
#define HIGH_FLOW_CONFIRM_TICKS 3
// High flow is considered "over" again when flow falls below this share of the threshold
#define HIGH_FLOW_CLEAR_RATIO 0.9f

// --- Firebase Objects ---
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

// --- Time / NTP ---
WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP, "pool.ntp.org", 28800, 60000); // UTC+8 for Malaysia

// --- State Variables ---
volatile uint32_t pulseCount = 0;
volatile uint32_t lastPulseMicros = 0;
portMUX_TYPE pulseMux = portMUX_INITIALIZER_UNLOCKED;
unsigned long lastTime = 0;
unsigned long buttonPressTime = 0;
bool buttonPressed = false;

// --- HydroTrack Device State (built-in fallbacks, overwritten by Firebase settings) ---
String claimed_by = "";
float calibration_factor = 1.1;
float max_flow_threshold = 22.0;                 // fallback = 4-person household; the web app sets this from household size
int max_continuous_minutes = 70;                 // fallback = 4-person household
float hammer_threshold_lpm = 7.0;                // fallback = 4-person household

// --- Alert switches and off-hours rule (synced from Firebase) ---
bool alerts_enabled = true;                 // master switch for all alerts
bool hammer_alerts_enabled = true;          // water hammer detection on/off
bool off_hours_alerts_enabled = true;       // off-hours (quiet window) detection on/off
String off_hours_start = "00:00";           // quiet window start (HH:MM)
String off_hours_end = "06:00";             // quiet window end (HH:MM), may cross midnight
int off_hours_min_duration_minutes = 2;     // fallback = 4-person household (whole minutes)

float current_flow = 0.0;
float todays_usage = 0.0;
float highest_flow = 0.0;
String leak_status = "NORMAL";
String alert_reason = "";                   // why leak_status is not NORMAL (shown on dashboard)

// --- Settings sync state ---
unsigned long lastSettingsSync = 0;
bool settingsSynced = false;
double settingsVersion = -1;                // last settings/updated_at that was downloaded (-1 = never)

// --- Alert state ---
unsigned long currentContinuousStart = 0;
unsigned long offHoursFlowStart = 0;
unsigned long lastHammerAlert = 0;
bool continuousAlertSent = false;
bool offHoursAlertSent = false;

uint8_t highFlowTicks = 0;
bool highFlowAlertSent = false;

bool hammerActive = false;
unsigned long hammerStart = 0;
float recentFlow[HAMMER_WINDOW_TICKS] = {0};   // the last few 1-second readings, oldest first

// --- Daily history state ---
String currentDateKey = "";        // YYYY-MM-DD of the day being accumulated
bool historyRestored = false;      // true once today's saved total was read back after boot
unsigned long lastHistoryWrite = 0;
int historyRestoreAttempts = 0;    // failed attempts to read back today's saved total
unsigned long lastDebugPrint = 0;  // throttles the Serial status line

// Interrupt Service Routine for Flow Sensor
// Pulses that arrive closer together than PULSE_DEBOUNCE_US are noise and are dropped.
void IRAM_ATTR pulseCounter() {
    uint32_t now = micros();
    portENTER_CRITICAL_ISR(&pulseMux);
    if ((uint32_t)(now - lastPulseMicros) >= PULSE_DEBOUNCE_US) {
        pulseCount++;
        lastPulseMicros = now;
    }
    portEXIT_CRITICAL_ISR(&pulseMux);
}

// ---------------------------------------------------------------------
// Time helpers (NTP time already includes the UTC+8 offset)
// ---------------------------------------------------------------------
bool getLocalTm(struct tm &ti) {
    if (!timeClient.isTimeSet()) return false;
    time_t raw = (time_t)timeClient.getEpochTime();
    gmtime_r(&raw, &ti);
    return true;
}

String makeDateKey(const struct tm &ti) {
    char buf[11];
    strftime(buf, sizeof(buf), "%Y-%m-%d", &ti); // e.g. "2026-03-12"
    return String(buf);
}

// Converts "HH:MM" into minutes since midnight, or -1 when invalid
int parseMinutes(const String &hhmm) {
    int colon = hhmm.indexOf(':');
    if (colon < 1) return -1;
    int h = hhmm.substring(0, colon).toInt();
    int m = hhmm.substring(colon + 1).toInt();
    if (h < 0 || h > 23 || m < 0 || m > 59) return -1;
    return h * 60 + m;
}

// True when the given minute of the day is inside the quiet window.
// Handles windows that cross midnight (for example 22:00 -> 06:00).
bool inOffHours(int nowMinutes) {
    int s = parseMinutes(off_hours_start);
    int e = parseMinutes(off_hours_end);
    if (s < 0 || e < 0 || s == e) return false;
    if (s < e) return (nowMinutes >= s && nowMinutes < e);
    return (nowMinutes >= s || nowMinutes < e);
}

// True when the last RTDB read failed only because the node does not exist yet
// (for example, the first time ever today's history record is read).
bool lastReadWasPathMissing() {
    if (fbdo.httpCode() == 200 || fbdo.httpCode() == 404) return true;
    String reason = fbdo.errorReason();
    reason.toLowerCase();
    return reason.indexOf("not exist") >= 0 || reason.indexOf("not found") >= 0;
}

// ---------------------------------------------------------------------
// Recent-flow window (used by the water hammer rule)
// ---------------------------------------------------------------------
float peakRecentFlow() {
    float peak = 0.0;
    for (int i = 0; i < HAMMER_WINDOW_TICKS; i++) {
        if (recentFlow[i] > peak) peak = recentFlow[i];
    }
    return peak;
}

void pushRecentFlow(float value) {
    for (int i = 0; i < HAMMER_WINDOW_TICKS - 1; i++) {
        recentFlow[i] = recentFlow[i + 1];
    }
    recentFlow[HAMMER_WINDOW_TICKS - 1] = value;
}

void clearRecentFlow() {
    for (int i = 0; i < HAMMER_WINDOW_TICKS; i++) recentFlow[i] = 0.0;
}

void setup() {
    Serial.begin(115200);

    // Pin setup
    pinMode(SENSOR_PIN, INPUT_PULLUP);
    pinMode(BUTTON_PIN, INPUT_PULLUP);
    attachInterrupt(digitalPinToInterrupt(SENSOR_PIN), pulseCounter, RISING);

    // WiFiManager Setup (Captive Portal Provisioning)
    WiFiManager wm;
    // Set a timeout so it doesn't wait forever if AP is untouched
    wm.setConfigPortalTimeout(180);

    Serial.println("Connecting to WiFi...");
    bool res = wm.autoConnect("HydroTrack_Setup", "password123");
    if (!res) {
        Serial.println("Failed to connect or timeout reached. Restarting...");
        delay(3000);
        ESP.restart();
    }
    Serial.println("WiFi Connected successfully!");

    // Start NTP
    timeClient.begin();

    // Firebase Setup
    config.api_key = FIREBASE_API_KEY;
    config.database_url = FIREBASE_DATABASE_URL;
    auth.user.email = FIREBASE_EMAIL;
    auth.user.password = FIREBASE_PASSWORD;

    // Optional: token status callback for debugging
    config.token_status_callback = tokenStatusCallback;

    Firebase.begin(&config, &auth);
    Firebase.reconnectWiFi(true);
}

void loop() {
    timeClient.update();

    // 1. Push Button Logic: Hold 5s to reset WiFi
    if (digitalRead(BUTTON_PIN) == LOW) {
        if (!buttonPressed) {
            buttonPressed = true;
            buttonPressTime = millis();
        } else if (millis() - buttonPressTime > 5000) {
            Serial.println("Resetting WiFi Credentials! Rebooting...");
            WiFiManager wm;
            wm.resetSettings();
            delay(1000);
            ESP.restart();
        }
    } else {
        buttonPressed = false;
    }

    // 2. Flow Sensor Logic: calculate about once per second
    if (millis() - lastTime >= 1000) {
        // Use the REAL time since the previous tick. Writing to Firebase can block the loop
        // for more than a second; dividing those extra pulses by a fixed 1 second is what
        // used to make the flow jump to double (15 -> 30) for a single reading.
        unsigned long nowMs = millis();
        unsigned long elapsedMs = nowMs - lastTime;
        lastTime = nowMs;
        if (elapsedMs == 0) elapsedMs = 1;
        float elapsedSec = elapsedMs / 1000.0f;

        if (elapsedMs > 1500) {
            Serial.printf("[TICK] late tick: %lu ms since the previous reading (flow is averaged over that time)\n", elapsedMs);
        }

        // Read and reset the pulse counter without losing a pulse
        uint32_t pulses;
        portENTER_CRITICAL(&pulseMux);
        pulses = pulseCount;
        pulseCount = 0;
        portEXIT_CRITICAL(&pulseMux);

        // Flow rate in L/min = pulse frequency (Hz) / calibration factor
        float pulseRate = pulses / elapsedSec;
        float rawFlow = 0.0;
        if (calibration_factor > 0 && pulseRate >= MIN_PULSE_RATE_HZ) {
            rawFlow = pulseRate / calibration_factor;
        }

        // Ignore tiny readings (sensor noise, stray pulses, drips). Without this a
        // floating pin keeps "flow > 0" alive forever and the dashboard never calms down.
        current_flow = (rawFlow < MIN_FLOW_LPM) ? 0.0 : rawFlow;

        // Start a new daily record when the date changes (also saves the finished day)
        handleDayRollover();

        // Add to total usage (Volume = Flow(LPM) x elapsed minutes)
        todays_usage += current_flow * (elapsedSec / 60.0f);

        if (current_flow > highest_flow) {
            highest_flow = current_flow;
        }

        // Track continuous flow time and off-hours flow time
        if (current_flow > 0) {
            if (currentContinuousStart == 0) {
                currentContinuousStart = millis();
                continuousAlertSent = false;
            }

            struct tm ti;
            if (off_hours_alerts_enabled && getLocalTm(ti) && inOffHours(ti.tm_hour * 60 + ti.tm_min)) {
                if (offHoursFlowStart == 0) {
                    offHoursFlowStart = millis();
                    offHoursAlertSent = false;
                }
            } else {
                offHoursFlowStart = 0;
                offHoursAlertSent = false;
            }
        } else {
            currentContinuousStart = 0;
            offHoursFlowStart = 0;
            continuousAlertSent = false;
            offHoursAlertSent = false;
        }

        // Evaluate the four rules, THEN remember this reading for the next tick
        float recentPeak = peakRecentFlow();   // highest of the previous few readings
        checkAlerts(recentPeak);
        pushRecentFlow(current_flow);

        pushLiveData();

        // Status line every 10 seconds so the Serial Monitor shows what is going on
        if (millis() - lastDebugPrint >= 10000UL) {
            lastDebugPrint = millis();
            Serial.printf("[STATUS] flow=%.2f L/min usage=%.3f L status=%s%s%s date=%s owner=%s restored=%s fbReady=%s\n",
                current_flow, todays_usage,
                leak_status.c_str(),
                alert_reason.length() ? " reason=" : "", alert_reason.c_str(),
                currentDateKey.length() ? currentDateKey.c_str() : "(no clock yet)",
                claimed_by.length() ? "yes" : "NO",
                historyRestored ? "yes" : "NO",
                Firebase.ready() ? "yes" : "NO");
        }

        // Save today's total to the history record once a minute
        if (millis() - lastHistoryWrite >= HISTORY_INTERVAL_MS) {
            lastHistoryWrite = millis();
            pushHistory(currentDateKey, false);
        }
    }

    // 3. Check for changes in Firebase: immediately once Firebase is ready, then every 30 seconds.
    //    Only a tiny check; settings are downloaded only when something actually changed.
    if (Firebase.ready() && (!settingsSynced || millis() - lastSettingsSync > SETTINGS_INTERVAL_MS)) {
        lastSettingsSync = millis();
        settingsSynced = true;
        syncSettings();
    }
}

// ---------------------------------------------------------------------
// Daily rollover: close yesterday's record, reset today's counters
// ---------------------------------------------------------------------
void handleDayRollover() {
    struct tm ti;
    if (!getLocalTm(ti)) return; // clock not set yet

    String key = makeDateKey(ti);

    if (currentDateKey == "") {
        currentDateKey = key; // first valid time after boot
        return;
    }

    if (key != currentDateKey) {
        // Finalise the finished day, then start fresh
        pushHistory(currentDateKey, true);
        todays_usage = 0.0;
        highest_flow = 0.0;
        currentDateKey = key;
        historyRestored = true; // a new day has nothing to restore
        lastHistoryWrite = millis();
    }
}

// ---------------------------------------------------------------------
// Alert rules
//
//   1. High flow        flow >= max_flow_threshold for 3 seconds        -> status ALERT while it lasts
//   2. Continuous flow  water never stops for > max_continuous_minutes  -> status LEAK until water stops
//   3. Off-hours flow   sustained flow inside the quiet window          -> status LEAK until water stops
//   4. Water hammer     flow >= hammer_threshold_lpm, then <= 2 LPM
//                       within 3 seconds (max 1 alert / 30 s)           -> status ALERT for 60 seconds
//
// Every rule writes an alert record (the dispatcher emails it).
// leak_status is recalculated from scratch every second, so it always
// returns to NORMAL once nothing is wrong any more.
// ---------------------------------------------------------------------
void resetAlertState() {
    leak_status = "NORMAL";
    alert_reason = "";
    highFlowTicks = 0;
    highFlowAlertSent = false;
    hammerActive = false;
}

void checkAlerts(float recentPeak) {
    if (claimed_by == "") { resetAlertState(); return; } // Need an owner to send alerts to

    // Master switch: keep recording flow, but raise no alerts
    if (!alerts_enabled) { resetAlertState(); return; }

    // ---- 1. High flow ----
    if (current_flow >= max_flow_threshold) {
        if (highFlowTicks < 255) highFlowTicks++;
    } else {
        highFlowTicks = 0;
        if (current_flow < max_flow_threshold * HIGH_FLOW_CLEAR_RATIO) {
            highFlowAlertSent = false; // episode over, the next one may alert again
        }
    }
    bool highFlowActive = highFlowTicks >= HIGH_FLOW_CONFIRM_TICKS;
    if (highFlowActive && !highFlowAlertSent) {
        if (raiseAlert("High Flow", current_flow)) highFlowAlertSent = true;
    }

    // ---- 2. Continuous flow ----
    bool continuousLeak = currentContinuousStart > 0 &&
        (millis() - currentContinuousStart) > ((unsigned long)max_continuous_minutes * 60000UL);
    if (continuousLeak && !continuousAlertSent) {
        if (raiseAlert("Continuous Leak", current_flow)) continuousAlertSent = true;
    }

    // ---- 3. Off-hours flow ----
    bool offHoursLeak = off_hours_alerts_enabled && offHoursFlowStart > 0 &&
        (millis() - offHoursFlowStart) >= ((unsigned long)off_hours_min_duration_minutes * 60000UL);
    if (offHoursLeak && !offHoursAlertSent) {
        if (raiseAlert("Off-Hours Flow", current_flow)) offHoursAlertSent = true;
    }

    // ---- 4. Water hammer: sudden drop from high flow to (almost) nothing ----
    if (hammer_alerts_enabled) {
        bool suddenDrop = (recentPeak >= hammer_threshold_lpm) && (current_flow <= HAMMER_LOW_FLOW_LPM);
        if (suddenDrop) {
            hammerActive = true;
            hammerStart = millis();

            bool cooledDown = (lastHammerAlert == 0) ||
                (millis() - lastHammerAlert > HAMMER_COOLDOWN_MS);
            if (cooledDown && raiseAlert("Water Hammer", recentPeak)) {
                lastHammerAlert = millis();
            }

            clearRecentFlow(); // this drop is handled; don't count it again next second
        }
    } else {
        hammerActive = false;
    }
    if (hammerActive && (millis() - hammerStart) >= HAMMER_STATUS_HOLD_MS) {
        hammerActive = false;
    }

    // ---- Dashboard status (later lines win, so a leak outranks a warning) ----
    leak_status = "NORMAL";
    alert_reason = "";
    if (highFlowActive) { leak_status = "ALERT"; alert_reason = "High flow"; }
    if (hammerActive)   { leak_status = "ALERT"; alert_reason = "Water hammer"; }
    if (offHoursLeak)   { leak_status = "LEAK";  alert_reason = "Off-hours flow"; }
    if (continuousLeak) { leak_status = "LEAK";  alert_reason = "Continuous flow"; }
}

// Writes one alert record with the current date and time. Returns false when
// the alert could not be written (no clock yet, Firebase not ready, or a failed
// write) so the caller can try again on the next tick.
bool raiseAlert(const String &type, float flowRate) {
    struct tm ti;
    if (!getLocalTm(ti)) return false; // need a valid clock for the alert date and time

    char dateStr[20];
    char timeStr[10];
    strftime(dateStr, sizeof(dateStr), "%d %b %Y", &ti); // e.g. "12 Mar 2026"
    strftime(timeStr, sizeof(timeStr), "%H:%M", &ti);    // e.g. "14:05"

    return sendAlert(type, flowRate, String(dateStr), String(timeStr), timeClient.getEpochTime());
}

bool sendAlert(const String &type, float flowRate, const String &dateStr, const String &timeStr, unsigned long ts) {
    if (!Firebase.ready()) return false;

    String path = "/users/" + claimed_by + "/devices/" + String(DEVICE_ID) + "/alerts";
    FirebaseJson json;
    json.set("type", type);
    json.set("flow_rate", flowRate);
    json.set("date", dateStr);
    json.set("time", timeStr);
    json.set("timestamp", (double)(ts * 1000ULL)); // JS expects epoch in ms
    json.set("notified", false);
    json.set("acknowledged", false);

    if (Firebase.RTDB.pushJSON(&fbdo, path, &json)) {
        Serial.println("Pushed Alert: " + type);
        return true;
    }
    Serial.println("Alert push FAILED (" + type + "): " + fbdo.errorReason());
    return false;
}

void pushLiveData() {
    if (!Firebase.ready()) return;

    String path = "/devices/" + String(DEVICE_ID) + "/live_data";
    FirebaseJson json;
    json.set("current_flow", current_flow);
    json.set("todays_usage", todays_usage);
    json.set("highest_flow_rate", highest_flow);
    json.set("leak_status", leak_status);
    json.set("alert_reason", alert_reason);
    json.set("timestamp", (double)(timeClient.getEpochTime() * 1000ULL));

    Firebase.RTDB.setJSON(&fbdo, path, &json);
}

// Saves (or finalises) the daily usage record under the owner's account.
// Path: users/{uid}/devices/{deviceId}/history/{YYYY-MM-DD}
void pushHistory(const String &dateKey, bool closed) {
    if (claimed_by == "" || dateKey == "") return; // history belongs to an owner
    if (!historyRestored) return;                  // never overwrite before reading back today's total
    if (!Firebase.ready()) return;
    if (todays_usage <= 0.0) return;               // nothing used yet

    String path = "/users/" + claimed_by + "/devices/" + String(DEVICE_ID) + "/history/" + dateKey;
    double nowMs = (double)(timeClient.getEpochTime() * 1000ULL);

    FirebaseJson json;
    json.set("date", dateKey);
    json.set("total_volume", roundf(todays_usage * 100.0f) / 100.0f);
    json.set("highest_flow_rate", roundf(highest_flow * 100.0f) / 100.0f);
    json.set("last_updated", nowMs);
    if (closed) {
        json.set("closed_at", nowMs);
    }

    if (Firebase.RTDB.updateNode(&fbdo, path, &json)) {
        Serial.printf("[HISTORY] saved %s total_volume=%.2f L%s\n",
            dateKey.c_str(), todays_usage, closed ? " (day closed)" : "");
    } else {
        Serial.println("[HISTORY] WRITE FAILED: " + fbdo.errorReason());
    }
}

// ---------------------------------------------------------------------
// Settings sync (change-only)
//
// Every 30 seconds the device only reads two tiny values:
//    devices/{id}/claimed_by            (was the device linked / unlinked?)
//    devices/{id}/settings/updated_at   (did the user press "Save settings"?)
// The full settings node is downloaded ONLY when
//    • it has never been downloaded since boot, or
//    • the owner changed (new device registration), or
//    • updated_at changed (the user saved new settings).
// ---------------------------------------------------------------------
bool downloadSettings(const String &path) {
    if (!Firebase.RTDB.getJSON(&fbdo, path + "/settings")) {
        // A missing settings node just means "keep the built-in defaults"
        return lastReadWasPathMissing();
    }

    FirebaseJson &json = fbdo.jsonObject();
    FirebaseJsonData d;

    if (json.get(d, "calibration_factor")) {
        float v = d.to<float>();
        if (v > 0) calibration_factor = v;
    }
    if (json.get(d, "max_flow_threshold")) {
        float v = d.to<float>();
        if (v > 0) max_flow_threshold = v;
    }
    if (json.get(d, "max_continuous_minutes")) {
        int v = d.to<int>();
        if (v > 0) max_continuous_minutes = v;
    }
    if (json.get(d, "hammer_threshold_lpm")) {
        float v = d.to<float>();
        if (v > 0) hammer_threshold_lpm = v;
    }

    if (json.get(d, "alerts_enabled"))            alerts_enabled = d.to<bool>();
    if (json.get(d, "hammer_alerts_enabled"))     hammer_alerts_enabled = d.to<bool>();
    if (json.get(d, "off_hours_alerts_enabled"))  off_hours_alerts_enabled = d.to<bool>();

    if (json.get(d, "off_hours_start"))           off_hours_start = d.to<String>();
    if (json.get(d, "off_hours_end"))             off_hours_end = d.to<String>();

    // Off-hours minimum duration is stored in whole minutes. Devices that were saved
    // before this change only have the old seconds value: convert it (rounded up, min 1).
    bool haveMinutes = false;
    if (json.get(d, "off_hours_min_duration_minutes")) {
        int v = d.to<int>();
        if (v > 0) { off_hours_min_duration_minutes = v; haveMinutes = true; }
    }
    if (!haveMinutes && json.get(d, "off_hours_min_duration_seconds")) {
        int secs = d.to<int>();
        if (secs > 0) off_hours_min_duration_minutes = max(1, (secs + 59) / 60);
    }

    Serial.printf("[SETTINGS] downloaded: cal=%.2f high=%.1f cont=%dmin hammer=%.1f offhours=%dmin alerts=%s\n",
        calibration_factor, max_flow_threshold, max_continuous_minutes,
        hammer_threshold_lpm, off_hours_min_duration_minutes, alerts_enabled ? "on" : "off");
    return true;
}

// After a reboot, read back what was already saved for today so the total does not restart from zero
void restoreHistoryIfNeeded() {
    if (historyRestored || claimed_by == "" || currentDateKey == "") return;

    String hp = "/users/" + claimed_by + "/devices/" + String(DEVICE_ID) + "/history/" + currentDateKey;
    bool ok = false;

    if (Firebase.RTDB.getFloat(&fbdo, hp + "/total_volume")) {
        float saved = fbdo.floatData();
        if (saved > todays_usage) todays_usage = saved;
        ok = true;
        Serial.printf("[HISTORY] restored saved total %.2f L for %s\n", saved, currentDateKey.c_str());
    } else if (lastReadWasPathMissing()) {
        ok = true; // no record yet for today: nothing to restore
        Serial.println("[HISTORY] no record for today yet, starting fresh");
    } else {
        historyRestoreAttempts++;
        Serial.printf("[HISTORY] restore failed (attempt %d, http %d): %s\n",
            historyRestoreAttempts, fbdo.httpCode(), fbdo.errorReason().c_str());

        // Do not stay blocked forever. After 5 failed attempts, carry on unless the
        // failure is a permission problem (401/403), which must be fixed in the rules.
        if (historyRestoreAttempts >= 5 && fbdo.httpCode() != 401 && fbdo.httpCode() != 403) {
            ok = true;
            Serial.println("[HISTORY] giving up on restore, history writes enabled anyway");
        }
    }

    if (ok) {
        if (Firebase.RTDB.getFloat(&fbdo, hp + "/highest_flow_rate")) {
            float savedPeak = fbdo.floatData();
            if (savedPeak > highest_flow) highest_flow = savedPeak;
        }
        historyRestored = true;
    }
}

void syncSettings() {
    String path = "/devices/" + String(DEVICE_ID);
    bool ownerChanged = false;

    // 1. Who claimed the device?
    String previousOwner = claimed_by;
    if (Firebase.RTDB.getString(&fbdo, path + "/claimed_by")) {
        claimed_by = fbdo.stringData();
    } else if (fbdo.httpCode() == 200) {
        // The node exists but is empty: the device has been unlinked
        claimed_by = "";
    }
    if (claimed_by != previousOwner) {
        ownerChanged = true;
        Serial.println("[SETTINGS] owner changed -> " + (claimed_by.length() ? claimed_by : String("(unlinked)")));
    }

    // 2. Did the user press "Save settings"? (one tiny number)
    bool versionReadable = true;
    double version = 0;                      // 0 = settings node has no updated_at yet
    if (Firebase.RTDB.getDouble(&fbdo, path + "/settings/updated_at")) {
        version = fbdo.doubleData();
    } else if (!lastReadWasPathMissing()) {
        versionReadable = false;             // network/permission problem: try again next time
    }

    // 3. Download the full settings only when something changed
    if (versionReadable && (settingsVersion < 0 || ownerChanged || version != settingsVersion)) {
        if (downloadSettings(path)) {
            settingsVersion = version;
        }
    }

    // 4. Restore today's saved usage after a reboot (does nothing once restored)
    restoreHistoryIfNeeded();
}