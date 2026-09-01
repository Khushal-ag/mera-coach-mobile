import type { IoniconName } from '../types/icons';

/**
 * Platform benefits for the public Home carousel.
 * Not testimonials — website sample quotes are template copy and must not be
 * attributed to live coaches from GET /Coach/public.
 */
export interface PlatformBenefit {
  badge: string;
  icon: IoniconName;
  title: string;
  body: string;
}

export const PLATFORM_BENEFITS: PlatformBenefit[] = [
  {
    badge: 'Direct enquiries',
    icon: 'trending-up-outline',
    title: 'A profile that works while you coach',
    body: 'Your public page and WhatsApp button let clients reach you directly. No middlemen.',
  },
  {
    badge: 'Faster first clients',
    icon: 'rocket-outline',
    title: 'Show up where people are looking',
    body: 'Clients browse by category, city, and specialty, then tap through to your profile to book a conversation.',
  },
  {
    badge: 'Your daily work',
    icon: 'briefcase-outline',
    title: 'Clients, leads, and check-ups together',
    body: 'Track health data, follow up on enquiries, and keep plans in the app instead of scattered chats and sheets.',
  },
  {
    badge: 'Nationwide reach',
    icon: 'globe-outline',
    title: 'Coach beyond your postcode',
    body: 'A listing on Mera Coach gives you a national presence so people can find you for in-person or online coaching.',
  },
  {
    badge: 'Open anytime',
    icon: 'star-outline',
    title: 'Clients can browse while you coach',
    body: 'People can view your services and send an enquiry even when you are in a session.',
  },
  {
    badge: 'WhatsApp-ready',
    icon: 'phone-portrait-outline',
    title: 'From profile to chat in one tap',
    body: 'People who like what they see can message you on WhatsApp without filling a long form first.',
  },
];
