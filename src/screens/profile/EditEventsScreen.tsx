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
  HitSlop,
  IconSize,
  PressOpacity,
  Radius,
  ScreenPad,
  Shadow,
  Spacing,
  Typography,
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
import { getCoachProfileFull } from '../../api/coachApi';
import { getClientDetail, getClientList } from '../../api/clientApi';
import { getErrorMessage } from '../../api/client';
import { uploadDocument } from '../../api/documentApi';
import { queryKeys } from '../../api/queryKeys';
import {
  getMyPosts,
  getPostCategories,
  savePost,
  POST_CATEGORY,
  POST_DESCRIPTION_MAX,
  POST_LOCATION_MAX,
  POST_MEDIA_DOC_TYPE,
  POST_MEDIA_MAX_BYTES,
  POST_TITLE_MAX,
  type CoachPost,
  type PostCategoryOption,
} from '../../api/showcaseApi';
import { COACH_GALLERY_REF_TYPE } from '../../config/appConfig';
import { getDocumentSavedById } from '../../auth/session';
import { pickPostMedia } from '../../utils/postMediaPicker';
import { formatLocalDate } from '../../utils/validation';
import { isPendingLocalMediaUrl, resolveMediaUrl } from '../../utils/mediaUrl';
import { navigateToDashboard } from '../../utils/navigationBack';
import type { EventsStackScreenProps } from '../../types/navigation';
import type { IoniconName } from '../../types/icons';
import type { ClientSummary } from '../../types/models';

const CANVAS = '#F3FAF7';
const FIELD_MINT = '#E7F6EC';
const UPLOAD_FILL = '#F6FCF8';
const UPLOAD_DASH = '#6FCBAA';
const UNDERLINE_ORANGE = '#F08A2C';
const HINT_BLUE = '#5B6CC4';
const ICON_MUTED = '#8E97A8';
const CHIP_IDLE_BORDER = '#E4E7EC';
const CHIP_IDLE_LABEL = '#5A635E';

/** Look of each category chip; the list itself comes from the category master. */
const CATEGORY_LOOK: Record<
  string,
  { icon: IoniconName; tint: string; iconBg: string; border: string }
> = {
  [POST_CATEGORY.gallery]: {
    icon: 'barbell',
    tint: '#E5F6EA',
    iconBg: Colors.accentInk,
    border: '#2E8A58',
  },
  [POST_CATEGORY.event]: {
    icon: 'calendar',
    tint: '#F3EAFB',
    iconBg: '#8B63E0',
    border: '#C3A4F4',
  },
  [POST_CATEGORY.success]: {
    icon: 'people',
    tint: '#FDE8D4',
    iconBg: '#F08A2C',
    border: '#F0B27A',
  },
};
const DEFAULT_LOOK = CATEGORY_LOOK[POST_CATEGORY.gallery]!;

function fileNameFromUri(uri: string): string {
  const clean = uri.split('?')[0] ?? '';
  try {
    const name = decodeURIComponent(clean.split('/').pop() ?? '');
    return name || 'Selected media';
  } catch {
    return clean.split('/').pop() || 'Selected media';
  }
}

function UploadMark() {
  return (
    <View style={styles.uploadMark} accessibilityElementsHidden>
      <Ionicons name="arrow-up" size={IconSize.lg} color={Colors.accentInk} />
      <View style={styles.uploadTray} />
    </View>
  );
}

export default function EditEventsScreen({
  navigation,
  route,
}: EventsStackScreenProps<'AddEvent'>) {
  const postId = route.params?.postId;
  const profileQuery = useQuery({
    queryKey: queryKeys.coachProfileFull,
    queryFn: getCoachProfileFull,
  });
  const postsQuery = useQuery({ queryKey: queryKeys.myPosts, queryFn: getMyPosts });
  const categoriesQuery = useQuery({
    queryKey: queryKeys.postCategories,
    queryFn: getPostCategories,
    staleTime: 10 * 60_000,
  });

  const loading =
    profileQuery.isPending || categoriesQuery.isPending || (!!postId && postsQuery.isPending);
  const failed = [profileQuery, categoriesQuery, ...(postId ? [postsQuery] : [])].find(
    q => q.isError && !q.data,
  );
  const existing = postId ? (postsQuery.data ?? []).find(p => p.postId === postId) : undefined;

  return (
    <View style={styles.container}>
      <WaveScreenHeader
        title={postId ? 'Edit Post' : 'Add Post'}
        onBack={() => navigation.goBack()}
        onHome={() => navigateToDashboard(navigation)}
      />

      {loading ? (
        <ActivityIndicator color={Colors.secondary} style={{ marginTop: 60 }} />
      ) : failed ? (
        <ReloadState
          title="Could not load this screen"
          message={getErrorMessage(failed.error, 'Please try again.')}
          onRetry={() => {
            void profileQuery.refetch();
            void categoriesQuery.refetch();
            void postsQuery.refetch();
          }}
          loading={failed.isFetching}
          showPullHint={false}
        />
      ) : postId && !existing ? (
        <ReloadState
          title="Post not found"
          message="This post is no longer on your list."
          onRetry={() => navigation.goBack()}
          retryLabel="Back to posts"
          showPullHint={false}
        />
      ) : (
        <PostForm
          key={postId ?? 'new'}
          coachCode={profileQuery.data!.coachCode}
          categories={categoriesQuery.data ?? []}
          existing={existing}
          onDone={() => navigation.goBack()}
        />
      )}
    </View>
  );
}

function PostForm({
  coachCode,
  categories,
  existing,
  onDone,
}: {
  coachCode: string;
  categories: PostCategoryOption[];
  existing?: CoachPost;
  onDone: () => void;
}) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const locationRef = useRef<TextInput>(null);
  const savingRef = useRef(false);
  const queryClient = useQueryClient();
  const [categoryCode, setCategoryCode] = useState(
    existing?.categoryCode ?? categories[0]?.code ?? POST_CATEGORY.gallery,
  );
  const [mediaUrl, setMediaUrl] = useState(existing?.mediaUrl ?? '');
  const [isVideo, setIsVideo] = useState(existing?.mediaType === 'video');
  const [pickedName, setPickedName] = useState(() =>
    existing?.mediaUrl ? fileNameFromUri(existing.mediaUrl) : '',
  );
  const [title, setTitle] = useState(existing?.title ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [date, setDate] = useState(existing?.postDate || formatLocalDate(new Date()));
  const [location, setLocation] = useState(existing?.location ?? '');
  const [clientCode, setClientCode] = useState(existing?.clientCode ?? '');
  const [clientName, setClientName] = useState(existing?.clientName ?? '');
  const [clientOpen, setClientOpen] = useState(false);
  const [consent, setConsent] = useState(existing?.consentAccepted ?? false);
  const [dateOpen, setDateOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  const category = categories.find(c => c.code === categoryCode);
  const isGallery = categoryCode === POST_CATEGORY.gallery;
  const clientEnabled = !!category?.requiresClient;
  const consentRequired = !!category?.requiresConsent;

  const showBanner = useCallback((message: string) => {
    setBanner(message);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  const clientsQuery = useQuery({
    queryKey: queryKeys.clientList(coachCode),
    queryFn: () => getClientList({ coachCode }),
    enabled: !!coachCode && clientEnabled,
  });

  // Client Success: fill the location from the client's profile when it is still empty.
  useEffect(() => {
    if (!clientEnabled || !clientCode) return;
    let cancelled = false;
    void getClientDetail({ clientCode })
      .then(detail => {
        if (cancelled) return;
        const loc = detail.location?.trim() ?? '';
        if (loc) setLocation(current => (current.trim() ? current : loc));
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
  }, [clientEnabled, clientCode, showBanner]);

  const pickMedia = async () => {
    if (uploading) return;
    const picked = await pickPostMedia();
    if (!picked) return;
    if (picked.bytes > POST_MEDIA_MAX_BYTES || !picked.base64) {
      showBanner('Photo or video must be 10MB or smaller.');
      return;
    }

    const previous = { url: mediaUrl, video: isVideo, name: pickedName };
    setPickedName(fileNameFromUri(picked.uri));
    setIsVideo(picked.isVideo);
    setMediaUrl(picked.uri);
    setUploading(true);
    try {
      const url = await uploadDocument({
        base64DataUrl: `data:${picked.mimeType};base64,${picked.base64}`,
        coachCode,
        refCode: coachCode,
        refType: COACH_GALLERY_REF_TYPE,
        docType: POST_MEDIA_DOC_TYPE,
        savedBy: getDocumentSavedById(),
      });
      setMediaUrl(url);
    } catch (err) {
      setMediaUrl(previous.url);
      setIsVideo(previous.video);
      setPickedName(previous.name);
      showBanner(getErrorMessage(err, 'Could not upload. Please try again.'));
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (savingRef.current || saving) return;
    if (!category) return showBanner('Choose a category.');
    if (!mediaUrl || isPendingLocalMediaUrl(mediaUrl)) {
      return showBanner(
        uploading || mediaUrl
          ? 'Please wait for the upload to finish.'
          : 'Add a photo or video before publishing.',
      );
    }
    if (clientEnabled && !clientCode) return showBanner('Select a client for Client Success.');
    if (!title.trim()) return showBanner('Add a title before publishing.');
    if (consentRequired && !consent) {
      return showBanner('Confirm you have the right to share this content.');
    }

    setBanner(null);
    savingRef.current = true;
    setSaving(true);
    try {
      await savePost({
        postId: existing?.postId ?? 0,
        categoryCode: category.code,
        title: title.trim(),
        description: description.trim(),
        postDate: date,
        location: location.trim(),
        clientCode: clientEnabled ? clientCode : '',
        mediaUrl,
        consentAccepted: consentRequired ? consent : false,
      });
      void queryClient.invalidateQueries({ queryKey: ['showcase'] });
      Alert.alert('Published', 'Your post is on your public profile.', [
        { text: 'OK', onPress: onDone },
      ]);
    } catch (err) {
      showBanner(getErrorMessage(err, 'Could not publish. Please try again.'));
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const parsedDate = parseFlexibleDate(date);
  const dateLabel = parsedDate ? formatCalendarLabel(parsedDate) : date.trim();
  const previewUri = resolveMediaUrl(mediaUrl);
  const publishDisabled = saving || uploading;
  const clientLabel = clientName || 'Select Client';

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
          {categories.map(item => {
            const look = CATEGORY_LOOK[item.code] ?? DEFAULT_LOOK;
            const selected = categoryCode === item.code;
            return (
              <TouchableOpacity
                key={item.code}
                style={[
                  styles.chip,
                  selected
                    ? { backgroundColor: look.tint, borderColor: look.border }
                    : styles.chipIdle,
                ]}
                onPress={() => {
                  setCategoryCode(item.code);
                  if (!item.requiresClient) {
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
                <View style={[styles.chipIcon, { backgroundColor: look.iconBg }]}>
                  <Ionicons name={look.icon} size={12} color={Colors.white} />
                </View>
                <Text
                  style={[styles.chipLabel, selected && styles.chipLabelSelected]}
                  numberOfLines={2}
                >
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
          onPress={() => void pickMedia()}
          disabled={uploading}
          activeOpacity={PressOpacity.default}
          accessibilityRole="button"
          accessibilityLabel={previewUri ? 'Change photo or video' : 'Click to upload'}
        >
          {previewUri ? (
            <View style={styles.previewWrap}>
              {isVideo ? (
                <View style={[styles.preview, styles.videoPlate]}>
                  <Ionicons name="videocam" size={IconSize.xxl} color={Colors.accentInk} />
                </View>
              ) : (
                <Image source={{ uri: previewUri }} style={styles.preview} />
              )}
              <Text style={styles.previewName} numberOfLines={1}>
                {pickedName || fileNameFromUri(mediaUrl)}
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

      {clientEnabled ? (
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Client</Text>
          <TouchableOpacity
            style={styles.field}
            onPress={() => setClientOpen(true)}
            activeOpacity={PressOpacity.default}
            accessibilityRole="button"
            accessibilityLabel={clientName ? `Client: ${clientName}` : 'Select Client'}
          >
            <Text
              style={clientName ? styles.fieldValue : styles.fieldPlaceholder}
              numberOfLines={1}
            >
              {clientLabel}
            </Text>
            <Ionicons
              name="chevron-down-outline"
              size={IconSize.sm}
              color={ICON_MUTED}
              style={styles.fieldChevron}
            />
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.fieldLabel}>{isGallery ? 'Tag' : 'Title'}</Text>
        <View style={styles.field}>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            maxLength={POST_TITLE_MAX}
            placeholder={
              isGallery ? 'What is this photo for? e.g. Morning batch' : 'Enter title here..'
            }
            accessibilityLabel={isGallery ? 'Tag' : 'Title'}
            placeholderTextColor={Colors.textLight}
          />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.fieldLabel}>Description</Text>
        <View style={[styles.field, styles.fieldTall]}>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            value={description}
            onChangeText={setDescription}
            maxLength={POST_DESCRIPTION_MAX}
            multiline
            textAlignVertical="top"
            placeholder="Tell clients about it"
            placeholderTextColor={Colors.textLight}
            accessibilityLabel="Description"
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
        onConfirm={picked => {
          setDate(formatLocalDate(picked));
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
            hitSlop={HitSlop.sm}
          >
            <Ionicons name="create-outline" size={IconSize.md} color={Colors.textDark} />
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
            value={location}
            onChangeText={setLocation}
            maxLength={POST_LOCATION_MAX}
            placeholder="Enter Location Here"
            placeholderTextColor={Colors.textLight}
          />
        </View>
        {clientEnabled ? (
          <Text style={[styles.hint, styles.hintBlue]}>
            Choosing a client fills in their location. You can change it.
          </Text>
        ) : null}

        {consentRequired ? (
          <TouchableOpacity
            style={styles.consent}
            onPress={() => setConsent(value => !value)}
            activeOpacity={PressOpacity.default}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: consent }}
            accessibilityLabel="By publishing, you confirm that you have the right to share this content."
          >
            <View style={[styles.check, !consent && styles.checkOff]}>
              {consent ? (
                <Ionicons name="checkmark-outline" size={IconSize.sm} color={Colors.white} />
              ) : null}
            </View>
            <Text style={styles.consentText}>
              By publishing, you confirm that you have the right to share this content.
            </Text>
          </TouchableOpacity>
        ) : null}

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
                <Ionicons
                  name="arrow-forward-outline"
                  size={IconSize.sm}
                  color={Colors.accentInk}
                />
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
      {selected ? (
        <Ionicons name="checkmark-outline" size={IconSize.md} color={Colors.accentInk} />
      ) : null}
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
    ...Typography.headline,
  },
  fieldLabel: {
    ...Typography.headline,
    marginBottom: Spacing.sm,
  },
  underline: {
    width: 36,
    height: 3,
    borderRadius: 2,
    backgroundColor: UNDERLINE_ORANGE,
    marginTop: Spacing.xxs,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minHeight: 40,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    borderWidth: 1.5,
  },
  chipIdle: {
    backgroundColor: Colors.white,
    borderColor: CHIP_IDLE_BORDER,
  },
  chipIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipLabel: {
    flexShrink: 1,
    textAlign: 'left',
    fontFamily: FontFamily.semibold,
    fontSize: 10,
    lineHeight: 12,
    color: CHIP_IDLE_LABEL,
  },
  chipLabelSelected: {
    color: Colors.textDark,
  },
  uploadBox: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: UPLOAD_DASH,
    borderRadius: Radius.md,
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
    gap: Spacing.xxs,
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
  videoPlate: { alignItems: 'center', justifyContent: 'center', backgroundColor: FIELD_MINT },
  fieldTall: { minHeight: 110, alignItems: 'flex-start', paddingTop: Spacing.sm },
  inputMultiline: { minHeight: 90, width: '100%' },
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
