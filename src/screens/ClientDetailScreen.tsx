import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadow } from '../constants/theme';
import { getClientDetail } from '../api/clientApi';
import { queryKeys } from '../api/queryKeys';
import { useRefreshControl } from '../hooks/useRefreshControl';
import { getErrorMessage } from '../api/client';
import { getBmi, getBmiCategory } from '../utils/bmi';
import type { RootScreenProps } from '../types/navigation';
import type { IoniconName } from '../types/wizard';

interface InfoRow {
  label: string;
  icon: IoniconName;
  value: string;
}

export default function ClientDetailScreen({ navigation, route }: RootScreenProps<'ClientDetail'>) {
  const client = route.params?.client || { name: 'Client', initials: 'CL' };

  const detailQuery = useQuery({
    queryKey: queryKeys.clientDetail(client.clientCode, client.assessmentCode),
    queryFn: () =>
      getClientDetail({ clientCode: client.clientCode, assessmentCode: client.assessmentCode }),
    enabled: !!client.clientCode,
  });
  const refreshControl = useRefreshControl(detailQuery);

  // Only shown with no cached detail — a background refetch failure leaves stale data as-is.
  const errorMessage =
    detailQuery.isError && !detailQuery.data
      ? getErrorMessage(detailQuery.error, 'Could not load client details. Pull down to try again.')
      : null;

  const infoRows = useMemo<InfoRow[]>(() => {
    const detail = detailQuery.data;
    if (!detail) return [];
    const bmi = getBmi(detail.height ?? '', detail.weight ?? '');
    const category = getBmiCategory(bmi);
    return [
      { label: 'Goal', icon: 'trophy-outline', value: detail.lifestyle?.primaryGoal || '—' },
      {
        label: 'Age',
        icon: 'calendar-outline',
        value: detail.age != null ? `${detail.age} years` : '—',
      },
      {
        label: 'Height',
        icon: 'resize-outline',
        value: detail.height != null ? `${detail.height} cm` : '—',
      },
      {
        label: 'Weight',
        icon: 'scale-outline',
        value: detail.weight != null ? `${detail.weight} kg` : '—',
      },
      {
        label: 'BMI',
        icon: 'body-outline',
        value: bmi ? `${bmi.toFixed(1)} (${category?.label ?? '—'})` : '—',
      },
      {
        label: 'Diet Type',
        icon: 'restaurant-outline',
        value: detail.lifestyle?.foodPreference || '—',
      },
      { label: 'Activity', icon: 'walk-outline', value: detail.lifestyle?.physicalActivity || '—' },
      { label: 'Next Checkup', icon: 'time-outline', value: '—' },
    ];
  }, [detailQuery.data]);

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshControl.refreshing}
          onRefresh={refreshControl.onRefresh}
          tintColor={Colors.secondary}
        />
      }
    >
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
        {client.goal ? <Text style={styles.clientGoal}>{client.goal}</Text> : null}
        {client.status ? (
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{client.status}</Text>
          </View>
        ) : null}
      </View>

      {/* Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Client Information</Text>
        {client.clientCode && detailQuery.isPending ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 10 }} />
        ) : errorMessage ? (
          <Text style={styles.empty}>{errorMessage}</Text>
        ) : infoRows.length === 0 ? (
          <Text style={styles.empty}>Details unavailable.</Text>
        ) : (
          infoRows.map((row, i) => (
            <View key={i} style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name={row.icon} size={16} color={Colors.secondary} />
              </View>
              <Text style={styles.infoLabel}>{row.label}</Text>
              <Text style={styles.infoValue}>{row.value}</Text>
            </View>
          ))
        )}
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
  empty: { fontSize: 13, color: Colors.textLight, marginTop: 6 },
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
