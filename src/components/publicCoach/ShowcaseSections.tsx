import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Colors,
  FontFamily,
  IconSize,
  PressOpacity,
  Radius,
  Spacing,
  headingFont,
} from '../../constants/theme';
import SectionTag from '../SectionTag';
import { POST_CATEGORY, type CoachPost, type Showcase } from '../../api/showcaseApi';
import { formatMoney } from '../../utils/formatMoney';
import { formatPostDate } from '../../utils/formatPostDate';
import { resolveMediaUrl } from '../../utils/mediaUrl';

const PILL_BG = '#E8F7F2';
const PILL_INK = '#04705D';

function PostMedia({ post, style }: { post: CoachPost; style: object }) {
  const uri = post.mediaType === 'image' ? resolveMediaUrl(post.mediaUrl) : null;
  return uri ? (
    <Image source={{ uri }} style={style} resizeMode="cover" />
  ) : (
    <View style={[style, styles.videoPlate]}>
      <Ionicons name="videocam" size={IconSize.xl} color={Colors.accentInk} />
    </View>
  );
}

function SectionHeader({
  icon,
  tag,
  title,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  tag: string;
  title: string;
}) {
  return (
    <>
      <SectionTag icon={icon} label={tag} color={PILL_INK} style={styles.pill} />
      <Text style={styles.title}>{title}</Text>
    </>
  );
}

function PostCard({ post, wide }: { post: CoachPost; wide?: boolean }) {
  const meta = [formatPostDate(post.postDate), post.location].filter(Boolean).join(' · ');
  return (
    <View style={styles.postCard}>
      <PostMedia post={post} style={wide ? styles.postMediaWide : styles.postMedia} />
      <View style={styles.postBody}>
        <Text style={styles.postTitle} numberOfLines={2}>
          {post.title}
        </Text>
        {post.clientName ? <Text style={styles.postClient}>{post.clientName}</Text> : null}
        {post.description ? (
          <Text style={styles.postText} numberOfLines={3}>
            {post.description}
          </Text>
        ) : null}
        {meta ? <Text style={styles.postMeta}>{meta}</Text> : null}
      </View>
    </View>
  );
}

interface ShowcaseSectionsProps {
  showcase: Showcase;
  onSelectPackage: (packageName: string) => void;
}

/** Packages, gallery, events and success stories on a coach's public profile. */
export default function ShowcaseSections({ showcase, onSelectPackage }: ShowcaseSectionsProps) {
  const { packages, posts } = showcase;
  const gallery = posts.filter(p => p.categoryCode === POST_CATEGORY.gallery);
  const events = posts.filter(p => p.categoryCode === POST_CATEGORY.event);
  const stories = posts.filter(p => p.categoryCode === POST_CATEGORY.success);

  return (
    <>
      {packages.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader icon="pricetags-outline" tag="Packages" title="Packages" />
          <View style={styles.list}>
            {packages.map(pkg => (
              <TouchableOpacity
                key={pkg.packageId}
                style={styles.packageCard}
                onPress={() => onSelectPackage(pkg.packageName)}
                activeOpacity={PressOpacity.soft}
                accessibilityRole="button"
                accessibilityLabel={`Enquire about ${pkg.packageName}`}
              >
                <Text style={styles.brand}>{pkg.brandName}</Text>
                <Text style={styles.packageName}>{pkg.packageName}</Text>
                {pkg.items.map((item, index) => (
                  <View key={`${item.itemName}-${index}`} style={styles.itemRow}>
                    <Text style={styles.itemName} numberOfLines={2}>
                      {item.itemName}
                    </Text>
                    <Text style={styles.itemAmount}>{formatMoney(item.amount)}</Text>
                  </View>
                ))}
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.totalAmount}>{formatMoney(pkg.totalAmount)}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : null}

      {gallery.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader icon="images-outline" tag="Photos" title="Gallery" />
          <View style={styles.grid}>
            {gallery.map(post => (
              <View key={post.postId} style={styles.gridItem}>
                <PostMedia post={post} style={styles.gridMedia} />
                {post.title && post.title !== 'Gallery photo' ? (
                  <Text style={styles.gridTag} numberOfLines={2}>
                    {post.title}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {events.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader icon="calendar-outline" tag="Events" title="Workshops and events" />
          <View style={styles.list}>
            {events.map(post => (
              <PostCard key={post.postId} post={post} wide />
            ))}
          </View>
        </View>
      ) : null}

      {stories.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader icon="trophy-outline" tag="Outcomes" title="Success stories" />
          <View style={styles.list}>
            {stories.map(post => (
              <PostCard key={post.postId} post={post} />
            ))}
          </View>
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  section: { paddingHorizontal: Spacing.md, paddingTop: Spacing.xl },
  pill: { backgroundColor: PILL_BG },
  title: {
    fontSize: 22,
    fontFamily: headingFont.extraBold,
    color: Colors.textDark,
    marginBottom: Spacing.md,
  },
  list: { gap: Spacing.sm },
  videoPlate: { alignItems: 'center', justifyContent: 'center', backgroundColor: PILL_BG },
  packageCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  brand: { fontSize: 12, fontFamily: FontFamily.semibold, color: PILL_INK },
  packageName: {
    fontSize: 18,
    fontFamily: headingFont.extraBold,
    color: Colors.textDark,
    marginBottom: Spacing.xs,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  itemName: { flex: 1, fontSize: 14, fontFamily: FontFamily.regular, color: Colors.textDark },
  itemAmount: { fontSize: 14, fontFamily: FontFamily.semibold, color: Colors.textLight },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingTop: Spacing.sm,
  },
  totalLabel: { fontSize: 14, fontFamily: FontFamily.semibold, color: Colors.textLight },
  totalAmount: { fontSize: 20, fontFamily: headingFont.extraBold, color: Colors.textDark },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  gridItem: { width: '31.5%' },
  gridMedia: { width: '100%', aspectRatio: 1, borderRadius: Radius.md, overflow: 'hidden' },
  gridTag: { fontSize: 12, fontFamily: FontFamily.semibold, color: Colors.textDark, marginTop: 4 },
  postCard: {
    flexDirection: 'row',
    gap: Spacing.sm,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    padding: Spacing.sm,
  },
  postMedia: { width: 96, height: 96, borderRadius: Radius.md, overflow: 'hidden' },
  postMediaWide: { width: 96, height: 96, borderRadius: Radius.md, overflow: 'hidden' },
  postBody: { flex: 1, minWidth: 0 },
  postTitle: { fontSize: 15, fontFamily: FontFamily.semibold, color: Colors.textDark },
  postClient: { fontSize: 12, fontFamily: FontFamily.semibold, color: PILL_INK, marginTop: 2 },
  postText: {
    fontSize: 13,
    fontFamily: FontFamily.regular,
    color: Colors.textLight,
    lineHeight: 18,
    marginTop: 4,
  },
  postMeta: { fontSize: 12, fontFamily: FontFamily.regular, color: Colors.textLight, marginTop: 4 },
});
