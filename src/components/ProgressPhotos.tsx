import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Modal,
  ScrollView,
} from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { pickImagesFromCameraOrLibrary } from '../utils/imagePicker';
import { Ionicons } from '@expo/vector-icons';
import {
  Colors,
  HitSlop,
  Radius,
  Shadow,
  Spacing,
  Typography,
  buttonStyles,
  PressOpacity,
} from '../constants/theme';
import { deleteDocument, uploadDocument, type DocumentListItem } from '../api/documentApi';
import { getErrorMessage } from '../api/client';
import { getDocumentSavedById } from '../auth/session';
import { queryKeys } from '../api/queryKeys';
import { progressPhotosCoachCode, useProgressPhotosQuery } from '../hooks/useProgressPhotosQuery';
import { resolveMediaUrl } from '../utils/mediaUrl';

const DOC_TYPE = 'PROGRESS_PHOTO';
const REF_TYPE = 'CLIENT';

interface Props {
  clientCode: string;
}

const ProgressPhotoThumb = React.memo(function ProgressPhotoThumb({
  item,
  onOpen,
  onDelete,
}: {
  item: DocumentListItem;
  onOpen: (uri: string) => void;
  onDelete: (item: DocumentListItem) => void;
}) {
  const uri = resolveMediaUrl(item.filePath);
  const source = useMemo(() => (uri ? { uri } : null), [uri]);

  return (
    <View style={styles.thumbWrap}>
      <TouchableOpacity
        activeOpacity={PressOpacity.default}
        onPress={() => {
          if (!uri) return;
          onOpen(uri);
        }}
        accessibilityRole="button"
        accessibilityLabel="View progress photo"
      >
        {source ? (
          <Image source={source} style={styles.thumb} />
        ) : (
          <View style={[styles.thumb, styles.thumbPlaceholder]}>
            <Ionicons name="image-outline" size={24} color={Colors.textLight} />
          </View>
        )}
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={() => onDelete(item)}
        activeOpacity={PressOpacity.default}
        hitSlop={HitSlop.sm}
        accessibilityRole="button"
        accessibilityLabel="Delete photo"
      >
        <Ionicons name="trash-outline" size={14} color={Colors.destructive} />
      </TouchableOpacity>
    </View>
  );
});

export default function ProgressPhotos({ clientCode }: Props) {
  const coachCode = progressPhotosCoachCode();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [lightboxUri, setLightboxUri] = useState<string | null>(null);
  const lightboxSource = useMemo(
    () => (lightboxUri ? { uri: lightboxUri } : null),
    [lightboxUri],
  );

  const photosQuery = useProgressPhotosQuery(clientCode);
  const photos = photosQuery.data ?? [];

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.progressPhotos(coachCode, clientCode),
    });
  }, [queryClient, coachCode, clientCode]);

  const pickAndUpload = async () => {
    const assets = await pickImagesFromCameraOrLibrary({
      quality: 0.8,
      selectionLimit: 5,
    });
    if (!assets.length) return;

    setUploading(true);
    try {
      for (const asset of assets) {
        const dataUrl = `data:${asset.mimeType};base64,${asset.base64}`;
        await uploadDocument({
          base64DataUrl: dataUrl,
          coachCode,
          refCode: clientCode,
          refType: REF_TYPE,
          docType: DOC_TYPE,
          savedBy: getDocumentSavedById(),
        });
      }
      invalidate();
    } catch (err) {
      Alert.alert(
        'Upload failed',
        getErrorMessage(err, 'Could not upload photo. Please try again.'),
      );
    } finally {
      setUploading(false);
    }
  };

  const confirmDelete = useCallback(
    (item: DocumentListItem) => {
      Alert.alert('Delete photo?', 'This progress photo will be removed permanently.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDocument({ docId: item.docId, coachCode });
              invalidate();
            } catch (err) {
              Alert.alert('Delete failed', getErrorMessage(err, 'Please try again.'));
            }
          },
        },
      ]);
    },
    [coachCode, invalidate],
  );

  const openLightbox = useCallback((uri: string) => setLightboxUri(uri), []);

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Progress Photos</Text>
        <TouchableOpacity
          style={[styles.uploadBtn, uploading && styles.uploadBtnDisabled]}
          onPress={pickAndUpload}
          disabled={uploading}
          accessibilityRole="button"
          accessibilityLabel="Upload progress photo"
        >
          {uploading ? (
            <ActivityIndicator color={Colors.white} size="small" />
          ) : (
            <>
              <Ionicons name="camera-outline" size={16} color={Colors.white} />
              <Text style={styles.uploadBtnText}>Add</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
      <Text style={styles.hint}>Add dated progress photos to track how your client is doing.</Text>

      {photosQuery.isPending ? (
        <ActivityIndicator color={Colors.primary} style={styles.pendingSpinner} />
      ) : photos.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="images-outline" size={28} color={Colors.textLight} />
          <Text style={styles.emptyText}>No progress photos yet.</Text>
        </View>
      ) : (
        <View style={styles.grid}>
          {photos.map(item => (
            <ProgressPhotoThumb
              key={item.docId}
              item={item}
              onOpen={openLightbox}
              onDelete={confirmDelete}
            />
          ))}
        </View>
      )}

      <Modal
        visible={!!lightboxUri}
        transparent
        animationType="fade"
        onRequestClose={() => setLightboxUri(null)}
      >
        <View style={styles.lightbox}>
          <TouchableOpacity
            style={styles.lightboxBackdrop}
            activeOpacity={1}
            onPress={() => setLightboxUri(null)}
          />
          <ScrollView
            contentContainerStyle={styles.lightboxContent}
            maximumZoomScale={3}
            minimumZoomScale={1}
            centerContent
          >
            {lightboxSource ? (
              <Image source={lightboxSource} style={styles.lightboxImage} resizeMode="contain" />
            ) : null}
          </ScrollView>
          <TouchableOpacity style={styles.lightboxClose} onPress={() => setLightboxUri(null)}>
            <Ionicons name="close" size={24} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const THUMB = 100;

const styles = StyleSheet.create({
  section: { marginBottom: Spacing.md },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xxs,
  },
  sectionTitle: { ...Typography.section },
  hint: { ...Typography.caption, marginBottom: Spacing.sm - 2, lineHeight: 17 },
  uploadBtn: {
    ...buttonStyles.compact,
    paddingHorizontal: Spacing.sm,
  },
  uploadBtnDisabled: buttonStyles.disabled,
  uploadBtnText: buttonStyles.compactText,
  empty: {
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    ...Shadow.sm,
  },
  emptyText: { ...Typography.label, color: Colors.textLight },
  pendingSpinner: { marginTop: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm - 2 },
  thumbWrap: { width: THUMB, position: 'relative' },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: Radius.sm,
    backgroundColor: Colors.background,
  },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  deleteBtn: {
    position: 'absolute',
    top: Spacing.xxs,
    right: Spacing.xxs,
    backgroundColor: Colors.white,
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.sm,
  },
  lightbox: { flex: 1, backgroundColor: Colors.lightboxScrim },
  lightboxBackdrop: { ...StyleSheet.absoluteFill },
  lightboxContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg - 4,
  },
  lightboxImage: { width: '100%', height: 400 },
  lightboxClose: {
    position: 'absolute',
    top: 48,
    right: Spacing.lg - 4,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.onDarkOverlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
