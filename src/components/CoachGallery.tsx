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
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import {
  COACH_GALLERY_DOC_TYPE,
  COACH_GALLERY_MAX_PHOTOS,
  COACH_GALLERY_REF_TYPE,
} from '../config/appConfig';
import { BrandImages } from '../constants/images';
import {
  Colors,
  FontFamily,
  PressOpacity,
  Radius,
  Shadow,
  Spacing,
  buttonStyles,
  headingFont,
} from '../constants/theme';
import {
  deleteDocument,
  listDocuments,
  uploadDocument,
  type DocumentListItem,
} from '../api/documentApi';
import { getErrorMessage } from '../api/client';
import { PHOTO_STALE_MS } from '../api/queryClient';
import { queryKeys } from '../api/queryKeys';
import { getDocumentSavedById } from '../auth/session';
import { pickImagesFromCameraOrLibrary } from '../utils/imagePicker';
import { isDegenerateImageSize, resolveMediaUrl } from '../utils/mediaUrl';
import EmptyState from './EmptyState';
import SectionTag from './SectionTag';

interface Props {
  coachCode: string;
  /** Edit mode: show add/delete controls. */
  editable?: boolean;
  hideWhenEmpty?: boolean;
  /** Match CoachPublicProfile section padding when shown publicly. */
  publicSection?: boolean;
}

async function loadGallery(coachCode: string): Promise<DocumentListItem[]> {
  return listDocuments({
    coachCode,
    refCode: coachCode,
    refType: COACH_GALLERY_REF_TYPE,
    docType: COACH_GALLERY_DOC_TYPE,
  });
}

const GalleryThumb = React.memo(function GalleryThumb({
  item,
  uri,
  broken,
  tileSize,
  editable,
  busy,
  deleteDisabled,
  onOpen,
  onMarkFailed,
  onDelete,
}: {
  item: DocumentListItem;
  uri: string;
  broken: boolean;
  tileSize?: number;
  editable: boolean;
  busy: boolean;
  deleteDisabled: boolean;
  onOpen: (uri: string) => void;
  onMarkFailed: (docId: number) => void;
  onDelete: (item: DocumentListItem, broken: boolean) => void;
}) {
  const source = useMemo(() => (uri && !broken ? { uri } : null), [uri, broken]);
  const wrapStyle = useMemo(
    () => [styles.thumbWrap, tileSize != null ? { width: tileSize } : null],
    [tileSize],
  );

  return (
    <View style={wrapStyle} collapsable={false}>
      {broken ? (
        <TouchableOpacity
          style={[styles.thumb, styles.thumbBroken]}
          onPress={() => onDelete(item, true)}
          disabled={deleteDisabled}
          accessibilityRole="button"
          accessibilityLabel="Remove unavailable photo"
          activeOpacity={PressOpacity.default}
        >
          {busy ? (
            <ActivityIndicator color={Colors.primary} size="small" />
          ) : (
            <>
              <Ionicons name="image-outline" size={22} color={Colors.textLight} />
              <Text style={styles.thumbBrokenText}>Unavailable</Text>
              <Text style={styles.thumbBrokenHint}>Tap to remove</Text>
            </>
          )}
        </TouchableOpacity>
      ) : source ? (
        <TouchableOpacity
          activeOpacity={PressOpacity.default}
          onPress={() => onOpen(uri)}
          accessibilityRole="button"
          accessibilityLabel="View gallery photo"
        >
          <Image
            source={source}
            style={styles.thumb}
            onError={() => onMarkFailed(item.docId)}
            onLoad={e => {
              const { width, height } = e.nativeEvent.source;
              if (isDegenerateImageSize(width, height)) onMarkFailed(item.docId);
            }}
          />
        </TouchableOpacity>
      ) : null}
      {editable ? (
        <TouchableOpacity
          style={[styles.deleteBtn, busy && styles.deleteBtnBusy]}
          onPress={() => onDelete(item, broken)}
          disabled={deleteDisabled}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel={broken ? 'Remove unavailable photo' : 'Delete photo'}
        >
          {busy ? (
            <ActivityIndicator color={Colors.destructive} size="small" />
          ) : (
            <Ionicons name="trash-outline" size={14} color={Colors.destructive} />
          )}
        </TouchableOpacity>
      ) : null}
    </View>
  );
});

export default function CoachGallery({
  coachCode,
  editable = false,
  hideWhenEmpty = false,
  publicSection = false,
}: Props) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [deletingDocId, setDeletingDocId] = useState<number | null>(null);
  const [failedDocIds, setFailedDocIds] = useState<Set<number>>(() => new Set());
  const [lightboxUri, setLightboxUri] = useState<string | null>(null);
  const [gridWidth, setGridWidth] = useState(0);
  const lightboxSource = useMemo(
    () => (lightboxUri ? { uri: lightboxUri } : null),
    [lightboxUri],
  );

  const galleryKey = queryKeys.coachGallery(coachCode);

  const galleryQuery = useQuery({
    queryKey: galleryKey,
    queryFn: () => loadGallery(coachCode),
    enabled: !!coachCode,
    staleTime: PHOTO_STALE_MS,
  });

  const photos = useMemo(() => galleryQuery.data ?? [], [galleryQuery.data]);
  const visiblePhotos = useMemo(() => {
    return photos
      .map(item => {
        const uri = resolveMediaUrl(item.filePath);
        const failed = failedDocIds.has(item.docId);
        if (!uri || failed) {
          // Public: hide broken/missing. Editor: keep a visible broken tile so delete works.
          if (!editable) return null;
          return { item, uri: '', broken: true as const };
        }
        return { item, uri, broken: false as const };
      })
      .filter(
        (row): row is { item: DocumentListItem; uri: string; broken: boolean } => row != null,
      );
  }, [photos, failedDocIds, editable]);
  const atCap = photos.length >= COACH_GALLERY_MAX_PHOTOS;

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: galleryKey });
  }, [queryClient, galleryKey]);

  const markFailed = useCallback((docId: number) => {
    setFailedDocIds(prev => {
      if (prev.has(docId)) return prev;
      const next = new Set(prev);
      next.add(docId);
      return next;
    });
  }, []);

  const pickAndUpload = async () => {
    if (atCap) {
      Alert.alert('Gallery full', `You can add up to ${COACH_GALLERY_MAX_PHOTOS} photos.`);
      return;
    }

    const remaining = COACH_GALLERY_MAX_PHOTOS - photos.length;
    const assets = await pickImagesFromCameraOrLibrary({
      quality: 0.8,
      selectionLimit: Math.min(5, remaining),
    });
    if (!assets.length) return;

    setUploading(true);
    try {
      for (const asset of assets) {
        const dataUrl = `data:${asset.mimeType};base64,${asset.base64}`;
        await uploadDocument({
          base64DataUrl: dataUrl,
          coachCode,
          refCode: coachCode,
          refType: COACH_GALLERY_REF_TYPE,
          docType: COACH_GALLERY_DOC_TYPE,
          savedBy: getDocumentSavedById(),
        });
      }
      setFailedDocIds(new Set());
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

  const removePhoto = useCallback(
    async (item: DocumentListItem) => {
      if (!coachCode || deletingDocId != null) return;

      const docId = item.docId;
      const previous = queryClient.getQueryData<DocumentListItem[]>(galleryKey);
      setDeletingDocId(docId);

      // Drop the tile immediately (including Unavailable orphans) and stop in-flight
      // list refetches from putting the row back before Document/delete finishes.
      await queryClient.cancelQueries({ queryKey: galleryKey });
      queryClient.setQueryData<DocumentListItem[]>(galleryKey, old =>
        (old ?? []).filter(row => row.docId !== docId),
      );
      setFailedDocIds(prev => {
        if (!prev.has(docId)) return prev;
        const next = new Set(prev);
        next.delete(docId);
        return next;
      });

      try {
        await deleteDocument({ docId, coachCode });
        invalidate();
      } catch (err) {
        if (previous) {
          queryClient.setQueryData(galleryKey, previous);
        } else {
          invalidate();
        }
        Alert.alert('Delete failed', getErrorMessage(err, 'Please try again.'));
      } finally {
        setDeletingDocId(null);
      }
    },
    [coachCode, deletingDocId, galleryKey, invalidate, queryClient],
  );

  const confirmDelete = useCallback((item: DocumentListItem, broken: boolean) => {
    Alert.alert(
      broken ? 'Remove unavailable photo?' : 'Delete photo?',
      broken
        ? 'This file is missing on the server. Remove it from your gallery?'
        : 'This gallery photo will be removed permanently.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            void removePhoto(item);
          },
        },
      ],
    );
  }, [removePhoto]);

  const openLightbox = useCallback((uri: string) => setLightboxUri(uri), []);
  const tileSize =
    gridWidth > 0 ? (gridWidth - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS : undefined;

  if (hideWhenEmpty && !galleryQuery.isPending && visiblePhotos.length === 0) {
    return null;
  }

  return (
    <View style={[styles.section, publicSection && styles.publicSection]}>
      {publicSection ? (
        <View style={styles.publicHeader}>
          <SectionTag icon="images-outline" label="Gallery" />
          <Text style={styles.publicTitle}>Photo gallery</Text>
        </View>
      ) : (
        <View style={styles.headerRow}>
          <Text style={styles.sectionTitle}>{editable ? 'Photo gallery' : 'Gallery'}</Text>
          {editable ? (
            <TouchableOpacity
              style={[styles.uploadBtn, (uploading || atCap) && styles.uploadBtnDisabled]}
              onPress={() => void pickAndUpload()}
              disabled={uploading || atCap}
              accessibilityRole="button"
              accessibilityLabel="Add gallery photo"
            >
              {uploading ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <>
                  <Ionicons name="images-outline" size={16} color={Colors.white} />
                  <Text style={styles.uploadBtnText}>Add</Text>
                </>
              )}
            </TouchableOpacity>
          ) : null}
        </View>
      )}
      {editable ? (
        <Text style={styles.hint}>
          Show clients your sessions, transformations, and coaching space. Up to{' '}
          {COACH_GALLERY_MAX_PHOTOS} photos.
        </Text>
      ) : null}

      {galleryQuery.isPending ? (
        <ActivityIndicator color={Colors.primary} style={styles.pendingSpinner} />
      ) : visiblePhotos.length === 0 ? (
        editable ? (
          <View style={styles.emptyCard}>
            <EmptyState
              illustration={BrandImages.emptyCheckups}
              title="No gallery photos yet"
              message="Tap Add to showcase your sessions, transformations, and coaching space."
            />
          </View>
        ) : (
          <View style={styles.empty}>
            <Ionicons name="images-outline" size={28} color={Colors.textLight} />
            <Text style={styles.emptyText}>No photos yet.</Text>
          </View>
        )
      ) : (
        <View
          style={styles.grid}
          onLayout={e => setGridWidth(e.nativeEvent.layout.width)}
        >
          {visiblePhotos.map(({ item, uri, broken }) => (
            <GalleryThumb
              key={item.docId}
              item={item}
              uri={uri}
              broken={broken}
              tileSize={tileSize}
              editable={editable}
              busy={deletingDocId === item.docId}
              deleteDisabled={deletingDocId != null}
              onOpen={openLightbox}
              onMarkFailed={markFailed}
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
          <View style={styles.lightboxContent}>
            {lightboxSource ? (
              <Image source={lightboxSource} style={styles.lightboxImage} resizeMode="contain" />
            ) : null}
          </View>
          <TouchableOpacity style={styles.lightboxClose} onPress={() => setLightboxUri(null)}>
            <Ionicons name="close" size={24} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const GRID_COLS = 3;
const GRID_GAP = Spacing.sm - 2;

const styles = StyleSheet.create({
  section: { marginBottom: Spacing.md },
  publicSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    marginBottom: 0,
  },
  publicHeader: { marginBottom: 12 },
  publicTitle: {
    fontSize: 18,
    fontFamily: headingFont.bold,
    color: Colors.textDark,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sectionTitle: { fontSize: 15, fontFamily: headingFont.bold, color: Colors.textDark },
  hint: {
    fontSize: 12,
    fontFamily: FontFamily.regular,
    color: Colors.textLight,
    marginBottom: 10,
    lineHeight: 17,
  },
  uploadBtn: {
    ...buttonStyles.compact,
    paddingHorizontal: Spacing.sm,
  },
  uploadBtnDisabled: buttonStyles.disabled,
  uploadBtnText: buttonStyles.compactText,
  emptyCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  empty: {
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: 24,
    ...Shadow.sm,
  },
  emptyText: { fontSize: 13, fontFamily: FontFamily.regular, color: Colors.textLight },
  pendingSpinner: { marginTop: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP },
  thumbWrap: { position: 'relative' },
  thumb: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: Radius.sm,
    backgroundColor: Colors.backgroundTan,
  },
  thumbBroken: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundTan,
  },
  thumbBrokenText: {
    fontSize: 9,
    fontFamily: FontFamily.semibold,
    color: Colors.textLight,
  },
  thumbBrokenHint: {
    fontSize: 8,
    fontFamily: FontFamily.regular,
    color: Colors.primary,
  },
  deleteBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    zIndex: 2,
    elevation: 3,
    backgroundColor: Colors.white,
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.sm,
  },
  deleteBtnBusy: { opacity: 0.7 },
  lightbox: { flex: 1, backgroundColor: Colors.lightboxScrim },
  lightboxBackdrop: { ...StyleSheet.absoluteFill },
  lightboxContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  lightboxImage: { width: '100%', height: 400 },
  lightboxClose: {
    position: 'absolute',
    top: 48,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.onDarkOverlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
