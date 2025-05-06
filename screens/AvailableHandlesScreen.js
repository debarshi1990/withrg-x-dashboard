import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams } from 'expo-router';

export default function AvailableHandlesScreen() {
  const { handles } = useLocalSearchParams(); // optional from navigation
  const [localHandles, setLocalHandles] = useState(null);

  useEffect(() => {
    const loadHandles = async () => {
      if (handles) {
        setLocalHandles(JSON.parse(handles));
      } else {
        const saved = await AsyncStorage.getItem('userHandles');
        if (saved) setLocalHandles(JSON.parse(saved));
      }
    };
    loadHandles();
  }, [handles]);

  if (!localHandles) {
    return (
      <View style={styles.container}>
        <ActivityIndicator />
        <Text>Loading your access...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Your Assigned Handles</Text>
      {localHandles.map((item, index) => (
        <View key={index} style={styles.card}>
          <Text style={styles.handle}>{item.handle}</Text>
          <Text style={styles.role}>Role: {item.role}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, alignItems: 'center' },
  heading: { fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  card: { backgroundColor: '#f0f0f0', padding: 15, borderRadius: 8, marginBottom: 10, width: '100%' },
  handle: { fontSize: 16, fontWeight: '600' },
  role: { fontSize: 14, color: '#555' },
});
