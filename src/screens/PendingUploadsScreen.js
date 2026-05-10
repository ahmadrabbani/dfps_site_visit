import React, {useCallback, useState} from 'react';
import {View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {getPendingVisits} from '../services/storage';
import {syncPending} from '../services/syncService';
import {USE_FAKE_API} from '../config/env';
import {colors} from '../theme/colors';

export default function PendingUploadsScreen() {
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getPendingVisits();
      setVisits(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncPending();
      await refresh();
    } finally {
      setSyncing(false);
    }
  };

  return (
    <View style={styles.container}>
      {USE_FAKE_API ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            Test mode: uploads are simulated (no real server). Use Sync now to clear the queue.
          </Text>
        </View>
      ) : null}
      <Text style={styles.lead}>
        Visits saved on this device that are waiting to upload. They also sync automatically when you are
        online.
      </Text>
      <TouchableOpacity
        style={[styles.syncBtn, syncing && styles.syncBtnDisabled]}
        onPress={handleSync}
        disabled={syncing}
        accessibilityRole="button"
        accessibilityLabel="Sync pending visits now">
        {syncing ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.syncBtnText}>Sync now</Text>
        )}
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator style={styles.loader} color={colors.primary} />
      ) : (
        <FlatList
          data={visits}
          keyExtractor={item => item.localId}
          ListEmptyComponent={<Text style={styles.empty}>No pending uploads.</Text>}
          renderItem={({item}) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{item.localId}</Text>
              <Text style={styles.cardMeta}>Scope: {item.scope}</Text>
              <Text style={styles.cardMeta}>Violations: {item.violations?.length ?? 0}</Text>
              <Text style={styles.cardMeta}>Ended: {item.endTime || '—'}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, padding: 16, backgroundColor: colors.background},
  banner: {
    backgroundColor: '#fef3c7',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  bannerText: {fontSize: 13, color: '#92400e'},
  lead: {fontSize: 14, color: colors.mutedText, marginBottom: 16},
  syncBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 16,
  },
  syncBtnDisabled: {opacity: 0.7},
  syncBtnText: {color: '#ffffff', fontWeight: '600', fontSize: 15},
  loader: {marginTop: 24},
  empty: {fontSize: 14, color: colors.mutedText, marginTop: 24, textAlign: 'center'},
  card: {
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardTitle: {fontWeight: '700', color: colors.text, fontSize: 14},
  cardMeta: {fontSize: 13, color: colors.mutedText, marginTop: 4},
});
