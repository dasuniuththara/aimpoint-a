import React, { useState, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import CaptureScreen from './src/screens/CaptureScreen';
import CoachingCardScreen from './src/screens/CoachingCardScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import DrillsSettingsScreen from './src/screens/DrillsSettingsScreen';
import { runBenchmarkShot } from './src/services/api';

const Tab = createBottomTabNavigator();

export default function App() {
  const [latestAnalysis, setLatestAnalysis] = useState(null);
  const navRef = useRef(null);

  const handleAnalysisComplete = (result) => {
    setLatestAnalysis(result);
    if (navRef.current) {
      navRef.current.navigate('CoachingCard');
    }
  };

  const handleSelectHistorySession = async (sessionItem) => {
    const faultMap = {
      'Ideal Form': 0,
      'Low Elbow Set Point': 1,
      'Short Follow-Through': 2,
      'Imbalanced Base': 3,
      'Early Release': 4,
    };
    const fIdx = faultMap[sessionItem.fault_classification] ?? 0;
    try {
      const res = await runBenchmarkShot(fIdx, sessionItem.athlete_id || 'ATH-001');
      handleAnalysisComplete(res);
    } catch (e) {}
  };

  return (
    <NavigationContainer ref={navRef}>
      <StatusBar style="dark" />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerTitleStyle: { fontWeight: '700', color: '#0F172A', fontSize: 16 },
          tabBarActiveTintColor: '#EA580C',
          tabBarInactiveTintColor: '#64748B',
          tabBarStyle: { backgroundColor: '#FFFFFF', borderTopColor: '#E7E2D8', height: 60, paddingBottom: 6 },
          tabBarIcon: ({ color, size }) => {
            let icon = 'videocam-outline';
            if (route.name === 'CoachingCard') icon = 'analytics-outline';
            else if (route.name === 'History') icon = 'time-outline';
            else if (route.name === 'Drills') icon = 'barbell-outline';
            return <Ionicons name={icon} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Capture" options={{ title: 'Capture Shot' }}>
          {() => <CaptureScreen onAnalysisComplete={handleAnalysisComplete} />}
        </Tab.Screen>

        <Tab.Screen name="CoachingCard" options={{ title: 'Coaching Card' }}>
          {() => (
            <CoachingCardScreen
              analysis={latestAnalysis}
              onOpenHistory={() => navRef.current && navRef.current.navigate('History')}
            />
          )}
        </Tab.Screen>

        <Tab.Screen name="History" options={{ title: 'History' }}>
          {() => <HistoryScreen onSelectSession={handleSelectHistorySession} />}
        </Tab.Screen>

        <Tab.Screen name="Drills" component={DrillsSettingsScreen} options={{ title: 'Drills & API' }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

