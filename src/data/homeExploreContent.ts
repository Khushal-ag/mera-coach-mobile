import type { IoniconName } from '../types/icons';
import { Colors } from '../constants/theme';

export type ExploreFeatureTarget =
  | { kind: 'clients' }
  | { kind: 'checkups' }
  | { kind: 'packages' }
  | { kind: 'leads' }
  | { kind: 'profile' }
  | { kind: 'register' }
  | { kind: 'login' };

export interface ExploreFeature {
  label: string;
  icon: IoniconName;
  color: string;
  bg: string;
  target: ExploreFeatureTarget;
}

export const EXPLORE_FEATURES: ExploreFeature[] = [
  {
    label: 'Manage Clients',
    icon: 'people-outline',
    color: Colors.secondary,
    bg: Colors.secondaryLight,
    target: { kind: 'clients' },
  },
  {
    label: 'Tract Client Progress',
    icon: 'stats-chart-outline',
    color: Colors.brandCoach,
    bg: Colors.primaryLight,
    target: { kind: 'checkups' },
  },
  {
    label: 'Manage Followups',
    icon: 'calendar-outline',
    color: Colors.cardIconBlue,
    bg: Colors.cardTintBlue,
    target: { kind: 'checkups' },
  },
  {
    label: 'Sell Coaching Package',
    icon: 'cube-outline',
    color: Colors.cardIconPurple,
    bg: Colors.cardTintPurple,
    target: { kind: 'packages' },
  },
  {
    label: 'Client feedback & Review',
    icon: 'chatbubbles-outline',
    color: Colors.primary,
    bg: Colors.primaryLight,
    target: { kind: 'login' },
  },
  {
    label: 'Get New Clients',
    icon: 'person-add-outline',
    color: Colors.cardIconBlue,
    bg: Colors.cardTintBlue,
    target: { kind: 'register' },
  },
  {
    label: 'WhatsApp Leads',
    icon: 'logo-whatsapp',
    color: Colors.whatsapp,
    bg: Colors.whatsappSoft,
    target: { kind: 'leads' },
  },
  {
    label: 'Professional Profile',
    icon: 'id-card-outline',
    color: Colors.cardIconBlue,
    bg: Colors.cardTintBlue,
    target: { kind: 'profile' },
  },
];
