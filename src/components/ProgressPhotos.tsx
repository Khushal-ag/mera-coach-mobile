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
  ScrollView,
} from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { pickImagesFromCameraOrLibrary } from '../utils/imagePicker';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadow } from '../constants/theme';
import { deleteDocument, uploadDocumentWithMeta, type DocumentListItem } from '../api/documentApi';
import { getErrorMessage } from '../api/client';
import { getCurrentCoachId } from '../auth/session';
import { queryKeys } from '../api/queryKeys';
import { progressPhotosCoachCode, useProgressPhotosQuery } from '../hooks/useProgressPhotosQuery';
import { resolveMediaUrl } from '../utils/mediaUrl';

const DOC_TYPE = 'PROGRESS_PHOTO';
const REF_TYPE = 'CLIENT';

interface Props {
  clientCode: string;
}

export default function ProgressPhotos({ clientCode }: Props) {
  const coachCode = progressPhotosCoachCode();
  const queryClient = useQueryClient();
  const [lightboxUri, setLightboxUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Same query key as ClientAvatar / useClientPhotoUrl — one Document/list per client.
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
        await uploadDocumentWithMeta({
          base64DataUrl: dataUrl,
          coachCode,
          refCode: clientCode,
          refType: REF_TYPE,
          docType: DOC_TYPE,
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
  };

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
      <Text style={styles.hint}>Track client transformation with dated progress photos.</Text>

      {photosQuery.isPending ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 12 }} />
      ) : photos.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="images-outline" size={28} color={Colors.textLight} />
          <Text style={styles.emptyText}>No progress photos yet.</Text>
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
                  accessibilityLabel="View progress photo"
                >
                  {uri ? (
                    <Image source={{ uri }} style={styles.thumb} />
                  ) : (
                    <View style={[styles.thumb, styles.thumbPlaceholder]}>
                      <Ionicons name="image-outline" size={24} color={Colors.textLight} />
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => confirmDelete(item)}
                  accessibilityRole="button"
                  accessibilityLabel="Delete photo"
                >
                  <Ionicons name="trash-outline" size={14} color={Colors.destructive} />
                </TouchableOpacity>
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
          <ScrollView
            contentContainerStyle={styles.lightboxContent}
            maximumZoomScale={3}
            minimumZoomScale={1}
            centerContent
          >
            {lightboxUri ? (
              <Image
                source={{ uri: lightboxUri }}
                style={styles.lightboxImage}
                resizeMode="contain"
              />
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
  section: { marginBottom: 16 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.textDark },
  hint: { fontSize: 12, color: Colors.textLight, marginBottom: 10, lineHeight: 17 },
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
  uploadBtnText: { color: Colors.white, fontSize: 12, fontWeight: '700' },
  empty: {
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: 24,
    ...Shadow.sm,
  },
  emptyText: { fontSize: 13, color: Colors.textLight },
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
  lightboxContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
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
