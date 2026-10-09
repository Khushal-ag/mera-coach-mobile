import { getProfileCompletion } from '../../utils/profileCompletion';

const completeProfile = {
  profilePicUrl: 'https://cdn.example/photo.jpg',
  coachName: 'Ada',
  coachTypeCode: 'NUT',
  cityCd: 'Pune',
  tagline: 'Strength first',
  coachDesc: 'Helping clients reach goals',
  serviceCodes: ['SRV1'],
  experienceYears: 5,
  happyClientCount: 20,
  pinCode: '560001',
  addLine: '12 MG Road',
};

describe('getProfileCompletion', () => {
  it('marks incomplete when required public fields are missing', () => {
    const result = getProfileCompletion({
      experienceYears: null,
      happyClientCount: null,
      coachDesc: '',
      addLine: '',
      pinCode: '',
      profilePicUrl: '',
    });
    expect(result.isPublicReady).toBe(false);
    expect(result.percent).toBe(0);
    expect(result.missingLabels).toEqual([
      'Profile photo',
      'Coach name',
      'Coach category',
      'City',
      'Tagline',
      'About / description',
      'Services',
      'Years of experience',
      'Happy clients count',
      'Pincode',
      'Locality or address',
    ]);
  });

  it('does not treat the short field list as enough to go public', () => {
    const result = getProfileCompletion({
      experienceYears: 5,
      happyClientCount: 20,
      coachDesc: 'Helping clients reach goals',
      addLine: '12 MG Road',
      pinCode: '560001',
      profilePicUrl: '',
    });
    expect(result.isPublicReady).toBe(false);
    expect(result.missingLabels).toEqual(
      expect.arrayContaining(['Profile photo', 'Coach name', 'Coach category', 'City', 'Tagline', 'Services']),
    );
  });

  it('previews public only when every server-required field is present and visibility is unknown', () => {
    const result = getProfileCompletion(completeProfile);
    expect(result.isPublicReady).toBe(true);
    expect(result.percent).toBe(100);
    expect(result.missingLabels).toEqual([]);
  });

  it('accepts locality instead of an address line', () => {
    const result = getProfileCompletion({
      ...completeProfile,
      addLine: '',
      locality: 'Koregaon Park',
    });
    expect(result.isPublicReady).toBe(true);
  });

  it('respects an explicit public flag even if fields look incomplete', () => {
    const result = getProfileCompletion({
      experienceYears: null,
      happyClientCount: null,
      coachDesc: '',
      addLine: '',
      pinCode: '',
      isProfileVisible: true,
    });
    expect(result.isPublicReady).toBe(true);
  });

  it('does not say public when the server will hide the profile', () => {
    const result = getProfileCompletion({
      ...completeProfile,
      isProfileVisible: false,
    });
    expect(result.isPublicReady).toBe(false);
  });

  it('uses the server missing-field list when the API sends one', () => {
    const result = getProfileCompletion({
      ...completeProfile,
      isProfileVisible: false,
      missingPublicFields: ['Profile photo', 'Tagline'],
    });
    expect(result.isPublicReady).toBe(false);
    expect(result.missingLabels).toEqual(['Profile photo', 'Tagline']);
    expect(result.percent).toBe(Math.round((9 / 11) * 100));
  });
});
