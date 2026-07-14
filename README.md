# FindYoWay 🦯

> AI-powered navigation for the blind and visually impaired.  
> Outdoor GPS • Indoor A* floor-plan navigation • Obstacle detection • Sign reading • Voice assistant • SOS

---

## Project Structure

```
findyoway/
├── mobile-native/    # React Native CLI — user-facing mobile app
│   └── src/
│       ├── screens/          # 11 screens: Home, Route, Indoor*, Camera, Voice, SOS, Settings
│       ├── services/
│       │   ├── navigationEngine/   # A* pathfinding, graph loader, graph validator
│       │   ├── venueService.ts     # Fetches venues & floor plans from backend
│       │   ├── navigationApi.ts    # OSRM walking routes + Nominatim geocoding
│       │   ├── locationService.ts  # GPS permission + tracking
│       │   └── speechService.ts    # TTS (react-native-tts)
│       ├── models/           # Node, Edge, Floor, Instruction, RouteResult, NavigationGraph
│       ├── hooks/            # useOutdoorRoute, useLocationTracking, useVoiceAssistant
│       └── components/       # AppButton, BottomNav, ErrorState, LoadingState, etc.
├── backend/          # Python Flask — Gemini AI + EasyOCR + MobileNet-SSD
│   └── app.py               # 7 endpoints: /api/navigate, /chat, /api/vision, /read-signs,
│                            #   /api/detect, /api/venues, /api/venues/<id>/floorplan,
│                            #   /api/venues/validate
├── dashboard/        # React (Vite) — venue registration + floor plan editor
│   └── src/
│       ├── components/      # VenueForm, FloorPlanEditor (React Flow), VenueList
│       ├── pages/           # Home (venue list), Register (2-step wizard)
│       └── services/        # supabaseService (insert venues, fetch floor plans, validate)
├── .env.example      # Shared env variables template (copy to .env)
├── MobileNetSSD_deploy.caffemodel  # Pre-trained object detection model
├── MobileNetSSD_deploy.prototxt
└── .gitignore
```

---

## Prerequisites

1. **Node.js** (>= 22.11.0) — [Download](https://nodejs.org/)
2. **Python** (>= 3.10) — [Download](https://python.org/)
3. **Java JDK 17** — Required for Android builds
4. **Android SDK** — `platform-tools`, `build-tools;34.0.0`, `platforms;android-34`
5. **Git**

---

## Quickstart

### 1. Clone and Setup Environment

```bash
git clone https://github.com/sameekshaa19/findyoway-project.git
cd findyoway-project
cp .env.example .env
```

Edit `.env` with real values:

| Variable | Purpose |
|----------|---------|
| `GOOGLE_API_KEY` | Gemini API key (for voice assistant chat) |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anonymous key |
| `VITE_SUPABASE_URL` | Same as above, for dashboard |
| `VITE_SUPABASE_ANON_KEY` | Same as above, for dashboard |

### 2. Flask Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate      # Windows
source venv/bin/activate   # macOS/Linux
pip install -r requirements.txt
python app.py
```

Runs at `http://localhost:5000`

### 3. Web Dashboard

```bash
cd dashboard
npm install
npm run dev
```

Runs at `http://localhost:3000`

### 4. Mobile App (React Native CLI)

**Step 1: Enable USB Debugging on your Android phone**
1. **Settings** → **About phone** → Tap **Build number** 7 times
2. **Settings** → **System** → **Developer options** → Turn ON **USB debugging**
3. Connect phone via USB → tap **Allow**

**Step 2: Set up Android SDK**

```powershell
$AndroidSdk = "$env:USERPROFILE\Android\Sdk"
# Download cmdline-tools, set ANDROID_HOME, add to PATH
# See docs for platform-specific setup
```

**Step 3: Build and run**

```bash
cd mobile-native
npm install
npm start                   # Metro bundler (keep open)
# In another terminal:
npm run android             # Install & launch on device
```

If Metro is already running:
```bash
npm run android
```

---

## Features

### Outdoor GPS Navigation
- OSRM walking routes with turn-by-turn instructions
- Nominatim geocoding (text → coordinates)
- Live GPS tracking with step progression
- Automatic reroute detection (off-route)
- Voice announcements at each step via TTS

### Indoor Floor-Plan Navigation
- **A\* pathfinding** with 4 optimization criteria:
  - `shortest` — minimum distance
  - `fastest` — minimum walking time
  - `wheelchair` — avoids stairs, prefers elevators with good accessibility
  - `emergency` — avoids elevators, prioritizes exits
- Turn-by-turn instruction generation (turn left/right, floor changes, arrive)
- Multi-floor support with floor selector tabs
- Floor-change indicators on route path (elevator/stairs highlighted)
- Start/destination selection via map tap or entrance landmarks

### Camera + Obstacle Detection
- Real-time camera preview via `react-native-vision-camera`
- Periodic snapshot (every 3s) → base64 → Flask `/api/detect`
- MobileNet-SSD object detection (20 COCO classes)
- Distance estimation from bounding box size
- Dangerous object alerts with 5-second voice cooldown
- Color-coded overlay tags (dangerous objects in red)

### Voice Assistant
- Speech recognition via `react-native-voice`
- Gemini AI chat (EN/other languages)
- TTS response playback
- Status indicators: listening → processing → response

### Sign Reading
- EasyOCR text extraction from camera frames
- Common sign keyword matching (exit, entrance, stairs, elevator, restroom, etc.)

### SOS Emergency
- GPS coordinates display
- Emergency voice announcement with current location

### Dashboard (Web)
- Venue registration form (name, city, address, floors)
- **React Flow** floor plan editor with drag-to-position and connect handles
- Node types: entrance, exit, elevator, stairs, room, reception, restroom, pharmacy, junction, landmark
- Color-coded nodes per type
- Graph validation (entrance/exit required, no dangling edges, connectivity check)
- Version numbering + publish/draft toggle
- Supabase persistence

---

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Mobile    │────▶│   Backend    │────▶│  Supabase   │
│ (React N.)  │     │   (Flask)    │     │ (PostgreSQL)│
│             │◀────│              │◀────│             │
└─────────────┘     └──────────────┘     └─────────────┘
       │                    │
       │              ┌─────┴──────┐
       │              │  External  │
       │              │  APIs      │
       │              │ · Gemini   │
       │              │ · OSRM     │
       │              │ · Nominatim│
       │              └────────────┘
       │
  ┌────┴─────┐
  │Dashboard │────▶ Supabase (direct)
  │ (Vite)   │
  └──────────┘

Mobile Internal Architecture:
  Screen (UI) → Hook (logic) → Service (API/Engine)
                                     │
                            ┌────────┴────────┐
                            │ NavigationEngine │
                            │  ├─ AStar        │
                            │  ├─ graphLoader  │
                            │  └─ validateGraph│
                            └─────────────────┘
```

---

## Database (Supabase)

### `venues`
| Column | Type | Description |
|--------|------|-------------|
| id | text (PK) | Slug-based ID (e.g. `city-hospital-bengaluru`) |
| name | text | Venue display name |
| city | text | City location |
| address | text | Full street address |
| floors | int | Number of floors |
| created_at | timestamptz | Auto-generated |

### `floor_plans`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Auto-generated |
| venue_id | text (FK → venues) | Parent venue |
| graph_json | jsonb | Node/edge graph (see format below) |
| version | int | Version number for publishing |
| is_published | boolean | Visible to mobile only when true |
| created_at | timestamptz | Auto-generated |

### Graph JSON Format

```json
{
  "nodes": {
    "node_1": { "label": "Main Entrance", "x": 100, "y": 100, "type": "entrance", "floor": 0 },
    "node_2": { "label": "Pharmacy", "x": 250, "y": 150, "type": "room", "floor": 0 },
    "node_3": { "label": "Elevator A", "x": 300, "y": 300, "type": "elevator", "floor": 0 }
  },
  "edges": [
    { "from": "node_1", "to": "node_2", "weight": 15 },
    { "from": "node_2", "to": "node_3", "weight": 10 }
  ]
}
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/api/navigate` | Gemini AI chat (voice assistant) |
| POST | `/chat` | Alias for `/api/navigate` |
| POST | `/api/vision` | EasyOCR sign reading (base64 image) |
| POST | `/read-signs` | EasyOCR sign reading (multipart file) |
| POST | `/api/detect` | MobileNet-SSD object detection |
| GET | `/api/venues` | List all venues |
| GET | `/api/venues/:id/floorplan` | Latest published floor plan |
| POST | `/api/venues/validate` | Validate graph structure |

---

## Project Scripts

| Component | Command | URL |
|-----------|---------|-----|
| Backend | `python app.py` | http://localhost:5000 |
| Dashboard | `npm run dev` | http://localhost:3000 |
| Mobile — Metro | `npm start` | — |
| Mobile — Android | `npm run android` | On device |
| Mobile — iOS | `npm run ios` | Simulator |

---

## Troubleshooting

### Mobile
- **adb not found** — Add `platform-tools` to PATH
- **Device not detected** — Check USB debugging, try another cable, run `adb devices`
- **Build fails (Java)** — Verify `JAVA_HOME` points to JDK 17
- **Metro won't start** — `npx react-native start --reset-cache`

### Backend
- **Module not found** — Activate venv and reinstall: `pip install -r requirements.txt`
- **Port 5000 in use** — Kill the process or set `PORT=5001` in `.env`

### Physical Device Testing
The mobile app defaults to `10.0.2.2:5000` (Android emulator). For a real device:
1. Edit `mobile-native/src/config.ts` to use your PC's LAN IP (e.g., `http://192.168.1.10:5000`)
2. Or use ngrok: `ngrok http 5000`

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile Framework | React Native CLI 0.85, React 19, TypeScript |
| Navigation | React Navigation Native Stack v7 |
| Maps | react-native-maps (MapView + Polyline + Marker) |
| Camera | react-native-vision-camera v5 |
| Location | react-native-geolocation-service |
| Voice / Speech | react-native-voice + react-native-tts |
| AI Chat | Google Gemini 1.5 Flash (text) |
| OCR | EasyOCR (CPU) |
| Object Detection | OpenCV + MobileNet-SSD (Caffe) |
| Backend | Python 3 + Flask 3 |
| Database | Supabase (PostgreSQL) via REST API |
| Dashboard | React 18 + Vite 5 + @xyflow/react 12 |
| Dashboard State | Zustand 4 |

---

## Git Workflow

```bash
git checkout development
git pull origin development
git checkout -b feature/your-feature-name
# ... make changes ...
git add .
git commit -m "feat: description of change"
git push origin feature/your-feature-name
# Create Pull Request on GitHub → merge into development
```
