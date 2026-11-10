/**
 * Android notification channels, one per alert group. Each shows up under its own name in the phone's
 * notification settings, so a coach can silence "Business setup" without losing lead alerts.
 * The ids must match what the API sends as `channelId` (the lower-case group code).
 */
export interface NotificationChannel {
  id: string;
  name: string;
  description: string;
  /** 'high' pops up on screen with a sound; 'default' sits quietly in the shade with a sound. */
  priority: 'high' | 'default';
}

export const NOTIFICATION_CHANNELS: readonly NotificationChannel[] = [
  {
    id: 'leads_clients',
    name: 'Leads & clients',
    description: 'New leads waiting, client check-ups due and incomplete client profiles',
    priority: 'high',
  },
  {
    id: 'feedback',
    name: 'Feedback',
    description: 'When a client sends feedback, and clients you have not asked yet',
    priority: 'high',
  },
  {
    id: 'subscription',
    name: 'Subscription',
    description: 'Reminders before your plan ends',
    priority: 'high',
  },
  {
    id: 'business',
    name: 'Business setup',
    description: 'Gentle nudges about packages, events, gallery and success stories',
    priority: 'default',
  },
] as const;

/** Used when an alert arrives with no channel, or an older one. */
export const FALLBACK_CHANNEL_ID = 'default';
