import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontFamily, PressOpacity, Radius, Shadow, Spacing } from '../../constants/theme';
import { isDegenerateImageSize, resolveMediaUrl } from '../../utils/mediaUrl';

interface Props {
  imageUrl?: string | null;
  uploading?: boolean;
  onPick: () => void;
  onRemove: () => void;
  accessibilityLabel?: string;
}

/** Thumbnail + Add/Change/Remove controls for package and event covers. */
export default function OfferImageField({
  imageUrl,
  uploading = false,
  onPick,
  onRemove,
  accessibilityLabel = 'Offer photo',
}: Props) {
  const resolved = resolveMediaUrl(imageUrl);
  const [failed, setFailed] = useState(false);
  const [tracked, setTracked] = useState(imageUrl);

  if (imageUrl !== tracked) {
    setTracked(imageUrl);
    setFailed(false);
  }

  const hasStored = Boolean(resolved);
  const showImage = hasStored && !failed;

  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={styles.thumbWrap}
        onPress={onPick}
        disabled={uploading}
        accessibilityRole="button"
        accessibilityLabel={
          hasStored ? `Change ${accessibilityLabel}` : `Add ${accessibilityLabel}`
        }
        activeOpacity={PressOpacity.default}
      >
        {uploading ? (
          <View style={[styles.thumb, styles.thumbEmpty]}>
            <ActivityIndicator color={Colors.primary} />
          </View>
        ) : showImage ? (
          <Image
            source={{ uri: resolved }}
            style={styles.thumb}
            onError={() => setFailed(true)}
            onLoad={e => {
              const { width, height } = e.nativeEvent.source;
              if (isDegenerateImageSize(width, height)) setFailed(true);
            }}
          />
        ) : (
          <View style={[styles.thumb, styles.thumbEmpty]}>
            <Ionicons name="image-outline" size={22} color={Colors.textLight} />
          </View>
        )}
      </TouchableOpacity>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionBtn, uploading && styles.actionBtnDisabled]}
          onPress={onPick}
          disabled={uploading}
          accessibilityRole="button"
          accessibilityLabel={hasStored ? 'Change photo' : 'Add photo'}
        >
          <Ionicons
            name={hasStored ? 'camera-outline' : 'add-circle-outline'}
            size={16}
            color={Colors.secondary}
          />
          <Text style={styles.actionText}>{hasStored ? 'Change photo' : 'Add photo'}</Text>
        </TouchableOpacity>
        {hasStored ? (
          <TouchableOpacity
            style={styles.removeBtn}
            onPress={onRemove}
            disabled={uploading}
            accessibilityRole="button"
            accessibilityLabel="Remove photo"
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons name="trash-outline" size={15} color={Colors.destructive} />
            <Text style={styles.removeText}>Remove</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const THUMB = 72;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  thumbWrap: { borderRadius: Radius.sm, overflow: 'hidden', ...Shadow.sm },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: Radius.sm,
    backgroundColor: Colors.backgroundTan,
  },
  thumbEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    backgroundColor: Colors.background,
  },
  actions: { flex: 1, gap: 6 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: Colors.secondaryLight,
    borderRadius: Radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  actionBtnDisabled: { opacity: 0.6 },
  actionText: {
    fontSize: 12,
    fontFamily: FontFamily.bold,
    color: Colors.secondary,
  },
  removeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  removeText: {
    fontSize: 12,
    fontFamily: FontFamily.semibold,
    color: Colors.destructive,
  },
});
