import { Platform } from 'react-native';
import {
  buildFeedbackSmsBody,
  buildFeedbackWebUrl,
  buildSmsUrl,
  isValidSmsPhone,
  normalizeSmsPhone,
} from '../../utils/feedbackSms';

describe('feedbackSms', () => {
  const originalOS = Platform.OS;

  afterEach(() => {
    Platform.OS = originalOS;
  });

  it('builds feedback URL with coach and client codes', () => {
    const url = buildFeedbackWebUrl({ coachCode: 'C1', clientCode: 'CL9' });
    expect(url).toContain('/feedback?');
    expect(url).toContain('coachCode=C1');
    expect(url).toContain('clientCode=CL9');
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

  it('builds Android sms:+E164?body= URL', () => {
    Platform.OS = 'android';
    expect(buildSmsUrl('9823456712', 'Hi Priya')).toBe(
      'sms:+919823456712?body=Hi%20Priya',
    );
  });
});
