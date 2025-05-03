import React, { useState } from 'react';
import { View, Text, Picker, Button, ScrollView } from 'react-native';
import { TextInput } from 'react-native-gesture-handler';

const AdminPanelScreen = () => {
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedHandle, setSelectedHandle] = useState('');
  const [selectedRole, setSelectedRole] = useState('');

  const assignRole = async () => {
    const res = await fetch('https://your-backend-url.com/api/admin/assign', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
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
    <ScrollView className="p-4">
      <Text className="text-xl font-bold mb-4">Admin Panel</Text>

      <Text className="text-base">Select User (email):</Text>
      <TextInput
        className="border p-2 mb-4 rounded"
        value={selectedUser}
        onChangeText={setSelectedUser}
        placeholder="Enter user email"
      />

      <Text className="text-base">Select Handle:</Text>
      <TextInput
        className="border p-2 mb-4 rounded"
        value={selectedHandle}
        onChangeText={setSelectedHandle}
        placeholder="e.g. @Bihar_WithRG"
      />

      <Text className="text-base">Assign Role:</Text>
      <Picker
        selectedValue={selectedRole}
        onValueChange={(itemValue) => setSelectedRole(itemValue)}
        className="mb-4"
      >
        <Picker.Item label="Select Role" value="" />
        <Picker.Item label="Poster" value="poster" />
        <Picker.Item label="Admin" value="admin" />
        <Picker.Item label="Moderator" value="moderator" />
      </Picker>

      <Button title="Assign" onPress={assignRole} />
    </ScrollView>
  );
};

export default AdminPanelScreen;
