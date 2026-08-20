import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadow } from '../constants/theme';
import type { RootScreenProps } from '../types/navigation';
import type { IoniconName } from '../types/wizard';

interface Notification {
  id: string;
  type: 'checkup' | 'lead' | 'client' | 'system';
  title: string;
  message: string;
  time: string;
  read: boolean;
}

const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    type: 'checkup',
    title: 'Re-checkup Due',
    message: "Anjali Mehta's checkup is due today",
    time: '2 hrs ago',
    read: false,
  },
  {
    id: '2',
    type: 'lead',
    title: 'New Lead',
    message: 'Meera Joshi submitted an enquiry via Instagram',
    time: '5 hrs ago',
    read: false,
  },
  {
    id: '3',
    type: 'client',
    title: 'New Client Added',
    message: 'Rahul Verma profile has been created',
    time: 'Yesterday',
    read: true,
  },
  {
    id: '4',
    type: 'checkup',
    title: 'Checkup Overdue',
    message: 'Rohit Das checkup is 3 days overdue',
    time: 'Yesterday',
    read: true,
  },
  {
    id: '5',
    type: 'system',
    title: 'Welcome to MeraCoach',
    message: 'Your wellness coaching platform is ready',
    time: '2 days ago',
    read: true,
  },
];

const typeConfig: Record<Notification['type'], { icon: IoniconName; color: string; bg: string }> = {
  checkup: { icon: 'clipboard', color: Colors.accent, bg: Colors.accentLight },
  lead: { icon: 'funnel', color: '#7c3aed', bg: '#ede9fe' },
  client: { icon: 'person-add', color: Colors.secondary, bg: Colors.secondaryLight },
  system: { icon: 'information-circle', color: Colors.primary, bg: Colors.primaryLight },
};

export default function NotificationsScreen({ navigation }: RootScreenProps<'Notifications'>) {
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);

  const markAllRead = () => setNotifications(list => list.map(n => ({ ...n, read: true })));
  const markRead = (id: string) =>
    setNotifications(list => list.map(n => (n.id === id ? { ...n, read: true } : n)));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        <TouchableOpacity onPress={markAllRead}>
          <Text style={styles.markAll}>Mark all read</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 20 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const cfg = typeConfig[item.type];
          return (
            <TouchableOpacity
              style={[styles.card, !item.read && styles.cardUnread]}
              onPress={() => markRead(item.id)}
            >
              {!item.read && <View style={styles.unreadDot} />}
              <View style={[styles.iconBox, { backgroundColor: cfg.bg }]}>
                <Ionicons name={cfg.icon} size={20} color={cfg.color} />
              </View>
              <View style={styles.content}>
                <Text style={styles.notifTitle}>{item.title}</Text>
                <Text style={styles.notifMessage}>{item.message}</Text>
                <Text style={styles.time}>{item.time}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
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
    justifyContent: 'space-between',
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
  markAll: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: 14,
    marginBottom: 10,
    ...Shadow.sm,
  },
  cardUnread: { borderLeftWidth: 3, borderLeftColor: Colors.primary },
  unreadDot: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  content: { flex: 1 },
  notifTitle: { fontSize: 14, fontWeight: '700', color: Colors.textDark },
  notifMessage: { fontSize: 12, color: Colors.textLight, marginTop: 3, lineHeight: 18 },
  time: { fontSize: 11, color: Colors.textLight, marginTop: 6, fontWeight: '600' },
});
