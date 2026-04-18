# FindYoWay 🦯

> AI-powered navigation for the blind and visually impaired.  
> Outdoor GPS • Indoor floor-plan navigation • Live sign reading via Gemini Vision • Obstacle detection • Multilingual voice bot • SOS

---

## Project Structure

```
findyoway/
├── mobile-native/    # React Native CLI — user-facing mobile app
├── mobile-old-expo/  # Expo (legacy) — old mobile app version
├── backend/          # Python Flask — Gemini API server
├── dashboard/        # React (Vite) — venue registration web dashboard
├── .env.example      # Shared env variables template (copy to .env)
└── .gitignore
```

---

## Prerequisites

Before running the project, ensure you have:

1. **Node.js** (>= 22.11.0) - [Download](https://nodejs.org/)
2. **Python** (>= 3.10) - [Download](https://python.org/)
3. **Java JDK 17** - Required for Android builds
4. **Android SDK** - Command line tools (no need for full Android Studio)
5. **Git** - For cloning the repository

---

## Quickstart

### 1. Clone and Setup Environment

```bash
# Clone the repository
git clone https://github.com/sameekshaa19/findyoway-project.git
cd findyoway-project

# Copy environment variables
cp .env.example .env
```

Edit `.env` and fill in your API keys:
- `GOOGLE_API_KEY` - Gemini API key
- `EXPO_PUBLIC_SUPABASE_URL` - Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `VITE_SUPABASE_URL` - Same as above for dashboard
- `VITE_SUPABASE_ANON_KEY` - Same as above for dashboard

---

### 2. Flask Backend

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
venv\Scripts\activate      # Windows
source venv/bin/activate   # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Run the server
python app.py
```

Backend will run at: `http://localhost:5000`

---

### 3. Web Dashboard

```bash
cd dashboard

# Install dependencies
npm install

# Run development server
npm run dev
```

Dashboard will run at: `http://localhost:3000`

---

### 4. Mobile App (React Native CLI)

#### Option A: Run on Physical Device via USB (Recommended)

**Step 1: Enable USB Debugging on your Android phone**
1. Go to **Settings** → **About phone**
2. Tap **Build number** 7 times to enable Developer options
3. Go back to **Settings** → **System** → **Developer options**
4. Turn ON **USB debugging**
5. Connect your phone to PC via USB cable
6. On your phone, tap **Allow** when prompted for USB debugging

**Step 2: Setup Android SDK (if not already done)**

```powershell
# Download and setup Android SDK (run in PowerShell as Admin)
$AndroidSdk = "$env:USERPROFILE\Android\Sdk"
New-Item -ItemType Directory -Path $AndroidSdk -Force
Invoke-WebRequest -Uri "https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip" -OutFile "$env:TEMP\cmdline-tools.zip"
Expand-Archive -Path "$env:TEMP\cmdline-tools.zip" -DestinationPath "$AndroidSdk" -Force
Rename-Item -Path "$AndroidSdk\cmdline-tools" -NewName "latest" -Force
New-Item -ItemType Directory -Path "$AndroidSdk\cmdline-tools" -Force
Move-Item -Path "$AndroidSdk\latest" -Destination "$AndroidSdk\cmdline-tools\" -Force

# Download OpenJDK 17
Invoke-WebRequest -Uri "https://download.java.net/openjdk/jdk17/ri/openjdk-17+35_windows-x64_bin.zip" -OutFile "$env:TEMP\openjdk17.zip"
Expand-Archive -Path "$env:TEMP\openjdk17.zip" -DestinationPath "$env:USERPROFILE\java" -Force

# Set environment variables
[Environment]::SetEnvironmentVariable("ANDROID_HOME", $AndroidSdk, "User")
[Environment]::SetEnvironmentVariable("JAVA_HOME", "$env:USERPROFILE\java\jdk-17", "User")
[Environment]::SetEnvironmentVariable("Path", "$AndroidSdk\cmdline-tools\latest\bin;$AndroidSdk\platform-tools;$env:USERPROFILE\java\jdk-17\bin;$env:Path", "User")
```

**Step 3: Install required SDK components**

```bash
cd %ANDROID_HOME%\cmdline-tools\latest\bin
sdkmanager.bat --install "platform-tools" "build-tools;34.0.0" "platforms;android-34"
```

**Step 4: Build and run the app**

```bash
cd mobile-native

# Install dependencies
npm install

# Start Metro bundler (keep this terminal open)
npm start

# In a NEW terminal, run on Android device
npm run android
```

If Metro is already running, you can just run:
```bash
npm run android
```

The app will be installed and launched on your connected phone.

#### Option B: Run on Android Emulator (if you have one set up)

```bash
cd mobile-native
npm install
npm run android
```

---

## Project Scripts Summary

| Component | Command | URL |
|-----------|---------|-----|
| Backend | `python app.py` | http://localhost:5000 |
| Dashboard | `npm run dev` | http://localhost:3000 |
| Mobile - Metro | `npm start` | N/A (bundler) |
| Mobile - Android | `npm run android` | On device |

---

## Troubleshooting

### Mobile App Issues

**Issue: `adb` command not found**
- Ensure Android SDK platform-tools is in PATH
- Restart terminal after setting environment variables

**Issue: Device not detected**
- Check USB debugging is enabled on phone
- Try different USB cable or port
- Run: `adb devices` to verify connection

**Issue: Build fails with Java errors**
- Verify JAVA_HOME is set to JDK 17
- Restart terminal after setting JAVA_HOME

**Issue: Metro bundler won't start**
- Clear cache: `npm start -- --reset-cache`
- Delete `node_modules` and run `npm install` again

### Backend Issues

**Issue: Module not found errors**
- Ensure virtual environment is activated
- Re-install dependencies: `pip install -r requirements.txt`

**Issue: Port 5000 already in use**
- Kill existing process or change PORT in `.env`

### Dashboard Issues

**Issue: Dependencies not found**
- Run `npm install` again
- Check for Node.js version compatibility

---

## Tech Stack

| Layer | Tech |
|---|---|
| Mobile | React Native CLI, React 19, TypeScript |
| Navigation | React Navigation, React Native Maps |
| Camera | expo-camera (to be integrated) |
| Location | React Native Geolocation Service |
| AI | Gemini API (text + vision) |
| Obstacle Detection | MobileNet SSD (OpenCV) |
| Backend | Python + Flask |
| Database | Supabase (PostgreSQL) |
| Dashboard | React 18 + Vite + React Flow |

---

## Git Workflow

The project uses `development` branch as the main working branch:

```bash
# Switch to development branch
git checkout development

# Pull latest changes
git pull origin development

# Create feature branch
git checkout -b feature/your-feature-name

# After making changes
git add .
git commit -m "Your commit message"
git push origin feature/your-feature-name

# Create Pull Request on GitHub to merge into development
```

---

## Team

| Person | Area |
|---|---|
| Person 1 | Navigation + Maps (GPS, Dijkstra, floor plans) |
| Person 2 | Camera + Vision (Obstacle Detection, Gemini Vision) |
| Person 3 | Voice Bot + Backend (Flask, Gemini text, SOS) |
| Person 4 | Web Dashboard (venue registration, floor plan editor) |
