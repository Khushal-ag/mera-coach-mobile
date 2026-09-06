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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontFamily, Radius, Shadow, Spacing } from '../constants/theme';
import ScreenHeader from '../components/ScreenHeader';
import ClientAvatar from '../components/ClientAvatar';
import ProgressPhotos from '../components/ProgressPhotos';
import ReloadState from '../components/ReloadState';
import { getClientDetail } from '../api/clientApi';
import { getErrorMessage } from '../api/client';
import { resolveMasterLabel } from '../api/masterApi';
import { queryKeys } from '../api/queryKeys';
import {
  FOOD_PREFERENCES,
  PARAM_CODES,
  PHYSICAL_ACTIVITY_LEVELS,
  PRIMARY_GOALS,
} from '../data/lifestyleOptions';
import { useParamMasterOptions } from '../hooks/useParamOptions';
import { useRefreshControl, refreshControlTheme } from '../hooks/useRefreshControl';
import { getBmi, getBmiCategory } from '../utils/bmi';
import { lastCheckupLabel } from '../utils/recheckup';
import type { ClientsStackScreenProps } from '../types/navigation';
import type { IoniconName } from '../types/icons';
import { navigateBack } from '../utils/navigationBack';

interface MetricCell {
  label: string;
  value: string;
}

interface DetailRow {
  label: string;
  icon: IoniconName;
  value: string;
}

interface ActionItem {
  label: string;
  icon: IoniconName;
  color: string;
  bg: string;
  onPress: () => void;
}

export default function ClientDetailScreen({
  navigation,
  route,
}: ClientsStackScreenProps<'ClientDetail'>) {
  const insets = useSafeAreaInsets();
  const client = route.params?.client || { name: 'Client' };
  const returnTo = route.params?.returnTo;

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

  // ClientDetail stores PARAMLIST itemCodes (LI00xx); resolve to itemNames for display.
  const goalOptions = useParamMasterOptions(PARAM_CODES.primaryGoal, PRIMARY_GOALS);
  const dietOptions = useParamMasterOptions(PARAM_CODES.foodPreference, FOOD_PREFERENCES);
  const activityOptions = useParamMasterOptions(
    PARAM_CODES.physicalActivity,
    PHYSICAL_ACTIVITY_LEVELS,
  );

  const detail = detailQuery.data;
  const bmi = detail ? getBmi(detail.height ?? '', detail.weight ?? '') : null;
  const bmiCategory = getBmiCategory(bmi);
  const goal = resolveMasterLabel(detail?.primaryGoal || client.goal || '', goalOptions);
  const mobile = (detail?.mobileNo ?? client.mobileNo ?? '').trim();
  const checkupLine = lastCheckupLabel(client.lastCheckupDate);

  const metrics = useMemo<MetricCell[]>(() => {
    if (!detail) return [];
    return [
      { label: 'Age', value: detail.age != null ? `${detail.age} yrs` : '-' },
      { label: 'Height', value: detail.height != null ? `${detail.height} cm` : '-' },
      { label: 'Weight', value: detail.weight != null ? `${detail.weight} kg` : '-' },
      { label: 'BMI', value: bmi ? bmi.toFixed(1) : '-' },
    ];
  }, [detail, bmi]);

  const detailRows = useMemo<DetailRow[]>(() => {
    if (!detail) return [];
    return [
      {
        label: 'Goal',
        icon: 'trophy-outline',
        value: resolveMasterLabel(detail.primaryGoal, goalOptions) || '-',
      },
      {
        label: 'Diet Type',
        icon: 'restaurant-outline',
        value: resolveMasterLabel(detail.foodPreference, dietOptions) || '-',
      },
      {
        label: 'Activity',
        icon: 'walk-outline',
        value: resolveMasterLabel(detail.physicalActivity, activityOptions) || '-',
      },
    ];
  }, [detail, goalOptions, dietOptions, activityOptions]);

  const actions: ActionItem[] = [
    {
      label: 'Checkup',
      icon: 'clipboard-outline',
      color: Colors.accent,
      bg: Colors.accentLight,
      onPress: () => navigation.navigate('ClientBmi', { client }),
    },
    {
      label: 'BMI Report',
      icon: 'document-text-outline',
      color: Colors.primary,
      bg: Colors.primaryLight,
      onPress: () => navigation.navigate('ClientBmiReport', { client }),
    },
    {
      label: 'Diet Plan',
      icon: 'nutrition-outline',
      color: Colors.secondary,
      bg: Colors.secondaryLight,
      onPress: () => navigation.navigate('ClientDietPlan', { client }),
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24) }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshControl.refreshing}
          onRefresh={refreshControl.onRefresh}
          {...refreshControlTheme}
        />
      }
    >
      <ScreenHeader title="Client Profile" onBack={() => navigateBack(navigation, returnTo)} />

      <View style={styles.profileCard}>
        <ClientAvatar
          clientCode={client.clientCode}
          size={80}
          allowUpload
          style={{ marginRight: 0, marginBottom: Spacing.sm }}
        />
        <Text style={styles.clientName}>{client.name}</Text>

        {(mobile || checkupLine) && (
          <View style={styles.contactBlock}>
            {mobile ? (
              <Text style={styles.contactLine} numberOfLines={1}>
                {mobile}
              </Text>
            ) : null}
            <Text style={styles.contactLine} numberOfLines={1}>
              {checkupLine}
            </Text>
          </View>
        )}

        <View style={styles.chipRow}>
          {goal ? (
            <View style={styles.goalChip}>
              <Ionicons name="trophy" size={12} color={Colors.secondary} />
              <Text style={styles.goalChipText} numberOfLines={1}>
                {goal}
              </Text>
            </View>
          ) : null}
          {bmi != null && bmiCategory ? (
            <View style={[styles.bmiBadge, { backgroundColor: bmiCategory.bg }]}>
              <Text style={[styles.bmiBadgeValue, { color: bmiCategory.color }]}>
                {bmi.toFixed(1)}
              </Text>
              <Text style={[styles.bmiBadgeLabel, { color: bmiCategory.color }]}>
                {bmiCategory.label}
              </Text>
            </View>
          ) : null}
          {client.status ? (
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>{client.status}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {client.clientCode ? (
        <View style={styles.section}>
          <ProgressPhotos clientCode={client.clientCode} />
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Client Information</Text>
        {client.clientCode && detailQuery.isPending ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 10 }} />
        ) : errorMessage ? (
          <ReloadState
            title="Could not load client details"
            message={errorMessage}
            onRetry={() => void detailQuery.refetch()}
            loading={detailQuery.isFetching}
            style={{ paddingVertical: 24 }}
          />
        ) : metrics.length === 0 && detailRows.length === 0 ? (
          <Text style={styles.empty}>Details unavailable.</Text>
        ) : (
          <View style={styles.infoCard}>
            <View style={styles.metricsGrid}>
              {metrics.map((m, i) => (
                <View
                  key={m.label}
                  style={[
                    styles.metricCell,
                    i % 2 === 0 && styles.metricCellLeft,
                    i < 2 && styles.metricCellTop,
                  ]}
                >
                  <Text style={styles.metricValue}>{m.value}</Text>
                  <Text style={styles.metricLabel}>{m.label}</Text>
                </View>
              ))}
            </View>

            {detailRows.map((row, i) => (
              <View
                key={row.label}
                style={[styles.detailRow, i === detailRows.length - 1 && styles.detailRowLast]}
              >
                <View style={styles.detailIcon}>
                  <Ionicons name={row.icon} size={16} color={Colors.secondary} />
                </View>
                <Text style={styles.detailLabel}>{row.label}</Text>
                <Text style={styles.detailValue} numberOfLines={2}>
                  {row.value}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Actions</Text>
        <View style={styles.actionGrid}>
          {[0, 1].map(row => (
            <View key={row} style={styles.actionRow}>
              {actions.slice(row * 2, row * 2 + 2).map(action => (
                <TouchableOpacity
                  key={action.label}
                  style={[styles.actionBtn, { backgroundColor: action.bg }]}
                  onPress={action.onPress}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={action.label}
                >
                  <View style={[styles.actionIconWrap, { backgroundColor: Colors.white }]}>
                    <Ionicons name={action.icon} size={22} color={action.color} />
                  </View>
                  <Text style={[styles.actionText, { color: action.color }]}>{action.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  profileCard: {
    backgroundColor: Colors.white,
    margin: Spacing.lg,
    borderRadius: Radius.lg,
    padding: 24,
    alignItems: 'center',
    ...Shadow.md,
  },
  clientName: {
    fontSize: 20,
    fontFamily: FontFamily.extraBold,
    color: Colors.textDark,
    textAlign: 'center',
  },
  contactBlock: {
    marginTop: 8,
    alignItems: 'center',
    gap: 2,
  },
  contactLine: {
    fontSize: 13,
    color: Colors.textLight,
    fontFamily: FontFamily.medium,
    textAlign: 'center',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  goalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.secondaryLight,
    borderRadius: Radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    maxWidth: '100%',
  },
  goalChipText: { color: Colors.secondary, fontSize: 12, fontFamily: FontFamily.bold },
  bmiBadge: {
    borderRadius: Radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bmiBadgeValue: { fontSize: 13, fontFamily: FontFamily.extraBold },
  bmiBadgeLabel: { fontSize: 11, fontFamily: FontFamily.semibold },
  statusBadge: {
    backgroundColor: Colors.accentLight,
    borderRadius: Radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusText: { color: Colors.accent, fontSize: 12, fontFamily: FontFamily.bold },
  section: { marginHorizontal: Spacing.lg, marginBottom: Spacing.md },
  sectionTitle: {
    fontSize: 15,
    fontFamily: FontFamily.bold,
    color: Colors.textDark,
    marginBottom: 10,
  },
  infoCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    ...Shadow.md,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  metricCell: {
    width: '50%',
    paddingVertical: 16,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  metricCellLeft: {
    borderRightWidth: 1,
    borderRightColor: Colors.border,
  },
  metricCellTop: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  metricValue: { fontSize: 20, fontFamily: FontFamily.extraBold, color: Colors.textDark },
  metricLabel: {
    fontSize: 11,
    color: Colors.textLight,
    marginTop: 4,
    fontFamily: FontFamily.semibold,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  detailRowLast: { borderBottomWidth: 0 },
  detailIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: Colors.secondaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  detailLabel: { flex: 1, fontSize: 13, color: Colors.textLight, fontFamily: FontFamily.medium },
  detailValue: {
    fontSize: 13,
    fontFamily: FontFamily.bold,
    color: Colors.textDark,
    maxWidth: '55%',
    textAlign: 'right',
  },
  empty: { fontSize: 13, color: Colors.textLight, marginTop: 6 },
  actionGrid: { gap: 10 },
  actionRow: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    flex: 1,
    borderRadius: Radius.md,
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 10,
    minHeight: 96,
    justifyContent: 'center',
  },
  actionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.sm,
  },
  actionText: { fontSize: 13, fontFamily: FontFamily.bold, textAlign: 'center' },
});
