import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import EmptyState from '../components/EmptyState';
import type { RootScreenProps } from '../types/navigation';

export default function NotificationsScreen({ navigation }: RootScreenProps<'Notifications'>) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        <View style={styles.spacer} />
      </View>
      <EmptyState
        icon="notifications-outline"
        title="No notifications"
        message="Push and in-app notifications are not available yet. Check back once this feature is connected."
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
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: Colors.white, fontSize: 18, fontWeight: '700', flex: 1, marginLeft: 12 },
  spacer: { width: 36 },
});
