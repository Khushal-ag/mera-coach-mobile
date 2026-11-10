import { NOTIFICATION_CHANNELS } from '../../notifications/notificationChannels';

// The API sends the lower-case group code as the channel id. If these drift apart, alerts fall back
// to the generic channel and the coach loses the per-type settings.
const API_GROUPS = ['LEADS_CLIENTS', 'BUSINESS', 'SUBSCRIPTION', 'FEEDBACK'];

describe('notification channels', () => {
  it('has one channel for every group the API sends', () => {
    expect(NOTIFICATION_CHANNELS.map(c => c.id).sort()).toEqual(
      API_GROUPS.map(g => g.toLowerCase()).sort(),
    );
  });

  it('gives every channel a readable name and description', () => {
    for (const c of NOTIFICATION_CHANNELS) {
      expect(c.name.length).toBeGreaterThan(2);
      expect(c.description.length).toBeGreaterThan(10);
    }
  });
});
