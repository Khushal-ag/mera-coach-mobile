import type { TextStyle, ViewStyle } from 'react-native';
import { Colors, FontFamily, Radius, ScreenPad, Spacing, headingFont } from './theme';

export const WIZARD_CANVAS = '#F3FAF7';
export const WIZARD_FIELD_MINT = '#E7F6EC';
export const WIZARD_UNDERLINE = '#F08A2C';

export const wizardShellStyles = {
  container: { flex: 1, backgroundColor: WIZARD_CANVAS },
  body: { flex: 1, backgroundColor: WIZARD_CANVAS },
  bodyContent: {
    paddingHorizontal: ScreenPad.horizontal,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  stepHead: {
    marginBottom: Spacing.md,
  },
  stepTitle: {
    fontFamily: headingFont.bold,
    fontSize: 22,
    lineHeight: 28,
    color: Colors.textDark,
  },
  stepUnderline: {
    width: 36,
    height: 3,
    borderRadius: 2,
    backgroundColor: WIZARD_UNDERLINE,
    marginTop: 4,
  },
  stepSubtitle: {
    marginTop: Spacing.xs,
    fontFamily: FontFamily.regular,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textLight,
  },
  footer: {
    backgroundColor: WIZARD_CANVAS,
    borderTopWidth: 0,
    elevation: 0,
    shadowOpacity: 0,
  },
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
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  pillActive: { backgroundColor: WIZARD_FIELD_MINT, borderColor: Colors.accentInk },
  pillError: {
    borderColor: Colors.destructive,
    borderWidth: 1.5,
  },
  pillText: {
    fontSize: 13,
    color: Colors.textLight,
    fontFamily: FontFamily.semibold,
    textAlign: 'center' as const,
  },
  pillActiveText: { color: Colors.accentInk },
  unitPill: {
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  unitPillActive: { backgroundColor: WIZARD_FIELD_MINT, borderColor: Colors.accentInk },
  unitPillText: {
    fontSize: 12,
    color: Colors.textLight,
    fontFamily: FontFamily.semibold,
    textAlign: 'center' as const,
  },
  unitPillTextActive: { color: Colors.accentInk },
} satisfies Record<string, ViewStyle | TextStyle>;
