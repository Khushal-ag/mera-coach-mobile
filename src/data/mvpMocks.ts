import { Image } from 'react-native';
import { BrandImages } from '../constants/images';
import type { DocumentListItem } from '../api/documentApi';
import type { CoachEvent, CoachPackage } from '../types/models';

/** Stable local asset URI for RN Image (works in Expo Go and native builds). */
function assetUri(source: number): string {
  const resolved = Image.resolveAssetSource(source);
  return resolved?.uri ?? '';
}

/** Sample packages for Indian fitness coaches (UI review without API). */
export function getDefaultMockPackages(): CoachPackage[] {
  return [
    {
      id: 'mock_pkg_starter',
      name: 'Starter Transformation',
      price: '₹4,999',
      duration: '4 weeks',
      description:
        'Two check-ins a week, a personalised diet chart, and form corrections so you build habits that stick.',
    },
    {
      id: 'mock_pkg_pro',
      name: 'Pro Coaching',
      price: '₹9,999',
      duration: '8 weeks',
      description:
        'Weekly BMI reviews, custom workout splits, and WhatsApp support for busy professionals who want clear progress.',
    },
    {
      id: 'mock_pkg_premium',
      name: 'Premium 1:1',
      price: '₹14,999',
      duration: '12 weeks',
      description:
        'Fully personalised plan with video form checks, meal tweaks, and accountability calls twice a month.',
    },
  ];
}

/** Upcoming events with dates relative to today so the public list always shows them. */
export function getDefaultMockEvents(now = new Date()): CoachEvent[] {
  const d1 = addDays(now, 10);
  const d2 = addDays(now, 24);
  const d3 = addDays(now, 38);

  return [
    {
      id: 'mock_evt_open_house',
      title: 'Free form clinic',
      date: toYmd(d1),
      time: '7:00 AM',
      location: 'Powai, Mumbai',
      link: 'https://wa.me/919876543210',
    },
    {
      id: 'mock_evt_nutrition',
      title: 'Nutrition workshop for busy parents',
      date: toYmd(d2),
      time: '11:00 AM',
      location: 'Online (Zoom)',
      link: 'https://mera-coach.com',
    },
    {
      id: 'mock_evt_bootcamp',
      title: 'Weekend outdoor bootcamp',
      date: toYmd(d3),
      time: '6:30 AM',
      location: 'Cubbon Park, Bengaluru',
      link: '',
    },
  ];
}

/** Demo gallery grid using in-app illustration assets. */
export function getDefaultMockGallery(): DocumentListItem[] {
  const slides = [
    BrandImages.dashboardSlide1,
    BrandImages.dashboardSlide2,
    BrandImages.dashboardSlide3,
    BrandImages.mainScreenHero,
    BrandImages.phasePath,
    BrandImages.loginAtmosphere,
  ];

  return slides.flatMap((source, index) => {
    const uri = assetUri(source);
    if (!uri) return [];
    return [
      {
        docId: -(index + 1),
        filePath: uri,
        fcdt: 'Demo',
      } satisfies DocumentListItem,
    ];
  });
}

function addDays(from: Date, days: number): Date {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  d.setDate(d.getDate() + days);
  return d;
}

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
