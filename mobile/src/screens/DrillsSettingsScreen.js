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
  screen: { flex: 1, backgroundColor: '#060608' },
  content: { padding: 14, gap: 12 },
  card: { backgroundColor: '#101114', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)', gap: 8 },
  title: { fontSize: 15, fontWeight: '700', color: '#F4F4F5' },
  desc: { fontSize: 12, color: '#A1A1AA', lineHeight: 17 },
  input: { backgroundColor: '#16171C', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 9, paddingHorizontal: 10, paddingVertical: 8.5, fontSize: 13, color: '#F4F4F5' },
  btn: { backgroundColor: '#F59E0B', borderRadius: 9, paddingVertical: 11, alignItems: 'center' },
  btnText: { color: '#060608', fontWeight: '800', fontSize: 13 },
  status: { fontSize: 12, color: '#D4D4D8', fontWeight: '600' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#F4F4F5', marginTop: 4 },
  drillCard: { backgroundColor: '#101114', borderRadius: 13, padding: 13, borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)', gap: 5 },
  drillTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tag: { fontSize: 11, fontWeight: '700', color: '#FBBF24', backgroundColor: 'rgba(245,158,11,0.14)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  reps: { fontSize: 11, color: '#A1A1AA', fontWeight: '600' },
  drillTitle: { fontSize: 15, fontWeight: '700', color: '#F4F4F5' },
  drillDesc: { fontSize: 12, color: '#A1A1AA', lineHeight: 17 },
  cue: { fontSize: 12, color: '#E4E4E7', fontStyle: 'italic' },
});

