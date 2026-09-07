import React, {useEffect, useState} from 'react';
import {ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {clearGpsDebugLog, subscribeGpsDebug} from '../utils/gpsDebugLog';
import {colors} from '../theme/colors';

interface GpsDebugPanelProps {
  title?: string;
}

/** On-screen GPS trace for Property Seal debugging (dev builds). */
export default function GpsDebugPanel({title = 'GPS debug'}: GpsDebugPanelProps) {
  const [lines, setLines] = useState<string[]>([]);

  useEffect(() => {
    return subscribeGpsDebug(line => {
      setLines(prev => [line, ...prev].slice(0, 40));
    });
  }, []);

  if (!__DEV__) {
    return null;
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{title}</Text>
        <TouchableOpacity onPress={() => clearGpsDebugLog()} accessibilityRole="button">
          <Text style={styles.clear}>Clear</Text>
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.scroll} nestedScrollEnabled>
        {lines.length === 0 ? (
          <Text style={styles.empty}>Tap Get location — steps will appear here and in logcat.</Text>
        ) : (
          lines.map(line => (
            <Text key={line} style={styles.line}>
              {line}
            </Text>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#fbbf24',
    borderRadius: 8,
    backgroundColor: '#fffbeb',
    padding: 10,
    maxHeight: 220,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  clear: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.danger,
  },
  scroll: {
    maxHeight: 170,
  },
  empty: {
    fontSize: 11,
    color: colors.mutedText,
    lineHeight: 16,
  },
  line: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: '#78350f',
    marginBottom: 4,
  },
});
