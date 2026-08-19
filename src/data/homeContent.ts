import type { CoachCategory } from '../types/models';

export interface HomeStat {
  value: string;
  label: string;
}

export const HOME_STATS: HomeStat[] = [
  { value: '500+', label: 'Verified Coaches' },
  { value: '25K+', label: 'Happy Clients' },
  { value: '15+', label: 'Categories' },
  { value: '4.9/5', label: 'Avg. Rating' },
];

export const COACH_CATEGORIES: CoachCategory[] = [
  {
    code: 'CT001',
    label: 'Gym Trainer',
    short: 'Gym',
    icon: 'barbell',
    color: '#1b4332',
    bg: '#e8f5e9',
  },
  {
    code: 'CT002',
    label: 'Health & Wellness Coach',
    short: 'Health',
    icon: 'heart',
    color: '#9333ea',
    bg: '#f3e8ff',
  },
  {
    code: 'CT003',
    label: 'Holistic Health Coach',
    short: 'Holistic',
    icon: 'leaf',
    color: '#2d6a4f',
    bg: '#e8f5e9',
  },
  {
    code: 'CT004',
    label: 'Nutrition & Lifestyle Consultant',
    short: 'Nutrition',
    icon: 'nutrition',
    color: '#c9882a',
    bg: '#fdf3e0',
  },
  {
    code: 'CT005',
    label: 'Personal Fitness Trainer',
    short: 'Fitness',
    icon: 'walk',
    color: '#3b82f6',
    bg: '#e0ecff',
  },
  {
    code: 'CT006',
    label: 'Weight Loss & Transformation',
    short: 'Weight Loss',
    icon: 'body',
    color: '#ec4899',
    bg: '#fce7f3',
  },
  {
    code: 'CT007',
    label: 'Yoga & Wellness Trainer',
    short: 'Yoga',
    icon: 'flower',
    color: '#0d9488',
    bg: '#e0f5f3',
  },
  {
    code: 'CT008',
    label: 'Zumba',
    short: 'Zumba',
    icon: 'musical-notes',
    color: '#c04b2b',
    bg: '#fceee9',
  },
];
