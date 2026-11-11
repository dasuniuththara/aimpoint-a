import { Platform } from 'react-native';

// Default FastAPI backend host:
// - Android Emulator uses 10.0.2.2 to reach host localhost:8080
// - iOS Simulator / Web uses localhost:8080
// - Physical phones can set their PC LAN IP (e.g. http://192.168.1.20:8080) in Settings tab
let apiBaseUrl = Platform.OS === 'android' ? 'http://10.0.2.2:8080' : 'http://localhost:8080';

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

export async function uploadAndAnalyzeVideo(videoUri, fileName = 'mobile_shot.mp4', athleteId = 'ATH-001') {
  const fd = new FormData();
  fd.append('athlete_id', athleteId);
  fd.append('video', {
    uri: videoUri,
    name: fileName,
    type: fileName.endsWith('.webm') ? 'video/webm' : 'video/mp4',
  });

  const res = await fetch(`${apiBaseUrl}/api/analyze-shot`, {
    method: 'POST',
    body: fd,
  });
  if (!res.ok) throw new Error(`Upload analysis failed (${res.status})`);
  return res.json();
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

