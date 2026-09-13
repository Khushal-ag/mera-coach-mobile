import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COACH_EVENT_IMAGE_DOC_TYPE, COACH_GALLERY_REF_TYPE } from '../../config/appConfig';
import {
  Colors,
  FontFamily,
  FormControl,
  Radius,
  Shadow,
  Spacing,
  formFieldStyles,
  buttonStyles,
} from '../../constants/theme';
import { uploadDocument } from '../../api/documentApi';
import { getErrorMessage } from '../../api/client';
import { getCurrentCoachId } from '../../auth/session';
import FormFieldLabel from '../FormFieldLabel';
import OfferImageField from './OfferImageField';
import type { CoachEvent } from '../../types/models';
import { MAX_COACH_EVENTS, createEmptyEvent } from '../../utils/coachEvents';
import { pickImageFromCameraOrLibrary } from '../../utils/imagePicker';

interface Props {
  events: CoachEvent[];
  onChange: (next: CoachEvent[]) => void;
  coachCode: string;
}

export default function CoachEventsEditor({ events, onChange, coachCode }: Props) {
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const eventsRef = useRef(events);
  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  const commit = (next: CoachEvent[]) => {
    eventsRef.current = next;
    onChange(next);
  };

  const updateAt = (index: number, patch: Partial<CoachEvent>) => {
    commit(eventsRef.current.map((e, i) => (i === index ? { ...e, ...patch } : e)));
  };

  const removeAt = (index: number) => {
    commit(eventsRef.current.filter((_, i) => i !== index));
  };

  const addEvent = () => {
    if (eventsRef.current.length >= MAX_COACH_EVENTS) return;
    commit([...eventsRef.current, createEmptyEvent()]);
  };

  const pickImage = async (index: number) => {
    const event = eventsRef.current[index];
    if (!event || !coachCode) return;

    const picked = await pickImageFromCameraOrLibrary({
      allowsEditing: true,
      aspect: [16, 10],
      quality: 0.75,
    });
    if (!picked) return;

    const previousUrl = event.imageUrl ?? '';
    const eventId = event.id;
    updateAt(index, { imageUrl: picked.uri });
    setUploadingId(eventId);
    try {
      const url = await uploadDocument({
        base64DataUrl: `data:${picked.mimeType};base64,${picked.base64}`,
        coachCode,
        refCode: coachCode,
        refType: COACH_GALLERY_REF_TYPE,
        docType: COACH_EVENT_IMAGE_DOC_TYPE,
        savedBy: Number(getCurrentCoachId()) || 0,
      });
      const latestIndex = eventsRef.current.findIndex(e => e.id === eventId);
      if (latestIndex >= 0) updateAt(latestIndex, { imageUrl: url });
    } catch (err) {
      const latestIndex = eventsRef.current.findIndex(e => e.id === eventId);
      if (latestIndex >= 0) updateAt(latestIndex, { imageUrl: previousUrl });
      Alert.alert(
        'Upload failed',
        getErrorMessage(err, 'Could not upload photo. Please try again.'),
      );
    } finally {
      setUploadingId(null);
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.intro}>
        <View style={styles.introIcon}>
          <Ionicons name="calendar-outline" size={18} color={Colors.secondary} />
        </View>
        <View style={styles.introText}>
          <Text style={styles.sectionTitle}>Events</Text>
          <Text style={styles.hint}>
            Showcase workshops, bootcamps, or group sessions. Upcoming ones appear on your public
            profile. Past events stay here for your records.
          </Text>
        </View>
      </View>

      {events.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="calendar-outline" size={28} color={Colors.textLight} />
          <Text style={styles.emptyTitle}>No events yet</Text>
          <Text style={styles.emptyMessage}>
            Add an upcoming workshop or session with a cover photo for your public profile.
          </Text>
        </View>
      ) : null}

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

          <OfferImageField
            imageUrl={event.imageUrl}
            uploading={uploadingId === event.id}
            onPick={() => void pickImage(index)}
            onRemove={() => updateAt(index, { imageUrl: '' })}
            accessibilityLabel={`event ${index + 1} photo`}
          />

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
          <Ionicons name="add-circle-outline" size={18} color={Colors.white} />
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
  intro: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  introIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Colors.secondaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  introText: { flex: 1 },
  sectionTitle: {
    fontSize: 15,
    fontFamily: FontFamily.bold,
    color: Colors.textDark,
    marginBottom: 4,
  },
  hint: {
    fontSize: 12,
    fontFamily: FontFamily.regular,
    color: Colors.textLight,
    lineHeight: 17,
  },
  emptyCard: {
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    ...Shadow.sm,
  },
  emptyTitle: {
    fontSize: 14,
    fontFamily: FontFamily.bold,
    color: Colors.textDark,
  },
  emptyMessage: {
    fontSize: 12,
    fontFamily: FontFamily.regular,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 17,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadow.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  cardTitle: { fontSize: 13, fontFamily: FontFamily.bold, color: Colors.secondary },
  field: { marginBottom: Spacing.sm },
  input: {
    ...formFieldStyles.wrap,
    ...formFieldStyles.input,
    height: FormControl.searchHeight,
  },
  row: { flexDirection: 'row', gap: Spacing.sm - 2 },
  half: { flex: 1 },
  addBtn: {
    ...buttonStyles.compact,
    alignSelf: 'stretch',
    backgroundColor: Colors.secondary,
    marginTop: Spacing.xxs,
    ...Shadow.sm,
  },
  addBtnText: buttonStyles.compactText,
});
