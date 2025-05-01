import { View, Button, StyleSheet, Linking } from 'react-native';

const BACKEND_URL = 'https://withrg-x-backend.onrender.com';

export default function LoginScreen() {
  function handleGoogleLogin() {
    Linking.openURL(`${BACKEND_URL}/api/auth/google`);
  }

  return (
    <View style={styles.container}>
      <Button title="Login with Google" onPress={handleGoogleLogin} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
