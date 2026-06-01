import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {BYPASS_LOGIN} from '../config/env';
import {colors} from '../theme/colors';
import type {SessionUser} from '../services/api';

interface DashboardScreenProps {
  user: SessionUser;
  onStartVisit: () => void;
}

export default function DashboardScreen({user, onStartVisit}: DashboardScreenProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>Welcome, {user.name}</Text>
      <Text style={styles.subtitle}>Completion Certificate site visit</Text>
      {BYPASS_LOGIN || user.isBypassLogin || user.isDevTestLogin ? (
        <View style={styles.bypassBanner}>
          <Text style={styles.bypassTitle}>Test mode</Text>
          <Text style={styles.bypassText}>
            Signed in as <Text style={styles.bypassStrong}>{user.username}</Text> for CC list APIs.
            {user.isDevTestLogin || user.isBypassLogin
              ? ' Survey upload still needs a real portal login when the server is reachable.'
              : null}
          </Text>
        </View>
      ) : null}
      <TouchableOpacity style={styles.primaryButton} onPress={onStartVisit}>
        <Text style={styles.buttonText}>Initiate Site Visit</Text>
      </TouchableOpacity>
      <Text style={styles.helper}>Enable GPS on Site visit to save a survey.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, padding: 24, backgroundColor: colors.background, justifyContent: 'center'},
  greeting: {fontSize: 22, fontWeight: '700', color: colors.primary},
  subtitle: {fontSize: 14, color: colors.mutedText, marginBottom: 16},
  bypassBanner: {
    backgroundColor: '#fff8e6',
    borderColor: '#f0c040',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  bypassTitle: {fontSize: 13, fontWeight: '700', color: '#8a6d00', marginBottom: 4},
  bypassText: {fontSize: 12, color: '#5c4a00', lineHeight: 18},
  bypassStrong: {fontWeight: '700'},
  primaryButton: {backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center'},
  buttonText: {color: '#ffffff', fontSize: 16, fontWeight: '600'},
  helper: {marginTop: 16, fontSize: 13, color: colors.mutedText},
});
