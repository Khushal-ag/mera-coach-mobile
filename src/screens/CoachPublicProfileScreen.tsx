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
import { Colors, Radius, Shadow, STORY_CARD_WIDTH } from '../constants/theme';
import PhoneTextInput from '../components/PhoneTextInput';
import DropdownField from '../components/DropdownField';
import EmptyState from '../components/EmptyState';
import FormFieldLabel from '../components/FormFieldLabel';
import KeyboardSafeScroll, { useScrollLowerFieldsIntoView } from '../components/KeyboardSafeScroll';
import { HeaderBackButton } from '../components/ScreenHeader';
import { SERVICE_INQUIRY_FALLBACK } from '../data/coachProfileContent';
import { getCoachProfileByCode, submitCoachEnquiry, whatsAppUrlFromMobile } from '../api/coachApi';
import { getClientList } from '../api/clientApi';
import { queryKeys } from '../api/queryKeys';
import { getCurrentCoachCode, isAuthenticated } from '../auth/session';
import { getErrorMessage } from '../api/client';
import {
  buildPublicProfileStats,
  resolvePublicClientCount,
  shouldShowPublicRating,
} from '../utils/coachPublicStats';
import { buildCoachSuccessHighlights } from '../utils/coachPublicSocialProof';
import { resolveMediaUrl } from '../utils/mediaUrl';
import { nameInitials } from '../utils/initials';
import {
  validateMobile,
  validateOptionalEmail,
  validateRequired,
  sanitizeEmailInput,
} from '../utils/validation';
import type { RootScreenProps } from '../types/navigation';
import type { Coach } from '../types/models';

interface EnquiryForm {
  name: string;
  mobile: string;
  email: string;
  service: string;
}

const BLANK_FORM: EnquiryForm = { name: '', mobile: '', email: '', service: '' };

type ProfilePageProps = {
  coachCode: string;
  listCoach?: Coach;
  onBack: () => void;
  pageWidth: number;
  pageHeight: number;
  /** 0-based logical index in the real coach list (1..N indicator uses +1). */
  pageIndex?: number;
  pageCount?: number;
  /** When wrap-around is enabled, both edge chevrons stay visible. */
  wrapAround?: boolean;
  onPrevPage?: () => void;
  onNextPage?: () => void;
};

const MAX_PAGE_DOTS = 10;

/** Prefer profile-by-id; fill gaps from the directory row. */
function mergeCoachProfile(api: Coach | undefined, list: Coach | undefined): Coach | undefined {
  if (!api && !list) return undefined;
  if (!api) return list;
  if (!list || list.id !== api.id) return api;
  return {
    ...list,
    ...api,
    // Strings/arrays: keep list only when API left them empty.
    category: api.category || list.category,
    categoryCode: api.categoryCode || list.categoryCode,
    bio: api.bio || list.bio,
    tagline: api.tagline || list.tagline,
    tags: api.tags.length ? api.tags : list.tags,
    city: api.city || list.city,
    country: api.country || list.country,
    profilePicUrl: api.profilePicUrl || list.profilePicUrl,
    logoUrl: api.logoUrl || list.logoUrl,
    mobile: api.mobile || list.mobile,
    // Numbers from profile-by-id: keep API zeros for clients (happyClientCount) / experience.
    // reviewCount is often omitted on profile-by-id (mapped to 0) — keep list reviews then.
    rating: api.rating > 0 ? api.rating : list.rating,
    reviews: api.reviews > 0 ? api.reviews : list.reviews,
    clients: api.clients,
    experience: api.experience > 0 ? api.experience : list.experience,
  };
}

function CoachProfilePage({
  coachCode,
  listCoach,
  onBack,
  pageWidth,
  pageHeight,
  pageIndex = 0,
  pageCount = 1,
  wrapAround = false,
  onPrevPage,
  onNextPage,
}: ProfilePageProps) {
  const insets = useSafeAreaInsets();
  const profileQuery = useQuery({
    queryKey: queryKeys.coachProfileByCode(coachCode),
    queryFn: () => getCoachProfileByCode(coachCode),
    enabled: !!coachCode,
    // Show directory row immediately; profile-by-id still fills mobile/tagline in background.
    placeholderData: listCoach?.id === coachCode ? listCoach : undefined,
  });

  const myCoachCode = getCurrentCoachCode();
  const isOwnProfile = isAuthenticated() && !!myCoachCode && myCoachCode === coachCode;
  const myClientsQuery = useQuery({
    queryKey: queryKeys.clientList(myCoachCode),
    queryFn: () => getClientList(),
    enabled: isOwnProfile,
  });

  const listMatch = listCoach?.id === coachCode ? listCoach : undefined;
  // placeholderData shows the directory row while pending; on hard failure with no
  // successful cache, do not fall back to list-only or WhatsApp/mobile never load
  // and the EmptyState error path is skipped.
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
  const successHighlights = coach
    ? buildCoachSuccessHighlights({
        name: coach.name,
        clients: clientCount ?? coach.clients,
        experience: coach.experience,
        bio: coach.bio,
        tagline: coach.tagline,
        tags: coach.tags,
        category: coach.category,
      })
    : [];
  const showSuccessStories = successHighlights.length > 0;
  const scrollRef = useRef<ScrollView>(null);
  const scrollLowerFieldsIntoView = useScrollLowerFieldsIntoView(scrollRef);
  const [form, setForm] = useState<EnquiryForm>(BLANK_FORM);
  const [submitting, setSubmitting] = useState(false);
  const update = <K extends keyof EnquiryForm>(key: K, val: EnquiryForm[K]) =>
    setForm(f => (f[key] === val ? f : { ...f, [key]: val }));

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
          <EmptyState
            title="Could not load profile"
            message={getErrorMessage(profileQuery.error, 'Please try again.')}
          />
        </View>
      </View>
    );
  }

  const initials = nameInitials(coach.name);
  const photoUri = resolveMediaUrl(coach.profilePicUrl);
  const serviceOptions = [...(coach.tags.length ? coach.tags : []), SERVICE_INQUIRY_FALLBACK];
  const showSwipeHint = pageCount > 1;
  const showDots = showSwipeHint && pageCount <= MAX_PAGE_DOTS;
  const showLeftChevron = showSwipeHint && (wrapAround || pageIndex > 0);
  const showRightChevron = showSwipeHint && (wrapAround || pageIndex < pageCount - 1);

  const openWhatsApp = () => {
    const url = whatsAppUrlFromMobile(coach.mobile);
    if (!url) {
      Alert.alert('WhatsApp unavailable', 'This coach has not shared a mobile number yet.');
      return;
    }
    Linking.openURL(url).catch(() => Alert.alert('Unable to open WhatsApp'));
  };

  const submitEnquiry = async () => {
    const validationError =
      validateRequired(form.name, 'Name') ||
      validateMobile(form.mobile) ||
      validateOptionalEmail(form.email) ||
      (!form.service ? 'Please select what you are looking for.' : null);
    if (validationError) return Alert.alert('Validation Error', validationError);

    setSubmitting(true);
    try {
      await submitCoachEnquiry({
        coachCode: coach.id,
        clientName: form.name.trim(),
        clientMobile: form.mobile.trim(),
        clientEmail: form.email.trim() || undefined,
        lookingFor: form.service,
      });
      Alert.alert(
        'Enquiry Sent!',
        `Your enquiry has been sent to ${coach.name}. They usually reply within 24 hours.`,
      );
      setForm(BLANK_FORM);
    } catch (err) {
      Alert.alert('Something went wrong', getErrorMessage(err, 'Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.page, { width: pageWidth, height: pageHeight }]}>
      <KeyboardSafeScroll
        ref={scrollRef}
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        // Keep padding inside the white form so the cream page bg never shows as a bottom strip.
        keyboardPadding={0}
        directionalLockEnabled
        nestedScrollEnabled
      >
        <View style={[styles.hero, { paddingTop: insets.top + 12 }]}>
          <HeaderBackButton onPress={onBack} style={styles.heroBack} />

          <View style={styles.photoBanner}>
            {photoUri ? (
              <Image
                source={{ uri: photoUri }}
                style={styles.photoBannerImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.photoBannerFallback}>
                <Text style={styles.photoBannerInitials}>{initials || '?'}</Text>
              </View>
            )}
            {showLeftChevron ? (
              <View style={styles.navChevronSlotLeft} pointerEvents="box-none">
                <TouchableOpacity
                  style={styles.navChevron}
                  onPress={onPrevPage}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  accessibilityRole="button"
                  accessibilityLabel="Previous coach"
                  activeOpacity={0.75}
                >
                  <Ionicons name="chevron-back" size={24} color={Colors.white} />
                </TouchableOpacity>
              </View>
            ) : null}
            {showRightChevron ? (
              <View style={styles.navChevronSlotRight} pointerEvents="box-none">
                <TouchableOpacity
                  style={styles.navChevron}
                  onPress={onNextPage}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  accessibilityRole="button"
                  accessibilityLabel="Next coach"
                  activeOpacity={0.75}
                >
                  <Ionicons name="chevron-forward" size={24} color={Colors.white} />
                </TouchableOpacity>
              </View>
            ) : null}
          </View>

          <View style={styles.tagsRow}>
            {coach.category ? (
              <View style={styles.categoryBadge}>
                <Ionicons name="ribbon-outline" size={12} color={Colors.white} />
                <Text style={styles.categoryBadgeText}>{coach.category}</Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.name}>{coach.name}</Text>

          {(showRating || (clientCount != null && clientCount > 0)) && (
            <View style={styles.ratingRow}>
              {showRating ? (
                <>
                  <Ionicons name="star" size={14} color={Colors.accent} />
                  <Text style={styles.ratingVal}>
                    {coach.rating} ({coach.reviews})
                  </Text>
                </>
              ) : null}
              {clientCount != null && clientCount > 0 ? (
                <Text style={styles.ratingCount}>
                  {showRating ? ' · ' : ''}
                  {clientCount} clients
                </Text>
              ) : null}
            </View>
          )}

          {coach.bio ? <Text style={styles.bio}>{coach.bio}</Text> : null}

          {coach.tags.length > 0 ? (
            <View style={[styles.specialtyWrap, showSwipeHint && styles.specialtyWrapTight]}>
              {coach.tags.map(tag => (
                <View key={tag} style={styles.specialtyTag}>
                  <Ionicons name="checkmark" size={11} color="rgba(255,255,255,0.85)" />
                  <Text style={styles.specialtyText}>{tag}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {showSwipeHint ? (
            <View style={styles.pageIndicator} pointerEvents="none">
              <View style={styles.pageCounterRow}>
                <Ionicons
                  name="chevron-back"
                  size={12}
                  color={
                    wrapAround || pageIndex > 0 ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.2)'
                  }
                />
                <Text style={styles.pageCounterText}>
                  {pageIndex + 1} / {pageCount}
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={12}
                  color={
                    wrapAround || pageIndex < pageCount - 1
                      ? 'rgba(255,255,255,0.55)'
                      : 'rgba(255,255,255,0.2)'
                  }
                />
              </View>
              {showDots ? (
                <View style={styles.dotsRow}>
                  {Array.from({ length: pageCount }, (_, i) => (
                    <View
                      key={i}
                      style={[styles.pageDot, i === pageIndex && styles.pageDotActive]}
                    />
                  ))}
                </View>
              ) : null}
            </View>
          ) : null}

          <View style={styles.heroCtas}>
            {coach.mobile ? (
              <TouchableOpacity style={styles.waBtn} onPress={openWhatsApp}>
                <Ionicons name="logo-whatsapp" size={18} color={Colors.white} />
                <Text style={styles.waBtnText}>WhatsApp Me</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {publicStats.length > 0 ? (
          <View style={styles.statsStrip}>
            {publicStats.map((stat, i) => (
              <React.Fragment key={stat.key}>
                {i > 0 ? <View style={styles.statDivider} /> : null}
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{stat.value}</Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </View>
              </React.Fragment>
            ))}
          </View>
        ) : null}

        {coach.tags.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionTag}>
              <Ionicons name="star-outline" size={12} color={Colors.secondary} />
              <Text style={styles.sectionTagText}>Areas of Expertise</Text>
            </View>
            <Text style={styles.sectionTitle}>What I Specialise In</Text>
            <View style={styles.expertiseGrid}>
              {coach.tags.map(tag => (
                <View key={tag} style={styles.expertiseCard}>
                  <View style={styles.expertiseIcon}>
                    <Ionicons name="medal-outline" size={18} color={Colors.primary} />
                  </View>
                  <Text style={styles.expertiseTitle}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* No named testimonials API yet. */}
        {showSuccessStories ? (
          <View style={styles.storiesSection}>
            <View style={[styles.sectionTag, styles.storiesSectionTag]}>
              <Ionicons name="trophy-outline" size={12} color={Colors.secondary} />
              <Text style={styles.sectionTagText}>Success Stories</Text>
            </View>
            <Text style={[styles.sectionTitle, styles.storiesSectionTitle]}>
              Client Success Stories
            </Text>
            <Text style={[styles.sectionSubtitle, styles.storiesSectionSubtitle]}>
              Outcomes and focus areas from {coach.name}&apos;s public profile.
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.successCarousel}
              decelerationRate="fast"
              snapToInterval={STORY_CARD_WIDTH + 12}
              nestedScrollEnabled
            >
              {successHighlights.map(item => (
                <View key={item.id} style={styles.successCard}>
                  <View style={styles.successBadge}>
                    <Ionicons name={item.icon} size={12} color={Colors.secondary} />
                    <Text style={styles.successBadgeText} numberOfLines={1}>
                      {item.badge}
                    </Text>
                  </View>
                  <Text style={styles.quoteMark}>&ldquo;</Text>
                  <Text style={styles.successBody} numberOfLines={6}>
                    {item.body}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* Aggregate rating only until a review-text endpoint exists. */}
        {showRating ? (
          <View style={styles.section}>
            <View style={styles.sectionTag}>
              <Ionicons name="star-outline" size={12} color={Colors.secondary} />
              <Text style={styles.sectionTagText}>Reviews</Text>
            </View>
            <Text style={styles.sectionTitle}>Reviews</Text>
            <Text style={styles.sectionSubtitle}>
              Ratings shared for {coach.name} on Mera Coach.
            </Text>
            <View style={styles.reviewSummaryCard}>
              <View style={styles.reviewStarsRow}>
                {[1, 2, 3, 4, 5].map(i => (
                  <Ionicons
                    key={i}
                    name={i <= Math.round(coach.rating) ? 'star' : 'star-outline'}
                    size={18}
                    color={Colors.accent}
                  />
                ))}
              </View>
              <Text style={styles.reviewScore}>
                {coach.rating.toFixed(1)}
                <Text style={styles.reviewCountText}>
                  {' '}
                  ({coach.reviews} {coach.reviews === 1 ? 'review' : 'reviews'})
                </Text>
              </Text>
              <Text style={styles.reviewPendingNote}>
                Individual review comments will appear here when available from the platform.
              </Text>
            </View>
          </View>
        ) : null}

        <View style={[styles.section, styles.formSection, { paddingBottom: 28 + insets.bottom }]}>
          <View style={styles.sectionTag}>
            <Ionicons name="calendar-outline" size={12} color={Colors.secondary} />
            <Text style={styles.sectionTagText}>Get In Touch</Text>
          </View>
          <Text style={styles.sectionTitle}>Book Your Free Consultation</Text>
          <Text style={styles.sectionSubtitle}>
            Send a free enquiry to {coach.name}. They usually reply within 24 hours.
          </Text>

          <View style={styles.field}>
            <FormFieldLabel required>Your Name</FormFieldLabel>
            <TextInput
              style={styles.input}
              placeholder="Full name"
              placeholderTextColor={Colors.textLight}
              value={form.name}
              onChangeText={v => update('name', v)}
              onFocus={scrollLowerFieldsIntoView}
            />
          </View>
          <View style={styles.field}>
            <FormFieldLabel required>Mobile Number</FormFieldLabel>
            <PhoneTextInput
              style={styles.input}
              placeholder="10-digit mobile number"
              placeholderTextColor={Colors.textLight}
              value={form.mobile}
              onChangeText={v => update('mobile', v)}
              onFocus={scrollLowerFieldsIntoView}
            />
          </View>
          <View style={styles.field}>
            <FormFieldLabel>Email Address</FormFieldLabel>
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
          <DropdownField
            label="I'm Looking For"
            value={form.service}
            options={serviceOptions}
            onChange={v => update('service', v)}
            placeholder="Select a service..."
            required
          />

          <TouchableOpacity style={styles.submitBtn} onPress={submitEnquiry} disabled={submitting}>
            {submitting ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <>
                <Ionicons name="paper-plane-outline" size={16} color={Colors.white} />
                <Text style={styles.submitText}>Send My Request, It&apos;s Free!</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
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
    // Fill any remaining codes from cached directory queries (same codes as the list screen).
    const cachedLists = queryClient.getQueriesData<{ coaches: Coach[] }>({
      queryKey: ['coachPublicList'],
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

  /**
   * Infinite pager: [last, ...codes, first]. Swiping past either end lands on a clone,
   * then we jump (no animation) to the matching real item so both directions wrap.
   */
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

  const goPrevPage = useCallback(() => {
    if (!canSwipe || jumpingRef.current) return;
    const next = Math.max(0, pagerIndexRef.current - 1);
    pagerIndexRef.current = next;
    scrollToPagerIndex(next, true);
  }, [canSwipe, scrollToPagerIndex]);

  const goNextPage = useCallback(() => {
    if (!canSwipe || jumpingRef.current) return;
    const next = Math.min(pagerData.length - 1, pagerIndexRef.current + 1);
    pagerIndexRef.current = next;
    scrollToPagerIndex(next, true);
  }, [canSwipe, pagerData.length, scrollToPagerIndex]);

  const onMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!canSwipe || pageWidth <= 0 || jumpingRef.current) return;
      const rawIndex = Math.round(e.nativeEvent.contentOffset.x / pageWidth);
      const lastClone = pagerData.length - 1;
      pagerIndexRef.current = rawIndex;

      if (rawIndex <= 0) {
        // Landed on clone of last → jump to real last
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
        // Landed on clone of first → jump to real first
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
        pageWidth={pageWidth}
        pageHeight={pageHeight}
        pageIndex={canSwipe ? item.logicalIndex : undefined}
        pageCount={canSwipe ? codes.length : undefined}
        wrapAround={canSwipe}
        onPrevPage={canSwipe ? goPrevPage : undefined}
        onNextPage={canSwipe ? goNextPage : undefined}
      />
    ),
    [
      canSwipe,
      codes.length,
      goBack,
      goNextPage,
      goPrevPage,
      listCoachByCode,
      pageHeight,
      pageWidth,
    ],
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
      // Disable — known to flash wrong cells in horizontal pagers on Android.
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
  pager: { flex: 1, backgroundColor: Colors.background },
  page: { backgroundColor: Colors.background },
  container: { flex: 1, backgroundColor: Colors.background },
  centered: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backOnLight: {
    position: 'absolute',
    left: 20,
    ...Shadow.sm,
  },
  hero: {
    backgroundColor: Colors.secondary,
    paddingBottom: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  heroBack: { alignSelf: 'flex-start', marginBottom: 12 },
  navChevronSlotLeft: {
    position: 'absolute',
    left: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    zIndex: 2,
  },
  navChevronSlotRight: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    zIndex: 2,
  },
  navChevron: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(27, 67, 50, 0.72)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageIndicator: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 18,
  },
  pageCounterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: Radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  pageCounterText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
    minWidth: 40,
    textAlign: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  pageDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  pageDotActive: {
    backgroundColor: Colors.white,
    width: 14,
    borderRadius: 3,
  },
  specialtyWrapTight: { marginBottom: 12 },
  scrollContent: { flexGrow: 1 },
  photoBanner: {
    width: '100%',
    // Portrait-leaning frame so cover crops less of typical coach headshots.
    aspectRatio: 4 / 5,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    marginBottom: 16,
    backgroundColor: Colors.onDarkOverlay,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  photoBannerImage: { width: '100%', height: '100%' },
  photoBannerFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.onDarkOverlay,
  },
  photoBannerInitials: { color: Colors.white, fontSize: 56, fontWeight: '800' },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 10,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  categoryBadgeText: { color: Colors.white, fontSize: 11, fontWeight: '700' },
  name: { color: Colors.white, fontSize: 24, fontWeight: '800', marginBottom: 6 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  ratingVal: { color: Colors.white, fontSize: 13, fontWeight: '700' },
  ratingCount: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
  bio: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 14,
    paddingHorizontal: 6,
  },
  specialtyWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 22,
  },
  specialtyTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  specialtyText: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '600' },
  heroCtas: { width: '100%', gap: 10 },
  waBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.whatsapp,
    borderRadius: Radius.pill,
    paddingVertical: 13,
  },
  waBtnText: { color: Colors.white, fontSize: 13, fontWeight: '700' },
  statsStrip: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    marginHorizontal: 20,
    marginTop: -18,
    borderRadius: Radius.lg,
    paddingVertical: 16,
    ...Shadow.lg,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, backgroundColor: Colors.border },
  statValue: { fontSize: 16, fontWeight: '800', color: Colors.secondary },
  statLabel: { fontSize: 10, color: Colors.textLight, marginTop: 2, textAlign: 'center' },
  section: { padding: 20, paddingTop: 32 },
  formSection: {
    backgroundColor: Colors.white,
    marginHorizontal: 0,
    flexGrow: 1,
  },
  sectionTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: Colors.secondaryLight,
    borderRadius: Radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 10,
  },
  sectionTagText: { color: Colors.secondary, fontSize: 11, fontWeight: '700' },
  sectionTitle: { fontSize: 19, fontWeight: '800', color: Colors.textDark, marginBottom: 6 },
  sectionSubtitle: { fontSize: 12, color: Colors.textLight, lineHeight: 18, marginBottom: 18 },
  expertiseGrid: { gap: 10, marginTop: 14 },
  expertiseCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: 14,
    ...Shadow.sm,
  },
  expertiseIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  expertiseTitle: { fontSize: 14, fontWeight: '700', color: Colors.textDark },
  storiesSection: { paddingTop: 32, paddingBottom: 8 },
  storiesSectionTag: { marginLeft: 20, alignSelf: 'flex-start' },
  storiesSectionTitle: { marginHorizontal: 20, marginBottom: 6 },
  storiesSectionSubtitle: { marginHorizontal: 20, marginBottom: 0 },
  successCarousel: { paddingHorizontal: 20, paddingTop: 18, gap: 12 },
  successCard: {
    width: STORY_CARD_WIDTH,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: 16,
    ...Shadow.sm,
  },
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: Colors.secondaryLight,
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 8,
    maxWidth: '100%',
  },
  successBadgeText: { color: Colors.secondary, fontSize: 11, fontWeight: '700', flexShrink: 1 },
  quoteMark: {
    fontSize: 36,
    fontWeight: '800',
    color: Colors.accent,
    lineHeight: 36,
    marginBottom: -4,
  },
  successBody: { fontSize: 13, color: Colors.textLight, lineHeight: 19 },
  reviewSummaryCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: 18,
    marginTop: 14,
    ...Shadow.sm,
  },
  reviewStarsRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 8 },
  reviewScore: { fontSize: 20, fontWeight: '800', color: Colors.textDark, marginBottom: 8 },
  reviewCountText: { fontSize: 13, fontWeight: '600', color: Colors.textLight },
  reviewPendingNote: { fontSize: 12, color: Colors.textLight, lineHeight: 17 },
  field: { marginBottom: 14 },
  input: {
    backgroundColor: Colors.background,
    borderRadius: Radius.sm,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    height: 48,
    fontSize: 14,
    color: Colors.textDark,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: Radius.pill,
    height: 52,
    marginTop: 8,
    ...Shadow.md,
  },
  submitText: { color: Colors.white, fontWeight: '700', fontSize: 16 },
});
