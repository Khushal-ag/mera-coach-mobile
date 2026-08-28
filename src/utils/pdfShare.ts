import { Alert, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { getCurrentToken } from '../auth/session';
import { withQuery } from '../api/client';

type SharingModule = typeof import('expo-sharing');

const REBUILD_MESSAGE =
  'PDF sharing is not available in this build. Rebuild the native app so ExpoSharing is linked:\n\n' +
  'iOS: npx expo prebuild --clean && npx expo run:ios\n' +
  'Android: npx expo prebuild --clean && npx expo run:android';

/** Short coach-facing copy when the PDF API fails (e.g. server Chromium/SxS). */
export const PDF_GENERATE_FAILED_MESSAGE =
  "Couldn't generate PDF right now. Please try again later.";

function isMissingExpoSharingError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? '');
  return /ExpoSharing|expo-sharing/i.test(msg);
}

function alertRebuildRequired(): void {
  Alert.alert('Rebuild app required', REBUILD_MESSAGE);
}

/**
 * Load expo-sharing only when the native module is present.
 * expo-sharing's JS entry calls requireNativeModule('ExpoSharing') at evaluate time,
 * so importing it on a stale binary throws — guard first, never crash the PDF tap path.
 */
async function loadSharingModule(): Promise<SharingModule | null> {
  if (!requireOptionalNativeModule('ExpoSharing')) {
    return null;
  }
  try {
    return await import('expo-sharing');
  } catch {
    return null;
  }
}

const API_VERSION = '1';

function apiBaseUrl(): string {
  const base = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (!base) throw new Error('API base URL is not configured.');
  return base;
}

function buildApiUrl(path: string, query?: Record<string, string | undefined>): string {
  const resolved = path.replace('{version}', API_VERSION);
  return `${apiBaseUrl()}${query ? withQuery(resolved, query) : resolved}`;
}

export function bmiReportPdfQuery(params: {
  coachCode: string;
  clientCode?: string;
  assessmentCode?: string;
}): Record<string, string | undefined> {
  return {
    coachCode: params.coachCode,
    clientCode: params.clientCode,
    assessmentCode: params.assessmentCode,
  };
}

export function dietPlanPdfQuery(params: {
  coachCode: string;
  clientCode?: string;
}): Record<string, string | undefined> {
  return {
    coachCode: params.coachCode,
    clientCode: params.clientCode,
  };
}

function filenameFromDisposition(header: string | null, fallback: string): string {
  if (!header) return fallback;
  const match = /filename\*?=(?:UTF-8''|")?([^";]+)/i.exec(header);
  if (!match?.[1]) return fallback;
  try {
    return decodeURIComponent(match[1].replace(/"/g, '').trim());
  } catch {
    return match[1].replace(/"/g, '').trim() || fallback;
  }
}

/** Fetch an authenticated PDF and open the native share sheet. */
export async function downloadAndSharePdf(
  path: string,
  query: Record<string, string | undefined>,
  fallbackFilename: string,
): Promise<void> {
  const url = buildApiUrl(path, query);
  const token = getCurrentToken();

  const response = await fetch(url, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    // Backend PDF engines often return long Chromium/Blink/SxS dumps — never surface those.
    throw new Error(PDF_GENERATE_FAILED_MESSAGE);
  }

  const filename = filenameFromDisposition(
    response.headers.get('Content-Disposition'),
    fallbackFilename,
  );
  const safeName = filename.replace(/[^\w.\-() ]+/g, '_');
  const cacheDir = FileSystem.cacheDirectory;
  if (!cacheDir) throw new Error('Could not access device storage.');

  const fileUri = `${cacheDir}${safeName}`;
  const buffer = await response.arrayBuffer();
  const base64 = arrayBufferToBase64(buffer);
  await FileSystem.writeAsStringAsync(fileUri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  if (Platform.OS === 'web') {
    Alert.alert('PDF ready', 'PDF download is not supported in web preview.');
    return;
  }

  const Sharing = await loadSharingModule();
  if (!Sharing) {
    alertRebuildRequired();
    return;
  }

  try {
    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      Alert.alert('PDF saved', `Saved to ${fileUri}`);
      return;
    }

    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle: 'Share downloaded PDF',
    });
  } catch (err) {
    if (isMissingExpoSharingError(err)) {
      alertRebuildRequired();
      return;
    }
    throw err;
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}
