# 📍 Attendly — Smart Geo-Verified Attendance System

[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18.0-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15.0-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Vite](https://img.shields.io/badge/Vite-5.0-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Security Hardened](https://img.shields.io/badge/Security-Hardened-059669?style=flat-square&logo=shieldsdotio&logoColor=white)](#-security--hardening)

> **Attendly** is a modern, enterprise-grade web application designed for higher education institutions to automate, verify, and monitor student class attendance using high-precision GPS geofencing, dynamic QR scanning, device fingerprinting, and manual override auditing.

---

## 🌟 Key Features

### 📍 Geo-Fenced Check-In & Verification
- **GPS Location Check**: Computes real-time distance between student device coordinates and session center.
- **Configurable Geofence Radius**: Class Representatives can specify custom radii (e.g., 50m - 500m) per lecture session.
- **Single Check-In Guarantee**: Atomic database procedures ensure students cannot double-mark attendance or spoof coordinates.

### 📱 Dynamic QR Code Generation
- Real-time generation of QR codes linking directly to active attendance check-in sessions.
- Class Reps can project or display QR codes in lecture halls for instant scanning.

### 🔑 Role-Based Dashboards (RBAC)
- **Student View**: Track attendance metrics, calculate threshold alerts (e.g., below 75% attendance warning), view active sessions, and enroll in available courses.
- **Class Representative View**: Create courses, launch/end attendance sessions, generate student-to-admin invite codes, process manual overrides, and view live audit logs.

### 🎟️ Class Rep Promotion System
- Class Reps can generate cryptographically secure, 8-character uppercase invite codes directly from their dashboard.
- Students can redeem valid invite codes to get promoted to Class Representative status.

### 🛡️ Manual Overrides & Audit Control
- Accommodates edge-case device failures (e.g., hardware GPS faults) via controlled manual overrides.
- **Override Cap (10 Max)**: Automatically flags sessions for administrative review if more than 10 manual overrides are issued per session.
- Full audit log records who initiated each override, the student impacted, and mandatory reason notes.

### 🔒 Enterprise Security & Device Fingerprinting
- **Device Fingerprinting**: Captures client user-agent, resolution, and timezone. Flagged sign-ins from unrecognized devices trigger mandatory OTP verification via email.
- **Rate Limiting**: Integrated SlowAPI rate-limiting guarding against brute-force attacks (5 attempts/15 mins on authentication, 30 req/min baseline).
- **Payload & Input Limits**: 1MB maximum payload middleware preventing memory exhaustion, alongside strict Pydantic `max_length` bounds on all input schema fields.

### 📊 Instant CSV Export
- Class Reps can export session attendance reports containing full student metadata, present/absent status, check-in method (Geo-Verified vs. Manual Override), distance from center, and timestamps.

---

## 🏗️ Architecture & Technology Stack

```
attendly/
├── backend/                  # FastAPI Application
│   ├── app/
│   │   ├── config/           # Database pool & Settings validation
│   │   ├── middleware/       # JWT Auth & Security Middlewares
│   │   ├── routers/          # Auth, Courses, Sessions, Attendance, Overrides, Export
│   │   ├── schemas/          # Pydantic v2 Validators & Input Bounds
│   │   ├── utils/            # Crypto (CSPRNG), Fingerprint, Email, Limiter
│   │   └── main.py           # FastAPI Entrypoint & Middleware Pipeline
│   ├── make_admin.py         # CLI Tool for Role Management
│   └── requirements.txt      # Python Dependencies
│
└── frontend/                 # React + Vite Application
    ├── src/
    │   ├── context/          # AuthContext & State Management
    │   ├── pages/            # Landing, Login, Register, Verify, ResetPassword, Dashboard, Attend
    │   ├── styles/           # Modern Vanilla CSS Design Tokens
    │   └── utils/            # API Client Fetch Wrapper
    └── package.json
```

### Tech Stack Details
- **Backend Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python 3.10+)
- **Server**: [Uvicorn](https://www.uvicorn.org/)
- **Database**: PostgreSQL (via `psycopg2` pooler / Supabase)
- **Frontend Framework**: [React 18](https://react.dev/) with [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **UI & Icons**: Vanilla CSS (Custom Design System with Outfit & Inter Google Fonts) + [Lucide React](https://lucide.dev/)
- **Authentication**: Stateless JWT Access & Refresh Token rotation with SHA-256 token hashing in DB

---

## ⚡ Quick Start Guide

### Prerequisites
- **Python**: v3.10 or higher
- **Node.js**: v18.0 or higher
- **PostgreSQL Database**: Local or Hosted (e.g., Supabase, Neon, Railway)

---

### 1. Backend Setup

1. **Navigate to the backend directory**:
   ```bash
   cd backend
   ```

2. **Create and activate a virtual environment**:
   - **Windows (PowerShell)**:
     ```powershell
     python -m venv .venv
     .venv\Scripts\activate
     ```
   - **Linux / macOS**:
     ```bash
     python3 -m venv .venv
     source .venv/bin/activate
     ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up Environment Variables**:
   Copy `.env.example` from the root directory to `.env` and populate your credentials:
   ```bash
   cp ../.env.example ../.env
   ```
   *Required variables*:
   - `DATABASE_URL`: PostgreSQL connection string
   - `JWT_ACCESS_SECRET`: Secret key (min 32 characters)
   - `JWT_REFRESH_SECRET`: Secret key (min 32 characters)

5. **Start the FastAPI server**:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   - API will run at: `http://localhost:8000`
   - Interactive Swagger Docs: `http://localhost:8000/docs`

---

### 2. Frontend Setup

1. **Navigate to the frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install Node modules**:
   ```bash
   npm install
   ```

3. **Start the Vite development server**:
   ```bash
   npm run dev
   ```
   - Application will open at: `http://localhost:5173`

---

### 🛠️ CLI Role Management Script

To promote or demote user roles directly from the command line:

```bash
cd backend
python make_admin.py <email_or_matric> <class_rep|student>
```

**Example**:
```bash
python make_admin.py 22/52HP021 class_rep
```

---

## 🔌 API Endpoint Summary

| Category | Endpoint | Method | Role Required | Description |
|---|---|---|---|---|
| **Auth** | `/api/auth/register` | `POST` | Public | Register a new student account |
| **Auth** | `/api/auth/login` | `POST` | Public | Authenticate student/class rep |
| **Auth** | `/api/auth/verify-email` | `POST` | Public | Verify email OTP |
| **Auth** | `/api/auth/verify-device` | `POST` | Public | Verify OTP for new device/browser |
| **Auth** | `/api/auth/forgot-password`| `POST` | Public | Request password reset OTP |
| **Auth** | `/api/auth/reset-password` | `POST` | Public | Reset password with OTP |
| **Auth** | `/api/auth/me` | `GET` | Authenticated | Fetch current profile details |
| **Auth** | `/api/auth/profile` | `PUT` | Authenticated | Update full name, phone, or password |
| **Courses**| `/api/courses` | `GET` | Authenticated | List enrolled courses |
| **Courses**| `/api/courses/all` | `GET` | Authenticated | List all available courses |
| **Courses**| `/api/courses` | `POST` | `class_rep` | Create a new course |
| **Courses**| `/api/courses/enroll/{id}`| `POST` | Authenticated | Enroll in a course |
| **Courses**| `/api/courses/generate-invite`| `POST` | `class_rep` | Generate 8-char Class Rep promo code |
| **Courses**| `/api/courses/redeem-invite`| `POST` | Authenticated | Redeem invite code to become Class Rep |
| **Sessions**| `/api/sessions` | `POST` | `class_rep` | Launch new attendance session |
| **Sessions**| `/api/sessions/my-active` | `GET` | Student | Fetch running sessions for enrolled courses |
| **Sessions**| `/api/sessions/active/{id}`| `GET` | Authenticated | Get active session by course ID |
| **Sessions**| `/api/sessions/{id}/end` | `POST` | `class_rep` | Terminate an active session |
| **Attendance**| `/api/attendance/mark` | `POST` | Student | Submit GPS check-in verification |
| **Attendance**| `/api/attendance/my-summary`| `GET` | Student | View attendance percentage & stats |
| **Overrides**| `/api/overrides` | `POST` | `class_rep` | Issue manual override for student |
| **Overrides**| `/api/overrides/session/{id}`| `GET` | `class_rep` | View override audit log for session |
| **Exports** | `/api/export/session/{id}`| `GET` | `class_rep` | Download CSV attendance report |

---

## 🔒 Security & Hardening

Attendly enforces strict production security defaults:

- **CSPRNG Tokens**: Uses Python's `secrets` module for generating cryptographically unpredictable OTPs and invite codes.
- **Strict Input Constraints**: Pydantic schemas enforce bounds on string inputs (`EmailStr`, `max_length`, regex formatting) to eliminate injection vectors.
- **Rate Limiting**: Powered by `SlowAPI` with `5 attempts / 15 minutes` limit on authentication routes and `30 requests / minute` default on all API routes.
- **Request Body Size Cap**: Middleware limits incoming HTTP request bodies to **1MB** (`HTTP 413 Payload Too Large`).
- **No Secret Exposure**: Missing environment variables halt application startup immediately; no sensitive default fallback credentials exist in source code.

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
