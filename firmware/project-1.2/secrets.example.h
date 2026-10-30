#pragma once

/* Copy this file to secrets.h (which is git-ignored) and fill in your values. */

/* Unique ID of this hardware unit. Must match the record under devices/{ID} in Firebase. */
#define DEVICE_ID              "WFS-XXXX"

/* Wi-Fi setup portal (WiFiManager access point) shown on first boot / after reset */
#define WIFI_AP_NAME           "HydroTrack-Setup"
#define WIFI_AP_PASSWORD       "change-me-123"

/* Firebase project (Project settings > General) */
#define FIREBASE_API_KEY       "your-web-api-key"
#define FIREBASE_DB_URL        "your-project-default-rtdb.firebasedatabase.app"

/* Firebase Authentication user that the ESP32 signs in as */
#define FIREBASE_USER_EMAIL    "device@example.com"
#define FIREBASE_USER_PASSWORD "device-password"