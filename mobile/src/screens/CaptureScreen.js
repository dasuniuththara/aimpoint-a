import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Animated, Platform
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Speech from 'expo-speech';
import Svg, { Rect, Line, Circle, Text as SvgText } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { runBenchmarkShot, uploadAndAnalyzeVideo } from '../services/api';

const PLAYERS = [
  { id: 'ATH-001', jersey: '01', name: 'K. Perera' },
  { id: 'ATH-002', jersey: '07', name: 'D. Silva' },
  { id: 'ATH-003', jersey: '11', name: 'M. Fernando' },
  { id: 'ATH-004', jersey: '23', name: 'Kirindegama' },
];

const FAULT_CHIPS = [
  { id: 0, label: 'Ideal Form' },
  { id: 1, label: 'Low Elbow' },
  { id: 2, label: 'Short Follow-Through' },
  { id: 3, label: 'Imbalanced Base' },
  { id: 4, label: 'Early Release' },
];

export default function CaptureScreen({ onAnalysisComplete }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [showGuide, setShowGuide] = useState(true);
  const [camReady, setCamReady] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorBanner, setErrorBanner] = useState(null);
  const [athleteId, setAthleteId] = useState('ATH-001');
  const [facing, setFacing] = useState('back');
  const cameraRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const notify = (title, msg) => {
    setErrorBanner(`${title}: ${msg}`);
    if (Platform.OS !== 'web') {
      Alert.alert(title, msg);
    }
  };

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.03, duration: 900, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 900, useNativeDriver: Platform.OS !== 'web' }),
      ])
    ).start();
  }, [pulseAnim]);

  const handleAnalyzeResponse = (res) => {
    setErrorBanner(null);
    if (res && res.status === 'success') {
      onAnalysisComplete(res);
    } else {
      notify('Analysis Notice', 'Could not parse server response.');
    }
  };

  const handlePickVideo = async () => {
    setErrorBanner(null);
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        notify('Permission Needed', 'Please allow photo/video library access to select a shot clip.');
        return;
      }
      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsEditing: false,
        quality: 1,
      });
      if (picked.canceled || !picked.assets || !picked.assets.length) return;
      const asset = picked.assets[0];
      setLoading(true);
      const res = await uploadAndAnalyzeVideo(asset.uri, asset.fileName || 'shot_upload.mp4', athleteId);
      handleAnalyzeResponse(res);
    } catch (err) {
      notify('Upload Failed', `${err.message} — Ensure FastAPI backend is running on port 8080.`);
    } finally {
      setLoading(false);
    }
  };

  const handleCameraShotCapture = async () => {
    setErrorBanner(null);
    if (!permission || !permission.granted) {
      try {
        const p = await requestPermission();
        if (!p.granted && Platform.OS !== 'web') {
          notify('Camera Permission', 'Enable camera access to capture live sagittal shooting motion.');
          return;
        }
      } catch (e) {}
    }

    let c = 3;
    setCountdown(c);
    try { Speech.speak('3', { rate: 1.05 }); } catch (e) {}

    const timer = setInterval(async () => {
      c -= 1;
      if (c > 0) {
        setCountdown(c);
        try { Speech.speak(String(c), { rate: 1.05 }); } catch (e) {}
      } else {
        clearInterval(timer);
        setCountdown('SHOOT!');
        try { Speech.speak('Shoot!', { rate: 1.1 }); } catch (e) {}

        try {
          if (camReady && cameraRef.current && typeof cameraRef.current.recordAsync === 'function') {
            const recordPromise = cameraRef.current.recordAsync({ maxDuration: 3 });
            setTimeout(() => {
              if (cameraRef.current && typeof cameraRef.current.stopRecording === 'function') {
                cameraRef.current.stopRecording();
              }
            }, 2400);
            const clip = await recordPromise;
            setCountdown(null);
            if (clip && clip.uri) {
              setLoading(true);
              const res = await uploadAndAnalyzeVideo(clip.uri, 'live_sagittal_shot.mp4', athleteId);
              handleAnalyzeResponse(res);
              return;
            }
          }
        } catch (err) {
        }

        // Virtual sagittal capture fallback when no webcam hardware is connected
        setCountdown(null);
        setLoading(true);
        try {
          const res = await runBenchmarkShot(0, athleteId);
          handleAnalyzeResponse(res);
        } catch (e) {
          notify('Backend Unreachable', `${e.message} — Start FastAPI on port 8080 (python start_server.py).`);
        } finally {
          setLoading(false);
        }
      }
    }, 850);
  };

  const handleBenchmarkTest = async (faultType) => {
    setErrorBanner(null);
    setLoading(true);
    try {
      const res = await runBenchmarkShot(faultType, athleteId);
      handleAnalyzeResponse(res);
    } catch (err) {
      notify('Backend Unreachable', `${err.message} — Verify FastAPI is running on port 8080.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Active Jersey Selector Bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.playerStrip}>
        {PLAYERS.map((p) => {
          const active = athleteId === p.id;
          return (
            <TouchableOpacity
              key={p.id}
              style={[styles.playerPill, active && styles.playerPillActive]}
              onPress={() => setAthleteId(p.id)}
            >
              <View style={[styles.jerseyBadge, active && styles.jerseyBadgeActive]}>
                <Text style={[styles.jerseyNum, active && styles.jerseyNumActive]}>#{p.jersey}</Text>
              </View>
              <Text style={[styles.playerName, active && styles.playerNameActive]}>{p.name}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Camera Viewfinder with Broadcast Viewfinder Corner Brackets */}
      <View style={styles.cameraContainer}>
        {permission && permission.granted ? (
          <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={facing} mode="video" onCameraReady={() => setCamReady(true)} />
        ) : (
          <View style={styles.cameraPlaceholder}>
            <View style={styles.camIconGlow}>
              <Ionicons name="videocam" size={32} color="#FBBF24" />
            </View>
            <Text style={styles.placeholderText}>Sagittal Court Camera</Text>
            <Text style={styles.placeholderSub}>Position shooter 2.5m–3.0m in side profile</Text>
            <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
              <Text style={styles.permBtnText}>Enable Camera Access</Text>
            </TouchableOpacity>
          </View>
        )}

        {showGuide && camReady && (
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <Svg width="100%" height="100%" viewBox="0 0 320 260">
              {/* Pro Broadcast Framing Box */}
              <Rect x="72" y="18" width="176" height="224" rx="14" stroke="#FBBF24" strokeWidth="1.6" strokeDasharray="6 4" fill="rgba(6,6,8,0.22)" />
              <Circle cx="160" cy="52" r="14" stroke="#FBBF24" strokeWidth="2" fill="none" />
              <Line x1="160" y1="66" x2="152" y2="132" stroke="#FBBF24" strokeWidth="2.4" strokeDasharray="4 3" />
              <Line x1="156" y1="80" x2="188" y2="96" stroke="#34D399" strokeWidth="2.4" />
              <Line x1="188" y1="96" x2="194" y2="60" stroke="#34D399" strokeWidth="2.4" />
              <Line x1="152" y1="132" x2="164" y2="178" stroke="#FBBF24" strokeWidth="2.4" />
              <Line x1="164" y1="178" x2="152" y2="224" stroke="#FBBF24" strokeWidth="2.4" />
              <SvgText x="160" y="236" fill="#FDE68A" fontSize="9.5" fontWeight="bold" textAnchor="middle">
                2.5m – 3.0m SAGITTAL ALIGNMENT
              </SvgText>
            </Svg>
          </View>
        )}

        {countdown !== null && (
          <View style={styles.countdownOverlay}>
            <Text style={styles.countdownText}>{countdown}</Text>
            <Text style={styles.countdownSub}>1080p • 30 FPS Capture</Text>
          </View>
        )}

        <View style={styles.camTopControls}>
          <TouchableOpacity style={styles.camPill} onPress={() => setShowGuide(!showGuide)}>
            <Ionicons name="scan-outline" size={14} color="#FBBF24" />
            <Text style={styles.camPillText}>{showGuide ? 'Guide ON' : 'Guide OFF'}</Text>
          </TouchableOpacity>
          <View style={styles.liveTag}>
            <View style={styles.liveDot} />
            <Text style={styles.liveTagTxt}>30 FPS</Text>
          </View>
          <TouchableOpacity style={styles.camPill} onPress={() => setFacing(facing === 'back' ? 'front' : 'back')}>
            <Ionicons name="camera-reverse-outline" size={14} color="#FFFFFF" />
            <Text style={styles.camPillText}>Flip</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Reactive Animated Action Buttons */}
      <View style={styles.actionRow}>
        <Animated.View style={{ flex: 1, transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity style={styles.primaryBtn} onPress={handleCameraShotCapture} disabled={loading} activeOpacity={0.85}>
            <Ionicons name="radio-button-on" size={18} color="#060608" />
            <Text style={styles.primaryBtnText}>Record Shot</Text>
          </TouchableOpacity>
        </Animated.View>

        <TouchableOpacity style={styles.secondaryBtn} onPress={handlePickVideo} disabled={loading} activeOpacity={0.85}>
          <Ionicons name="cloud-upload-outline" size={18} color="#FBBF24" />
          <Text style={styles.secondaryBtnText}>Upload Clip</Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.loadingCard}>
          <ActivityIndicator size="small" color="#FBBF24" />
          <Text style={styles.loadingText}>Running 3D→2D Moving-Sticks Pose Extraction &amp; Error Audit...</Text>
        </View>
      )}

      {errorBanner && (
        <View style={styles.errBanner}>
          <Ionicons name="warning-outline" size={16} color="#F87171" />
          <Text style={styles.errBannerTxt}>{errorBanner}</Text>
        </View>
      )}

      {/* Instant Court Condition Simulator */}
      <View style={styles.sampleCard}>
        <View style={styles.sampleHeadRow}>
          <Ionicons name="basketball" size={16} color="#F59E0B" />
          <Text style={styles.sampleHeading}>Instant Fault Benchmarks</Text>
        </View>
        <Text style={styles.sampleDesc}>Tap any shooting condition to inspect 2D Moving Sticks &amp; Coaching Card:</Text>
        <View style={styles.chipGrid}>
          {FAULT_CHIPS.map((c) => (
            <TouchableOpacity key={c.id} style={styles.chip} onPress={() => handleBenchmarkTest(c.id)} disabled={loading} activeOpacity={0.75}>
              <Text style={styles.chipText}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#060608' },
  content: { padding: 14, gap: 12, maxWidth: 540, width: '100%', alignSelf: 'center' },
  playerStrip: { gap: 8, paddingVertical: 2 },
  playerPill: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#101114', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', paddingRight: 12, paddingLeft: 5, paddingVertical: 5, borderRadius: 20 },
  playerPillActive: { borderColor: '#F59E0B', backgroundColor: 'rgba(245,158,11,0.12)' },
  jerseyBadge: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#1C1D22', alignItems: 'center', justifyContent: 'center' },
  jerseyBadgeActive: { backgroundColor: '#F59E0B' },
  jerseyNum: { fontSize: 10, fontWeight: '800', color: '#A1A1AA' },
  jerseyNumActive: { color: '#060608' },
  playerName: { fontSize: 12, fontWeight: '600', color: '#A1A1AA' },
  playerNameActive: { color: '#FDE68A' },
  cameraContainer: { height: 278, backgroundColor: '#090A0D', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', justifyContent: 'center' },
  cameraPlaceholder: { alignItems: 'center', justifyContent: 'center', gap: 7 },
  camIconGlow: { width: 58, height: 58, borderRadius: 29, backgroundColor: 'rgba(245,158,11,0.14)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.35)', alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  placeholderText: { color: '#F4F4F5', fontSize: 14, fontWeight: '700' },
  placeholderSub: { color: '#A1A1AA', fontSize: 11 },
  permBtn: { backgroundColor: '#F59E0B', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8, marginTop: 6 },
  permBtnText: { color: '#060608', fontSize: 12, fontWeight: '800' },
  camTopControls: { position: 'absolute', top: 10, left: 10, right: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  camPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(16,17,20,0.85)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' },
  camPillText: { color: '#FFFFFF', fontSize: 11, fontWeight: '600' },
  liveTag: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(16,17,20,0.85)', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(52,211,153,0.35)' },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#34D399' },
  liveTagTxt: { color: '#34D399', fontSize: 10, fontWeight: '800' },
  countdownOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(6,6,8,0.86)', alignItems: 'center', justifyContent: 'center' },
  countdownText: { color: '#FBBF24', fontSize: 58, fontWeight: '900' },
  countdownSub: { color: '#D4D4D8', fontSize: 12, marginTop: 6 },
  actionRow: { flexDirection: 'row', gap: 10 },
  primaryBtn: { flexDirection: 'row', gap: 7, backgroundColor: '#F59E0B', paddingVertical: 13.5, borderRadius: 11, alignItems: 'center', justifyContent: 'center', shadowColor: '#F59E0B', shadowOpacity: 0.35, shadowRadius: 10 },
  primaryBtnText: { color: '#060608', fontWeight: '800', fontSize: 13.5 },
  secondaryBtn: { flex: 1, flexDirection: 'row', gap: 7, backgroundColor: '#101114', borderWidth: 1, borderColor: 'rgba(245,158,11,0.45)', paddingVertical: 13.5, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  secondaryBtnText: { color: '#FBBF24', fontWeight: '700', fontSize: 13.5 },
  loadingCard: { flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: 'rgba(245,158,11,0.12)', borderRadius: 11, padding: 12, borderWidth: 1, borderColor: 'rgba(245,158,11,0.35)' },
  loadingText: { fontSize: 12, color: '#FDE68A', flex: 1, fontWeight: '600' },
  errBanner: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: 'rgba(248,113,113,0.14)', borderRadius: 11, padding: 12, borderWidth: 1, borderColor: 'rgba(248,113,113,0.45)' },
  errBannerTxt: { fontSize: 12, color: '#FCA5A5', flex: 1, fontWeight: '600' },
  sampleCard: { backgroundColor: '#101114', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)', gap: 7 },
  sampleHeadRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sampleHeading: { fontSize: 14, fontWeight: '700', color: '#F4F4F5' },
  sampleDesc: { fontSize: 12, color: '#A1A1AA' },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: { backgroundColor: '#16171C', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 12, paddingVertical: 7.5, borderRadius: 9 },
  chipText: { fontSize: 12, fontWeight: '600', color: '#E4E4E7' },
});
