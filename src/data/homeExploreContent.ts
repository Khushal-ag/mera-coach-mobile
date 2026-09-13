import type { IoniconName } from '../types/icons';
import { Colors } from '../constants/theme';

interface HomeFeature {
  label: string;
  icon: IoniconName;
  color: string;
  bg: string;
}

/** Feature chips for HomeExplore — brand palette only (no purple/blue AI defaults). */
export const HOME_FEATURES: HomeFeature[] = [
  {
    label: 'Manage Clients',
    icon: 'people-outline',
    color: Colors.secondary,
    bg: Colors.secondaryLight,
  },
  {
    label: 'Track Client Progress',
    icon: 'stats-chart-outline',
    color: Colors.accent,
    bg: Colors.accentLight,
  },
  {
    label: 'Manage Followups',
    icon: 'calendar-outline',
    color: Colors.primary,
    bg: Colors.primaryLight,
  },
  {
    label: 'Sell Coaching Package',
    icon: 'bag-handle-outline',
    color: Colors.secondary,
    bg: Colors.secondaryLight,
  },
  {
    label: 'Client Feedback and Review',
    icon: 'star-outline',
    color: Colors.accent,
    bg: Colors.accentLight,
  },
  {
    label: 'Get New Clients',
    icon: 'person-add-outline',
    color: Colors.primary,
    bg: Colors.primaryLight,
  },
  {
    label: 'WhatsApp Leads',
    icon: 'logo-whatsapp',
    color: Colors.whatsapp,
    bg: Colors.whatsappSoft,
  },
  {
    label: 'Professional Profile',
    icon: 'person-circle-outline',
    color: Colors.secondary,
    bg: Colors.secondaryLight,
  },
];
