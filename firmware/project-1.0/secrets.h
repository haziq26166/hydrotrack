#ifndef SECRETS_H
#define SECRETS_H

// ==========================================
// Firebase Project Configuration
// ==========================================
// Replace with your Web API Key from Firebase Project Settings
#define FIREBASE_API_KEY "AIzaSyCzZUAvCybzc2nq2d-93na5QSpUFj2paFM"

// Replace with your Realtime Database URL
#define FIREBASE_DATABASE_URL "https://hydrotrack-project-default-rtdb.asia-southeast1.firebasedatabase.app/"

// ==========================================
// Firmware Authentication
// ==========================================
// You can create a dedicated user in Firebase Authentication 
// (e.g. device@hydrotrack.com) so the firmware has permission to write.
#define FIREBASE_EMAIL "hydrotrack@gmail.com"
#define FIREBASE_PASSWORD "hydrotrack@123"

// ==========================================
// Hardware Identifier
// ==========================================
// The unique ID printed on your physical device.
// The user enters this on the React frontend to "claim" the device.
#define DEVICE_ID "WFS-A1B2"

#endif
