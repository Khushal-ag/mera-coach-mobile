import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontFamily, Radius, Spacing, headingFont } from '../../constants/theme';
import { parseDob } from '../../utils/validation';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] as const;
const SHORT_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;
const LONG_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export interface CalendarDatePickerProps {
  visible: boolean;
  title?: string;
  value: Date | null;
  minimumDate?: Date;
  maximumDate?: Date;
  onConfirm: (date: Date) => void;
  onClose: () => void;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function clampToRange(date: Date, minimumDate?: Date, maximumDate?: Date): Date {
  const day = startOfDay(date);
  if (minimumDate && day.getTime() < startOfDay(minimumDate).getTime()) {
    return startOfDay(minimumDate);
  }
  if (maximumDate && day.getTime() > startOfDay(maximumDate).getTime()) {
    return startOfDay(maximumDate);
  }
  return day;
}

function isOutOfRange(date: Date, minimumDate?: Date, maximumDate?: Date): boolean {
  const day = startOfDay(date).getTime();
  if (minimumDate && day < startOfDay(minimumDate).getTime()) return true;
  if (maximumDate && day > startOfDay(maximumDate).getTime()) return true;
  return false;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function formatCalendarLabel(date: Date): string {
  return `${date.getDate()} ${SHORT_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export function parseFlexibleDate(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const named = /^(\d{1,2}) ([A-Za-z]{3,9}) (\d{4})$/.exec(trimmed);
  if (named) {
    const day = Number(named[1]);
    const token = named[2]!.toLowerCase();
    const longIndex = LONG_MONTHS.findIndex(month => month.toLowerCase() === token);
    const shortIndex = SHORT_MONTHS.findIndex(month => month.toLowerCase() === token.slice(0, 3));
    const monthIndex = longIndex >= 0 ? longIndex : shortIndex;
    const year = Number(named[3]);
    if (monthIndex < 0) return null;
    const parsed = new Date(year, monthIndex, day);
    if (
      parsed.getFullYear() === year &&
      parsed.getMonth() === monthIndex &&
      parsed.getDate() === day
    ) {
      return parsed;
    }
    return null;
  }

  return parseDob(trimmed);
}

export function CalendarDatePicker({
  visible,
  title = 'Date',
  value,
  minimumDate,
  maximumDate,
  onConfirm,
  onClose,
}: CalendarDatePickerProps) {
  const insets = useSafeAreaInsets();
  const wasVisible = useRef(false);
  const [draft, setDraft] = useState(() =>
    clampToRange(value ?? new Date(), minimumDate, maximumDate),
  );
  const [cursor, setCursor] = useState(() => new Date(draft.getFullYear(), draft.getMonth(), 1));
  const [pickingYear, setPickingYear] = useState(false);

  useEffect(() => {
    if (!visible) {
      wasVisible.current = false;
      return;
    }
    if (wasVisible.current) return;
    wasVisible.current = true;
    const next = clampToRange(value ?? new Date(), minimumDate, maximumDate);
    setDraft(next);
    setCursor(new Date(next.getFullYear(), next.getMonth(), 1));
    setPickingYear(false);
  }, [visible, value, minimumDate, maximumDate]);

  const today = new Date();
  const minYear = minimumDate?.getFullYear() ?? today.getFullYear() - 100;
  const maxYear = maximumDate?.getFullYear() ?? today.getFullYear() + 20;
  const years = useMemo(() => {
    const list: number[] = [];
    for (let year = maxYear; year >= minYear; year -= 1) list.push(year);
    return list;
  }, [maxYear, minYear]);

  const floorMonth = minimumDate
    ? minimumDate.getFullYear() * 12 + minimumDate.getMonth()
    : minYear * 12;
  const ceilMonth = maximumDate
    ? maximumDate.getFullYear() * 12 + maximumDate.getMonth()
    : maxYear * 12 + 11;
  const cursorMonth = cursor.getFullYear() * 12 + cursor.getMonth();
  const canGoBack = cursorMonth - 1 >= floorMonth;
  const canGoForward = cursorMonth + 1 <= ceilMonth;

  const dayCount = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const leading = new Date(cursor.getFullYear(), cursor.getMonth(), 1).getDay();
  const cells: (number | null)[] = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: dayCount }, (_, index) => index + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const shiftMonth = (delta: number) => {
    const nextIndex = cursorMonth + delta;
    if (nextIndex < floorMonth || nextIndex > ceilMonth) return;
    const year = Math.floor(nextIndex / 12);
    const month = nextIndex % 12;
    setCursor(new Date(year, month, 1));
  };

  const selectYear = (year: number) => {
    let month = cursor.getMonth();
    const minMonth = minimumDate && year === minimumDate.getFullYear() ? minimumDate.getMonth() : 0;
    const maxMonth =
      maximumDate && year === maximumDate.getFullYear() ? maximumDate.getMonth() : 11;
    if (month < minMonth) month = minMonth;
    if (month > maxMonth) month = maxMonth;
    setCursor(new Date(year, month, 1));
    setPickingYear(false);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.dismiss} onPress={onClose} activeOpacity={1} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, Spacing.lg) }]}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Text style={styles.cancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity
              onPress={() => onConfirm(draft)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Done"
            >
              <Text style={styles.done}>Done</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.nav}>
            <TouchableOpacity
              onPress={() => shiftMonth(-1)}
              disabled={!canGoBack}
              style={[styles.navButton, !canGoBack && styles.navButtonDisabled]}
              accessibilityRole="button"
              accessibilityLabel="Previous month"
            >
              <Ionicons name="chevron-back" size={20} color={Colors.accentInk} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setPickingYear(open => !open)}
              accessibilityRole="button"
              accessibilityLabel={
                pickingYear ? 'Back to calendar' : `Choose year, ${cursor.getFullYear()}`
              }
            >
              <Text style={styles.monthLabel}>
                {LONG_MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => shiftMonth(1)}
              disabled={!canGoForward}
              style={[styles.navButton, !canGoForward && styles.navButtonDisabled]}
              accessibilityRole="button"
              accessibilityLabel="Next month"
            >
              <Ionicons name="chevron-forward" size={20} color={Colors.accentInk} />
            </TouchableOpacity>
          </View>

          {pickingYear ? (
            <ScrollView style={styles.yearScroll} contentContainerStyle={styles.yearGrid}>
              {years.map(year => {
                const selected = year === cursor.getFullYear();
                return (
                  <TouchableOpacity
                    key={year}
                    style={[styles.yearCell, selected && styles.yearCellSelected]}
                    onPress={() => selectYear(year)}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={String(year)}
                  >
                    <Text style={[styles.yearText, selected && styles.yearTextSelected]}>
                      {year}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : (
            <View style={styles.grid}>
              {WEEKDAYS.map(label => (
                <View key={label} style={styles.weekdayCell}>
                  <Text style={styles.weekday}>{label}</Text>
                </View>
              ))}
              {cells.map((day, index) => {
                if (day == null) {
                  return <View key={`empty-${index}`} style={styles.dayCell} />;
                }
                const date = new Date(cursor.getFullYear(), cursor.getMonth(), day);
                const disabled = isOutOfRange(date, minimumDate, maximumDate);
                const selected = sameDay(date, draft);
                const isToday = sameDay(date, today);
                return (
                  <View
                    key={`${cursor.getFullYear()}-${cursor.getMonth()}-${day}`}
                    style={styles.dayCell}
                  >
                    <TouchableOpacity
                      style={[
                        styles.dayButton,
                        isToday && !selected && styles.dayToday,
                        selected && styles.daySelected,
                      ]}
                      disabled={disabled}
                      onPress={() => setDraft(date)}
                      accessibilityRole="button"
                      accessibilityState={{ selected, disabled }}
                      accessibilityLabel={`${day} ${LONG_MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          disabled && styles.dayTextDisabled,
                          selected && styles.dayTextSelected,
                        ]}
                      >
                        {day}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}

          <Text style={styles.preview}>{formatCalendarLabel(draft)}</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: Colors.scrim,
  },
  dismiss: { flex: 1 },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  title: { fontSize: 15, fontFamily: headingFont.bold, color: Colors.textDark },
  cancel: { fontSize: 16, fontFamily: FontFamily.semibold, color: Colors.textLight },
  done: { fontSize: 16, fontFamily: FontFamily.bold, color: Colors.primary },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  navButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonDisabled: { opacity: 0.3 },
  monthLabel: {
    fontSize: 16,
    fontFamily: headingFont.bold,
    color: Colors.textDark,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: Spacing.sm,
  },
  weekdayCell: {
    width: '14.285%',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  weekday: {
    fontSize: 12,
    fontFamily: FontFamily.semibold,
    color: Colors.textLight,
  },
  dayCell: {
    width: '14.285%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  dayButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayToday: {
    borderWidth: 1,
    borderColor: Colors.secondary,
  },
  daySelected: {
    backgroundColor: Colors.accentInk,
  },
  dayText: {
    fontSize: 15,
    fontFamily: FontFamily.medium,
    color: Colors.textDark,
  },
  dayTextDisabled: { color: Colors.border },
  dayTextSelected: { color: Colors.white, fontFamily: FontFamily.bold },
  preview: {
    textAlign: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
    fontSize: 14,
    fontFamily: FontFamily.semibold,
    color: Colors.primary,
  },
  yearScroll: { maxHeight: 280, marginTop: Spacing.sm },
  yearGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  yearCell: {
    width: '25%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
  },
  yearCellSelected: {
    backgroundColor: Colors.accentInk,
    borderRadius: Radius.sm,
  },
  yearText: {
    fontSize: 15,
    fontFamily: FontFamily.medium,
    color: Colors.textDark,
  },
  yearTextSelected: { color: Colors.white, fontFamily: FontFamily.bold },
});
