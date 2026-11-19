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
// How often device settings are re-read from Firebase (milliseconds)
#define SETTINGS_INTERVAL_MS 30000UL

// --- Firebase Objects ---
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

// --- Time / NTP ---
WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP, "pool.ntp.org", 28800, 60000); // UTC+8 for Malaysia

// --- State Variables ---
volatile uint32_t pulseCount = 0;
unsigned long lastTime = 0;
unsigned long buttonPressTime = 0;
bool buttonPressed = false;

// --- HydroTrack Device State ---
String claimed_by = "";
float calibration_factor = 98.0;
float max_flow_threshold = 35.0;
int max_continuous_minutes = 30;
float hammer_threshold_lpm = 60.0;
int hammer_cooldown_seconds = 30;

// --- Alert switches and off-hours rule (synced from Firebase) ---
bool alerts_enabled = true;                 // master switch for all alerts
bool hammer_alerts_enabled = true;          // water hammer detection on/off
bool off_hours_alerts_enabled = true;       // off-hours (quiet window) detection on/off
String off_hours_start = "00:00";           // quiet window start (HH:MM)
String off_hours_end = "06:00";             // quiet window end (HH:MM), may cross midnight
int off_hours_min_duration_seconds = 60;    // sustained flow needed inside the window

float current_flow = 0.0;
float todays_usage = 0.0;
float highest_flow = 0.0;
String leak_status = "NORMAL";

unsigned long lastSettingsSync = 0;
bool settingsSynced = false;
unsigned long currentContinuousStart = 0;
unsigned long offHoursFlowStart = 0;
unsigned long lastHammerAlert = 0;
bool continuousAlertSent = false;

// --- Daily history state ---
String currentDateKey = "";        // YYYY-MM-DD of the day being accumulated
bool historyRestored = false;      // true once today's saved total was read back after boot
unsigned long lastHistoryWrite = 0;
int historyRestoreAttempts = 0;    // failed attempts to read back today's saved total
unsigned long lastDebugPrint = 0;  // throttles the Serial status line

// Interrupt Service Routine for Flow Sensor
void IRAM_ATTR pulseCounter() {
    pulseCount++;
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

    // 2. Flow Sensor Logic: Calculate every 1 second
    if (millis() - lastTime >= 1000) {
        lastTime = millis();
        uint32_t pulses = pulseCount;
        pulseCount = 0; // Reset pulse count

        // Flow rate in L/min = Pulse frequency (Hz) / Calibration Factor
        // Since we evaluate over 1 second, frequency equals total pulses.
        if (calibration_factor > 0) {
            current_flow = (float)pulses / calibration_factor;
        } else {
            current_flow = 0.0;
        }

        // Start a new daily record when the date changes (also saves the finished day)
        handleDayRollover();

        // Add to total usage (Volume = Flow(LPM) / 60 seconds)
        todays_usage += (current_flow / 60.0);

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
                if (offHoursFlowStart == 0) offHoursFlowStart = millis();
            } else {
                offHoursFlowStart = 0;
            }
        } else {
            currentContinuousStart = 0;
            offHoursFlowStart = 0;
            continuousAlertSent = false;
            leak_status = "NORMAL";
        }

        checkAlerts();
        pushLiveData();

        // Status line every 10 seconds so the Serial Monitor shows what is going on
        if (millis() - lastDebugPrint >= 10000UL) {
            lastDebugPrint = millis();
            Serial.printf("[STATUS] flow=%.2f L/min usage=%.3f L date=%s owner=%s restored=%s fbReady=%s\n",
                current_flow, todays_usage,
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

    // 3. Sync Settings from Firebase: immediately once Firebase is ready, then every 30 seconds
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

void checkAlerts() {
    if (claimed_by == "") return; // Need an owner to send alerts to

    // Master switch: keep recording flow, but raise no alerts
    if (!alerts_enabled) {
        leak_status = "NORMAL";
        return;
    }

    struct tm ti;
    if (!getLocalTm(ti)) return; // Need a valid clock for the alert date and time

    unsigned long epoch = timeClient.getEpochTime();

    char dateStr[20];
    char timeStr[10];
    strftime(dateStr, sizeof(dateStr), "%d %b %Y", &ti); // e.g. "12 Mar 2026"
    strftime(timeStr, sizeof(timeStr), "%H:%M", &ti);    // e.g. "14:05"

    bool hammerSpike = hammer_alerts_enabled && (current_flow >= hammer_threshold_lpm);

    bool continuousLeak = currentContinuousStart > 0 &&
        (millis() - currentContinuousStart) > ((unsigned long)max_continuous_minutes * 60000UL);

    bool offHoursLeak = off_hours_alerts_enabled && offHoursFlowStart > 0 &&
        (millis() - offHoursFlowStart) >= ((unsigned long)off_hours_min_duration_seconds * 1000UL);

    // A. Water Hammer Detection (Spikes)
    if (hammerSpike) {
        if (millis() - lastHammerAlert > ((unsigned long)hammer_cooldown_seconds * 1000UL)) {
            sendAlert("Water Hammer Detected", current_flow, String(dateStr), String(timeStr), epoch);
            lastHammerAlert = millis();
            leak_status = "ALERT";
        }
    }
    // B. Continuous Leak Detection (long run of flow, or sustained flow in the quiet window)
    else if (continuousLeak || offHoursLeak) {
        leak_status = "LEAK";
        if (!continuousAlertSent) {
            sendAlert("Continuous Leak", current_flow, String(dateStr), String(timeStr), epoch);
            continuousAlertSent = true;
        }
    }
    // C. Standard High Flow (status only, no alert record)
    else if (current_flow >= max_flow_threshold) {
        leak_status = "ALERT";
    }
}

void sendAlert(String type, float flowRate, String dateStr, String timeStr, unsigned long ts) {
    String path = "/users/" + claimed_by + "/devices/" + String(DEVICE_ID) + "/alerts";
    FirebaseJson json;
    json.set("type", type);
    json.set("flow_rate", flowRate);
    json.set("date", dateStr);
    json.set("time", timeStr);
    json.set("timestamp", (double)(ts * 1000ULL)); // JS expects epoch in ms
    json.set("notified", false);
    json.set("acknowledged", false);

    Firebase.RTDB.pushJSON(&fbdo, path, &json);
    Serial.println("Pushed Alert: " + type);
}

void pushLiveData() {
    if (!Firebase.ready()) return;

    String path = "/devices/" + String(DEVICE_ID) + "/live_data";
    FirebaseJson json;
    json.set("current_flow", current_flow);
    json.set("todays_usage", todays_usage);
    json.set("highest_flow_rate", highest_flow);
    json.set("leak_status", leak_status);
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

void syncSettings() {
    String path = "/devices/" + String(DEVICE_ID);

    // Check who claimed the device
    if (Firebase.RTDB.getString(&fbdo, path + "/claimed_by")) {
        claimed_by = fbdo.stringData();
    } else if (fbdo.httpCode() == 200) {
        // The node exists but is empty: the device has been unlinked
        claimed_by = "";
    }

    // Sync numerical settings
    if (Firebase.RTDB.getFloat(&fbdo, path + "/settings/calibration_factor")) {
        calibration_factor = fbdo.floatData();
    }
    if (Firebase.RTDB.getFloat(&fbdo, path + "/settings/max_flow_threshold")) {
        max_flow_threshold = fbdo.floatData();
    }
    if (Firebase.RTDB.getInt(&fbdo, path + "/settings/max_continuous_minutes")) {
        max_continuous_minutes = fbdo.intData();
    }
    if (Firebase.RTDB.getFloat(&fbdo, path + "/settings/hammer_threshold_lpm")) {
        hammer_threshold_lpm = fbdo.floatData();
    }
    if (Firebase.RTDB.getInt(&fbdo, path + "/settings/hammer_cooldown_seconds")) {
        hammer_cooldown_seconds = fbdo.intData();
    }

    // Sync alert switches
    if (Firebase.RTDB.getBool(&fbdo, path + "/settings/alerts_enabled")) {
        alerts_enabled = fbdo.boolData();
    }
    if (Firebase.RTDB.getBool(&fbdo, path + "/settings/hammer_alerts_enabled")) {
        hammer_alerts_enabled = fbdo.boolData();
    }
    if (Firebase.RTDB.getBool(&fbdo, path + "/settings/off_hours_alerts_enabled")) {
        off_hours_alerts_enabled = fbdo.boolData();
    }

    // Sync off-hours window
    if (Firebase.RTDB.getString(&fbdo, path + "/settings/off_hours_start")) {
        off_hours_start = fbdo.stringData();
    }
    if (Firebase.RTDB.getString(&fbdo, path + "/settings/off_hours_end")) {
        off_hours_end = fbdo.stringData();
    }
    if (Firebase.RTDB.getInt(&fbdo, path + "/settings/off_hours_min_duration_seconds")) {
        off_hours_min_duration_seconds = fbdo.intData();
    }

    // After a reboot, read back what was already saved for today so the total does not restart from zero
    if (!historyRestored && claimed_by != "" && currentDateKey != "") {
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
}
