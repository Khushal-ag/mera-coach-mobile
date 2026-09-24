import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import {
  Colors,
  FontFamily,
  IconSize,
  PressOpacity,
  Radius,
  ScreenPad,
  Shadow,
  Spacing,
  TouchTarget,
  Typography,
  statusChipStyles,
  headingFont,
} from '../../../constants/theme';
import WaveScreenHeader from '../../../components/WaveScreenHeader';
import ClientAvatar from '../../../components/ClientAvatar';
import ClientStatusChip from '../../../components/ClientStatusChip';
import ProgressPhotos from '../../../components/ProgressPhotos';
import EmptyState from '../../../components/EmptyState';
import ReloadState from '../../../components/ReloadState';
import { getClientDetail } from '../../../api/clientApi';
import { getErrorMessage } from '../../../api/client';
import { resolveMasterLabel } from '../../../api/masterApi';
import { queryKeys } from '../../../api/queryKeys';
import {
  FOOD_PREFERENCES,
  PARAM_CODES,
  PHYSICAL_ACTIVITY_LEVELS,
  PRIMARY_GOALS,
} from '../../../data/lifestyleOptions';
import { useParamMasterOptions } from '../../../hooks/useParamOptions';
import { useRefreshControl, refreshControlTheme } from '../../../hooks/useRefreshControl';
import { getCurrentCoachCode, getCurrentCoachName } from '../../../auth/session';
import { getBmi, getBmiCategory } from '../../../utils/bmi';
import {
  buildFeedbackSmsBody,
  buildFeedbackWebUrl,
  isValidSmsPhone,
  openFeedbackSms,
} from '../../../utils/feedbackSms';
import { lastCheckupLabel } from '../../../utils/recheckup';
import type { ClientsStackScreenProps } from '../../../types/navigation';
import type { IoniconName } from '../../../types/icons';
import { navigateBack } from '../../../utils/navigationBack';

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

  const askForFeedback = async () => {
    if (!isValidSmsPhone(mobile)) {
      Alert.alert(
        'Mobile required',
        'Add a valid mobile number for this client before asking for feedback.',
      );
      return;
    }
    const coachCode = getCurrentCoachCode()?.trim() ?? '';
    const clientCode = (client.clientCode ?? '').trim();
    if (!coachCode || !clientCode) {
      Alert.alert(
        'Unable to send',
        'Coach or client id is missing. Pull to refresh and try again.',
      );
      return;
    }
    const feedbackUrl = buildFeedbackWebUrl({ coachCode, clientCode });
    if (!feedbackUrl) {
      Alert.alert(
        'Feedback link unavailable',
        'Coach or client id is missing, so the feedback link could not be built.',
      );
      return;
    }
    const body = buildFeedbackSmsBody({
      clientName: client.name,
      coachName: getCurrentCoachName(),
      feedbackUrl,
    });
    try {
      await openFeedbackSms({ phone: mobile, body });
    } catch (err) {
      Alert.alert(
        'Could not open SMS',
        getErrorMessage(err, 'Please try again from a phone with SMS.'),
      );
    }
  };

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
    {
      label: 'Ask for feedback',
      icon: 'chatbubble-ellipses-outline',
      color: Colors.secondaryDark,
      bg: Colors.secondaryLight,
      onPress: () => {
        void askForFeedback();
      },
    },
  ];

  return (
    <View style={styles.container}>
      <WaveScreenHeader title="Client Profile" onBack={() => navigateBack(navigation, returnTo)} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: Spacing.lg }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshControl.refreshing}
            onRefresh={refreshControl.onRefresh}
            {...refreshControlTheme}
          />
        }
      >
        <View style={styles.profileCard}>
          <ClientAvatar clientCode={client.clientCode} size={80} allowUpload style={styles.avatar} />
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
                <Ionicons name="trophy-outline" size={IconSize.xs} color={Colors.secondary} />
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
            {client.status ? <ClientStatusChip status={client.status} /> : null}
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
            <ActivityIndicator color={Colors.secondary} style={styles.loader} />
          ) : errorMessage ? (
            <ReloadState
              title="Could not load client details"
              message={errorMessage}
              onRetry={() => void detailQuery.refetch()}
              loading={detailQuery.isFetching}
              style={styles.reload}
            />
          ) : metrics.length === 0 && detailRows.length === 0 ? (
            <EmptyState
              icon="document-text-outline"
              title="Details unavailable"
              message="Client details could not be loaded for this profile."
              style={styles.emptyBox}
            />
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
                    <Ionicons name={row.icon} size={IconSize.sm} color={Colors.secondary} />
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
                    activeOpacity={PressOpacity.strong}
                    accessibilityRole="button"
                    accessibilityLabel={action.label}
                  >
                    <View style={[styles.actionIconWrap, { backgroundColor: Colors.white }]}>
                      <Ionicons name={action.icon} size={IconSize.xl} color={action.color} />
                    </View>
                    <Text style={[styles.actionText, { color: action.color }]}>{action.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  profileCard: {
    backgroundColor: Colors.white,
    marginHorizontal: ScreenPad.horizontal,
    marginTop: Spacing.md,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    ...Shadow.md,
  },
  avatar: { marginRight: 0, marginBottom: Spacing.sm },
  clientName: {
    ...Typography.title,
    fontSize: 20,
    lineHeight: 26,
    fontFamily: headingFont.extraBold,
    textAlign: 'center',
  },
  contactBlock: {
    marginTop: Spacing.xs,
    alignItems: 'center',
    gap: 2,
  },
  contactLine: {
    ...Typography.label,
    color: Colors.textLight,
    fontFamily: FontFamily.medium,
    textAlign: 'center',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  goalChip: {
    ...statusChipStyles.base,
    backgroundColor: Colors.secondaryLight,
    maxWidth: '100%',
  },
  goalChipText: {
    ...statusChipStyles.text,
    color: Colors.secondary,
  },
  bmiBadge: {
    ...statusChipStyles.base,
  },
  bmiBadgeValue: { fontSize: 13, fontFamily: FontFamily.extraBold },
  bmiBadgeLabel: { ...Typography.micro, fontFamily: FontFamily.semibold },
  section: { marginHorizontal: ScreenPad.horizontal, marginBottom: Spacing.md },
  sectionTitle: {
    ...Typography.section,
    marginBottom: Spacing.sm - 2,
  },
  loader: { marginTop: Spacing.sm },
  reload: { paddingVertical: Spacing.lg },
  infoCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    ...Shadow.md,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  metricCell: {
    width: '50%',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm + 2,
    alignItems: 'center',
  },
  metricCellLeft: {
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: Colors.border,
  },
  metricCellTop: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  metricValue: {
    fontSize: 20,
    lineHeight: 26,
    fontFamily: headingFont.extraBold,
    color: Colors.textDark,
  },
  metricLabel: {
    ...Typography.micro,
    fontFamily: FontFamily.semibold,
    marginTop: Spacing.xxs,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  detailRowLast: { borderBottomWidth: 0 },
  detailIcon: {
    width: 30,
    height: 30,
    borderRadius: Radius.xs,
    backgroundColor: Colors.secondaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm - 2,
  },
  detailLabel: {
    flex: 1,
    ...Typography.label,
    color: Colors.textLight,
    fontFamily: FontFamily.medium,
  },
  detailValue: {
    ...Typography.label,
    fontFamily: FontFamily.bold,
    color: Colors.textDark,
    maxWidth: '55%',
    textAlign: 'right',
  },
  emptyBox: { flex: 0, paddingVertical: Spacing.lg },
  actionGrid: { gap: Spacing.sm - 2 },
  actionRow: { flexDirection: 'row', gap: Spacing.sm - 2 },
  actionBtn: {
    flex: 1,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md + 2,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
    gap: Spacing.sm - 2,
    minHeight: 96,
    justifyContent: 'center',
  },
  actionIconWrap: {
    width: TouchTarget.icon,
    height: TouchTarget.icon,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.sm,
  },
  actionText: {
    ...Typography.label,
    fontFamily: FontFamily.bold,
    textAlign: 'center',
  },
});
