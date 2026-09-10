import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DocumentListItem } from '../api/documentApi';
import type { CoachEvent, CoachPackage } from '../types/models';
import { getDefaultMockEvents, getDefaultMockGallery, getDefaultMockPackages } from './mvpMocks';

const KEY_PREFIX = '@mera_coach/mvp_mocks/v1';

type GalleryPhoto = DocumentListItem;

interface CoachMvpStore {
  packages?: CoachPackage[];
  events?: CoachEvent[];
  gallery?: GalleryPhoto[];
}

const memory = new Map<string, CoachMvpStore>();

function storageKey(coachCode: string): string {
  return `${KEY_PREFIX}/${coachCode || '_anon'}`;
}

async function readStore(coachCode: string): Promise<CoachMvpStore> {
  const cached = memory.get(coachCode);
  if (cached) return cached;

  try {
    const raw = await AsyncStorage.getItem(storageKey(coachCode));
    if (!raw) {
      const empty: CoachMvpStore = {};
      memory.set(coachCode, empty);
      return empty;
    }
    const parsed = JSON.parse(raw) as CoachMvpStore;
    memory.set(coachCode, parsed);
    return parsed;
  } catch {
    const empty: CoachMvpStore = {};
    memory.set(coachCode, empty);
    return empty;
  }
}

async function writeStore(coachCode: string, next: CoachMvpStore): Promise<void> {
  memory.set(coachCode, next);
  try {
    await AsyncStorage.setItem(storageKey(coachCode), JSON.stringify(next));
  } catch {
    // Keep in-memory demo state even if disk write fails.
  }
}

/** API data wins when present; otherwise local demo store (seeded on first use). */
export async function resolveDemoPackages(
  coachCode: string,
  apiPackages: CoachPackage[] | undefined,
): Promise<{ packages: CoachPackage[]; isDemo: boolean }> {
  if (apiPackages?.length) {
    return { packages: apiPackages, isDemo: false };
  }
  const store = await readStore(coachCode);
  if (store.packages) {
    return { packages: store.packages, isDemo: true };
  }
  const seeded = getDefaultMockPackages();
  await writeStore(coachCode, { ...store, packages: seeded });
  return { packages: seeded, isDemo: true };
}

export async function resolveDemoEvents(
  coachCode: string,
  apiEvents: CoachEvent[] | undefined,
): Promise<{ events: CoachEvent[]; isDemo: boolean }> {
  if (apiEvents?.length) {
    return { events: apiEvents, isDemo: false };
  }
  const store = await readStore(coachCode);
  if (store.events) {
    return { events: store.events, isDemo: true };
  }
  const seeded = getDefaultMockEvents();
  await writeStore(coachCode, { ...store, events: seeded });
  return { events: seeded, isDemo: true };
}

export async function resolveDemoGallery(
  coachCode: string,
  apiPhotos: DocumentListItem[] | undefined,
): Promise<{ photos: DocumentListItem[]; isDemo: boolean }> {
  if (apiPhotos?.length) {
    return { photos: apiPhotos, isDemo: false };
  }
  const store = await readStore(coachCode);
  if (store.gallery) {
    return { photos: store.gallery, isDemo: true };
  }
  const seeded = getDefaultMockGallery();
  await writeStore(coachCode, { ...store, gallery: seeded });
  return { photos: seeded, isDemo: true };
}

export async function saveDemoPackages(coachCode: string, packages: CoachPackage[]): Promise<void> {
  const store = await readStore(coachCode);
  await writeStore(coachCode, { ...store, packages });
}

export async function saveDemoEvents(coachCode: string, events: CoachEvent[]): Promise<void> {
  const store = await readStore(coachCode);
  await writeStore(coachCode, { ...store, events });
}

export async function saveDemoGallery(
  coachCode: string,
  photos: DocumentListItem[],
): Promise<void> {
  const store = await readStore(coachCode);
  await writeStore(coachCode, { ...store, gallery: photos });
}

/** Sync defaults for first paint on public profile before AsyncStorage resolves. */
export function getSyncDemoPackagesFallback(): CoachPackage[] {
  return getDefaultMockPackages();
}

export function getSyncDemoEventsFallback(): CoachEvent[] {
  return getDefaultMockEvents();
}
