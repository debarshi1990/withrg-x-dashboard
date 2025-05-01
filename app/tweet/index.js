
import { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function TweetScreen() {
  const [tweetText, setTweetText] = useState('');
  const [loading, setLoading] = useState(false);

  async function postTweet() {
    if (!tweetText.trim()) {
      Alert.alert('Please enter some text');
      return;
    }

    setLoading(true);

    const sessionToken = await AsyncStorage.getItem('sessionToken');
    const response = await fetch('http://192.168.0.183:3000/api/tweet/post', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({ text: tweetText }),
    });

    const data = await response.json();
    setLoading(false);

    if (data.success) {
      Alert.alert('Success', data.message);
      setTweetText('');
    } else {
      Alert.alert('Error', 'Tweet failed');
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Compose Tweet</Text>
      <TextInput
        style={styles.input}
        placeholder="What's happening?"
        multiline
        numberOfLines={4}
        value={tweetText}
        onChangeText={setTweetText}
      />
      <Button title={loading ? 'Posting...' : 'Post Tweet'} onPress={postTweet} disabled={loading} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  heading: {
    fontSize: 20,
    marginBottom: 20,
    fontWeight: 'bold',
  },
  input: {
    height: 100,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 20,
    padding: 10,
    textAlignVertical: 'top',
  },
});
