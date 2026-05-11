import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
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
      <Text style={styles.subtitle}>Assistant Director Town Planning</Text>
      <TouchableOpacity style={styles.primaryButton} onPress={onStartVisit}>
        <Text style={styles.buttonText}>Initiate Site Visit</Text>
      </TouchableOpacity>
      <Text style={styles.helper}>Button becomes active near site location (GPS).</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, padding: 24, backgroundColor: colors.background, justifyContent: 'center'},
  greeting: {fontSize: 22, fontWeight: '700', color: colors.primary},
  subtitle: {fontSize: 14, color: colors.mutedText, marginBottom: 32},
  primaryButton: {backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center'},
  buttonText: {color: '#ffffff', fontSize: 16, fontWeight: '600'},
  helper: {marginTop: 16, fontSize: 13, color: colors.mutedText},
});
