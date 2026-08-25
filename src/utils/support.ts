import { Alert, Linking } from 'react-native';
import { PRIVACY_POLICY_URL, SUPPORT_EMAIL } from '../config/appConfig';

/**
 * Open URL via Linking; on Android both canOpenURL/openURL can reject when no
 * activity resolves, so callers need no .catch().
 */
async function openExternal(url: string, fallbackTitle: string, fallbackMessage: string) {
  try {
    if (await Linking.canOpenURL(url)) {
      await Linking.openURL(url);
      return;
    }
  } catch {
    // fall through to the alert
  }
  Alert.alert(fallbackTitle, fallbackMessage);
}

export function openSupportEmail(subject = 'Mera Coach App Support'): Promise<void> {
  const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`;
  return openExternal(url, 'Email us', SUPPORT_EMAIL);
}

export function openAccountDeletionEmail(): Promise<void> {
  const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
    'Account deletion request',
  )}&body=${encodeURIComponent(
    'Please delete my Mera Coach coach account and associated data.\n\nRegistered email or mobile:\n',
  )}`;
  return openExternal(
    url,
    'Request account deletion',
    `Email ${SUPPORT_EMAIL} from your registered address and ask us to delete your account and data.`,
  );
}

export async function openPrivacyPolicyUrl(): Promise<void> {
  if (!PRIVACY_POLICY_URL) {
    Alert.alert(
      'Privacy policy',
      'The full privacy policy is available in this screen. A web version will be linked here once published.',
    );
    return;
  }
  await openExternal(PRIVACY_POLICY_URL, 'Privacy policy', PRIVACY_POLICY_URL);
}
