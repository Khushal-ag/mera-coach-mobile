import {
  mapPinLookupToFields,
  resolveCountryCodeForPinLookup,
} from '../../utils/pinLocation';

describe('resolveCountryCodeForPinLookup', () => {
  it('maps India name to IN', () => {
    expect(
      resolveCountryCodeForPinLookup({ apiCountry: 'India', pinCode: '560001' }),
    ).toBe('IN');
  });

  it('defaults to IN for 6-digit PIN when API omits country', () => {
    expect(
      resolveCountryCodeForPinLookup({ lookupCountryCode: 'IN', pinCode: '560001' }),
    ).toBe('IN');
  });
});

describe('mapPinLookupToFields', () => {
  it('includes resolved country with city and state', () => {
    expect(
      mapPinLookupToFields(
        { city: 'Pune', state: 'Maharashtra', country: 'India' },
        'IN',
        '411037',
      ),
    ).toEqual({
      city: 'Pune',
      state: 'Maharashtra',
      countryCode: 'IN',
    });
  });
});
