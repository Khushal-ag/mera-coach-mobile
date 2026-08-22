import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/theme';
import EmptyState from '../components/EmptyState';

export default function MyLeadsScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Leads</Text>
      </View>
      <EmptyState
        icon="funnel-outline"
        title="No leads yet"
        message="When clients send enquiries from your public profile, they will appear here. Lead inbox API is not available yet."
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.secondary,
    paddingTop: 56,
    paddingBottom: 20,
    paddingHorizontal: 24,
  },
  title: { color: Colors.white, fontSize: 22, fontWeight: '800' },
});
