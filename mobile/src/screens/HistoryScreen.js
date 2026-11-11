import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { fetchReportsList } from '../services/api';

export default function HistoryScreen({ onSelectSession }) {
  const [reports, setReports] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [errMsg, setErrMsg] = useState(null);

  const load = async () => {
    setRefreshing(true);
    setErrMsg(null);
    try {
      const data = await fetchReportsList();
      setReports(data.reports || []);
    } catch (e) {
      setErrMsg(`Offline or unreachable FastAPI backend (${e.message})`);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Shot Progress History</Text>
        <Text style={styles.sub}>Chronological Coaching Cards persisted in SQLite</Text>
      </View>

      {errMsg && (
        <View style={styles.errCard}>
          <Text style={styles.errText}>{errMsg}</Text>
        </View>
      )}

      <FlatList
        data={reports}
        keyExtractor={(item) => item.session_id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
        ListEmptyComponent={!errMsg && <Text style={styles.empty}>No recorded shot sessions yet.</Text>}
        renderItem={({ item }) => {
          const isIdeal = item.fault_classification === 'Ideal Form';
          return (
            <TouchableOpacity style={styles.card} onPress={() => onSelectSession && onSelectSession(item)}>
              <View style={styles.rowTop}>
                <Text style={styles.athlete}>{item.athlete_name || item.athlete_id}</Text>
                <View style={[styles.badge, isIdeal ? styles.badgeOk : styles.badgeFault]}>
                  <Text style={[styles.badgeText, isIdeal ? styles.txtOk : styles.txtFault]}>{item.fault_classification}</Text>
                </View>
              </View>
              <Text style={styles.meta}>
                Release: {item.release_angle_deg}°  •  Drill: {item.prescribed_drill}
              </Text>
              <Text style={styles.time}>{item.timestamp}  •  ID: {item.session_id}</Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F4F6F9' },
  header: { padding: 14, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  title: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  sub: { fontSize: 12, color: '#64748B', marginTop: 2 },
  errCard: { margin: 14, padding: 12, backgroundColor: '#FEF2F2', borderColor: '#FECACA', borderWidth: 1, borderRadius: 10 },
  errText: { color: '#B91C1C', fontSize: 12, fontWeight: '600' },
  list: { padding: 14, gap: 10 },
  empty: { textAlign: 'center', color: '#64748B', marginTop: 32, fontSize: 13 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 13, borderWidth: 1, borderColor: '#E2E8F0', gap: 5 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  athlete: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  badgeOk: { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' },
  badgeFault: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  badgeText: { fontSize: 11, fontWeight: '700' },
  txtOk: { color: '#047857' },
  txtFault: { color: '#B91C1C' },
  meta: { fontSize: 12, color: '#334155', fontWeight: '500' },
  time: { fontSize: 11, color: '#64748B' },
});

