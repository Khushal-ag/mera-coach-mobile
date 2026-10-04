import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
  TouchableOpacity,
  ScrollView,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Colors,
  FontFamily,
  IconSize,
  PressOpacity,
  Radius,
  ScreenPad,
  Shadow,
  Spacing,
  headingFont,
} from '../../constants/theme';
import FormErrorBanner from '../../components/FormErrorBanner';
import {
  CalendarDatePicker,
  formatCalendarLabel,
  parseFlexibleDate,
} from '../../components/form/CalendarDatePicker';
import KeyboardSafeScroll from '../../components/KeyboardSafeScroll';
import ReloadState from '../../components/ReloadState';
import WaveScreenHeader from '../../components/WaveScreenHeader';
import {
  buildSaveCoachProfileParams,
  getCoachProfileFull,
  saveCoachProfile,
  type CoachProfileFull,
} from '../../api/coachApi';
import { getClientDetail, getClientList } from '../../api/clientApi';
import { getErrorMessage } from '../../api/client';
import { uploadDocument } from '../../api/documentApi';
import { queryKeys, invalidateCoachProfileCaches } from '../../api/queryKeys';
import { COACH_EVENT_IMAGE_DOC_TYPE, COACH_GALLERY_REF_TYPE } from '../../config/appConfig';
import { getDocumentSavedById } from '../../auth/session';
import {
  MAX_COACH_EVENTS,
  createEmptyEvent,
  serializeCoachEvents,
  validateCoachEventsDraft,
} from '../../utils/coachEvents';
import { pickImageFromCameraOrLibrary } from '../../utils/imagePicker';
import { formatLocalDate } from '../../utils/validation';
import { isPendingLocalMediaUrl, resolveMediaUrl } from '../../utils/mediaUrl';
import { navigateToDashboard } from '../../utils/navigationBack';
import type { EventsStackScreenProps } from '../../types/navigation';
import type { IoniconName } from '../../types/icons';
import type { ClientSummary, CoachEvent } from '../../types/models';

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const CANVAS = '#F3FAF7';
const FIELD_MINT = '#E7F6EC';
const UPLOAD_FILL = '#F6FCF8';
const UPLOAD_DASH = '#6FCBAA';
const UNDERLINE_ORANGE = '#F08A2C';
const HINT_BLUE = '#5B6CC4';
const ICON_MUTED = '#8E97A8';
const FIELD_DISABLED_TEXT = '#B4BDB6';
const CHIP_IDLE_BORDER = '#E4E7EC';
const CHIP_IDLE_LABEL = '#5A635E';

type EventCategoryId = 'training' | 'workshop' | 'success';

const CATEGORIES: {
  id: EventCategoryId;
  label: string;
  icon: IoniconName;
  tint: string;
  iconBg: string;
  border: string;
}[] = [
  {
    id: 'training',
    label: 'Training Session',
    icon: 'barbell',
    tint: '#E5F6EA',
    iconBg: Colors.accentInk,
    border: '#2E8A58',
  },
  {
    id: 'workshop',
    label: 'Workshop & Event',
    icon: 'calendar',
    tint: '#F3EAFB',
    iconBg: '#8B63E0',
    border: '#C3A4F4',
  },
  {
    id: 'success',
    label: 'Client Success',
    icon: 'people',
    tint: '#FDE8D4',
    iconBg: '#F08A2C',
    border: '#F0B27A',
  },
];

function approxBase64Bytes(b64: string): number {
  const padding = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((b64.length * 3) / 4) - padding);
}

function fileNameFromUri(uri: string): string {
  const clean = uri.split('?')[0] ?? '';
  try {
    const name = decodeURIComponent(clean.split('/').pop() ?? '');
    return name || 'Selected photo';
  } catch {
    return clean.split('/').pop() || 'Selected photo';
  }
}

function UploadMark() {
  return (
    <View style={styles.uploadMark} accessibilityElementsHidden>
      <Ionicons name="arrow-up" size={20} color={Colors.accentInk} />
      <View style={styles.uploadTray} />
    </View>
  );
}

export default function EditEventsScreen({
  navigation,
  route,
}: EventsStackScreenProps<'AddEvent'>) {
  const eventId = route.params?.eventId;
  const profileQuery = useQuery({
    queryKey: queryKeys.coachProfileFull,
    queryFn: getCoachProfileFull,
  });

  const errorMessage =
    profileQuery.isError && !profileQuery.data
      ? getErrorMessage(profileQuery.error, 'Could not load your events.')
      : null;

  const missingEvent =
    !!eventId &&
    !!profileQuery.data &&
    !(profileQuery.data.events ?? []).some(event => event.id === eventId);

  return (
    <View style={styles.container}>
      <WaveScreenHeader
        title="Add Event"
        onBack={() => navigation.goBack()}
        onHome={() => navigateToDashboard(navigation)}
      />

      {profileQuery.isPending ? (
        <ActivityIndicator color={Colors.secondary} style={{ marginTop: 60 }} />
      ) : errorMessage ? (
        <ReloadState
          title="Could not load events"
          message={errorMessage}
          onRetry={() => void profileQuery.refetch()}
          loading={profileQuery.isFetching}
          showPullHint={false}
        />
      ) : missingEvent ? (
        <ReloadState
          title="Event not found"
          message="This event is no longer on your list."
          onRetry={() => navigation.goBack()}
          retryLabel="Back to events"
          showPullHint={false}
        />
      ) : (
        <AddGalleryEventForm
          profile={profileQuery.data!}
          eventId={eventId}
          onDone={() => navigation.goBack()}
        />
      )}
    </View>
  );
}

function AddGalleryEventForm({
  profile,
  eventId,
  onDone,
}: {
  profile: CoachProfileFull;
  eventId?: string;
  onDone: () => void;
}) {
  const existing = eventId ? (profile.events ?? []).find(event => event.id === eventId) : undefined;
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const locationRef = useRef<TextInput>(null);
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<CoachEvent>(() =>
    existing ? { ...existing, imageUrl: existing.imageUrl ?? '' } : createEmptyEvent(),
  );
  const editingId = existing?.id ?? null;
  const [category, setCategory] = useState<EventCategoryId>('training');
  const [clientCode, setClientCode] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientOpen, setClientOpen] = useState(false);
  const [consent, setConsent] = useState(true);
  const [dateOpen, setDateOpen] = useState(false);
  const [pickedName, setPickedName] = useState(() =>
    existing?.imageUrl ? fileNameFromUri(existing.imageUrl) : '',
  );
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  const showBanner = useCallback((message: string) => {
    setBanner(message);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  const clientsQuery = useQuery({
    queryKey: queryKeys.clientList(profile.coachCode),
    queryFn: () => getClientList({ coachCode: profile.coachCode }),
    enabled: !!profile.coachCode,
  });

  useEffect(() => {
    if (category !== 'success' || !clientCode) return;
    let cancelled = false;
    void getClientDetail({ clientCode })
      .then(detail => {
        if (cancelled) return;
        const loc = detail.location?.trim() ?? '';
        if (!loc) return;
        setDraft(current => (current.location.trim() ? current : { ...current, location: loc }));
      })
      .catch(err => {
        if (cancelled) return;
        showBanner(
          getErrorMessage(err, "Could not load this client's location. You can type it in."),
        );
      });
    return () => {
      cancelled = true;
    };
  }, [category, clientCode, showBanner]);

  const pickImage = async () => {
    if (uploading) return;
    if (!profile.coachCode) {
      showBanner('Your profile is still loading. Try the photo again in a moment.');
      return;
    }
    const picked = await pickImageFromCameraOrLibrary({
      allowsEditing: true,
      aspect: [16, 10],
      quality: 0.75,
    });
    if (!picked) return;
    if (approxBase64Bytes(picked.base64) > MAX_UPLOAD_BYTES) {
      Alert.alert('File too large', 'Photo or video must be 10MB or smaller.');
      return;
    }

    const previousUrl = draft.imageUrl ?? '';
    setPickedName(fileNameFromUri(picked.uri));
    setDraft(current => ({ ...current, imageUrl: picked.uri }));
    setUploading(true);
    try {
      const url = await uploadDocument({
        base64DataUrl: `data:${picked.mimeType};base64,${picked.base64}`,
        coachCode: profile.coachCode,
        refCode: profile.coachCode,
        refType: COACH_GALLERY_REF_TYPE,
        docType: COACH_EVENT_IMAGE_DOC_TYPE,
        savedBy: getDocumentSavedById(),
      });
      setDraft(current => ({ ...current, imageUrl: url }));
    } catch (err) {
      setDraft(current => ({ ...current, imageUrl: previousUrl }));
      setPickedName(previousUrl ? fileNameFromUri(previousUrl) : '');
      Alert.alert(
        'Upload failed',
        getErrorMessage(err, 'Could not upload photo. Please try again.'),
      );
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (saving) return;
    if (!draft.title.trim()) {
      showBanner('Add a title before publishing.');
      return;
    }
    if (!consent) {
      showBanner('Confirm you have the right to share this content.');
      return;
    }
    if (category === 'success' && !clientCode) {
      showBanner('Select a client for Client Success.');
      return;
    }
    if (uploading || isPendingLocalMediaUrl(draft.imageUrl)) {
      showBanner('Please wait for the photo upload to finish.');
      return;
    }

    const source = profile.events ?? [];
    const isEdit = editingId != null && source.some(event => event.id === editingId);
    if (!isEdit && source.length >= MAX_COACH_EVENTS) {
      showBanner(`You can add up to ${MAX_COACH_EVENTS} events.`);
      return;
    }

    const next = isEdit
      ? source.map(event => (event.id === editingId ? { ...draft } : event))
      : [...source, { ...draft }];

    const eventsError = validateCoachEventsDraft(next);
    if (eventsError) {
      showBanner(eventsError);
      return;
    }
    if (next.some(event => isPendingLocalMediaUrl(event.imageUrl))) {
      showBanner('Please wait for the photo upload to finish.');
      return;
    }

    setBanner(null);
    setSaving(true);
    try {
      const serialized = serializeCoachEvents(next);
      const latest = await getCoachProfileFull();
      await saveCoachProfile(
        buildSaveCoachProfileParams(latest, {
          events: serialized,
        }),
      );
      invalidateCoachProfileCaches(queryClient, latest.coachCode);
      Alert.alert('Events saved', 'Your events have been updated.', [
        { text: 'OK', onPress: onDone },
      ]);
    } catch (err) {
      setSaving(false);
      showBanner(getErrorMessage(err, 'Could not save this event. Please try again.'));
    }
  };

  const parsedDate = parseFlexibleDate(draft.date);
  const dateLabel = parsedDate ? formatCalendarLabel(parsedDate) : draft.date.trim();
  const previewUri = resolveMediaUrl(draft.imageUrl);
  const publishDisabled = saving || uploading;
  const clientEnabled = category === 'success';
  const clientLabel = clientEnabled && clientName ? clientName : 'Select Client';

  return (
    <KeyboardSafeScroll
      ref={scrollRef}
      style={styles.body}
      contentContainerStyle={styles.bodyContent}
      keyboardShouldPersistTaps="handled"
    >
      <FormErrorBanner message={banner} />

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Category</Text>
        <View style={styles.underline} />
        <View style={styles.chipRow}>
          {CATEGORIES.map(item => {
            const selected = category === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.chip,
                  selected
                    ? { backgroundColor: item.tint, borderColor: item.border }
                    : styles.chipIdle,
                ]}
                onPress={() => {
                  setCategory(item.id);
                  if (item.id !== 'success') {
                    setClientCode('');
                    setClientName('');
                    setClientOpen(false);
                  }
                }}
                activeOpacity={PressOpacity.default}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={item.label}
              >
                <View style={[styles.chipIcon, { backgroundColor: item.iconBg }]}>
                  <Ionicons name={item.icon} size={14} color={Colors.white} />
                </View>
                <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Add Photo / Video</Text>
        <View style={styles.underline} />
        <TouchableOpacity
          style={styles.uploadBox}
          onPress={() => void pickImage()}
          disabled={uploading}
          activeOpacity={PressOpacity.default}
          accessibilityRole="button"
          accessibilityLabel={previewUri ? 'Change photo or video' : 'Click to upload'}
        >
          {previewUri ? (
            <View style={styles.previewWrap}>
              <Image source={{ uri: previewUri }} style={styles.preview} />
              <Text style={styles.previewName} numberOfLines={1}>
                {pickedName || fileNameFromUri(draft.imageUrl ?? '')}
              </Text>
              {uploading ? (
                <ActivityIndicator color={Colors.accentInk} style={styles.previewSpinner} />
              ) : null}
            </View>
          ) : (
            <View style={styles.uploadEmpty}>
              {uploading ? <ActivityIndicator color={Colors.accentInk} /> : <UploadMark />}
              <Text style={styles.uploadTitle}>Click to upload</Text>
              <Text style={styles.uploadHint}>Photo or Video (Max 10MB)</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.fieldLabel}>Client</Text>
        <TouchableOpacity
          style={styles.field}
          onPress={() => {
            if (!clientEnabled) return;
            setClientOpen(true);
          }}
          disabled={!clientEnabled}
          activeOpacity={PressOpacity.default}
          accessibilityRole="button"
          accessibilityState={{ disabled: !clientEnabled }}
          accessibilityLabel={
            clientEnabled && clientName ? `Client: ${clientName}` : 'Select Client'
          }
        >
          <Text
            style={[
              clientEnabled && clientName ? styles.fieldValue : styles.fieldPlaceholder,
              !clientEnabled && styles.fieldTextDisabled,
            ]}
            numberOfLines={1}
          >
            {clientLabel}
          </Text>
          <Ionicons
            name="chevron-down"
            size={IconSize.sm}
            color={clientEnabled ? ICON_MUTED : FIELD_DISABLED_TEXT}
            style={styles.fieldChevron}
          />
        </TouchableOpacity>
        <Text style={styles.hint}>(only for client Success)</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.fieldLabel}>Title</Text>
        <View style={styles.field}>
          <TextInput
            style={styles.input}
            value={draft.title}
            onChangeText={title => setDraft(current => ({ ...current, title }))}
            placeholder="Enter title here.."
            placeholderTextColor={Colors.textLight}
          />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.fieldLabel}>Date</Text>
        <TouchableOpacity
          style={styles.field}
          onPress={() => setDateOpen(true)}
          activeOpacity={PressOpacity.default}
          accessibilityRole="button"
          accessibilityLabel={dateLabel ? `Date: ${dateLabel}` : 'Select date'}
        >
          <Ionicons
            name="calendar-outline"
            size={IconSize.md}
            color={ICON_MUTED}
            style={styles.fieldIcon}
          />
          <Text style={dateLabel ? styles.fieldValue : styles.fieldPlaceholder}>
            {dateLabel || 'Select date'}
          </Text>
        </TouchableOpacity>
      </View>

      <CalendarDatePicker
        visible={dateOpen}
        title="Date"
        value={parsedDate}
        onConfirm={date => {
          setDraft(current => ({ ...current, date: formatLocalDate(date) }));
          setDateOpen(false);
        }}
        onClose={() => setDateOpen(false)}
      />

      <View style={styles.card}>
        <View style={styles.labelRow}>
          <Text style={styles.fieldLabel}>Location</Text>
          <TouchableOpacity
            onPress={() => locationRef.current?.focus()}
            accessibilityRole="button"
            accessibilityLabel="Edit location"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="create-outline" size={18} color={Colors.textDark} />
          </TouchableOpacity>
        </View>
        <View style={styles.field}>
          <Ionicons
            name="location-outline"
            size={IconSize.md}
            color={ICON_MUTED}
            style={styles.fieldIcon}
          />
          <TextInput
            ref={locationRef}
            style={styles.input}
            value={draft.location}
            onChangeText={location => setDraft(current => ({ ...current, location }))}
            placeholder="Enter Location Here"
            placeholderTextColor={Colors.textLight}
          />
        </View>
        <Text style={[styles.hint, styles.hintBlue]}>
          (You can auto populate the client location for success)
        </Text>

        <TouchableOpacity
          style={styles.consent}
          onPress={() => setConsent(value => !value)}
          activeOpacity={PressOpacity.default}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: consent }}
          accessibilityLabel="By publishing, you confirm that you have the right to share this content."
        >
          <View style={[styles.check, !consent && styles.checkOff]}>
            {consent ? <Ionicons name="checkmark" size={14} color={Colors.white} /> : null}
          </View>
          <Text style={styles.consentText}>
            By publishing, you confirm that you have the right to share this content.
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.publish, publishDisabled && styles.publishDisabled]}
          onPress={() => void handleSave()}
          disabled={publishDisabled}
          activeOpacity={PressOpacity.default}
          accessibilityRole="button"
          accessibilityLabel="Publish"
          accessibilityState={{ disabled: publishDisabled, busy: saving }}
        >
          {saving ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <>
              <Text style={styles.publishLabel}>Publish</Text>
              <View style={styles.publishArrow}>
                <Ionicons name="arrow-forward" size={IconSize.sm} color={Colors.accentInk} />
              </View>
            </>
          )}
        </TouchableOpacity>
      </View>

      <Modal
        visible={clientOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setClientOpen(false)}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setClientOpen(false)}
        >
          <View
            style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>Select Client</Text>
            <ScrollView
              style={styles.optionList}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {clientsQuery.isPending ? (
                <ActivityIndicator color={Colors.secondary} style={styles.optionSpinner} />
              ) : clientsQuery.isError ? (
                <View style={styles.optionError}>
                  <Text style={styles.emptyText}>
                    {getErrorMessage(clientsQuery.error, 'Could not load clients.')}
                  </Text>
                  <TouchableOpacity
                    onPress={() => void clientsQuery.refetch()}
                    disabled={clientsQuery.isFetching}
                    accessibilityRole="button"
                    accessibilityLabel="Try again"
                  >
                    {clientsQuery.isFetching ? (
                      <ActivityIndicator color={Colors.secondary} />
                    ) : (
                      <Text style={styles.retryText}>Try again</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ) : (clientsQuery.data ?? []).length === 0 ? (
                <Text style={styles.emptyText}>No clients yet</Text>
              ) : (
                (clientsQuery.data ?? []).map(client => (
                  <ClientOption
                    key={client.clientCode || client.name}
                    client={client}
                    selected={client.clientCode === clientCode}
                    onPress={() => {
                      setClientCode(client.clientCode ?? '');
                      setClientName(client.name);
                      setClientOpen(false);
                    }}
                  />
                ))
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardSafeScroll>
  );
}

function ClientOption({
  client,
  selected,
  onPress,
}: {
  client: ClientSummary;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.option}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={client.name}
    >
      <Text style={[styles.optionText, selected && styles.optionTextSelected]} numberOfLines={1}>
        {client.name}
      </Text>
      {selected ? <Ionicons name="checkmark" size={18} color={Colors.accentInk} /> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CANVAS },
  body: { flex: 1, backgroundColor: CANVAS },
  bodyContent: {
    paddingHorizontal: ScreenPad.horizontal,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadow.sm,
  },
  cardTitle: {
    fontFamily: headingFont.bold,
    fontSize: 18,
    lineHeight: 24,
    color: Colors.textDark,
  },
  fieldLabel: {
    fontFamily: headingFont.bold,
    fontSize: 18,
    lineHeight: 24,
    color: Colors.textDark,
    marginBottom: Spacing.sm,
  },
  underline: {
    width: 36,
    height: 3,
    borderRadius: 2,
    backgroundColor: UNDERLINE_ORANGE,
    marginTop: 4,
    marginBottom: Spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 6,
  },
  chip: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 78,
    paddingHorizontal: 4,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  chipIdle: {
    backgroundColor: Colors.white,
    borderColor: CHIP_IDLE_BORDER,
  },
  chipIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipLabel: {
    alignSelf: 'stretch',
    textAlign: 'center',
    fontFamily: FontFamily.semibold,
    fontSize: 13,
    lineHeight: 16,
    color: CHIP_IDLE_LABEL,
  },
  chipLabelSelected: {
    color: Colors.textDark,
  },
  uploadBox: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: UPLOAD_DASH,
    borderRadius: 16,
    backgroundColor: UPLOAD_FILL,
    minHeight: 156,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
  },
  uploadMark: {
    alignItems: 'center',
    marginBottom: 2,
  },
  uploadTray: {
    width: 26,
    height: 13,
    marginTop: -1,
    borderLeftWidth: 2.5,
    borderRightWidth: 2.5,
    borderBottomWidth: 2.5,
    borderColor: Colors.accentInk,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
  uploadEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  uploadTitle: {
    marginTop: Spacing.xs,
    fontFamily: FontFamily.bold,
    fontSize: 16,
    lineHeight: 22,
    color: Colors.textDark,
  },
  uploadHint: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textLight,
  },
  previewWrap: {
    width: '100%',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  preview: {
    width: '100%',
    height: 120,
    borderRadius: 12,
    backgroundColor: Colors.background,
  },
  previewName: {
    alignSelf: 'stretch',
    fontFamily: FontFamily.medium,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.accentInk,
  },
  previewSpinner: { marginTop: 2 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: FIELD_MINT,
    paddingHorizontal: Spacing.sm,
  },
  fieldIcon: { marginRight: Spacing.xs },
  input: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.accentInk,
    paddingVertical: 0,
  },
  fieldValue: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.accentInk,
  },
  fieldPlaceholder: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textLight,
  },
  fieldTextDisabled: {
    color: FIELD_DISABLED_TEXT,
  },
  fieldChevron: {
    marginLeft: Spacing.xs,
  },
  hint: {
    marginTop: Spacing.xs,
    fontFamily: FontFamily.regular,
    fontSize: 12,
    lineHeight: 17,
    color: Colors.textLight,
  },
  hintBlue: {
    color: HINT_BLUE,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  consent: {
    marginTop: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: UPLOAD_FILL,
    borderRadius: 12,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: Colors.accentInk,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOff: {
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.accentInk,
  },
  consentText: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: 12,
    lineHeight: 17,
    color: HINT_BLUE,
  },
  publish: {
    marginTop: Spacing.md,
    minHeight: 56,
    borderRadius: Radius.pill,
    backgroundColor: Colors.accentInk,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  publishDisabled: { opacity: 0.55 },
  publishLabel: {
    color: Colors.white,
    fontFamily: headingFont.semibold,
    fontSize: 18,
    lineHeight: 24,
  },
  publishArrow: {
    position: 'absolute',
    right: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: {
    flex: 1,
    backgroundColor: Colors.scrim,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    paddingTop: Spacing.sm,
    maxHeight: '70%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  sheetTitle: {
    fontFamily: headingFont.bold,
    fontSize: 16,
    color: Colors.textDark,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  optionList: { paddingHorizontal: Spacing.md },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  optionText: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: 15,
    color: Colors.textDark,
    marginRight: Spacing.sm,
  },
  optionTextSelected: {
    fontFamily: FontFamily.semibold,
    color: Colors.accentInk,
  },
  optionSpinner: { marginVertical: Spacing.lg },
  emptyText: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.textLight,
    paddingVertical: Spacing.md,
  },
  optionError: {
    alignItems: 'flex-start',
    paddingBottom: Spacing.md,
  },
  retryText: {
    fontFamily: FontFamily.semibold,
    fontSize: 14,
    color: Colors.accentInk,
  },
});
