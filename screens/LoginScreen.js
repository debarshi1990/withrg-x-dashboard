// screens/LoginScreen.js

import React, { useEffect, useState } from 'react';
import { Button, View, Text, ActivityIndicator } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import Constants from 'expo-constants';

WebBrowser.maybeCompleteAuthSession();

const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
};

const LoginScreen = () => {
  const [accessToken, setAccessToken] = useState(null);
  const [loading, setLoading] = useState(false);

  const redirectUri = AuthSession.makeRedirectUri({
    native: 'your.app://redirect', // Replace with your app's redirect scheme
    useProxy: true,
  });

  const clientId = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId,
      scopes: ['openid', 'profile', 'email'],
      redirectUri,
    },
    discovery
  );

  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      setAccessToken(authentication.accessToken);
      // optionally send this accessToken to your backend
    }
  }, [response]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      {loading && <ActivityIndicator />}
      <Button
        disabled={!request}
        title="Sign in with Google"
        onPress={() => {
          setLoading(true);
          promptAsync().finally(() => setLoading(false));
        }}
      />
      {accessToken && <Text>Token: {accessToken}</Text>}
    </View>
  );
};

export default LoginScreen;
