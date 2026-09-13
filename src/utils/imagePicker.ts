import { ActionSheetIOS, Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

interface PickedImage {
  uri: string;
  base64: string;
  mimeType: string;
}

function promptImageSource(): Promise<'camera' | 'library' | null> {
  if (Platform.OS === 'ios') {
    return new Promise(resolve => {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Take Photo', 'Choose from Gallery', 'Cancel'],
          cancelButtonIndex: 2,
        },
        index => {
          if (index === 0) resolve('camera');
          else if (index === 1) resolve('library');
          else resolve(null);
        },
      );
    });
  }
  return new Promise(resolve => {
    Alert.alert(
      'Add photo',
      'Choose a source',
      [
        { text: 'Camera', onPress: () => resolve('camera') },
        { text: 'Gallery', onPress: () => resolve('library') },
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
      ],
      // Android back/outside dismiss otherwise leaves this Promise hanging.
      { cancelable: true, onDismiss: () => resolve(null) },
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

  const { allowsEditing = false, aspect, quality = 0.7, selectionLimit } = options;

  if (source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow camera access to take a photo.');
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
    Alert.alert('Permission needed', 'Allow photo library access to choose an image.');
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
