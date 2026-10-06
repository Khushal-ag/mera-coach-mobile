import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
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
  IconSize,
  PressOpacity,
  Radius,
  ScreenPad,
  Shadow,
  Spacing,
  bodyFont,
  buttonStyles,
  headingFont,
} from '../../../constants/theme';
import { BrandImages } from '../../../constants/images';
import WaveScreenHeader from '../../../components/WaveScreenHeader';
import ClientAvatar from '../../../components/ClientAvatar';
import ProgressPhotos, { type ProgressPhotosHandle } from '../../../components/ProgressPhotos';
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
import { toDisplayDob } from '../../../utils/validation';
import type { ClientsStackScreenProps } from '../../../types/navigation';
import type { IoniconName } from '../../../types/icons';
import { navigateBack, navigateToDashboard } from '../../../utils/navigationBack';

const Tone = {
  page: '#F5FEFD',
  ink: '#102B24',
  meta: '#707875',
  chevron: '#8E9492',
  line: '#E7EFEC',
  add: '#E85A14',
  pillBg: '#DFF4EE',
  pillText: '#156854',
  ageTile: '#E0F5EE',
  ageWell: '#2BA47F',
  heightTile: '#ECE8FE',
  heightWell: '#7A6FE6',
  weightTile: '#FEF1E0',
  weightWell: '#F77030',
  bmiTile: '#E0F5F8',
  bmiWell: '#2DAEAE',
  goalWell: '#E3F6EF',
  goalIcon: '#0D6B56',
  dietWell: '#ECE8FE',
  dietIcon: '#6A5CC4',
  activityWell: '#E0F6F8',
  activityIcon: '#0C6D5A',
  checkupTile: '#FFF4E0',
  checkupWell: '#F9BD3F',
  reportTile: '#FFEDE9',
  reportWell: '#F4724E',
  planTile: '#EDF7EE',
  planWell: '#41B078',
  feedbackTile: '#F3EFFD',
  feedbackWell: '#9779D9',
} as const;

type ProfileMark = IoniconName;

interface MetricCell {
  label: string;
  value: string;
  tile: string;
  well: string;
  icon: ProfileMark;
}

interface DetailRow {
  label: string;
  well: string;
  iconColor: string;
  icon: ProfileMark;
  value: string;
}

interface ActionItem {
  label: string;
  tile: string;
  well: string;
  icon: ProfileMark;
  onPress: () => void;
}

function metricText(value: number | null | undefined, suffix: string): string {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return '-';
  return `${value} ${suffix}`;
}

function IconWell({
  backgroundColor,
  size,
  children,
}: {
  backgroundColor: string;
  size: number;
  children: React.ReactNode;
}) {
  return (
    <View
      style={[
        styles.iconWell,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor,
        },
      ]}
    >
      {children}
    </View>
  );
}

export default function ClientDetailScreen({
  navigation,
  route,
}: ClientsStackScreenProps<'ClientDetail'>) {
  const client = route.params?.client || { name: 'Client' };
  const returnTo = route.params?.returnTo;
  const photosRef = useRef<ProgressPhotosHandle>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const onPhotoUploading = useCallback((uploading: boolean) => {
    setPhotoUploading(uploading);
  }, []);
  const addProgressPhoto = useCallback(() => {
    void photosRef.current?.pickAndUpload();
  }, []);

  const detailQuery = useQuery({
    queryKey: queryKeys.clientDetail(client.clientCode, client.assessmentCode),
    queryFn: () =>
      getClientDetail({ clientCode: client.clientCode, assessmentCode: client.assessmentCode }),
    enabled: !!client.clientCode,
  });
  const refreshControl = useRefreshControl(detailQuery);

  const errorMessage =
    detailQuery.isError && !detailQuery.data
      ? getErrorMessage(detailQuery.error, 'Could not load client details. Pull down to try again.')
      : null;

  const goalOptions = useParamMasterOptions(PARAM_CODES.primaryGoal, PRIMARY_GOALS);
  const dietOptions = useParamMasterOptions(PARAM_CODES.foodPreference, FOOD_PREFERENCES);
  const activityOptions = useParamMasterOptions(
    PARAM_CODES.physicalActivity,
    PHYSICAL_ACTIVITY_LEVELS,
  );

  const detail = detailQuery.data;
  const bmi = detail ? getBmi(detail.height ?? '', detail.weight ?? '') : null;
  const bmiCategory = getBmiCategory(bmi);
  const displayName = (detail?.clientName || client.name || '').trim() || 'Client';
  const mobile = (detail?.mobileNo ?? client.mobileNo ?? '').trim();
  const listedCheckup = (client.lastCheckupDate ?? '').trim();
  const checkupDate =
    toDisplayDob(listedCheckup) || listedCheckup || toDisplayDob(detail?.assessmentDate ?? '');

  const metrics = useMemo<MetricCell[]>(() => {
    if (!detail) return [];
    const bmiValue = getBmi(detail.height ?? '', detail.weight ?? '');
    const cells: MetricCell[] = [
      {
        label: 'Age',
        value: metricText(detail.age, 'yrs'),
        tile: Tone.ageTile,
        well: Tone.ageWell,
        icon: 'calendar-outline',
      },
      {
        label: 'Height',
        value: metricText(detail.height, 'cm'),
        tile: Tone.heightTile,
        well: Tone.heightWell,
        icon: 'resize-outline',
      },
      {
        label: 'Weight',
        value: metricText(detail.weight, 'kg'),
        tile: Tone.weightTile,
        well: Tone.weightWell,
        icon: 'scale-outline',
      },
      {
        label: 'BMI',
        value: bmiValue != null ? bmiValue.toFixed(1) : '-',
        tile: Tone.bmiTile,
        well: Tone.bmiWell,
        icon: 'speedometer-outline',
      },
    ];
    return cells.filter(cell => cell.value !== '-');
  }, [detail]);

  const detailRows = useMemo<DetailRow[]>(() => {
    if (!detail) return [];
    const rows: DetailRow[] = [
      {
        label: 'Goal',
        well: Tone.goalWell,
        iconColor: Tone.goalIcon,
        icon: 'flag-outline',
        value: resolveMasterLabel(detail.primaryGoal, goalOptions),
      },
      {
        label: 'Diet Type',
        well: Tone.dietWell,
        iconColor: Tone.dietIcon,
        icon: 'restaurant-outline',
        value: resolveMasterLabel(detail.foodPreference, dietOptions),
      },
      {
        label: 'Activity',
        well: Tone.activityWell,
        iconColor: Tone.activityIcon,
        icon: 'walk-outline',
        value: resolveMasterLabel(detail.physicalActivity, activityOptions),
      },
    ];
    return rows.map(row => ({ ...row, value: row.value || '-' }));
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
      clientName: displayName,
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
      tile: Tone.checkupTile,
      well: Tone.checkupWell,
      icon: 'clipboard-outline',
      onPress: () => navigation.navigate('ClientBmi', { client }),
    },
    {
      label: 'BMI Report',
      tile: Tone.reportTile,
      well: Tone.reportWell,
      icon: 'document-text-outline',
      onPress: () => navigation.navigate('ClientBmiReport', { client }),
    },
    {
      label: 'Diet Plan',
      tile: Tone.planTile,
      well: Tone.planWell,
      icon: 'reader-outline',
      onPress: () => navigation.navigate('ClientDietPlan', { client }),
    },
    {
      label: 'Ask for feedback',
      tile: Tone.feedbackTile,
      well: Tone.feedbackWell,
      icon: 'chatbubble-ellipses-outline',
      onPress: () => {
        void askForFeedback();
      },
    },
  ];

  return (
    <View style={styles.container}>
      <WaveScreenHeader
        title="Client Profile"
        onBack={() => navigateBack(navigation, returnTo)}
        onHome={() => navigateToDashboard(navigation)}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
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
          <ClientAvatar
            clientCode={client.clientCode}
            size={68}
            allowUpload
            style={styles.avatar}
          />
          <View style={styles.profileCopy}>
            <Text style={styles.clientName} numberOfLines={2}>
              {displayName}
            </Text>
            {checkupDate ? (
              <Text style={styles.metaLine} numberOfLines={1}>
                Last checkup-up {checkupDate}
              </Text>
            ) : null}
            {mobile ? (
              <Text style={styles.metaLine} numberOfLines={1}>
                {mobile}
              </Text>
            ) : null}
            {bmi != null && bmiCategory ? (
              <View style={styles.bmiPill}>
                <View style={styles.bmiDot} />
                <Text style={styles.bmiPillText} numberOfLines={1}>
                  {bmi.toFixed(1)} {bmiCategory.label.toUpperCase()}
                </Text>
              </View>
            ) : null}
          </View>
          <Image
            source={BrandImages.clientProfileBody}
            style={styles.bodyArt}
            resizeMode="contain"
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        </View>

        <View style={styles.section}>
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
          ) : !detail ? (
            <EmptyState
              icon="document-text-outline"
              title="Details unavailable"
              message="Client details could not be loaded for this profile."
              style={styles.emptyBox}
            />
          ) : (
            <View style={styles.infoCard}>
              {metrics.length > 0 ? (
                <View style={styles.metricsGrid}>
                  {metrics.map(cell => (
                    <View
                      key={cell.label}
                      style={[styles.metricCell, { backgroundColor: cell.tile }]}
                    >
                      <IconWell backgroundColor={cell.well} size={40}>
                        <Ionicons name={cell.icon} size={IconSize.lg} color={Colors.white} />
                      </IconWell>
                      <View style={styles.metricCopy}>
                        <Text style={styles.metricValue} numberOfLines={1}>
                          {cell.value}
                        </Text>
                        <Text style={styles.metricLabel}>{cell.label}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : null}

              {detailRows.map((row, index) => (
                <View
                  key={row.label}
                  style={[
                    styles.detailRow,
                    index === 0 && metrics.length > 0 && styles.detailRowAfterTiles,
                    index > 0 && styles.detailRowBorder,
                  ]}
                >
                  <IconWell backgroundColor={row.well} size={36}>
                    <Ionicons name={row.icon} size={IconSize.md} color={row.iconColor} />
                  </IconWell>
                  <Text style={styles.detailLabel}>{row.label}</Text>
                  <Text style={styles.detailValue} numberOfLines={2}>
                    {row.value}
                  </Text>
                  <Ionicons
                    name="chevron-forward-outline"
                    size={IconSize.md}
                    color={Tone.chevron}
                    accessibilityElementsHidden
                    importantForAccessibility="no"
                  />
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <View>
              <Text style={styles.sectionTitle}>Actions</Text>
              <View style={styles.sectionUnderline} />
            </View>
            {client.clientCode ? (
              <TouchableOpacity
                style={[styles.addPill, photoUploading && styles.addPillDisabled]}
                onPress={addProgressPhoto}
                disabled={photoUploading}
                activeOpacity={PressOpacity.strong}
                accessibilityRole="button"
                accessibilityLabel="Add progress photo"
              >
                {photoUploading ? (
                  <ActivityIndicator color={Colors.white} size="small" />
                ) : (
                  <>
                    <Ionicons name="camera-outline" size={IconSize.sm} color={Colors.white} />
                    <Text style={styles.addPillText}>Add</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : null}
          </View>
          <View style={styles.actionGrid}>
            {[0, 1].map(rowIndex => (
              <View key={rowIndex} style={styles.actionRow}>
                {actions.slice(rowIndex * 2, rowIndex * 2 + 2).map(action => (
                  <TouchableOpacity
                    key={action.label}
                    style={[styles.actionBtn, { backgroundColor: action.tile }]}
                    onPress={action.onPress}
                    activeOpacity={PressOpacity.strong}
                    accessibilityRole="button"
                    accessibilityLabel={action.label}
                  >
                    <IconWell backgroundColor={action.well} size={34}>
                      <Ionicons name={action.icon} size={IconSize.md} color={Colors.white} />
                    </IconWell>
                    <Text style={styles.actionText} numberOfLines={2}>
                      {action.label}
                    </Text>
                    <Ionicons
                      name="chevron-forward-outline"
                      size={IconSize.md}
                      color={Tone.chevron}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>
        </View>

        {client.clientCode ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Progress Photo</Text>
            <Text style={styles.sectionHint}>
              Add dated Progress photos to track how your client is doing
            </Text>
            <ProgressPhotos
              ref={photosRef}
              clientCode={client.clientCode}
              variant="strip"
              onUploadingChange={onPhotoUploading}
            />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Tone.page },
  scroll: { flex: 1 },
  scrollContent: { paddingTop: Spacing.md, paddingBottom: Spacing.xl },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    marginHorizontal: ScreenPad.horizontal,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.sm,
    paddingLeft: Spacing.sm,
    paddingRight: Spacing.xxs,
    gap: Spacing.xs,
    overflow: 'hidden',
    ...Shadow.md,
  },
  avatar: { marginRight: 0 },
  profileCopy: { flex: 1, minWidth: 0, gap: 2 },
  clientName: {
    fontFamily: headingFont.extraBold,
    fontSize: 18,
    lineHeight: 24,
    color: Tone.ink,
  },
  metaLine: {
    fontFamily: bodyFont.regular,
    fontSize: 12,
    lineHeight: 16,
    color: Tone.meta,
  },
  bmiPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.xxs,
    backgroundColor: Tone.pillBg,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    maxWidth: '100%',
  },
  bmiDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Tone.pillText,
  },
  bmiPillText: {
    flexShrink: 1,
    fontFamily: bodyFont.bold,
    fontSize: 11,
    lineHeight: 14,
    color: Tone.pillText,
  },
  bodyArt: {
    width: 108,
    height: 112,
    flexShrink: 0,
  },
  iconWell: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  section: { marginHorizontal: ScreenPad.horizontal, marginTop: Spacing.md },
  loader: { marginTop: Spacing.sm },
  reload: { paddingVertical: Spacing.lg },
  emptyBox: { flex: 0, paddingVertical: Spacing.lg },
  infoCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.sm,
    ...Shadow.md,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: Spacing.sm,
  },
  metricCell: {
    width: '48.5%',
    minHeight: 76,
    borderRadius: Radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.sm,
  },
  metricCopy: { flex: 1, minWidth: 0 },
  metricValue: {
    fontFamily: headingFont.extraBold,
    fontSize: 16,
    lineHeight: 20,
    color: Tone.ink,
  },
  metricLabel: {
    fontFamily: bodyFont.medium,
    fontSize: 11,
    lineHeight: 14,
    color: Tone.meta,
    marginTop: 1,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.xxs,
  },
  detailRowAfterTiles: {
    marginTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Tone.line,
  },
  detailRowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Tone.line,
  },
  detailLabel: {
    flex: 1,
    fontFamily: bodyFont.semibold,
    fontSize: 14,
    lineHeight: 20,
    color: Tone.ink,
  },
  detailValue: {
    fontFamily: bodyFont.medium,
    fontSize: 14,
    lineHeight: 20,
    color: Tone.ink,
    textAlign: 'right',
    maxWidth: '42%',
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontFamily: headingFont.extraBold,
    fontSize: 20,
    lineHeight: 26,
    color: Tone.ink,
  },
  sectionUnderline: {
    width: 32,
    height: 3,
    borderRadius: 2,
    backgroundColor: Tone.add,
    marginTop: 2,
  },
  sectionHint: {
    fontFamily: bodyFont.regular,
    fontSize: 12,
    lineHeight: 17,
    color: Tone.meta,
    marginTop: 2,
    marginBottom: Spacing.sm,
  },
  addPill: {
    ...buttonStyles.compact,
    backgroundColor: Tone.add,
  },
  addPillDisabled: buttonStyles.disabled,
  addPillText: buttonStyles.compactText,
  actionGrid: { gap: Spacing.sm },
  actionRow: { flexDirection: 'row', gap: Spacing.sm },
  actionBtn: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    minHeight: 57,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs + 2,
  },
  actionText: {
    flex: 1,
    minWidth: 0,
    fontFamily: bodyFont.semibold,
    fontSize: 13,
    lineHeight: 17,
    color: Tone.ink,
  },
});
