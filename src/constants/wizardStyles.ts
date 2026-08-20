import type { TextStyle, ViewStyle } from 'react-native';
import { Colors, Radius, Shadow } from './theme';

// Plain objects, not StyleSheet.create, so consumers can spread these into their own.
export const wizardShellStyles = {
  container: { flex: 1, backgroundColor: Colors.background },
  floatingBack: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.md,
  },
  body: { flex: 1 },
  bodyContent: { padding: 20, paddingTop: 70, paddingBottom: 40 },
  stepBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.secondary,
    borderRadius: Radius.md,
    padding: 14,
    marginBottom: 20,
    ...Shadow.sm,
  },
  stepBannerText: { flex: 1 },
  stepBannerTitle: { color: Colors.white, fontSize: 15, fontWeight: '700' },
  stepBannerSubtitle: { color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 2 },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    borderRadius: Radius.pill,
    paddingVertical: 14,
    marginTop: 8,
    ...Shadow.sm,
  },
  nextText: { color: Colors.white, fontWeight: '700', fontSize: 15 },
} satisfies Record<string, ViewStyle | TextStyle>;
