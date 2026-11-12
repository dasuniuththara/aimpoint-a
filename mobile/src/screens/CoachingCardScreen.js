import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated } from 'react-native';
import * as Speech from 'expo-speech';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import StickFigureSvg from '../components/StickFigureSvg';

export default function CoachingCardScreen({ analysis, onOpenHistory }) {
  const [frameIdx, setFrameIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [showAudit, setShowAudit] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(14)).current;

  const wireframes = (analysis && analysis.wireframes) || [];
  const card = (analysis && analysis.coaching_card) || null;
  const kin = (analysis && analysis.kinematic_summary) || {};
  const audits = (analysis && analysis.checkpoint_audits) || [];

  useEffect(() => {
    setFrameIdx(0);
    setPlaying(true);
    fadeAnim.setValue(0);
    slideAnim.setValue(14);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 360, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, speed: 14, bounciness: 6, useNativeDriver: true }),
    ]).start();
  }, [analysis]);

  useEffect(() => {
    if (!playing || wireframes.length <= 1) return;
    const timer = setInterval(() => {
      setFrameIdx((prev) => (prev + 1) % wireframes.length);
    }, 50);
    return () => clearInterval(timer);
  }, [playing, wireframes.length]);

  if (!analysis || !card) {
    return (
      <View style={styles.emptyWrap}>
        <View style={styles.emptyIconBox}>
          <Ionicons name="basketball-outline" size={38} color="#FBBF24" />
        </View>
        <Text style={styles.emptyTitle}>No Shot Analyzed Yet</Text>
        <Text style={styles.emptySub}>Record a sagittal clip or pick a fault benchmark on Capture Shot to view your Moving-Sticks 2D Model &amp; Coaching Card.</Text>
      </View>
    );
  }

  const isFaulty = card.fault_id !== 0;
  const scores = { 0: 98, 1: 64, 2: 72, 3: 58, 4: 69 };
  const formScore = scores[card.fault_id] ?? 76;
  const circ = 2 * Math.PI * 26;
  const offset = circ * (1 - formScore / 100);
  const ringCol = formScore >= 85 ? '#34D399' : formScore >= 70 ? '#FBBF24' : '#F87171';

  const handleSpeakCue = () => {
    Speech.stop();
    Speech.speak(`${card.primary_fault}. ${card.why_it_matters}. Recommended drill: ${card.prescribed_drill}. ${card.actionable_cue}`);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Upper Section: 2D Moving-Sticks Player */}
      <View style={styles.playerCard}>
        <StickFigureSvg
          wireframes={wireframes}
          frameIdx={frameIdx}
          isFaulty={isFaulty}
          faultName={card.primary_fault}
        />

        <View style={styles.controlsBar}>
          <TouchableOpacity style={styles.ctrlBtn} onPress={() => setPlaying(!playing)}>
            <Ionicons name={playing ? 'pause' : 'play'} size={15} color="#060608" />
            <Text style={styles.ctrlBtnText}>{playing ? 'Pause' : 'Play'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.stepBtn} onPress={() => { setPlaying(false); setFrameIdx((frameIdx - 1 + wireframes.length) % Math.max(1, wireframes.length)); }}>
            <Text style={styles.stepText}>-1F</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.stepBtn} onPress={() => { setPlaying(false); setFrameIdx((frameIdx + 1) % Math.max(1, wireframes.length)); }}>
            <Text style={styles.stepText}>+1F</Text>
          </TouchableOpacity>
          <Text style={styles.frameLabel}>F{frameIdx + 1}/{wireframes.length}</Text>
        </View>

        <View style={styles.telemetryGrid}>
          <View style={styles.teleBox}>
            <Text style={styles.teleLbl}>ELBOW</Text>
            <Text style={styles.teleVal}>{kin.min_elbow_angle ?? '--'}°</Text>
          </View>
          <View style={styles.teleBox}>
            <Text style={styles.teleLbl}>RELEASE</Text>
            <Text style={styles.teleVal}>{kin.release_angle_deg ?? '--'}°</Text>
          </View>
          <View style={styles.teleBox}>
            <Text style={styles.teleLbl}>TRUNK</Text>
            <Text style={styles.teleVal}>{kin.max_trunk_tilt ?? '--'}°</Text>
          </View>
          <View style={styles.teleBox}>
            <Text style={styles.teleLbl}>LATENCY</Text>
            <Text style={[styles.teleVal, { color: '#FBBF24' }]}>{analysis.latency_ms ?? '--'}ms</Text>
          </View>
        </View>
      </View>

      {/* Lower Section: Reactive Animated Coaching Card with SVG Form Score Ring */}
      <Animated.View style={[styles.coachingCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.cardHeaderRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardHeader}>THE COACHING CARD</Text>
            <Text style={styles.faultTitle}>{card.primary_fault}</Text>
            <Text style={styles.confLine}>
              Confidence {card.confidence_score}%  •  Delta {card.deviation_degrees}°
            </Text>
          </View>

          {/* Animated-style SVG Circular Score Gauge */}
          <View style={styles.ringWrap}>
            <Svg width="66" height="66" viewBox="0 0 66 66">
              <Circle cx="33" cy="33" r="26" stroke="rgba(255,255,255,0.1)" strokeWidth="5.5" fill="none" />
              <Circle
                cx="33" cy="33" r="26" stroke={ringCol} strokeWidth="5.5" fill="none"
                strokeDasharray={`${circ}`} strokeDashoffset={`${offset}`}
                strokeLinecap="round" transform="rotate(-90 33 33)"
              />
            </Svg>
            <View style={styles.ringTextOverlay}>
              <Text style={[styles.ringNum, { color: ringCol }]}>{formScore}</Text>
              <Text style={styles.ringSub}>SCORE</Text>
            </View>
          </View>
        </View>

        <View style={styles.whyBox}>
          <Text style={styles.whyHeading}>WHY IT MATTERS</Text>
          <Text style={styles.whyBody}>{card.why_it_matters}</Text>
        </View>

        <View style={styles.drillBox}>
          <View style={styles.drillHeaderRow}>
            <Text style={styles.drillHeading}>TARGETED DRILL PRESCRIPTION</Text>
            <Text style={styles.drillSets}>{card.drill_sets_reps}</Text>
          </View>
          <Text style={styles.drillTitle}>{card.prescribed_drill}</Text>
          <Text style={styles.drillCue}>"{card.actionable_cue}"</Text>
        </View>

        <View style={styles.ctaRow}>
          <TouchableOpacity style={styles.speakBtn} onPress={handleSpeakCue} activeOpacity={0.8}>
            <Ionicons name="volume-high" size={16} color="#FBBF24" />
            <Text style={styles.speakText}>Speak Cue</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.historyBtn} onPress={onOpenHistory} activeOpacity={0.8}>
            <Ionicons name="time" size={16} color="#060608" />
            <Text style={styles.historyText}>Progress History</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      <TouchableOpacity style={styles.auditToggle} onPress={() => setShowAudit(!showAudit)}>
        <Text style={styles.auditToggleText}>
          {showAudit ? 'Hide 5-Checkpoint Breakdown' : 'Inspect All 5 Checkpoint Angles'}
        </Text>
        <Ionicons name={showAudit ? 'chevron-up' : 'chevron-down'} size={18} color="#A1A1AA" />
      </TouchableOpacity>

      {showAudit && (
        <View style={styles.auditList}>
          {audits.map((a, idx) => {
            const err = a.status === 'FAULT';
            return (
              <View key={idx} style={[styles.auditRow, err && styles.auditRowErr]}>
                <View style={styles.auditTop}>
                  <Text style={styles.auditName}>[{err ? 'ERROR' : 'PASS'}] {a.checkpoint}</Text>
                  <Text style={[styles.auditVal, err && styles.auditValErr]}>{a.measured} ({a.target})</Text>
                </View>
                <Text style={styles.auditAdvice}>{a.advice}</Text>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#060608' },
  content: { padding: 14, gap: 12, maxWidth: 540, width: '100%', alignSelf: 'center' },
  emptyWrap: { flex: 1, backgroundColor: '#060608', alignItems: 'center', justifyContent: 'center', padding: 28 },
  emptyIconBox: { width: 68, height: 68, borderRadius: 34, backgroundColor: 'rgba(245,158,11,0.12)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.35)', alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#F4F4F5', marginTop: 12 },
  emptySub: { fontSize: 13, color: '#A1A1AA', textAlign: 'center', marginTop: 6, lineHeight: 19 },
  playerCard: { backgroundColor: '#101114', borderRadius: 15, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)', gap: 10 },
  controlsBar: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ctrlBtn: { flexDirection: 'row', gap: 5, alignItems: 'center', backgroundColor: '#F59E0B', paddingHorizontal: 13, paddingVertical: 6.5, borderRadius: 8 },
  ctrlBtnText: { color: '#060608', fontSize: 12, fontWeight: '800' },
  stepBtn: { backgroundColor: '#16171C', paddingHorizontal: 10, paddingVertical: 6.5, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  stepText: { color: '#F4F4F5', fontSize: 11, fontWeight: '700' },
  frameLabel: { marginLeft: 'auto', fontSize: 11, color: '#A1A1AA', fontWeight: '700' },
  telemetryGrid: { flexDirection: 'row', gap: 6 },
  teleBox: { flex: 1, backgroundColor: '#16171C', padding: 8, borderRadius: 9, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  teleLbl: { fontSize: 9.5, color: '#A1A1AA', fontWeight: '700', letterSpacing: 0.4 },
  teleVal: { fontSize: 13.5, fontWeight: '800', color: '#F4F4F5', marginTop: 2 },
  coachingCard: { backgroundColor: '#101114', borderRadius: 15, padding: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', gap: 11 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  cardHeader: { fontSize: 10, fontWeight: '800', color: '#FBBF24', letterSpacing: 1 },
  faultTitle: { fontSize: 21, fontWeight: '800', color: '#FFFFFF', marginTop: 2 },
  confLine: { fontSize: 12, color: '#A1A1AA', fontWeight: '500', marginTop: 3 },
  ringWrap: { width: 66, height: 66, alignItems: 'center', justifyContent: 'center' },
  ringTextOverlay: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  ringNum: { fontSize: 17, fontWeight: '900' },
  ringSub: { fontSize: 7.5, fontWeight: '800', color: '#A1A1AA', letterSpacing: 0.5 },
  whyBox: { backgroundColor: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.28)', borderWidth: 1, borderRadius: 10, padding: 11, gap: 4 },
  whyHeading: { fontSize: 10, fontWeight: '800', color: '#FBBF24' },
  whyBody: { fontSize: 12.5, color: '#E4E4E7', lineHeight: 18 },
  drillBox: { backgroundColor: '#16171C', borderColor: 'rgba(251,146,60,0.3)', borderWidth: 1, borderRadius: 10, padding: 11, gap: 5 },
  drillHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  drillHeading: { fontSize: 10, fontWeight: '800', color: '#FB923C' },
  drillSets: { fontSize: 10, color: '#FDE68A', fontWeight: '700' },
  drillTitle: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  drillCue: { fontSize: 12, color: '#D4D4D8', fontStyle: 'italic' },
  ctaRow: { flexDirection: 'row', gap: 8, marginTop: 2 },
  speakBtn: { flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: '#16171C', borderWidth: 1, borderColor: 'rgba(245,158,11,0.45)', paddingVertical: 11, borderRadius: 10 },
  speakText: { color: '#FBBF24', fontSize: 12, fontWeight: '700' },
  historyBtn: { flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F59E0B', paddingVertical: 11, borderRadius: 10 },
  historyText: { color: '#060608', fontSize: 12, fontWeight: '800' },
  auditToggle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#101114', borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)', borderRadius: 11, padding: 12.5 },
  auditToggleText: { fontSize: 12, fontWeight: '700', color: '#D4D4D8' },
  auditList: { gap: 8 },
  auditRow: { backgroundColor: '#101114', borderRadius: 11, padding: 11, borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)', gap: 3 },
  auditRowErr: { backgroundColor: 'rgba(248,113,113,0.1)', borderColor: 'rgba(248,113,113,0.4)' },
  auditTop: { flexDirection: 'row', justifyContent: 'space-between' },
  auditName: { fontSize: 12, fontWeight: '700', color: '#F4F4F5' },
  auditVal: { fontSize: 11, fontWeight: '700', color: '#34D399' },
  auditValErr: { color: '#F87171' },
  auditAdvice: { fontSize: 11.5, color: '#A1A1AA' },
});
