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
import BmiGaugeArt from '../../components/home/BmiGaugeArt';
import CategoryIcon from '../../components/CategoryIcon';
import EmptyState from '../../components/EmptyState';
import ReloadState from '../../components/ReloadState';
import {
  EXPLORE_FEATURES,
  type ExploreFeatureTarget,
} from '../../data/homeExploreContent';
import { getCoachCategories } from '../../api/coachApi';
import { getErrorMessage } from '../../api/client';
import { MASTER_STALE_MS } from '../../api/queryClient';
import { queryKeys } from '../../api/queryKeys';
import { useAuthState } from '../../auth/useAuthState';
import { BrandImages } from '../../constants/images';
import {
  Colors,
  FontFamily,
  IconSize,
  PressOpacity,
  Radius,
  Shadow,
  Spacing,
  TouchTarget,
  headingFont,
} from '../../constants/theme';
import type { RootScreenProps } from '../../types/navigation';
import type { CoachCategory } from '../../types/models';

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
  const categoryWidth = (width - sidePad * 2 - categoryGap * 2) / 3;

  const bannerHeight = Math.min(148, Math.max(120, height * 0.16));

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

        <View style={[styles.banner, { height: bannerHeight, marginTop: Spacing.md }]}>
          <View style={styles.bannerTextCol}>
            <Text style={styles.bannerLine}>
              <Text style={styles.bannerCoaching}>Coaching </Text>
              <Text style={styles.bannerFor}>for</Text>
            </Text>
            <Text style={styles.bannerGoal}>Every Goal</Text>
          </View>
          <View style={styles.bannerArt}>
            <View style={styles.bannerGlow} />
            <Image
              source={BrandImages.exploreBannerPhoto}
              style={styles.bannerPhoto}
              resizeMode="cover"
              accessibilityIgnoresInvertColors
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Coach Category</Text>
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
                  size={28}
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
              style={[styles.featureRow, rowIndex < featureRows.length - 1 && styles.featureRowBorder]}
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
            <View style={styles.bmiHeaderIcon}>
              <Ionicons name="speedometer-outline" size={16} color={Colors.secondary} />
            </View>
            <Text style={styles.bmiHeaderTitle}>Check Your BMI</Text>
          </View>
          <View style={styles.bmiBody}>
            <View style={styles.bmiCopyCol}>
              <Text style={styles.bmiCopy}>
                Get your BMI in seconds.{'\n'}Share your details after to...
              </Text>
              <Pressable
                style={({ pressed }) => [styles.checkNowBtn, pressed && styles.pressed]}
                onPress={() => navigation.navigate('PublicBmi')}
                accessibilityRole="button"
                accessibilityLabel="Check Now"
              >
                <Text style={styles.checkNowText}>Check Now</Text>
                <View style={styles.checkNowArrow}>
                  <Ionicons name="arrow-forward" size={14} color={Colors.brandCoach} />
                </View>
              </Pressable>
            </View>
            <BmiGaugeArt size={108} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: Colors.exploreCanvas,
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
    borderRadius: Radius.lg,
    backgroundColor: Colors.exploreBanner,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: Spacing.md,
  },
  bannerTextCol: {
    flex: 1,
    zIndex: 2,
    paddingVertical: Spacing.sm,
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
    fontSize: 24,
    lineHeight: 30,
    color: Colors.white,
    marginTop: 2,
  },
  bannerArt: {
    width: '42%',
    height: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  bannerGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.secondaryLight,
    opacity: 0.35,
    right: 8,
    top: '12%',
  },
  bannerPhoto: {
    width: '160%',
    height: '140%',
    position: 'absolute',
    right: -8,
    top: -12,
  },
  sectionTitle: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    fontFamily: headingFont.bold,
    fontSize: 17,
    lineHeight: 22,
    color: Colors.textDark,
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
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  featureRow: {
    flexDirection: 'row',
  },
  featureRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
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
    borderRightColor: Colors.border,
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
    borderRadius: Radius.md,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  bmiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.secondary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  bmiHeaderIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bmiHeaderTitle: {
    fontFamily: headingFont.bold,
    fontSize: 15,
    color: Colors.white,
  },
  bmiBody: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  bmiCopyCol: {
    flex: 1,
    gap: Spacing.sm,
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
    gap: Spacing.sm,
    backgroundColor: Colors.brandCoach,
    borderRadius: Radius.pill,
    paddingVertical: Spacing.sm,
    paddingLeft: Spacing.md,
    paddingRight: Spacing.sm,
    minHeight: TouchTarget.min,
    ...Shadow.md,
  },
  checkNowText: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: Colors.white,
  },
  checkNowArrow: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
