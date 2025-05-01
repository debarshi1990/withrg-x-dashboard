
import { View, Button, StyleSheet } from 'react-native';
import * as AuthSession from 'expo-auth-session';

const BACKEND_URL = 'http://localhost:3000'; // Your backend URL

export default function LoginScreen({ navigation }) {
  async function handleLogin() {
    const authUrl = `${BACKEND_URL}/api/auth/twitter`;
    const result = await AuthSession.startAsync({ authUrl });
    
    if (result?.type === 'success') {
      // TODO: Save session, then navigate
      navigation.replace('Dashboard');
    }
  }

  return (
    <View style={styles.container}>
      <Button title="Login with Twitter" onPress={handleLogin} />
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
