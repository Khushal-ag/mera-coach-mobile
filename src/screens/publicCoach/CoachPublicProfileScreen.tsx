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
import WhatsAppCoachButton from '../../components/publicCoach/WhatsAppCoachButton';
import ShowcaseSections from '../../components/publicCoach/ShowcaseSections';
import ReviewsList from '../../components/reviews/ReviewsList';
import { useCoachReviews } from '../../hooks/useReviews';
import { getPublicShowcase, type Showcase } from '../../api/showcaseApi';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import AppButton from '../../components/AppButton';
import PersonAvatar from '../../components/PersonAvatar';
import PhoneTextInput from '../../components/PhoneTextInput';
import DropdownField from '../../components/DropdownField';
import EmptyState from '../../components/EmptyState';
import FormErrorBanner from '../../components/FormErrorBanner';
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
import { queryKeys } from '../../api/queryKeys';
import { getErrorMessage } from '../../api/client';
import {
  buildPublicProfileStats,
  resolvePublicClientCount,
  shouldShowPublicRating,
} from '../../utils/coachPublicStats';
import { formatExpertiseLabel, stripTrailingTagsFromBio } from '../../utils/coachDisplay';
import { mergeCoachProfile } from '../../utils/mergeCoachProfile';
import { isDegenerateImageSize, resolveCoachPhotoUrl } from '../../utils/mediaUrl';
import { shareCoachPublicProfile } from '../../utils/sharePublicProfile';
import {
  validateMobile,
  validateOptionalEmail,
  validateRequired,
  sanitizeEmailInput,
} from '../../utils/validation';
import type { RootScreenProps } from '../../types/navigation';
import type { Coach } from '../../types/models';
import type { IoniconName } from '../../types/icons';

interface EnquiryForm {
  name: string;
  mobile: string;
  email: string;
  service: string;
}

const BLANK_FORM: EnquiryForm = { name: '', mobile: '', email: '', service: '' };
const EMPTY_SHOWCASE: Showcase = { packages: [], posts: [] };

const STAT_ICONS: Record<string, IoniconName> = {
  clients: 'people-outline',
  experience: 'star',
  services: 'calendar-outline',
  rating: 'star-outline',
};

const HERO_PHOTO_ASPECT = 1.28;
/** Wide public banner above the portrait card. Width / height. */
const HERO_PHOTO_FOCUS = 1.32;
const HERO_CURVE_LIP_RATIO = 19 / 226;
const HERO_PHOTO_TOP_RADIUS = 28;
const HERO_PHOTO_NAV_SIZE = 38;
const HERO_PHOTO_NAV_INSET = 14;
const HERO_PHOTO_NAV_ICON = 18;
const EXPERTISE_COLUMNS = 3;
const EXPERTISE_CHIP_HEIGHT = 42;
const EXPERTISE_LABEL_FONT_SIZE = 12;
const EXPERTISE_LABEL_MIN_SCALE = 0.6;
const EXPERTISE_CHECK_SIZE = 16;
const SECTION_PILL_BG = '#E8F7F2';
const SECTION_PILL_INK = '#04705D';
const BOOKING_FADE_COLORS = ['#F2F9F4', '#F0F8F3', '#EEF8F2', '#ECF7F1'] as const;
const BOOKING_FADE_OVERLAP = 8;

function heroPhotoImageLayout(frameWidth: number, sourceAspect: number | null) {
  const frameHeight = frameWidth / HERO_PHOTO_ASPECT;
  const aspect = sourceAspect && sourceAspect > 0 ? sourceAspect : HERO_PHOTO_ASPECT;
  const heightAtFrameWidth = frameWidth / aspect;
  const widthMatched = heightAtFrameWidth >= frameHeight;
  const coverWidth = widthMatched ? frameWidth : frameHeight * aspect;
  const coverHeight = widthMatched ? heightAtFrameWidth : frameHeight;
  const width = coverWidth * HERO_PHOTO_FOCUS;
  const height = coverHeight * HERO_PHOTO_FOCUS;
  return {
    position: 'absolute' as const,
    top: 0,
    left: (frameWidth - width) / 2,
    width,
    height,
  };
}

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
  logicalIndex: number;
  coachCount: number;
  onShowCoach: (index: number) => void;
};

type ProfileHeroProps = {
  contentWidth: number;
  smileHeight: number;
  waBtnHeight: number;
  activePhoto: string | null;
  coachCode: string;
  name: string;
  category?: string;
  bio: string;
  whatsAppUrl: string | null;
  showCoachNav: boolean;
  onPrevCoach: () => void;
  onNextCoach: () => void;
  onMarkPhotoFailed: (uri: string) => void;
};

const ProfileHero = React.memo(function ProfileHero({
  contentWidth,
  smileHeight,
  waBtnHeight,
  activePhoto,
  coachCode,
  name,
  category,
  bio,
  whatsAppUrl,
  showCoachNav,
  onPrevCoach,
  onNextCoach,
  onMarkPhotoFailed,
}: ProfileHeroProps) {
  const photoSource = useMemo(() => (activePhoto ? { uri: activePhoto } : null), [activePhoto]);
  const [sourceAspect, setSourceAspect] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [trackedPhoto, setTrackedPhoto] = useState(activePhoto);
  const [trackedCoachCode, setTrackedCoachCode] = useState(coachCode);
  if (activePhoto !== trackedPhoto) {
    setTrackedPhoto(activePhoto);
    setSourceAspect(null);
  }
  if (coachCode !== trackedCoachCode) {
    setTrackedCoachCode(coachCode);
    setActionError(null);
  }
  const photoImageStyle = useMemo(
    () => heroPhotoImageLayout(contentWidth, sourceAspect),
    [contentWidth, sourceAspect],
  );
  const smileStyle = useMemo(
    () => ({ width: contentWidth, height: smileHeight }),
    [contentWidth, smileHeight],
  );
  const waOverlap = waBtnHeight / 2;
  const waBtnStyle = useMemo(
    () => ({ height: waBtnHeight, marginTop: -waOverlap }),
    [waBtnHeight, waOverlap],
  );
  const photoNavStyle = useMemo(() => {
    const photoHeight = contentWidth / HERO_PHOTO_ASPECT;
    const visibleHeight = Math.max(
      HERO_PHOTO_NAV_SIZE,
      photoHeight - smileHeight * HERO_CURVE_LIP_RATIO,
    );
    return {
      top: (visibleHeight - HERO_PHOTO_NAV_SIZE) / 2,
      width: HERO_PHOTO_NAV_SIZE,
      height: HERO_PHOTO_NAV_SIZE,
      borderRadius: HERO_PHOTO_NAV_SIZE / 2,
    };
  }, [contentWidth, smileHeight]);

  const openWhatsApp = () => {
    if (!whatsAppUrl) return;
    setActionError(null);
    Linking.openURL(whatsAppUrl).catch(() => setActionError('Could not open WhatsApp.'));
  };

  const shareProfile = () => {
    setActionError(null);
    void shareCoachPublicProfile({ coachCode, coachName: name }).catch(err => {
      setActionError(getErrorMessage(err, 'Could not share this profile link.'));
    });
  };

  return (
    <View style={styles.heroBlock}>
      <View style={styles.photoCard}>
        <View style={styles.photoFrame}>
          {photoSource ? (
            <Image
              source={photoSource}
              style={photoImageStyle}
              resizeMode="cover"
              onError={() => {
                if (activePhoto) onMarkPhotoFailed(activePhoto);
              }}
              onLoad={e => {
                const { width, height } = e.nativeEvent.source;
                if (activePhoto && isDegenerateImageSize(width, height)) {
                  onMarkPhotoFailed(activePhoto);
                  return;
                }
                if (width > 0 && height > 0) {
                  const next = width / height;
                  setSourceAspect(prev => (prev === next ? prev : next));
                }
              }}
            />
          ) : (
            <View style={styles.photoFallback}>
              <PersonAvatar size={128} />
            </View>
          )}
          {showCoachNav ? (
            <TouchableOpacity
              style={[styles.photoNav, styles.photoNavLeft, photoNavStyle]}
              onPress={onPrevCoach}
              hitSlop={HitSlop.sm}
              accessibilityRole="button"
              accessibilityLabel="Previous coach"
              activeOpacity={PressOpacity.soft}
            >
              <Ionicons name="chevron-back" size={HERO_PHOTO_NAV_ICON} color={Colors.white} />
            </TouchableOpacity>
          ) : null}
          {showCoachNav ? (
            <TouchableOpacity
              style={[styles.photoNav, styles.photoNavRight, photoNavStyle]}
              onPress={onNextCoach}
              hitSlop={HitSlop.sm}
              accessibilityRole="button"
              accessibilityLabel="Next coach"
              activeOpacity={PressOpacity.soft}
            >
              <Ionicons name="chevron-forward" size={HERO_PHOTO_NAV_ICON} color={Colors.white} />
            </TouchableOpacity>
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
                paddingBottom: whatsAppUrl ? waOverlap + Spacing.md + 2 : Spacing.md,
              },
            ]}
          >
            <View style={styles.infoContent}>
              <Text style={styles.name} numberOfLines={2}>
                {name}
              </Text>
              {category ? (
                <View style={styles.categoryPill}>
                  <Ionicons name="person-outline" size={IconSize.sm} color={Colors.white} />
                  <Text style={styles.categoryText} numberOfLines={1}>
                    {category}
                  </Text>
                </View>
              ) : null}
              {bio ? <Text style={styles.bio}>{bio}</Text> : null}
            </View>
          </View>
        </View>
      </View>

      {whatsAppUrl ? (
        <WhatsAppCoachButton
          width={contentWidth}
          height={waBtnHeight}
          onPress={openWhatsApp}
          style={[styles.waBtn, waBtnStyle]}
        />
      ) : null}
      <AppButton
        label="Share profile"
        variant="secondary"
        icon="share-social-outline"
        iconPosition="left"
        onPress={shareProfile}
        style={[styles.shareBtn, !whatsAppUrl && styles.shareBtnSolo]}
        accessibilityLabel="Share profile"
      />
      <FormErrorBanner message={actionError} />
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
    const [formError, setFormError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const submittingRef = useRef(false);
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
      if (submittingRef.current) return;
      const validationError =
        validateRequired(form.name, 'Name') ||
        validateMobile(form.mobile) ||
        validateOptionalEmail(form.email) ||
        (!form.service.trim() ? 'Please select what you are looking for.' : null);
      if (validationError) {
        setFormError(validationError);
        return;
      }
      setFormError(null);

      submittingRef.current = true;
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
        setFormError(getErrorMessage(err, 'Please try again.'));
      } finally {
        submittingRef.current = false;
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
          <View pointerEvents="none" style={styles.bookingFade}>
            {BOOKING_FADE_COLORS.map((color, index) => {
              const share = 100 / BOOKING_FADE_COLORS.length;
              return (
                <View
                  key={color}
                  style={[
                    styles.bookingFadeStrip,
                    {
                      backgroundColor: color,
                      top: `${index * share}%`,
                      height: `${share + BOOKING_FADE_OVERLAP}%`,
                    },
                  ]}
                />
              );
            })}
          </View>
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
          <FormErrorBanner message={formError} />
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
                <Ionicons name="arrow-forward-outline" size={IconSize.md} color={Colors.white} />
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
  logicalIndex,
  coachCount,
  onShowCoach,
}: ProfilePageProps) {
  const insets = useSafeAreaInsets();
  const profileQuery = useQuery({
    queryKey: queryKeys.coachProfileByCode(coachCode),
    queryFn: () => getCoachProfileByCode(coachCode),
    enabled: !!coachCode,
    placeholderData: listCoach?.id === coachCode ? listCoach : undefined,
  });

  const listMatch = listCoach?.id === coachCode ? listCoach : undefined;
  const coach =
    profileQuery.isError && !profileQuery.data
      ? undefined
      : mergeCoachProfile(profileQuery.data, listMatch);
  const clientCount = coach ? resolvePublicClientCount({ marketingClients: coach.clients }) : null;
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
  const showcaseQuery = useQuery({
    queryKey: queryKeys.publicShowcase(coachCode),
    queryFn: () => getPublicShowcase(coachCode),
    enabled: !!coachCode,
  });
  const showcase = showcaseQuery.data ?? EMPTY_SHOWCASE;
  const reviewsQuery = useCoachReviews(coachCode);
  const hasReviews = (reviewsQuery.data?.pages[0]?.items.length ?? 0) > 0;
  const packages = showcase.packages;
  const scrollRef = useRef<ScrollView>(null);
  const formSectionY = useRef(0);
  const scrollLowerFieldsIntoView = useScrollLowerFieldsIntoView(scrollRef);
  const [servicePrefill, setServicePrefill] = useState<ServicePrefill | null>(null);
  const [failedPhotoUri, setFailedPhotoUri] = useState<string | null>(null);
  const [trackedCoachCode, setTrackedCoachCode] = useState(coachCode);
  if (coachCode !== trackedCoachCode) {
    setTrackedCoachCode(coachCode);
    setFailedPhotoUri(null);
    setServicePrefill(null);
  }

  const heroPhoto = coach ? resolveCoachPhotoUrl(coach) : '';
  const whatsAppUrl = coach ? whatsAppUrlFromMobile(coach.mobile) : null;
  const activePhoto = heroPhoto && heroPhoto !== failedPhotoUri ? heroPhoto : null;
  const showCoachNav = coachCount > 1;
  const contentWidth = Math.max(0, pageWidth - Spacing.md * 2);
  const expertiseChipWidth = Math.max(
    0,
    Math.floor((contentWidth - Spacing.xs * (EXPERTISE_COLUMNS - 1)) / EXPERTISE_COLUMNS),
  );
  const smileHeight = Math.round(contentWidth / HERO_SMILE_MASK_ASPECT);
  const waBtnHeight = contentWidth / WHATSAPP_COACH_BUTTON_ASPECT;
  const serviceOptions = [
    ...packages.map(p => p.packageName),
    ...(coach?.tags.length ? coach.tags.map(formatExpertiseLabel) : []),
    SERVICE_INQUIRY_FALLBACK,
  ];
  const hasServiceChoices = packages.length > 0 || (coach?.tags.length ?? 0) > 0;

  const scrollToForm = useCallback(() => {
    scrollRef.current?.scrollTo({ y: Math.max(0, formSectionY.current - 12), animated: true });
  }, []);

  const goPrevCoach = useCallback(() => {
    if (coachCount <= 1) return;
    onShowCoach(logicalIndex <= 0 ? coachCount - 1 : logicalIndex - 1);
  }, [coachCount, logicalIndex, onShowCoach]);

  const goNextCoach = useCallback(() => {
    if (coachCount <= 1) return;
    onShowCoach(logicalIndex >= coachCount - 1 ? 0 : logicalIndex + 1);
  }, [coachCount, logicalIndex, onShowCoach]);

  const markPhotoFailed = useCallback((uri: string) => {
    setFailedPhotoUri(prev => (prev === uri ? prev : uri));
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
        <View style={[styles.topHeader, { paddingTop: insets.top + Spacing.xs }]}>
          <PublicHomeHeader onHomePress={onHome} />
        </View>

        <ProfileHero
          contentWidth={contentWidth}
          smileHeight={smileHeight}
          waBtnHeight={waBtnHeight}
          activePhoto={activePhoto}
          coachCode={coach.id}
          name={coach.name}
          category={coach.category}
          bio={heroBio}
          whatsAppUrl={whatsAppUrl}
          showCoachNav={showCoachNav}
          onPrevCoach={goPrevCoach}
          onNextCoach={goNextCoach}
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
            <SectionTag
              icon="ribbon-outline"
              label="Expertise"
              color={SECTION_PILL_INK}
              style={styles.sectionPill}
            />
            <Text style={styles.sectionTitle}>What I Specialise In</Text>
            <Text style={styles.sectionSubtitle}>Services and topics on this profile.</Text>
            <View
              style={styles.expertiseChipGroup}
              accessibilityRole="text"
              accessibilityLabel={`Expertise: ${coach.tags.map(formatExpertiseLabel).join(', ')}`}
            >
              {Array.from(
                { length: Math.ceil(coach.tags.length / EXPERTISE_COLUMNS) },
                (_, rowIndex) => {
                  const rowTags = coach.tags.slice(
                    rowIndex * EXPERTISE_COLUMNS,
                    rowIndex * EXPERTISE_COLUMNS + EXPERTISE_COLUMNS,
                  );
                  return (
                    <View key={rowTags.join('\0')} style={styles.expertiseRow}>
                      {rowTags.map(tag => (
                        <View
                          key={tag}
                          style={[styles.expertiseChip, { width: expertiseChipWidth }]}
                          importantForAccessibility="no-hide-descendants"
                        >
                          <View style={styles.expertiseCheck}>
                            <Ionicons name="checkmark" size={10} color={Colors.accentInk} />
                          </View>
                          <Text
                            style={styles.expertiseTitle}
                            numberOfLines={1}
                            adjustsFontSizeToFit
                            minimumFontScale={EXPERTISE_LABEL_MIN_SCALE}
                          >
                            {formatExpertiseLabel(tag)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  );
                },
              )}
            </View>
          </View>
        ) : null}

        <ShowcaseSections showcase={showcase} onSelectPackage={selectPackageService} />

        {showRating && (hasReviews || reviewsQuery.isLoading) ? (
          <View style={styles.section}>
            <SectionTag
              icon="star-outline"
              label="Reviews"
              color={SECTION_PILL_INK}
              style={styles.sectionPill}
            />
            <ReviewsList query={reviewsQuery} />
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

  const pagerData = useMemo(
    (): PagerItem[] => codes.map((code, i) => ({ key: code, code, logicalIndex: i })),
    [codes],
  );

  const listRef = useRef<FlatList<PagerItem>>(null);
  const pagerIndexRef = useRef(initialIndex);

  const goBack = useCallback(() => navigation.goBack(), [navigation]);
  const goHome = useCallback(() => navigation.navigate('Home', { page: 0 }), [navigation]);

  const prefetchAroundLogical = useCallback(
    (logicalIndex: number) => {
      const len = codes.length;
      if (!len) return;
      const targets = [logicalIndex - 1, logicalIndex, logicalIndex + 1].map(
        i => ((i % len) + len) % len,
      );
      for (const i of new Set(targets)) {
        const code = codes[i];
        if (!code) continue;
        void queryClient.prefetchQuery({
          queryKey: queryKeys.coachProfileByCode(code),
          queryFn: () => getCoachProfileByCode(code),
        });
      }
    },
    [codes, queryClient],
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
      if (!canSwipe || pageWidth <= 0) return;
      const index = Math.round(e.nativeEvent.contentOffset.x / pageWidth);
      if (index < 0 || index >= codes.length) return;
      pagerIndexRef.current = index;
      prefetchAroundLogical(index);
    },
    [canSwipe, pageWidth, codes.length, prefetchAroundLogical],
  );

  const goToLogicalIndex = useCallback(
    (index: number) => {
      if (index < 0 || index >= codes.length) return;
      const adjacent = Math.abs(index - pagerIndexRef.current) === 1;
      pagerIndexRef.current = index;
      scrollToPagerIndex(index, adjacent);
      prefetchAroundLogical(index);
    },
    [codes.length, scrollToPagerIndex, prefetchAroundLogical],
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
        logicalIndex={item.logicalIndex}
        coachCount={codes.length}
        onShowCoach={goToLogicalIndex}
      />
    ),
    [codes.length, goBack, goHome, goToLogicalIndex, listCoachByCode, pageHeight, pageWidth],
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
      initialScrollIndex={initialIndex}
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
    paddingHorizontal: Spacing.md,
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
  photoFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.backgroundTan,
  },
  photoNav: {
    position: 'absolute',
    backgroundColor: Colors.accentInk,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  photoNavLeft: { left: HERO_PHOTO_NAV_INSET },
  photoNavRight: { right: HERO_PHOTO_NAV_INSET },
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
  },
  waBtn: {
    alignSelf: 'stretch',
    zIndex: 4,
  },
  shareBtn: {
    alignSelf: 'stretch',
    marginTop: Spacing.sm,
  },
  shareBtnSolo: {
    marginTop: Spacing.md,
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
  sectionPill: {
    backgroundColor: SECTION_PILL_BG,
  },
  expertiseChipGroup: {
    gap: Spacing.xs,
  },
  expertiseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  expertiseChip: {
    height: EXPERTISE_CHIP_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 0,
    flexShrink: 0,
    gap: 6,
    backgroundColor: Colors.white,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    paddingHorizontal: 8,
    overflow: 'hidden',
  },
  expertiseCheck: {
    width: EXPERTISE_CHECK_SIZE,
    height: EXPERTISE_CHECK_SIZE,
    borderRadius: EXPERTISE_CHECK_SIZE / 2,
    borderWidth: 1.5,
    borderColor: Colors.accentInk,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  expertiseTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: EXPERTISE_LABEL_FONT_SIZE,
    fontFamily: FontFamily.semibold,
    color: Colors.accentInk,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
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
    backgroundColor: BOOKING_FADE_COLORS[0],
    borderRadius: Radius.lg,
    padding: Spacing.md,
    overflow: 'hidden',
  },
  bookingFade: {
    ...StyleSheet.absoluteFill,
  },
  bookingFadeStrip: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  bookingIntroCopy: { flex: 1, minWidth: 0, zIndex: 1 },
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
    zIndex: 1,
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
