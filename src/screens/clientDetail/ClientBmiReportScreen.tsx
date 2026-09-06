import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontFamily, Radius, Shadow, Spacing } from '../../constants/theme';
import ScreenHeader from '../../components/ScreenHeader';
import ReloadState from '../../components/ReloadState';
import PdfDownloadShareButton from '../../components/PdfDownloadShareButton';
import { getBmiReport } from '../../api/clientApi';
import { getErrorMessage } from '../../api/client';
import { queryKeys } from '../../api/queryKeys';
import { useRefreshControl, refreshControlTheme } from '../../hooks/useRefreshControl';
import { getCurrentCoachCode } from '../../auth/session';
import { getBmiCategory, resolveDisplayBmi } from '../../utils/bmi';
import {
  bmiReportPdfQuery,
  downloadAndSharePdf,
  PDF_GENERATE_FAILED_MESSAGE,
} from '../../utils/pdfShare';
import type { ClientsStackScreenProps } from '../../types/navigation';
import { navigateBack } from '../../utils/navigationBack';

export default function ClientBmiReportScreen({
  navigation,
  route,
}: ClientsStackScreenProps<'ClientBmiReport'>) {
  const insets = useSafeAreaInsets();
  const client = route.params?.client;
  const returnTo = route.params?.returnTo;
  const ids = { clientCode: client?.clientCode, assessmentCode: client?.assessmentCode };
  const [preparingPdf, setPreparingPdf] = useState(false);

  const reportQuery = useQuery({
    queryKey: queryKeys.bmiReport(ids.clientCode, ids.assessmentCode),
    queryFn: () => getBmiReport(ids),
    enabled: !!ids.clientCode,
  });
  const refreshControl = useRefreshControl(reportQuery);
  const report = reportQuery.data;

  const errorMessage =
    reportQuery.isError && !report
      ? getErrorMessage(reportQuery.error, 'Could not load BMI report.')
      : null;

  const weightDelta = report?.weightDelta;
  const showWeightDelta =
    typeof weightDelta === 'number' && Number.isFinite(weightDelta) && weightDelta !== 0;
  const needsToLose = showWeightDelta && weightDelta > 0;
  const history = report?.history ?? [];
  const current = report?.current;
  const currentBmi = resolveDisplayBmi(current);
  const bodyFatPct =
    typeof current?.bodyFatPct === 'number' && current.bodyFatPct > 0 ? current.bodyFatPct : null;
  const visceralFat =
    typeof current?.visceralFat === 'number' && current.visceralFat > 0
      ? current.visceralFat
      : null;
  const skeletalMusclePct =
    typeof current?.skeletalMusclePct === 'number' && current.skeletalMusclePct > 0
      ? current.skeletalMusclePct
      : null;
  const restingMetabolism =
    typeof current?.restingMetabolism === 'number' && current.restingMetabolism > 0
      ? current.restingMetabolism
      : null;
  const bodyAge =
    typeof current?.bodyAge === 'number' && current.bodyAge > 0 ? current.bodyAge : null;

  const sharePdf = async () => {
    const coachCode = getCurrentCoachCode();
    if (!coachCode || !ids.clientCode) {
      Alert.alert('Cannot download PDF', 'Client information is missing.');
      return;
    }
    setPreparingPdf(true);
    try {
      await downloadAndSharePdf(
        '/v{version}/Client/bmi-report-pdf',
        bmiReportPdfQuery({
          coachCode,
          clientCode: ids.clientCode,
          assessmentCode: ids.assessmentCode,
        }),
        'bmi-report.pdf',
      );
    } catch (err) {
      Alert.alert('PDF unavailable', getErrorMessage(err, PDF_GENERATE_FAILED_MESSAGE));
    } finally {
      setPreparingPdf(false);
    }
  };

  const pdfButton = (
    <PdfDownloadShareButton
      variant="headerOnDark"
      onPress={sharePdf}
      loading={preparingPdf}
      disabled={!report}
    />
  );

  const primaryStats = report
    ? [
        {
          value: currentBmi != null ? currentBmi.toFixed(1) : '-',
          label: 'Current BMI',
          emphasize: true as const,
          category: getBmiCategory(currentBmi),
        },
        { value: bodyFatPct != null ? `${bodyFatPct.toFixed(1)}%` : '-', label: 'Body Fat %' },
        { value: visceralFat != null ? String(visceralFat) : '-', label: 'Visceral Fat' },
        {
          value: skeletalMusclePct != null ? `${skeletalMusclePct.toFixed(1)}%` : '-',
          label: 'Skeletal Muscle %',
        },
        {
          value: restingMetabolism != null ? `${restingMetabolism} kcal` : '-',
          label: 'Resting Metabolism',
        },
        { value: bodyAge != null ? `${bodyAge} yrs` : '-', label: 'Body Age' },
      ]
    : [];
  const historyRows = history.filter(row => !isSameAsCurrent(row, current));

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="BMI Report"
        onBack={() => navigateBack(navigation, returnTo)}
        right={pdfButton}
        showHome={false}
      />

      <ScrollView
        style={styles.body}
        contentContainerStyle={[styles.bodyContent, { paddingBottom: Math.max(insets.bottom, 28) }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshControl.refreshing}
            onRefresh={refreshControl.onRefresh}
            {...refreshControlTheme}
          />
        }
      >
        {errorMessage ? (
          <ReloadState
            title="Couldn't load report"
            message={errorMessage}
            onRetry={() => void reportQuery.refetch()}
            loading={reportQuery.isFetching}
          />
        ) : !report ? (
          <View style={styles.stateCard}>
            <ActivityIndicator color={Colors.secondary} />
            <Text style={styles.stateMessage}>Loading BMI report…</Text>
          </View>
        ) : (
          <>
            <View style={styles.patientCard}>
              <View style={styles.patientAvatar}>
                <Ionicons name="person" size={22} color={Colors.white} />
              </View>
              <View style={styles.patientCopy}>
                <Text style={styles.patientName}>{report.client.clientName || client?.name}</Text>
                <Text style={styles.patientMeta}>
                  {report.client.age ?? '-'} yrs ·{' '}
                  {report.client.gender === 'M'
                    ? 'Male'
                    : report.client.gender === 'F'
                      ? 'Female'
                      : '-'}
                  {report.client.location ? ` · ${report.client.location}` : ''}
                </Text>
                <Text style={styles.patientDate}>
                  Assessed {current?.assessmentDate || report.reportDate || '-'}
                </Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Summary</Text>
            <View style={styles.statsGrid}>
              {primaryStats.map(stat => {
                const emphasize = 'emphasize' in stat && stat.emphasize;
                const category = 'category' in stat ? stat.category : null;
                return (
                  <View key={stat.label} style={[styles.statCard, emphasize && styles.statCardBmi]}>
                    {emphasize ? <Text style={styles.statBmiCaption}>BMI</Text> : null}
                    <Text
                      style={[styles.statValue, emphasize && styles.statValueBmi]}
                      numberOfLines={2}
                    >
                      {stat.value}
                    </Text>
                    {emphasize && category ? (
                      <View style={[styles.statCategoryBadge, { backgroundColor: category.bg }]}>
                        <Text style={[styles.statCategoryText, { color: category.color }]}>
                          {category.label}
                        </Text>
                      </View>
                    ) : (
                      <Text style={[styles.statLabel, emphasize && styles.statLabelBmi]}>
                        {stat.label}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>

            {showWeightDelta ? (
              <View style={styles.deltaCard}>
                <View style={styles.deltaIconWrap}>
                  <Ionicons
                    name={needsToLose ? 'trending-down' : 'trending-up'}
                    size={18}
                    color={Colors.accent}
                  />
                </View>
                <View style={styles.deltaCopy}>
                  <Text style={styles.deltaValue}>
                    {needsToLose ? '−' : '+'}
                    {Math.abs(weightDelta).toFixed(1)} kg
                  </Text>
                  <Text style={styles.deltaLabel}>
                    {needsToLose ? 'To lose toward target' : 'To gain toward target'}
                  </Text>
                </View>
              </View>
            ) : null}

            <Text style={styles.sectionTitle}>Measurement History</Text>
            <View style={styles.historyList}>
              {historyRows.length === 0 ? (
                <View style={styles.emptyHistory}>
                  <Ionicons name="time-outline" size={22} color={Colors.textLight} />
                  <Text style={styles.noHistoryTitle}>No past measurements</Text>
                  <Text style={styles.noHistory}>
                    Future BMI check-ups for this client will appear here.
                  </Text>
                </View>
              ) : (
                historyRows.map((row, i) => (
                  <HistoryCard
                    key={`${row.assessmentDate || 'row'}-${i}`}
                    row={row}
                    defaultExpanded={i === 0}
                  />
                ))
              )}
            </View>

            <PdfDownloadShareButton
              variant="primary"
              onPress={sharePdf}
              loading={preparingPdf}
              style={styles.pdfCta}
            />
          </>
        )}
      </ScrollView>
    </View>
  );
}

function metricValue(value: number | undefined, suffix = ''): string {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? `${value}${suffix}`
    : '-';
}

function metricValue1(value: number | undefined, suffix = ''): string {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? `${value.toFixed(1)}${suffix}`
    : '-';
}

type HistoryRow = {
  assessmentDate?: string;
  height?: number;
  weight?: number;
  bmi?: number;
  bodyFatPct?: number;
  visceralFat?: number;
  skeletalMusclePct?: number;
  bodyAge?: number;
  restingMetabolism?: number;
};

function isSameAsCurrent(row: HistoryRow, current?: HistoryRow) {
  if (!current) return false;
  const sameDate = (row.assessmentDate || '') === (current.assessmentDate || '');
  const sameBmi = resolveDisplayBmi(row) === resolveDisplayBmi(current);
  const sameWeight = (row.weight ?? null) === (current.weight ?? null);
  const sameHeight = (row.height ?? null) === (current.height ?? null);
  return sameDate && sameBmi && sameWeight && sameHeight;
}

function HistoryCard({
  row,
  defaultExpanded = false,
}: {
  row: HistoryRow;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const bmi = resolveDisplayBmi(row);
  const category = getBmiCategory(bmi);
  const bmiLabel = bmi != null ? bmi.toFixed(1) : '-';
  const detailMetrics = [
    { label: 'BMI', value: bmiLabel, emphasize: true },
    { label: 'Body Fat', value: metricValue1(row.bodyFatPct, '%'), emphasize: false },
    { label: 'Visceral Fat', value: metricValue(row.visceralFat), emphasize: false },
    { label: 'Skeletal Muscle', value: metricValue1(row.skeletalMusclePct, '%'), emphasize: false },
    {
      label: 'Resting Metabolism',
      value: metricValue(row.restingMetabolism, ' kcal'),
      emphasize: false,
    },
    { label: 'Body Age', value: metricValue(row.bodyAge, ' yrs'), emphasize: false },
  ];
  const metricRows = [
    detailMetrics.slice(0, 2),
    detailMetrics.slice(2, 4),
    detailMetrics.slice(4, 6),
  ];

  return (
    <View style={styles.historyCard}>
      <Pressable
        onPress={() => setExpanded(open => !open)}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${row.assessmentDate || 'Measurement'}, BMI ${bmiLabel}${
          category ? `, ${category.label}` : ''
        }`}
        style={({ pressed }) => [styles.historySummary, pressed && styles.historySummaryPressed]}
      >
        <View style={styles.historySummaryMain}>
          <Text style={styles.historyDate}>{row.assessmentDate || '-'}</Text>
          <View
            style={[
              styles.historyBmiChip,
              { backgroundColor: category?.bg ?? Colors.secondaryLight },
            ]}
          >
            <Text style={[styles.historyBmiValue, { color: category?.color ?? Colors.secondary }]}>
              {bmiLabel}
            </Text>
            {category ? (
              <Text style={[styles.historyBmiCategory, { color: category.color }]}>
                {category.label}
              </Text>
            ) : null}
          </View>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={Colors.textLight}
        />
      </Pressable>

      {expanded ? (
        <View style={styles.historyMetricsGrid}>
          {metricRows.map((pair, rowIndex) => (
            <View key={rowIndex} style={styles.historyMetricsRow}>
              {pair.map(metric => (
                <View
                  key={metric.label}
                  style={[
                    styles.historyMetricCell,
                    metric.emphasize && styles.historyMetricCellBmi,
                  ]}
                >
                  <Text
                    style={[
                      styles.historyMetricLabel,
                      metric.emphasize && styles.historyMetricLabelBmi,
                    ]}
                    numberOfLines={1}
                  >
                    {metric.label}
                  </Text>
                  <Text
                    style={[
                      styles.historyMetricValue,
                      metric.emphasize && styles.historyMetricValueBmi,
                    ]}
                    numberOfLines={1}
                  >
                    {metric.value}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  body: { flex: 1 },
  bodyContent: { padding: 20 },
  stateCard: {
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: 28,
    marginTop: 24,
    ...Shadow.sm,
  },
  stateMessage: { fontSize: 13, color: Colors.textLight, textAlign: 'center', lineHeight: 18 },
  patientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: 16,
    marginBottom: 20,
    ...Shadow.md,
  },
  patientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  patientCopy: { flex: 1 },
  patientName: { fontSize: 17, fontWeight: '800', color: Colors.textDark },
  patientMeta: { fontSize: 13, color: Colors.textLight, marginTop: 3 },
  patientDate: { fontSize: 12, color: Colors.textLight, marginTop: 6 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.textDark, marginBottom: 10 },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  statCard: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    ...Shadow.sm,
  },
  statCardBmi: {
    backgroundColor: Colors.secondary,
    ...Shadow.md,
    justifyContent: 'center',
  },
  statBmiCaption: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 11,
    fontFamily: FontFamily.semibold,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.secondary,
    textAlign: 'center',
  },
  statValueBmi: {
    fontSize: 28,
    fontFamily: FontFamily.extraBold,
    color: Colors.white,
  },
  statLabel: { fontSize: 11, color: Colors.textLight, marginTop: 4, textAlign: 'center' },
  statLabelBmi: { color: 'rgba(255,255,255,0.75)' },
  statCategoryBadge: {
    alignSelf: 'center',
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 8,
  },
  statCategoryText: { fontSize: 11, fontFamily: FontFamily.bold },
  deltaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.accentLight,
    borderRadius: Radius.md,
    padding: 14,
    marginBottom: 20,
  },
  deltaIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deltaCopy: { flex: 1 },
  deltaValue: { fontSize: 18, fontWeight: '800', color: Colors.textDark },
  deltaLabel: { fontSize: 12, color: Colors.textLight, marginTop: 2 },
  historyList: { gap: Spacing.xs },
  historyCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 10,
    ...Shadow.sm,
  },
  historySummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  historySummaryPressed: { opacity: 0.72 },
  historySummaryMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  historyDate: {
    fontSize: 12,
    fontFamily: FontFamily.bold,
    color: Colors.textDark,
  },
  historyBmiChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  historyBmiValue: { fontSize: 13, fontFamily: FontFamily.extraBold },
  historyBmiCategory: { fontSize: 11, fontFamily: FontFamily.semibold },
  historyMetricsGrid: {
    gap: Spacing.xs,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  historyMetricsRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  historyMetricCell: {
    flex: 1,
    minHeight: 40,
    justifyContent: 'center',
    backgroundColor: Colors.background,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 5,
  },
  historyMetricCellBmi: {
    backgroundColor: Colors.secondaryLight,
  },
  historyMetricLabel: {
    fontSize: 9,
    fontFamily: FontFamily.medium,
    color: Colors.textLight,
    marginBottom: 1,
  },
  historyMetricLabelBmi: { color: Colors.secondaryDark },
  historyMetricValue: {
    fontSize: 12,
    fontFamily: FontFamily.bold,
    color: Colors.textDark,
  },
  historyMetricValueBmi: { color: Colors.secondary },
  emptyHistory: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    gap: 6,
  },
  noHistoryTitle: {
    fontSize: 13,
    fontFamily: FontFamily.bold,
    color: Colors.textDark,
    marginTop: 4,
  },
  noHistory: { fontSize: 12, color: Colors.textLight, textAlign: 'center', lineHeight: 17 },
  pdfCta: { marginTop: Spacing.xs },
});
