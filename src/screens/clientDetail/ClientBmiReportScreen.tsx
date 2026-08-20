import React from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadow } from '../../constants/theme';
import { getBmiReport } from '../../api/clientApi';
import { getErrorMessage } from '../../api/client';
import { useRefreshControl } from '../../hooks/useRefreshControl';
import type { RootScreenProps } from '../../types/navigation';

export default function ClientBmiReportScreen({
  navigation,
  route,
}: RootScreenProps<'ClientBmiReport'>) {
  const client = route.params?.client;
  const ids = { clientCode: client?.clientCode, assessmentCode: client?.assessmentCode };

  const reportQuery = useQuery({
    queryKey: ['bmiReport', ids.clientCode, ids.assessmentCode],
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>BMI Report</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
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
          <Text style={styles.empty}>{errorMessage}</Text>
        ) : !report ? (
          <Text style={styles.empty}>Loading report…</Text>
        ) : (
          <>
            <View style={styles.patientCard}>
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
                {report.current.assessmentDate || report.reportDate}
              </Text>
            </View>

            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{report.current.bmi?.toFixed(1) ?? '—'}</Text>
                <Text style={styles.statLabel}>Current BMI</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{report.bmiCategory || '—'}</Text>
                <Text style={styles.statLabel}>Classification</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>
                  {report.current.bodyFatPct?.toFixed(1) ?? '—'}%
                </Text>
                <Text style={styles.statLabel}>Body Fat %</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{report.targetWeight?.toFixed(1) ?? '—'} kg</Text>
                <Text style={styles.statLabel}>Target Weight</Text>
              </View>
              {report.weightDelta != null && (
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>
                    {needsToLose ? '−' : '+'}
                    {Math.abs(report.weightDelta).toFixed(1)} kg
                  </Text>
                  <Text style={styles.statLabel}>{needsToLose ? 'To Lose' : 'To Gain'}</Text>
                </View>
              )}
            </View>

            <Text style={styles.sectionTitle}>Measurement History</Text>
            <View style={styles.card}>
              <MeasurementRow row={report.current} label="Current" highlight />
              {history.length === 0 ? (
                <Text style={styles.noHistory}>No past measurements yet.</Text>
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
      <Text style={styles.rowDate}>{label || row.assessmentDate || '—'}</Text>
      <Text style={styles.rowValue}>{row.height ?? '—'} cm</Text>
      <Text style={styles.rowValue}>{row.weight ?? '—'} kg</Text>
      <Text style={styles.rowValue}>BMI {row.bmi?.toFixed(1) ?? '—'}</Text>
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
  headerTitle: { color: Colors.white, fontSize: 18, fontWeight: '700' },
  headerSpacer: { width: 36, height: 36 },
  body: { flex: 1 },
  bodyContent: { padding: 20, paddingBottom: 40 },
  empty: { textAlign: 'center', color: Colors.textLight, fontSize: 13, marginTop: 40 },
  patientCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: 20,
    marginBottom: 16,
    ...Shadow.md,
  },
  patientName: { fontSize: 18, fontWeight: '800', color: Colors.textDark },
  patientMeta: { fontSize: 13, color: Colors.textLight, marginTop: 4 },
  patientDate: { fontSize: 12, color: Colors.textLight, marginTop: 8 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  statCard: {
    width: '31%',
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: 12,
    alignItems: 'center',
    ...Shadow.sm,
  },
  statValue: { fontSize: 15, fontWeight: '800', color: Colors.secondary, textAlign: 'center' },
  statLabel: { fontSize: 10, color: Colors.textLight, marginTop: 4, textAlign: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.textDark, marginBottom: 10 },
  card: { backgroundColor: Colors.white, borderRadius: Radius.md, padding: 4, ...Shadow.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background,
  },
  rowHighlight: { backgroundColor: Colors.secondaryLight, borderRadius: Radius.sm },
  rowDate: { fontSize: 12, fontWeight: '700', color: Colors.textDark, flex: 1 },
  rowValue: { fontSize: 12, color: Colors.textLight, flex: 1, textAlign: 'right' },
  noHistory: { fontSize: 12, color: Colors.textLight, padding: 16, textAlign: 'center' },
});
