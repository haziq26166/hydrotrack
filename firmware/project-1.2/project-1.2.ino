/* ============================================================================
   HydroTrack — ESP32 Water Flow Monitoring Firmware
   ============================================================================
   User-scoped history & alerts
   - live_data  → devices/{DEVICE_ID}/live_data
   - settings   → devices/{DEVICE_ID}/settings
   - history    → users/{ownerUid}/devices/{DEVICE_ID}/history/{YYYY-MM-DD}
   - alerts     → users/{ownerUid}/devices/{DEVICE_ID}/alerts

   Alert rules
   -----------
   1. High Flow           — filtered flow > max_flow_threshold
   2. Continuous Leak     — filtered flow sustained > max_continuous_minutes
   3. Off-Hours Flow      — flow during quiet window for > grace seconds
   4. Water Hammer        — RAW spike > hammer_threshold lasting 1–3 ticks

   Water hammer uses RAW readings because the median-of-5 filter suppresses
   single-tick anomalies — which is exactly what a hammer event produces.

   Flow conversion (YF-S401)
   -------------------------
   The sensor outputs  f(Hz) = calibrationFactor × Q(LPM)  with a default
   calibrationFactor of 98 (Hz per LPM).  Therefore
       Q (LPM) = (pulses / elapsed_seconds) / calibrationFactor
   ============================================================================ */

#include <WiFi.h>
#include <WiFiManager.h>
#include <Firebase_ESP_Client.h>
#include <time.h>

#include "addons/TokenHelper.h"
#include "addons/RTDBHelper.h"
#include "secrets.h"

/* ==========================================
   1. HARDWARE
   ========================================== */
#define FLOW_SENSOR_PIN   32
#define RESET_BUTTON_PIN  13

/* ==========================================
   2. FIREBASE
   ========================================== */
FirebaseData   fbdo;
FirebaseAuth   auth;
FirebaseConfig config;

/* ==========================================
   3. STATE & RUNTIME CONFIG
   ========================================== */
volatile unsigned long pulseCount = 0;
portMUX_TYPE           mux        = portMUX_INITIALIZER_UNLOCKED;

float  rawFlowRate       = 0.0f;   /* unfiltered — used for hammer detection */
float  flowRate          = 0.0f;   /* filtered   — used everywhere else */
float  todaysUsageLiters = 0.0f;
float  maxFlowRateToday  = 0.0f;
String leakStatus        = "NORMAL";

/* ---- Median-of-5 rolling filter ---- */
const int   FLOW_FILTER_SIZE = 5;
float       flowFilterBuf[FLOW_FILTER_SIZE] = {0.0f};
int         flowFilterCount  = 0;
int         flowFilterHead   = 0;

/* ---- Water hammer detection state ---- */
bool          hammerAlertsEnabled = true;
float         hammerThresholdLpm  = 60.0f;
unsigned long hammerCooldownMs    = 30000UL;
const int     HAMMER_MAX_SPIKE_TICKS = 3;   /* longer = real high flow, not hammer */

int           hammerSpikeTicks   = 0;
float         hammerSpikePeak    = 0.0f;
unsigned long lastHammerAlertMs  = 0;

/* Owner (resolved from devices/{id}/claimed_by). Empty = unclaimed. */
String ownerUid      = "";
String lastSeenOwner = "";

/* Configurable thresholds */
float         calibrationFactor    = 98.0f;
float         maxFlowThreshold     = 35.0f;
unsigned long maxContinuousSeconds = 1800UL;
bool          alertsEnabled        = true;

/* Off-hours flow alerts */
bool  offHoursAlertsEnabled = true;
int   offHoursStartMins     = 0;
int   offHoursEndMins       = 360;
float offHoursGraceSeconds  = 60.0f;

/* Timing */
unsigned long previousMillis = 0;
const unsigned long interval = 1000UL;

unsigned long lastSettingsFetchMs       = 0;
const unsigned long SETTINGS_REFRESH_MS = 60000UL;

unsigned long lastHeartbeatMs             = 0;
const unsigned long HEARTBEAT_INTERVAL_MS = 30000UL;

unsigned long lastHistoryPersistMs              = 0;
const unsigned long HISTORY_PERSIST_INTERVAL_MS = 30000UL;

/* Reset-button state */
unsigned long buttonPressTime = 0;
bool          isButtonPressed = false;
int           stableBtnState  = HIGH;
unsigned long lastBtnChangeMs = 0;
const unsigned long resetHoldTime      = 5000UL;
const unsigned long BUTTON_DEBOUNCE_MS = 50UL;

/* Leak tracking */
float         continuousFlowSeconds = 0.0f;
unsigned long lastFlowSeenMs        = 0;
const unsigned long FLOW_GAP_GRACE_MS = 5000UL;
const float         MIN_FLOW_LPM      = 0.1f;

/* Alert de-dup */
bool alertLoggedForCurrentEvent = false;
bool offHoursAlertLogged        = false;
bool flowStartedInOffHours      = false;

/* Date tracking */
String currentDateStr = "";

/* Restore state machine */
enum RestoreState { RESTORE_PENDING, RESTORE_DONE };
RestoreState  restoreState         = RESTORE_PENDING;
unsigned long lastRestoreAttemptMs = 0;
const unsigned long RESTORE_RETRY_MS = 10000UL;

/* NTP — Malaysia (UTC+8) */
const char *ntpServer          = "pool.ntp.org";
const long  gmtOffset_sec      = 8 * 3600;
const int   daylightOffset_sec = 0;

const time_t MIN_VALID_EPOCH = 1700000000UL;

/* ==========================================
   4. ISR
   ========================================== */
void IRAM_ATTR pulseCounter() {
    portENTER_CRITICAL_ISR(&mux);
    pulseCount++;
    portEXIT_CRITICAL_ISR(&mux);
}

/* ==========================================
   5. FLOW FILTER — median of up to N samples
   ========================================== */
static void sortAscending(float *arr, int n) {
    for (int i = 1; i < n; i++) {
        float key = arr[i];
        int   j   = i - 1;
        while (j >= 0 && arr[j] > key) {
            arr[j + 1] = arr[j];
            j--;
        }
        arr[j + 1] = key;
    }
}

float medianFilter(float newSample) {
    flowFilterBuf[flowFilterHead] = newSample;
    flowFilterHead = (flowFilterHead + 1) % FLOW_FILTER_SIZE;
    if (flowFilterCount < FLOW_FILTER_SIZE) flowFilterCount++;

    float sorted[FLOW_FILTER_SIZE];
    for (int i = 0; i < flowFilterCount; i++) sorted[i] = flowFilterBuf[i];
    sortAscending(sorted, flowFilterCount);

    return sorted[flowFilterCount / 2];
}

/* ==========================================
   6. TIME HELPERS
   ========================================== */
String getCurrentDateString() {
    struct tm timeinfo;
    if (!getLocalTime(&timeinfo)) return "UNKNOWN_DATE";
    char buf[11];
    strftime(buf, sizeof(buf), "%Y-%m-%d", &timeinfo);
    return String(buf);
}

String getCurrentTimeString() {
    struct tm timeinfo;
    if (!getLocalTime(&timeinfo)) return "UNKNOWN_TIME";
    char buf[9];
    strftime(buf, sizeof(buf), "%H:%M:%S", &timeinfo);
    return String(buf);
}

int parseTimeToMinutes(const String &hhmm) {
    int colon = hhmm.indexOf(':');
    if (colon < 0) return -1;
    int h = hhmm.substring(0, colon).toInt();
    int m = hhmm.substring(colon + 1).toInt();
    if (h < 0 || h > 23) return -1;
    if (m < 0 || m > 59) return -1;
    return h * 60 + m;
}

int getCurrentMinutes() {
    struct tm timeinfo;
    if (!getLocalTime(&timeinfo)) return -1;
    return timeinfo.tm_hour * 60 + timeinfo.tm_min;
}

bool isWithinOffHours(int currentMins, int startMins, int endMins) {
    if (currentMins < 0 || startMins < 0 || endMins < 0) return false;
    if (startMins == endMins) return false;
    if (startMins < endMins) return currentMins >= startMins && currentMins < endMins;
    return currentMins >= startMins || currentMins < endMins;
}

/* ==========================================
   7. FIREBASE HELPERS
   ========================================== */

/* Round to 2 decimals so stored values match the DECIMAL(x,2) data dictionary */
static float round2(float v) { return roundf(v * 100.0f) / 100.0f; }

String liveDataPath()  { return "/devices/" + String(DEVICE_ID) + "/live_data"; }
String heartbeatPath() { return "/devices/" + String(DEVICE_ID) + "/live_data/last_seen"; }
String settingsPath()  { return "/devices/" + String(DEVICE_ID) + "/settings"; }
String claimedByPath() { return "/devices/" + String(DEVICE_ID) + "/claimed_by"; }

String userDeviceBase() {
    if (ownerUid.length() == 0) return "";
    return "/users/" + ownerUid + "/devices/" + String(DEVICE_ID);
}

void fetchDeviceSettings() {
    if (!Firebase.ready()) return;

    /* ---- Resolve owner ---- */
    if (Firebase.RTDB.getString(&fbdo, claimedByPath().c_str())) {
        String newOwner = fbdo.stringData();
        if (newOwner != ownerUid) {
            ownerUid = newOwner;
            Serial.println("[Owner] UID = " +
                           (ownerUid.length() ? ownerUid : String("(unclaimed)")));
        }
    } else {
        String reason = fbdo.errorReason();
        if (reason.indexOf("not") >= 0 || reason.indexOf("null") >= 0) {
            if (ownerUid.length() != 0) {
                ownerUid = "";
                Serial.println("[Owner] UID = (unclaimed)");
            }
        }
    }

    /* ---- Settings ---- */
    if (Firebase.RTDB.getJSON(&fbdo, settingsPath().c_str())) {
        FirebaseJson *json = fbdo.jsonObjectPtr();
        if (!json) return;

        FirebaseJsonData data;

        json->get(data, "calibration_factor");
        if (data.success) calibrationFactor = data.floatValue;

        json->get(data, "max_flow_threshold");
        if (data.success) maxFlowThreshold = data.floatValue;

        json->get(data, "max_continuous_minutes");
        if (data.success) maxContinuousSeconds = (unsigned long)data.intValue * 60UL;

        json->get(data, "alerts_enabled");
        if (data.success) alertsEnabled = data.boolValue;

        /* ---- off-hours rule ---- */
        json->get(data, "off_hours_alerts_enabled");
        if (data.success) offHoursAlertsEnabled = data.boolValue;

        json->get(data, "off_hours_start");
        if (data.success) {
            int mins = parseTimeToMinutes(data.stringValue);
            if (mins >= 0) offHoursStartMins = mins;
        }

        json->get(data, "off_hours_end");
        if (data.success) {
            int mins = parseTimeToMinutes(data.stringValue);
            if (mins >= 0) offHoursEndMins = mins;
        }

        json->get(data, "off_hours_min_duration_seconds");
        if (data.success) offHoursGraceSeconds = (float)data.intValue;

        /* ---- water hammer rule ---- */
        json->get(data, "hammer_alerts_enabled");
        if (data.success) hammerAlertsEnabled = data.boolValue;

        json->get(data, "hammer_threshold_lpm");
        if (data.success) hammerThresholdLpm = data.floatValue;

        json->get(data, "hammer_cooldown_seconds");
        if (data.success) hammerCooldownMs = (unsigned long)data.intValue * 1000UL;

        Serial.printf("[Settings] cal=%.1f  maxFlow=%.1f  maxCont=%lus  alerts=%s\n",
                      calibrationFactor, maxFlowThreshold,
                      maxContinuousSeconds, alertsEnabled ? "on" : "off");
        Serial.printf("[Settings] offHours=%s  window=%02d:%02d→%02d:%02d  grace=%.0fs\n",
                      offHoursAlertsEnabled ? "on" : "off",
                      offHoursStartMins / 60, offHoursStartMins % 60,
                      offHoursEndMins / 60,   offHoursEndMins % 60,
                      offHoursGraceSeconds);
        Serial.printf("[Settings] hammer=%s  threshold=%.1f LPM  cooldown=%lus\n",
                      hammerAlertsEnabled ? "on" : "off",
                      hammerThresholdLpm, hammerCooldownMs / 1000UL);
    }
}

/* ---------- History persist / restore -------------------------------- */

bool persistDailyHistory(const String &dateStr, bool closed) {
    if (!Firebase.ready())         return false;
    if (dateStr == "UNKNOWN_DATE") return false;

    String base = userDeviceBase();
    if (base.length() == 0) return false;

    String path = base + "/history/" + dateStr;

    FirebaseJson json;
    json.set("total_volume",      round2(todaysUsageLiters));
    json.set("highest_flow_rate", round2(maxFlowRateToday));
    json.set("date",              dateStr);
    json.set("last_updated/.sv",  "timestamp");
    if (closed) json.set("closed_at/.sv", "timestamp");

    if (Firebase.RTDB.setJSON(&fbdo, path.c_str(), &json)) {
        Serial.printf("[History] %s %s : %.2f L (peak %.2f LPM)\n",
                      closed ? "closed" : "persisted",
                      dateStr.c_str(), todaysUsageLiters, maxFlowRateToday);
        return true;
    }
    Serial.println("[History] Persist FAILED: " + fbdo.errorReason());
    return false;
}

void tryRestoreFromHistory(unsigned long now) {
    if (restoreState != RESTORE_PENDING)      return;
    if (currentDateStr == "")                 return;
    if (!Firebase.ready())                    return;
    if (ownerUid.length() == 0) return;
    if (lastRestoreAttemptMs != 0 &&
        now - lastRestoreAttemptMs < RESTORE_RETRY_MS) return;

    lastRestoreAttemptMs = now;

    String path = userDeviceBase() + "/history/" + currentDateStr;

    if (Firebase.RTDB.getJSON(&fbdo, path.c_str())) {
        FirebaseJson *json = fbdo.jsonObjectPtr();
        if (json) {
            FirebaseJsonData data;
            json->get(data, "total_volume");
            if (data.success) todaysUsageLiters = data.floatValue;
            json->get(data, "highest_flow_rate");
            if (data.success) maxFlowRateToday = data.floatValue;

            Serial.printf("[History] Restored %s → %.2f L (peak %.2f LPM)\n",
                          currentDateStr.c_str(),
                          todaysUsageLiters, maxFlowRateToday);
        }
        restoreState = RESTORE_DONE;
        return;
    }

    String reason = fbdo.errorReason();
    if (reason.indexOf("not exist") >= 0 ||
        reason.indexOf("Not Found")  >= 0 ||
        reason.indexOf("not found")  >= 0) {
        Serial.printf("[History] No prior record for %s — starting fresh\n",
                      currentDateStr.c_str());
        restoreState = RESTORE_DONE;
        return;
    }
    Serial.println("[History] Restore error, will retry: " + reason);
}

/* ---------- Alert log + live data ------------------------------------ */

void logAlertToFirebase(const String &alertType, float flowValue) {
    if (!Firebase.ready()) return;

    String base = userDeviceBase();
    if (base.length() == 0) {
        Serial.println("[Alert] Skipped — device unclaimed");
        return;
    }

    FirebaseJson alertJson;
    alertJson.set("type",          alertType);
    alertJson.set("time",          getCurrentTimeString());
    alertJson.set("date",          getCurrentDateString());
    alertJson.set("flow_rate",     round2(flowValue));
    alertJson.set("notified",      false);
    alertJson.set("timestamp/.sv", "timestamp");

    if (Firebase.RTDB.pushJSON(&fbdo, (base + "/alerts").c_str(), &alertJson)) {
        Serial.println("[Alert] Logged: " + alertType);
    } else {
        Serial.println("[Alert] Failed: " + fbdo.errorReason());
    }
}

void pushLiveData() {
    if (!Firebase.ready()) return;

    FirebaseJson json;
    json.set("current_flow",      round2(flowRate));
    json.set("todays_usage",      round2(todaysUsageLiters));
    json.set("highest_flow_rate", round2(maxFlowRateToday));
    json.set("leak_status",       leakStatus);
    json.set("timestamp/.sv",     "timestamp");

    /* updateNode MERGES into live_data, so the last_seen value written by
       pushHeartbeat() is preserved (setJSON would replace the whole node). */
    if (!Firebase.RTDB.updateNode(&fbdo, liveDataPath().c_str(), &json)) {
        Serial.println("[Live] Push failed: " + fbdo.errorReason());
    }
}

void pushHeartbeat() {
    if (!Firebase.ready()) return;
    time_t now = time(nullptr);
    if (now < MIN_VALID_EPOCH) return;
    Firebase.RTDB.setInt(&fbdo, heartbeatPath().c_str(), (int)now);
}

/* ==========================================
   8. RESET BUTTON (debounced)
   ========================================== */
void handleResetButton(unsigned long now) {
    int reading = digitalRead(RESET_BUTTON_PIN);

    if (reading != stableBtnState) {
        if (now - lastBtnChangeMs > BUTTON_DEBOUNCE_MS) {
            lastBtnChangeMs = now;
            stableBtnState  = reading;

            if (stableBtnState == LOW) {
                buttonPressTime = now;
                isButtonPressed = true;
            } else {
                isButtonPressed = false;
            }
        }
    }

    if (isButtonPressed && stableBtnState == LOW &&
        (now - buttonPressTime >= resetHoldTime)) {
        Serial.println("[Reset] Wiping WiFi credentials...");
        WiFiManager wm;
        wm.resetSettings();
        delay(1000);
        ESP.restart();
    }
}

/* ==========================================
   9. SETUP
   ========================================== */
void setup() {
    Serial.begin(115200);
    delay(200);

    pinMode(FLOW_SENSOR_PIN, INPUT_PULLUP);
    pinMode(RESET_BUTTON_PIN, INPUT_PULLUP);
    attachInterrupt(digitalPinToInterrupt(FLOW_SENSOR_PIN), pulseCounter, FALLING);

    Serial.println("\n=== HydroTrack Firmware ===");
    Serial.println("Device: " DEVICE_ID);

    WiFiManager wifiManager;
    wifiManager.setConfigPortalTimeout(180);
    wifiManager.setAPCallback([](WiFiManager *wm) {
        Serial.println("[WiFi] Config portal started: " + wm->getConfigPortalSSID());
    });

    if (!wifiManager.autoConnect(WIFI_AP_NAME, WIFI_AP_PASSWORD)) {
        Serial.println("[WiFi] Failed to connect. Rebooting in 3s...");
        delay(3000);
        ESP.restart();
    }
    Serial.println("[WiFi] Connected: " + WiFi.localIP().toString());

    configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
    Serial.print("[NTP] Syncing");
    for (int i = 0; i < 20; i++) {
        struct tm timeinfo;
        if (getLocalTime(&timeinfo)) {
            currentDateStr = getCurrentDateString();
            Serial.printf("\n[NTP] Synced: %04d-%02d-%02d\n",
                          timeinfo.tm_year + 1900, timeinfo.tm_mon + 1, timeinfo.tm_mday);
            break;
        }
        Serial.print(".");
        delay(500);
    }
    if (currentDateStr == "") {
        Serial.println("\n[NTP] Sync pending — will auto-initialize.");
    }

    config.api_key      = FIREBASE_API_KEY;
    config.database_url = FIREBASE_DB_URL;
    auth.user.email     = FIREBASE_USER_EMAIL;
    auth.user.password  = FIREBASE_USER_PASSWORD;
    config.token_status_callback = tokenStatusCallback;

    Firebase.begin(&config, &auth);
    Firebase.reconnectWiFi(true);

    Serial.println("[Firebase] Init complete.");

    /* ---- Wait for first token, resolve owner, restore counters ---- */
    Serial.print("[Boot] Waiting for Firebase auth");
    unsigned long authWaitStart = millis();
    while (!Firebase.ready() && millis() - authWaitStart < 10000UL) {
        Serial.print(".");
        delay(100);
    }
    Serial.println(Firebase.ready() ? " ready" : " timed out — will retry in loop");

    fetchDeviceSettings();

    if (currentDateStr != "" && ownerUid.length() > 0) {
        Serial.println("[Boot] Restoring today's counters before first push…");
        tryRestoreFromHistory(millis());
    } else if (ownerUid.length() == 0) {
        Serial.println("[Boot] Device is unclaimed — nothing to restore");
    } else {
        Serial.println("[Boot] NTP not synced yet — restore deferred to loop");
    }

    lastSettingsFetchMs = millis();
    lastSeenOwner       = ownerUid;

    Serial.printf("[Boot] Ready — today=%s  owner=%s  usage=%.2f L  peak=%.2f LPM\n",
                  currentDateStr.c_str(),
                  ownerUid.length() ? ownerUid.c_str() : "(none)",
                  todaysUsageLiters, maxFlowRateToday);
}

/* ==========================================
   10. LOOP
   ========================================== */
void loop() {
    unsigned long now = millis();

    /* --- A. Reset button --- */
    handleResetButton(now);

    /* --- B. Settings + owner refresh --- */
    if (now - lastSettingsFetchMs >= SETTINGS_REFRESH_MS) {
        lastSettingsFetchMs = now;
        fetchDeviceSettings();
    }

    /* --- B2. Owner change detection --- */
    if (ownerUid != lastSeenOwner) {
        Serial.print("[Owner] Changed: '");
        Serial.print(lastSeenOwner.length() ? lastSeenOwner : "(none)");
        Serial.print("' → '");
        Serial.print(ownerUid.length() ? ownerUid : "(none)");
        Serial.println("'");

        lastSeenOwner              = ownerUid;
        todaysUsageLiters          = 0.0f;
        maxFlowRateToday           = 0.0f;
        continuousFlowSeconds      = 0.0f;
        alertLoggedForCurrentEvent = false;
        offHoursAlertLogged        = false;
        flowStartedInOffHours      = false;
        restoreState               = RESTORE_PENDING;
        lastRestoreAttemptMs       = 0;

        /* Reset filters so stale samples don't bleed in */
        for (int i = 0; i < FLOW_FILTER_SIZE; i++) flowFilterBuf[i] = 0.0f;
        flowFilterCount = 0;
        flowFilterHead  = 0;
        flowRate        = 0.0f;

        hammerSpikeTicks  = 0;
        hammerSpikePeak   = 0.0f;
        lastHammerAlertMs = 0;
    }

    /* --- C. Date tracking + rollover --- */
    String todayStr = getCurrentDateString();

    if (todayStr != "UNKNOWN_DATE") {
        if (currentDateStr == "") {
            currentDateStr = todayStr;
            Serial.println("[Date] Today = " + currentDateStr);
        }

        if (todayStr != currentDateStr) {
            Serial.printf("[Date] Rollover %s → %s\n",
                          currentDateStr.c_str(), todayStr.c_str());

            persistDailyHistory(currentDateStr, /*closed=*/true);

            todaysUsageLiters          = 0.0f;
            maxFlowRateToday           = 0.0f;
            continuousFlowSeconds      = 0.0f;
            alertLoggedForCurrentEvent = false;
            offHoursAlertLogged        = false;
            flowStartedInOffHours      = false;

            currentDateStr = todayStr;
            persistDailyHistory(currentDateStr, /*closed=*/false);
        }
    }

    /* --- D. Retry history restore --- */
    tryRestoreFromHistory(now);

    /* --- E. Telemetry interval (1 s) --- */
    if (now - previousMillis >= interval) {
        unsigned long elapsed = now - previousMillis;
        previousMillis = now;

        unsigned long currentPulses;
        portENTER_CRITICAL(&mux);
        currentPulses = pulseCount;
        pulseCount    = 0;
        portEXIT_CRITICAL(&mux);

        if (elapsed == 0) elapsed = 1;

        /* ---- Raw reading ---- */
        /* YF-S401: f(Hz) = calibrationFactor × Q(LPM)  =>  Q = (pulses / seconds) / calibrationFactor */
        rawFlowRate = ((float)currentPulses * 1000.0f) / (calibrationFactor * (float)elapsed);

        /* ---- Median-of-5 filter → filtered rate used everywhere else ---- */
        flowRate = medianFilter(rawFlowRate);

        if (flowRate > maxFlowRateToday) maxFlowRateToday = flowRate;

        float elapsedSeconds = (float)elapsed / 1000.0f;

        /* ============================================================
           WATER HAMMER DETECTION — runs on RAW readings, before other
           rules, so its state machine isn't confused by the filter.

           A hammer is:
             • 1 to HAMMER_MAX_SPIKE_TICKS consecutive raw ticks above
               hammerThresholdLpm, immediately followed by a return to
               normal flow. Longer spikes are treated as real high flow.
             • Rate-limited by hammerCooldownMs to avoid a burst of
               alerts from a single event.
           ============================================================ */
        if (rawFlowRate > hammerThresholdLpm) {
            /* Rising or continuing spike */
            if (hammerSpikeTicks == 0) {
                hammerSpikePeak = rawFlowRate;
            } else if (rawFlowRate > hammerSpikePeak) {
                hammerSpikePeak = rawFlowRate;
            }
            hammerSpikeTicks++;

            if (hammerSpikeTicks > HAMMER_MAX_SPIKE_TICKS) {
                /* Too long to be a hammer — reset so sustained high flow
                   is handled by rule #1 instead. */
                hammerSpikeTicks = 0;
                hammerSpikePeak  = 0.0f;
            }
        } else {
            /* Flow has returned to normal. If we were tracking a short
               spike that just ended, this is a water hammer. */
            if (hammerSpikeTicks > 0 &&
                hammerSpikeTicks <= HAMMER_MAX_SPIKE_TICKS) {

                bool cooldownOk = (lastHammerAlertMs == 0) ||
                                  (now - lastHammerAlertMs > hammerCooldownMs);

                if (alertsEnabled && hammerAlertsEnabled && cooldownOk) {
                    Serial.printf("[Hammer] Spike %.1f LPM over %d tick(s)\n",
                                  hammerSpikePeak, hammerSpikeTicks);
                    logAlertToFirebase("Water Hammer Detected", hammerSpikePeak);
                    lastHammerAlertMs = now;
                }
            }
            hammerSpikeTicks = 0;
            hammerSpikePeak  = 0.0f;
        }

        /* ---- Flow accumulation + start-of-event detection ---- */
        if (flowRate > MIN_FLOW_LPM) {
            if (continuousFlowSeconds == 0.0f) {
                flowStartedInOffHours = isWithinOffHours(
                    getCurrentMinutes(), offHoursStartMins, offHoursEndMins);
            }

            todaysUsageLiters += (flowRate / 60.0f) * elapsedSeconds;
            lastFlowSeenMs = now;
            continuousFlowSeconds += elapsedSeconds;

        } else if (now - lastFlowSeenMs > FLOW_GAP_GRACE_MS) {
            continuousFlowSeconds      = 0.0f;
            alertLoggedForCurrentEvent = false;
            offHoursAlertLogged        = false;
            flowStartedInOffHours      = false;
        }

        /* ---- Rule 1 + 2: High Flow / Continuous Leak ---- */
        if (alertsEnabled) {
            if ((unsigned long)continuousFlowSeconds > maxContinuousSeconds ||
                flowRate > maxFlowThreshold) {
                leakStatus = "LEAK";
                if (!alertLoggedForCurrentEvent) {
                    logAlertToFirebase(flowRate > maxFlowThreshold
                        ? "High Flow Alert"
                        : "Continuous Leak Warning", flowRate);
                    alertLoggedForCurrentEvent = true;
                }
            } else {
                leakStatus = "NORMAL";
            }
        } else {
            leakStatus = "NORMAL";
        }

        /* ---- Rule 3: Off-Hours Flow ---- */
        if (offHoursAlertsEnabled
            && !offHoursAlertLogged
            && flowStartedInOffHours
            && continuousFlowSeconds > offHoursGraceSeconds) {
            logAlertToFirebase("Off-Hours Flow Detected", flowRate);
            offHoursAlertLogged = true;
        }

        Serial.printf("[%lus] Raw: %.2f | Filt: %.2f LPM | Peak: %.2f | Today: %.2f L | Leak: %s | Hammer: %d/%d | Owner: %s\n",
                      now / 1000UL, rawFlowRate, flowRate, maxFlowRateToday,
                      todaysUsageLiters, leakStatus.c_str(),
                      hammerSpikeTicks, HAMMER_MAX_SPIKE_TICKS,
                      ownerUid.length() ? ownerUid.c_str() : "none");

        /* ---- Defer live-data push until restore has finished ---- */
        if (ownerUid.length() > 0 && restoreState == RESTORE_DONE) {
            pushLiveData();
        }
    }

    /* --- F. History persist interval (30 s) --- */
    if (now - lastHistoryPersistMs >= HISTORY_PERSIST_INTERVAL_MS) {
        lastHistoryPersistMs = now;
        if (currentDateStr != "") {
            persistDailyHistory(currentDateStr, /*closed=*/false);
        }
    }

    /* --- G. Heartbeat (30 s) --- */
    if (now - lastHeartbeatMs >= HEARTBEAT_INTERVAL_MS) {
        lastHeartbeatMs = now;
        pushHeartbeat();
    }
}