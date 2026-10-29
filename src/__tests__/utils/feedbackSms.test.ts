import { Platform } from 'react-native';
import {
  buildFeedbackSmsBody,
  buildFeedbackWebUrl,
  buildFeedbackWhatsAppUrl,
  buildSmsUrl,
  isValidSmsPhone,
  normalizeSmsPhone,
  whatsAppPhoneDigits,
} from '../../utils/feedbackSms';
import { decodeFeedbackToken } from '../../utils/feedbackCrypto';

describe('feedbackSms', () => {
  const originalOS = Platform.OS;

  afterEach(() => {
    Platform.OS = originalOS;
  });

  it('builds feedback URL with encrypted token containing coach and client codes', () => {
    const url = buildFeedbackWebUrl({ coachCode: 'C1', clientCode: 'CL9' });
    expect(url).toContain('/feedback?ref=');
    expect(url).not.toContain('coachCode=C1');
    expect(url).not.toContain('clientCode=CL9');
    const token = new URL(url!).searchParams.get('ref');
    expect(token).toBeTruthy();
    expect(decodeFeedbackToken(token!)).toEqual({ coachCode: 'C1', clientCode: 'CL9' });
  });

  it('builds short SMS body', () => {
    const body = buildFeedbackSmsBody({
      clientName: 'Priya Sharma',
      coachName: 'Asha',
      feedbackUrl: 'https://mera-coach.com/feedback?coachCode=1&clientCode=2',
    });
    expect(body).toContain('Hi Priya');
    expect(body).toContain('https://mera-coach.com/feedback');
  });

  it('prefixes Indian 10-digit mobiles with +91 for SMS', () => {
    expect(normalizeSmsPhone('9823456712')).toBe('+919823456712');
    expect(normalizeSmsPhone('91 98234 56712')).toBe('+919823456712');
    expect(normalizeSmsPhone('+91-98234-56712')).toBe('+919823456712');
  });

  it('rejects missing or too-short mobiles', () => {
    expect(isValidSmsPhone('')).toBe(false);
    expect(isValidSmsPhone('---')).toBe(false);
    expect(isValidSmsPhone('12345')).toBe(false);
    expect(isValidSmsPhone('9823456712')).toBe(true);
    expect(buildSmsUrl('', 'Hi')).toBeNull();
    expect(buildSmsUrl('123', 'Hi')).toBeNull();
  });

  it('builds iOS sms:/open?addresses= URL with encoded +', () => {
    Platform.OS = 'ios';
    expect(buildSmsUrl('9823456712', 'Hi Priya')).toBe(
      'sms:/open?addresses=%2B919823456712&body=Hi%20Priya',
    );
  });

  it('builds Android smsto:+E164?body= URL', () => {
    Platform.OS = 'android';
    expect(buildSmsUrl('9823456712', 'Hi Priya')).toBe('smsto:+919823456712?body=Hi%20Priya');
  });

  it('drops a leading 0 or 00 dialling prefix', () => {
    expect(normalizeSmsPhone('098765 43210')).toBe('+919876543210');
    expect(normalizeSmsPhone('0091 98765 43210')).toBe('+919876543210');
    expect(normalizeSmsPhone('+91 98765 43210')).toBe('+919876543210');
    expect(normalizeSmsPhone('9876543210')).toBe('+919876543210');
  });

  it('builds a WhatsApp link with the country code and the message', () => {
    expect(whatsAppPhoneDigits('98765 43210')).toBe('919876543210');
    expect(whatsAppPhoneDigits('+91 98765-43210')).toBe('919876543210');
    expect(whatsAppPhoneDigits('09876543210')).toBe('919876543210');
    expect(whatsAppPhoneDigits('12345')).toBeNull();
    expect(buildFeedbackWhatsAppUrl('9876543210', 'Hi there\nhttps://x.y/f?a=1&b=2')).toBe(
      'https://wa.me/919876543210?text=Hi%20there%0Ahttps%3A%2F%2Fx.y%2Ff%3Fa%3D1%26b%3D2',
    );
    expect(buildFeedbackWhatsAppUrl('123', 'x')).toBeNull();
  });
});
