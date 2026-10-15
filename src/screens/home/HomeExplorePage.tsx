import React, { useMemo } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import PublicHomeHeader from '../../components/home/PublicHomeHeader';
import CategoryIcon from '../../components/CategoryIcon';
import EmptyState from '../../components/EmptyState';
import ReloadState from '../../components/ReloadState';
import { EXPLORE_FEATURES, type ExploreFeatureTarget } from '../../data/homeExploreContent';
import { getCoachCategories } from '../../api/coachApi';
import { getErrorMessage } from '../../api/client';
import { MASTER_STALE_MS } from '../../api/queryClient';
import { queryKeys } from '../../api/queryKeys';
import { useAuthState } from '../../auth/useAuthState';
import {
  BrandImages,
  HOME_BMI_CARD_BITMAP,
  HOME_BMI_CARD_FRAME,
  HOME_EXPLORE_BANNER_ASPECT,
} from '../../constants/images';
import {
  Colors,
  FontFamily,
  HitSlop,
  IconSize,
  PressOpacity,
  Radius,
  Shadow,
  Spacing,
  headingFont,
} from '../../constants/theme';
import type { RootScreenProps } from '../../types/navigation';
import type { CoachCategory } from '../../types/models';

const BMI_HEADER_END = '#1F543C';
const BMI_HEADER_STRIPS = [
  '#053B2D',
  '#093F2F',
  '#0C4231',
  '#104633',
  '#144936',
  '#184D38',
  '#1B503A',
  BMI_HEADER_END,
] as const;
const BMI_CARD_BORDER = '#E5E5E5';
const BMI_CTA = '#FFA937';
const BMI_BODY_COPY = 'Get your BMI in seconds. Then share your details with a coach.';

type Nav = RootScreenProps<'Home'>['navigation'];

type Props = {
  navigation: Nav;
  onGoHome: () => void;
  width: number;
  height: number;
};

function openCoachFeature(navigation: Nav, signedIn: boolean, target: ExploreFeatureTarget) {
  if (target.kind === 'register') {
    if (signedIn) {
      navigation.navigate('Main', { screen: 'Dashboard', params: { screen: 'Leads' } });
      return;
    }
    navigation.navigate('Register');
    return;
  }

  if (target.kind === 'login') {
    if (signedIn) {
      navigation.navigate('Main');
      return;
    }
    navigation.navigate('Login');
    return;
  }

  if (!signedIn) {
    navigation.navigate('Login');
    return;
  }

  switch (target.kind) {
    case 'clients':
      navigation.navigate('Main', { screen: 'Dashboard', params: { screen: 'ClientListHome' } });
      break;
    case 'checkups':
      navigation.navigate('Main', { screen: 'Dashboard', params: { screen: 'CheckupListHome' } });
      break;
    case 'packages':
      navigation.navigate('Main', { screen: 'Packages' });
      break;
    case 'leads':
      navigation.navigate('Main', { screen: 'Dashboard', params: { screen: 'Leads' } });
      break;
    case 'profile':
      navigation.navigate('Main', { screen: 'Profile' });
      break;
    default:
      break;
  }
}

export default function HomeExplorePage({ navigation, onGoHome, width, height }: Props) {
  const insets = useSafeAreaInsets();
  const signedIn = useAuthState() === 'signedIn';

  const categoriesQuery = useQuery({
    queryKey: queryKeys.coachCategories,
    queryFn: getCoachCategories,
    staleTime: MASTER_STALE_MS,
  });

  const categories = categoriesQuery.data ?? [];
  const categoriesLoading = categoriesQuery.isPending && !categoriesQuery.data;
  const categoriesError =
    categoriesQuery.isError && !categoriesQuery.data
      ? getErrorMessage(categoriesQuery.error, 'Could not load categories. Please try again.')
      : null;

  const categoryGap = Spacing.sm;
  const sidePad = Spacing.md;
  const panelPad = Spacing.md;
  const panelBorder = 1;
  const contentWidth = width - sidePad * 2;
  const panelInner = contentWidth - panelBorder * 2 - panelPad * 2;
  const bannerHeight = contentWidth / HOME_EXPLORE_BANNER_ASPECT;
  const categoryWidth = Math.floor((panelInner - categoryGap * 2) / 3);
  const bmiArtFrameW = Math.round(Math.min(148, Math.max(96, panelInner * 0.4)));
  const bmiArtScale = bmiArtFrameW / HOME_BMI_CARD_FRAME.width;
  const bmiArtFrameH = Math.round(HOME_BMI_CARD_FRAME.height * bmiArtScale);
  const bmiArtW = HOME_BMI_CARD_BITMAP.width * bmiArtScale;
  const bmiArtH = HOME_BMI_CARD_BITMAP.height * bmiArtScale;

  const featureRows = useMemo(() => {
    const cells: ((typeof EXPLORE_FEATURES)[number] | null)[] = [...EXPLORE_FEATURES, null];
    const rows: (typeof cells)[] = [];
    for (let i = 0; i < cells.length; i += 3) {
      rows.push(cells.slice(i, i + 3));
    }
    return rows;
  }, []);

  const openCategory = (cat: CoachCategory) => {
    navigation.navigate('CoachList', { categoryCode: cat.code });
  };

  return (
    <View style={[styles.page, { width, height }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + Spacing.xs,
            paddingBottom: Math.max(insets.bottom, Spacing.md),
          },
        ]}
        showsVerticalScrollIndicator={false}
        bounces={false}
        keyboardShouldPersistTaps="handled"
      >
        <PublicHomeHeader onHomePress={onGoHome} />

        <View style={[styles.banner, { width: contentWidth, height: bannerHeight }]}>
          <Image
            source={BrandImages.exploreBannerPhoto}
            style={{ width: contentWidth, height: bannerHeight }}
            resizeMode="stretch"
            accessibilityIgnoresInvertColors
          />
          <View pointerEvents="none" style={styles.bannerTextCol}>
            <Text style={styles.bannerLine}>
              <Text style={styles.bannerCoaching}>Coaching </Text>
              <Text style={styles.bannerFor}>for</Text>
            </Text>
            <Text style={styles.bannerGoal}>Every Goal</Text>
          </View>
        </View>

        <View style={styles.panel}>
          <Text style={[styles.sectionTitle, styles.sectionTitleFirst]}>Coach Category</Text>
          {categoriesLoading ? (
            <View style={styles.categoryLoader}>
              <ActivityIndicator color={Colors.secondary} />
            </View>
          ) : categoriesError ? (
            <ReloadState
              title="Could not load categories"
              message={categoriesError}
              onRetry={() => void categoriesQuery.refetch()}
              loading={categoriesQuery.isFetching}
              showPullHint={false}
              style={styles.categoryState}
            />
          ) : categories.length === 0 ? (
            <EmptyState
              illustration={BrandImages.emptyLeads}
              icon="grid-outline"
              title="Categories coming soon"
              message="Coach categories will appear here once they are available."
              style={styles.categoryState}
            />
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryRow}
              bounces={false}
            >
              {categories.map(cat => (
                <Pressable
                  key={cat.code}
                  style={({ pressed }) => [
                    styles.categoryCard,
                    { width: categoryWidth },
                    pressed && styles.pressed,
                  ]}
                  onPress={() => openCategory(cat)}
                  accessibilityRole="button"
                  accessibilityLabel={cat.label}
                >
                  <CategoryIcon
                    category={cat}
                    size={IconSize.xxl}
                    color={cat.color ?? Colors.secondary}
                  />
                  <Text style={styles.categoryLabel} numberOfLines={2}>
                    {cat.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}

          <Text style={styles.sectionTitle}>App Features</Text>
          <View style={styles.featuresCard}>
            {featureRows.map((row, rowIndex) => (
              <View
                key={`row-${rowIndex}`}
                style={[
                  styles.featureRow,
                  rowIndex < featureRows.length - 1 && styles.featureRowBorder,
                ]}
              >
                {row.map((item, colIndex) => {
                  const isLastCol = colIndex === row.length - 1;
                  if (!item) {
                    return (
                      <View
                        key={`empty-${rowIndex}`}
                        style={[styles.featureCell, !isLastCol && styles.featureCellBorder]}
                      />
                    );
                  }
                  return (
                    <Pressable
                      key={item.label}
                      style={({ pressed }) => [
                        styles.featureCell,
                        !isLastCol && styles.featureCellBorder,
                        pressed && styles.pressed,
                      ]}
                      onPress={() => openCoachFeature(navigation, signedIn, item.target)}
                      accessibilityRole="button"
                      accessibilityLabel={item.label}
                    >
                      <View style={[styles.featureIconWell, { backgroundColor: item.bg }]}>
                        <Ionicons name={item.icon} size={IconSize.lg} color={item.color} />
                      </View>
                      <Text style={styles.featureLabel}>{item.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>

          <View style={styles.bmiCard}>
            <View style={styles.bmiHeader}>
              <View pointerEvents="none" style={styles.bmiHeaderWash}>
                {BMI_HEADER_STRIPS.map((tone, index) => (
                  <View
                    key={tone}
                    style={[
                      styles.bmiHeaderStrip,
                      {
                        backgroundColor: tone,
                        left: `${(index * 100) / BMI_HEADER_STRIPS.length}%`,
                        width: `${100 / BMI_HEADER_STRIPS.length + 0.6}%`,
                      },
                    ]}
                  />
                ))}
              </View>
              <View style={styles.bmiHeaderIcon}>
                <Ionicons
                  name="speedometer-outline"
                  size={IconSize.sm}
                  color={BMI_HEADER_STRIPS[0]}
                />
              </View>
              <Text style={styles.bmiHeaderTitle}>Check Your BMI</Text>
            </View>
            <View style={styles.bmiBody}>
              <View style={styles.bmiCopyCol}>
                <Text style={styles.bmiCopy}>{BMI_BODY_COPY}</Text>
                <Pressable
                  style={({ pressed }) => [styles.checkNowBtn, pressed && styles.pressed]}
                  onPress={() => navigation.navigate('PublicBmi')}
                  hitSlop={HitSlop.sm}
                  accessibilityRole="button"
                  accessibilityLabel="Check Now"
                >
                  <Text style={styles.checkNowText}>Check Now</Text>
                  <View style={styles.checkNowArrow}>
                    <Ionicons
                      name="arrow-forward-outline"
                      size={IconSize.sm}
                      color={Colors.brandCoach}
                    />
                  </View>
                </Pressable>
              </View>
              <View
                pointerEvents="none"
                style={[styles.bmiArtFrame, { width: bmiArtFrameW, height: bmiArtFrameH }]}
              >
                <Image
                  source={BrandImages.homeBmiCard}
                  style={{
                    position: 'absolute',
                    width: bmiArtW,
                    height: bmiArtH,
                    left: -HOME_BMI_CARD_FRAME.x * bmiArtScale,
                    top: -HOME_BMI_CARD_FRAME.y * bmiArtScale,
                  }}
                  resizeMode="stretch"
                  accessibilityIgnoresInvertColors
                />
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
  },
  pressed: {
    opacity: PressOpacity.default,
  },
  banner: {
    marginTop: Spacing.md,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  bannerTextCol: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '60%',
    zIndex: 1,
    justifyContent: 'center',
    paddingLeft: Spacing.md,
    paddingRight: Spacing.xs,
  },
  bannerLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  bannerCoaching: {
    fontFamily: headingFont.bold,
    fontSize: 22,
    lineHeight: 28,
    color: Colors.exploreBannerAccent,
  },
  bannerFor: {
    fontFamily: FontFamily.medium,
    fontSize: 16,
    fontStyle: 'italic',
    color: Colors.white,
  },
  bannerGoal: {
    fontFamily: headingFont.bold,
    fontSize: 22,
    lineHeight: 28,
    color: Colors.white,
    marginTop: 2,
  },
  panel: {
    marginTop: Spacing.md,
    backgroundColor: Colors.explorePanel,
    borderWidth: 1,
    borderColor: Colors.explorePanelBorder,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    overflow: 'hidden',
  },
  sectionTitle: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    fontFamily: headingFont.bold,
    fontSize: 17,
    lineHeight: 22,
    color: Colors.textDark,
  },
  sectionTitleFirst: {
    marginTop: 0,
  },
  categoryLoader: {
    minHeight: 108,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryState: {
    flex: 0,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  categoryCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 108,
    gap: Spacing.xs,
    ...Shadow.sm,
  },
  categoryLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    lineHeight: 14,
    color: Colors.textDark,
    textAlign: 'center',
  },
  featuresCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  featureRow: {
    flexDirection: 'row',
  },
  featureRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.bannerBorder,
  },
  featureCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xxs,
    minHeight: 96,
  },
  featureCellBorder: {
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: Colors.bannerBorder,
  },
  featureIconWell: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  featureLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    lineHeight: 14,
    color: Colors.textDark,
    textAlign: 'center',
    paddingHorizontal: 2,
  },
  bmiCard: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.white,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: BMI_CARD_BORDER,
    overflow: 'hidden',
  },
  bmiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: BMI_HEADER_END,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    overflow: 'hidden',
  },
  bmiHeaderWash: {
    ...StyleSheet.absoluteFill,
  },
  bmiHeaderStrip: {
    position: 'absolute',
    top: 0,
    bottom: 0,
  },
  bmiHeaderIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  bmiHeaderTitle: {
    flex: 1,
    fontFamily: headingFont.bold,
    fontSize: 16,
    color: Colors.white,
    zIndex: 1,
  },
  bmiBody: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingLeft: Spacing.md,
    paddingRight: Spacing.xs,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  bmiCopyCol: {
    flex: 1,
    gap: Spacing.sm,
    zIndex: 1,
  },
  bmiArtFrame: {
    overflow: 'hidden',
    flexShrink: 0,
  },
  bmiCopy: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textDark,
  },
  checkNowBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 31,
    paddingLeft: 14,
    paddingRight: 4,
    backgroundColor: BMI_CTA,
    borderWidth: 1,
    borderColor: BMI_CTA,
    borderRadius: Radius.pill,
  },
  checkNowText: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    lineHeight: 16,
    color: Colors.white,
  },
  checkNowArrow: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
