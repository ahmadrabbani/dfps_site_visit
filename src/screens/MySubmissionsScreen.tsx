import React, {useCallback, useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  ScrollView,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {
  getPendingVisits,
  getSubmittedVisits,
  type PendingVisit,
  type SubmittedVisitRecord,
} from '../services/storage';
import {retryFailedNow, syncPending} from '../services/syncService';
import {colors} from '../theme/colors';
import {notifyInfo} from '../utils/notify';

function formatDate(iso?: string) {
  if (!iso) {
    return '-';
  }
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

function SubmissionCard({
  title,
  subtitle,
  meta,
  status,
  statusTone,
  imageUri,
}: {
  title: string;
  subtitle: string;
  meta: string[];
  status: string;
  statusTone: 'success' | 'warning' | 'muted';
  imageUri?: string | null;
}) {
  const statusColor =
    statusTone === 'success' ? colors.success : statusTone === 'warning' ? colors.danger : colors.mutedText;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={[styles.statusBadge, {color: statusColor}]}>{status}</Text>
      </View>
      <Text style={styles.cardSubtitle}>{subtitle}</Text>
      {meta.map(line => (
        <Text key={line} style={styles.cardMeta}>
          {line}
        </Text>
      ))}
      {imageUri ? <Image source={{uri: imageUri}} style={styles.thumbnail} /> : null}
    </View>
  );
}

export default function MySubmissionsScreen() {
  const [submitted, setSubmitted] = useState<SubmittedVisitRecord[]>([]);
  const [pending, setPending] = useState<PendingVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [uploadedList, pendingList] = await Promise.all([getSubmittedVisits(), getPendingVisits()]);
      setSubmitted(uploadedList);
      setPending(pendingList);
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
      const result = await syncPending();
      if (result.uploaded === 0 && result.failed === 0 && result.deferred === 0 && result.paused === 0) {
        notifyInfo('Nothing to sync right now.');
      }
      await refresh();
    } finally {
      setSyncing(false);
    }
  };

  const handleRetry = async () => {
    setSyncing(true);
    try {
      await retryFailedNow();
      await refresh();
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>My Submissions</Text>
      <Text style={styles.lead}>
        Surveys submitted from this app replace the web portal. Uploads go to the housing portal
        (conf_add_cc_form.php), which saves the visit and forwards to the survey API.
      </Text>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.primaryBtn, syncing && styles.btnDisabled]}
          disabled={syncing}
          onPress={handleSync}>
          {syncing ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.primaryBtnText}>Sync pending</Text>
          )}
        </TouchableOpacity>
        {pending.some(v => v.paused || (v.retryCount || 0) > 0) ? (
          <TouchableOpacity
            style={[styles.secondaryBtn, syncing && styles.btnDisabled]}
            disabled={syncing}
            onPress={handleRetry}>
            <Text style={styles.secondaryBtnText}>Retry failed</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <Text style={styles.sectionTitle}>Uploaded ({submitted.length})</Text>
      {submitted.length === 0 ? (
        <Text style={styles.empty}>No uploaded surveys yet.</Text>
      ) : (
        submitted.map(item => (
          <SubmissionCard
            key={item.localId}
            title={item.caseNumber || `Case ${item.caseId}`}
            subtitle={`${item.scope || 'Survey'} · ${item.isViolation ? 'Violation' : 'No violation'}`}
            meta={[
              `Submitted: ${formatDate(item.uploadedAt)}`,
              `Floors: ${item.noOfFloors ?? '-'}`,
              `Violations: ${item.violations?.length ?? 0}`,
              item.remarks ? `Remarks: ${item.remarks}` : '',
              item.remoteVisitId ? `Server ID: ${item.remoteVisitId}` : '',
            ].filter(Boolean)}
            status="Uploaded"
            statusTone="success"
            imageUri={item.mainImageUri}
          />
        ))
      )}

      <Text style={styles.sectionTitle}>Pending sync ({pending.length})</Text>
      {pending.length === 0 ? (
        <Text style={styles.empty}>No pending uploads.</Text>
      ) : (
        pending.map(item => (
          <SubmissionCard
            key={item.localId}
            title={item.caseNumber || `Case ${item.caseId}`}
            subtitle={`${item.scope || 'Survey'} · ${item.isViolation ? 'Violation' : 'No violation'}`}
            meta={[
              `Saved: ${formatDate(item.endTime)}`,
              `Floors: ${item.noOfFloors ?? '-'}`,
              `Violations: ${item.violations?.length ?? 0}`,
              item.paused ? `Error: ${item.lastError || 'Upload paused'}` : '',
              item.nextRetryAt ? `Next retry: ${formatDate(new Date(item.nextRetryAt).toISOString())}` : '',
            ].filter(Boolean)}
            status={item.paused ? 'Failed' : 'Waiting'}
            statusTone={item.paused ? 'warning' : 'muted'}
            imageUri={item.mainImageUri}
          />
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: {flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background},
  container: {padding: 16, paddingBottom: 32, backgroundColor: colors.background, flexGrow: 1},
  header: {fontSize: 20, fontWeight: '700', color: colors.primary},
  lead: {fontSize: 13, color: colors.mutedText, marginTop: 8, marginBottom: 16, lineHeight: 18},
  actions: {marginBottom: 20},
  primaryBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 8,
  },
  secondaryBtn: {
    borderColor: colors.primary,
    borderWidth: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  btnDisabled: {opacity: 0.7},
  primaryBtnText: {color: '#ffffff', fontWeight: '600'},
  secondaryBtnText: {color: colors.primary, fontWeight: '600'},
  sectionTitle: {fontSize: 16, fontWeight: '600', color: colors.text, marginTop: 8, marginBottom: 10},
  empty: {fontSize: 13, color: colors.mutedText, marginBottom: 16},
  card: {
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'},
  cardTitle: {flex: 1, fontWeight: '700', color: colors.text, fontSize: 14, paddingRight: 8},
  statusBadge: {fontSize: 12, fontWeight: '600'},
  cardSubtitle: {fontSize: 13, color: colors.text, marginTop: 4},
  cardMeta: {fontSize: 12, color: colors.mutedText, marginTop: 4},
  thumbnail: {
    width: '100%',
    height: 120,
    marginTop: 10,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
});
