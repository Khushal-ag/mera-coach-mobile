import type { MasterOption } from '../api/masterApi';

/**
 * Local language codes for diet plans / reports.
 * Master ItemType=Language / LocalLanguage currently return 204, so keep a fixed list
 * until GetMasterItem is seeded (codes match API string values, e.g. "hi").
 */
export const LOCAL_LANGUAGE_OPTIONS: MasterOption[] = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi' },
  { code: 'mr', label: 'Marathi' },
  { code: 'gu', label: 'Gujarati' },
  { code: 'bn', label: 'Bengali' },
  { code: 'ta', label: 'Tamil' },
  { code: 'te', label: 'Telugu' },
  { code: 'kn', label: 'Kannada' },
  { code: 'ml', label: 'Malayalam' },
  { code: 'pa', label: 'Punjabi' },
];
