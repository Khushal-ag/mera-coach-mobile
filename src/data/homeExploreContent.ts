import type { IoniconName } from '../types/icons';

export interface HomeFeature {
  label: string;
  icon: IoniconName;
  color: string;
  bg: string;
}

export const HOME_FEATURES: HomeFeature[] = [
  { label: 'Manage Clients', icon: 'people-outline', color: '#1b4332', bg: '#e8f5e9' },
  { label: 'Track Client Progress', icon: 'stats-chart-outline', color: '#c9882a', bg: '#fdf3e0' },
  { label: 'Manage Followups', icon: 'calendar-outline', color: '#7c3aed', bg: '#f3e8ff' },
  { label: 'Sell Coaching package', icon: 'bag-handle-outline', color: '#1b4332', bg: '#e8f5e9' },
  { label: 'Client Feedback and Review', icon: 'star-outline', color: '#ca8a04', bg: '#fef9c3' },
  { label: 'Get New Clients', icon: 'person-add-outline', color: '#2563eb', bg: '#dbeafe' },
  { label: 'whatsapp Leads', icon: 'logo-whatsapp', color: '#25D366', bg: '#dcfce7' },
  { label: 'Professional Profile', icon: 'person-circle-outline', color: '#7c3aed', bg: '#f3e8ff' },
];
