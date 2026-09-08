import React, {useEffect, useMemo, useRef} from 'react';
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
 * Free MapLibre preview of the officer GPS fix, plus optional Google Maps
 * turn-by-turn (opens the Google Maps app / browser — no Maps SDK billing).
 */
export default function OfficerLocationMap({
  lat,
  lng,
  accuracyMeters = null,
}: OfficerLocationMapProps) {
  const cameraRef = useRef<CameraRef>(null);
  const center = useMemo(() => [lng, lat] as [number, number], [lat, lng]);

  useEffect(() => {
    cameraRef.current?.easeTo({
      center,
      zoom: 16,
      duration: 400,
    });
  }, [center]);

  return (
    <View style={styles.wrap}>
      <View style={styles.mapFrame} accessibilityLabel="Map preview of current GPS location">
        <Map
          style={styles.map}
          mapStyle={FREE_MAP_STYLE_URL}
          // TextureView plays nicer inside ScrollView than GLSurfaceView.
          androidView="texture"
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
      </View>

      <Text style={styles.caption}>
        MapLibre preview (OpenStreetMap)
        {accuracyMeters != null && Number.isFinite(accuracyMeters)
          ? ` · ±${Math.round(accuracyMeters)} m`
          : ''}
      </Text>

      <TouchableOpacity
        style={styles.directionsBtn}
        onPress={() => openGoogleMapsDirections(lat, lng)}
        accessibilityRole="button"
        accessibilityLabel="Open turn-by-turn directions in Google Maps">
        <Icon source="navigation-variant" size={16} color="#ffffff" />
        <Text style={styles.directionsBtnText}>Open in Google Maps</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 12,
  },
  mapFrame: {
    height: 220,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#e8eef5',
  },
  map: {
    flex: 1,
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
  caption: {
    marginTop: 8,
    fontSize: 11,
    color: colors.mutedText,
    lineHeight: 15,
  },
  directionsBtn: {
    marginTop: 10,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  directionsBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
});
