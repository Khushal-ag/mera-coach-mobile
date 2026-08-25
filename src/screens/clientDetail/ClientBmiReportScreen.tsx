import React from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadow } from '../../constants/theme';
import ScreenHeader from '../../components/ScreenHeader';
import { getBmiReport } from '../../api/clientApi';
import { getErrorMessage } from '../../api/client';
import { queryKeys } from '../../api/queryKeys';
import { useRefreshControl } from '../../hooks/useRefreshControl';
import type { RootScreenProps } from '../../types/navigation';

export default function ClientBmiReportScreen({
  navigation,
  route,
}: RootScreenProps<'ClientBmiReport'>) {
  const insets = useSafeAreaInsets();
  const client = route.params?.client;
  const ids = { clientCode: client?.clientCode, assessmentCode: client?.assessmentCode };

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

  const needsToLose = (report?.weightDelta ?? 0) > 0;
  const history = report?.history ?? [];

  const primaryStats = report
    ? [
        { value: report.current.bmi?.toFixed(1) ?? '—', label: 'Current BMI' },
        { value: report.bmiCategory || '—', label: 'Classification' },
        {
          value:
            report.current.bodyFatPct != null ? `${report.current.bodyFatPct.toFixed(1)}%` : '—',
          label: 'Body Fat %',
        },
        {
          value: report.targetWeight != null ? `${report.targetWeight.toFixed(1)} kg` : '—',
          label: 'Target Weight',
        },
      ]
    : [];

  return (
    <View style={styles.container}>
      <ScreenHeader title="BMI Report" onBack={() => navigation.goBack()} />

      <ScrollView
        style={styles.body}
        contentContainerStyle={[styles.bodyContent, { paddingBottom: Math.max(insets.bottom, 28) }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshControl.refreshing}
            onRefresh={refreshControl.onRefresh}
            tintColor={Colors.secondary}
          />
        }
      >
        {errorMessage ? (
          <View style={styles.stateCard}>
            <Ionicons name="alert-circle-outline" size={28} color={Colors.primary} />
            <Text style={styles.stateTitle}>Couldn&apos;t load report</Text>
            <Text style={styles.stateMessage}>{errorMessage}</Text>
          </View>
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
                  {report.client.age ?? '—'} yrs ·{' '}
                  {report.client.gender === 'M'
                    ? 'Male'
                    : report.client.gender === 'F'
                      ? 'Female'
                      : '—'}
                  {report.client.location ? ` · ${report.client.location}` : ''}
                </Text>
                <Text style={styles.patientDate}>
                  Assessed {report.current.assessmentDate || report.reportDate || '—'}
                </Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Summary</Text>
            <View style={styles.statsGrid}>
              {primaryStats.map(stat => (
                <View key={stat.label} style={styles.statCard}>
                  <Text style={styles.statValue} numberOfLines={2}>
                    {stat.value}
                  </Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </View>
              ))}
            </View>

            {report.weightDelta != null ? (
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
                    {Math.abs(report.weightDelta).toFixed(1)} kg
                  </Text>
                  <Text style={styles.deltaLabel}>
                    {needsToLose ? 'To lose toward target' : 'To gain toward target'}
                  </Text>
                </View>
              </View>
            ) : null}

            <Text style={styles.sectionTitle}>Measurement History</Text>
            <View style={styles.card}>
              <View style={styles.historyHeader}>
                <Text style={[styles.historyCol, styles.historyColDate]}>Date</Text>
                <Text style={styles.historyCol}>Ht</Text>
                <Text style={styles.historyCol}>Wt</Text>
                <Text style={styles.historyCol}>BMI</Text>
              </View>
              <MeasurementRow row={report.current} label="Current" highlight />
              {history.length === 0 ? (
                <View style={styles.emptyHistory}>
                  <Ionicons name="time-outline" size={22} color={Colors.textLight} />
                  <Text style={styles.noHistoryTitle}>No past measurements</Text>
                  <Text style={styles.noHistory}>
                    Future BMI check-ups for this client will appear here.
                  </Text>
                </View>
              ) : (
                history.map((row, i) => <MeasurementRow key={i} row={row} />)
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function MeasurementRow({
  row,
  label,
  highlight,
}: {
  row: { assessmentDate?: string; height?: number; weight?: number; bmi?: number };
  label?: string;
  highlight?: boolean;
}) {
  return (
    <View style={[styles.row, highlight && styles.rowHighlight]}>
      <Text style={[styles.rowDate, styles.historyColDate]} numberOfLines={1}>
        {label || row.assessmentDate || '—'}
      </Text>
      <Text style={styles.rowValue}>{row.height ?? '—'} cm</Text>
      <Text style={styles.rowValue}>{row.weight ?? '—'} kg</Text>
      <Text style={styles.rowValue}>{row.bmi?.toFixed(1) ?? '—'}</Text>
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
  stateTitle: { fontSize: 15, fontWeight: '700', color: Colors.textDark },
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
    width: '47%',
    flexGrow: 1,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    ...Shadow.sm,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.secondary,
    textAlign: 'center',
  },
  statLabel: { fontSize: 11, color: Colors.textLight, marginTop: 4, textAlign: 'center' },
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
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: 4,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  historyCol: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textLight,
    textAlign: 'right',
  },
  historyColDate: { flex: 1.3, textAlign: 'left' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.background,
  },
  rowHighlight: { backgroundColor: Colors.secondaryLight, borderRadius: Radius.sm },
  rowDate: { fontSize: 12, fontWeight: '700', color: Colors.textDark },
  rowValue: { flex: 1, fontSize: 12, color: Colors.textLight, textAlign: 'right' },
  emptyHistory: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    gap: 6,
  },
  noHistoryTitle: { fontSize: 13, fontWeight: '700', color: Colors.textDark, marginTop: 4 },
  noHistory: { fontSize: 12, color: Colors.textLight, textAlign: 'center', lineHeight: 17 },
});
