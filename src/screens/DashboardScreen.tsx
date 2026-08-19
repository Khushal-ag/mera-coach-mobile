import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadow } from '../constants/theme';
import type { MainTabScreenProps } from '../types/navigation';
import type { IoniconName } from '../types/wizard';

interface StatCard {
  label: string;
  value: string;
  icon: IoniconName;
  color: string;
  bg: string;
}

const stats: StatCard[] = [
  {
    label: 'Total Clients',
    value: '48',
    icon: 'people',
    color: Colors.secondary,
    bg: Colors.secondaryLight,
  },
  {
    label: 'Active Leads',
    value: '12',
    icon: 'funnel',
    color: Colors.accent,
    bg: Colors.accentLight,
  },
  {
    label: 'Re-Checkups',
    value: '7',
    icon: 'clipboard',
    color: Colors.primary,
    bg: Colors.primaryLight,
  },
  { label: 'This Month', value: '5', icon: 'calendar', color: '#7c3aed', bg: '#ede9fe' },
];

const recentClients = [
  { name: 'Priya Sharma', goal: 'Weight Loss', status: 'Active', initials: 'PS' },
  { name: 'Rahul Verma', goal: 'Muscle Gain', status: 'Active', initials: 'RV' },
  { name: 'Anjali Mehta', goal: 'Diabetes Care', status: 'Checkup Due', initials: 'AM' },
];

export default function DashboardScreen({ navigation }: MainTabScreenProps<'Dashboard'>) {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good Morning,</Text>
          <Text style={styles.coachName}>Coach Amit 👋</Text>
        </View>
        <TouchableOpacity
          style={styles.notifBtn}
          onPress={() => navigation.navigate('Notifications')}
        >
          <Ionicons name="notifications-outline" size={22} color={Colors.white} />
          <View style={styles.badge}>
            <Text style={styles.badgeText}>3</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        {/* Stats Grid */}
        <Text style={styles.sectionTitle}>Overview</Text>
        <View style={styles.statsGrid}>
          {stats.map((s, i) => (
            <View key={i} style={[styles.statCard, { backgroundColor: s.bg }]}>
              <View style={[styles.statIcon, { backgroundColor: s.color }]}>
                <Ionicons name={s.icon} size={18} color={Colors.white} />
              </View>
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('AddClient')}
          >
            <View style={[styles.actionIcon, { backgroundColor: Colors.primaryLight }]}>
              <Ionicons name="person-add" size={20} color={Colors.primary} />
            </View>
            <Text style={styles.actionText}>Add Client</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Clients')}>
            <View style={[styles.actionIcon, { backgroundColor: Colors.secondaryLight }]}>
              <Ionicons name="people" size={20} color={Colors.secondary} />
            </View>
            <Text style={styles.actionText}>All Clients</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('Checkups')}
          >
            <View style={[styles.actionIcon, { backgroundColor: Colors.accentLight }]}>
              <Ionicons name="clipboard" size={20} color={Colors.accent} />
            </View>
            <Text style={styles.actionText}>Checkups</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Leads')}>
            <View style={[styles.actionIcon, { backgroundColor: '#ede9fe' }]}>
              <Ionicons name="funnel" size={20} color="#7c3aed" />
            </View>
            <Text style={styles.actionText}>My Leads</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Clients */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Clients</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Clients')}>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>
        {recentClients.map((c, i) => (
          <TouchableOpacity
            key={i}
            style={styles.clientRow}
            onPress={() => navigation.navigate('ClientDetail', { client: c })}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{c.initials}</Text>
            </View>
            <View style={styles.clientInfo}>
              <Text style={styles.clientName}>{c.name}</Text>
              <Text style={styles.clientGoal}>{c.goal}</Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                c.status === 'Active' ? styles.statusActive : styles.statusWarning,
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  c.status === 'Active' ? styles.statusActiveText : styles.statusWarningText,
                ]}
              >
                {c.status}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.secondary,
    paddingTop: 56,
    paddingBottom: 28,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  greeting: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  coachName: { color: Colors.white, fontSize: 22, fontWeight: '800', marginTop: 2 },
  notifBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: Colors.white, fontSize: 9, fontWeight: '700' },
  body: { padding: 20 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: 12,
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  seeAll: { color: Colors.primary, fontSize: 13, fontWeight: '600' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 8 },
  statCard: {
    width: '47%',
    borderRadius: Radius.md,
    padding: 16,
    alignItems: 'flex-start',
    ...Shadow.sm,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statValue: { fontSize: 26, fontWeight: '800' },
  statLabel: { fontSize: 12, color: Colors.textLight, marginTop: 2 },
  actions: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  actionBtn: { alignItems: 'center', width: '23%' },
  actionIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  actionText: { fontSize: 11, color: Colors.textDark, fontWeight: '600', textAlign: 'center' },
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: 14,
    marginTop: 10,
    ...Shadow.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { color: Colors.white, fontWeight: '700', fontSize: 14 },
  clientInfo: { flex: 1 },
  clientName: { fontSize: 14, fontWeight: '700', color: Colors.textDark },
  clientGoal: { fontSize: 12, color: Colors.textLight, marginTop: 2 },
  statusBadge: { borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  statusActive: { backgroundColor: Colors.secondaryLight },
  statusWarning: { backgroundColor: Colors.accentLight },
  statusText: { fontSize: 11, fontWeight: '700' },
  statusActiveText: { color: Colors.secondary },
  statusWarningText: { color: Colors.accent },
});
