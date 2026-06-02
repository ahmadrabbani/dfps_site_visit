import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Pressable,
} from 'react-native';
import {Icon} from 'react-native-paper';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {formatForwardCcSurveyPreview} from '../services/ccSurveySubmit';
import {uploadCopy} from '../constants/uploadCopy';
import {colors} from '../theme/colors';
import {screenContentPadding} from '../theme/screenLayout';
import {glassStyles} from '../theme/glassStyles';
import type {PendingVisit} from '../services/storage';

interface SummaryScreenProps {
  visit?: PendingVisit | null;
  uploadedToApi?: boolean;
  uploadError?: string | null;
  onDone: () => void;
}

function SummaryRow({label, value}: {label: string; value: string}) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

export default function SummaryScreen({visit, uploadedToApi, uploadError, onDone}: SummaryScreenProps) {
  const insets = useSafeAreaInsets();
  const [statusModalVisible, setStatusModalVisible] = useState(Boolean(visit));
  const [previewModalVisible, setPreviewModalVisible] = useState(false);

  if (!visit) {
    return (
      <View style={styles.container}>
        <Text style={styles.header}>No visit data</Text>
        <TouchableOpacity style={styles.button} onPress={onDone}>
          <Text style={styles.buttonText}>Back to Dashboard</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const apiFields = formatForwardCcSurveyPreview(visit);
  const plotLabel = visit.scope === 'commercial' ? 'Commercial' : 'Residential';
  const statusTitle = uploadedToApi ? 'Sent to server' : 'Saved on device';
  const statusMessage = uploadedToApi
    ? uploadCopy.pushedToServer
    : uploadCopy.summaryPending;
  const statusIcon = uploadedToApi ? 'check-circle' : 'cloud-upload-outline';
  const statusIconColor = uploadedToApi ? colors.success : '#d97706';

  return (
    <>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.header}>Survey saved</Text>
        <Text style={styles.sub}>
          {visit.caseNumber || `Case ${visit.caseId}`} · {visit.isViolation ? 'Violation' : 'No violation'} ·{' '}
          {plotLabel}
        </Text>

        <View style={styles.summaryCard}>
          <SummaryRow label="Case" value={String(visit.caseId)} />
          <SummaryRow label="Plot category" value={plotLabel} />
          <SummaryRow label="Violation" value={visit.isViolation ? 'Yes' : 'No'} />
          <SummaryRow label="Floors" value={visit.noOfFloors != null ? String(visit.noOfFloors) : '—'} />
          <SummaryRow label="GPS" value={`${visit.startLat}, ${visit.startLon}`} />
          <SummaryRow
            label="Server"
            value={uploadedToApi ? 'Uploaded' : 'Pending upload'}
          />
        </View>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => setPreviewModalVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="View server upload fields">
          <Icon source="file-document-outline" size={20} color={colors.primary} />
          <Text style={styles.secondaryButtonText}>View server upload fields</Text>
        </TouchableOpacity>

        {visit.violations.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Violations ({visit.violations.length})</Text>
            {visit.violations.map((item, idx) => (
              <View key={idx} style={styles.card}>
                <Text style={styles.type}>{item.typeLabel || item.type}</Text>
                {item.floorLabel ? <Text style={styles.meta}>Floor: {item.floorLabel}</Text> : null}
                {item.width != null && item.length != null ? (
                  <Text style={styles.meta}>
                    {item.width} x {item.length} {item.unit}
                  </Text>
                ) : null}
              </View>
            ))}
          </>
        ) : null}

        <TouchableOpacity style={styles.button} onPress={onDone}>
          <Text style={styles.buttonText}>Back to Dashboard</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={statusModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setStatusModalVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setStatusModalVisible(false)}>
          <Pressable
            style={[styles.modalCard, {paddingBottom: Math.max(insets.bottom, 20)}]}
            onPress={e => e.stopPropagation()}>
            <View style={[styles.modalIconWrap, {backgroundColor: uploadedToApi ? '#ecfdf5' : '#fffbeb'}]}>
              <Icon source={statusIcon} size={40} color={statusIconColor} />
            </View>
            <Text style={styles.modalTitle}>{statusTitle}</Text>
            <Text style={styles.modalMessage}>{statusMessage}</Text>
            {uploadError ? (
              <View style={styles.modalErrorBox}>
                <Text style={styles.modalErrorText}>{uploadError}</Text>
              </View>
            ) : null}
            <TouchableOpacity
              style={styles.modalPrimaryBtn}
              onPress={() => setStatusModalVisible(false)}>
              <Text style={styles.modalPrimaryBtnText}>OK</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalLinkBtn}
              onPress={() => {
                setStatusModalVisible(false);
                setPreviewModalVisible(true);
              }}>
              <Text style={styles.modalLinkBtnText}>View server upload fields</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={previewModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setPreviewModalVisible(false)}>
        <View style={[styles.previewSheet, {paddingTop: Math.max(insets.top, 12)}]}>
          <View style={styles.previewHeader}>
            <Text style={styles.previewTitle}>Server upload fields</Text>
            <TouchableOpacity
              onPress={() => setPreviewModalVisible(false)}
              accessibilityLabel="Close preview"
              hitSlop={12}>
              <Icon source="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <Text style={styles.previewHint}>Preview of data sent to forward_cc_survey.php</Text>
          <ScrollView
            style={styles.previewScroll}
            contentContainerStyle={styles.previewScrollContent}
            showsVerticalScrollIndicator>
            {apiFields.map(line => (
              <View key={line} style={styles.previewLineWrap}>
                <Text style={styles.previewLine} selectable>
                  {line}
                </Text>
              </View>
            ))}
          </ScrollView>
          <TouchableOpacity
            style={[styles.button, styles.previewDoneBtn, {marginBottom: Math.max(insets.bottom, 16)}]}
            onPress={() => setPreviewModalVisible(false)}>
            <Text style={styles.buttonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    ...screenContentPadding(16, 16),
    backgroundColor: colors.background,
  },
  scroll: {
    ...screenContentPadding(16, 32),
    backgroundColor: colors.background,
    flexGrow: 1,
  },
  header: {fontSize: 22, fontWeight: '700', color: colors.primary},
  sub: {fontSize: 14, color: colors.mutedText, marginTop: 6, marginBottom: 16, lineHeight: 20},
  summaryCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f3f4f6',
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.mutedText,
    marginRight: 12,
    flex: 1,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    flex: 1.2,
    textAlign: 'right',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.primary,
    ...glassStyles.panel,
    marginBottom: 16,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
  },
  sectionTitle: {fontSize: 16, fontWeight: '600', color: colors.text, marginTop: 4, marginBottom: 10},
  card: {
    ...glassStyles.card,
    padding: 12,
    marginBottom: 8,
    borderRadius: 14,
  },
  type: {fontWeight: '600', color: colors.text, fontSize: 14},
  meta: {fontSize: 13, color: colors.mutedText, marginTop: 4},
  button: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  buttonText: {color: '#ffffff', fontWeight: '600', fontSize: 16},
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 51, 102, 0.55)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    ...glassStyles.cardStrong,
    borderRadius: 20,
    paddingHorizontal: 22,
    paddingTop: 24,
    alignItems: 'center',
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  modalIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 10,
  },
  modalMessage: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  modalErrorBox: {
    width: '100%',
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  modalErrorText: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.danger,
    textAlign: 'center',
  },
  modalPrimaryBtn: {
    width: '100%',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  modalPrimaryBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  modalLinkBtn: {
    paddingVertical: 12,
    marginTop: 4,
  },
  modalLinkBtnText: {
    color: colors.primaryLight,
    fontSize: 14,
    fontWeight: '600',
  },
  previewSheet: {
    flex: 1,
    backgroundColor: colors.background,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    flex: 1,
  },
  previewHint: {
    fontSize: 13,
    color: colors.mutedText,
    paddingHorizontal: 16,
    marginBottom: 12,
    lineHeight: 18,
  },
  previewScroll: {flex: 1},
  previewScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  previewLineWrap: {
    ...glassStyles.panel,
    padding: 12,
    marginBottom: 8,
  },
  previewLine: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.text,
  },
  previewDoneBtn: {
    marginHorizontal: 16,
    marginTop: 8,
  },
});
