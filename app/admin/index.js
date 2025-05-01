import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

const BACKEND_URL = 'https://withrg-x-backend.onrender.com';

export default function AdminHomeScreen() {
  const [users, setUsers] = useState([]);
  const router = useRouter();

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/admin/users`)
      .then(res => res.json())
      .then(setUsers)
      .catch(err => console.error('Error loading users:', err));
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Admin Panel - Users</Text>
      <FlatList
        data={users}
        keyExtractor={item => item._id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.name}>{item.name} ({item.role})</Text>
            <Text style={styles.email}>{item.email}</Text>
            <Text style={styles.handles}>Handles: {item.assignedHandles?.join(', ') || 'None'}</Text>
            <TouchableOpacity
              style={styles.button}
              onPress={() => router.push({ pathname: '/admin/assign', params: { email: item.email } })}
            >
              <Text style={styles.buttonText}>Assign Handles</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  heading: { fontSize: 22, fontWeight: 'bold', marginBottom: 16 },
  card: { backgroundColor: '#f5f5f5', padding: 12, marginBottom: 12, borderRadius: 8 },
  name: { fontSize: 18, fontWeight: '600' },
  email: { fontSize: 14, color: '#555' },
  handles: { fontSize: 14, marginTop: 4 },
  button: { marginTop: 10, backgroundColor: '#007bff', padding: 8, borderRadius: 6 },
  buttonText: { color: '#fff', textAlign: 'center' }
});