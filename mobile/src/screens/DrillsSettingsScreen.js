import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { getApiBaseUrl, setApiBaseUrl, checkHealth, fetchDrills } from '../services/api';

export default function DrillsSettingsScreen() {
  const [urlInput, setUrlInput] = useState(getApiBaseUrl());
  const [statusTxt, setStatusTxt] = useState('Not checked');
  const [drills, setDrills] = useState([]);

  const loadDrills = async () => {
    try {
      const res = await fetchDrills();
      if (res && res.drills) setDrills(res.drills);
    } catch (e) {}
  };

  useEffect(() => { loadDrills(); }, []);

  const handleSaveAndTest = async () => {
    const clean = setApiBaseUrl(urlInput);
    try {
      const health = await checkHealth();
      setStatusTxt(`Connected (${health.status || 'online'})`);
      await loadDrills();
      Alert.alert('Connected', `Successfully connected to AimPoint FastAPI backend at ${clean}`);
    } catch (err) {
      setStatusTxt(`Unreachable: ${err.message}`);
      Alert.alert('Connection Failed', `Could not reach ${clean}. Make sure your phone and PC share the same Wi-Fi and port 8080 is open.`);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.title}>FastAPI Backend Connection</Text>
        <Text style={styles.desc}>
          Android Emulator uses http://10.0.2.2:8080. For physical phone over Expo Go, enter your computer&apos;s LAN IP (e.g. http://192.168.1.15:8080).
        </Text>
        <TextInput
          style={styles.input}
          value={urlInput}
          onChangeText={setUrlInput}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="http://192.168.1.15:8080"
        />
        <TouchableOpacity style={styles.btn} onPress={handleSaveAndTest}>
          <Text style={styles.btnText}>Save &amp; Test Connection</Text>
        </TouchableOpacity>
        <Text style={styles.status}>Status: {statusTxt}</Text>
      </View>

      <Text style={styles.sectionTitle}>Corrective Drill Library ({drills.length})</Text>
      {drills.map((d, idx) => (
        <View key={idx} style={styles.drillCard}>
          <View style={styles.drillTop}>
            <Text style={styles.tag}>{d.target_fault}</Text>
            <Text style={styles.reps}>{d.sets_reps}</Text>
          </View>
          <Text style={styles.drillTitle}>{d.title}</Text>
          <Text style={styles.drillDesc}>{d.description}</Text>
          <Text style={styles.cue}>Cue: &quot;{d.cue}&quot;</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F4F6F9' },
  content: { padding: 14, gap: 12 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', gap: 8 },
  title: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  desc: { fontSize: 12, color: '#64748B', lineHeight: 17 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, color: '#0F172A' },
  btn: { backgroundColor: '#2563EB', borderRadius: 8, paddingVertical: 11, alignItems: 'center' },
  btnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  status: { fontSize: 12, color: '#334155', fontWeight: '600' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A', marginTop: 4 },
  drillCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 13, borderWidth: 1, borderColor: '#E2E8F0', gap: 5 },
  drillTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tag: { fontSize: 11, fontWeight: '700', color: '#1D4ED8', backgroundColor: '#EFF6FF', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  reps: { fontSize: 11, color: '#64748B', fontWeight: '600' },
  drillTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  drillDesc: { fontSize: 12, color: '#475569', lineHeight: 17 },
  cue: { fontSize: 12, color: '#0F172A', fontStyle: 'italic' },
});

