import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

export type ExpertiseIcon = ComponentProps<typeof Ionicons>['name'];

/** Best-effort Ionicon for a public-profile expertise chip label. */
export function iconForExpertise(tag: string): ExpertiseIcon {
  const key = tag.toLowerCase();
  if (key.includes('weight') && key.includes('loss')) return 'trending-down-outline';
  if (key.includes('weight') && key.includes('gain')) return 'trending-up-outline';
  if (key.includes('skin')) return 'sparkles-outline';
  if (key.includes('energy') || key.includes('fitness')) return 'flash-outline';
  if (key.includes('digest')) return 'nutrition-outline';
  if (key.includes('bone')) return 'body-outline';
  if (key.includes('joint')) return 'walk-outline';
  if (key.includes('heart') || key.includes('cardio')) return 'heart-outline';
  if (key.includes('brain')) return 'bulb-outline';
  if (key.includes('women') || key.includes('woman')) return 'female-outline';
  if (key.includes("men's") || /\bmen\b/.test(key)) return 'male-outline';
  if (key.includes('breakfast')) return 'sunny-outline';
  if (key.includes('child')) return 'happy-outline';
  if (key.includes('sleep') || key.includes('stress')) return 'moon-outline';
  if (key.includes('yoga') || key.includes('mind')) return 'leaf-outline';
  if (key.includes('diet') || key.includes('nutrition') || key.includes('food'))
    return 'restaurant-outline';
  if (key.includes('sport') || key.includes('athlete') || key.includes('strength'))
    return 'barbell-outline';
  return 'medal-outline';
}
