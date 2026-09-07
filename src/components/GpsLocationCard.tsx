import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {Icon} from 'react-native-paper';
import {colors} from '../theme/colors';
import {formatCoord} from '../hooks/useSiteVisitGps';

interface GpsLocationCardProps {
  gpsAllowed: boolean;
  gpsLoading: boolean;
  gpsError: string | null;
  gpsPermissionDenied: boolean;
  currentLat: number | null;
  currentLng: number | null;
  currentAccuracy?: number | null;
  maxAccuracyMeters?: number;
  needsPermissionPrompt: boolean;
  /** When false, never open system Settings (keeps the app in foreground). Default true. */
  allowOpenSettings?: boolean;
  onGetLocation: () => void;
  onRetryGps: () => void;
  onOpenSettings: () => void;
}

export default function GpsLocationCard({
  gpsAllowed,
  gpsLoading,
  gpsError,
  gpsPermissionDenied,
  currentLat,
  currentLng,
  currentAccuracy = null,
  maxAccuracyMeters,
  needsPermissionPrompt,
  allowOpenSettings = true,
  onGetLocation,
  onRetryGps,
  onOpenSettings,
}: GpsLocationCardProps) {
  const accuracyTooWeak =
    maxAccuracyMeters != null &&
    currentAccuracy != null &&
    currentAccuracy > maxAccuracyMeters;

  return (
    <View style={styles.locationSection}>
      <View style={styles.locationCard}>
        <View style={styles.locationCardHeader}>
          <Icon
            source={gpsAllowed && !accuracyTooWeak ? 'map-marker' : 'map-marker-off'}
            size={22}
            color={
              gpsLoading
                ? colors.mutedText
                : gpsAllowed && !accuracyTooWeak
                  ? colors.success
                  : colors.danger
            }
          />
          <Text style={styles.locationTitle}>
            {gpsLoading
              ? 'Acquiring GPS location...'
              : gpsAllowed && !accuracyTooWeak
                ? 'GPS Location Ready'
                : accuracyTooWeak
                  ? 'GPS accuracy too weak'
                  : needsPermissionPrompt
                    ? 'Location required'
                    : 'GPS Signal Offline'}
          </Text>
        </View>

        {gpsAllowed && currentLat != null && currentLng != null ? (
          <View style={styles.coordinatesContainer}>
            <View style={styles.coordinateBlock}>
              <Text style={styles.coordinateLabel}>LATITUDE</Text>
              <Text style={styles.coordinateValue}>{formatCoord(currentLat)}</Text>
            </View>
            <View style={styles.coordinateDivider} />
            <View style={styles.coordinateBlock}>
              <Text style={styles.coordinateLabel}>LONGITUDE</Text>
              <Text style={styles.coordinateValue}>{formatCoord(currentLng)}</Text>
            </View>
            {currentAccuracy != null ? (
              <>
                <View style={styles.coordinateDivider} />
                <View style={styles.coordinateBlock}>
                  <Text style={styles.coordinateLabel}>ACCURACY</Text>
                  <Text
                    style={[
                      styles.coordinateValue,
                      accuracyTooWeak ? styles.coordinateValueWarn : null,
                    ]}>
                    {Math.round(currentAccuracy)} m
                  </Text>
                </View>
              </>
            ) : null}
          </View>
        ) : (
          <Text style={styles.locationError}>
            {gpsError || 'Tap Get location below to record GPS for this survey.'}
          </Text>
        )}

        {accuracyTooWeak ? (
          <Text style={styles.accuracyHint}>
            Accuracy is {Math.round(currentAccuracy!)} m. Move outdoors until it is{' '}
            {maxAccuracyMeters} m or better, then tap Retry GPS.
          </Text>
        ) : null}

        {!gpsLoading && (!gpsAllowed || accuracyTooWeak) ? (
          <View style={styles.locationActionRow}>
            <TouchableOpacity style={styles.locationRetryBtn} onPress={onGetLocation}>
              <Icon source="map-marker-radius" size={16} color="#ffffff" />
              <Text style={styles.locationRetryBtnText}>Get location</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.locationRetryBtn, styles.locationRetryBtnSecondary]}
              onPress={onRetryGps}>
              <Icon source="refresh" size={16} color={colors.primary} />
              <Text style={[styles.locationRetryBtnText, styles.locationRetryBtnTextSecondary]}>
                Retry GPS
              </Text>
            </TouchableOpacity>
            {gpsPermissionDenied && allowOpenSettings ? (
              <TouchableOpacity style={styles.locationSettingsBtn} onPress={onOpenSettings}>
                <Text style={styles.locationSettingsBtnText}>Open Settings</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  locationSection: {
    marginTop: 10,
  },
  locationCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginTop: 6,
  },
  locationCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginLeft: 8,
    flex: 1,
  },
  coordinatesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#dcfce7',
  },
  coordinateBlock: {
    flex: 1,
    alignItems: 'center',
  },
  coordinateLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.mutedText,
    letterSpacing: 1,
  },
  coordinateValue: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.success,
    marginTop: 4,
  },
  coordinateValueWarn: {
    color: colors.danger,
  },
  coordinateDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#cbd5e1',
  },
  locationError: {
    fontSize: 12,
    color: colors.mutedText,
    lineHeight: 18,
  },
  accuracyHint: {
    marginTop: 10,
    fontSize: 12,
    color: colors.danger,
    lineHeight: 17,
  },
  locationActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  locationRetryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  locationRetryBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  locationRetryBtnSecondary: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  locationRetryBtnTextSecondary: {
    color: colors.primary,
  },
  locationSettingsBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    justifyContent: 'center',
  },
  locationSettingsBtnText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
});
