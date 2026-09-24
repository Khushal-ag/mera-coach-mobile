import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Colors,
  IconSize,
  Radius,
  Shadow,
  Spacing,
  Typography,
  headingFont,
} from '../../constants/theme';
import AppButton from '../AppButton';
import type { ProfileCompletion } from '../../utils/profileCompletion';

type ProfileCompletionCardProps = {
  completion: ProfileCompletion;
  onPress?: () => void;
  /** Compact for dashboard; full checklist on profile. */
  variant?: 'banner' | 'detailed';
  /** Hide the action button when already on Edit Profile. */
  showAction?: boolean;
};

export default function ProfileCompletionCard({
  completion,
  onPress,
  variant = 'banner',
  showAction = true,
}: ProfileCompletionCardProps) {
  if (completion.isPublicReady && completion.percent >= 100) return null;

  const remaining = completion.missingLabels.slice(0, 3);
  const moreCount = Math.max(0, completion.missingLabels.length - remaining.length);

  return (
    <View
      style={[styles.card, completion.isPublicReady ? styles.cardSoft : styles.cardAlert]}
      accessibilityRole="summary"
    >
      <View style={styles.topRow}>
        <View
          style={[styles.iconWrap, completion.isPublicReady ? styles.iconSoft : styles.iconAlert]}
        >
          <Ionicons
            name={completion.isPublicReady ? 'sparkles-outline' : 'eye-off-outline'}
            size={IconSize.lg}
            color={completion.isPublicReady ? Colors.secondary : Colors.primary}
          />
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>
            {completion.isPublicReady
              ? 'Polish your public profile'
              : 'Complete profile to go public'}
          </Text>
          <Text style={styles.subtitle}>
            {completion.isPublicReady
              ? 'Add a photo and remaining details so clients trust your listing.'
              : 'Finish the required fields to appear on Find a Coach.'}
          </Text>
        </View>
        <Text style={styles.percent}>{completion.percent}%</Text>
      </View>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${completion.percent}%` }]} />
      </View>

      {variant === 'detailed' ? (
        <View style={styles.checklist}>
          {completion.items.map(item => (
            <View key={item.key} style={styles.checkRow}>
              <Ionicons
                name={item.done ? 'checkmark-circle' : 'ellipse-outline'}
                size={IconSize.md}
                color={item.done ? Colors.secondary : Colors.textLight}
              />
              <Text style={[styles.checkLabel, item.done && styles.checkDone]}>{item.label}</Text>
            </View>
          ))}
        </View>
      ) : remaining.length > 0 ? (
        <Text style={styles.missing}>
          Still needed: {remaining.join(', ')}
          {moreCount > 0 ? ` +${moreCount} more` : ''}
        </Text>
      ) : null}

      {showAction && onPress ? (
        <AppButton
          label={completion.isPublicReady ? 'Edit Profile' : 'Complete Profile'}
          size="compact"
          icon="arrow-forward"
          onPress={onPress}
          style={styles.cta}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    ...Shadow.sm,
  },
  cardAlert: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary + '33',
  },
  cardSoft: {
    backgroundColor: Colors.secondaryLight,
    borderColor: Colors.border,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconAlert: { backgroundColor: Colors.white },
  iconSoft: { backgroundColor: Colors.white },
  copy: { flex: 1, minWidth: 0 },
  title: {
    ...Typography.bodyStrong,
    fontFamily: headingFont.bold,
  },
  subtitle: {
    ...Typography.caption,
    marginTop: 2,
  },
  percent: {
    fontSize: 16,
    fontFamily: headingFont.extraBold,
    color: Colors.secondary,
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.white,
    marginTop: Spacing.sm,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: Colors.secondary,
  },
  missing: {
    ...Typography.micro,
    marginTop: Spacing.xs,
    color: Colors.textDark,
  },
  checklist: {
    marginTop: Spacing.sm,
    gap: 6,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  checkLabel: {
    ...Typography.caption,
    color: Colors.textDark,
  },
  checkDone: {
    color: Colors.textLight,
    textDecorationLine: 'line-through',
  },
  cta: {
    marginTop: Spacing.sm,
    alignSelf: 'flex-start',
  },
});
