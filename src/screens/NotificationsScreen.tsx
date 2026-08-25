import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors } from '../constants/theme';
import EmptyState from '../components/EmptyState';
import ScreenHeader from '../components/ScreenHeader';
import type { RootScreenProps } from '../types/navigation';

export default function NotificationsScreen({ navigation }: RootScreenProps<'Notifications'>) {
  return (
    <View style={styles.container}>
      <ScreenHeader title="Notifications" onBack={() => navigation.goBack()} />
      <EmptyState
        icon="notifications-outline"
        title="Coming soon"
        message="Check-up reminders and lead alerts will show up here once notifications go live."
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
});
