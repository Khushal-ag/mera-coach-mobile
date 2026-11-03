import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  TouchableOpacity,
  useWindowDimensions,
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
  Typography,
  bodyFont,
  headingFont,
} from '../../../constants/theme';
import { BMI_GAUGE_ARC_ASPECT, BrandImages } from '../../../constants/images';
import WaveScreenHeader from '../../../components/WaveScreenHeader';
import FormErrorBanner from '../../../components/FormErrorBanner';
import ClientAvatar from '../../../components/ClientAvatar';
import ReloadState from '../../../components/ReloadState';
import { getBmiReport } from '../../../api/clientApi';
import { getErrorMessage } from '../../../api/client';
import { queryKeys } from '../../../api/queryKeys';
import { useRefreshControl, refreshControlTheme } from '../../../hooks/useRefreshControl';
import { getCurrentCoachCode } from '../../../auth/session';
import {
  getBmiCategory,
  historyMetricRows,
  readBodyMeasurement,
  resolveDisplayBmi,
} from '../../../utils/bmi';
import {
  bmiReportPdfQuery,
  downloadAndSharePdf,
  PDF_GENERATE_FAILED_MESSAGE,
  PDF_PATH,
} from '../../../utils/pdfShare';
import type { ClientsStackScreenProps } from '../../../types/navigation';
import { navigateBack, navigateToDashboard } from '../../../utils/navigationBack';

const Tone = {
  page: '#F5FEFD',
  ink: '#102B24',
  meta: '#707875',
  muted: '#64726F',
  mint: '#ECF7F1',
  rowMint: '#E7F6EF',
  rowYellow: '#FFF3C9',
  cream: '#F7F1E3',
  gold: '#E09628',
  goldDeep: '#D5891D',
  mintLabel: '#1A4036',
  mintValue: '#123C32',
  pillYellow: '#F8E8A4',
  pillYellowText: '#D88D34',
  pillMint: '#E5F4EE',
  pillMintText: '#156854',
  pillOver: '#FDE7C8',
  pillOverText: '#C47A16',
  pillObese: '#F8DCD6',
  pillObeseText: '#A84832',
  historyGreen: '#1A4331',
  historyGold: '#E8A33A',
  historyOver: '#C4892A',
  historyObese: '#A84832',
  collapsedYellow: '#FFF3C9',
  collapsedMint: '#E7F6EF',
  underline: '#F26C2C',
  chevron: '#1F3F32',
} as const;

const SUMMARY_GAP = 12;
const YELLOW_HISTORY_METRICS = new Set(['BMI', 'Skeletal Muscle']);

type HistoryRow = {
  assessmentDate?: string;
  height?: number | string;
  weight?: number | string;
  bmi?: number | string;
  bMI?: number | string;
  bodyFatPct?: number | string;
  bodyFat?: number | string;
  bodyFatPercentage?: number | string;
  visceralFat?: number | string;
  skeletalMusclePct?: number | string;
  skeletalMuscle?: number | string;
  bodyAge?: number | string;
  restingMetabolism?: number | string;
  metrics?: unknown;
  bodyMetrics?: unknown;
  composition?: unknown;
  bodyComposition?: unknown;
  measurement?: unknown;
  details?: unknown;
};

type SummaryTile = { label: string; value: string; unit?: string };

function positiveNumber(value: number | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

function formatDecimal(value: number): string {
  return value.toFixed(1);
}

function formatWhole(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function genderLabel(gender?: string): string | null {
  const value = gender?.trim();
  if (!value) return null;
  const key = value.toLowerCase();
  if (key === 'm' || key === 'male') return 'Male';
  if (key === 'f' || key === 'female') return 'Female';
  return value;
}

function profileMeta(age?: number, gender?: string, place?: string): string | null {
  const parts: string[] = [];
  if (typeof age === 'number' && Number.isFinite(age) && age > 0) parts.push(`${age} yrs`);
  const genderText = genderLabel(gender);
  if (genderText) parts.push(genderText);
  const location = place?.trim();
  if (location) parts.push(location);
  return parts.length > 0 ? parts.join(' - ') : null;
}

function gaugePillTone(label: string): { backgroundColor: string; color: string } {
  if (label === 'Normal') {
    return { backgroundColor: Tone.pillYellow, color: Tone.pillYellowText };
  }
  if (label === 'Overweight') {
    return { backgroundColor: Tone.pillOver, color: Tone.pillOverText };
  }
  if (label === 'Obese') {
    return { backgroundColor: Tone.pillObese, color: Tone.pillObeseText };
  }
  return { backgroundColor: Tone.pillMint, color: Tone.pillMintText };
}

function historyPillColors(
  label: string,
  normalGold: boolean,
): { backgroundColor: string; color: string } {
  if (label === 'Normal' && normalGold) {
    return { backgroundColor: Tone.historyGold, color: Colors.white };
  }
  if (label === 'Overweight') {
    return { backgroundColor: Tone.historyOver, color: Colors.white };
  }
  if (label === 'Obese') {
    return { backgroundColor: Tone.historyObese, color: Colors.white };
  }
  return { backgroundColor: Tone.historyGreen, color: Colors.white };
}

function collapsedSurface(
  index: number,
  categoryLabel?: string,
): { backgroundColor: string; normalGold: boolean } {
  if (categoryLabel === 'Underweight') {
    return { backgroundColor: Tone.collapsedMint, normalGold: false };
  }
  const normalGold = index % 2 === 0 && categoryLabel === 'Normal';
  return {
    backgroundColor: normalGold ? Tone.collapsedYellow : Tone.collapsedMint,
    normalGold,
  };
}

function isSameAsCurrent(row: HistoryRow, current?: HistoryRow) {
  if (!current) return false;
  const left = readBodyMeasurement(row);
  const right = readBodyMeasurement(current);
  const sameDate = (left.assessmentDate || '') === (right.assessmentDate || '');
  const sameBmi = resolveDisplayBmi(left) === resolveDisplayBmi(right);
  const sameWeight = (left.weight ?? null) === (right.weight ?? null);
  const sameHeight = (left.height ?? null) === (right.height ?? null);
  return sameDate && sameBmi && sameWeight && sameHeight;
}

function SectionTitle({ children }: { children: string }) {
  return (
    <View style={styles.sectionHead}>
      <Text style={styles.sectionTitle}>{children}</Text>
      <View style={styles.sectionUnderline} />
    </View>
  );
}

function BmiSummaryGauge({
  width,
  bmi,
  categoryLabel,
}: {
  width: number;
  bmi: number;
  categoryLabel: string | null;
}) {
  const arcHeight = width / BMI_GAUGE_ARC_ASPECT;
  const valueSize = Math.min(40, Math.max(26, Math.round(width * 0.16)));
  const pillTone = categoryLabel ? gaugePillTone(categoryLabel) : null;

  return (
    <View
      style={[styles.gauge, { width }]}
      accessibilityRole="image"
      accessibilityLabel={
        categoryLabel ? `${formatDecimal(bmi)} BMI, ${categoryLabel}` : `${formatDecimal(bmi)} BMI`
      }
    >
      <View style={[styles.arcBox, { width, height: arcHeight }]}>
        <Image
          source={BrandImages.bmiGaugeArc}
          style={{ width, height: arcHeight }}
          resizeMode="contain"
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
        <View
          style={[styles.gaugeReadout, { bottom: Math.round(arcHeight * 0.02) }]}
          pointerEvents="none"
        >
          <Text
            style={[
              styles.gaugeValue,
              { fontSize: valueSize, lineHeight: Math.round(valueSize * 1.12) },
            ]}
            numberOfLines={1}
          >
            {formatDecimal(bmi)}
          </Text>
          <Text style={styles.gaugeCaption}>BMI</Text>
        </View>
      </View>
      {categoryLabel && pillTone ? (
        <View style={[styles.gaugePill, { backgroundColor: pillTone.backgroundColor }]}>
          <Text style={[styles.gaugePillText, { color: pillTone.color }]}>{categoryLabel}</Text>
        </View>
      ) : null}
    </View>
  );
}

function HistoryCard({
  row,
  index,
  expanded,
  onToggle,
}: {
  row: HistoryRow;
  index: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const reading = readBodyMeasurement(row);
  const bmi = resolveDisplayBmi(reading);
  const category = getBmiCategory(bmi);
  const metrics = historyMetricRows(row);
  const surface = collapsedSurface(index, category?.label);
  const date = reading.assessmentDate?.trim();
  const dateGold = !expanded && surface.normalGold;
  const pill =
    bmi != null && category
      ? historyPillColors(category.label, !expanded && surface.normalGold)
      : null;

  return (
    <View
      style={[
        expanded ? styles.historyCardOpen : styles.historyCardClosed,
        { backgroundColor: expanded ? Colors.white : surface.backgroundColor },
      ]}
    >
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${date || 'Measurement'}${
          bmi != null ? `, BMI ${formatDecimal(bmi)}` : ''
        }${category ? `, ${category.label}` : ''}`}
        style={({ pressed }) => [styles.historyHead, pressed && styles.historyHeadPressed]}
      >
        {date ? (
          <Text style={[styles.historyDate, dateGold && styles.historyDateGold]}>{date}</Text>
        ) : null}
        {pill && bmi != null && category ? (
          <View style={[styles.historyPill, { backgroundColor: pill.backgroundColor }]}>
            <Text style={[styles.historyPillText, { color: pill.color }]} numberOfLines={1}>
              {formatDecimal(bmi)} {category.label}
            </Text>
          </View>
        ) : null}
        <View style={styles.historySpacer} />
        {expanded ? null : (
          <Ionicons name="chevron-down-outline" size={IconSize.md} color={Tone.chevron} />
        )}
      </Pressable>
      {expanded && metrics.length > 0 ? (
        <View style={styles.historyRows}>
          {metrics.map(metric => {
            const yellow = YELLOW_HISTORY_METRICS.has(metric.label);
            return (
              <View
                key={metric.label}
                style={[
                  styles.historyMetric,
                  yellow ? styles.historyMetricYellow : styles.historyMetricMint,
                ]}
              >
                <Text
                  style={[
                    styles.historyMetricLabel,
                    yellow ? styles.historyMetricLabelGold : styles.historyMetricLabelMint,
                  ]}
                  numberOfLines={1}
                >
                  {metric.label}
                </Text>
                <Text
                  style={[
                    styles.historyMetricValue,
                    yellow ? styles.historyMetricValueGold : styles.historyMetricValueMint,
                  ]}
                  numberOfLines={1}
                >
                  {metric.value}
                </Text>
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

/** Below this width the decorative body art is dropped from the header card. */
const COMPACT_WIDTH = 360;

export default function ClientBmiReportScreen({
  navigation,
  route,
}: ClientsStackScreenProps<'ClientBmiReport'>) {
  const client = route.params?.client;
  const returnTo = route.params?.returnTo;
  const ids = { clientCode: client?.clientCode, assessmentCode: client?.assessmentCode };
  const [preparingPdf, setPreparingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [expandedIndex, setExpandedIndex] = useState(0);
  const { width: screenWidth } = useWindowDimensions();

  const reportQuery = useQuery({
    queryKey: queryKeys.bmiReport(ids.clientCode, ids.assessmentCode),
    queryFn: () => getBmiReport(ids),
    enabled: !!ids.clientCode,
  });
  const refreshControl = useRefreshControl(reportQuery);
  const report = reportQuery.data;

  const missingClient = !ids.clientCode;
  const errorMessage = missingClient
    ? 'Client information is missing. Go back and open this report from the client profile.'
    : reportQuery.isError && !report
      ? getErrorMessage(reportQuery.error, 'Could not load BMI report.')
      : null;

  const weightDelta = report?.weightDelta;
  const showWeightDelta =
    typeof weightDelta === 'number' && Number.isFinite(weightDelta) && weightDelta !== 0;
  const needsToLose = showWeightDelta && weightDelta > 0;
  const history = report?.history ?? [];
  const current = report?.current;
  const currentReading = readBodyMeasurement(current);
  const currentBmi = resolveDisplayBmi(currentReading);
  const bodyFatPct = positiveNumber(currentReading.bodyFatPct);
  const visceralFat = positiveNumber(currentReading.visceralFat);
  const skeletalMusclePct = positiveNumber(currentReading.skeletalMusclePct);
  const restingMetabolism = positiveNumber(currentReading.restingMetabolism);
  const bodyAge = positiveNumber(currentReading.bodyAge);
  const bmiCategory = getBmiCategory(currentBmi);
  const historyRows = history.filter(row => !isSameAsCurrent(row, current));
  const clientName = (report?.client?.clientName || client?.name || '').trim();
  const metaLine = report
    ? profileMeta(report.client?.age ?? client?.age, report.client?.gender, report.client?.location)
    : null;
  const assessed = (currentReading.assessmentDate || report?.reportDate || '').trim();
  const columnWidth = screenWidth - ScreenPad.horizontal * 2;
  const gaugeWidth = Math.min(
    210,
    Math.max(132, Math.round((columnWidth - SUMMARY_GAP) * (bodyFatPct != null ? 0.5 : 0.58))),
  );

  const summaryTiles: SummaryTile[] = [];
  if (visceralFat != null) {
    summaryTiles.push({ label: 'Visceral Fat', value: formatWhole(visceralFat) });
  }
  if (skeletalMusclePct != null) {
    summaryTiles.push({
      label: 'Skeletal Muscle%',
      value: `${formatDecimal(skeletalMusclePct)}%`,
    });
  }
  if (restingMetabolism != null) {
    summaryTiles.push({
      label: 'Resting Metabolism',
      value: formatWhole(restingMetabolism),
      unit: 'kcal',
    });
  }
  if (bodyAge != null) {
    summaryTiles.push({ label: 'Body Age', value: `${formatWhole(bodyAge)} yrs` });
  }

  const sharePdf = async () => {
    if (preparingPdf) return;
    const coachCode = getCurrentCoachCode();
    if (!coachCode || !ids.clientCode) {
      setPdfError('Client information is missing, so this PDF could not be downloaded.');
      return;
    }
    setPdfError(null);
    setPreparingPdf(true);
    try {
      await downloadAndSharePdf(
        PDF_PATH.bmiReport,
        bmiReportPdfQuery({
          coachCode,
          clientCode: ids.clientCode,
          assessmentCode: ids.assessmentCode,
        }),
        'bmi-report.pdf',
      );
    } catch (err) {
      setPdfError(getErrorMessage(err, PDF_GENERATE_FAILED_MESSAGE));
    } finally {
      setPreparingPdf(false);
    }
  };

  return (
    <View style={styles.container}>
      <WaveScreenHeader
        title="BMI Report"
        onBack={() => navigateBack(navigation, returnTo)}
        onHome={() => navigateToDashboard(navigation)}
      />

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshControl.refreshing}
            onRefresh={refreshControl.onRefresh}
            {...refreshControlTheme}
          />
        }
      >
        <FormErrorBanner message={pdfError} />
        <FormErrorBanner message={refreshControl.refreshError} />
        {errorMessage ? (
          <ReloadState
            title="Couldn't load report"
            message={errorMessage}
            onRetry={
              missingClient
                ? () => navigateBack(navigation, returnTo)
                : () => void reportQuery.refetch()
            }
            retryLabel={missingClient ? 'Go back' : undefined}
            loading={reportQuery.isFetching}
            showPullHint={!missingClient}
          />
        ) : !report ? (
          <View style={styles.stateCard}>
            <ActivityIndicator color={Colors.secondary} />
            <Text style={styles.stateMessage}>Loading BMI report…</Text>
          </View>
        ) : (
          <>
            <View style={styles.profileCard}>
              <ClientAvatar clientCode={client?.clientCode} size={64} style={styles.avatar} />
              <View style={styles.profileCopy}>
                {clientName ? (
                  <Text style={styles.clientName} numberOfLines={2}>
                    {clientName}
                  </Text>
                ) : null}
                {metaLine ? (
                  <Text style={styles.metaLine} numberOfLines={2}>
                    {metaLine}
                  </Text>
                ) : null}
                {assessed ? (
                  <View style={styles.assessedRow}>
                    <Text style={styles.assessedText} numberOfLines={2}>
                      ASSESSED {assessed}
                    </Text>
                    <View style={styles.assessedDot} />
                  </View>
                ) : null}
              </View>
              {/* Decorative only; dropped on narrow phones to give the name and date more room. */}
              {screenWidth < COMPACT_WIDTH ? null : (
                <Image
                  source={BrandImages.clientProfileBody}
                  style={styles.bodyArt}
                  resizeMode="contain"
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                />
              )}
            </View>

            <View style={styles.section}>
              <SectionTitle>Summary</SectionTitle>
              {currentBmi != null || bodyFatPct != null ? (
                <View style={styles.summaryTop}>
                  {currentBmi != null ? (
                    <BmiSummaryGauge
                      width={gaugeWidth}
                      bmi={currentBmi}
                      categoryLabel={bmiCategory?.label ?? null}
                    />
                  ) : null}
                  {bodyFatPct != null ? (
                    <View style={[styles.fatCard, currentBmi == null && styles.fatCardSolo]}>
                      <Text style={styles.fatValue} numberOfLines={1}>
                        {formatDecimal(bodyFatPct)}%
                      </Text>
                      <Text style={styles.fatLabel}>Body Fat %</Text>
                    </View>
                  ) : null}
                </View>
              ) : null}
              {summaryTiles.length > 0 ? (
                <View style={styles.tileRow}>
                  {summaryTiles.map(tile => (
                    <View key={tile.label} style={styles.tile}>
                      <Text style={styles.tileLabel} numberOfLines={3}>
                        {tile.label}
                      </Text>
                      <Text style={styles.tileValue} numberOfLines={2}>
                        {tile.unit ? `${tile.value} ${tile.unit}` : tile.value}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}
              {currentBmi == null && bodyFatPct == null && summaryTiles.length === 0 ? (
                <View style={styles.emptyHistory}>
                  <Text style={styles.noHistoryTitle}>No measurements yet</Text>
                  <Text style={styles.noHistory}>
                    Complete a checkup to see BMI and body composition here.
                  </Text>
                </View>
              ) : null}
            </View>

            {showWeightDelta ? (
              <View style={styles.banner}>
                <View style={styles.bannerIcon}>
                  <Ionicons
                    name={needsToLose ? 'trending-down' : 'trending-up'}
                    size={IconSize.lg}
                    color={Colors.white}
                  />
                </View>
                <View style={styles.bannerCopy}>
                  <Text style={styles.bannerValue} numberOfLines={1}>
                    {needsToLose ? '−' : '+'} {Math.abs(weightDelta).toFixed(1)} Kg
                  </Text>
                  <Text style={styles.bannerHint}>
                    {needsToLose ? 'To lose towards target' : 'To gain towards target'}
                  </Text>
                </View>
              </View>
            ) : null}

            <View style={styles.section}>
              <SectionTitle>Measurement History</SectionTitle>
              {historyRows.length === 0 ? (
                <View style={styles.emptyHistory}>
                  <Ionicons name="time-outline" size={IconSize.xl} color={Colors.textLight} />
                  <Text style={styles.noHistoryTitle}>No past measurements</Text>
                  <Text style={styles.noHistory}>
                    Future BMI check-ups for this client will appear here.
                  </Text>
                </View>
              ) : (
                <View style={styles.historyList}>
                  {historyRows.map((row, index) => (
                    <HistoryCard
                      key={`${row.assessmentDate || 'row'}-${index}`}
                      row={row}
                      index={index}
                      expanded={expandedIndex === index}
                      onToggle={() =>
                        setExpandedIndex(currentIndex => (currentIndex === index ? -1 : index))
                      }
                    />
                  ))}
                </View>
              )}
            </View>

            <TouchableOpacity
              style={[styles.pdfBtn, preparingPdf && styles.pdfBtnBusy]}
              onPress={sharePdf}
              disabled={preparingPdf}
              activeOpacity={PressOpacity.default}
              accessibilityRole="button"
              accessibilityLabel={
                preparingPdf
                  ? 'Preparing PDF for download and share'
                  : 'Download and share PDF report'
              }
            >
              {preparingPdf ? (
                <>
                  <ActivityIndicator color={Colors.white} />
                  <Text style={styles.pdfLabel}>Preparing PDF…</Text>
                </>
              ) : (
                <>
                  <View style={styles.pdfBalance} />
                  <Text style={styles.pdfLabel}>Download & share Pdf</Text>
                  <View style={styles.pdfArrow}>
                    <Ionicons
                      name="arrow-forward-outline"
                      size={IconSize.sm}
                      color={Colors.brandCoach}
                    />
                  </View>
                </>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Tone.page },
  body: { flex: 1 },
  bodyContent: {
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
    paddingHorizontal: ScreenPad.horizontal,
  },
  stateCard: {
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: 28,
    marginTop: Spacing.lg,
    ...Shadow.sm,
  },
  stateMessage: {
    fontSize: 13,
    fontFamily: bodyFont.regular,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 18,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
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
  assessedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  assessedText: {
    flexShrink: 1,
    fontFamily: bodyFont.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.4,
    color: Tone.meta,
  },
  assessedDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.secondary,
  },
  bodyArt: {
    width: 104,
    height: 112,
    flexShrink: 0,
  },
  section: { marginTop: Spacing.lg },
  sectionHead: { alignItems: 'flex-start', marginBottom: Spacing.sm },
  sectionTitle: {
    ...Typography.title,
    color: Tone.ink,
  },
  sectionUnderline: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Tone.underline,
    marginTop: 2,
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: SUMMARY_GAP,
  },
  gauge: { alignItems: 'center' },
  arcBox: { position: 'relative' },
  gaugeReadout: {
    position: 'absolute',
    left: 12,
    right: 12,
    alignItems: 'center',
    zIndex: 2,
  },
  gaugeValue: {
    fontFamily: headingFont.extraBold,
    color: Tone.ink,
    textAlign: 'center',
  },
  gaugeCaption: {
    fontFamily: bodyFont.medium,
    fontSize: 13,
    lineHeight: 16,
    color: Tone.muted,
    marginTop: -1,
  },
  gaugePill: {
    marginTop: 6,
    alignSelf: 'stretch',
    minHeight: 40,
    borderRadius: Radius.pill,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugePillText: {
    fontFamily: bodyFont.semibold,
    fontSize: 15,
    lineHeight: 20,
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  fatCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: Tone.mint,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  fatCardSolo: { flex: 0, width: '48%' },
  fatValue: {
    ...Typography.metric,
    color: Tone.ink,
    textAlign: 'center',
  },
  fatLabel: {
    marginTop: 4,
    fontFamily: bodyFont.regular,
    fontSize: 14,
    lineHeight: 18,
    color: '#6C7A77',
    textAlign: 'center',
  },
  tileRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'stretch',
    gap: 6,
    marginTop: SUMMARY_GAP,
  },
  tile: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    minHeight: 84,
    backgroundColor: Tone.mint,
    borderRadius: 18,
    paddingHorizontal: 4,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileLabel: {
    width: '100%',
    fontFamily: bodyFont.regular,
    fontSize: 11,
    lineHeight: 14,
    color: Tone.muted,
    textAlign: 'center',
  },
  tileValue: {
    ...Typography.tileValue,
    width: '100%',
    marginTop: 6,
    color: Tone.ink,
    textAlign: 'center',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    backgroundColor: Tone.cream,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  bannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.accentInk,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerCopy: { flex: 1, minWidth: 0 },
  bannerValue: {
    fontFamily: headingFont.extraBold,
    fontSize: 20,
    lineHeight: 26,
    color: Tone.ink,
  },
  bannerHint: {
    marginTop: 2,
    fontFamily: bodyFont.regular,
    fontSize: 12,
    lineHeight: 16,
    color: Tone.meta,
  },
  historyList: { gap: SUMMARY_GAP },
  historyCardOpen: {
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
    ...Shadow.sm,
  },
  historyCardClosed: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  historyHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    minHeight: 36,
  },
  historyHeadPressed: { opacity: 0.72 },
  historyDate: {
    flexShrink: 1,
    fontFamily: headingFont.bold,
    fontSize: 16,
    lineHeight: 20,
    color: Tone.ink,
  },
  historyDateGold: { color: Tone.gold },
  historyPill: {
    flexShrink: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  historyPillText: {
    fontFamily: bodyFont.semibold,
    fontSize: 13,
    lineHeight: 16,
  },
  historySpacer: { flex: 1, minWidth: Spacing.xxs },
  historyRows: { marginTop: 10, gap: 5 },
  historyMetric: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: Spacing.sm,
  },
  historyMetricYellow: { backgroundColor: Tone.rowYellow },
  historyMetricMint: { backgroundColor: Tone.rowMint },
  historyMetricLabel: {
    flex: 1,
    minWidth: 0,
    fontFamily: bodyFont.medium,
    fontSize: 14,
    lineHeight: 18,
  },
  historyMetricLabelGold: { color: Tone.goldDeep },
  historyMetricLabelMint: { color: Tone.mintLabel },
  historyMetricValue: {
    flexShrink: 1,
    fontFamily: headingFont.bold,
    fontSize: 15,
    lineHeight: 19,
    textAlign: 'right',
  },
  historyMetricValueGold: { color: Tone.gold },
  historyMetricValueMint: { color: Tone.mintValue },
  emptyHistory: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    gap: 6,
  },
  noHistoryTitle: {
    fontSize: 13,
    fontFamily: headingFont.bold,
    color: Tone.ink,
    marginTop: 4,
  },
  noHistory: {
    fontSize: 12,
    fontFamily: bodyFont.regular,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 17,
  },
  pdfBtn: {
    marginTop: Spacing.lg,
    minHeight: 54,
    borderRadius: Radius.pill,
    backgroundColor: Colors.brandCoach,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xs,
    gap: Spacing.xs,
    ...Shadow.md,
  },
  pdfBtnBusy: { opacity: 0.85 },
  pdfBalance: { width: 36 },
  pdfLabel: {
    flex: 1,
    textAlign: 'center',
    color: Colors.white,
    fontFamily: bodyFont.bold,
    fontSize: 16,
    lineHeight: 22,
  },
  pdfArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
