import React, { useCallback, useState } from 'react';
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
  USE_MVP_MOCKS,
} from '../config/appConfig';
import { Colors, FontFamily, Radius, Shadow, Spacing } from '../constants/theme';
import {
  deleteDocument,
  listDocuments,
  uploadDocumentWithMeta,
  type DocumentListItem,
} from '../api/documentApi';
import { getErrorMessage } from '../api/client';
import { PHOTO_STALE_MS } from '../api/queryClient';
import { queryKeys } from '../api/queryKeys';
import { getCurrentCoachId } from '../auth/session';
import DemoModeHint from './DemoModeHint';
import { resolveDemoGallery, saveDemoGallery } from '../data/mvpMockStore';
import { pickImagesFromCameraOrLibrary } from '../utils/imagePicker';
import { resolveMediaUrl } from '../utils/mediaUrl';
import SectionTag from './SectionTag';

interface Props {
  coachCode: string;
  /** Edit mode: show add/delete controls. */
  editable?: boolean;
  hideWhenEmpty?: boolean;
  /** Match CoachPublicProfile section padding when shown publicly. */
  publicSection?: boolean;
}

interface GalleryQueryResult {
  photos: DocumentListItem[];
  isDemo: boolean;
}

async function loadGallery(coachCode: string): Promise<GalleryQueryResult> {
  let apiPhotos: DocumentListItem[] = [];
  let apiFailed = false;

  try {
    apiPhotos = await listDocuments({
      coachCode,
      refCode: coachCode,
      refType: COACH_GALLERY_REF_TYPE,
      docType: COACH_GALLERY_DOC_TYPE,
    });
  } catch (err) {
    if (!USE_MVP_MOCKS) throw err;
    apiFailed = true;
  }

  if (!USE_MVP_MOCKS) {
    return { photos: apiPhotos, isDemo: false };
  }

  if (apiPhotos.length > 0 && !apiFailed) {
    return { photos: apiPhotos, isDemo: false };
  }

  return resolveDemoGallery(coachCode, []);
}

export default function CoachGallery({
  coachCode,
  editable = false,
  hideWhenEmpty = false,
  publicSection = false,
}: Props) {
  const queryClient = useQueryClient();
  const [lightboxUri, setLightboxUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const galleryQuery = useQuery({
    queryKey: queryKeys.coachGallery(coachCode),
    queryFn: () => loadGallery(coachCode),
    enabled: !!coachCode,
    staleTime: PHOTO_STALE_MS,
  });

  const photos = galleryQuery.data?.photos ?? [];
  const isDemo = galleryQuery.data?.isDemo ?? false;
  const atCap = photos.length >= COACH_GALLERY_MAX_PHOTOS;

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.coachGallery(coachCode) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.coachMvpDemo(coachCode) });
  }, [queryClient, coachCode]);

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
      if (USE_MVP_MOCKS && isDemo) {
        const next = [...photos];
        for (const asset of assets) {
          if (next.length >= COACH_GALLERY_MAX_PHOTOS) break;
          const dataUrl = `data:${asset.mimeType};base64,${asset.base64}`;
          next.push({
            docId: -(Date.now() + next.length),
            filePath: dataUrl,
            fcdt: 'Demo',
          });
        }
        await saveDemoGallery(coachCode, next);
        invalidate();
        return;
      }

      for (const asset of assets) {
        const dataUrl = `data:${asset.mimeType};base64,${asset.base64}`;
        await uploadDocumentWithMeta({
          base64DataUrl: dataUrl,
          coachCode,
          refCode: coachCode,
          refType: COACH_GALLERY_REF_TYPE,
          docType: COACH_GALLERY_DOC_TYPE,
          savedBy: Number(getCurrentCoachId()) || 0,
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

  const confirmDelete = (item: DocumentListItem) => {
    Alert.alert(
      'Delete photo?',
      isDemo
        ? 'This demo photo will be removed from this device only.'
        : 'This gallery photo will be removed permanently.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (USE_MVP_MOCKS && isDemo) {
                await saveDemoGallery(
                  coachCode,
                  photos.filter(p => p.docId !== item.docId),
                );
                invalidate();
                return;
              }
              await deleteDocument({ docId: item.docId, coachCode });
              invalidate();
            } catch (err) {
              Alert.alert('Delete failed', getErrorMessage(err, 'Please try again.'));
            }
          },
        },
      ],
    );
  };

  if (hideWhenEmpty && !galleryQuery.isPending && photos.length === 0) {
    return null;
  }

  return (
    <View style={[styles.section, publicSection && styles.publicSection]}>
      {publicSection ? (
        <View style={styles.publicHeader}>
          <SectionTag icon="images-outline" label="Gallery" />
          <Text style={styles.publicTitle}>Photo gallery</Text>
          {isDemo ? <DemoModeHint message="Demo photos for UI review." /> : null}
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
        <>
          {isDemo ? <DemoModeHint /> : null}
          <Text style={styles.hint}>
            Show clients your sessions, transformations, and coaching space. Up to{' '}
            {COACH_GALLERY_MAX_PHOTOS} photos.
          </Text>
        </>
      ) : null}

      {galleryQuery.isPending ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 12 }} />
      ) : photos.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="images-outline" size={28} color={Colors.textLight} />
          <Text style={styles.emptyText}>
            {editable ? 'No gallery photos yet.' : 'No photos yet.'}
          </Text>
        </View>
      ) : (
        <View style={styles.grid}>
          {photos.map(item => {
            const uri = resolveMediaUrl(item.filePath);
            return (
              <View key={item.docId} style={styles.thumbWrap}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => uri && setLightboxUri(uri)}
                  accessibilityRole="button"
                  accessibilityLabel="View gallery photo"
                >
                  {uri ? (
                    <Image source={{ uri }} style={styles.thumb} />
                  ) : (
                    <View style={[styles.thumb, styles.thumbPlaceholder]}>
                      <Ionicons name="image-outline" size={24} color={Colors.textLight} />
                    </View>
                  )}
                </TouchableOpacity>
                {editable ? (
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => confirmDelete(item)}
                    accessibilityRole="button"
                    accessibilityLabel="Delete photo"
                  >
                    <Ionicons name="trash-outline" size={14} color={Colors.destructive} />
                  </TouchableOpacity>
                ) : null}
              </View>
            );
          })}
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
            {lightboxUri ? (
              <Image
                source={{ uri: lightboxUri }}
                style={styles.lightboxImage}
                resizeMode="contain"
              />
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

const THUMB = 100;

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
    fontFamily: FontFamily.bold,
    color: Colors.textDark,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sectionTitle: { fontSize: 15, fontFamily: FontFamily.bold, color: Colors.textDark },
  hint: {
    fontSize: 12,
    fontFamily: FontFamily.regular,
    color: Colors.textLight,
    marginBottom: 10,
    lineHeight: 17,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    borderRadius: Radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  uploadBtnDisabled: { opacity: 0.7 },
  uploadBtnText: { color: Colors.white, fontSize: 12, fontFamily: FontFamily.bold },
  empty: {
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: 24,
    ...Shadow.sm,
  },
  emptyText: { fontSize: 13, fontFamily: FontFamily.regular, color: Colors.textLight },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
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
    top: 4,
    right: 4,
    backgroundColor: Colors.white,
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.sm,
  },
  lightbox: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)' },
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
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
