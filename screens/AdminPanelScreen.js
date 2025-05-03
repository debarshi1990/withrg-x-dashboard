import React, { useState, useContext } from 'react';
import { View, Text, Button, ScrollView, StyleSheet, TextInput } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { AuthContext } from '../context/AuthContext';

const AdminPanelScreen = () => {
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedHandle, setSelectedHandle] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const { token } = useContext(AuthContext);

  const assignRole = async () => {
    try {
      const res = await fetch(`${process.env.EXPO_PUBLIC_API_BASE}/api/admin/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          userEmail: selectedUser,
          twitterHandle: selectedHandle,
          role: selectedRole
        })
      });

      const data = await res.json();
      alert(data.message || '✅ Assigned successfully');
    } catch (err) {
      console.error(err);
      alert('❌ Error assigning role');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Admin Panel</Text>

      <Text style={styles.label}>User Email</Text>
      <TextInput
        style={styles.input}
        value={selectedUser}
        onChangeText={setSelectedUser}
        placeholder="Enter user email"
      />

      <Text style={styles.label}>Handle</Text>
      <TextInput
        style={styles.input}
        value={selectedHandle}
        onChangeText={setSelectedHandle}
        placeholder="@Odisha_WithRG"
      />

      <Text style={styles.label}>Role</Text>
      <Picker
        selectedValue={selectedRole}
        onValueChange={(val) => setSelectedRole(val)}
        style={styles.input}
      >
        <Picker.Item label="Select Role" value="" />
        <Picker.Item label="Poster" value="poster" />
        <Picker.Item label="Admin" value="admin" />
        <Picker.Item label="Moderator" value="moderator" />
      </Picker>

      <Button title="Assign Role" onPress={assignRole} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 16 },
  label: { marginBottom: 4 },
  input: {
    borderWidth: 1, borderColor: '#ccc', padding: 10,
    borderRadius: 6, marginBottom: 16
  }
});

export default AdminPanelScreen;
