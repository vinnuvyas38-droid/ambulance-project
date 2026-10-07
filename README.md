# 🚑 AI Emergency Green Corridor - Smart-City Traffic Simulation & Control Platform

A production-ready smart-city traffic management and emergency vehicle preemption platform. The system dynamically clears intersections and establishes green wave corridors for emergency ambulances while upholding strict fail-safe guarantees and minimal civilian traffic disruption.

---

## 🌟 Key Features

- **Dynamic Green Corridor Preemption**: Automatically clears upcoming traffic junctions along an emergency route and restores normal adaptive cycles upon exit.
- **Multimodal AI Computer Vision**:
  - Integrated with **Google Gemini 2.5 Flash** for real-time camera feed vision inspection (ambulance detection, lane congestion, pedestrian hazard analysis).
  - High-precision fallback **Simulated Detector** ensuring 100% operational uptime during network disruptions.
- **Multi-Factor Priority Scoring Engine**: Resolves junction bottlenecks between multiple simultaneous emergency vehicles using priority weights:
  $$\text{Priority Score} = w_s \cdot S + w_e \cdot E + w_w \cdot W - w_c \cdot C + w_r \cdot R$$
  (Patient severity, ETA urgency, intersection waiting time, cross-traffic conflict cost, route necessity).
- **Hard Safety Validator**: Enforces immutable physical traffic constraints:
  - Minimum green time (8s) and maximum green time (30s).
  - Conflicting movement protection (e.g., prevents simultaneous $N \leftrightarrow S$ and $E \leftrightarrow W$ greens).
  - Fail-safe flashing amber/red fallback mode on communication or sensor anomalies.
- **Real-Time Simulation Engine**: 3x2 urban grid network with simulated GPS tracking, dynamic traffic load, and configurable scenario presets (`single_ambulance`, `two_ambulances_conflict`, `heavy_congestion`, `vip_escort`).
- **Modern Interactive Dashboard**:
  - Built with React 18, TypeScript, TailwindCSS, Zustand, TanStack Query, and Lucide icons.
  - Live spatial map with real-time junction states, ambulance telemetry, speed gauges, ETA countdowns, and mission log audits.
- **Security & RBAC**: Role-based access control (`admin`, `operator`, `driver`) with rate limiting and audit logging.

---

## 🏗️ Architecture & Project Structure

The project is structured as an npm workspaces monorepo:

```text
├── shared/                  # Common TypeScript interfaces, schemas & types
│   ├── src/
│   │   ├── types/          # Domain models (Junctions, Missions, Signals, Alerts)
│   │   └── schemas/        # Zod validation schemas
├── server/                  # Node.js Express backend & Simulation Engine
│   ├── src/
│   │   ├── ai/             # Gemini 2.5 prompts & structured JSON generation
│   │   ├── config/         # Environment schema validation
│   │   ├── lib/            # In-memory store, logger, errors, Supabase client
│   │   ├── middleware/     # Auth, RBAC, input validation, rate limiting
│   │   ├── routes/         # REST API endpoints (routes, junctions, signals, etc.)
│   │   ├── services/       # Priority engine, safety validator, CV detector, simulation
│   │   └── tests/          # Vitest unit & integration test suite
├── client/                  # Vite + React frontend single-page application
│   ├── src/
│   │   ├── components/     # UI components (Header, MapView, ControlPanel, etc.)
│   │   ├── store/          # Zustand state management
│   │   └── services/       # API clients & polling sync
└── supabase/                # Database migrations & seed schemas
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v18.0.0 or later
- **npm**: v9.0.0 or later

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/vinnuvyas38-droid/ambulance-project.git
   cd ambulance-project
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Environment Variables:
   Copy `.env.example` to `.env` in the `server` directory:
   ```bash
   cp server/.env.example server/.env
   ```
   *(Optional)* Add your `GEMINI_API_KEY` in `server/.env` to enable live Gemini Vision analysis. If not provided, the platform automatically utilizes the built-in high-accuracy simulation detector.

### Running the Application

- **Run both Backend and Frontend concurrently**:
  ```bash
  npm run dev:all
  ```
- Or run individually:
  - **Backend Server** (runs on `http://localhost:4000`):
    ```bash
    npm run dev:server
    ```
  - **Frontend Client** (runs on `http://localhost:5173`):
    ```bash
    npm run dev:client
    ```

---

## 🧪 Testing & Verification

Run the automated test suite:
```bash
npm test
```

Run TypeScript type verification:
```bash
npm run typecheck
```

Build production bundles:
```bash
npm run build
```

---

## 📡 API Overview

| Method | Endpoint | Description | Role Required |
|---|---|---|---|
| `GET` | `/api/v1/junctions` | Retrieve all junction states | Public |
| `GET` | `/api/v1/ambulances` | Get real-time ambulance telemetry | Public |
| `POST` | `/api/v1/routes/compute` | Calculate shortest corridor route | Operator / Driver |
| `POST` | `/api/v1/signals/:id/override` | Request emergency signal preemption | Operator / Admin |
| `POST` | `/api/v1/signals/:id/restore` | Restore standard signal cycle | Operator / Admin |
| `POST` | `/api/v1/priority/evaluate` | Run multi-candidate priority resolution | Operator / Admin |
| `GET` | `/api/v1/simulation/state` | Current simulation tick and status | Public |
| `POST` | `/api/v1/simulation/start` | Start/Resume traffic simulation | Operator / Admin |
| `POST` | `/api/v1/simulation/reset` | Reset simulation to a scenario preset | Operator / Admin |

---

## 🛡️ License

This project is licensed under the MIT License.
