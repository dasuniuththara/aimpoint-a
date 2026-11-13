# AimPointAI (AimPoint Motion)

**Real-Time Detection of Basketball Shooting Mistakes & Automated Prescriptive Remediation Engine**  
*Grounded in Monocular Pose Estimation, Res-TCN + BiLSTM + Attention Neural Classification, and Pedagogical Biomechanical Rules*

---

## System Architecture

AimPointAI operates as a **5-Tier Edge-Cloud Biomechanical Architecture**:
- **Tier 1 (Video & Keypoint Acquisition)**: Monocular 1080p @ 30 FPS video ingestion with strict sports validation and 33-point MediaPipe pose estimation.
- **Tier 2 (Kinematic Feature Engineering)**: Joint angle computation (elbow, knee, trunk tilt, release angle), angular velocity, Savitzky-Golay smoothing, and 30-frame temporal normalization.
- **Tier 3 (Neural Fault Classification)**: Hybrid Res-TCN (Residual Temporal Convolutional Network) + BiLSTM + Multi-Head Attention neural network classifying 5 primary shooting states:
  - `0`: Ideal Form
  - `1`: Low Elbow Set Point
  - `2`: Short Follow-Through
  - `3`: Imbalanced Base
  - `4`: Early / Premature Ball Release
- **Tier 4 (Pedagogical Remediation & LLM RAG)**: Deterministic heuristic audit and Actionable Coaching Card generation (Primary Fault, Why It Matters, Targeted Drill Prescription with sets/reps).
- **Tier 5 (Cross-Platform Client Presentation)**: Modern Web Application, Native Electron Desktop Studio, and React Native / Expo Mobile App.

---

## Prerequisites

Before beginning installation, ensure your computer has the following tools installed:

1. **Git**: [Download Git](https://git-scm.com/downloads)
2. **Python (3.10 to 3.14)**: [Download Python](https://www.python.org/downloads/) *(Ensure "Add Python to PATH" is checked during installation)*
3. **Node.js (v18 or higher)**: [Download Node.js (LTS)](https://nodejs.org/)
4. **Mobile Phone (Optional, for Mobile App)**: Install **Expo Go** from Google Play Store (Android) or App Store (iOS).

---

## 1. Clone the Repository

Open your terminal (PowerShell, Command Prompt, or Terminal) and clone the repository:

```bash
git clone https://github.com/dasuniuththara/aimpoint-a.git
cd aimpoint-a
```

---

## 2. Install & Start the Backend Server

The backend runs on FastAPI and serves both the API endpoints and the Web Frontend Studio.

### Step 2.1: (Optional but recommended) Create a Virtual Environment

```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS / Linux
python3 -m venv venv
source venv/bin/activate
```

### Step 2.2: Install Python Dependencies

```bash
pip install -r requirements.txt
```

*(Note: The core requirements are extremely lightweight: `fastapi`, `uvicorn`, `pydantic`, `numpy`, `python-multipart`).*

### Step 2.3: Start the Backend Server

```bash
python start_server.py
```

You should see:
```text
INFO:     Started server process [PID]
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8080 (Press CTRL+C to quit)
```

The server is now live and listening on all local adapters (`localhost:8080`, Ethernet IP, and Wi-Fi IP).

---

## 3. Launching the Web Studio

Once the server is running, open any modern web browser (Chrome, Edge, Safari, Firefox):

- **Local PC**: [http://localhost:8080](http://localhost:8080)
- **Other Devices on same Wi-Fi**: `http://<YOUR_PC_IP>:8080`

### Features available in Web Studio:
- **Upload Throwing / Shooting Video**: Analyzes user video files (`.mp4`, `.mov`, `.webm`).
- **Live Camera Capture**: Real-time camera feed with Sagittal Alignment Guide (2.5m–3.0m).
- **Side-by-Side & Overlay Views**: Real video synchronized with 30-frame 2D Moving-Sticks.
- **Export 2D Video**: Downloads the isolated 2D moving-stick animation.
- **Actionable Coaching Card**: Instant fault classification, joint angle deltas, and targeted drills.

---

## 4. Launching the Mobile App (Expo / React Native)

The mobile app connects wirelessly over your local network to the backend server.

### Step 4.1: Open a New Terminal in the `mobile` folder

```bash
cd mobile
npm install
```

### Step 4.2: Start the Expo Metro Server

```bash
npx expo start
```

### Step 4.3: Open on your Phone

1. Ensure your phone and PC are connected to the **same Wi-Fi router or hotspot**.
2. Open the **Expo Go** app on your phone:
   - **Android**: Tap "Scan QR Code" inside Expo Go.
   - **iOS**: Open the native Camera app and tap the Expo notification.
3. Once the app loads:
   - Navigate to the **Drills & API** tab (bottom right).
   - Tap **Auto-Detect IP** or select your active connection (**Ethernet** or **Wi-Fi**).
   - Tap **Save & Test Connection**.
   - A green `"Connected (online)"` confirmation will appear.

---

## 5. Launching the Desktop Application (Optional)

You can run the native desktop application using Electron or the standalone script:

### Option A: Using Electron
```bash
# In the project root:
npm install
npm start
```

### Option B: Quick Windows Launcher
Double-click `AimPointAI-Standalone.bat` or `AimPointAI-Desktop.bat` located in the root folder.

---

## 6. Video Upload & Detection Guidelines

AimPointAI includes a strict **Sports & Basketball Biomechanics Gate** to filter out non-athletic or accidental footage:

1. **Shooting Distance**: Position the camera **2.5m to 3.0m** from the athlete in a **sagittal (side-view)** perspective.
2. **Valid Athlete Motion**: The player must perform an athletic shooting motion with upward arm elevation.
3. **Automatic Non-Sports Refusal**:
   - Stationary clips (seated at a desk, typing, standing still) are automatically refused.
   - Abstract animations, objects, pets, or keyboards are rejected.
   - Benchmark and model files (e.g. `AimPoint_2D_Model_...` or sample benchmark clips) are automatically recognized and animated.

---

## 7. Retraining the ML Model (Optional)

The pre-trained production model weights are already committed and ready at:
`backend/model/weights/best_model.npz`

If you wish to retrain or fine-tune on Kaggle / local GPU:
```bash
python train_aimpoint_full_pipeline.py
```
This runs the full synthetic + Kaggle dataset generator, Res-TCN + BiLSTM neural network training, validation metrics calculation, and outputs publication-quality thesis figures in `thesis_figures/`.

---

## 8. Troubleshooting

| Issue | Cause | Solution |
|---|---|---|
| `Upload Failed: Network error connecting to http://...` | Phone cannot reach PC port 8080 | 1. Ensure phone & PC share same Wi-Fi.<br>2. Check Windows Firewall: allow Python through Private Networks.<br>3. In mobile app under **Drills & Settings**, tap **Auto-Detect IP**. |
| `[Errno 10048] address already in use` | Another process is using port 8080 | Close any existing `start_server.py` window, or run `taskkill /F /IM python.exe` then restart `python start_server.py`. |
| `Error Video: ... unrelated to sports` | Non-athletic or non-sports video uploaded | Upload footage showing a human player taking a basketball shot from side view. |

---

## Project Structure

```text
Aim point AI/
├── backend/
│   ├── app.py                     # FastAPI application & REST endpoints
│   ├── model/                     # Res-TCN + BiLSTM architecture & weights
│   │   ├── architecture.py
│   │   └── weights/best_model.npz # Active trained neural weights
│   ├── ontology/                  # Pedagogical drill & remediation rules
│   ├── pose/                      # Kinematic feature extraction & Savitzky-Golay
│   └── database/                  # SQLite longitudinal storage
├── frontend/
│   └── index.html                 # Modern responsive Web Studio
├── mobile/                        # React Native / Expo SDK 58 mobile app
│   ├── src/screens/               # Capture, Coaching Card, History, Drills
│   └── src/services/api.js        # Multi-adapter auto-discovery API client
├── thesis_figures/                # 5 IEEE/Springer 300 DPI publication figures
├── start_server.py                # Unified launcher for port 8080
├── train_aimpoint_full_pipeline.py# Full ML training & evaluation pipeline
└── README.md                      # Complete installation & setup guide
```

---

## License & Attribution
AimPointAI - Developed for Final Year Project (FYP) & Research in Computer Science, General Sir John Kotelawala Defence University (KDU), 2026.
