import React, { useState } from 'react';
import {
  View,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import { BrandImages } from '../constants/images';
import { uploadDocument } from '../api/documentApi';
import { getErrorMessage } from '../api/client';
import { getCurrentCoachCode, getDocumentSavedById } from '../auth/session';
import { pickImageFromCameraOrLibrary } from '../utils/imagePicker';
import { useClientPhotoUrl } from '../hooks/useClientPhotoUrl';

const DOC_TYPE = 'PROFILE_PIC';
const REF_TYPE = 'CLIENT';

interface ClientAvatarProps {
  clientCode?: string;
  size?: number;
  /**
   * Corner radius. Defaults to a circle (`size / 2`).
   * Ignored when `fillHeight` (card clips the photo).
   */
  borderRadius?: number;
  /**
   * Stretch to the full height of the list card; `size` is used as width only.
   */
  fillHeight?: boolean;
  /** Show a camera badge; tap opens camera/gallery upload. */
  allowUpload?: boolean;
  /** Optional side effect when the upload badge is pressed (e.g. analytics). */
  onUploadPress?: () => void;
  style?: ViewStyle;
}

export default function ClientAvatar({
  clientCode,
  size = 46,
  borderRadius,
  fillHeight = false,
  allowUpload = false,
  onUploadPress,
  style,
}: ClientAvatarProps) {
  const { photoUrl, isLoading, invalidate } = useClientPhotoUrl(clientCode);
  const [uploading, setUploading] = useState(false);

  const radius = fillHeight ? 0 : (borderRadius ?? size / 2);

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
      await uploadDocument({
        base64DataUrl: `data:${picked.mimeType};base64,${picked.base64}`,
        coachCode,
        refCode: clientCode,
        refType: REF_TYPE,
        docType: DOC_TYPE,
        savedBy: getDocumentSavedById(),
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
    <View
      style={[
        styles.wrap,
        fillHeight
          ? { width: size, alignSelf: 'stretch', marginRight: 0 }
          : { width: size, height: size },
        style,
      ]}
    >
      <View
        style={[
          styles.avatar,
          fillHeight
            ? { ...StyleSheet.absoluteFill, borderRadius: radius }
            : { width: size, height: size, borderRadius: radius },
        ]}
      >
        {isLoading || uploading ? (
          <ActivityIndicator color={Colors.white} size="small" />
        ) : photoUrl ? (
          <Image source={{ uri: photoUrl }} style={styles.image} resizeMode="cover" />
        ) : (
          <Image source={BrandImages.avatarDefault} style={styles.image} resizeMode="cover" />
        )}
      </View>
      {allowUpload && clientCode ? (
        <TouchableOpacity
          style={[
            styles.uploadBadge,
            fillHeight ? { right: 6, bottom: 6 } : { right: -2, bottom: -2 },
          ]}
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
