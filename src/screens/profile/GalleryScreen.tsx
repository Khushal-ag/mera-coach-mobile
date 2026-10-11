import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import {
  Colors,
  HitSlop,
  IconSize,
  PressOpacity,
  Radius,
  ScreenPad,
  Shadow,
  Spacing,
  Typography,
} from '../../constants/theme';
import AppButton from '../../components/AppButton';
import FormErrorBanner from '../../components/FormErrorBanner';
import ReloadState from '../../components/ReloadState';
import WaveScreenHeader from '../../components/WaveScreenHeader';
import {
  COACH_GALLERY_DOC_TYPE,
  COACH_GALLERY_MAX_PHOTOS,
  COACH_GALLERY_REF_TYPE,
} from '../../config/appConfig';
import { getCoachProfileFull } from '../../api/coachApi';
import { deleteDocument, listDocuments, type DocumentListItem } from '../../api/documentApi';
import { getErrorMessage } from '../../api/client';
import { PHOTO_STALE_MS } from '../../api/queryClient';
import { queryKeys } from '../../api/queryKeys';
import { refreshControlTheme, useQueriesRefreshControl } from '../../hooks/useRefreshControl';
import { isDegenerateImageSize, resolveMediaUrl } from '../../utils/mediaUrl';
import { navigateToDashboard } from '../../utils/navigationBack';
import type { ProfileStackScreenProps } from '../../types/navigation';

const CANVAS = '#F3FAF7';
const GRID_COLS = 3;
const GRID_GAP = Spacing.xs;

export default function GalleryScreen({ navigation }: ProfileStackScreenProps<'GalleryHome'>) {
  const queryClient = useQueryClient();
  const profileQuery = useQuery({
    queryKey: queryKeys.coachProfileFull,
    queryFn: getCoachProfileFull,
  });
  const coachCode = profileQuery.data?.coachCode ?? '';
  const galleryKey = queryKeys.coachGallery(coachCode);
  const galleryQuery = useQuery({
    queryKey: galleryKey,
    queryFn: () =>
      listDocuments({
        coachCode,
        refCode: coachCode,
        refType: COACH_GALLERY_REF_TYPE,
        docType: COACH_GALLERY_DOC_TYPE,
      }),
    enabled: !!coachCode,
    staleTime: PHOTO_STALE_MS,
  });
  const refreshControl = useQueriesRefreshControl([profileQuery, galleryQuery]);
  const [deletingDocId, setDeletingDocId] = useState<number | null>(null);
  const [failedDocIds, setFailedDocIds] = useState<Set<number>>(() => new Set());
  const [lightboxUri, setLightboxUri] = useState<string | null>(null);
  const [gridWidth, setGridWidth] = useState(0);
  const [actionError, setActionError] = useState<string | null>(null);

  const profileError =
    profileQuery.isError && !profileQuery.data
      ? getErrorMessage(profileQuery.error, 'Could not load your gallery.')
      : null;
  const galleryError =
    galleryQuery.isError && !galleryQuery.data
      ? getErrorMessage(galleryQuery.error, 'Could not load your gallery.')
      : null;

  const photos = useMemo(() => galleryQuery.data ?? [], [galleryQuery.data]);
  const visiblePhotos = useMemo(() => {
    return photos
      .map(item => {
        const uri = resolveMediaUrl(item.filePath);
        const failed = failedDocIds.has(item.docId);
        if (!uri || failed) return { item, uri: '', broken: true as const };
        return { item, uri, broken: false as const };
      })
      .filter(
        (row): row is { item: DocumentListItem; uri: string; broken: boolean } => row != null,
      );
  }, [photos, failedDocIds]);
  const tileSize = gridWidth > 0 ? (gridWidth - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS : undefined;
  const lightboxSource = useMemo(() => (lightboxUri ? { uri: lightboxUri } : null), [lightboxUri]);
  const atMax = galleryQuery.isSuccess && photos.length >= COACH_GALLERY_MAX_PHOTOS;

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

  const goAdd = () => {
    if (!coachCode) {
      setActionError(profileError ?? 'Your profile is still loading. Try again in a moment.');
      return;
    }
    if (atMax) {
      setActionError(`You can add up to ${COACH_GALLERY_MAX_PHOTOS} photos.`);
      return;
    }
    setActionError(null);
    navigation.navigate('EditGallery');
  };

  const removePhoto = useCallback(
    async (item: DocumentListItem) => {
      if (!coachCode || deletingDocId != null) return;

      const docId = item.docId;
      const previous = queryClient.getQueryData<DocumentListItem[]>(galleryKey);
      setDeletingDocId(docId);
      setActionError(null);
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
        setActionError(getErrorMessage(err, 'Could not delete this photo. Please try again.'));
      } finally {
        setDeletingDocId(null);
      }
    },
    [coachCode, deletingDocId, galleryKey, invalidate, queryClient],
  );

  const confirmDelete = useCallback(
    (item: DocumentListItem, broken: boolean) => {
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
    },
    [removePhoto],
  );

  const listReady = !!coachCode && galleryQuery.isSuccess;

  return (
    <View style={styles.container}>
      <WaveScreenHeader
        title="Photo gallery"
        onBack={() => navigation.goBack()}
        onHome={() => navigateToDashboard(navigation)}
      />
      <View style={styles.addRow}>
        <AppButton
          label="Add photo"
          size="compact"
          icon="add-outline"
          iconPosition="left"
          onPress={goAdd}
          accessibilityLabel="Add gallery"
        />
      </View>
      <View style={styles.bannerPad}>
        <FormErrorBanner message={actionError} />
        <FormErrorBanner message={refreshControl.refreshError} />
      </View>

      {profileQuery.isPending ? (
        <ActivityIndicator color={Colors.secondary} style={styles.pending} />
      ) : profileError || !coachCode ? (
        <ReloadState
          title="Could not load gallery"
          message={profileError ?? 'Could not load your gallery.'}
          onRetry={() => void profileQuery.refetch()}
          loading={profileQuery.isFetching}
          showPullHint={false}
        />
      ) : galleryQuery.isPending ? (
        <ActivityIndicator color={Colors.secondary} style={styles.pending} />
      ) : galleryError ? (
        <ReloadState
          title="Could not load photos"
          message={galleryError}
          onRetry={() => void galleryQuery.refetch()}
          loading={galleryQuery.isFetching}
          showPullHint={false}
        />
      ) : (
        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshControl.refreshing}
              onRefresh={refreshControl.onRefresh}
              {...refreshControlTheme}
            />
          }
        >
          {visiblePhotos.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="images-outline" size={IconSize.xxl} color={Colors.accentInk} />
              <Text style={styles.emptyTitle}>No photos yet</Text>
              <Text style={styles.emptyMessage}>
                Add photos of your sessions, transformations, and coaching space.
              </Text>
            </View>
          ) : (
            <View style={styles.photoCard}>
              <Text style={styles.sectionTitle}>Photos</Text>
              <View style={styles.underline} />
              <View
                style={styles.grid}
                onLayout={event => setGridWidth(event.nativeEvent.layout.width)}
              >
                {visiblePhotos.map(({ item, uri, broken }) => (
                  <GalleryThumb
                    key={item.docId}
                    item={item}
                    uri={uri}
                    broken={broken}
                    tileSize={tileSize}
                    busy={deletingDocId === item.docId}
                    deleteDisabled={deletingDocId != null}
                    onOpen={setLightboxUri}
                    onMarkFailed={markFailed}
                    onDelete={confirmDelete}
                  />
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {listReady ? (
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
            <TouchableOpacity
              style={styles.lightboxClose}
              onPress={() => setLightboxUri(null)}
              accessibilityRole="button"
              accessibilityLabel="Close photo"
            >
              <Ionicons name="close-outline" size={IconSize.xl} color={Colors.white} />
            </TouchableOpacity>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

function GalleryThumb({
  item,
  uri,
  broken,
  tileSize,
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
  busy: boolean;
  deleteDisabled: boolean;
  onOpen: (uri: string) => void;
  onMarkFailed: (docId: number) => void;
  onDelete: (item: DocumentListItem, broken: boolean) => void;
}) {
  const source = useMemo(() => (uri && !broken ? { uri } : null), [uri, broken]);

  return (
    <View style={[styles.thumbWrap, tileSize != null ? { width: tileSize } : null]}>
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
            <ActivityIndicator color={Colors.accentInk} size="small" />
          ) : (
            <>
              <Ionicons name="image-outline" size={IconSize.xl} color={Colors.accentInk} />
              <Text style={styles.thumbBrokenText}>Unavailable</Text>
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
            onLoad={event => {
              const { width, height } = event.nativeEvent.source;
              if (isDegenerateImageSize(width, height)) onMarkFailed(item.docId);
            }}
          />
        </TouchableOpacity>
      ) : null}
      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={() => onDelete(item, broken)}
        disabled={deleteDisabled}
        hitSlop={HitSlop.sm}
        accessibilityRole="button"
        accessibilityLabel={broken ? 'Remove unavailable photo' : 'Delete photo'}
      >
        {busy ? (
          <ActivityIndicator color={Colors.destructive} size="small" />
        ) : (
          <Ionicons name="trash-outline" size={IconSize.sm} color={Colors.destructive} />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CANVAS },
  pending: { marginTop: 60 },
  body: { flex: 1, backgroundColor: CANVAS },
  addRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: ScreenPad.horizontal,
    paddingTop: Spacing.md,
  },
  bannerPad: { paddingHorizontal: ScreenPad.horizontal },
  bodyContent: {
    paddingHorizontal: ScreenPad.horizontal,
    paddingTop: Spacing.md,
    paddingBottom: ScreenPad.tabBarClearance,
    gap: Spacing.sm,
  },
  emptyCard: {
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: Spacing.lg,
    ...Shadow.sm,
  },
  emptyTitle: {
    ...Typography.headline,
  },
  emptyMessage: {
    ...Typography.body,
    color: Colors.textLight,
    textAlign: 'center',
  },
  sectionTitle: {
    ...Typography.headline,
  },
  underline: {
    width: 36,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#F08A2C',
    marginTop: Spacing.xxs,
    marginBottom: Spacing.sm,
  },
  photoCard: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: Spacing.sm,
    ...Shadow.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  thumbWrap: {
    position: 'relative',
  },
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
  },
  thumbBrokenText: {
    ...Typography.micro,
    color: Colors.textLight,
  },
  deleteBtn: {
    position: 'absolute',
    top: Spacing.xxs,
    right: Spacing.xxs,
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
  lightbox: { flex: 1, backgroundColor: Colors.lightboxScrim },
  lightboxBackdrop: { ...StyleSheet.absoluteFill },
  lightboxContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
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
