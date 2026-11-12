import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, ScrollView } from 'react-native';
import { fetchReportsList, fetchAthletes, fetchAthleteAnalytics } from '../services/api';

export default function HistoryScreen({ onSelectSession }) {
  const [athletes, setAthletes] = useState([]);
  const [selectedId, setSelectedId] = useState('ALL');
  const [athleteStats, setAthleteStats] = useState(null);
  const [reports, setReports] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [errMsg, setErrMsg] = useState(null);

  const load = useCallback(async (filterId = selectedId) => {
    setRefreshing(true);
    setErrMsg(null);
    try {
      const [athRes, repRes] = await Promise.all([
        fetchAthletes(),
        fetchReportsList(filterId),
      ]);
      if (athRes.status === 'success') {
        setAthletes(athRes.athletes || []);
      }
      setReports(repRes.reports || []);

      if (filterId && filterId !== 'ALL') {
        const statsRes = await fetchAthleteAnalytics(filterId);
        setAthleteStats(statsRes);
      } else {
        setAthleteStats(null);
      }
    } catch (e) {
      setErrMsg(`Offline or unreachable FastAPI backend (${e.message})`);
    } finally {
      setRefreshing(false);
    }
  }, [selectedId]);

  useEffect(() => {
    load(selectedId);
  }, [selectedId, load]);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Sportsman Analytics &amp; Shot History</Text>
        <Text style={styles.sub}>Tap a player to inspect their shot videos and fault metrics</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterStrip}>
          <TouchableOpacity
            style={[styles.filterPill, selectedId === 'ALL' && styles.filterPillActive]}
            onPress={() => setSelectedId('ALL')}
          >
            <Text style={[styles.filterTxt, selectedId === 'ALL' && styles.filterTxtActive]}>All Squad</Text>
          </TouchableOpacity>
          {athletes.map((a) => {
            const act = selectedId === a.athlete_id;
            return (
              <TouchableOpacity
                key={a.athlete_id}
                style={[styles.filterPill, act && styles.filterPillActive]}
                onPress={() => setSelectedId(a.athlete_id)}
              >
                <Text style={[styles.filterTxt, act && styles.filterTxtActive]}>
                  #{a.jersey_number || '00'} {a.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {errMsg && (
        <View style={styles.errCard}>
          <Text style={styles.errText}>{errMsg}</Text>
        </View>
      )}

      {athleteStats && athleteStats.athlete && (
        <View style={styles.analyticsCard}>
          <View style={styles.athRow}>
            <View style={styles.jerseyBox}>
              <Text style={styles.jerseyBoxTxt}>#{athleteStats.athlete.jersey_number || '00'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.athName}>{athleteStats.athlete.name}</Text>
              <Text style={styles.athMeta}>
                {athleteStats.athlete.position} • {athleteStats.athlete.team} • {athleteStats.athlete.shooting_hand || 'Right'}-Handed
              </Text>
            </View>
          </View>

          <View style={styles.kpiRow}>
            <View style={styles.kpiBox}>
              <Text style={styles.kpiLbl}>VIDEOS</Text>
              <Text style={styles.kpiVal}>{athleteStats.metrics?.totalSessions || 0}</Text>
            </View>
            <View style={styles.kpiBox}>
              <Text style={styles.kpiLbl}>FORM SCORE</Text>
              <Text style={[styles.kpiVal, { color: '#34D399' }]}>{athleteStats.metrics?.averageFormScore || 0}%</Text>
            </View>
            <View style={styles.kpiBox}>
              <Text style={styles.kpiLbl}>AVG RELEASE</Text>
              <Text style={[styles.kpiVal, { color: '#FBBF24' }]}>{athleteStats.metrics?.averageReleaseAngle || 0}°</Text>
            </View>
            <View style={styles.kpiBox}>
              <Text style={styles.kpiLbl}>TOP FAULT</Text>
              <Text style={styles.kpiFault} numberOfLines={1}>{athleteStats.metrics?.topFault || 'None'}</Text>
            </View>
          </View>
        </View>
      )}

      <FlatList
        data={reports}
        keyExtractor={(item) => item.session_id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(selectedId)} />}
        ListEmptyComponent={!errMsg && <Text style={styles.empty}>No recorded shot videos for this sportsman yet.</Text>}
        renderItem={({ item }) => {
          const isIdeal = item.fault_classification === 'Ideal Form';
          return (
            <TouchableOpacity style={styles.card} onPress={() => onSelectSession && onSelectSession(item)}>
              <View style={styles.rowTop}>
                <Text style={styles.athlete}>#{item.jersey_number || '00'} {item.athlete_name || item.athlete_id}</Text>
                <View style={[styles.badge, isIdeal ? styles.badgeOk : styles.badgeFault]}>
                  <Text style={[styles.badgeText, isIdeal ? styles.txtOk : styles.txtFault]}>{item.fault_classification}</Text>
                </View>
              </View>
              <Text style={styles.meta}>
                Release: {item.release_angle_deg}°  •  Drill: {item.prescribed_drill}
              </Text>
              <Text style={styles.time}>Clip: {item.video_name || 'shot_capture.mp4'}  •  {item.timestamp}</Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#060608' },
  header: { padding: 14, backgroundColor: '#101114', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.09)', gap: 6 },
  title: { fontSize: 16, fontWeight: '800', color: '#F4F4F5' },
  sub: { fontSize: 12, color: '#A1A1AA' },
  filterStrip: { gap: 8, paddingTop: 4 },
  filterPill: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 16, backgroundColor: '#16171C', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  filterPillActive: { backgroundColor: 'rgba(245,158,11,0.18)', borderColor: '#F59E0B' },
  filterTxt: { fontSize: 12, fontWeight: '600', color: '#A1A1AA' },
  filterTxtActive: { color: '#FDE68A' },
  analyticsCard: { marginHorizontal: 14, marginTop: 12, backgroundColor: '#101114', borderRadius: 14, padding: 13, borderWidth: 1, borderColor: 'rgba(245,158,11,0.4)', gap: 10, maxWidth: 540, width: '94%', alignSelf: 'center' },
  athRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  jerseyBox: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#F59E0B', alignItems: 'center', justifyContent: 'center' },
  jerseyBoxTxt: { color: '#060608', fontWeight: '900', fontSize: 13 },
  athName: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  athMeta: { color: '#A1A1AA', fontSize: 11, marginTop: 1 },
  kpiRow: { flexDirection: 'row', gap: 8 },
  kpiBox: { flex: 1, backgroundColor: '#16171C', borderRadius: 9, padding: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  kpiLbl: { fontSize: 9, color: '#A1A1AA', fontWeight: '700' },
  kpiVal: { fontSize: 14, color: '#FFFFFF', fontWeight: '800', marginTop: 2 },
  kpiFault: { fontSize: 10.5, color: '#F87171', fontWeight: '700', marginTop: 4 },
  errCard: { margin: 14, padding: 12, backgroundColor: 'rgba(248,113,113,0.12)', borderColor: 'rgba(248,113,113,0.4)', borderWidth: 1, borderRadius: 10 },
  errText: { color: '#F87171', fontSize: 12, fontWeight: '600' },
  list: { padding: 14, gap: 10, maxWidth: 540, width: '100%', alignSelf: 'center' },
  empty: { textAlign: 'center', color: '#A1A1AA', marginTop: 32, fontSize: 13 },
  card: { backgroundColor: '#101114', borderRadius: 13, padding: 13.5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)', gap: 5 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  athlete: { fontSize: 14, fontWeight: '700', color: '#F4F4F5' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  badgeOk: { backgroundColor: 'rgba(52,211,153,0.14)', borderColor: 'rgba(52,211,153,0.4)' },
  badgeFault: { backgroundColor: 'rgba(248,113,113,0.14)', borderColor: 'rgba(248,113,113,0.4)' },
  badgeText: { fontSize: 11, fontWeight: '700' },
  txtOk: { color: '#34D399' },
  txtFault: { color: '#F87171' },
  meta: { fontSize: 12, color: '#D4D4D8', fontWeight: '500' },
  time: { fontSize: 11, color: '#A1A1AA' },
});

