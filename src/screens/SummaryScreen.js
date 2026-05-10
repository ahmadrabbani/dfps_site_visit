import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet, FlatList} from 'react-native';
import {colors} from '../theme/colors';

export default function SummaryScreen({visit, onDone}) {
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

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Site Visit Completed</Text>
      <Text style={styles.sub}>Site ID: {visit.siteId}</Text>
      <Text style={styles.sub}>Schedule: {visit.scope}</Text>
      <Text style={styles.sub}>Violations recorded: {visit.violations.length}</Text>

      <FlatList
        data={visit.violations}
        keyExtractor={(item, idx) => idx.toString()}
        renderItem={({item}) => (
          <View style={styles.card}>
            <Text style={styles.type}>{item.typeLabel || item.type}</Text>
            {item.categoryLabel || item.floorLabel ? (
              <Text style={styles.meta}>
                Category/Floor: {item.floorLabel || item.categoryLabel}
              </Text>
            ) : null}
            {item.area ? <Text style={styles.meta}>Area: {item.area} sq.ft</Text> : null}
            {item.notes ? <Text style={styles.notes}>{item.notes}</Text> : null}
          </View>
        )}
      />

      <TouchableOpacity style={styles.button} onPress={onDone}>
        <Text style={styles.buttonText}>Back to Dashboard</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, padding: 16, backgroundColor: colors.background},
  header: {fontSize: 20, fontWeight: '700', color: colors.primary},
  sub: {fontSize: 13, color: colors.mutedText, marginTop: 4},
  card: {backgroundColor: colors.card, borderRadius: 10, padding: 12, marginTop: 10, borderWidth: 1, borderColor: '#e5e7eb'},
  type: {fontWeight: '600', color: colors.text},
  meta: {fontSize: 12, color: colors.mutedText, marginTop: 4},
  notes: {fontSize: 12, color: colors.text, marginTop: 6},
  button: {marginTop: 16, paddingVertical: 14, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center'},
  buttonText: {color: '#ffffff', fontWeight: '600'},
});
