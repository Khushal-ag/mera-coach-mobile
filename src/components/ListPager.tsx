import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontFamily, IconSize, PressOpacity, Radius, Spacing } from '../constants/theme';

export function visiblePageNumbers(current: number, total: number): number[] {
  if (total <= 0) return [];
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  const start = Math.max(1, Math.min(current - 1, total - 2));
  return [start, start + 1, start + 2].filter(p => p <= total);
}

interface ListPagerProps {
  page: number;
  totalPages: number;
  onChangePage: (page: number) => void;
  /** Circle dots (coach directory) vs square + Next (leads / checkups). */
  variant?: 'circle' | 'square';
  alwaysShow?: boolean;
}

export default function ListPager({
  page,
  totalPages,
  onChangePage,
  variant = 'circle',
  alwaysShow = false,
}: ListPagerProps) {
  if (totalPages < 1 || (!alwaysShow && totalPages <= 1)) return null;

  const safePage = Math.min(Math.max(1, page), totalPages);
  const pageNumbers = visiblePageNumbers(safePage, totalPages);

  if (variant === 'square') {
    return (
      <View style={styles.squareRow}>
        {safePage > 1 ? (
          <TouchableOpacity
            style={styles.stepBtn}
            onPress={() => onChangePage(safePage - 1)}
            activeOpacity={PressOpacity.default}
            accessibilityRole="button"
            accessibilityLabel="Previous page"
          >
            <Text style={styles.stepText}>{'< Prev'}</Text>
          </TouchableOpacity>
        ) : null}
        {pageNumbers.map(num => {
          const active = num === safePage;
          return (
            <TouchableOpacity
              key={num}
              style={[styles.squareBtn, active && styles.squareBtnActive]}
              onPress={() => onChangePage(num)}
              activeOpacity={PressOpacity.default}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`Page ${num}`}
            >
              <Text style={[styles.squareText, active && styles.squareTextActive]}>{num}</Text>
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity
          style={styles.stepBtn}
          onPress={() => onChangePage(Math.min(totalPages, safePage + 1))}
          disabled={safePage >= totalPages}
          activeOpacity={PressOpacity.default}
          accessibilityRole="button"
          accessibilityLabel="Next page"
        >
          <Text style={[styles.stepText, safePage >= totalPages && styles.stepDisabled]}>
            Next {'>'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const atFirst = safePage <= 1;
  const atLast = safePage >= totalPages;

  return (
    <View style={styles.circleRow}>
      <TouchableOpacity
        style={styles.chevron}
        onPress={() => onChangePage(safePage - 1)}
        disabled={atFirst}
        activeOpacity={PressOpacity.default}
        accessibilityRole="button"
        accessibilityLabel="Previous page"
        accessibilityState={{ disabled: atFirst }}
      >
        <Ionicons
          name="chevron-back-outline"
          size={IconSize.sm}
          color={atFirst ? Colors.textLight : Colors.textDark}
        />
      </TouchableOpacity>
      {pageNumbers.map(num => {
        const active = num === safePage;
        return (
          <TouchableOpacity
            key={num}
            style={[styles.circleDot, active && styles.circleDotActive]}
            onPress={() => onChangePage(num)}
            activeOpacity={PressOpacity.default}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`Page ${num}`}
          >
            <Text style={[styles.circleText, active && styles.circleTextActive]}>{num}</Text>
          </TouchableOpacity>
        );
      })}
      <TouchableOpacity
        style={styles.chevron}
        onPress={() => onChangePage(safePage + 1)}
        disabled={atLast}
        activeOpacity={PressOpacity.default}
        accessibilityRole="button"
        accessibilityLabel="Next page"
        accessibilityState={{ disabled: atLast }}
      >
        <Ionicons
          name="chevron-forward-outline"
          size={IconSize.sm}
          color={atLast ? Colors.textLight : Colors.textDark}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  circleRow: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.white,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.explorePanelBorder,
  },
  chevron: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.exploreCanvas,
  },
  circleDotActive: {
    backgroundColor: Colors.accentInk,
  },
  circleText: {
    fontSize: 13,
    fontFamily: FontFamily.semibold,
    color: Colors.accentInk,
  },
  circleTextActive: {
    color: Colors.white,
    fontFamily: FontFamily.bold,
  },
  squareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: Spacing.xxs,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  squareBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.xs,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  squareBtnActive: {
    backgroundColor: Colors.accentInk,
    borderColor: Colors.accentInk,
  },
  squareText: {
    fontSize: 13,
    fontFamily: FontFamily.semibold,
    color: Colors.textDark,
  },
  squareTextActive: {
    color: Colors.white,
    fontFamily: FontFamily.bold,
  },
  stepBtn: {
    minHeight: 36,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.xs,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    fontSize: 13,
    fontFamily: FontFamily.semibold,
    color: Colors.textDark,
  },
  stepDisabled: {
    color: Colors.textLight,
  },
});
