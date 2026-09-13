import { isPublicProfileDataSufficient } from '../api/coachApi';

export type ProfileCompletionItem = {
  key: string;
  label: string;
  done: boolean;
};

export type ProfileCompletionInput = {
  experienceYears?: number | null;
  happyClientCount?: number | null;
  coachDesc?: string | null;
  addLine?: string | null;
  add_Line?: string | null;
  pinCode?: string | null;
  profilePicUrl?: string | null;
  isProfileVisible?: boolean;
};

export type ProfileCompletion = {
  percent: number;
  items: ProfileCompletionItem[];
  isPublicReady: boolean;
  missingLabels: string[];
};

/** Checklist for fields required to appear on Find a Coach (+ optional photo boost). */
export function getProfileCompletion(profile: ProfileCompletionInput): ProfileCompletion {
  const addLine = String(profile.addLine ?? profile.add_Line ?? '').trim();
  const pinCode = String(profile.pinCode ?? '').trim();
  const coachDesc = String(profile.coachDesc ?? '').trim();
  const experienceYears = profile.experienceYears;
  const happyClientCount = profile.happyClientCount;
  const hasPhoto = !!String(profile.profilePicUrl ?? '').trim();

  const experienceDone =
    experienceYears != null && Number.isFinite(experienceYears) && experienceYears >= 0;
  const clientsDone =
    happyClientCount != null && Number.isFinite(happyClientCount) && happyClientCount >= 0;
  const pinDigits = pinCode.replace(/\D/g, '');
  const pinDone = pinDigits.length === 6;
  const descDone = !!coachDesc;
  const addressDone = !!addLine;

  const items: ProfileCompletionItem[] = [
    { key: 'experience', label: 'Years of experience', done: experienceDone },
    { key: 'clients', label: 'Happy clients count', done: clientsDone },
    { key: 'description', label: 'About / description', done: descDone },
    { key: 'address', label: 'Address line', done: addressDone },
    { key: 'pincode', label: '6-digit pincode', done: pinDone },
    { key: 'photo', label: 'Profile photo', done: hasPhoto },
  ];

  const doneCount = items.filter(i => i.done).length;
  const percent = Math.round((doneCount / items.length) * 100);
  const isPublicReady =
    profile.isProfileVisible === true ||
    isPublicProfileDataSufficient({
      experienceYears,
      happyClientCount,
      coachDesc,
      add_Line: addLine,
      pinCode,
    });

  return {
    percent,
    items,
    isPublicReady,
    missingLabels: items.filter(i => !i.done).map(i => i.label),
  };
}
