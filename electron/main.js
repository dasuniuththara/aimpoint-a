const { app, BrowserWindow, session, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

let mainWindow = null;
let splashWindow = null;
let pythonProcess = null;
const BACKEND_PORT = 8080;
const SERVER_URL = `http://127.0.0.1:${BACKEND_PORT}`;

// 1. Locate Local Python Executable
function getPythonPath() {
  const rootDir = path.join(__dirname, '..');
  const possiblePaths = [
    path.join(rootDir, '.venv', 'Scripts', 'python.exe'),
    path.join(rootDir, 'venv', 'Scripts', 'python.exe'),
    process.env.PYTHON_PATH,
    'python'
  ];

  for (const p of possiblePaths) {
    if (p && (p === 'python' || fs.existsSync(p))) {
      return p;
    }
  }
  return 'python';
}

// 2. Start Local FastAPI Backend
function startPythonBackend() {
  const pythonPath = getPythonPath();
  const scriptPath = path.join(__dirname, '..', 'start_server.py');
  const workingDir = path.join(__dirname, '..');

  console.log(`[AimPointAI Desktop] Starting Python Backend with: ${pythonPath}`);

  pythonProcess = spawn(pythonPath, [scriptPath], {
    cwd: workingDir,
    env: { ...process.env, PORT: String(BACKEND_PORT), PYTHONUNBUFFERED: '1' },
    stdio: 'pipe'
  });

  pythonProcess.stdout.on('data', (data) => {
    console.log(`[Python] ${data.toString().trim()}`);
  });

  pythonProcess.stderr.on('data', (data) => {
    console.error(`[Python ERR] ${data.toString().trim()}`);
  });

  pythonProcess.on('close', (code) => {
    console.log(`[AimPointAI Desktop] Python process exited with code ${code}`);
  });
}

// 3. Poll Server Until Live
function waitForServer(callback, maxAttempts = 30) {
  let attempts = 0;
  const interval = setInterval(() => {
    attempts++;
    const req = http.get(SERVER_URL, (res) => {
      if (res.statusCode === 200 || res.statusCode === 404) {
        clearInterval(interval);
        callback(true);
      }
    });

    req.on('error', () => {
      if (attempts >= maxAttempts) {
        clearInterval(interval);
        callback(false);
      }
    });

    req.end();
  }, 500);
}

// 4. Create Sleek Splash Screen
function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 520,
    height: 360,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    show: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  splashWindow.loadFile(path.join(__dirname, 'splash.html'));
}

// 5. Create Main Native Desktop Window
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1080,
    minHeight: 720,
    show: false,
    backgroundColor: '#060608',
    title: 'AimPoint Motion — Desktop Basketball Biomechanics Studio',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Auto-grant Camera / Webcam permissions for seamless monocular capture
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media' || permission === 'camera' || permission === 'microphone') {
      callback(true);
    } else {
      callback(true);
    }
  });

  mainWindow.loadURL(SERVER_URL);

  mainWindow.once('ready-to-show', () => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
      splashWindow = null;
    }
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Window Controls
ipcMain.on('window-minimize', () => { if (mainWindow) mainWindow.minimize(); });
ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
  }
});
ipcMain.on('window-close', () => { if (mainWindow) mainWindow.close(); });

function isServerHealthy() {
  return new Promise((resolve) => {
    const req = http.get(`${SERVER_URL}/api/health`, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(800, () => {
      req.destroy();
      resolve(false);
    });
  });
}

// Application Lifecycle
app.whenReady().then(async () => {
  createSplashWindow();
  const alreadyUp = await isServerHealthy();
  if (alreadyUp) {
    console.log('[AimPointAI Desktop] Existing backend detected on port 8080.');
    createMainWindow();
  } else {
    startPythonBackend();
    waitForServer(() => {
      console.log('[AimPointAI Desktop] Server live! Launching main window...');
      createMainWindow();
    });
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

// Clean up Python Backend Child Process
function cleanupPython() {
  if (pythonProcess) {
    console.log('[AimPointAI Desktop] Stopping Python backend process...');
    try {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', pythonProcess.pid, '/f', '/t']);
      } else {
        pythonProcess.kill('SIGTERM');
      }
    } catch (e) {
      console.error('Error killing python process:', e);
    }
    pythonProcess = null;
  }
}

app.on('before-quit', cleanupPython);
app.on('window-all-closed', () => {
  cleanupPython();
  if (process.platform !== 'darwin') app.quit();
});

