import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors } from '../constants/theme';
import { BrandImages } from '../constants/images';
import EmptyState from '../components/EmptyState';
import ScreenHeader from '../components/ScreenHeader';
import type { DashboardStackScreenProps } from '../types/navigation';

export default function NotificationsScreen({
  navigation,
}: DashboardStackScreenProps<'Notifications'>) {
  return (
    <View style={styles.container}>
      <ScreenHeader title="Notifications" onBack={() => navigation.goBack()} />
      <EmptyState
        illustration={BrandImages.emptyNotifications}
        title="Nothing here yet"
        message="Check-up reminders and lead alerts will show up here when we turn notifications on."
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
});
