import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import * as Speech from 'expo-speech';
import { Ionicons } from '@expo/vector-icons';
import StickFigureSvg from '../components/StickFigureSvg';

export default function CoachingCardScreen({ analysis, onOpenHistory }) {
  const [frameIdx, setFrameIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [showAudit, setShowAudit] = useState(false);

  const wireframes = (analysis && analysis.wireframes) || [];
  const card = (analysis && analysis.coaching_card) || null;
  const kin = (analysis && analysis.kinematic_summary) || {};
  const audits = (analysis && analysis.checkpoint_audits) || [];

  useEffect(() => {
    setFrameIdx(0);
    setPlaying(true);
  }, [analysis]);

  useEffect(() => {
    if (!playing || wireframes.length <= 1) return;
    const timer = setInterval(() => {
      setFrameIdx((prev) => (prev + 1) % wireframes.length);
    }, 55);
    return () => clearInterval(timer);
  }, [playing, wireframes.length]);

  if (!analysis || !card) {
    return (
      <View style={styles.emptyWrap}>
        <Ionicons name="analytics-outline" size={48} color="#94A3B8" />
        <Text style={styles.emptyTitle}>No Shot Analyzed Yet</Text>
        <Text style={styles.emptySub}>Capture a video or pick a sample shot on the Capture tab to view the 2D Model and Coaching Card.</Text>
      </View>
    );
  }

  const isFaulty = card.fault_id !== 0;

  const handleSpeakCue = () => {
    Speech.stop();
    Speech.speak(`${card.primary_fault}. ${card.why_it_matters}. Recommended drill: ${card.prescribed_drill}. ${card.actionable_cue}`);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Upper Section: Post-Processed Visual Moving-Sticks 2D Overlay (Thesis 4.6.6) */}
      <View style={styles.playerCard}>
        <StickFigureSvg
          wireframes={wireframes}
          frameIdx={frameIdx}
          isFaulty={isFaulty}
          faultName={card.primary_fault}
        />

        <View style={styles.controlsBar}>
          <TouchableOpacity style={styles.ctrlBtn} onPress={() => setPlaying(!playing)}>
            <Ionicons name={playing ? 'pause' : 'play'} size={16} color="#FFFFFF" />
            <Text style={styles.ctrlBtnText}>{playing ? 'Pause' : 'Play'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.stepBtn} onPress={() => { setPlaying(false); setFrameIdx((frameIdx - 1 + wireframes.length) % Math.max(1, wireframes.length)); }}>
            <Text style={styles.stepText}>-1F</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.stepBtn} onPress={() => { setPlaying(false); setFrameIdx((frameIdx + 1) % Math.max(1, wireframes.length)); }}>
            <Text style={styles.stepText}>+1F</Text>
          </TouchableOpacity>
          <Text style={styles.frameLabel}>Frame {frameIdx + 1}/{wireframes.length}</Text>
        </View>

        <View style={styles.telemetryGrid}>
          <View style={styles.teleBox}>
            <Text style={styles.teleLbl}>Min Elbow</Text>
            <Text style={styles.teleVal}>{kin.min_elbow_angle ?? '--'}°</Text>
          </View>
          <View style={styles.teleBox}>
            <Text style={styles.teleLbl}>Release</Text>
            <Text style={styles.teleVal}>{kin.release_angle_deg ?? '--'}°</Text>
          </View>
          <View style={styles.teleBox}>
            <Text style={styles.teleLbl}>Trunk Tilt</Text>
            <Text style={styles.teleVal}>{kin.max_trunk_tilt ?? '--'}°</Text>
          </View>
          <View style={styles.teleBox}>
            <Text style={styles.teleLbl}>Latency</Text>
            <Text style={styles.teleVal}>{analysis.latency_ms ?? '--'} ms</Text>
          </View>
        </View>
      </View>

      {/* Lower Section: Structured Actionable "Coaching Card" (Thesis 4.6.6) */}
      <View style={styles.coachingCard}>
        <View style={styles.cardTopRow}>
          <Text style={styles.cardHeader}>THE COACHING CARD</Text>
          <View style={[styles.sevBadge, isFaulty ? styles.sevRed : styles.sevGreen]}>
            <Text style={[styles.sevText, isFaulty ? styles.sevTextRed : styles.sevTextGreen]}>
              {card.severity_tier || (isFaulty ? 'Deviation' : 'Optimal')}
            </Text>
          </View>
        </View>

        {/* 1. Primary Fault Identification */}
        <Text style={styles.faultTitle}>{card.primary_fault}</Text>
        <Text style={styles.confLine}>
          Confidence: {card.confidence_score}%  •  Deviation: {card.deviation_degrees}°
        </Text>

        {/* 2. Why It Matters */}
        <View style={styles.whyBox}>
          <Text style={styles.whyHeading}>WHY IT MATTERS</Text>
          <Text style={styles.whyBody}>{card.why_it_matters}</Text>
        </View>

        {/* 3. Targeted Drill Prescription */}
        <View style={styles.drillBox}>
          <View style={styles.drillHeaderRow}>
            <Text style={styles.drillHeading}>TARGETED DRILL PRESCRIPTION</Text>
            <Text style={styles.drillSets}>{card.drill_sets_reps}</Text>
          </View>
          <Text style={styles.drillTitle}>{card.prescribed_drill}</Text>
          <Text style={styles.drillCue}>"{card.actionable_cue}"</Text>
        </View>

        <View style={styles.ctaRow}>
          <TouchableOpacity style={styles.speakBtn} onPress={handleSpeakCue}>
            <Ionicons name="volume-high-outline" size={16} color="#FB923C" />
            <Text style={styles.speakText}>Speak Cue</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.historyBtn} onPress={onOpenHistory}>
            <Ionicons name="time-outline" size={16} color="#FFFFFF" />
            <Text style={styles.historyText}>View Progress History</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Collapsible 5-Checkpoint Error Breakdown */}
      <TouchableOpacity style={styles.auditToggle} onPress={() => setShowAudit(!showAudit)}>
        <Text style={styles.auditToggleText}>
          {showAudit ? 'Hide 5-Checkpoint Breakdown' : 'Show All 5 Checkpoint Measurements'}
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
  screen: { flex: 1, backgroundColor: '#09090B' },
  content: { padding: 14, gap: 12 },
  emptyWrap: { flex: 1, backgroundColor: '#09090B', alignItems: 'center', justifyContent: 'center', padding: 28 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#F4F4F5', marginTop: 10 },
  emptySub: { fontSize: 13, color: '#A1A1AA', textAlign: 'center', marginTop: 6, lineHeight: 19 },
  playerCard: { backgroundColor: '#121214', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#27272A', gap: 10 },
  controlsBar: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ctrlBtn: { flexDirection: 'row', gap: 5, alignItems: 'center', backgroundColor: '#EA580C', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 7 },
  ctrlBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  stepBtn: { backgroundColor: '#18181B', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 7, borderWidth: 1, borderColor: '#27272A' },
  stepText: { color: '#F4F4F5', fontSize: 11, fontWeight: '700' },
  frameLabel: { marginLeft: 'auto', fontSize: 11, color: '#A1A1AA', fontWeight: '600' },
  telemetryGrid: { flexDirection: 'row', gap: 6 },
  teleBox: { flex: 1, backgroundColor: '#18181B', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#27272A' },
  teleLbl: { fontSize: 10, color: '#A1A1AA', fontWeight: '600' },
  teleVal: { fontSize: 13, fontWeight: '800', color: '#F4F4F5', marginTop: 2 },
  coachingCard: { backgroundColor: '#121214', borderRadius: 12, padding: 15, borderWidth: 1, borderColor: '#27272A', gap: 10 },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardHeader: { fontSize: 11, fontWeight: '800', color: '#A1A1AA', letterSpacing: 0.8 },
  sevBadge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  sevGreen: { backgroundColor: '#071E14', borderColor: '#065F46' },
  sevRed: { backgroundColor: '#220B0B', borderColor: '#991B1B' },
  sevText: { fontSize: 11, fontWeight: '700' },
  sevTextGreen: { color: '#34D399' },
  sevTextRed: { color: '#F87171' },
  faultTitle: { fontSize: 21, fontWeight: '800', color: '#F4F4F5' },
  confLine: { fontSize: 12, color: '#A1A1AA', fontWeight: '500' },
  whyBox: { backgroundColor: '#1C1507', borderColor: '#FCD34D', borderWidth: 1, borderRadius: 9, padding: 11, gap: 4 },
  whyHeading: { fontSize: 10, fontWeight: '800', color: '#FCD34D' },
  whyBody: { fontSize: 12, color: '#D4D4D8', lineHeight: 17 },
  drillBox: { backgroundColor: '#1F1209', borderColor: '#FDBA74', borderWidth: 1, borderRadius: 9, padding: 11, gap: 5 },
  drillHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  drillHeading: { fontSize: 10, fontWeight: '800', color: '#FB923C' },
  drillSets: { fontSize: 10, color: '#FDBA74', fontWeight: '600' },
  drillTitle: { fontSize: 15, fontWeight: '700', color: '#F4F4F5' },
  drillCue: { fontSize: 12, color: '#E4E4E7', fontStyle: 'italic' },
  ctaRow: { flexDirection: 'row', gap: 8, marginTop: 2 },
  speakBtn: { flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: '#18181B', borderWidth: 1, borderColor: '#FDBA74', paddingVertical: 10, borderRadius: 9 },
  speakText: { color: '#FB923C', fontSize: 12, fontWeight: '700' },
  historyBtn: { flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: '#27272A', paddingVertical: 10, borderRadius: 9 },
  historyText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  auditToggle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#121214', borderWidth: 1, borderColor: '#27272A', borderRadius: 10, padding: 12 },
  auditToggleText: { fontSize: 12, fontWeight: '700', color: '#D4D4D8' },
  auditList: { gap: 8 },
  auditRow: { backgroundColor: '#121214', borderRadius: 10, padding: 11, borderWidth: 1, borderColor: '#27272A', gap: 3 },
  auditRowErr: { backgroundColor: '#220B0B', borderColor: '#991B1B' },
  auditTop: { flexDirection: 'row', justifyContent: 'space-between' },
  auditName: { fontSize: 12, fontWeight: '700', color: '#F4F4F5' },
  auditVal: { fontSize: 11, fontWeight: '700', color: '#FB923C' },
  auditValErr: { color: '#F87171' },
  auditAdvice: { fontSize: 11, color: '#A1A1AA' },
});

