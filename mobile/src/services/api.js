import { Platform, NativeModules } from 'react-native';

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
      if (host !== 'localhost' && host !== '127.0.0.1') {
        return `http://${host}:8080`;
      }
    }
  } catch (e) {}
  return Platform.OS === 'android' ? 'http://10.0.2.2:8080' : 'http://localhost:8080';
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

export async function checkHealth() {
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

  if (mpOkCount >= 3 && validCount < 3) {
    throw new Error(`Error Video: "${fileName || 'Uploaded file'}" is unrelated to basketball (${validCount}/${nSamples} player poses found). Please upload a basketball shooting video.`);
  }
  return frames3D.length >= 3 ? frames3D : null;
}

export async function uploadAndAnalyzeVideo(videoUri, fileName = 'mobile_shot.mp4', athleteId = 'ATH-001') {
  const fd = new FormData();
  fd.append('athlete_id', athleteId);

  if (Platform.OS === 'web') {
    const webLandmarks = await extractWebLandmarksOrReject(videoUri, fileName);
    const resp = await fetch(videoUri);
    const blob = await resp.blob();
    fd.append('video', blob, fileName);
    if (webLandmarks) {
      fd.append('landmarks_json', JSON.stringify(webLandmarks));
    }
  } else {
    fd.append('video', {
      uri: videoUri,
      name: fileName,
      type: fileName.endsWith('.webm') ? 'video/webm' : 'video/mp4',
    });
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

export async function fetchSamples() {
  const res = await fetch(`${apiBaseUrl}/api/samples`);
  if (!res.ok) throw new Error(`Samples fetch failed (${res.status})`);
  return res.json();
}

export async function fetchReportsList() {
  const res = await fetch(`${apiBaseUrl}/api/reports/list`);
  if (!res.ok) throw new Error(`Reports fetch failed (${res.status})`);
  return res.json();
}

export async function fetchDrills() {
  const res = await fetch(`${apiBaseUrl}/api/drills`);
  if (!res.ok) throw new Error(`Drills fetch failed (${res.status})`);
  return res.json();
}

