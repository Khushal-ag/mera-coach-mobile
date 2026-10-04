import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import {
  Colors,
  FontFamily,
  IconSize,
  PressOpacity,
  Radius,
  ScreenPad,
  Shadow,
  Spacing,
  headingFont,
} from '../../constants/theme';
import FormErrorBanner from '../../components/FormErrorBanner';
import ReloadState from '../../components/ReloadState';
import WaveScreenHeader from '../../components/WaveScreenHeader';
import {
  COACH_GALLERY_DOC_TYPE,
  COACH_GALLERY_MAX_PHOTOS,
  COACH_GALLERY_REF_TYPE,
} from '../../config/appConfig';
import { listDocuments, uploadDocument } from '../../api/documentApi';
import { getCoachProfileFull } from '../../api/coachApi';
import { getErrorMessage } from '../../api/client';
import { PHOTO_STALE_MS } from '../../api/queryClient';
import { queryKeys } from '../../api/queryKeys';
import { getDocumentSavedById } from '../../auth/session';
import { pickImagesFromCameraOrLibrary } from '../../utils/imagePicker';
import { navigateToDashboard } from '../../utils/navigationBack';
import type { ProfileStackScreenProps } from '../../types/navigation';

const CANVAS = '#F3FAF7';
const UPLOAD_FILL = '#F6FCF8';
const UPLOAD_DASH = '#6FCBAA';
const UNDERLINE_ORANGE = '#F08A2C';

interface PendingPhoto {
  id: string;
  uri: string;
  base64: string;
  mimeType: string;
  name: string;
}

function fileNameFromUri(uri: string): string {
  const clean = uri.split('?')[0] ?? '';
  try {
    const name = decodeURIComponent(clean.split('/').pop() ?? '');
    return name || 'Selected photo';
  } catch {
    return clean.split('/').pop() || 'Selected photo';
  }
}

function UploadMark() {
  return (
    <View style={styles.uploadMark} accessibilityElementsHidden>
      <Ionicons name="arrow-up" size={20} color={Colors.accentInk} />
      <View style={styles.uploadTray} />
    </View>
  );
}

export default function EditGalleryScreen({ navigation }: ProfileStackScreenProps<'EditGallery'>) {
  const profileQuery = useQuery({
    queryKey: queryKeys.coachProfileFull,
    queryFn: getCoachProfileFull,
  });

  const errorMessage =
    profileQuery.isError && !profileQuery.data
      ? getErrorMessage(profileQuery.error, 'Could not load your profile.')
      : null;

  const coachCode = profileQuery.data?.coachCode ?? '';

  return (
    <View style={styles.container}>
      <WaveScreenHeader
        title="Add Gallery"
        onBack={() => navigation.goBack()}
        onHome={() => navigateToDashboard(navigation)}
      />

      {profileQuery.isPending ? (
        <ActivityIndicator color={Colors.secondary} style={styles.pending} />
      ) : errorMessage ? (
        <ReloadState
          title="Could not load gallery"
          message={errorMessage}
          onRetry={() => void profileQuery.refetch()}
          loading={profileQuery.isFetching}
          showPullHint={false}
        />
      ) : (
        <GalleryComposer coachCode={coachCode} />
      )}
    </View>
  );
}

function GalleryComposer({ coachCode }: { coachCode: string }) {
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<PendingPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

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

  const photos = galleryQuery.data ?? [];
  const listReady = galleryQuery.isSuccess;
  const remaining = Math.max(0, COACH_GALLERY_MAX_PHOTOS - photos.length - pending.length);
  const listError =
    galleryQuery.isError && !galleryQuery.data
      ? getErrorMessage(galleryQuery.error, 'Could not load your gallery.')
      : null;
  const publishDisabled = uploading;

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: galleryKey });
  }, [queryClient, galleryKey]);

  const pickPhotos = async () => {
    if (uploading) return;
    if (!listReady) {
      setBanner(listError ?? 'Gallery is still loading. Wait a moment, then try again.');
      return;
    }
    if (remaining <= 0) {
      Alert.alert('Gallery full', `You can add up to ${COACH_GALLERY_MAX_PHOTOS} photos.`);
      return;
    }
    const assets = await pickImagesFromCameraOrLibrary({
      quality: 0.8,
      selectionLimit: Math.min(5, remaining),
    });
    if (!assets.length) return;
    setBanner(null);
    setPending(current => [
      ...current,
      ...assets.map((asset, index) => ({
        id: `${Date.now()}_${index}_${Math.random().toString(36).slice(2, 6)}`,
        uri: asset.uri,
        base64: asset.base64,
        mimeType: asset.mimeType,
        name: fileNameFromUri(asset.uri),
      })),
    ]);
  };

  const handlePublish = async () => {
    if (uploading) return;
    if (!coachCode) {
      setBanner('Your profile is still loading. Try again in a moment.');
      return;
    }
    if (!listReady) {
      setBanner(listError ?? 'Gallery is still loading. Wait a moment, then try again.');
      return;
    }
    if (pending.length === 0) {
      setBanner('Add a photo before publishing.');
      return;
    }
    if (photos.length + pending.length > COACH_GALLERY_MAX_PHOTOS) {
      setBanner(`You can add up to ${COACH_GALLERY_MAX_PHOTOS} photos.`);
      return;
    }

    setBanner(null);
    setUploading(true);
    const uploaded = new Set<string>();
    try {
      for (const photo of pending) {
        await uploadDocument({
          base64DataUrl: `data:${photo.mimeType};base64,${photo.base64}`,
          coachCode,
          refCode: coachCode,
          refType: COACH_GALLERY_REF_TYPE,
          docType: COACH_GALLERY_DOC_TYPE,
          savedBy: getDocumentSavedById(),
        });
        uploaded.add(photo.id);
      }
      setPending([]);
      invalidate();
      Alert.alert('Gallery updated', 'Your photos have been added.');
    } catch (err) {
      setPending(current => current.filter(photo => !uploaded.has(photo.id)));
      if (uploaded.size > 0) invalidate();
      setBanner(getErrorMessage(err, 'Could not publish photos. Please try again.'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <ScrollView
      style={styles.body}
      contentContainerStyle={styles.bodyContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <FormErrorBanner message={banner} />

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Add Photo</Text>
        <View style={styles.underline} />
        <TouchableOpacity
          style={styles.uploadBox}
          onPress={() => void pickPhotos()}
          disabled={uploading}
          activeOpacity={PressOpacity.default}
          accessibilityRole="button"
          accessibilityLabel={pending.length ? 'Add another photo' : 'Click to upload'}
        >
          {pending.length === 0 ? (
            <View style={styles.uploadEmpty}>
              <UploadMark />
              <Text style={styles.uploadTitle}>Click to upload</Text>
              <Text style={styles.uploadHint}>
                {remaining <= 0
                  ? `Gallery is full (${COACH_GALLERY_MAX_PHOTOS} photos)`
                  : `Up to ${COACH_GALLERY_MAX_PHOTOS} photos`}
              </Text>
            </View>
          ) : (
            <View style={styles.pendingList}>
              {pending.map(photo => (
                <View key={photo.id} style={styles.pendingRow}>
                  <Image source={{ uri: photo.uri }} style={styles.pendingThumb} />
                  <Text style={styles.pendingName} numberOfLines={1}>
                    {photo.name}
                  </Text>
                  <TouchableOpacity
                    onPress={() =>
                      setPending(current => current.filter(item => item.id !== photo.id))
                    }
                    disabled={uploading}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${photo.name}`}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close" size={18} color={Colors.textLight} />
                  </TouchableOpacity>
                </View>
              ))}
              {remaining > 0 ? (
                <Text style={styles.uploadHint}>Tap to add another photo</Text>
              ) : null}
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.publish, publishDisabled && styles.publishDisabled]}
          onPress={() => void handlePublish()}
          disabled={publishDisabled}
          activeOpacity={PressOpacity.default}
          accessibilityRole="button"
          accessibilityLabel="Publish"
          accessibilityState={{ disabled: publishDisabled, busy: uploading }}
        >
          {uploading ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <>
              <Text style={styles.publishLabel}>Publish</Text>
              <View style={styles.publishArrow}>
                <Ionicons name="arrow-forward" size={IconSize.sm} color={Colors.accentInk} />
              </View>
            </>
          )}
        </TouchableOpacity>
      </View>

      {listError ? (
        <ReloadState
          title="Could not load photos"
          message={listError}
          onRetry={() => void galleryQuery.refetch()}
          loading={galleryQuery.isFetching}
          showPullHint={false}
        />
      ) : galleryQuery.isPending ? (
        <ActivityIndicator color={Colors.secondary} style={styles.pending} />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CANVAS },
  body: { flex: 1, backgroundColor: CANVAS },
  bodyContent: {
    paddingHorizontal: ScreenPad.horizontal,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  pending: { marginTop: 60 },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadow.sm,
  },
  cardTitle: {
    fontFamily: headingFont.bold,
    fontSize: 18,
    lineHeight: 24,
    color: Colors.textDark,
  },
  underline: {
    width: 36,
    height: 3,
    borderRadius: 2,
    backgroundColor: UNDERLINE_ORANGE,
    marginTop: 4,
    marginBottom: Spacing.sm,
  },
  uploadBox: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: UPLOAD_DASH,
    borderRadius: 16,
    backgroundColor: UPLOAD_FILL,
    minHeight: 156,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
  },
  uploadEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  uploadMark: {
    alignItems: 'center',
    marginBottom: 2,
  },
  uploadTray: {
    width: 26,
    height: 13,
    marginTop: -1,
    borderLeftWidth: 2.5,
    borderRightWidth: 2.5,
    borderBottomWidth: 2.5,
    borderColor: Colors.accentInk,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
  uploadTitle: {
    marginTop: Spacing.xs,
    fontFamily: FontFamily.bold,
    fontSize: 16,
    lineHeight: 22,
    color: Colors.textDark,
  },
  uploadHint: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textLight,
    textAlign: 'center',
  },
  pendingList: {
    width: '100%',
    gap: Spacing.sm,
  },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  pendingThumb: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: Colors.background,
  },
  pendingName: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.accentInk,
  },
  publish: {
    marginTop: Spacing.md,
    minHeight: 56,
    borderRadius: Radius.pill,
    backgroundColor: Colors.accentInk,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  publishDisabled: { opacity: 0.55 },
  publishLabel: {
    color: Colors.white,
    fontFamily: headingFont.semibold,
    fontSize: 18,
    lineHeight: 24,
  },
  publishArrow: {
    position: 'absolute',
    right: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
