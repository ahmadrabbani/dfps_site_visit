import React, {useState} from 'react';
import {View, Text, TextInput, TouchableOpacity, StyleSheet} from 'react-native';
import {colors} from '../theme/colors';
import {login as loginRequest} from '../services/api';

export default function LoginScreen({onLogin}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!username || !password || loading) {
      return;
    }
    setError('');
    setLoading(true);
    try {
      const user = await loginRequest(username.trim(), password);
      onLogin(user);
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>LDA DFPS</Text>
      <Text style={styles.subtitle}>Site Visit Module</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Username</Text>
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          placeholder="Enter username"
        />
        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Enter password"
          secureTextEntry
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <TouchableOpacity
          style={[styles.button, loading ? styles.buttonDisabled : null]}
          onPress={handleLogin}
          disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Logging in...' : 'Login'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: 24},
  title: {fontSize: 28, fontWeight: '700', color: colors.primary},
  subtitle: {fontSize: 16, color: colors.mutedText, marginBottom: 24},
  card: {width: '100%', backgroundColor: colors.card, borderRadius: 12, padding: 20, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 3},
  label: {fontSize: 14, color: colors.mutedText, marginTop: 8},
  input: {borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 10, marginTop: 4},
  error: {color: '#dc2626', marginTop: 12},
  button: {marginTop: 20, backgroundColor: colors.primary, paddingVertical: 12, borderRadius: 8, alignItems: 'center'},
  buttonDisabled: {opacity: 0.7},
  buttonText: {color: '#ffffff', fontWeight: '600'},
});
