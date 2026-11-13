import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { getApiBaseUrl, setApiBaseUrl, checkHealth, fetchDrills, autoDiscoverBackend } from '../services/api';

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

  const handleSaveAndTest = async (overrideUrl) => {
    const targetUrl = typeof overrideUrl === 'string' ? overrideUrl : urlInput;
    if (overrideUrl) setUrlInput(overrideUrl);
    const clean = setApiBaseUrl(targetUrl);
    try {
      const health = await checkHealth();
      setStatusTxt(`Connected (${health.status || 'online'})`);
      await loadDrills();
      Alert.alert('Connected', `Successfully connected to AimPoint FastAPI backend at ${clean}`);
    } catch (err) {
      setStatusTxt(`Unreachable: ${err.message}`);
      Alert.alert('Connection Failed', `Could not reach ${clean}. Make sure your phone and PC share the same network and port 8080 is running.`);
    }
  };

  const handleAutoDetect = async () => {
    setStatusTxt('Auto-detecting backend across local adapters...');
    try {
      const discovered = await autoDiscoverBackend();
      setUrlInput(discovered);
      const health = await checkHealth();
      setStatusTxt(`Connected (${health.status || 'online'})`);
      await loadDrills();
      Alert.alert('Auto-Detected', `Found live backend at ${discovered}!`);
    } catch (err) {
      setStatusTxt(`Discovery failed: ${err.message}`);
      Alert.alert('Discovery Failed', 'Could not auto-detect backend. Check IP manually.');
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.title}>FastAPI Backend Connection</Text>
        <Text style={styles.desc}>
          Select your computer&apos;s active network IP address or tap Auto-Detect:
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          <TouchableOpacity
            style={[styles.presetBtn, urlInput.includes('192.168.2.76') && styles.presetBtnActive]}
            onPress={() => handleSaveAndTest('http://192.168.2.76:8080')}>
            <Text style={styles.presetText}>Ethernet (.76)</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.presetBtn, urlInput.includes('192.168.2.89') && styles.presetBtnActive]}
            onPress={() => handleSaveAndTest('http://192.168.2.89:8080')}>
            <Text style={styles.presetText}>Wi-Fi (.89)</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.presetBtn}
            onPress={handleAutoDetect}>
            <Text style={[styles.presetText, { color: '#00E5FF' }]}>Auto-Detect IP</Text>
          </TouchableOpacity>
        </View>
        <TextInput
          style={styles.input}
          value={urlInput}
          onChangeText={setUrlInput}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="http://192.168.2.76:8080"
        />
        <TouchableOpacity style={styles.btn} onPress={() => handleSaveAndTest()}>
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
  content: { padding: 14, gap: 12, maxWidth: 540, width: '100%', alignSelf: 'center' },
  card: { backgroundColor: '#101114', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)', gap: 8 },
  title: { fontSize: 15, fontWeight: '700', color: '#F4F4F5' },
  desc: { fontSize: 12, color: '#A1A1AA', lineHeight: 17 },
  input: { backgroundColor: '#16171C', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 9, paddingHorizontal: 10, paddingVertical: 8.5, fontSize: 13, color: '#F4F4F5' },
  btn: { backgroundColor: '#F59E0B', borderRadius: 9, paddingVertical: 11, alignItems: 'center' },
  btnText: { color: '#060608', fontWeight: '800', fontSize: 13 },
  status: { fontSize: 12, color: '#D4D4D8', fontWeight: '600' },
  presetBtn: { backgroundColor: '#181920', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', borderRadius: 7, paddingHorizontal: 10, paddingVertical: 6 },
  presetBtnActive: { borderColor: '#F59E0B', backgroundColor: 'rgba(245,158,11,0.18)' },
  presetText: { fontSize: 11, fontWeight: '700', color: '#E4E4E7' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#F4F4F5', marginTop: 4 },
  drillCard: { backgroundColor: '#101114', borderRadius: 13, padding: 13, borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)', gap: 5 },
  drillTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tag: { fontSize: 11, fontWeight: '700', color: '#FBBF24', backgroundColor: 'rgba(245,158,11,0.14)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  reps: { fontSize: 11, color: '#A1A1AA', fontWeight: '600' },
  drillTitle: { fontSize: 15, fontWeight: '700', color: '#F4F4F5' },
  drillDesc: { fontSize: 12, color: '#A1A1AA', lineHeight: 17 },
  cue: { fontSize: 12, color: '#E4E4E7', fontStyle: 'italic' },
});

