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
import {uploadCopy} from '../constants/uploadCopy';
import {colors} from '../theme/colors';
import {screenContentPadding} from '../theme/screenLayout';
import {glassStyles} from '../theme/glassStyles';
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
  notSubmitted,
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
  /** Red border — saved on device, not on server yet. */
  notSubmitted?: boolean;
}) {
  const statusColor =
    statusTone === 'success' ? colors.success : statusTone === 'warning' ? colors.danger : colors.mutedText;

  return (
    <View style={[styles.card, notSubmitted ? styles.cardNotSubmitted : null]}>
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
          <Text style={styles.apiTitle}>Server upload fields (preview)</Text>
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
        notifyInfo(uploadCopy.nothingToPush);
      } else if (result.uploaded > 0) {
        notifySuccess(uploadCopy.sentCount(result.uploaded));
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
        notifySuccess(uploadCopy.sentCount(result.uploaded));
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
        notifySuccess(uploadCopy.pushedToServer);
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
      <Text style={styles.header}>My Site Visits & Submissions</Text>
      <Text style={styles.lead}>
        {pending.length > 0
          ? uploadCopy.submissionsLeadWithPending
          : uploadCopy.submissionsLeadNoPending}
      </Text>

      {pending.length > 0 ? (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.primaryBtn, syncing && styles.btnDisabled]}
            disabled={syncing}
            onPress={handleSyncAll}>
            {syncing ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryBtnText}>{uploadCopy.pushAllPending}</Text>
            )}
          </TouchableOpacity>
          {pending.some(v => v.paused || (v.retryCount || 0) > 0) ? (
            <TouchableOpacity
              style={[styles.secondaryBtn, syncing && styles.btnDisabled]}
              disabled={syncing}
              onPress={handleRetryAll}>
              <Text style={styles.secondaryBtnText}>{uploadCopy.retryFailed}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

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

      <Text style={styles.sectionTitle}>Saved on device — not on server yet ({pending.length})</Text>
      {pending.length === 0 ? (
        <Text style={styles.empty}>All saved site visits are on the server.</Text>
      ) : (
        pending.map(item => (
          <SubmissionCard
            key={item.localId}
            notSubmitted
            title={item.caseNumber || `Case ${item.caseId}`}
            subtitle={`${item.scope || 'Survey'} · ${item.isViolation ? 'Violation' : 'No violation'}`}
            meta={[
              `Saved: ${formatDate(item.endTime)}`,
              item.paused
                ? `Last error: ${item.lastError || 'Upload paused'}`
                : 'Ready to send to server',
            ].filter(Boolean)}
            apiFields={formatForwardCcSurveyPreview(item)}
            status={item.paused ? 'Failed' : 'Not on server'}
            statusTone={item.paused ? 'warning' : 'warning'}
            imageUri={item.mainImageUri}
            actionLabel={pushingId === item.localId ? uploadCopy.pushingOne : uploadCopy.pushOneNow}
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
  container: {
    ...screenContentPadding(16, 32),
    backgroundColor: colors.background,
    flexGrow: 1,
  },
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
    ...glassStyles.card,
    padding: 12,
    marginBottom: 10,
    borderRadius: 14,
  },
  cardNotSubmitted: {
    borderWidth: 2,
    borderColor: colors.danger,
    backgroundColor: '#fffbfb',
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
