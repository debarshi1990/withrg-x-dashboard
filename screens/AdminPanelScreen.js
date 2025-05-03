import React, { useState, useEffect, useContext } from 'react';
import { View, Text, Button, ScrollView, StyleSheet } from 'react-native';
import { TextInput } from 'react-native-gesture-handler';
import { Picker } from '@react-native-picker/picker';
import { AuthContext } from '../context/AuthContext';

const AdminPanelScreen = () => {
  const [users, setUsers] = useState([]);
  const [handles, setHandles] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedHandle, setSelectedHandle] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const { token } = useContext(AuthContext);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [userRes, handleRes] = await Promise.all([
          fetch(`${process.env.EXPO_PUBLIC_API_BASE}/api/admin/users`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch(`${process.env.EXPO_PUBLIC_API_BASE}/api/admin/handles`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
        ]);

        const usersData = await userRes.json();
        const handlesData = await handleRes.json();

        setUsers(usersData);
        setHandles(handlesData);
      } catch (err) {
        console.error(err);
      }
    };

    fetchData();
  }, []);

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

      <Text>Select User</Text>
      <Picker
        selectedValue={selectedUser}
        onValueChange={(val) => setSelectedUser(val)}
        style={styles.input}
      >
        <Picker.Item label="Select User" value="" />
        {users.map((user) => (
          <Picker.Item key={user.email} label={`${user.name} (${user.email})`} value={user.email} />
        ))}
      </Picker>

      <Text>Select Handle</Text>
      <Picker
        selectedValue={selectedHandle}
        onValueChange={(val) => setSelectedHandle(val)}
        style={styles.input}
      >
        <Picker.Item label="Select Handle" value="" />
        {handles.map((handle) => (
          <Picker.Item key={handle.realHandle} label={handle.displayName} value={handle.realHandle} />
        ))}
      </Picker>

      <Text>Assign Role</Text>
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
  input: {
    borderWidth: 1, borderColor: '#ccc', padding: 10,
    borderRadius: 6, marginBottom: 16
  }
});

export default AdminPanelScreen;
