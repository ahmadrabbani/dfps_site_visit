import React, {useEffect, useState} from 'react';
import {View, Text, TouchableOpacity, StyleSheet, FlatList} from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import {USE_FAKE_API} from '../config/env';
import {colors} from '../theme/colors';
import type {SessionUser} from '../services/api';
import type {SiteVisitViolation} from '../services/storage';
import type {SetViolations, SiteScope} from '../types/app';

const showTestGpsControls = typeof __DEV__ !== 'undefined' && __DEV__ && USE_FAKE_API;

interface SiteVisitScreenProps {
  user: SessionUser;
  siteScope: SiteScope;
  onScopeChange: (scope: SiteScope) => void;
  onAddViolation: (currentViolations: SiteVisitViolation[], setViolations: SetViolations) => void;
  onCompleteVisit: (violations: SiteVisitViolation[], scopeAtVisit: SiteScope) => void;
}

export default function SiteVisitScreen({
  user,
  siteScope,
  onScopeChange,
  onAddViolation,
  onCompleteVisit,
}: SiteVisitScreenProps) {
  const [gpsAllowed, setGpsAllowed] = useState(false);
  const [violations, setViolations] = useState<SiteVisitViolation[]>([]);

  // demo target location
  const targetLat = 31.5204;
  const targetLon = 74.3587;

  useEffect(() => {
    Geolocation.getCurrentPosition(
      pos => {
        const {latitude, longitude} = pos.coords;
        const dist = distanceInMeters(latitude, longitude, targetLat, targetLon);
        setGpsAllowed(dist < 100);
      },
      () => {
        // Keep existing behavior: failure means not verified on-site.
        setGpsAllowed(false);
      },
      {enableHighAccuracy: true, timeout: 15000, maximumAge: 10000},
    );
  }, []);

  const handleAddViolation = () => {
    onAddViolation(violations, setViolations);
  };

  const handleComplete = () => {
    onCompleteVisit(violations, siteScope);
  };

  const scopes: Array<{label: string; value: SiteScope}> = [
    {label: 'Residential', value: 'residential'},
    {label: 'Commercial', value: 'commercial'},
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Site Visit</Text>
      <Text style={styles.siteInfo}>Scheme / Block / Plot will be loaded per site</Text>
      <Text style={styles.siteInfo}>Officer: {user.name}</Text>
      <View style={[styles.statusBadge, {backgroundColor: gpsAllowed ? colors.success : colors.danger}]}>
        <Text style={styles.statusText}>{gpsAllowed ? 'On-site (GPS verified)' : 'Not at site location'}</Text>
      </View>
      {showTestGpsControls ? (
        <Text style={styles.siteInfo}>Test mode active (fake API enabled).</Text>
      ) : null}

      <View style={styles.scopeWrapper}>
        <Text style={styles.scopeLabel}>Property Type</Text>
        <View style={styles.scopeButtons}>
          {scopes.map(scope => (
            <TouchableOpacity
              key={scope.value}
              style={[
                styles.scopeButton,
                scope.value === siteScope ? styles.scopeButtonActive : styles.scopeButtonInactive,
              ]}
              onPress={() => onScopeChange(scope.value)}>
              <Text
                style={[
                  styles.scopeButtonText,
                  scope.value === siteScope ? styles.scopeButtonTextActive : null,
                ]}>
                {scope.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recorded Violations</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleAddViolation}>
          <Text style={styles.addButtonText}>+ Add Violation</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={violations}
        keyExtractor={(_, idx) => idx.toString()}
        renderItem={({item}) => (
          <View style={styles.violationCard}>
            <Text style={styles.violationType}>{item.typeLabel || item.type}</Text>
            {item.categoryLabel || item.floorLabel ? (
              <Text style={styles.violationMeta}>
                Category/Floor: {item.floorLabel || item.categoryLabel}
              </Text>
            ) : null}
            {item.area ? (
              <Text style={styles.violationMeta}>Area: {item.area} sq.ft</Text>
            ) : (
              <Text style={styles.violationMeta}>No area entered</Text>
            )}
            {item.notes ? <Text style={styles.violationNotes}>{item.notes}</Text> : null}
          </View>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>No violations added yet.</Text>}
      />

      <TouchableOpacity
        style={[
          styles.completeButton,
          gpsAllowed && violations.length > 0 ? styles.completeButtonEnabled : styles.completeButtonDisabled,
        ]}
        disabled={!gpsAllowed || violations.length === 0}
        onPress={handleComplete}>
        <Text style={styles.completeButtonText}>Complete Site Visit</Text>
      </TouchableOpacity>
    </View>
  );
}

function distanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const styles = StyleSheet.create({
  container: {flex: 1, padding: 16, backgroundColor: colors.background},
  header: {fontSize: 20, fontWeight: '700', color: colors.primary},
  siteInfo: {fontSize: 13, color: colors.mutedText, marginTop: 2},
  statusBadge: {marginTop: 12, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12, alignSelf: 'flex-start'},
  statusText: {color: '#ffffff', fontSize: 12},
  scopeWrapper: {marginTop: 16},
  scopeLabel: {fontSize: 13, color: colors.mutedText, marginBottom: 6},
  scopeButtons: {flexDirection: 'row'},
  scopeButton: {paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, marginRight: 12},
  scopeButtonActive: {backgroundColor: colors.primary},
  scopeButtonInactive: {backgroundColor: '#e5e7eb'},
  scopeButtonText: {fontSize: 12, color: colors.text},
  scopeButtonTextActive: {color: '#ffffff'},
  sectionHeader: {marginTop: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  sectionTitle: {fontSize: 16, fontWeight: '600', color: colors.text},
  addButton: {paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: colors.primaryLight},
  addButtonText: {color: '#ffffff', fontSize: 12},
  violationCard: {backgroundColor: colors.card, borderRadius: 10, padding: 12, marginTop: 10, borderWidth: 1, borderColor: '#e5e7eb'},
  violationType: {fontWeight: '600', color: colors.text},
  violationMeta: {fontSize: 12, color: colors.mutedText, marginTop: 4},
  violationNotes: {fontSize: 12, color: colors.text, marginTop: 6},
  emptyText: {marginTop: 16, fontSize: 12, color: colors.mutedText},
  completeButton: {marginTop: 16, paddingVertical: 14, borderRadius: 12, alignItems: 'center'},
  completeButtonEnabled: {backgroundColor: colors.primary},
  completeButtonDisabled: {backgroundColor: '#9ca3af'},
  completeButtonText: {color: '#ffffff', fontWeight: '600'},
});
