// screens/LoginScreen.js

import React, { useState } from 'react';
import { View, Text, Button, ActivityIndicator, Alert } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

const LoginScreen = () => {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  cconst handleLogin = async () => {
    setLoading(true);
    const redirectUrl = 'https://withrg.in/auth-success';
  
    const result = await WebBrowser.openAuthSessionAsync(
      'https://withrg-x-backend.onrender.com/api/auth/google',
      redirectUrl
    );
  
    if (result.type === 'success' && result.url) {
      const url = new URL(result.url);
      const token = url.searchParams.get('token');
  
      if (token) {
        await AsyncStorage.setItem('authToken', token);
  
        const res = await fetch('https://withrg-x-backend.onrender.com/api/user/handles', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
  
        const data = await res.json();
  
        if (res.ok && Array.isArray(data.handles)) {
          await AsyncStorage.setItem('userHandles', JSON.stringify(data.handles)); // 💾 Save handles
  
          router.replace({
            pathname: '/AvailableHandlesScreen',
            params: { handles: JSON.stringify(data.handles) },
          });
        } else {
          Alert.alert('Login Failed', 'Could not fetch handle access');
        }
      } else {
        Alert.alert('Login Failed', 'No token received from Google');
      }
    } else {
      Alert.alert('Login Cancelled or Failed');
    }
  
    setLoading(false);
  };  
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      {loading ? <ActivityIndicator /> : (
        <Button title="Sign in with Google" onPress={handleLogin} />
      )}
    </View>
  );
};

export default LoginScreen;
