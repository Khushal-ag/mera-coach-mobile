export const BrandImages = {
  logoFull: require('../../assets/brand/logo-full.png'),
  logoMark: require('../../assets/brand/logo-mark.png'),
  logoWordmark: require('../../assets/brand/logo-wordmark.png'),
  mainScreenHero: require('../../assets/illustrations/main-screen-hero.png'),
  loginAtmosphere: require('../../assets/illustrations/login-atmosphere.jpg'),
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
