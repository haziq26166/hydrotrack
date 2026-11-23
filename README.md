# 💧 HydroTrack

**Real-time IoT water monitoring and leak detection for your home.**

HydroTrack is a full-stack IoT project that watches the water flowing through your pipes, shows it live on a modern web dashboard, and emails you the moment something looks wrong. An ESP32 microcontroller with an in-line flow sensor streams readings every second to the cloud; a React dashboard visualises usage and alerts; and a small Node.js service delivers email notifications.

Water leaks are silent, expensive, and usually discovered too late. HydroTrack turns a cheap flow sensor into a smart guard that detects continuous leaks, off-hours usage, abnormal flow, and water hammer, so you can act before the damage is done.

---

## ✨ Key Features

**Monitoring & Dashboard**
- 📡 **Live flow readings** streamed every second, with animated water gauges per device
- 📊 **KPI strip**: live flow, today's usage, weekly total and average, devices online
- 🚨 **Fleet status banner** that prioritises leak → unusual flow → offline → all clear
- 🗂️ **Multi-device support**: card view for a few devices, compact searchable/filterable list for many, plus a swipe carousel on phones
- 🔌 **Online/offline detection** based on device heartbeat

**Leak & Anomaly Detection (on-device firmware)**
- ⏱️ **Continuous flow leak**: water running longer than a configurable number of minutes
- 🌙 **Off-hours flow**: sustained flow inside a configurable quiet window (supports windows crossing midnight, e.g. 22:00 → 06:00)
- 🔧 **Water hammer detection**: sharp flow spikes with a cooldown to prevent alert bursts
- ⚠️ **High-flow status** indicator and a master on/off switch for maintenance

**Alerts & Notifications**
- 📧 **Branded email alerts** sent automatically for new alerts, respecting each user's notification preference
- ✅ **Acknowledge / undo / acknowledge-all** workflow for alerts, with search, filters, sorting and pagination
- 🔁 **No duplicate emails**: alerts are flagged as notified only after a successful send, with in-flight de-duplication

**Usage History**
- 📈 Daily and monthly bar charts (Chart.js), per device or across all devices
- 💾 Firmware saves the daily total once a minute and restores it after a reboot so totals never reset to zero

**Accounts & Security**
- 🔐 Email/password and **Google sign-in**
- 🧮 Live password-strength checks on register, profile and reset screens
- 🔑 Custom **password-reset flow**: rate-limited server, branded email, in-app reset page, no account enumeration
- ⏲️ Automatic sign-out after 15 minutes of inactivity; session-scoped login
- 🛡️ Firebase security rules to isolate each user's data and protect device ownership

**Device Setup & Settings**
- 🔗 Link a device with its ID (`WFS-XXXX`) and a friendly name; unlink, rename, set a default device
- 📶 **Wi-Fi provisioning via captive portal** on the ESP32 (hold the button for 5 s to reset Wi-Fi)
- ⚙️ Per-device calibration factor and alert thresholds, edited from the Settings page and synced to the device every 30 s

**UI / UX**
- 🪟 Custom "frosted glass" design system built with Tailwind CSS
- 📱 Fully responsive layout with collapsible sidebar and mobile drawer
- ♿ Accessible components (focus traps, ARIA roles, reduced-motion support)

---

## 🧰 Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite 5, React Router 6, Tailwind CSS 3, Chart.js + react-chartjs-2, React Icons |
| **Backend / Cloud** | Firebase Authentication, Firebase Realtime Database (with security rules) |
| **Notification Service** | Node.js (≥ 18), Firebase Admin SDK, Nodemailer (SMTP), dotenv |
| **Firmware** | C++ / Arduino framework on **ESP32**, `Firebase_ESP_Client`, `WiFiManager`, `NTPClient` |
| **Hardware** | ESP32 board, YF-S401 Hall-effect water flow sensor, push button |

---

## 📁 Project Structure

```
hydrotrack/
├── src/                          # React web application
│   ├── components/
│   │   ├── dashboard/            # Device cards/rows, KPI strip, leak banner, usage & alert cards
│   │   ├── devices/              # Add / edit device modals, device selector
│   │   ├── layout/               # Sidebar, mobile nav, top bar, public & dashboard layouts
│   │   └── ui/                   # Reusable glass UI kit (buttons, inputs, modal, toast, etc.)
│   ├── context/AuthContext.jsx   # Auth state + inactivity auto-logout
│   ├── hooks/                    # Realtime data hooks (fleet, devices, alerts, usage, leak status)
│   ├── lib/                      # Helpers (alert acknowledge, formatting, user profile mirror)
│   ├── pages/                    # Welcome, Login, Register, Forgot/Reset Password,
│   │                             # Dashboard, Devices, Alerts, History, Settings, Profile
│   ├── routes/ProtectedRoute.jsx # Auth-guarded routes
│   ├── services/firebase.js      # Single Firebase initialisation point
│   ├── App.jsx / main.jsx        # App shell and entry point
│   └── index.css                 # Tailwind layers + design-system components
├── dispatcher/                   # Node.js notification server
│   ├── notification-server.mjs   # Alert-email listener + password-reset HTTP endpoint
│   ├── alert-template.mjs        # Alert email template
│   ├── password-reset-template.mjs
│   └── .env.example
├── firmware/project-1.0/         # ESP32 firmware
│   ├── project-1.0.ino           # Flow sensing, leak logic, Firebase sync
│   └── secrets.example.h         # Template for Firebase credentials & device ID
├── database.rules.json           # Firebase Realtime Database security rules
├── tailwind.config.js            # Design tokens (colors, shadows, animations)
├── vite.config.js                # Vite config (`@` alias → `src`)
├── .env.example                  # Frontend environment variables template
└── package.json
```

---

## 🏗️ How It Works

```
┌──────────────┐  live_data / alerts / history   ┌──────────────────────┐
│ ESP32 + flow │ ──────────────────────────────▶ │ Firebase Realtime DB │
│   sensor     │ ◀────────────────────────────── │   + Authentication   │
└──────────────┘     settings (every 30 s)       └──────────┬───────────┘
                                                            │ realtime
                         ┌──────────────────────────────────┼─────────────────┐
                         ▼                                  ▼                 │
              ┌─────────────────────┐          ┌─────────────────────────┐    │
              │   React dashboard   │          │  Node.js dispatcher     │    │
              │ (live view, charts, │          │ (watches new alerts →   │────┘
              │  alerts, settings)  │          │  sends email via SMTP)  │  marks alert as notified
              └─────────────────────┘          └─────────────────────────┘
```

---

## ✅ Prerequisites

- **Node.js 18+** and **npm**
- A **Firebase project** with:
  - **Authentication** enabled (Email/Password and Google providers)
  - **Realtime Database** created
- A **Firebase service-account JSON** (for the notification server)
- An **SMTP account** for sending email (e.g. a Gmail account with an [App Password](https://support.google.com/accounts/answer/185833))
- *(Optional, for the hardware part)* Arduino IDE or PlatformIO, an ESP32 board, a YF-S401 flow sensor, and a push button

---

## 🚀 Installation

### 1. Clone the repository

```bash
git clone https://github.com/haziq26166/hydrotrack.git
cd hydrotrack
```

### 2. Set up Firebase

1. Create a project in the [Firebase Console](https://console.firebase.google.com/).
2. Enable **Authentication → Sign-in method → Email/Password** and **Google**.
3. Create a **Realtime Database**.
4. Open `database.rules.json` and replace the placeholders with your own values:
   - `FIRMWARE_UID` → the UID of the Firebase Auth user your ESP32 signs in with
   - `hydrotrack@gmail.com` → the email of that same firmware user
5. Publish the rules (Firebase Console → Realtime Database → Rules, or via the Firebase CLI).
6. Create a dedicated Firebase Auth user for the device (e.g. `device@yourdomain.com`).
7. Seed your device in the database so it can be claimed. Create a node `devices/WFS-A1B2` (device IDs must match `WFS-XXXX`, where `X` is `A–Z` or `0–9`), for example:

   ```json
   {
     "devices": {
       "WFS-A1B2": {
         "settings": {
           "calibration_factor": 98.0,
           "max_flow_threshold": 35.0,
           "max_continuous_minutes": 30,
           "alerts_enabled": true
         }
       }
     }
   }
   ```

### 3. Run the web app (frontend)

```bash
# Install dependencies
npm install

# Create your environment file
cp .env.example .env
```

Edit `.env` with the values from **Firebase Console → Project settings → Your apps (Web)**:

| Variable | Description |
|---|---|
| `VITE_FIREBASE_API_KEY` | Firebase Web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | e.g. `your-project.firebaseapp.com` |
| `VITE_FIREBASE_DATABASE_URL` | Your Realtime Database URL |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase app ID |
| `VITE_RESET_API_URL` | URL of the notification server, e.g. `http://localhost:8787`. If left empty, the app falls back to Firebase's built-in password-reset email |

Start the dev server:

```bash
npm run dev
```

The app opens at **http://localhost:5173**.

Other scripts:

```bash
npm run build     # Production build to /dist
npm run preview   # Preview the production build locally
```

### 4. Run the notification server (email alerts & password reset)

```bash
cd dispatcher
npm install
cp .env.example .env
```

Edit `dispatcher/.env`:

| Variable | Description |
|---|---|
| `EMAIL_USER` / `EMAIL_PASS` | SMTP username and password (use an app password for Gmail) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE` | SMTP settings (defaults: `smtp.gmail.com`, `587`, `tls`) |
| `FROM_EMAIL`, `FROM_NAME` | Sender address and display name |
| `RESET_PORT` | Port for the password-reset endpoint (default `8787`) |
| `APP_URL` | Public URL of the web app (used in reset links), e.g. `http://localhost:5173` |
| `ALLOWED_ORIGIN` | CORS origin allowed to call the server |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | Path to your service-account JSON, e.g. `./service-account.json` |
| `FIREBASE_DATABASE_URL` | Your Realtime Database URL |
| `ALERT_LOOKBACK_SECONDS` *(optional)* | Skip unsent alerts older than this (default 24 h) |

Download your service-account key from **Firebase Console → Project settings → Service accounts → Generate new private key**, save it as `dispatcher/service-account.json`, then start the server:

```bash
npm start
```

> The server refuses to start if any required setting is missing, so misconfiguration is caught immediately.

### 5. Flash the ESP32 firmware (optional, hardware)

1. Install the following libraries in the Arduino IDE (Library Manager):
   - **Firebase ESP Client** (Mobizt)
   - **WiFiManager** (tzapu)
   - **NTPClient** (Fabrice Weinberg)
2. Copy the secrets template and fill it in:

   ```bash
   cd firmware/project-1.0
   cp secrets.example.h secrets.h
   ```

   | Define | Description |
   |---|---|
   | `FIREBASE_API_KEY` | Firebase Web API key |
   | `FIREBASE_DATABASE_URL` | Realtime Database URL |
   | `FIREBASE_EMAIL` / `FIREBASE_PASSWORD` | Credentials of the dedicated firmware user created in step 2 |
   | `DEVICE_ID` | Unique ID in the format `WFS-XXXX` (must match the node you seeded in the database) |

3. **Wiring** (defaults in the sketch): flow sensor signal → **GPIO 32**, push button → **GPIO 4** (to GND).
4. Select your ESP32 board and upload `project-1.0.ino`.
5. On first boot, connect to the Wi-Fi network **`HydroTrack_Setup`** and enter your home Wi-Fi credentials in the captive portal. It reconnects automatically afterwards.

> The time zone is hard-coded to **UTC+8** (Malaysia) in the firmware. Change the offset in `NTPClient` if you live elsewhere. The web app currently reverses this 8-hour shift when reading timestamps, so update both sides together.

> `secrets.h`, `.env` files and `service-account.json` are git-ignored. Never commit them.

---

## 📖 Usage

1. **Create an account** at `/register` (or continue with Google), then sign in.
2. **Link your device**: click **Add Device**, enter the Device ID printed on your hardware (e.g. `WFS-A1B2`) and give it a name.
3. **Watch the dashboard**: see live flow, today's usage, weekly trend, and the system status banner. Problem devices always float to the top.
4. **Review alerts** on the **Alerts** page: search, filter by device or status, sort by severity, then acknowledge individually or all at once.
5. **Explore history** on the **History** page: switch between daily and monthly views, per device or all devices.
6. **Tune detection** on the **Settings** page: choose a device, press **Edit**, then adjust calibration, high-flow threshold, max continuous flow time, the off-hours quiet window, and water-hammer thresholds. The device picks up changes within about 30 seconds. You can also toggle email notifications globally.
7. **Manage devices** on the **Devices** page: set a default device, rename or unlink devices using **Manage** mode.
8. **Forgot your password?** Use the reset link on the login page and you'll receive a branded email that takes you to the in-app reset screen.

---

## 🔒 Security Notes

- Secrets live only in git-ignored files (`.env`, `dispatcher/.env`, `secrets.h`, `service-account.json`).
- Realtime Database rules restrict user data to its owner and allow a device to be claimed by only one account.
- The password-reset endpoint is rate-limited per IP and per email, limits request size, and always returns a generic response to prevent account enumeration.
- Email templates escape all dynamic values.

---

## 👤 Author

This is an individual project designed, built and maintained end to end by:

**[Your Name]** · GitHub: [@your-github-username](https://github.com/your-github-username)

---

## 📄 License

Add your preferred license here (e.g. MIT).
