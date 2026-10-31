#include <WiFi.h>
#include <WiFiManager.h>
#include <Firebase_ESP_Client.h>
#include <NTPClient.h>
#include <WiFiUdp.h>
#include "secrets.h"

// Token and RTDB helper inclusions from Firebase library
#include "addons/TokenHelper.h"
#include "addons/RTDBHelper.h"

#define SENSOR_PIN 32
#define BUTTON_PIN 4

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

float current_flow = 0.0;
float todays_usage = 0.0;
float highest_flow = 0.0;
String leak_status = "NORMAL";

unsigned long lastSettingsSync = 0;
unsigned long currentContinuousStart = 0;
unsigned long lastHammerAlert = 0;
bool continuousAlertSent = false;

// Interrupt Service Routine for Flow Sensor
void IRAM_ATTR pulseCounter() {
    pulseCount++;
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

        // Add to total usage (Volume = Flow(LPM) / 60 seconds)
        todays_usage += (current_flow / 60.0);

        if (current_flow > highest_flow) {
            highest_flow = current_flow;
        }

        // Track continuous flow time
        if (current_flow > 0) {
            if (currentContinuousStart == 0) {
                currentContinuousStart = millis();
                continuousAlertSent = false;
            }
        } else {
            currentContinuousStart = 0;
            continuousAlertSent = false;
            leak_status = "NORMAL";
        }

        checkAlerts();
        pushLiveData();
    }

    // 3. Sync Settings from Firebase every 30 seconds
    if (millis() - lastSettingsSync > 30000) {
        lastSettingsSync = millis();
        if (Firebase.ready()) {
            syncSettings();
        }
    }
}

void checkAlerts() {
    if (claimed_by == "") return; // Need an owner to send alerts to

    unsigned long epoch = timeClient.getEpochTime();
    
    // Formatting basic date/time for the DB payload
    time_t rawtime = (time_t)epoch;
    struct tm * ti = localtime(&rawtime);
    
    char dateStr[20];
    char timeStr[10];
    strftime(dateStr, sizeof(dateStr), "%d %b %Y", ti); // e.g. "12 Mar 2026"
    strftime(timeStr, sizeof(timeStr), "%H:%M", ti);    // e.g. "14:05"

    // A. Water Hammer Detection (Spikes)
    if (current_flow >= hammer_threshold_lpm) {
        if (millis() - lastHammerAlert > (hammer_cooldown_seconds * 1000)) {
            sendAlert("Water Hammer Detected", current_flow, String(dateStr), String(timeStr), epoch);
            lastHammerAlert = millis();
            leak_status = "ALERT";
        }
    }
    // B. Continuous Leak Detection
    else if (currentContinuousStart > 0 && (millis() - currentContinuousStart) > (max_continuous_minutes * 60000)) {
        leak_status = "LEAK";
        if (!continuousAlertSent) {
            sendAlert("Continuous Leak", current_flow, String(dateStr), String(timeStr), epoch);
            continuousAlertSent = true;
        }
    }
    // C. Standard High Flow
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

void syncSettings() {
    String path = "/devices/" + String(DEVICE_ID);
    
    // Check who claimed the device
    if (Firebase.RTDB.getString(&fbdo, path + "/claimed_by")) {
        claimed_by = fbdo.stringData();
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
}
