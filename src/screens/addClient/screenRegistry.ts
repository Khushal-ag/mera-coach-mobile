import BasicProfileStep from './steps/BasicProfileStep';
import LifestylePreferencesStep from './steps/LifestylePreferencesStep';
import HealthGoalsStep from './steps/HealthGoalsStep';
import DietPairStep from './steps/DietPairStep';
import BmiResultStep from './steps/BmiResultStep';
import type { WizardScreen } from '../../types/wizard';

export interface DietScreenConfig {
  id: string;
  title: string;
  subtitle: string;
  slotIds: string[];
}

export const DIET_SCREENS: DietScreenConfig[] = [
  {
    id: 'dietMorning',
    title: 'Morning Meals',
    subtitle: 'Early Morning & Breakfast',
    slotIds: ['earlyMorning', 'breakfast'],
  },
  {
    id: 'dietMidday',
    title: 'Midday Meals',
    subtitle: 'Mid-Morning Snack & Lunch',
    slotIds: ['midMorningSnack', 'lunch'],
  },
  {
    id: 'dietEvening',
    title: 'Evening Meals',
    subtitle: 'Evening Snack & Dinner',
    slotIds: ['eveningSnack', 'dinner'],
  },
];

const mealScreens: Record<string, WizardScreen> = {};
DIET_SCREENS.forEach(s => {
  mealScreens[s.id] = {
    id: s.id,
    phaseId: 'diet',
    title: s.title,
    subtitle: s.subtitle,
    icon: 'restaurant',
    Component: DietPairStep as unknown as WizardScreen['Component'],
    componentProps: { slotIds: s.slotIds },
  };
});

export const SCREEN_REGISTRY: Record<string, WizardScreen> = {
  basicProfile: {
    id: 'basicProfile',
    phaseId: 'personal',
    title: 'Personal & Body Stats',
    subtitle: "Client's basic details",
    icon: 'person',
    Component: BasicProfileStep,
  },
  lifestylePreferences: {
    id: 'lifestylePreferences',
    phaseId: 'lifestyle',
    title: 'Lifestyle Preferences',
    subtitle: 'Activity, sleep & food',
    icon: 'walk',
    Component: LifestylePreferencesStep,
  },
  healthGoals: {
    id: 'healthGoals',
    phaseId: 'lifestyle',
    title: 'Health & Goals',
    subtitle: 'Conditions, allergies & targets',
    icon: 'medkit',
    Component: HealthGoalsStep,
  },
  ...mealScreens,
  bmiResult: {
    id: 'bmiResult',
    phaseId: 'bmiResult',
    title: 'BMI Detail',
    subtitle: 'Auto-calculated from height & weight',
    icon: 'checkbox',
    Component: BmiResultStep,
  },
};
