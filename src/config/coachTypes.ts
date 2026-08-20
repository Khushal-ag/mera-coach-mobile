import type { IoniconName } from '../types/icons';

export interface CoachPhase {
  id: string;
  label: string;
  icon: IoniconName;
  screens: string[];
}

export interface CoachTypeConfig {
  id: string;
  label: string;
  phases: CoachPhase[];
}

export const DEFAULT_COACH_TYPE = 'health';

export const COACH_TYPES: Record<string, CoachTypeConfig> = {
  health: {
    id: 'health',
    label: 'Health & Wellness',
    phases: [
      { id: 'personal', label: 'Personal & Body Stats', icon: 'person', screens: ['basicProfile'] },
      {
        id: 'lifestyle',
        label: 'Lifestyle & Health',
        icon: 'calendar',
        screens: ['lifestylePreferences', 'healthGoals'],
      },
      {
        id: 'diet',
        label: 'Daily Diet',
        icon: 'restaurant',
        screens: ['dietMorning', 'dietMidday', 'dietEvening'],
      },
      { id: 'bmiResult', label: 'BMI Summary', icon: 'checkbox', screens: ['bmiResult'] },
      { id: 'dietPlan', label: 'AI Diet Plan', icon: 'sparkles', screens: ['dietPlanGenerate'] },
    ],
  },
};
