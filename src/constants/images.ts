import { AuthLayout } from './authLayout';

export const BrandImages = {
  logoFull: require('../../assets/brand/logo-full.png'),
  homeHero: require('../../assets/illustrations/home-bg.png'),
  loginAtmosphere: require('../../assets/illustrations/auth-bg.png'),
  mpinAtmosphere: require('../../assets/illustrations/mpin-bg.jpg'),
  emptyClients: require('../../assets/illustrations/empty-clients.png'),
  emptyLeads: require('../../assets/illustrations/empty-leads.png'),
  emptyCheckups: require('../../assets/illustrations/empty-checkups.png'),
  emptyNotifications: require('../../assets/illustrations/empty-notifications.png'),
  emptyError: require('../../assets/illustrations/empty-error.png'),
  avatarDefault: require('../../assets/illustrations/avatar-default.png'),
  phasePath: require('../../assets/illustrations/phase-path.png'),
  tipsCoach: require('../../assets/illustrations/tips-coach.png'),
  /** In-app wave header bitmap (green field + wavy bottom edge). */
  waveHeader: require('../../assets/illustrations/wave-header.png'),
  clientProfileBody: require('../../assets/illustrations/client-profile-body.png'),
  bmiGaugeArc: require('../../assets/illustrations/bmi-gauge-arc.png'),
  /** Hero photo bottom smile: opaque accentInk #11523C below a circular arc, transparent above. */
  heroSmileMask: require('../../assets/illustrations/hero-smile-mask.png'),
  /** Finished WhatsApp CTA bitmap for public coach profile. */
  whatsappCoachButton: require('../../assets/illustrations/whatsapp-coach-button.png'),
  exploreBannerPhoto: require('../../assets/illustrations/home-explore-banner.jpg'),
  homeBmiCard: require('../../assets/illustrations/home-bmi-card.png'),
  publicBmiBanner: require('../../assets/illustrations/public-bmi-banner.png'),
  /** Premium paywall hero: coach outdoors, green and warm light, no type. */
  premiumHero: require('../../assets/illustrations/premium-hero.jpg'),
} as const;

/** Width / height of BrandImages.publicBmiBanner (1198×647). */
export const PUBLIC_BMI_BANNER_ASPECT = 1198 / 647;

/** Width / height of BrandImages.premiumHero (1280×720). */
export const PREMIUM_HERO_ASPECT = 1280 / 720;

/** Pixel size of BrandImages.homeBmiCard (1216×750). */
export const HOME_BMI_CARD_BITMAP = { width: 1216, height: 750 } as const;

export const HOME_BMI_CARD_FRAME = { x: 380, y: 180, width: 836, height: 568 } as const;

/** Width / height of BrandImages.exploreBannerPhoto (1610×506). */
export const HOME_EXPLORE_BANNER_ASPECT = 1610 / 506;

/** Width / height of BrandImages.bmiGaugeArc (968×488). */
export const BMI_GAUGE_ARC_ASPECT = 968 / 488;

/** Width / height of BrandImages.heroSmileMask (1125×226). */
export const HERO_SMILE_MASK_ASPECT = 1125 / 226;

/** Width / height of BrandImages.whatsappCoachButton (1033×303). */
export const WHATSAPP_COACH_BUTTON_ASPECT = 1033 / 303;

/** Pixel size of BrandImages.waveHeader (859×387), including transparent padding. */
export const WAVE_HEADER_BITMAP = { width: 859, height: 387 } as const;

/**
 * Opaque window inside the wave bitmap, in pixels.
 * The file has transparent padding and a rounded cap; this window is solid
 * green across the full width and includes the bottom of the wave.
 * Height includes 78 extra rows copied from the last full-width green row
 * (y=228) so the wave sits below the header chrome. At a 390pt screen that
 * band is 36pt; the wave curve itself is unchanged.
 */
export const WAVE_HEADER_FRAME = { x: 3, y: 46, width: 851, height: 308 } as const;

/** Width / height of the on-screen wave (WAVE_HEADER_FRAME). */
export const WAVE_HEADER_ASPECT = WAVE_HEADER_FRAME.width / WAVE_HEADER_FRAME.height;

/** Width / height of BrandImages.tipsCoach (779×479). */
export const TIPS_COACH_ASPECT = 779 / 479;

/** Width / height for the full logo (from client asset dimensions). */
export const LOGO_ASPECT = {
  full: 1034 / 837,
} as const;

/** Auth screens: logo width as a fraction of screen width. */
export const AUTH_LOGO_WIDTH_FRAC = AuthLayout.logoWidthFrac;

export function authLogoHeight(screenW: number) {
  return Math.round((screenW * AUTH_LOGO_WIDTH_FRAC) / LOGO_ASPECT.full);
}

/** Width / height of BrandImages.homeHero (853×1843). */
export const HOME_HERO_ASPECT = 853 / 1843;

/** Width / height of BrandImages.loginAtmosphere (847×1857). */
export const AUTH_BG_ASPECT = 847 / 1857;

const AUTH_PHOTO_CONTENT_TOP = 1385;

export const AUTH_PHOTO_BAND = (1857 - AUTH_PHOTO_CONTENT_TOP) / 1857;

export const HOME_RUNNER_HEAD_TOP = 530;

export const HOME_HERO_HEIGHT = 1843;
