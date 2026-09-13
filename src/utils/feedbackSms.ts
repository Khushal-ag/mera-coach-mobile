import { Linking, Platform } from 'react-native';
import { WEB_BASE_URL } from '../config/appConfig';
import { stripNonDigits } from './validation';

export function buildFeedbackWebUrl(params: {
  coachCode: string;
  clientCode: string;
}): string | null {
  const base = WEB_BASE_URL.replace(/\/$/, '');
  const coachCode = params.coachCode.trim();
  const clientCode = params.clientCode.trim();
  if (!base || !coachCode || !clientCode) return null;

  const qs = new URLSearchParams({
    coachCode,
    clientCode,
  });
  return `${base}/feedback?${qs.toString()}`;
}

export function buildFeedbackSmsBody(params: {
  clientName?: string;
  coachName?: string;
  feedbackUrl: string;
}): string {
  const clientFirst = params.clientName?.trim().split(/\s+/)[0];
  const greeting = clientFirst ? `Hi ${clientFirst}` : 'Hi';
  const coachBit = params.coachName?.trim()
    ? ` for your coach ${params.coachName.trim()}`
    : ' for your coach';
  return `${greeting}, please share quick feedback${coachBit} on Mera Coach:\n${params.feedbackUrl}`;
}

/**
 * Indian 10-digit mobiles need +91 for the Messages app to resolve the
 * recipient (same convention as WhatsApp links). Longer values already
 * include a country code.
 */
export function normalizeSmsPhone(phone: string): string {
  const digits = stripNonDigits(phone);
  if (!digits) return '';
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  if (digits.length > 10) return `+${digits}`;
  return digits;
}

/** Native SMS composer. iOS uses `&body=`, Android uses `?body=`. */
export function buildSmsUrl(phone: string, body: string): string {
  const recipient = normalizeSmsPhone(phone);
  const encoded = encodeURIComponent(body);
  const separator = Platform.OS === 'ios' ? '&' : '?';
  return `sms:${recipient}${separator}body=${encoded}`;
}

export async function openFeedbackSms(params: { phone: string; body: string }): Promise<void> {
  const url = buildSmsUrl(params.phone, params.body);
  const canOpen = await Linking.canOpenURL(url);
  if (!canOpen) {
    throw new Error('SMS is not available on this device.');
  }
  await Linking.openURL(url);
}
