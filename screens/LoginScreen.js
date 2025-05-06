// screens/LoginScreen.js

import React, { useState } from 'react';
import { View, Text, Button, ActivityIndicator, Alert } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

WebBrowser.maybeCompleteAuthSession(); // ✅ required

const LoginScreen = () => {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    setLoading(true);

    // ✅ Correct redirect URI for Expo dev client
    const redirectUrl = 'exp://192.168.0.183:8081/--/auth-success';

    const result = await WebBrowser.openAuthSessionAsync(
      'https://withrg-x-backend.onrender.com/api/auth/google',
      redirectUrl
    );

    if (result.type === 'success' && result.url) {
      const url = new URL(result.url);
      const token = url.hash.split('token=')[1]; // ✅ token is now in the hash fragment

      if (token) {
        await AsyncStorage.setItem('authToken', token);
        router.replace('/AvailableHandlesScreen');
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
