import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Linking,
  Alert,
  ActivityIndicator,
  FlatList,
  useWindowDimensions,
  type ListRenderItemInfo,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COACH_GALLERY_DOC_TYPE, COACH_GALLERY_REF_TYPE } from '../../config/appConfig';
import {
  Colors,
  FontFamily,
  HitSlop,
  IconSize,
  PressOpacity,
  Radius,
  Shadow,
  Spacing,
  formFieldStyles,
  headingFont,
} from '../../constants/theme';
import {
  BrandImages,
  HERO_SMILE_MASK_ASPECT,
  WHATSAPP_COACH_BUTTON_ASPECT,
} from '../../constants/images';
import PersonAvatar from '../../components/PersonAvatar';
import PhoneTextInput from '../../components/PhoneTextInput';
import DropdownField from '../../components/DropdownField';
import EmptyState from '../../components/EmptyState';
import FormFieldLabel from '../../components/FormFieldLabel';
import PublicHomeHeader from '../../components/home/PublicHomeHeader';
import KeyboardSafeScroll, {
  KEYBOARD_SCROLL_PADDING,
  useScrollLowerFieldsIntoView,
} from '../../components/KeyboardSafeScroll';
import ReloadState from '../../components/ReloadState';
import SectionTag from '../../components/SectionTag';
import { HeaderBackButton } from '../../components/ScreenHeader';
import { SERVICE_INQUIRY_FALLBACK } from '../../data/coachProfileContent';
import {
  getCoachProfileByCode,
  submitCoachEnquiry,
  whatsAppUrlFromMobile,
} from '../../api/coachApi';
import { listDocuments } from '../../api/documentApi';
import { getClientList } from '../../api/clientApi';
import { PHOTO_STALE_MS } from '../../api/queryClient';
import { queryKeys } from '../../api/queryKeys';
import { getCurrentCoachCode, isAuthenticated } from '../../auth/session';
import { getErrorMessage } from '../../api/client';
import {
  buildPublicProfileStats,
  resolvePublicClientCount,
  shouldShowPublicRating,
} from '../../utils/coachPublicStats';
import { formatExpertiseLabel, stripTrailingTagsFromBio } from '../../utils/coachDisplay';
import { mergeCoachProfile } from '../../utils/mergeCoachProfile';
import { isDegenerateImageSize, resolveMediaUrl } from '../../utils/mediaUrl';
import {
  validateMobile,
  validateOptionalEmail,
  validateRequired,
  sanitizeEmailInput,
} from '../../utils/validation';
import type { RootScreenProps } from '../../types/navigation';
import type { Coach, CoachPackage } from '../../types/models';
import type { IoniconName } from '../../types/icons';

interface EnquiryForm {
  name: string;
  mobile: string;
  email: string;
  service: string;
}

const BLANK_FORM: EnquiryForm = { name: '', mobile: '', email: '', service: '' };
const EMPTY_PACKAGES: CoachPackage[] = [];

const STAT_ICONS: Record<string, IoniconName> = {
  clients: 'people-outline',
  experience: 'star',
  services: 'calendar-outline',
  rating: 'star-outline',
};

const HERO_PHOTO_ASPECT = 1.2;
const HERO_PHOTO_TOP_RADIUS = 28;

function formatStatValue(key: string, value: string): string {
  if (key === 'rating') {
    const n = Number(value);
    return Number.isFinite(n) ? n.toFixed(1) : value;
  }
  if (key === 'clients' || key === 'experience') {
    return value.endsWith('+') ? value : `${value}+`;
  }
  return value;
}

type ProfilePageProps = {
  coachCode: string;
  listCoach?: Coach;
  onBack: () => void;
  onHome: () => void;
  pageWidth: number;
  pageHeight: number;
};

const SuccessStoryCard = React.memo(function SuccessStoryCard({
  pkg,
  onSelect,
}: {
  pkg: CoachPackage;
  onSelect: (serviceName: string) => void;
}) {
  const imageUri = resolveMediaUrl(pkg.imageUrl);
  const imageSource = useMemo(() => (imageUri ? { uri: imageUri } : null), [imageUri]);
  const [imageFailed, setImageFailed] = useState(false);
  const [trackedImage, setTrackedImage] = useState(pkg.imageUrl);
  if (pkg.imageUrl !== trackedImage) {
    setTrackedImage(pkg.imageUrl);
    setImageFailed(false);
  }
  const showImage = Boolean(imageSource) && !imageFailed;

  return (
    <TouchableOpacity
      style={styles.storyCard}
      onPress={() => onSelect(pkg.name)}
      activeOpacity={PressOpacity.soft}
      accessibilityRole="button"
      accessibilityLabel={`Enquire about ${pkg.name}`}
    >
      <View style={styles.storyCopy}>
        <View style={styles.focusPill}>
          <Ionicons name="checkmark-circle" size={IconSize.xs} color={Colors.accentInk} />
          <Text style={styles.focusPillText}>Focus</Text>
        </View>
        <Text style={styles.storyTitle} numberOfLines={2}>
          {pkg.name}
        </Text>
        {pkg.description ? (
          <Text style={styles.storyBody} numberOfLines={4}>
            {pkg.description}
          </Text>
        ) : null}
      </View>
      {showImage && imageSource ? (
        <Image
          source={imageSource}
          style={styles.storyImage}
          resizeMode="cover"
          onError={() => setImageFailed(true)}
          onLoad={e => {
            const { width, height } = e.nativeEvent.source;
            if (isDegenerateImageSize(width, height)) setImageFailed(true);
          }}
        />
      ) : (
        <View style={styles.storyImagePlaceholder}>
          <Ionicons name="image-outline" size={IconSize.xl} color={Colors.accentInk} />
        </View>
      )}
    </TouchableOpacity>
  );
});

type ProfileHeroProps = {
  contentWidth: number;
  smileHeight: number;
  waBtnHeight: number;
  activePhoto: string | null;
  multiPhoto: boolean;
  safePhotoIndex: number;
  photoCount: number;
  name: string;
  category?: string;
  bio: string;
  whatsAppUrl: string | null;
  onPrevPhoto: () => void;
  onNextPhoto: () => void;
  onMarkPhotoFailed: (uri: string) => void;
};

const ProfileHero = React.memo(function ProfileHero({
  contentWidth,
  smileHeight,
  waBtnHeight,
  activePhoto,
  multiPhoto,
  safePhotoIndex,
  photoCount,
  name,
  category,
  bio,
  whatsAppUrl,
  onPrevPhoto,
  onNextPhoto,
  onMarkPhotoFailed,
}: ProfileHeroProps) {
  const photoSource = useMemo(() => (activePhoto ? { uri: activePhoto } : null), [activePhoto]);
  const smileStyle = useMemo(
    () => ({ width: contentWidth, height: smileHeight }),
    [contentWidth, smileHeight],
  );
  const waOverlap = waBtnHeight / 2;
  const waBtnStyle = useMemo(
    () => ({ height: waBtnHeight, marginTop: -waOverlap }),
    [waBtnHeight, waOverlap],
  );
  const waImageStyle = useMemo(
    () => ({ width: contentWidth, height: waBtnHeight }),
    [contentWidth, waBtnHeight],
  );

  const openWhatsApp = () => {
    if (!whatsAppUrl) return;
    Linking.openURL(whatsAppUrl).catch(() => Alert.alert('Unable to open WhatsApp'));
  };

  return (
    <View style={styles.heroBlock}>
      <View style={styles.photoCard}>
        <View style={styles.photoFrame}>
          {photoSource ? (
            <Image
              source={photoSource}
              style={styles.photoImage}
              resizeMode="cover"
              onError={() => {
                if (activePhoto) onMarkPhotoFailed(activePhoto);
              }}
              onLoad={e => {
                const { width, height } = e.nativeEvent.source;
                if (activePhoto && isDegenerateImageSize(width, height)) {
                  onMarkPhotoFailed(activePhoto);
                }
              }}
            />
          ) : (
            <View style={styles.photoFallback}>
              <PersonAvatar size={128} />
            </View>
          )}
          {multiPhoto ? (
            <>
              <TouchableOpacity
                style={[styles.photoNav, styles.photoNavLeft]}
                onPress={onPrevPhoto}
                hitSlop={HitSlop.sm}
                accessibilityRole="button"
                accessibilityLabel="Previous photo"
                activeOpacity={PressOpacity.soft}
              >
                <Ionicons name="chevron-back" size={IconSize.lg} color={Colors.white} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.photoNav, styles.photoNavRight]}
                onPress={onNextPhoto}
                hitSlop={HitSlop.sm}
                accessibilityRole="button"
                accessibilityLabel="Next photo"
                activeOpacity={PressOpacity.soft}
              >
                <Ionicons name="chevron-forward" size={IconSize.lg} color={Colors.white} />
              </TouchableOpacity>
            </>
          ) : null}
        </View>

        <View style={[styles.infoPanel, { marginTop: -smileHeight }]}>
          <View style={[styles.toneBand, { height: smileHeight }]} pointerEvents="none">
            <Image source={BrandImages.heroSmileMask} style={smileStyle} resizeMode="stretch" />
          </View>
          <View
            style={[
              styles.infoBody,
              {
                paddingBottom: whatsAppUrl ? Spacing.md + waOverlap : Spacing.md,
              },
            ]}
          >
            <View style={styles.infoContent}>
              <Text style={styles.name} numberOfLines={2}>
                {name}
              </Text>
              {category ? (
                <View style={styles.categoryPill}>
                  <Ionicons name="person" size={IconSize.xs} color={Colors.white} />
                  <Text style={styles.categoryText} numberOfLines={1}>
                    {category}
                  </Text>
                </View>
              ) : null}
              {bio ? <Text style={styles.bio}>{bio}</Text> : null}
              {multiPhoto ? (
                <View style={styles.photoPager}>
                  <TouchableOpacity
                    onPress={onPrevPhoto}
                    hitSlop={HitSlop.sm}
                    accessibilityRole="button"
                    accessibilityLabel="Previous photo"
                  >
                    <Ionicons name="chevron-back" size={IconSize.xs} color={Colors.white} />
                  </TouchableOpacity>
                  <Text style={styles.photoPagerText}>
                    {safePhotoIndex + 1} / {photoCount}
                  </Text>
                  <TouchableOpacity
                    onPress={onNextPhoto}
                    hitSlop={HitSlop.sm}
                    accessibilityRole="button"
                    accessibilityLabel="Next photo"
                  >
                    <Ionicons name="chevron-forward" size={IconSize.xs} color={Colors.white} />
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          </View>
        </View>
      </View>

      {whatsAppUrl ? (
        <TouchableOpacity
          style={[styles.waBtn, waBtnStyle]}
          onPress={openWhatsApp}
          activeOpacity={PressOpacity.default}
          accessibilityRole="button"
          accessibilityLabel="Chat with Coach on WhatsApp"
        >
          <Image
            source={BrandImages.whatsappCoachButton}
            style={waImageStyle}
            resizeMode="contain"
          />
        </TouchableOpacity>
      ) : null}
    </View>
  );
});

type ServicePrefill = { token: number; value: string };

type EnquiryBookingFormProps = {
  coachId: string;
  coachName: string;
  serviceOptions: string[];
  hasServiceChoices: boolean;
  servicePrefill: ServicePrefill | null;
  scrollLowerFieldsIntoView: () => void;
  onSectionLayout: (y: number) => void;
};

const EnquiryBookingForm = React.memo(
  function EnquiryBookingForm({
    coachId,
    coachName,
    serviceOptions,
    hasServiceChoices,
    servicePrefill,
    scrollLowerFieldsIntoView,
    onSectionLayout,
  }: EnquiryBookingFormProps) {
    const [form, setForm] = useState<EnquiryForm>(BLANK_FORM);
    const [submitting, setSubmitting] = useState(false);
    const [appliedPrefillToken, setAppliedPrefillToken] = useState<number | null>(null);
    if (servicePrefill && servicePrefill.token !== appliedPrefillToken) {
      setAppliedPrefillToken(servicePrefill.token);
      setForm(f =>
        f.service === servicePrefill.value ? f : { ...f, service: servicePrefill.value },
      );
    }

    const update = <K extends keyof EnquiryForm>(key: K, val: EnquiryForm[K]) =>
      setForm(f => (f[key] === val ? f : { ...f, [key]: val }));

    const submitEnquiry = async () => {
      const validationError =
        validateRequired(form.name, 'Name') ||
        validateMobile(form.mobile) ||
        validateOptionalEmail(form.email) ||
        (!form.service.trim() ? 'Please select what you are looking for.' : null);
      if (validationError) return Alert.alert('Validation Error', validationError);

      setSubmitting(true);
      try {
        await submitCoachEnquiry({
          coachCode: coachId,
          clientName: form.name.trim(),
          clientMobile: form.mobile.trim(),
          clientEmail: form.email.trim() || undefined,
          lookingFor: form.service.trim(),
        });
        Alert.alert(
          'Enquiry Sent!',
          `Your enquiry has been sent to ${coachName}. They usually reply within 24 hours.`,
        );
        setForm(BLANK_FORM);
      } catch (err) {
        Alert.alert('Something went wrong', getErrorMessage(err, 'Please try again.'));
      } finally {
        setSubmitting(false);
      }
    };

    return (
      <View
        style={styles.bookingSection}
        onLayout={e => {
          onSectionLayout(e.nativeEvent.layout.y);
        }}
      >
        <View style={styles.bookingIntro}>
          <View style={styles.bookingIntroCopy}>
            <View style={styles.bookingLabelRow}>
              <Ionicons name="calendar-outline" size={IconSize.sm} color={Colors.accentInk} />
              <Text style={styles.bookingLabel}>Booking</Text>
            </View>
            <Text style={styles.bookingTitle}>Book Your Free Consultation</Text>
            <Text style={styles.bookingSubtitle}>
              Send a free enquiry to {coachName}. They usually reply within 24 hours
            </Text>
          </View>
          <View style={styles.bookingBubble}>
            <Ionicons name="chatbubble" size={44} color={Colors.secondary} />
            <View style={styles.bookingBubbleLines} pointerEvents="none">
              <View style={styles.bookingBubbleLine} />
              <View style={styles.bookingBubbleLine} />
              <View style={styles.bookingBubbleLine} />
            </View>
          </View>
        </View>

        <View style={styles.formCard}>
          <View style={styles.field}>
            <FormFieldLabel required>Your Name</FormFieldLabel>
            <View style={styles.inputWrap}>
              <Ionicons
                name="person-outline"
                size={IconSize.md}
                color={Colors.accentInk}
                style={formFieldStyles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Full name"
                placeholderTextColor={Colors.textLight}
                value={form.name}
                onChangeText={v => update('name', v)}
                onFocus={scrollLowerFieldsIntoView}
              />
            </View>
          </View>
          <View style={styles.field}>
            <FormFieldLabel required>Mobile Number</FormFieldLabel>
            <View style={styles.inputWrap}>
              <Ionicons
                name="call-outline"
                size={IconSize.md}
                color={Colors.accentInk}
                style={formFieldStyles.inputIcon}
              />
              <PhoneTextInput
                style={styles.input}
                placeholder="+91 Mobile number"
                placeholderTextColor={Colors.textLight}
                value={form.mobile}
                onChangeText={v => update('mobile', v)}
                onFocus={scrollLowerFieldsIntoView}
              />
            </View>
          </View>
          <View style={styles.field}>
            <FormFieldLabel>Email Address</FormFieldLabel>
            <View style={styles.inputWrap}>
              <Ionicons
                name="mail-outline"
                size={IconSize.md}
                color={Colors.accentInk}
                style={formFieldStyles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor={Colors.textLight}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={form.email}
                onChangeText={v => update('email', sanitizeEmailInput(v))}
                onFocus={scrollLowerFieldsIntoView}
              />
            </View>
          </View>
          {hasServiceChoices ? (
            <DropdownField
              label="Enquiring For"
              value={form.service}
              options={serviceOptions}
              onChange={v => update('service', v)}
              placeholder="Select a service..."
              required
              leftIcon="briefcase-outline"
            />
          ) : (
            <View style={styles.fieldLast}>
              <FormFieldLabel required>Enquiring For</FormFieldLabel>
              <View style={styles.inputWrap}>
                <Ionicons
                  name="briefcase-outline"
                  size={IconSize.md}
                  color={Colors.accentInk}
                  style={formFieldStyles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="What are you looking for?"
                  placeholderTextColor={Colors.textLight}
                  value={form.service}
                  onChangeText={v => update('service', v)}
                  onFocus={scrollLowerFieldsIntoView}
                />
              </View>
            </View>
          )}
        </View>
        <TouchableOpacity
          style={styles.formCta}
          onPress={() => void submitEnquiry()}
          disabled={submitting}
          activeOpacity={PressOpacity.default}
          accessibilityRole="button"
          accessibilityLabel="Send My Request, It's Free!"
        >
          {submitting ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <>
              <View style={styles.formCtaCopy}>
                <Text style={styles.formCtaText}>Send My Request,</Text>
                <Text style={styles.formCtaText}>It&apos;s Free!</Text>
              </View>
              <View style={styles.formCtaIcon}>
                <Ionicons name="arrow-forward" size={IconSize.md} color={Colors.white} />
              </View>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  },
  (prev, next) =>
    prev.coachId === next.coachId &&
    prev.coachName === next.coachName &&
    prev.hasServiceChoices === next.hasServiceChoices &&
    prev.servicePrefill === next.servicePrefill &&
    prev.scrollLowerFieldsIntoView === next.scrollLowerFieldsIntoView &&
    prev.onSectionLayout === next.onSectionLayout &&
    prev.serviceOptions.length === next.serviceOptions.length &&
    prev.serviceOptions.every((value, index) => value === next.serviceOptions[index]),
);

function CoachProfilePage({
  coachCode,
  listCoach,
  onBack,
  onHome,
  pageWidth,
  pageHeight,
}: ProfilePageProps) {
  const insets = useSafeAreaInsets();
  const profileQuery = useQuery({
    queryKey: queryKeys.coachProfileByCode(coachCode),
    queryFn: () => getCoachProfileByCode(coachCode),
    enabled: !!coachCode,
    placeholderData: listCoach?.id === coachCode ? listCoach : undefined,
  });

  const galleryQuery = useQuery({
    queryKey: queryKeys.coachGallery(coachCode),
    queryFn: () =>
      listDocuments({
        coachCode,
        refCode: coachCode,
        refType: COACH_GALLERY_REF_TYPE,
        docType: COACH_GALLERY_DOC_TYPE,
      }),
    enabled: !!coachCode,
    staleTime: PHOTO_STALE_MS,
  });

  const myCoachCode = getCurrentCoachCode();
  const isOwnProfile = isAuthenticated() && !!myCoachCode && myCoachCode === coachCode;
  const myClientsQuery = useQuery({
    queryKey: queryKeys.clientList(myCoachCode),
    queryFn: () => getClientList(),
    enabled: isOwnProfile,
  });

  const listMatch = listCoach?.id === coachCode ? listCoach : undefined;
  const coach =
    profileQuery.isError && !profileQuery.data
      ? undefined
      : mergeCoachProfile(profileQuery.data, listMatch);
  const clientCount = coach
    ? resolvePublicClientCount({
        coachId: coach.id,
        marketingClients: coach.clients,
        viewerCoachCode: myCoachCode,
        liveRosterLength: myClientsQuery.data?.length,
      })
    : null;
  const showRating = coach ? shouldShowPublicRating(coach.rating, coach.reviews) : false;
  const publicStats = coach
    ? buildPublicProfileStats({
        clientCount,
        experience: coach.experience,
        servicesCount: coach.tags.length,
        rating: coach.rating,
        reviews: coach.reviews,
      })
    : [];
  const heroBio =
    coach && coach.tags.length
      ? stripTrailingTagsFromBio(coach.bio, coach.tags)
      : (coach?.bio ?? '');
  const packages = coach?.packages ?? EMPTY_PACKAGES;
  const showSuccessStories = packages.length > 0;
  const scrollRef = useRef<ScrollView>(null);
  const formSectionY = useRef(0);
  const scrollLowerFieldsIntoView = useScrollLowerFieldsIntoView(scrollRef);
  const [servicePrefill, setServicePrefill] = useState<ServicePrefill | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [failedPhotoUris, setFailedPhotoUris] = useState<Set<string>>(() => new Set());
  const [trackedCoachCode, setTrackedCoachCode] = useState(coachCode);
  if (coachCode !== trackedCoachCode) {
    setTrackedCoachCode(coachCode);
    setPhotoIndex(0);
    setFailedPhotoUris(new Set());
    setServicePrefill(null);
  }

  const heroPhotos: string[] = [];
  if (coach) {
    const primary = resolveMediaUrl(coach.profilePicUrl || coach.logoUrl || '');
    if (primary && !failedPhotoUris.has(primary)) heroPhotos.push(primary);
    for (const item of galleryQuery.data ?? []) {
      const uri = resolveMediaUrl(item.filePath);
      if (!uri || failedPhotoUris.has(uri) || heroPhotos.includes(uri)) continue;
      heroPhotos.push(uri);
    }
  }

  const safePhotoIndex = heroPhotos.length === 0 ? 0 : Math.min(photoIndex, heroPhotos.length - 1);
  const whatsAppUrl = coach ? whatsAppUrlFromMobile(coach.mobile) : null;
  const activePhoto = heroPhotos[safePhotoIndex] ?? null;
  const multiPhoto = heroPhotos.length > 1;
  const contentWidth = Math.max(0, pageWidth - Spacing.md * 2);
  const smileHeight = Math.round(contentWidth / HERO_SMILE_MASK_ASPECT);
  const waBtnHeight = contentWidth / WHATSAPP_COACH_BUTTON_ASPECT;
  const serviceOptions = [
    ...packages.map(p => p.name),
    ...(coach?.tags.length ? coach.tags.map(formatExpertiseLabel) : []),
    SERVICE_INQUIRY_FALLBACK,
  ];
  const hasServiceChoices = packages.length > 0 || (coach?.tags.length ?? 0) > 0;

  const scrollToForm = useCallback(() => {
    scrollRef.current?.scrollTo({ y: Math.max(0, formSectionY.current - 12), animated: true });
  }, []);

  const heroPhotoCount = heroPhotos.length;
  const goPrevPhoto = useCallback(() => {
    setPhotoIndex(i => {
      if (heroPhotoCount <= 1) return i;
      const safe = Math.min(i, heroPhotoCount - 1);
      return safe <= 0 ? heroPhotoCount - 1 : safe - 1;
    });
  }, [heroPhotoCount]);

  const goNextPhoto = useCallback(() => {
    setPhotoIndex(i => {
      if (heroPhotoCount <= 1) return i;
      const safe = Math.min(i, heroPhotoCount - 1);
      return safe >= heroPhotoCount - 1 ? 0 : safe + 1;
    });
  }, [heroPhotoCount]);

  const markPhotoFailed = useCallback((uri: string) => {
    setFailedPhotoUris(prev => {
      if (prev.has(uri)) return prev;
      const next = new Set(prev);
      next.add(uri);
      return next;
    });
  }, []);

  const onFormSectionLayout = useCallback((y: number) => {
    formSectionY.current = y;
  }, []);

  const selectPackageService = useCallback(
    (serviceName: string) => {
      setServicePrefill({ token: Date.now(), value: serviceName });
      scrollToForm();
    },
    [scrollToForm],
  );

  if (!coach && profileQuery.isPending) {
    return (
      <View style={[styles.page, { width: pageWidth, height: pageHeight }]}>
        <View style={styles.centered}>
          <HeaderBackButton
            onDark={false}
            onPress={onBack}
            style={[styles.backOnLight, { top: insets.top + 12 }]}
          />
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      </View>
    );
  }

  if (!coach) {
    return (
      <View style={[styles.page, { width: pageWidth, height: pageHeight }]}>
        <View style={styles.centered}>
          <HeaderBackButton
            onDark={false}
            onPress={onBack}
            style={[styles.backOnLight, { top: insets.top + 12 }]}
          />
          <ReloadState
            title="Could not load profile"
            message={getErrorMessage(profileQuery.error, 'Please try again.')}
            onRetry={() => void profileQuery.refetch()}
            loading={profileQuery.isFetching}
            showPullHint={false}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.page, { width: pageWidth, height: pageHeight }]}>
      <KeyboardSafeScroll
        ref={scrollRef}
        style={styles.container}
        keyboardPadding={Math.max(insets.bottom, KEYBOARD_SCROLL_PADDING)}
        directionalLockEnabled
        nestedScrollEnabled
      >
        <View style={[styles.topHeader, { paddingTop: insets.top + Spacing.sm }]}>
          <PublicHomeHeader onHomePress={onHome} />
        </View>

        <ProfileHero
          contentWidth={contentWidth}
          smileHeight={smileHeight}
          waBtnHeight={waBtnHeight}
          activePhoto={activePhoto}
          multiPhoto={multiPhoto}
          safePhotoIndex={safePhotoIndex}
          photoCount={heroPhotos.length}
          name={coach.name}
          category={coach.category}
          bio={heroBio}
          whatsAppUrl={whatsAppUrl}
          onPrevPhoto={goPrevPhoto}
          onNextPhoto={goNextPhoto}
          onMarkPhotoFailed={markPhotoFailed}
        />

        {publicStats.length > 0 ? (
          <View style={styles.statsStrip}>
            {publicStats.map((stat, i) => (
              <React.Fragment key={stat.key}>
                {i > 0 ? <View style={styles.statDivider} /> : null}
                <View style={styles.statItem}>
                  <Ionicons
                    name={STAT_ICONS[stat.key] ?? 'ellipse-outline'}
                    size={IconSize.md}
                    color={Colors.secondary}
                  />
                  <Text style={styles.statValue} numberOfLines={1}>
                    {formatStatValue(stat.key, stat.value)}
                  </Text>
                  <Text style={styles.statLabel} numberOfLines={1}>
                    {stat.label}
                  </Text>
                </View>
              </React.Fragment>
            ))}
          </View>
        ) : null}

        {coach.tags.length > 0 ? (
          <View style={styles.section}>
            <SectionTag icon="checkmark-circle" label="Expertise" />
            <Text style={styles.sectionTitle}>What I Specialise In</Text>
            <Text style={styles.sectionSubtitle}>Explore areas {coach.name} provides.</Text>
            <View
              style={styles.expertiseChipGroup}
              accessibilityRole="text"
              accessibilityLabel={`Expertise: ${coach.tags.map(formatExpertiseLabel).join(', ')}`}
            >
              {coach.tags.map(tag => (
                <View
                  key={tag}
                  style={styles.expertiseChip}
                  importantForAccessibility="no-hide-descendants"
                >
                  <Ionicons name="checkmark-circle" size={IconSize.sm} color={Colors.accentInk} />
                  <Text style={styles.expertiseTitle} numberOfLines={2}>
                    {formatExpertiseLabel(tag)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {showSuccessStories ? (
          <View style={styles.section}>
            <SectionTag icon="checkmark-circle" label="Outcomes" />
            <Text style={styles.sectionTitle}>Success Stories</Text>
            <Text style={styles.sectionSubtitle}>
              Outcomes and focus areas from {coach.name}&apos;s public profile.
            </Text>
            <View style={styles.storiesList}>
              {packages.map(pkg => (
                <SuccessStoryCard key={pkg.id} pkg={pkg} onSelect={selectPackageService} />
              ))}
            </View>
          </View>
        ) : null}

        {showRating ? (
          <View style={styles.section}>
            <SectionTag icon="checkmark-circle" label="Review" />
            <View style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <View style={styles.reviewHeaderCopy}>
                  <Text style={styles.reviewTitle}>Client ratings</Text>
                  <Text style={styles.reviewSubtitle}>Right where the guidance of Mera Coach.</Text>
                </View>
                <View style={styles.reviewShield}>
                  <Ionicons name="shield-checkmark" size={IconSize.lg} color={Colors.accentInk} />
                </View>
              </View>
              <View style={styles.reviewDivider} />
              <View style={styles.reviewScoreRow}>
                <View style={styles.reviewScoreCopy}>
                  <Text style={styles.reviewScore}>
                    {coach.rating.toFixed(1)}
                    <Text style={styles.reviewScoreOutOf}> / 5</Text>
                  </Text>
                  <Text style={styles.reviewCount}>
                    {coach.reviews} {coach.reviews === 1 ? 'review' : 'reviews'}
                  </Text>
                </View>
                <View style={styles.reviewStarsRow}>
                  {[1, 2, 3, 4, 5].map(i => (
                    <Ionicons
                      key={i}
                      name="star-outline"
                      size={IconSize.lg}
                      color={Colors.accent}
                    />
                  ))}
                </View>
              </View>
            </View>
          </View>
        ) : null}

        <EnquiryBookingForm
          coachId={coach.id}
          coachName={coach.name}
          serviceOptions={serviceOptions}
          hasServiceChoices={hasServiceChoices}
          servicePrefill={servicePrefill}
          scrollLowerFieldsIntoView={scrollLowerFieldsIntoView}
          onSectionLayout={onFormSectionLayout}
        />
      </KeyboardSafeScroll>
    </View>
  );
}

type PagerItem = { key: string; code: string; logicalIndex: number };

export default function CoachPublicProfileScreen({
  navigation,
  route,
}: RootScreenProps<'CoachPublicProfile'>) {
  const insets = useSafeAreaInsets();
  const { width: pageWidth, height: pageHeight } = useWindowDimensions();
  const queryClient = useQueryClient();
  const listCoach = route.params?.coach;
  const coachCode = route.params?.coachCode || listCoach?.id || '';
  const coachCodes = route.params?.coachCodes;
  const navCoaches = route.params?.coaches;

  const codes = useMemo(() => {
    if (coachCodes?.length) {
      const unique = [...new Set(coachCodes.filter(Boolean))];
      if (coachCode && !unique.includes(coachCode)) unique.unshift(coachCode);
      return unique;
    }
    return coachCode ? [coachCode] : [];
  }, [coachCodes, coachCode]);

  const listCoachByCode = useMemo(() => {
    const map = new Map<string, Coach>();
    for (const c of navCoaches ?? []) {
      if (c?.id) map.set(c.id, c);
    }
    if (listCoach?.id) map.set(listCoach.id, listCoach);
    const cachedLists = queryClient.getQueriesData<{ coaches: Coach[] }>({
      queryKey: queryKeys.coachPublicListRoot,
    });
    for (const [, data] of cachedLists) {
      for (const c of data?.coaches ?? []) {
        if (c?.id && !map.has(c.id)) map.set(c.id, c);
      }
    }
    return map;
  }, [navCoaches, listCoach, queryClient]);

  const initialIndex = useMemo(() => {
    if (!coachCode) return 0;
    const idx = codes.indexOf(coachCode);
    return idx >= 0 ? idx : 0;
  }, [codes, coachCode]);

  const canSwipe = codes.length > 1;

  const pagerData = useMemo((): PagerItem[] => {
    if (!canSwipe) {
      return codes.map((code, i) => ({ key: code, code, logicalIndex: i }));
    }
    const n = codes.length;
    const items: PagerItem[] = [
      { key: `clone-last-${codes[n - 1]}`, code: codes[n - 1], logicalIndex: n - 1 },
    ];
    for (let i = 0; i < n; i++) {
      items.push({ key: `real-${codes[i]}-${i}`, code: codes[i], logicalIndex: i });
    }
    items.push({ key: `clone-first-${codes[0]}`, code: codes[0], logicalIndex: 0 });
    return items;
  }, [canSwipe, codes]);

  const initialPagerIndex = canSwipe ? initialIndex + 1 : 0;

  const listRef = useRef<FlatList<PagerItem>>(null);
  const jumpingRef = useRef(false);
  const pagerIndexRef = useRef(initialPagerIndex);

  const goBack = useCallback(() => navigation.goBack(), [navigation]);
  const goHome = useCallback(() => navigation.navigate('Home', { page: 0 }), [navigation]);

  const prefetchAroundLogical = useCallback(
    (logicalIndex: number) => {
      if (!codes.length) return;
      const n = codes.length;
      const targets = canSwipe
        ? [logicalIndex, (logicalIndex - 1 + n) % n, (logicalIndex + 1) % n]
        : [logicalIndex];
      for (const i of targets) {
        const code = codes[i];
        if (!code) continue;
        void queryClient.prefetchQuery({
          queryKey: queryKeys.coachProfileByCode(code),
          queryFn: () => getCoachProfileByCode(code),
        });
      }
    },
    [canSwipe, codes, queryClient],
  );

  const scrollToPagerIndex = useCallback(
    (index: number, animated: boolean) => {
      if (pageWidth <= 0) return;
      listRef.current?.scrollToOffset({ offset: pageWidth * index, animated });
    },
    [pageWidth],
  );

  const onMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!canSwipe || pageWidth <= 0 || jumpingRef.current) return;
      const rawIndex = Math.round(e.nativeEvent.contentOffset.x / pageWidth);
      const lastClone = pagerData.length - 1;
      pagerIndexRef.current = rawIndex;

      if (rawIndex <= 0) {
        jumpingRef.current = true;
        pagerIndexRef.current = codes.length;
        scrollToPagerIndex(codes.length, false);
        prefetchAroundLogical(codes.length - 1);
        requestAnimationFrame(() => {
          jumpingRef.current = false;
        });
        return;
      }
      if (rawIndex >= lastClone) {
        jumpingRef.current = true;
        pagerIndexRef.current = 1;
        scrollToPagerIndex(1, false);
        prefetchAroundLogical(0);
        requestAnimationFrame(() => {
          jumpingRef.current = false;
        });
        return;
      }

      const logical = rawIndex - 1;
      prefetchAroundLogical(logical);
    },
    [
      canSwipe,
      pageWidth,
      pagerData.length,
      codes.length,
      scrollToPagerIndex,
      prefetchAroundLogical,
    ],
  );

  useEffect(() => {
    if (canSwipe) prefetchAroundLogical(initialIndex);
  }, [canSwipe, initialIndex, prefetchAroundLogical]);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<PagerItem>) => (
      <CoachProfilePage
        key={item.key}
        coachCode={item.code}
        listCoach={listCoachByCode.get(item.code)}
        onBack={goBack}
        onHome={goHome}
        pageWidth={pageWidth}
        pageHeight={pageHeight}
      />
    ),
    [goBack, goHome, listCoachByCode, pageHeight, pageWidth],
  );

  if (!codes.length) {
    return (
      <View style={styles.centered}>
        <HeaderBackButton
          onDark={false}
          onPress={goBack}
          style={[styles.backOnLight, { top: insets.top + 12 }]}
        />
        <EmptyState
          title="Coach not found"
          message="Open a coach from the directory to view their profile."
        />
      </View>
    );
  }

  return (
    <FlatList
      ref={listRef}
      style={styles.pager}
      data={pagerData}
      keyExtractor={item => item.key}
      horizontal
      pagingEnabled
      scrollEnabled={canSwipe}
      showsHorizontalScrollIndicator={false}
      bounces={canSwipe}
      removeClippedSubviews={false}
      initialScrollIndex={initialPagerIndex}
      getItemLayout={(_, index) => ({
        length: pageWidth,
        offset: pageWidth * index,
        index,
      })}
      onScrollToIndexFailed={({ index }) => {
        requestAnimationFrame(() => {
          scrollToPagerIndex(index, false);
        });
      }}
      onMomentumScrollEnd={onMomentumScrollEnd}
      renderItem={renderItem}
      windowSize={5}
      initialNumToRender={canSwipe ? 3 : 1}
      maxToRenderPerBatch={3}
      extraData={listCoachByCode}
    />
  );
}

const styles = StyleSheet.create({
  pager: { flex: 1, backgroundColor: Colors.exploreCanvas },
  page: { flex: 1, backgroundColor: Colors.exploreCanvas },
  container: { flex: 1, backgroundColor: Colors.exploreCanvas },
  centered: {
    flex: 1,
    backgroundColor: Colors.exploreCanvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backOnLight: {
    position: 'absolute',
    left: Spacing.lg - 4,
    ...Shadow.sm,
  },
  topHeader: {
    paddingBottom: Spacing.sm,
  },
  heroBlock: {
    paddingHorizontal: Spacing.md,
    overflow: 'visible',
  },
  photoCard: {
    borderTopLeftRadius: HERO_PHOTO_TOP_RADIUS,
    borderTopRightRadius: HERO_PHOTO_TOP_RADIUS,
    overflow: 'visible',
  },
  photoFrame: {
    width: '100%',
    aspectRatio: HERO_PHOTO_ASPECT,
    backgroundColor: Colors.backgroundTan,
    borderTopLeftRadius: HERO_PHOTO_TOP_RADIUS,
    borderTopRightRadius: HERO_PHOTO_TOP_RADIUS,
    overflow: 'hidden',
    zIndex: 1,
  },
  photoImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '110%',
  },
  photoFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.backgroundTan,
  },
  photoNav: {
    position: 'absolute',
    top: '50%',
    marginTop: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.accentInk,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  photoNavLeft: { left: Spacing.sm },
  photoNavRight: { right: Spacing.sm },
  infoPanel: {
    zIndex: 2,
    overflow: 'visible',
  },
  toneBand: {
    width: '100%',
  },
  infoBody: {
    backgroundColor: Colors.accentInk,
    borderBottomLeftRadius: HERO_PHOTO_TOP_RADIUS,
    borderBottomRightRadius: HERO_PHOTO_TOP_RADIUS,
  },
  infoContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  name: {
    color: Colors.white,
    fontSize: 22,
    lineHeight: 28,
    fontFamily: headingFont.bold,
    marginBottom: 6,
  },
  categoryPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#4A6B5E',
    borderRadius: Radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: Spacing.sm,
    maxWidth: '100%',
  },
  categoryText: {
    color: Colors.white,
    fontSize: 12,
    fontFamily: FontFamily.medium,
    flexShrink: 1,
  },
  bio: {
    color: Colors.white,
    fontSize: 13,
    fontFamily: FontFamily.regular,
    lineHeight: 21,
    marginBottom: Spacing.sm,
  },
  photoPager: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: '#0A3D2E',
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    marginTop: Spacing.xs,
  },
  photoPagerText: {
    color: Colors.white,
    fontSize: 12,
    fontFamily: FontFamily.bold,
    minWidth: 40,
    textAlign: 'center',
  },
  waBtn: {
    alignSelf: 'stretch',
    zIndex: 4,
  },
  statsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.xs,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    paddingVertical: Spacing.md,
    ...Shadow.sm,
  },
  statItem: { flex: 1, minWidth: 0, alignItems: 'center', gap: 4, paddingHorizontal: 2 },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    marginVertical: Spacing.xs,
    backgroundColor: Colors.border,
  },
  statValue: {
    fontSize: 16,
    fontFamily: headingFont.extraBold,
    color: Colors.accentInk,
    maxWidth: '100%',
  },
  statLabel: {
    fontSize: 10,
    fontFamily: FontFamily.medium,
    color: Colors.accentInk,
    textAlign: 'center',
    maxWidth: '100%',
  },
  section: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 22,
    fontFamily: headingFont.extraBold,
    color: Colors.textDark,
    marginBottom: 6,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontFamily: FontFamily.regular,
    color: Colors.textLight,
    lineHeight: 19,
    marginBottom: Spacing.md,
  },
  expertiseChipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  expertiseChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.white,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
    maxWidth: '100%',
  },
  expertiseTitle: {
    fontSize: 12,
    fontFamily: FontFamily.semibold,
    color: Colors.accentInk,
    lineHeight: 16,
    flexShrink: 1,
  },
  storiesList: { gap: Spacing.sm },
  storyCard: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: Spacing.sm,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    padding: Spacing.md,
    ...Shadow.sm,
  },
  storyCopy: { flex: 1, minWidth: 0 },
  focusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: Colors.secondaryLight,
    borderRadius: Radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: Spacing.xs,
  },
  focusPillText: {
    color: Colors.accentInk,
    fontSize: 11,
    fontFamily: FontFamily.bold,
  },
  storyTitle: {
    fontSize: 16,
    fontFamily: headingFont.bold,
    color: Colors.textDark,
    marginBottom: 4,
  },
  storyBody: {
    fontSize: 12,
    fontFamily: FontFamily.regular,
    color: Colors.textLight,
    lineHeight: 18,
  },
  storyImage: {
    width: 96,
    height: 96,
    borderRadius: Radius.md,
    backgroundColor: Colors.backgroundTan,
  },
  storyImagePlaceholder: {
    width: 96,
    height: 96,
    borderRadius: Radius.md,
    backgroundColor: Colors.secondaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    padding: Spacing.lg,
    ...Shadow.sm,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  reviewHeaderCopy: { flex: 1, minWidth: 0 },
  reviewTitle: {
    fontSize: 18,
    fontFamily: headingFont.extraBold,
    color: Colors.textDark,
  },
  reviewSubtitle: {
    marginTop: 4,
    fontSize: 12,
    fontFamily: FontFamily.regular,
    color: Colors.textLight,
    lineHeight: 17,
  },
  reviewShield: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.secondaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  reviewDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },
  reviewScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  reviewScoreCopy: { flexShrink: 1, minWidth: 0 },
  reviewScore: {
    fontSize: 28,
    lineHeight: 34,
    fontFamily: headingFont.bold,
    color: Colors.textDark,
  },
  reviewScoreOutOf: {
    fontSize: 16,
    fontFamily: FontFamily.semibold,
    color: Colors.textLight,
  },
  reviewCount: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: FontFamily.regular,
    color: Colors.textLight,
  },
  reviewStarsRow: { flexDirection: 'row', alignItems: 'center', gap: 3, flexShrink: 0 },
  bookingSection: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
    gap: Spacing.md,
  },
  bookingIntro: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.secondaryLight,
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  bookingIntroCopy: { flex: 1, minWidth: 0 },
  bookingLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginBottom: 8,
    backgroundColor: Colors.white,
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  bookingLabel: {
    color: Colors.accentInk,
    fontSize: 12,
    fontFamily: FontFamily.bold,
  },
  bookingTitle: {
    fontSize: 20,
    fontFamily: headingFont.extraBold,
    color: Colors.textDark,
    marginBottom: 6,
  },
  bookingSubtitle: {
    fontSize: 12,
    fontFamily: FontFamily.regular,
    color: Colors.textLight,
    lineHeight: 18,
  },
  bookingBubble: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  bookingBubbleLines: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingBottom: 4,
  },
  bookingBubbleLine: {
    width: 14,
    height: 2,
    borderRadius: 1,
    backgroundColor: Colors.white,
  },
  formCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  field: { marginBottom: 14 },
  fieldLast: { marginBottom: 0 },
  inputWrap: {
    ...formFieldStyles.wrap,
    ...formFieldStyles.wrapSurface,
  },
  input: formFieldStyles.input,
  formCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    minHeight: 72,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: 36,
    marginTop: Spacing.xs,
    ...Shadow.md,
  },
  formCtaCopy: {
    alignItems: 'center',
    flexShrink: 1,
    minWidth: 0,
  },
  formCtaText: {
    color: Colors.white,
    fontSize: 16,
    fontFamily: headingFont.bold,
    lineHeight: 20,
    textAlign: 'center',
  },
  formCtaIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.white,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
