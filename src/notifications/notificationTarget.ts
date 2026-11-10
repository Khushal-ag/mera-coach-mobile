/** Where a tapped notification should take the coach. Kept free of React so it is easy to test. */
export interface NotificationTarget {
  tab: 'Dashboard' | 'Packages' | 'Events' | 'Profile';
  screen: string;
  params?: Record<string, unknown>;
}

/**
 * Maps the `route` and `refCode` the API sends onto a screen in the signed-in app.
 * An alert with an unknown route still opens the Notifications list, so a tap never does nothing.
 */
export function notificationTarget(route: string, refCode?: string): NotificationTarget {
  const code = (refCode ?? '').trim();
  switch (route) {
    case 'leads':
      return { tab: 'Dashboard', screen: 'Leads' };
    case 'client':
      // The client screen loads its details by code, so the name can be filled in later.
      return code
        ? {
            tab: 'Dashboard',
            screen: 'ClientDetail',
            params: { client: { id: code, clientCode: code, name: '' } },
          }
        : { tab: 'Dashboard', screen: 'ClientListHome' };
    case 'premium':
      return { tab: 'Dashboard', screen: 'Premium' };
    case 'packages':
      return { tab: 'Packages', screen: 'PackagesHome' };
    case 'posts':
      return { tab: 'Events', screen: 'EventsHome' };
    case 'reviews':
      return { tab: 'Profile', screen: 'Reviews' };
    default:
      return { tab: 'Dashboard', screen: 'Notifications' };
  }
}
