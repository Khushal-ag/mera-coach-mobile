import React from 'react';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import type { CoachCategory } from '../types/models';
import { parseFontAwesomeGlyph, parseFontAwesomeStyle } from '../utils/fontAwesomeToIonicon';

interface CategoryIconProps {
  category: Pick<CoachCategory, 'icon' | 'faIcon'>;
  size: number;
  color?: string;
}

/** Prefer the API FontAwesome class; fall back to the Ionicons style map. */
export default function CategoryIcon({ category, size, color }: CategoryIconProps) {
  const glyph = parseFontAwesomeGlyph(category.faIcon);
  if (glyph) {
    const faStyle = parseFontAwesomeStyle(category.faIcon);
    return (
      <FontAwesome5
        // API may send glyphs outside the typed FA5 set; runtime still renders known ones.
        name={glyph as React.ComponentProps<typeof FontAwesome5>['name']}
        size={size}
        color={color}
        solid={faStyle === 'solid'}
        brand={faStyle === 'brand'}
      />
    );
  }

  return <Ionicons name={category.icon} size={size} color={color} />;
}
