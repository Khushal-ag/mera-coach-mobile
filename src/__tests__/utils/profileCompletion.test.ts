import { getProfileCompletion } from '../../utils/profileCompletion';

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
    expect(result.missingLabels.length).toBe(6);
  });

  it('is public-ready when required fields are filled even without photo', () => {
    const result = getProfileCompletion({
      experienceYears: 5,
      happyClientCount: 20,
      coachDesc: 'Helping clients reach goals',
      addLine: '12 MG Road',
      pinCode: '560001',
      profilePicUrl: '',
    });
    expect(result.isPublicReady).toBe(true);
    expect(result.percent).toBe(Math.round((5 / 6) * 100));
    expect(result.missingLabels).toEqual(['Profile photo']);
  });

  it('reaches 100% when photo and required fields are present', () => {
    const result = getProfileCompletion({
      experienceYears: 3,
      happyClientCount: 10,
      coachDesc: 'Coach bio',
      add_Line: 'Address',
      pinCode: '110001',
      profilePicUrl: 'https://cdn.example/photo.jpg',
    });
    expect(result.isPublicReady).toBe(true);
    expect(result.percent).toBe(100);
    expect(result.missingLabels).toEqual([]);
  });

  it('respects explicit isProfileVisible even if fields look incomplete', () => {
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
});
