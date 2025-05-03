import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, Button, Picker } from 'react-native';

const AdminPanelScreen = () => {
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedHandle, setSelectedHandle] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [handleList, setHandleList] = useState([]);

  // 🔄 Fetch handle list on mount
  useEffect(() => {
    fetch('https://your-backend-url.com/api/admin/handles')
      .then(res => res.json())
      .then(data => setHandleList(data))
      .catch(err => console.error('Failed to fetch handles:', err));
  }, []);

  const assignRole = async () => {
    const res = await fetch('https://your-backend-url.com/api/admin/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userEmail: selectedUser,
        twitterHandle: selectedHandle,
        role: selectedRole
      })
    });
    const data = await res.json();
    alert(data.message || 'Assigned successfully');
  };

  return (
    <ScrollView style={{ padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Admin Panel</Text>

      <Text style={{ marginTop: 12 }}>User Email:</Text>
      <TextInput
        style={{ borderWidth: 1, padding: 8, marginVertical: 8 }}
        value={selectedUser}
        onChangeText={setSelectedUser}
        placeholder="Enter user email"
      />

      <Text>Twitter Handle:</Text>
      <TextInput
        style={{ borderWidth: 1, padding: 8, marginVertical: 8 }}
        value={selectedHandle}
        onChangeText={setSelectedHandle}
        placeholder="e.g. @Bihar_WithRG"
      />

      <Text>Assign Role:</Text>
      <Picker
        selectedValue={selectedRole}
        onValueChange={setSelectedRole}
        style={{ marginBottom: 12 }}
      >
        <Picker.Item label="Select Role" value="" />
        <Picker.Item label="Poster" value="poster" />
        <Picker.Item label="Admin" value="admin" />
        <Picker.Item label="Moderator" value="moderator" />
      </Picker>

      <Button title="Assign" onPress={assignRole} />

      <Text style={{ fontSize: 16, fontWeight: 'bold', marginTop: 24 }}>Available Handles:</Text>
      {handleList.map((handle, idx) => (
        <View key={idx} style={{ padding: 8, borderBottomWidth: 1 }}>
          <Text>{handle.handle} — {handle.isAuthorized ? '✅ Authorized' : '❌ Not Authorized'}</Text>
        </View>
      ))}
    </ScrollView>
  );
};

export default AdminPanelScreen;
