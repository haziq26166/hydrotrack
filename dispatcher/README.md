# HydroTrack Alert Dispatcher

Node.js script that reads unnotified alerts from Firebase RTDB and sends
them by email. Marks each alert as notified after a successful send.

## Setup

```bash
cd dispatcher
npm install
cp .env.example .env     # then edit .env with your credentials