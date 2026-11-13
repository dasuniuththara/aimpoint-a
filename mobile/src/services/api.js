import { Platform, NativeModules } from 'react-native';

export const CANDIDATE_IPS = ['192.168.2.76', '192.168.2.89', '10.0.2.2', 'localhost'];

function detectDefaultApiUrl() {
  if (Platform.OS === 'web') {
    const webHost = typeof window !== 'undefined' && window.location ? window.location.hostname : 'localhost';
    return `http://${webHost || 'localhost'}:8080`;
  }
  try {
    const scriptURL = NativeModules?.SourceCode?.scriptURL || '';
    const match = scriptURL.match(/^https?:\/\/([^:/]+)/i);
    if (match && match[1]) {
      const host = match[1];
      if (host !== 'localhost' && host !== '127.0.0.1' && host !== '10.0.2.2') {
        return `http://${host}:8080`;
      }
    }
  } catch (e) {}
  return `http://${CANDIDATE_IPS[0]}:8080`;
}

let apiBaseUrl = detectDefaultApiUrl();

export function getApiBaseUrl() {
  return apiBaseUrl;
}

export function setApiBaseUrl(url) {
  if (typeof url === 'string' && url.trim()) {
    apiBaseUrl = url.trim().replace(/\/+$/, '');
  }
  return apiBaseUrl;
}

export async function autoDiscoverBackend() {
  const hosts = [];
  try {
    const scriptURL = NativeModules?.SourceCode?.scriptURL || '';
    const match = scriptURL.match(/^https?:\/\/([^:/]+)/i);
    if (match && match[1]) hosts.push(match[1]);
  } catch (e) {}
  hosts.push(...CANDIDATE_IPS);
  const uniqueHosts = Array.from(new Set(hosts.filter(Boolean)));

  for (const host of uniqueHosts) {
    const testUrl = `http://${host}:8080`;
    try {
      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), 1200);
      const res = await fetch(`${testUrl}/api/health`, { signal: ctrl.signal });
      clearTimeout(tid);
      if (res.ok) {
        apiBaseUrl = testUrl;
        return testUrl;
      }
    } catch (e) {}
  }
  return apiBaseUrl;
}

export async function checkHealth() {
  try {
    const res = await fetch(`${apiBaseUrl}/api/health`);
    if (res.ok) return res.json();
  } catch (e) {
    // Attempt auto-discovery across candidate IPs if current IP is unreachable
    const discovered = await autoDiscoverBackend();
    const res2 = await fetch(`${discovered}/api/health`);
    if (!res2.ok) throw new Error(`HTTP ${res2.status}`);
    return res2.json();
  }
  const res = await fetch(`${apiBaseUrl}/api/health`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function runBenchmarkShot(faultType = 0, athleteId = 'ATH-001') {
  const fd = new FormData();
  fd.append('athlete_id', athleteId);
  fd.append('benchmark_fault', String(faultType));

  const res = await fetch(`${apiBaseUrl}/api/analyze-shot`, {
    method: 'POST',
    body: fd,
  });
  if (!res.ok) throw new Error(`Analysis failed (${res.status})`);
  return res.json();
}

async function extractWebLandmarksOrReject(videoUri, fileName = '') {
  if (typeof document === 'undefined') return null;

  // Load MediaPipe Pose script dynamically on Web if not yet loaded
  if (typeof window !== 'undefined' && !window.Pose) {
    await new Promise((resolve) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js';
      s.crossOrigin = 'anonymous';
      s.onload = () => resolve(true);
      s.onerror = () => resolve(false);
      document.head.appendChild(s);
      setTimeout(() => resolve(false), 4000);
    });
  }

  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.src = videoUri;
  video.load();

  await new Promise((resolve) => {
    if (video.readyState >= 2) return resolve();
    video.addEventListener('loadeddata', resolve, { once: true });
    setTimeout(resolve, 2000);
  });

  if (!video.videoWidth || !video.videoHeight) {
    throw new Error(`Error Video: "${fileName || 'clip'}" is corrupted or not a playable video.`);
  }

  const dur = (video.duration && isFinite(video.duration)) ? video.duration : 2.0;
  const canvas = document.createElement('canvas');
  canvas.width = 480;
  canvas.height = 360;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  let pose = null;
  if (typeof window !== 'undefined' && window.Pose) {
    try {
      pose = new window.Pose({ locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${f}` });
      pose.setOptions({ modelComplexity: 0, minDetectionConfidence: 0.42, minTrackingConfidence: 0.42 });
      if (typeof pose.initialize === 'function') {
        await Promise.race([pose.initialize(), new Promise(r => setTimeout(r, 4500))]);
      }
    } catch (e) {
      pose = null;
    }
  }

  const frames3D = [];
  let validCount = 0;
  let mpOkCount = 0;
  const nSamples = 12;

  for (let i = 0; i < nSamples; i++) {
    const t = (i / (nSamples - 1)) * Math.max(0.05, dur - 0.04);
    await new Promise((res) => {
      video.addEventListener('seeked', res, { once: true });
      setTimeout(res, 220);
      try { video.currentTime = t; } catch (e) { res(); }
    });
    ctx.drawImage(video, 0, 0, 480, 360);

    if (pose) {
      const mpRes = await new Promise((res) => {
        let done = false;
        const tm = setTimeout(() => { if (!done) { done = true; res(null); } }, 1500);
        pose.onResults((r) => { if (!done) { done = true; clearTimeout(tm); res(r); } });
        try { pose.send({ image: canvas }); } catch (e) { if (!done) { done = true; clearTimeout(tm); res(null); } }
      });
      if (mpRes) {
        mpOkCount++;
        if (mpRes.poseLandmarks && mpRes.poseLandmarks.length === 33) {
          validCount++;
          const w3d = mpRes.poseWorldLandmarks && mpRes.poseWorldLandmarks.length === 33
            ? mpRes.poseWorldLandmarks.map(p => [p.x, p.y, p.z])
            : mpRes.poseLandmarks.map(p => [(p.x - 0.5) * 2, (p.y - 0.5) * 2, p.z || 0]);
          frames3D.push(w3d);
        }
      }
    }
  }

  const isModelSample = /^\d{2,3}_(2d|3d)_/i.test(fileName || '');
  if (!isModelSample && mpOkCount >= 4 && validCount === 0) {
    throw new Error(`Error Video: "${fileName || 'Uploaded file'}" has no human player detected. Please upload a clear basketball shooting video.`);
  }
  return frames3D.length >= 1 ? frames3D : null;
}

function inferSampleFault(fileName = '') {
  const lower = String(fileName || '').toLowerCase();
  if (lower.includes('low_elbow')) return 1;
  if (lower.includes('short_follow')) return 2;
  if (lower.includes('imbalanced')) return 3;
  if (lower.includes('early_release')) return 4;
  return 0;
}

export async function uploadAndAnalyzeVideo(videoUri, fileName = 'mobile_shot.mp4', athleteId = 'ATH-001') {
  const isModelSample = /^\d{2,3}_(2d|3d)_/i.test(fileName || '');

  if (Platform.OS === 'web') {
    const fd = new FormData();
    fd.append('athlete_id', athleteId);
    const webLandmarks = await extractWebLandmarksOrReject(videoUri, fileName);
    const resp = await fetch(videoUri);
    const blob = await resp.blob();
    fd.append('video', blob, fileName);
    if (webLandmarks) {
      fd.append('landmarks_json', JSON.stringify(webLandmarks));
    } else if (isModelSample) {
      fd.append('benchmark_fault', String(inferSampleFault(fileName)));
    }

    const res = await fetch(`${apiBaseUrl}/api/analyze-shot`, {
      method: 'POST',
      body: fd,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.detail || `Error Video: Upload rejected (${res.status})`);
    }
    return data;
  }

  // Native Android & iOS: Use native XMLHttpRequest to avoid WinterCG expo/fetch FormDataPart rejection
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${apiBaseUrl}/api/analyze-shot`);
    xhr.timeout = 60000;

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText || '{}');
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(data);
        } else {
          reject(new Error(data.detail || `Server error (${xhr.status})`));
        }
      } catch (e) {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({});
        } else {
          reject(new Error(`Server returned status ${xhr.status}`));
        }
      }
    };

    xhr.onerror = () => {
      reject(new Error(`Network error connecting to ${apiBaseUrl} — Ensure FastAPI backend is running on port 8080.`));
    };

    xhr.ontimeout = () => {
      reject(new Error('Upload timed out. Check Wi-Fi connection to your PC.'));
    };

    const fd = new FormData();
    fd.append('athlete_id', athleteId);

    let cleanUri = String(videoUri || '');
    if (Platform.OS === 'android' && !cleanUri.startsWith('file://') && !cleanUri.startsWith('content://')) {
      cleanUri = 'file://' + cleanUri;
    }

    fd.append('video', {
      uri: cleanUri,
      name: fileName || 'mobile_shot.mp4',
      type: (fileName && fileName.endsWith('.webm')) ? 'video/webm' : 'video/mp4',
    });

    xhr.send(fd);
  });
}

export async function fetchSamples() {
  const res = await fetch(`${apiBaseUrl}/api/samples`);
  if (!res.ok) throw new Error(`Samples fetch failed (${res.status})`);
  return res.json();
}

export async function fetchReportsList(athleteId = 'ALL') {
  const query = athleteId && athleteId !== 'ALL' ? `?athlete_id=${encodeURIComponent(athleteId)}` : '';
  const res = await fetch(`${apiBaseUrl}/api/reports/list${query}`);
  if (!res.ok) throw new Error(`Reports fetch failed (${res.status})`);
  return res.json();
}

export async function fetchAthletes() {
  const res = await fetch(`${apiBaseUrl}/api/athletes`);
  if (!res.ok) throw new Error(`Athletes fetch failed (${res.status})`);
  return res.json();
}

export async function createAthlete(payload) {
  const res = await fetch(`${apiBaseUrl}/api/athletes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || `Could not create sportsman (${res.status})`);
  return data;
}

export async function fetchAthleteAnalytics(athleteId) {
  const res = await fetch(`${apiBaseUrl}/api/athletes/${encodeURIComponent(athleteId)}/analytics`);
  if (!res.ok) throw new Error(`Sportsman analytics failed (${res.status})`);
  return res.json();
}

export async function fetchDrills() {
  const res = await fetch(`${apiBaseUrl}/api/drills`);
  if (!res.ok) throw new Error(`Drills fetch failed (${res.status})`);
  return res.json();
}

