import type { IoniconName } from '../types/icons';

export interface ProcessStep {
  num: string;
  title: string;
  text: string;
}

export interface RecognitionBadge {
  icon: IoniconName;
  title: string;
  subtitle: string;
}

export interface Testimonial {
  name: string;
  location: string;
  program: string;
  text: string;
  before: string;
  after: string;
  result: string;
}

export const EXPERTISE_DESC =
  'Expert guidance and a personalised approach to help you achieve lasting results.';

export const PROCESS_STEPS: ProcessStep[] = [
  {
    num: '01',
    title: 'Free Discovery Call',
    text: 'We start with a free 30-minute call, no cost or commitment. I understand your goals, lifestyle and any limitations.',
  },
  {
    num: '02',
    title: 'Personalised Plan',
    text: 'I build your custom programme from scratch, tailored to your body, schedule and targets.',
  },
  {
    num: '03',
    title: 'Execute & Adjust',
    text: 'You follow the plan with full support from me. I track progress weekly and keep you motivated.',
  },
  {
    num: '04',
    title: 'Celebrate & Level Up',
    text: 'Milestones are celebrated, results documented and we set the next target together.',
  },
];

export const RECOGNITION_BADGES: RecognitionBadge[] = [
  { icon: 'ribbon', title: 'Top Coach 2025', subtitle: 'Mera Coach Verified' },
  { icon: 'shield-checkmark', title: '100% Verified', subtitle: 'All credentials checked' },
  { icon: 'star', title: 'Premium Coach', subtitle: 'Highly rated by clients' },
  { icon: 'flash', title: 'Fast Responder', subtitle: 'Replies within 24 hours' },
];

export const TESTIMONIALS: Testimonial[] = [
  {
    name: 'Arjun Mehta',
    location: 'Delhi',
    program: '3-Month Programme',
    text: "Completely changed my perspective on health. The personalised approach and constant support made all the difference. I've never felt stronger or more confident!",
    before: '98 kg',
    after: '84 kg',
    result: 'Lost 14 kg',
  },
  {
    name: 'Preethi Nair',
    location: 'Mumbai',
    program: 'Online Programme',
    text: 'The coaching was seamless, the plan was practical and the results speak for themselves. Highly recommended to anyone serious about their wellness journey!',
    before: '52 kg',
    after: '58 kg',
    result: '+6 kg muscle',
  },
];

export const SERVICE_INQUIRY_FALLBACK = 'Not sure yet, need advice';

export const DUMMY_WHATSAPP_NUMBER = '918218841701';
