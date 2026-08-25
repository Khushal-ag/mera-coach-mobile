import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors } from '../constants/theme';
import EmptyState from '../components/EmptyState';
import ScreenHeader from '../components/ScreenHeader';
import type { RootScreenProps } from '../types/navigation';

export default function MyLeadsScreen({ navigation }: RootScreenProps<'Leads'>) {
  return (
    <View style={styles.container}>
      <ScreenHeader title="My Leads" onBack={() => navigation.goBack()} />
      <EmptyState
        icon="funnel-outline"
        title="Coming soon"
        message="Enquiries from your public profile will appear here once lead tracking goes live."
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
});
