import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet, ScrollView} from 'react-native';
import {formatForwardCcSurveyPreview} from '../services/ccSurveySubmit';
import {uploadCopy} from '../constants/uploadCopy';
import {colors} from '../theme/colors';
import {screenContentPadding} from '../theme/screenLayout';
import type {PendingVisit} from '../services/storage';

interface SummaryScreenProps {
  visit?: PendingVisit | null;
  uploadedToApi?: boolean;
  uploadError?: string | null;
  onDone: () => void;
}

export default function SummaryScreen({visit, uploadedToApi, uploadError, onDone}: SummaryScreenProps) {
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

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.header}>Survey saved</Text>
      <Text style={styles.sub}>
        Case {visit.caseId} · {visit.isViolation ? 'Violation' : 'No violation'} · {visit.scope}
      </Text>

      {uploadedToApi ? (
        <Text style={styles.bannerOk}>{uploadCopy.pushedToServer}</Text>
      ) : (
        <Text style={styles.bannerPending}>
          {uploadCopy.summaryPending}
          {uploadError ? `\n${uploadError}` : ''}
        </Text>
      )}

      <Text style={styles.sectionTitle}>Server upload fields (preview)</Text>
      <View style={styles.apiBlock}>
        {apiFields.map(line => (
          <Text key={line} style={styles.apiLine}>
            {line}
          </Text>
        ))}
      </View>

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
  header: {fontSize: 20, fontWeight: '700', color: colors.primary},
  sub: {fontSize: 13, color: colors.mutedText, marginTop: 4, marginBottom: 12},
  bannerOk: {
    fontSize: 13,
    color: colors.success,
    backgroundColor: '#ecfdf5',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  bannerPending: {
    fontSize: 13,
    color: '#92400e',
    backgroundColor: '#fffbeb',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    lineHeight: 18,
  },
  sectionTitle: {fontSize: 14, fontWeight: '600', color: colors.text, marginTop: 8, marginBottom: 6},
  apiBlock: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 12,
  },
  apiLine: {fontSize: 11, color: colors.text, marginBottom: 3},
  card: {
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  type: {fontWeight: '600', color: colors.text},
  meta: {fontSize: 12, color: colors.mutedText, marginTop: 4},
  button: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  buttonText: {color: '#ffffff', fontWeight: '600'},
});
