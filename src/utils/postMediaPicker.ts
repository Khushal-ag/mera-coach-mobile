import { ActionSheetIOS, Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';

export interface PickedPostMedia {
  uri: string;
  base64: string;
  mimeType: string;
  isVideo: boolean;
  /** Size in bytes when the picker reports it. */
  bytes: number;
}

type Source = 'camera' | 'library';

function askSource(): Promise<Source | null> {
  if (Platform.OS === 'ios') {
    return new Promise(resolve => {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Take Photo', 'Photo or Video Library', 'Cancel'], cancelButtonIndex: 2 },
        index => resolve(index === 0 ? 'camera' : index === 1 ? 'library' : null),
      );
    });
  }
  return new Promise(resolve => {
    Alert.alert(
      'Add photo or video',
      'Choose a source',
      [
        { text: 'Camera', onPress: () => resolve('camera') },
        { text: 'Library', onPress: () => resolve('library') },
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
      ],
      { cancelable: true, onDismiss: () => resolve(null) },
    );
  });
}

function videoMime(uri: string, reported?: string | null): string {
  if (reported?.startsWith('video/')) return reported;
  const ext = uri.split('?')[0]?.split('.').pop()?.toLowerCase();
  if (ext === 'mov') return 'video/quicktime';
  if (ext === 'webm') return 'video/webm';
  return 'video/mp4';
}

/** Pick a photo (camera or library) or a video (library) for a gallery, event or success post. */
export async function pickPostMedia(): Promise<PickedPostMedia | null> {
  const source = await askSource();
  if (!source) return null;

  const perm =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert(
      'Permission needed',
      source === 'camera'
        ? 'Allow camera access to take a photo.'
        : 'Allow library access to choose media.',
    );
    return null;
  }

  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.75, base64: true })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images', 'videos'],
          quality: 0.75,
          base64: true,
        });
  const asset = result.canceled ? null : result.assets[0];
  if (!asset) return null;

  if (asset.type === 'video') {
    const bytes = asset.fileSize ?? 0;
    // Only read the file into memory once it is within the upload limit.
    if (bytes > 10 * 1024 * 1024) {
      return {
        uri: asset.uri,
        base64: '',
        mimeType: videoMime(asset.uri, asset.mimeType),
        isVideo: true,
        bytes,
      };
    }
    const base64 = await FileSystem.readAsStringAsync(asset.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return {
      uri: asset.uri,
      base64,
      mimeType: videoMime(asset.uri, asset.mimeType),
      isVideo: true,
      bytes: bytes || Math.floor((base64.length * 3) / 4),
    };
  }
  if (!asset.base64) return null;
  return {
    uri: asset.uri,
    base64: asset.base64,
    mimeType: asset.mimeType || 'image/jpeg',
    isVideo: false,
    bytes: Math.floor((asset.base64.length * 3) / 4),
  };
}
