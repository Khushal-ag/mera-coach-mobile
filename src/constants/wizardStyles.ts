import type { TextStyle, ViewStyle } from 'react-native';
import { Colors, FontFamily, Radius, Shadow, Spacing } from './theme';

// Plain objects, not StyleSheet.create, so consumers can spread these into their own.
export const wizardShellStyles = {
  container: { flex: 1, backgroundColor: Colors.background },
  body: { flex: 1 },
  bodyContent: {
    padding: Spacing.lg,
    paddingBottom: 40,
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
  stepBannerSubtitle: { color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 2 },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    borderRadius: Radius.pill,
    paddingVertical: Spacing.md,
    marginTop: Spacing.xs,
    ...Shadow.sm,
  },
  nextText: { color: Colors.white, fontFamily: FontFamily.bold, fontSize: 15 },
} satisfies Record<string, ViewStyle | TextStyle>;
