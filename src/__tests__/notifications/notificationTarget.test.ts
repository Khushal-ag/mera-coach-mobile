import { notificationTarget } from '../../notifications/notificationTarget';
import { timeAgo } from '../../notifications/formatTime';

describe('notificationTarget', () => {
  it('opens the leads list', () => {
    expect(notificationTarget('leads', '12')).toEqual({ tab: 'Dashboard', screen: 'Leads' });
  });

  it('opens a client by code, with the name left for the screen to load', () => {
    expect(notificationTarget('client', ' CL00020 ')).toEqual({
      tab: 'Dashboard',
      screen: 'ClientDetail',
      params: { client: { id: 'CL00020', clientCode: 'CL00020', name: '' } },
    });
  });

  it('falls back to the client list when the alert has no client code', () => {
    expect(notificationTarget('client', '')).toEqual({
      tab: 'Dashboard',
      screen: 'ClientListHome',
    });
    expect(notificationTarget('client')).toEqual({ tab: 'Dashboard', screen: 'ClientListHome' });
  });

  it('maps the business and account screens to their tabs', () => {
    expect(notificationTarget('packages')).toEqual({ tab: 'Packages', screen: 'PackagesHome' });
    expect(notificationTarget('posts')).toEqual({ tab: 'Events', screen: 'EventsHome' });
    expect(notificationTarget('reviews')).toEqual({ tab: 'Profile', screen: 'Reviews' });
    expect(notificationTarget('premium')).toEqual({ tab: 'Dashboard', screen: 'Premium' });
  });

  it('opens the notification list for a route it does not know', () => {
    expect(notificationTarget('something-new')).toEqual({
      tab: 'Dashboard',
      screen: 'Notifications',
    });
  });
});

describe('timeAgo', () => {
  const now = new Date('2026-11-05T10:00:00Z');

  it('uses short relative wording for recent alerts', () => {
    expect(timeAgo('2026-11-05T09:59:40Z', now)).toBe('Just now');
    expect(timeAgo('2026-11-05T09:55:00Z', now)).toBe('5 min ago');
    expect(timeAgo('2026-11-05T07:00:00Z', now)).toBe('3 h ago');
    expect(timeAgo('2026-11-04T08:00:00Z', now)).toBe('Yesterday');
    expect(timeAgo('2026-11-02T10:00:00Z', now)).toBe('3 days ago');
  });

  it('shows a date after a week and nothing for a bad value', () => {
    expect(timeAgo('2026-10-01T10:00:00Z', now)).toMatch(/2026/);
    expect(timeAgo('not a date', now)).toBe('');
  });
});
