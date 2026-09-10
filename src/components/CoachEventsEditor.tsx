import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontFamily, Radius, Spacing } from '../constants/theme';
import FormFieldLabel from './FormFieldLabel';
import type { CoachEvent } from '../types/models';
import { MAX_COACH_EVENTS, createEmptyEvent } from '../utils/coachEvents';

interface Props {
  events: CoachEvent[];
  onChange: (next: CoachEvent[]) => void;
}

export default function CoachEventsEditor({ events, onChange }: Props) {
  const updateAt = (index: number, patch: Partial<CoachEvent>) => {
    onChange(events.map((e, i) => (i === index ? { ...e, ...patch } : e)));
  };

  const removeAt = (index: number) => {
    onChange(events.filter((_, i) => i !== index));
  };

  const addEvent = () => {
    if (events.length >= MAX_COACH_EVENTS) return;
    onChange([...events, createEmptyEvent()]);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionTitle}>Events</Text>
      <Text style={styles.hint}>
        Showcase workshops, bootcamps, or group sessions. Upcoming ones appear on your public
        profile.
      </Text>

      {events.map((event, index) => (
        <View key={event.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Event {index + 1}</Text>
            <TouchableOpacity
              onPress={() => removeAt(index)}
              accessibilityRole="button"
              accessibilityLabel={`Remove event ${index + 1}`}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="trash-outline" size={18} color={Colors.destructive} />
            </TouchableOpacity>
          </View>
          <Field
            label="Title"
            required
            value={event.title}
            onChangeText={v => updateAt(index, { title: v })}
            placeholder="e.g. Sunday yoga outdoors"
          />
          <View style={styles.row}>
            <View style={styles.half}>
              <Field
                label="Date"
                value={event.date}
                onChangeText={v => updateAt(index, { date: v })}
                placeholder="YYYY-MM-DD or DD/MM/YYYY"
                autoCapitalize="none"
              />
            </View>
            <View style={styles.half}>
              <Field
                label="Time (optional)"
                value={event.time}
                onChangeText={v => updateAt(index, { time: v })}
                placeholder="e.g. 7:00 AM"
              />
            </View>
          </View>
          <Field
            label="Location / city"
            value={event.location}
            onChangeText={v => updateAt(index, { location: v })}
            placeholder="e.g. Indiranagar, Bangalore"
          />
          <Field
            label="Link (optional)"
            value={event.link}
            onChangeText={v => updateAt(index, { link: v })}
            placeholder="WhatsApp, Maps, or registration URL"
            autoCapitalize="none"
          />
        </View>
      ))}

      {events.length < MAX_COACH_EVENTS ? (
        <TouchableOpacity style={styles.addBtn} onPress={addEvent}>
          <Ionicons name="add-circle-outline" size={18} color={Colors.secondary} />
          <Text style={styles.addBtnText}>Add event</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  required,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}) {
  return (
    <View style={styles.field}>
      <FormFieldLabel required={required}>{label}</FormFieldLabel>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textLight}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCapitalize === 'none' ? false : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: Spacing.md },
  sectionTitle: {
    fontSize: 15,
    fontFamily: FontFamily.bold,
    color: Colors.textDark,
    marginBottom: 8,
  },
  hint: {
    fontSize: 11,
    fontFamily: FontFamily.regular,
    color: Colors.textLight,
    lineHeight: 16,
    marginBottom: Spacing.md,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  cardTitle: { fontSize: 13, fontFamily: FontFamily.bold, color: Colors.secondary },
  field: { marginBottom: 12 },
  input: {
    backgroundColor: Colors.background,
    borderRadius: Radius.sm,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 14,
    fontFamily: FontFamily.regular,
    color: Colors.textDark,
  },
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 8,
  },
  addBtnText: { fontSize: 13, fontFamily: FontFamily.bold, color: Colors.secondary },
});
