import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/theme';
import EmptyState from '../components/EmptyState';

export default function ReCheckupListScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Re-Checkups</Text>
      </View>
      <EmptyState
        icon="clipboard-outline"
        title="No checkups scheduled"
        message="Re-checkup scheduling is not available yet. You can still open a client and run a BMI check from their profile."
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
