import React from 'react';
import { Alert, Image, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Colors,
  FontFamily,
  IconSize,
  PressOpacity,
  Radius,
  Spacing,
  TouchTarget,
  headingFont,
} from '../../constants/theme';
import SectionTag from '../SectionTag';
import { whatsAppUrlWithText } from '../../api/coachApi';
import {
  POST_CATEGORY,
  type CoachPost,
  type Showcase,
  type ShowcasePackage,
} from '../../api/showcaseApi';
import { formatMoney } from '../../utils/formatMoney';
import { formatPostDate } from '../../utils/formatPostDate';
import { resolveMediaUrl } from '../../utils/mediaUrl';
import { splitPackDetail } from '../../utils/packDetail';

const PILL_BG = '#E8F7F2';
const PILL_INK = '#04705D';
const WHATSAPP_GREEN = '#1FA855';

function PostMedia({ post, style }: { post: CoachPost; style: object }) {
  const mediaUri = resolveMediaUrl(post.mediaUrl);
  if (post.mediaType === 'image' && mediaUri) {
    return <Image source={{ uri: mediaUri }} style={style} resizeMode="cover" />;
  }
  // A video has no thumbnail: tapping it plays it in the phone's own player or browser.
  return (
    <TouchableOpacity
      style={[style, styles.videoPlate]}
      onPress={() => {
        if (mediaUri)
          void Linking.openURL(mediaUri).catch(() =>
            Alert.alert('Video', 'This video could not be opened.'),
          );
      }}
      disabled={!mediaUri}
      activeOpacity={PressOpacity.default}
      accessibilityRole="button"
      accessibilityLabel={post.title ? `Play video: ${post.title}` : 'Play video'}
    >
      <Ionicons name="play-circle" size={IconSize.xxl} color={Colors.accentInk} />
    </TouchableOpacity>
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

function PackageCard({
  pkg,
  coachName,
  whatsAppUrl,
  onSelect,
}: {
  pkg: ShowcasePackage;
  coachName: string;
  /** The coach's WhatsApp chat link, or null when they have no usable number. */
  whatsAppUrl: string | null;
  onSelect: () => void;
}) {
  const enquireOnWhatsApp = () => {
    if (!whatsAppUrl) return;
    const message = `Hi ${coachName}, I would like to enquire about the "${pkg.packageName}" package (${formatMoney(pkg.totalAmount)}).`;
    Linking.openURL(whatsAppUrlWithText(whatsAppUrl, message)).catch(() =>
      Alert.alert('Could not open WhatsApp', 'Please check that WhatsApp is installed.'),
    );
  };

  return (
    <View style={styles.packageCard}>
      <View>
        <View style={styles.packageHead}>
          <View style={styles.packageTitleBlock}>
            <Text style={styles.brand}>{pkg.brandName}</Text>
            <Text style={styles.packageName}>{pkg.packageName}</Text>
          </View>
          <Text
            style={styles.totalAmount}
            accessibilityLabel={`Total ${formatMoney(pkg.totalAmount)}`}
          >
            {formatMoney(pkg.totalAmount)}
          </Text>
        </View>
        {pkg.items.map((item, index) => {
          const { name, pack } = splitPackDetail(item.itemName);
          return (
            <View key={`${item.itemName}-${index}`} style={styles.itemRow}>
              <Text style={styles.itemName} numberOfLines={3}>
                {name}
              </Text>
              {pack ? <Text style={styles.itemPack}>{pack}</Text> : null}
            </View>
          );
        })}
      </View>
      {whatsAppUrl ? (
        <TouchableOpacity
          style={styles.whatsAppBtn}
          onPress={enquireOnWhatsApp}
          activeOpacity={PressOpacity.default}
          accessibilityRole="button"
          accessibilityLabel={`Enquire about ${pkg.packageName} on WhatsApp`}
        >
          <Ionicons name="logo-whatsapp" size={IconSize.md} color={Colors.white} />
          <Text style={styles.whatsAppLabel}>Enquire on WhatsApp</Text>
        </TouchableOpacity>
      ) : (
        // No WhatsApp number: the enquiry form is the only way in, so it gets its own button (the card itself stays static).
        <TouchableOpacity
          style={styles.whatsAppBtn}
          onPress={onSelect}
          activeOpacity={PressOpacity.default}
          accessibilityRole="button"
          accessibilityLabel={`Enquire about ${pkg.packageName}`}
        >
          <Text style={styles.whatsAppLabel}>Enquire now</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

interface ShowcaseSectionsProps {
  showcase: Showcase;
  coachName: string;
  whatsAppUrl: string | null;
  onSelectPackage: (packageName: string) => void;
}

/** Packages, gallery, posts and success stories on a coach's public profile. */
export default function ShowcaseSections({
  showcase,
  coachName,
  whatsAppUrl,
  onSelectPackage,
}: ShowcaseSectionsProps) {
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
              <PackageCard
                key={pkg.packageId}
                pkg={pkg}
                coachName={coachName}
                whatsAppUrl={whatsAppUrl}
                onSelect={() => onSelectPackage(pkg.packageName)}
              />
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
          <SectionHeader icon="calendar-outline" tag="Posts" title="Posts" />
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
  packageHead: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  packageTitleBlock: { flex: 1, minWidth: 0 },
  brand: { fontSize: 12, fontFamily: FontFamily.semibold, color: PILL_INK },
  packageName: {
    fontSize: 18,
    fontFamily: headingFont.extraBold,
    color: Colors.textDark,
  },
  totalAmount: {
    flexShrink: 0,
    fontSize: 20,
    lineHeight: 26,
    fontFamily: headingFont.extraBold,
    color: Colors.textDark,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    paddingVertical: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  itemName: { flex: 1, fontSize: 14, fontFamily: FontFamily.regular, color: Colors.textDark },
  itemPack: {
    flexShrink: 0,
    fontSize: 13,
    fontFamily: FontFamily.semibold,
    color: Colors.textLight,
  },
  whatsAppBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
    minHeight: TouchTarget.min,
    borderRadius: Radius.pill,
    backgroundColor: WHATSAPP_GREEN,
  },
  whatsAppLabel: { fontSize: 14, fontFamily: FontFamily.bold, color: Colors.white },
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
