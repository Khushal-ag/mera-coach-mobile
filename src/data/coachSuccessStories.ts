import type { IoniconName } from '../types/icons';

/**
 * Quote templates paired with live coaches from GET /Coach/public (page 2),
 * matching meracoachapp Pages/Index.cshtml `#stories`. No dedicated stories API —
 * coaches come from the public list; copy is static on the website.
 */
export interface CoachStoryTemplate {
  badge: string;
  icon: IoniconName;
  quote: string;
}

export const COACH_STORY_TEMPLATES: CoachStoryTemplate[] = [
  {
    badge: '3x more client enquiries',
    icon: 'trending-up-outline',
    quote:
      'Since joining Mera Coach, my enquiry rate has tripled. The professional profile page and WhatsApp integration makes it so easy for clients to reach me directly. I wish I had joined sooner!',
  },
  {
    badge: 'First client within 7 days',
    icon: 'rocket-outline',
    quote:
      'I was skeptical at first, but Mera Coach proved me wrong. Within 7 days of setting up my profile, I had my first paid consultation booked. The platform truly delivers what it promises.',
  },
  {
    badge: 'Managing 40+ clients easily',
    icon: 'briefcase-outline',
    quote:
      'The client management dashboard on Mera Coach saves me at least 3 hours every week. Tracking health data, managing leads and following up, all from one clean interface. Absolutely brilliant!',
  },
  {
    badge: 'Clients from across India',
    icon: 'globe-outline',
    quote:
      'I am based in a small city but Mera Coach gave me a national presence. I now consult clients from Mumbai, Delhi and Bangalore, all online. This platform broke every geographical barrier for me.',
  },
  {
    badge: 'Profile views doubled in 30 days',
    icon: 'star-outline',
    quote:
      'My Mera Coach profile works for me 24/7. Even while I sleep, potential clients are viewing my page, reading my services and sending enquiries. It is like having a full-time marketing team!',
  },
  {
    badge: 'Direct WhatsApp leads daily',
    icon: 'phone-portrait-outline',
    quote:
      'The WhatsApp integration on Mera Coach is a game changer. Clients see my profile, tap the button and they are directly chatting with me. No middlemen, no delays: pure direct connection!',
  },
];
