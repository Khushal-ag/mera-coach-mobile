export const BrandImages = {
  logoFull: require('../../assets/brand/logo-full.png'),
  logoMark: require('../../assets/brand/logo-mark.png'),
  logoWordmark: require('../../assets/brand/logo-wordmark.png'),
  /** Photo-only Home hero (no baked UI text). */
  homeHero: require('../../assets/illustrations/figma/home-bg.png'),
  loginAtmosphere: require('../../assets/illustrations/figma/auth-bg.png'),
  mpinAtmosphere: require('../../assets/illustrations/figma/mpin-bg.jpg'),
  emptyClients: require('../../assets/illustrations/empty-clients.png'),
  emptyLeads: require('../../assets/illustrations/empty-leads.png'),
  emptyCheckups: require('../../assets/illustrations/empty-checkups.png'),
  emptyNotifications: require('../../assets/illustrations/empty-notifications.png'),
  emptyError: require('../../assets/illustrations/empty-error.png'),
  avatarDefault: require('../../assets/illustrations/avatar-default.png'),
  phasePath: require('../../assets/illustrations/phase-path.png'),
  dashboardSlide1: require('../../assets/illustrations/dashboard-slide-1.jpg'),
  dashboardSlide2: require('../../assets/illustrations/dashboard-slide-2.jpg'),
  dashboardSlide3: require('../../assets/illustrations/dashboard-slide-3.jpg'),
} as const;

/** Width / height for each logo variant (from client asset dimensions). */
export const LOGO_ASPECT = {
  full: 1034 / 837,
  mark: 560 / 565,
  wordmark: 1029 / 177,
} as const;

/** Auth screens: logo width as a fraction of screen width (Figma brand scale). */
export const AUTH_LOGO_WIDTH_FRAC = 0.3;

export function authLogoHeight(screenW: number) {
  return Math.round((screenW * AUTH_LOGO_WIDTH_FRAC) / LOGO_ASPECT.full);
}

/** Width / height of BrandImages.homeHero (853×1843). */
export const HOME_HERO_ASPECT = 853 / 1843;

/** Width / height of BrandImages.loginAtmosphere (847×1857). */
export const AUTH_BG_ASPECT = 847 / 1857;

export const AUTH_PHOTO_CONTENT_TOP = 1385;

export const AUTH_PHOTO_BAND = (1857 - AUTH_PHOTO_CONTENT_TOP) / 1857;

export const HOME_RUNNER_HEAD_TOP = 530;

export const HOME_HERO_HEIGHT = 1843;
