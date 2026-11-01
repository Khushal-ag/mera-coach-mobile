import * as ImagePicker from 'expo-image-picker';
import { appAlert, showPermissionNeeded } from './appDialog';

interface PickedImage {
  uri: string;
  base64: string;
  mimeType: string;
}

function promptImageSource(): Promise<'camera' | 'library' | null> {
  return new Promise(resolve => {
    appAlert(
      'Add photo',
      'Choose a source',
      [
        { text: 'Take photo', icon: 'camera-outline', onPress: () => resolve('camera') },
        { text: 'Choose from gallery', icon: 'images-outline', onPress: () => resolve('library') },
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
      ],
      { icon: 'camera-outline', cancelable: true, onDismiss: () => resolve(null) },
    );
  });
}

interface PickImageOptions {
  allowsEditing?: boolean;
  aspect?: [number, number];
  quality?: number;
  /** When set, gallery picker allows multiple selection up to this limit. Camera always returns one. */
  selectionLimit?: number;
}

/** Prompt camera vs gallery, request permissions, and return picked image(s). */
export async function pickImagesFromCameraOrLibrary(
  options: PickImageOptions = {},
): Promise<PickedImage[]> {
  const source = await promptImageSource();
  if (!source) return [];

  const { allowsEditing = false, aspect, quality = 0.5, selectionLimit } = options;

  if (source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      showPermissionNeeded('Allow camera access to take a photo.');
      return [];
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality,
      base64: true,
      allowsEditing,
      aspect,
    });
    if (result.canceled || !result.assets[0]?.base64) return [];
    const asset = result.assets[0];
    return [
      {
        uri: asset.uri,
        base64: asset.base64!,
        mimeType: asset.mimeType || 'image/jpeg',
      },
    ];
  }

  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    showPermissionNeeded('Allow photo library access to choose an image.');
    return [];
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality,
    base64: true,
    allowsEditing,
    aspect,
    allowsMultipleSelection: selectionLimit != null && selectionLimit > 1,
    selectionLimit: selectionLimit ?? 1,
  });
  if (result.canceled || !result.assets.length) return [];

  return result.assets
    .filter(a => a.base64)
    .map(asset => ({
      uri: asset.uri,
      base64: asset.base64!,
      mimeType: asset.mimeType || 'image/jpeg',
    }));
}

/** Single-image convenience wrapper. */
export async function pickImageFromCameraOrLibrary(
  options: PickImageOptions = {},
): Promise<PickedImage | null> {
  const picks = await pickImagesFromCameraOrLibrary(options);
  return picks[0] ?? null;
}
