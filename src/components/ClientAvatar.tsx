import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import { uploadDocumentWithMeta } from '../api/documentApi';
import { getErrorMessage } from '../api/client';
import { getCurrentCoachCode, getCurrentCoachId } from '../auth/session';
import { pickImageFromCameraOrLibrary } from '../utils/imagePicker';
import { useClientPhotoUrl } from '../hooks/useClientPhotoUrl';

const DOC_TYPE = 'PROGRESS_PHOTO';
const REF_TYPE = 'CLIENT';

interface ClientAvatarProps {
  clientCode?: string;
  initials?: string;
  size?: number;
  /** Show a camera badge; tap opens camera/gallery upload. */
  allowUpload?: boolean;
  /** Optional side effect when the upload badge is pressed (e.g. analytics). */
  onUploadPress?: () => void;
  style?: ViewStyle;
}

export default function ClientAvatar({
  clientCode,
  initials = '?',
  size = 46,
  allowUpload = false,
  onUploadPress,
  style,
}: ClientAvatarProps) {
  const { photoUrl, isLoading, invalidate } = useClientPhotoUrl(clientCode);
  const [uploading, setUploading] = useState(false);

  const radius = size / 2;

  const handleUpload = async () => {
    onUploadPress?.();
    if (!clientCode) {
      Alert.alert('Save client first', 'Client photo can be uploaded after the client is saved.');
      return;
    }

    const picked = await pickImageFromCameraOrLibrary({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!picked) return;

    setUploading(true);
    try {
      const coachCode = getCurrentCoachCode() ?? '';
      await uploadDocumentWithMeta({
        base64DataUrl: `data:${picked.mimeType};base64,${picked.base64}`,
        coachCode,
        refCode: clientCode,
        refType: REF_TYPE,
        docType: DOC_TYPE,
        savedBy: Number(getCurrentCoachId()) || 0,
      });
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

  return (
    <View style={[styles.wrap, { width: size, height: size }, style]}>
      <View style={[styles.avatar, { width: size, height: size, borderRadius: radius }]}>
        {isLoading || uploading ? (
          <ActivityIndicator color={Colors.white} size="small" />
        ) : photoUrl ? (
          <Image source={{ uri: photoUrl }} style={styles.image} />
        ) : (
          <Text style={[styles.initials, { fontSize: size * 0.32 }]}>{initials}</Text>
        )}
      </View>
      {allowUpload && clientCode ? (
        <TouchableOpacity
          style={[styles.uploadBadge, { right: -2, bottom: -2 }]}
          onPress={handleUpload}
          disabled={uploading}
          accessibilityRole="button"
          accessibilityLabel="Upload client photo"
        >
          <Ionicons name="camera" size={12} color={Colors.white} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative', marginRight: 12 },
  avatar: {
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: { width: '100%', height: '100%' },
  initials: { color: Colors.white, fontWeight: '700' },
  uploadBadge: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
  },
});
