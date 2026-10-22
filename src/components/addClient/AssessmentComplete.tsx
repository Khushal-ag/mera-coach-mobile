import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppButton from '../AppButton';
import FormErrorBanner from '../FormErrorBanner';
import WaveScreenHeader from '../WaveScreenHeader';
import { Colors, Radius, ScreenPad, Shadow, Spacing, headingFont } from '../../constants/theme';
import { getErrorMessage } from '../../api/client';
import { getCurrentCoachCode } from '../../auth/session';
import {
  bmiReportPdfQuery,
  downloadAndSharePdf,
  PDF_GENERATE_FAILED_MESSAGE,
} from '../../utils/pdfShare';

interface AssessmentCompleteProps {
  headerTitle: string;
  title: string;
  message: string;
  clientCode?: string;
  assessmentCode?: string;
  onViewReport: () => void;
  onOpenDietPlan: () => void;
  onDone: () => void;
  onHome?: () => void;
}

/**
 * Shown after an assessment is saved, instead of an alert that sends the coach straight back.
 * The coach can save or share the BMI report PDF, open the report or the diet plan, or finish.
 */
export default function AssessmentComplete({
  headerTitle,
  title,
  message,
  clientCode,
  assessmentCode,
  onViewReport,
  onOpenDietPlan,
  onDone,
  onHome,
}: AssessmentCompleteProps) {
  const [preparingPdf, setPreparingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const sharePdf = async () => {
    if (preparingPdf || !clientCode) return;
    const coachCode = getCurrentCoachCode() ?? '';
    setPdfError(null);
    setPreparingPdf(true);
    try {
      await downloadAndSharePdf(
        '/v{version}/Client/bmi-report-pdf',
        bmiReportPdfQuery({ coachCode, clientCode, assessmentCode }),
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
      <WaveScreenHeader title={headerTitle} onBack={onDone} onHome={onHome} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name="checkmark-circle" size={44} color={Colors.secondary} />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
        </View>

        <FormErrorBanner message={pdfError} />

        {clientCode ? (
          <View style={styles.actions}>
            <AppButton
              label="Save or share BMI report PDF"
              icon="share-outline"
              onPress={() => void sharePdf()}
              loading={preparingPdf}
            />
            <AppButton
              label="View BMI report"
              variant="secondary"
              icon="document-text-outline"
              onPress={onViewReport}
            />
            <AppButton
              label="Create diet plan"
              variant="secondary"
              icon="reader-outline"
              onPress={onOpenDietPlan}
            />
          </View>
        ) : null}

        <AppButton label="Done" variant="ghost" onPress={onDone} style={styles.done} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: ScreenPad.horizontal, paddingTop: Spacing.lg, paddingBottom: Spacing.xl },
  card: {
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadow.md,
  },
  iconWrap: { marginBottom: Spacing.sm },
  title: {
    fontFamily: headingFont.bold,
    fontSize: 20,
    color: Colors.textDark,
    textAlign: 'center',
  },
  message: {
    marginTop: Spacing.xs,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textLight,
    textAlign: 'center',
  },
  actions: { gap: Spacing.sm },
  done: { marginTop: Spacing.sm },
});
