# 💧 HydroTrack

**IoT-based household water flow monitoring and leak alerts.**

HydroTrack pairs an in-line flow sensor and an ESP32 with a real-time web dashboard. It tracks water usage by the second, records daily history, detects leaks and abnormal flow, and emails you the moment something looks wrong, so you can act before the end-of-month bill shows it.

> Developed as a final-year project for the Bachelor of Information Technology (Hons.), Faculty of Computer and Mathematical Sciences, Universiti Teknologi MARA (UiTM), July 2026.

---

## Features

- **Real-time monitoring**: live flow rate (LPM) and today's usage, updated every second.
- **Usage history**: daily and monthly bar charts per device or across all devices.
- **Leak and anomaly detection** on the device itself:
  - **Continuous leak**: water running longer than a set number of minutes.
  - **Off-hours flow**: sustained flow inside a configurable quiet window (can cross midnight, e.g. 22:00 → 06:00).
  - **Water hammer**: sharp flow spikes above a threshold, with a cooldown between alerts.
  - **High flow**: shown as a warning status on the dashboard.
- **Email alerts** through Gmail SMTP, sent once per alert and respecting each user's notification preference.
- **Alert management**: search, filter, sort, and acknowledge (or undo) alerts individually or in bulk.
- **Multi-device support**: link devices by ID, rename them, set a default, and see problem devices first.
- **Per-device settings** (calibration factor, thresholds, quiet window) edited from the dashboard and synced to the hardware every 30 s.
- **Authentication**: email/password and Google sign-in, in-app password reset, password-strength checks, and a 15-minute idle sign-out.
- **Responsive UI**: glassmorphism design with a collapsible sidebar on desktop and a drawer and swipe carousel on mobile.

## How it works

```
┌────────────┐  pulses   ┌─────────┐  Wi-Fi    ┌─────────────────────────┐
│ YF-S401    │──────────▶│  ESP32  │──────────▶│ Firebase Realtime DB    │
│ flow sensor│           │firmware │◀──────────│ + Firebase Auth         │
└────────────┘           └─────────┘ settings  └──────┬───────────┬──────┘
                                                      │           │
                                         live data /  │           │ unnotified alerts
                                         history      ▼           ▼
                                              ┌────────────┐  ┌──────────────────┐
                                              │ React app  │  │ Notification     │
                                              │ (Vite)     │  │ server (Node)    │
                                              └────────────┘  │ → Gmail SMTP     │
                                                              └──────────────────┘
```

1. The **ESP32** counts sensor pulses, converts them to L/min once per second, and pushes `live_data` to Firebase. It saves the day's total every minute and runs the alert rules locally.
2. When a rule fires, the firmware writes an alert (`notified: false`) under the owner's account.
3. The **notification server** listens to `/users` and emails every alert that has `notified: false`, then flips the flag to `true`, so nobody is emailed twice.
4. The **React dashboard** subscribes to the same data and renders it live.

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18, Vite 5, React Router 6, Tailwind CSS 3, Chart.js |
| Backend / data | Firebase Authentication, Firebase Realtime Database |
| Notification server | Node.js ≥ 18, Firebase Admin SDK, Nodemailer (Gmail SMTP) |
| Firmware | ESP32 (Arduino IDE), WiFiManager, Firebase_ESP_Client, NTPClient |
| Hardware | ESP32, YF-S401 Hall-effect water flow sensor, push button |

## Repository structure

```
hydrotrack/
├── src/                      # React dashboard
│   ├── pages/                # Welcome, Login, Register, Dashboard, Devices,
│   │                         # Alerts, History, Settings, Profile, password reset
│   ├── components/           # dashboard/, devices/, layout/, ui/
│   ├── hooks/                # Firebase subscriptions (fleet, alerts, usage, ...)
│   ├── context/AuthContext   # auth state + idle timeout
│   ├── services/firebase.js  # the only place Firebase is initialised
│   └── lib/                  # alert acknowledge, formatting, user profile mirror
├── dispatcher/               # Node notification server (alert + reset emails)
├── firmware/project-1.0/     # ESP32 sketch (+ secrets.example.h)
├── database.rules.json       # Realtime Database security rules
├── .env.example              # frontend environment template
└── tailwind.config.js        # design tokens (hydro / aqua / mint palette)
```

## Getting started

### Prerequisites

- Node.js 18 or newer
- A Firebase project with **Authentication** (Email/Password and Google) and **Realtime Database** enabled
- A Gmail account with an [app password](https://support.google.com/accounts/answer/185833) for SMTP
- Arduino IDE with ESP32 board support (only if you are building the hardware)

### 1. Frontend

```bash
git clone https://github.com/haziq26166/hydrotrack.git
cd hydrotrack
npm install
cp .env.example .env      # then fill in your Firebase web-app values
npm run dev               # http://localhost:5173
```

`.env` variables:

| Variable | Description |
| --- | --- |
| `VITE_FIREBASE_API_KEY` | Firebase web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | e.g. `your-project.firebaseapp.com` |
| `VITE_FIREBASE_DATABASE_URL` | Realtime Database URL |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase app ID |
| `VITE_RESET_API_URL` | *(optional)* notification server URL, e.g. `http://localhost:8787`. If unset, password reset falls back to Firebase's built-in email. |

Other scripts: `npm run build` (production build) and `npm run preview` (serve the build).

### 2. Database rules

Deploy `database.rules.json` to your Realtime Database. Before deploying, replace the placeholders so they match your project:

- `FIRMWARE_UID` is the UID of the Firebase Auth user the ESP32 signs in as.
- `hydrotrack@gmail.com` is the account the rules treat as the device/service account. Change it to the email of your firmware user.

Create a **device record** in the database for each unit you manufacture. A user links a device by entering its ID, and the app checks that `devices/{ID}` exists first:

```json
{ "devices": { "WFS-A1B2": { "settings": {} } } }
```

Device IDs must match `WFS-XXXX` (four letters/digits).

### 3. Notification server (email alerts and password reset)

```bash
cd dispatcher
npm install
cp .env.example .env      # fill in SMTP + Firebase values
# place your Firebase service account key at dispatcher/service-account.json
npm start                 # listens on http://localhost:8787
```

| Variable | Description |
| --- | --- |
| `EMAIL_USER` / `EMAIL_PASS` | Gmail address and app password |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE` | Defaults to `smtp.gmail.com`, `587`, `tls` |
| `FROM_EMAIL`, `FROM_NAME` | Sender shown in emails |
| `RESET_PORT` | HTTP port (default `8787`) |
| `APP_URL` | Where the dashboard runs (used in reset links) |
| `ALLOWED_ORIGIN` | CORS origin for the reset endpoint |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | Path to the service account JSON |
| `FIREBASE_DATABASE_URL` | Realtime Database URL |
| `ALERT_LOOKBACK_SECONDS` | *(optional)* skip unsent alerts older than this (default 24 h) |

The server checks its SMTP login and refuses to start if any required value is missing or still a placeholder. It exposes one endpoint, `POST /api/password-reset`, which is rate-limited by IP and by email.

### 4. Firmware (ESP32)

**Wiring**

| Part | ESP32 pin |
| --- | --- |
| YF-S401 signal | GPIO 32 |
| Reset button | GPIO 4 (to GND, uses internal pull-up) |

**Setup**

1. Install these Arduino libraries: `WiFiManager`, `Firebase ESP Client`, `NTPClient`.
2. In `firmware/project-1.0/`, copy `secrets.example.h` to `secrets.h` and fill in:
   - `FIREBASE_API_KEY` and `FIREBASE_DATABASE_URL`
   - `FIREBASE_EMAIL` / `FIREBASE_PASSWORD` for a dedicated Firebase Auth user for the device
   - `DEVICE_ID`, the unique ID printed on the unit (e.g. `WFS-A1B2`)
3. Flash `project-1.0.ino`.
4. On first boot the ESP32 opens a Wi-Fi access point named **`HydroTrack_Setup`**. Connect to it and enter your home Wi-Fi in the captive portal. It reconnects automatically afterwards.
5. **Hold the button for 5 seconds** to wipe the saved Wi-Fi credentials and re-provision.

> ⚠️ `secrets.h` is git-ignored. The captive-portal password (`password123`) is hard-coded in the sketch, so change it before deploying real units.

## Using HydroTrack

1. **Register** with email/password or Google.
2. Click **Add Device**, enter the `WFS-XXXX` ID from the hardware, and give it a name.
3. Watch live flow on the **Dashboard**; check **History** for daily and monthly usage.
4. Tune thresholds under **Settings → Device calibration & alert triggers**:

| Setting | Default |
| --- | --- |
| Calibration factor (pulses per second per L/min, YF-S401) | 98.0 |
| High flow threshold | 35 LPM |
| Max continuous flow | 30 min |
| Off-hours window | 00:00 → 06:00, ≥ 60 s of flow |
| Water hammer threshold / cooldown | 60 LPM / 30 s |

5. Review and acknowledge events on the **Alerts** page. Email notifications can be switched off under Settings.

A device is shown as **offline** after 60 seconds without a reading.

## Database layout

```
devices/{deviceId}/
  claimed_by              # uid of the owner (set when a user links the device)
  live_data/              # current_flow, todays_usage, highest_flow_rate, leak_status, timestamp
  settings/               # calibration + alert thresholds (editable by the owner)

users/{uid}/
  email, displayName, createdAt
  settings/email_notifications
  default_device_id
  user_devices/{deviceId} # { name, linked_at }
  devices/{deviceId}/
    alerts/{alertId}      # type, flow_rate, date, time, timestamp, notified, acknowledged, ...
    history/{YYYY-MM-DD}  # date, total_volume, highest_flow_rate, last_updated, closed_at
```

## Limitations

HydroTrack is a prototype, not a production system.

- It is built and tested for local use and is not deployed publicly. There is no production HTTPS hardening or native mobile app.
- It needs a stable internet connection (Firebase sync and email alerts) and reliable Wi-Fi at the install site.
- Detection is rule-based (flow-rate thresholds and durations) and depends on correct sensor calibration. It can miss leaks upstream of the sensor or leaks that don't involve flow through it.

## Author

**Muhammad Haziq Bin Mokhtar**, Universiti Teknologi MARA
Supervisor: Dr. Jasper Kaur A/P Gian Singh

Repository: <https://github.com/haziq26166/hydrotrack>

## License

`package.json` currently lists ISC. Add a `LICENSE` file to match, or change the field if you prefer another license.
