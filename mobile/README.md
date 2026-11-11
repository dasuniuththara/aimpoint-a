# AimPoint Motion Mobile App (Expo + React Native)

Cross-platform Android & iOS companion mobile application implementing Thesis Objective 5 and Sections 4.6.5–4.6.7, connected asynchronously to the FastAPI biomechanics backend (`http://localhost:8080`).

## Screens Implemented
1. **Capture Screen (`CaptureScreen.js`)**: 1080p @ 30fps live camera capture with semi-transparent **2.5m–3.0m Sagittal Wireframe Alignment Guide**, 3-2-1 countdown with spoken audio cues (`expo-speech`), phone video library picker (`expo-image-picker`), and 1-tap sample fault benchmarks.
2. **Coaching Card Screen (`CoachingCardScreen.js`)**: Interactive `react-native-svg` Moving-Sticks 2D Model player with frame controls, green/red faulty joint highlights, structured Coaching Card (*Primary Fault Identification*, *Why It Matters*, *Targeted Drill Prescription*), aloud cue playback, and expandable 5-checkpoint breakdown.
3. **History Screen (`HistoryScreen.js`)**: Longitudinal SQLite shot log viewer (`/api/reports/list`).
4. **Drills & API Screen (`DrillsSettingsScreen.js`)**: Prescriptive drill reference and configurable FastAPI server URL (`http://10.0.2.2:8080` for Android Emulator or your PC LAN IP for Expo Go).

## Run on Phone or Emulator
1. Ensure the FastAPI backend is running on port `8080`:
   ```bash
   python start_server.py
   ```
2. Install dependencies and launch Expo:
   ```bash
   cd mobile
   npm install
   npx expo start
   ```
3. Press `a` for Android Emulator, or scan the QR code using **Expo Go** on Android/iOS (and set your PC's Wi-Fi IP under **Drills & API**).

