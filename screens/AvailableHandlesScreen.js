import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';

export default function AvailableHandlesScreen() {
  const [handles, setHandles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://192.168.0.183:10000/api/user/handles') // or Render backend URL
      .then((res) => res.json())
      .then((data) => {
        setHandles(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching handles:', err);
        setLoading(false);
      });
  }, []);

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.handle}>{item.handle}</Text>
      <Text style={styles.status}>
        {item.isAuthorized ? '✅ Authorized' : '⛔ Not Authorized'}
      </Text>
    </View>
  );

  if (loading) return <ActivityIndicator style={{ marginTop: 50 }} size="large" color="#000" />;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Accessible Twitter Handles</Text>
      <FlatList
        data={handles}
        keyExtractor={(item) => item.handle}
        renderItem={renderItem}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    flex: 1,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  card: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f2f2f2',
    marginBottom: 10,
  },
  handle: {
    fontSize: 16,
    fontWeight: '600',
  },
  status: {
    fontSize: 14,
    color: 'gray',
  },
});
