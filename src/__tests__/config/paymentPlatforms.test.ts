import { externalPaymentsAllowed, parsePaymentPlatforms } from '../../config/appConfig';

describe('parsePaymentPlatforms', () => {
  it('defaults to Android only when nothing is set', () => {
    expect(parsePaymentPlatforms(undefined)).toEqual(['android']);
    expect(parsePaymentPlatforms('')).toEqual(['android']);
    expect(parsePaymentPlatforms('   ')).toEqual(['android']);
  });

  it('reads a comma list, ignoring case, spaces and unknown names', () => {
    expect(parsePaymentPlatforms('iOS, Android')).toEqual(['ios', 'android']);
    expect(parsePaymentPlatforms('ios')).toEqual(['ios']);
    expect(parsePaymentPlatforms('web, android')).toEqual(['android']);
  });

  it('turns payments off everywhere with "none"', () => {
    expect(parsePaymentPlatforms('none')).toEqual([]);
  });
});

describe('externalPaymentsAllowed', () => {
  it('follows the platform the app runs on', () => {
    expect(externalPaymentsAllowed('android', undefined)).toBe(true);
    expect(externalPaymentsAllowed('ios', undefined)).toBe(false);
    expect(externalPaymentsAllowed('ios', 'ios,android')).toBe(true);
    expect(externalPaymentsAllowed('android', 'none')).toBe(false);
  });
});
