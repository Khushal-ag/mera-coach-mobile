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
  // A leading 0 or 00 is a dialling prefix (0 98765 43210, 0091 98765 43210), not part of the number.
  const digits = stripNonDigits(phone).replace(/^0+/, '');
  if (!digits) return '';
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  if (digits.length > 10) return `+${digits}`;
  return digits;
}

/** True when phone normalizes to a usable E.164-style recipient (≥10 digits). */
export function isValidSmsPhone(phone: string): boolean {
  const digits = stripNonDigits(normalizeSmsPhone(phone));
  return digits.length >= 10;
}

/**
 * Native SMS composer URL.
 * iOS: `sms:/open?addresses=` so To: is set; encode `+` as `%2B` (raw `+` is
 * treated as a space and drops the recipient while still filling body).
 * Android: `smsto:+E164?body=`. The `smsto:` type goes to the messages app; on some phones WhatsApp claims plain
 * `sms:` links and shows its own "not on WhatsApp" dialog instead.
 */
export function buildSmsUrl(phone: string, body: string): string | null {
  if (!isValidSmsPhone(phone)) return null;

  const recipient = normalizeSmsPhone(phone);
  const encodedBody = encodeURIComponent(body);

  if (Platform.OS === 'ios') {
    return `sms:/open?addresses=${encodeURIComponent(recipient)}&body=${encodedBody}`;
  }

  return `smsto:${recipient}?body=${encodedBody}`;
}

/**
 * Digits for a wa.me link: country code included, no + or leading zeros.
 * 10-digit Indian mobiles get 91; 12 digits must already start with 91. Anything else is not sent to WhatsApp.
 */
export function whatsAppPhoneDigits(phone: string): string | null {
  const digits = stripNonDigits(phone).replace(/^0+/, '');
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return digits;
  return null;
}

/** Opens a WhatsApp chat with the message ready to send. */
export function buildFeedbackWhatsAppUrl(phone: string, body: string): string | null {
  const digits = whatsAppPhoneDigits(phone);
  return digits ? `https://wa.me/${digits}?text=${encodeURIComponent(body)}` : null;
}

export async function openFeedbackWhatsApp(params: { phone: string; body: string }): Promise<void> {
  const url = buildFeedbackWhatsAppUrl(params.phone, params.body);
  if (!url) {
    throw new Error('A valid mobile number is required to send feedback on WhatsApp.');
  }
  await Linking.openURL(url);
}

export async function openFeedbackSms(params: { phone: string; body: string }): Promise<void> {
  const url = buildSmsUrl(params.phone, params.body);
  if (!url) {
    throw new Error('A valid mobile number is required to send feedback by SMS.');
  }
  // Query the scheme only — full sms: URLs with long bodies often fail canOpenURL on iOS.
  const canOpen = await Linking.canOpenURL('sms:');
  if (!canOpen) {
    throw new Error('SMS is not available on this device.');
  }
  await Linking.openURL(url);
}
