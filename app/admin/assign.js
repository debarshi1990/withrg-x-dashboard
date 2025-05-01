import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

const BACKEND_URL = 'https://withrg-x-backend.onrender.com';

export default function AssignHandleScreen() {
  const { email } = useLocalSearchParams();
  const [handles, setHandles] = useState('');
  const router = useRouter();

  const assignHandles = async () => {
    const handleArray = handles.split(',').map(h => h.trim());
    const res = await fetch(`${BACKEND_URL}/api/admin/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, handles: handleArray })
    });

    if (res.ok) {
      Alert.alert('Success', 'Handles assigned successfully.');
      router.back();
    } else {
      Alert.alert('Error', 'Failed to assign handles.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Assign Handles to:</Text>
      <Text style={styles.email}>{email}</Text>
      <TextInput
        placeholder="Enter handles separated by comma"
        value={handles}
        onChangeText={setHandles}
        style={styles.input}
      />
      <Button title="Assign Handles" onPress={assignHandles} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  label: { fontSize: 16, fontWeight: '600' },
  email: { fontSize: 15, marginBottom: 8, color: 'gray' },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    paddingHorizontal: 8,
    marginBottom: 16
  }
});