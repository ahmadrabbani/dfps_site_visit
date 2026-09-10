import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Linking, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {Icon} from 'react-native-paper';
import {Camera, Map, Marker, type CameraRef} from '@maplibre/maplibre-react-native';
import {colors} from '../theme/colors';

/** Free OpenStreetMap-based style (no Google billing / API key). */
export const FREE_MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

interface OfficerLocationMapProps {
  lat: number;
  lng: number;
  accuracyMeters?: number | null;
}

function openGoogleMapsDirections(lat: number, lng: number) {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
  Linking.openURL(url).catch(() => undefined);
}

/**
 * Free MapLibre preview of the officer GPS fix (collapsed by default to avoid
 * ScrollView gesture fights / GPU cost). Open in Google Maps for turn-by-turn.
 */
export default function OfficerLocationMap({
  lat,
  lng,
  accuracyMeters = null,
}: OfficerLocationMapProps) {
  const [expanded, setExpanded] = useState(false);
  const cameraRef = useRef<CameraRef>(null);
  const center = useMemo(() => [lng, lat] as [number, number], [lat, lng]);

  useEffect(() => {
    if (!expanded) {
      return;
    }
    cameraRef.current?.easeTo({
      center,
      zoom: 16,
      duration: 400,
    });
  }, [center, expanded]);

  const accuracyText =
    accuracyMeters != null && Number.isFinite(accuracyMeters)
      ? ` ±${Math.round(accuracyMeters)} m`
      : '';

  return (
    <View style={styles.wrap}>
      <Text
        style={styles.caption}
        accessibilityLabel={`GPS coordinates ${lat.toFixed(5)}, ${lng.toFixed(5)}${accuracyText}`}>
        {lat.toFixed(5)}, {lng.toFixed(5)}
        {accuracyText}
      </Text>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => setExpanded(prev => !prev)}
          accessibilityRole="button"
          accessibilityLabel={expanded ? 'Hide map preview' : 'Show map preview'}
          accessibilityState={{expanded}}>
          <Icon source={expanded ? 'map-minus' : 'map'} size={16} color={colors.primary} />
          <Text style={styles.secondaryBtnText}>{expanded ? 'Hide map' : 'Show map'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.directionsBtn}
          onPress={() => openGoogleMapsDirections(lat, lng)}
          accessibilityRole="button"
          accessibilityLabel="Open turn-by-turn directions in Google Maps">
          <Icon source="navigation-variant" size={16} color="#ffffff" />
          <Text style={styles.directionsBtnText}>Open in Google Maps</Text>
        </TouchableOpacity>
      </View>

      {expanded ? (
        <View
          style={styles.mapFrame}
          accessibilityLabel="Static map preview of current GPS location"
          importantForAccessibility="no-hide-descendants">
          <Map
            style={styles.map}
            mapStyle={FREE_MAP_STYLE_URL}
            androidView="texture"
            // Static preview — avoids fighting the parent ScrollView.
            dragPan={false}
            touchZoom={false}
            doubleTapZoom={false}
            doubleTapHoldZoom={false}
            touchRotate={false}
            touchPitch={false}
            attribution
            logo={false}
            compass={false}
            scaleBar={false}>
            <Camera
              ref={cameraRef}
              initialViewState={{center, zoom: 16}}
              minZoom={12}
              maxZoom={19}
            />
            <Marker id="officer-gps" lngLat={center} anchor="bottom">
              <View style={styles.markerWrap}>
                <View style={styles.markerDot} />
                <View style={styles.markerStem} />
              </View>
            </Marker>
          </Map>
          <Text style={styles.mapHint}>Map is a static preview. Use Google Maps for navigation.</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 12,
  },
  caption: {
    fontSize: 12,
    color: colors.mutedText,
    lineHeight: 16,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    backgroundColor: '#ffffff',
  },
  secondaryBtnText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  directionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  directionsBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  mapFrame: {
    marginTop: 10,
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#e8eef5',
  },
  map: {
    flex: 1,
  },
  mapHint: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 8,
    fontSize: 10,
    color: '#ffffff',
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: 'hidden',
  },
  markerWrap: {
    alignItems: 'center',
  },
  markerDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  markerStem: {
    width: 2,
    height: 10,
    backgroundColor: colors.primary,
    marginTop: -1,
  },
});
