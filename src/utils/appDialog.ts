import { Linking } from 'react-native';

import {
  enqueueDialog,
  type DialogButton,
  type DialogOptions,
} from '../components/dialog/dialogStore';

export type { DialogButton, DialogOptions };

/** In-app replacement for `Alert.alert`, same arguments, drawn by `AppDialogHost`. */
export function appAlert(
  title: string,
  message?: string,
  buttons?: DialogButton[],
  options?: DialogOptions,
) {
  enqueueDialog(title, message, buttons, options);
}

export function showSuccess(title: string, message?: string, onOk?: () => void) {
  appAlert(title, message, [{ text: 'OK', onPress: onOk }], { tone: 'success' });
}

export function showError(title: string, message?: string) {
  appAlert(title, message, undefined, { tone: 'error' });
}

/** Permission was refused: explain what is needed and offer a way to the system settings. */
export function showPermissionNeeded(message: string) {
  appAlert(
    'Permission needed',
    message,
    [
      { text: 'Not now', style: 'cancel' },
      {
        text: 'Open settings',
        icon: 'settings-outline',
        onPress: () => void Linking.openSettings(),
      },
    ],
    { tone: 'warning' },
  );
}
