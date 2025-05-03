import { View, Text, StyleSheet, Button, ScrollView } from 'react-native';
import { useEffect, useState } from 'react';

export default function DashboardScreen() {
  const [assignedHandles, setAssignedHandles] = useState([]);

  // Replace this with your actual token management logic
  const token = 'YOUR_USER_ACCESS_TOKEN_HERE'; // ← Replace with real token from context or state

  useEffect(() => {
    fetch('https://your-backend-url.com/api/user/my-access', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(data => setAssignedHandles(data.access || []))
      .catch(err => console.error(err));
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Welcome to WithRG X Dashboard!</Text>
      {assignedHandles.length === 0 ? (
        <Text>No assigned Twitter handles yet.</Text>
      ) : (
        assignedHandles.map(({ handle, role }) => (
          <View key={handle} style={styles.handleBox}>
            <Text style={styles.handleText}>{handle} ({role})</Text>
            {(role === 'admin' || role === 'poster') && (
              <Button title="Post Tweet" onPress={() => console.log(`Post as ${handle}`)} />
            )}
            {role === 'admin' && (
              <Button title="Admin Panel" onPress={() => console.log(`Admin tools for ${handle}`)} />
            )}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
  },
  heading: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  handleBox: {
    marginBottom: 20,
    padding: 15,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  handleText: {
    fontSize: 16,
    marginBottom: 10,
  }
});
