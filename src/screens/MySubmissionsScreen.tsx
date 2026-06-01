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
import {formatForwardCcSurveyPreview} from '../services/ccSurveySubmit';
import {
  getPendingVisits,
  getSubmittedVisits,
  type PendingVisit,
  type SubmittedVisitRecord,
} from '../services/storage';
import {retryFailedNow, syncPending, syncVisitById} from '../services/syncService';
import {colors} from '../theme/colors';
import {notifyInfo, notifySuccess} from '../utils/notify';

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
  apiFields,
  status,
  statusTone,
  imageUri,
  actionLabel,
  onAction,
  actionDisabled,
}: {
  title: string;
  subtitle: string;
  meta: string[];
  apiFields?: string[];
  status: string;
  statusTone: 'success' | 'warning' | 'muted';
  imageUri?: string | null;
  actionLabel?: string;
  onAction?: () => void;
  actionDisabled?: boolean;
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
      {apiFields && apiFields.length > 0 ? (
        <View style={styles.apiBlock}>
          <Text style={styles.apiTitle}>API payload (forward_cc_survey.php)</Text>
          {apiFields.map(line => (
            <Text key={line} style={styles.apiLine}>
              {line}
            </Text>
          ))}
        </View>
      ) : null}
      {imageUri ? <Image source={{uri: imageUri}} style={styles.thumbnail} /> : null}
      {actionLabel && onAction ? (
        <TouchableOpacity
          style={[styles.cardAction, actionDisabled ? styles.btnDisabled : null]}
          disabled={actionDisabled}
          onPress={onAction}>
          <Text style={styles.cardActionText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export default function MySubmissionsScreen() {
  const [submitted, setSubmitted] = useState<SubmittedVisitRecord[]>([]);
  const [pending, setPending] = useState<PendingVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [pushingId, setPushingId] = useState<string | null>(null);

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

  const handleSyncAll = async () => {
    setSyncing(true);
    try {
      const result = await syncPending();
      if (result.uploaded === 0 && result.failed === 0 && result.deferred === 0 && result.paused === 0) {
        notifyInfo('Nothing waiting to push.');
      } else if (result.uploaded > 0) {
        notifySuccess(`${result.uploaded} survey(s) sent to the API.`);
      }
      await refresh();
    } finally {
      setSyncing(false);
    }
  };

  const handleRetryAll = async () => {
    setSyncing(true);
    try {
      const result = await retryFailedNow();
      if (result.uploaded > 0) {
        notifySuccess(`${result.uploaded} survey(s) sent to the API.`);
      }
      await refresh();
    } finally {
      setSyncing(false);
    }
  };

  const handlePushOne = async (localId: string) => {
    setPushingId(localId);
    try {
      const result = await syncVisitById(localId);
      if (result.uploaded > 0) {
        notifySuccess('Survey pushed to the API.');
      }
      await refresh();
    } finally {
      setPushingId(null);
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
        Surveys are saved on this device, then POSTed to forward_cc_survey.php with: case_id, is_violation,
        visit_by, visit_by_name, remarks, lat, lng, main_image, no_of_floors, plot_category.
      </Text>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.primaryBtn, syncing && styles.btnDisabled]}
          disabled={syncing}
          onPress={handleSyncAll}>
          {syncing ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.primaryBtnText}>Push all pending to API</Text>
          )}
        </TouchableOpacity>
        {pending.some(v => v.paused || (v.retryCount || 0) > 0) ? (
          <TouchableOpacity
            style={[styles.secondaryBtn, syncing && styles.btnDisabled]}
            disabled={syncing}
            onPress={handleRetryAll}>
            <Text style={styles.secondaryBtnText}>Retry failed uploads</Text>
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
              `Pushed: ${formatDate(item.uploadedAt)}`,
              item.serverMessage ? `Server: ${item.serverMessage}` : '',
            ].filter(Boolean)}
            apiFields={formatForwardCcSurveyPreview(item)}
            status="On server"
            statusTone="success"
            imageUri={item.mainImageUri}
          />
        ))
      )}

      <Text style={styles.sectionTitle}>Saved on device — not pushed yet ({pending.length})</Text>
      {pending.length === 0 ? (
        <Text style={styles.empty}>All saved surveys have been pushed.</Text>
      ) : (
        pending.map(item => (
          <SubmissionCard
            key={item.localId}
            title={item.caseNumber || `Case ${item.caseId}`}
            subtitle={`${item.scope || 'Survey'} · ${item.isViolation ? 'Violation' : 'No violation'}`}
            meta={[
              `Saved: ${formatDate(item.endTime)}`,
              item.paused ? `Last error: ${item.lastError || 'Upload paused'}` : 'Ready to push',
            ].filter(Boolean)}
            apiFields={formatForwardCcSurveyPreview(item)}
            status={item.paused ? 'Failed' : 'Pending'}
            statusTone={item.paused ? 'warning' : 'muted'}
            imageUri={item.mainImageUri}
            actionLabel={pushingId === item.localId ? 'Pushing...' : 'Push to API now'}
            onAction={() => handlePushOne(item.localId)}
            actionDisabled={syncing || pushingId != null}
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
  apiBlock: {
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  apiTitle: {fontSize: 11, fontWeight: '700', color: colors.primary, marginBottom: 6},
  apiLine: {fontSize: 11, color: colors.text, fontFamily: 'monospace', marginBottom: 2},
  thumbnail: {
    width: '100%',
    height: 120,
    marginTop: 10,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  cardAction: {
    marginTop: 10,
    backgroundColor: colors.primaryLight,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  cardActionText: {color: '#ffffff', fontSize: 13, fontWeight: '600'},
});
