import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadow } from '../constants/theme';
import type { RootScreenProps } from '../types/navigation';
import type { IoniconName } from '../types/wizard';

interface InfoRow {
  label: string;
  icon: IoniconName;
  value: string;
}

const infoRows: InfoRow[] = [
  { label: 'Goal', icon: 'trophy-outline', value: 'Weight Loss' },
  { label: 'Age', icon: 'calendar-outline', value: '28 years' },
  { label: 'Height', icon: 'resize-outline', value: '162 cm' },
  { label: 'Weight', icon: 'scale-outline', value: '72 kg' },
  { label: 'BMI', icon: 'body-outline', value: '27.4 (Overweight)' },
  { label: 'Diet Type', icon: 'restaurant-outline', value: 'Vegetarian' },
  { label: 'Activity', icon: 'walk-outline', value: 'Moderately Active' },
  { label: 'Next Checkup', icon: 'time-outline', value: '15 Jun 2024' },
];

export default function ClientDetailScreen({ navigation, route }: RootScreenProps<'ClientDetail'>) {
  const client = route.params?.client || {
    name: 'Priya Sharma',
    initials: 'PS',
    goal: 'Weight Loss',
    status: 'Active',
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Client Profile</Text>
        <TouchableOpacity style={styles.editBtn}>
          <Ionicons name="create-outline" size={20} color={Colors.white} />
        </TouchableOpacity>
      </View>

      {/* Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{client.initials || 'CL'}</Text>
        </View>
        <Text style={styles.clientName}>{client.name}</Text>
        <Text style={styles.clientGoal}>{client.goal}</Text>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{client.status || 'Active'}</Text>
        </View>
      </View>

      {/* Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Client Information</Text>
        {infoRows.map((row, i) => (
          <View key={i} style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name={row.icon} size={16} color={Colors.secondary} />
            </View>
            <Text style={styles.infoLabel}>{row.label}</Text>
            <Text style={styles.infoValue}>{row.value}</Text>
          </View>
        ))}
      </View>

      {/* Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Actions</Text>
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: Colors.secondaryLight }]}
            onPress={() => navigation.navigate('ClientLifestyle', { client })}
          >
            <Ionicons name="calendar-outline" size={20} color={Colors.secondary} />
            <Text style={[styles.actionText, { color: Colors.secondary }]}>Lifestyle</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#ede9fe' }]}
            onPress={() => navigation.navigate('ClientDiet', { client })}
          >
            <Ionicons name="restaurant-outline" size={20} color="#7c3aed" />
            <Text style={[styles.actionText, { color: '#7c3aed' }]}>Diet</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: Colors.accentLight }]}
            onPress={() => navigation.navigate('ClientBmi', { client })}
          >
            <Ionicons name="clipboard-outline" size={20} color={Colors.accent} />
            <Text style={[styles.actionText, { color: Colors.accent }]}>Checkup</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: Colors.primaryLight }]}
            onPress={() => navigation.navigate('ClientBmi', { client })}
          >
            <Ionicons name="body-outline" size={20} color={Colors.primary} />
            <Text style={[styles.actionText, { color: Colors.primary }]}>BMI</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
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
  headerTitle: { color: Colors.white, fontSize: 18, fontWeight: '700' },
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileCard: {
    backgroundColor: Colors.white,
    margin: 20,
    borderRadius: Radius.lg,
    padding: 24,
    alignItems: 'center',
    ...Shadow.md,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: { color: Colors.white, fontSize: 24, fontWeight: '800' },
  clientName: { fontSize: 20, fontWeight: '800', color: Colors.textDark },
  clientGoal: { fontSize: 13, color: Colors.textLight, marginTop: 4 },
  statusBadge: {
    marginTop: 10,
    backgroundColor: Colors.secondaryLight,
    borderRadius: Radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  statusText: { color: Colors.secondary, fontSize: 12, fontWeight: '700' },
  section: { marginHorizontal: 20, marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.textDark, marginBottom: 10 },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.sm,
    padding: 12,
    marginBottom: 6,
    ...Shadow.sm,
  },
  infoIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: Colors.secondaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  infoLabel: { flex: 1, fontSize: 13, color: Colors.textLight },
  infoValue: { fontSize: 13, fontWeight: '700', color: Colors.textDark },
  actionRow: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    flex: 1,
    borderRadius: Radius.md,
    paddingVertical: 14,
    paddingHorizontal: 6,
    alignItems: 'center',
    gap: 6,
  },
  actionText: { fontSize: 11, fontWeight: '700', textAlign: 'center' },
});
