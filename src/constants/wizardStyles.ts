import type { TextStyle, ViewStyle } from 'react-native';
import { Colors, FontFamily, Radius, Shadow, Spacing, buttonStyles } from './theme';

// Plain objects, not StyleSheet.create, so consumers can spread these into their own.
export const wizardShellStyles = {
  container: { flex: 1, backgroundColor: Colors.background },
  body: { flex: 1 },
  bodyContent: {
    padding: Spacing.lg,
    // Bottom pad comes from KeyboardSafeScroll + StickyFooter; keep content tight.
    paddingBottom: Spacing.sm,
  },
  stepBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.secondary,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadow.sm,
  },
  stepBannerText: { flex: 1 },
  stepBannerTitle: {
    color: Colors.white,
    fontSize: 15,
    fontFamily: FontFamily.bold,
  },
  stepBannerSubtitle: {
    color: Colors.onDarkMuted,
    fontSize: 11,
    fontFamily: FontFamily.regular,
    marginTop: 2,
  },
  nextBtn: {
    marginTop: Spacing.xs,
  },
  nextText: buttonStyles.primaryText,
} satisfies Record<string, ViewStyle | TextStyle>;

/** Shared choice pills for wizard gender / unit toggles. */
export const wizardPillStyles = {
  row: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: Spacing.xs },
  pill: {
    borderRadius: Radius.pill,
    paddingHorizontal: 14,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  pillActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  pillText: {
    fontSize: 13,
    color: Colors.textLight,
    fontFamily: FontFamily.semibold,
  },
  pillActiveText: { color: Colors.white },
  unitPill: {
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  unitPillActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  unitPillText: {
    fontSize: 12,
    color: Colors.textLight,
    fontFamily: FontFamily.semibold,
  },
  unitPillTextActive: { color: Colors.white },
} satisfies Record<string, ViewStyle | TextStyle>;
