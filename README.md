# 💧 HydroTrack

### IoT-based Household Water Flow Monitoring and Leak Alerts

![Status](https://img.shields.io/badge/status-prototype-orange)
![Environment](https://img.shields.io/badge/environment-localhost-blue)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-38BDF8?logo=tailwindcss&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-RTDB-FFCA28?logo=firebase&logoColor=black)
![ESP32](https://img.shields.io/badge/ESP32-38--pin-E7352C?logo=espressif&logoColor=white)

> **Final Year Project (FYP)**
> HydroTrack is a prototype IoT system that monitors household water flow in real time and notifies the user when a possible leak or abnormal water usage is detected.

> ⚠️ **Prototype notice:** This project is built for academic demonstration only. It runs on **localhost** and is **not intended for production deployment**.

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Alert Types](#-alert-types)
- [System Architecture](#-system-architecture)
- [Hardware](#-hardware)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Firebase Data Structure](#-firebase-data-structure)
- [Getting Started](#-getting-started)
- [Usage Guide](#-usage-guide)
- [Configurable Alert Settings](#-configurable-alert-settings)
- [Limitations](#-limitations)
- [Author](#-author)

---

## 🔎 Overview

Water leaks in a household are often unnoticed until the monthly bill arrives or visible damage appears. **HydroTrack** addresses this by installing an in-line flow sensor on a household pipe. An **ESP32** reads the sensor and pushes live flow data to **Firebase Realtime Database (RTDB)**. A **React web dashboard** displays that data live, and a small **Node.js notification server** emails the user whenever an alert is raised.

The system detects four kinds of abnormal events: **continuous flow (possible leak)**, **water hammer**, **high flow rate**, and **off-hour flow**.

---

## ✨ Key Features

- **Real-time monitoring**: live flow rate (LPM), today's usage (litres) and peak flow, updated every second.
- **Four alert types**: continuous leak, water hammer, high flow rate and off-hours flow (see below).
- **Email notifications**: branded alert emails sent via SMTP, with per-user opt-out.
- **Multi-device support**: link several devices to one account and monitor them as a fleet.
- **Online/offline detection**: a device is marked offline after 60 seconds without data.
- **Usage history**: daily and monthly bar charts with total, average and peak usage.
- **Alert history**: searchable, filterable and sortable alert log with per-type statistics.
- **Per-device configuration**: calibration factor and every alert threshold can be changed from the dashboard.
- **Authentication**: email/password and Google sign-in, with a custom password-reset email flow.
- **Responsive UI**: glassmorphism-style design with desktop sidebar and mobile navigation.

---

## 🚨 Alert Types

| Alert | Trigger | Default |
|---|---|---|
| **Continuous Flow (Possible Leak)** | Water flows without stopping for longer than the configured duration | 30 minutes |
| **Water Hammer** | A sudden flow spike above the threshold lasting 1–3 seconds, with a cooldown between alerts | 60 LPM, 30 s cooldown |
| **High Flow Rate** | Instantaneous flow exceeds the configured threshold | 35 LPM |
| **Off-Hours Flow** | Sustained flow detected during a configurable quiet window (may cross midnight) | 00:00 – 06:00, after 60 s |

Each alert is stored in Firebase with its type, flow rate, date and time. The notification server then emails the user and marks the alert as notified so it is never sent twice.

---

## 🏗 System Architecture

```
┌──────────────┐  pulses  ┌──────────────┐   Wi-Fi    ┌─────────────────────────┐
│  YF-S401     │ ───────► │    ESP32     │ ─────────► │  Firebase Realtime DB   │
│  Flow Sensor │          │  (38-pin)    │  live data │  + Firebase Auth        │
└──────────────┘          └──────────────┘  + alerts  └───────┬───────────┬─────┘
                                                              │           │
                                              real-time sync  │           │ listens for
                                                              ▼           ▼ new alerts
                                                  ┌────────────────┐  ┌──────────────────────┐
                                                  │ React Dashboard│  │ Notification Server  │
                                                  │ (Vite, :5173)  │  │ (Node.js, :8787)     │
                                                  └────────────────┘  └──────────┬───────────┘
                                                                                 │ SMTP (Gmail)
                                                                                 ▼
                                                                          📧 Email to user
```

**Data flow**

1. The YF-S401 outputs pulses proportional to water flow.
2. The ESP32 converts the pulses to flow rate (LPM) and volume, then writes them to `devices/{deviceId}/live_data` every second. When an abnormal condition is detected, it writes an alert record.
3. The React app subscribes to Firebase and updates the dashboard instantly.
4. The notification server watches for alerts with `notified: false`, sends an email, and sets `notified: true`.

---

## 🔧 Hardware

| Component | Description |
|---|---|
| **ESP32 (38-pin)** | Microcontroller with built-in Wi-Fi; reads the sensor and sends data to Firebase |
| **YF-S401 Water Flow Sensor** | Hall-effect in-line flow sensor; the default calibration factor used by the app is `98.0` (Hz per LPM) |

> 📝 The ESP32 firmware is kept in a local `firmware/` folder that is excluded from this repository (see `.gitignore`).
> The Welcome page also describes a captive-portal Wi-Fi setup for the device, and device IDs follow the format `WFS-XXXX` (e.g. `WFS-A1B2`).

---

## 🛠 Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, React Router 6, Vite 5, Tailwind CSS 3, Chart.js + react-chartjs-2, React Icons, Lucide React |
| **Backend (notification server)** | Node.js (ES modules), Firebase Admin SDK, Nodemailer, dotenv |
| **Database & Auth** | Firebase Realtime Database, Firebase Authentication |
| **Hardware** | ESP32 38-pin, YF-S401 water flow sensor |
| **Email** | Gmail SMTP |

---

## 📁 Project Structure

```
hydrotrack/
├── dispatcher/                      # Node.js notification server
│   ├── notification-server.mjs      # Alert email listener + password-reset endpoint
│   ├── alert-template.mjs           # Alert email template (HTML + text)
│   ├── password-reset-template.mjs  # Password-reset email template
│   ├── .env.example
│   └── package.json
├── src/
│   ├── components/
│   │   ├── dashboard/               # Device cards, KPI strip, alert banner, trend chart
│   │   ├── devices/                 # Add / edit device modals
│   │   ├── layout/                  # Sidebar, top bar, mobile nav, layouts
│   │   └── ui/                      # Reusable UI (buttons, cards, modal, toast, ...)
│   ├── context/AuthContext.jsx      # Auth state provider
│   ├── hooks/                       # Firebase realtime hooks (live data, fleet, alerts, usage)
│   ├── lib/format.js                # Formatting helpers
│   ├── pages/                       # Welcome, Login, Register, Dashboard, Devices,
│   │                                # Alerts, History, Settings, Profile, ...
│   ├── routes/ProtectedRoute.jsx    # Route guard
│   ├── services/firebase.js         # Central Firebase initialisation
│   ├── App.jsx
│   └── main.jsx
├── .env.example
├── index.html
├── package.json
├── tailwind.config.js
├── postcss.config.js
└── vite.config.js
```

---

## 🗄 Firebase Data Structure

HydroTrack uses Firebase Realtime Database with the following layout (derived from the application code):

```
devices/
  {deviceId}/                         # e.g. WFS-A1B2
    claimed_by: "<uid>"               # set when a user links the device
    live_data/
      current_flow: <LPM>
      todays_usage: <litres>
      highest_flow_rate: <LPM>
      leak_status: "NORMAL" | "ALERT" | "LEAK"
      timestamp: <ms since epoch>     # used for online/offline detection
    settings/
      calibration_factor, max_flow_threshold, max_continuous_minutes,
      off_hours_alerts_enabled, off_hours_start, off_hours_end,
      off_hours_min_duration_seconds,
      hammer_alerts_enabled, hammer_threshold_lpm, hammer_cooldown_seconds

users/
  {uid}/
    email, displayName
    settings/
      email_notifications: true | false
    user_devices/
      {deviceId}/ { name, linked_at }
    devices/
      {deviceId}/
        alerts/
          {alertId}/ { type, flow_rate, date, time, timestamp, notified }
        history/
          {YYYY-MM-DD}/ { total_volume }
```

> A device record must already exist under `devices/{deviceId}` before a user can link it from the dashboard.

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18 or newer, and **npm**
- A **Firebase project** with:
  - **Authentication** enabled (Email/Password and Google providers)
  - **Realtime Database** created
  - A **service account key** (Project settings → Service accounts → Generate new private key)
- A **Gmail account with an App Password** for sending emails (SMTP)
- The ESP32 + YF-S401 hardware (optional if you only want to explore the dashboard)

### 1. Clone the repository

```bash
git clone https://github.com/haziq26166/hydrotrack.git
cd hydrotrack
```

### 2. Install dependencies

```bash
# Frontend (also provides firebase-admin and nodemailer used by the server)
npm install

# Notification server
cd dispatcher
npm install
cd ..
```

### 3. Configure the frontend

Copy `.env.example` to `.env` in the project root and fill in your Firebase web app values:

```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your-project-default-rtdb.<region>.firebasedatabase.app/
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_RESET_API_URL=http://localhost:8787
```

### 4. Configure the notification server

Copy `dispatcher/.env.example` to `dispatcher/.env`:

```env
# Gmail SMTP (use an App Password, not your normal password)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=tls
FROM_EMAIL=your-email@gmail.com
FROM_NAME=HydroTrack

# Server
RESET_PORT=8787
APP_URL=http://localhost:5173
ALLOWED_ORIGIN=http://localhost:5173

# Firebase Admin
FIREBASE_SERVICE_ACCOUNT_PATH=./service-account.json
FIREBASE_DATABASE_URL=https://your-project-default-rtdb.<region>.firebasedatabase.app
```

Then place your Firebase service account key at `dispatcher/service-account.json`.

> 🔒 `.env` files and `service-account.json` are already listed in `.gitignore`. **Never commit them.**

### 5. Run the project

Open **two terminals**:

```bash
# Terminal 1: React dashboard (http://localhost:5173)
npm run dev
```

```bash
# Terminal 2: Notification server (http://localhost:8787)
cd dispatcher
node notification-server.mjs
```

The notification server verifies the SMTP connection on startup, then begins listening for new alerts in Firebase.

### 6. Set up the device

1. Flash the ESP32 firmware and connect the YF-S401 sensor.
2. Connect the ESP32 to Wi-Fi.
3. Make sure a `devices/{deviceId}` entry exists in Firebase for the device (IDs look like `WFS-A1B2`).

---

## 📱 Usage Guide

1. **Register / Log in** with email and password, or continue with Google.
2. Go to **Devices** → **Add device**, enter the Device ID (e.g. `WFS-A1B2`) and give it a name.
3. The **Dashboard** shows live flow, today's usage, peak flow, online status, recent alerts and a 7-day usage trend. A banner appears when any device reports a leak or alert.
4. **Alerts** lists every alert, with search, device filter, sorting and counts per type.
5. **History** shows daily and monthly usage charts.
6. **Settings** lets you toggle email notifications and tune the calibration and alert rules for each device.
7. **Profile** lets you change your display name and password.

---

## ⚙ Configurable Alert Settings

All settings are saved per device under `devices/{deviceId}/settings`.

| Setting | Description | Default |
|---|---|---|
| Calibration factor | Sensor pulses (Hz) per LPM (YF-S401 default) | `98.0` |
| High flow threshold | Alert when instantaneous flow exceeds this (LPM) | `35.0` |
| Max continuous flow | Alert if water runs longer than this (minutes) | `30` |
| Off-hours detection | Enable or disable the quiet-window alert | On |
| Quiet window start / end | Time range with no expected flow (can cross midnight) | `00:00` – `06:00` |
| Off-hours minimum duration | Ignore brief usage such as a single flush (seconds) | `60` |
| Water hammer detection | Enable or disable hammer alerts | On |
| Hammer spike threshold | Flow spike that counts as a hammer (LPM) | `60.0` |
| Hammer cooldown | Minimum gap between hammer alerts (seconds) | `30` |

---

## ⚠ Limitations

- **Prototype only**: built and tested on localhost; no production hosting, hardening or load testing.
- The notification server must be running for email alerts to be sent.
- Alert detection depends on the correct calibration of the YF-S401 sensor and on the thresholds set by the user.
- Accuracy is limited by the sensor's flow range and by the quality of installation on the pipe.
- Firebase security rules should be reviewed and tightened before any real-world use.

---

## 👤 Author

**Haziq**
Final Year Project: HydroTrack
GitHub: [@haziq26166](https://github.com/haziq26166)

---

<p align="center">Made with 💧 for the Final Year Project</p>
