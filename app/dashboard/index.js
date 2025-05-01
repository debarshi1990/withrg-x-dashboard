
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Button } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

export default function DashboardScreen() {
  const [handles, setHandles] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchHandles() {
      const sessionToken = await AsyncStorage.getItem('sessionToken');
      const response = await fetch('http://192.168.0.183:3000/api/user/handles', {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setHandles(data.handles);
      } else {
        console.error('Failed to fetch handles');
      }

      setLoading(false);
    }

    fetchHandles();
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Your Authorized Handles:</Text>
      <FlatList
        data={handles}
        keyExtractor={(item) => item}
        renderItem={({ item }) => (
          <Text style={styles.handle}>{item}</Text>
        )}
      />
      <Button title="Compose Tweet" onPress={() => router.push('/tweet')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  heading: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  handle: {
    fontSize: 18,
    marginVertical: 8,
  },
});
