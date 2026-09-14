import type { CoachEvent } from '../types/models';
import { coerceJsonList } from './coerceJsonList';

export const MAX_COACH_EVENTS = 10;
const PUBLIC_UPCOMING_EVENTS = 3;

export function createEmptyEvent(): CoachEvent {
  return {
    id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    title: '',
    date: '',
    time: '',
    location: '',
    link: '',
    imageUrl: '',
  };
}

/** Accept arrays or JSON strings from profile GET/save responses. */
export function parseCoachEvents(raw: unknown): CoachEvent[] {
  const list = coerceJsonList(raw);
  return list
    .map((item, index) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const title = String(row.title ?? row.name ?? '').trim();
      if (!title) return null;
      const imageUrl = String(row.imageUrl ?? row.image ?? '').trim();
      return {
        id: String(row.id ?? `evt_${index}`),
        title,
        date: String(row.date ?? row.eventDate ?? '').trim(),
        time: String(row.time ?? row.eventTime ?? '').trim(),
        location: String(row.location ?? row.city ?? '').trim(),
        link: String(row.link ?? row.url ?? '').trim(),
        ...(imageUrl ? { imageUrl } : {}),
      } satisfies CoachEvent;
    })
    .filter((e): e is CoachEvent => !!e)
    .slice(0, MAX_COACH_EVENTS);
}

export function isValidCoachEventDate(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  return parseEventDateMs(trimmed) != null;
}

export function validateCoachEventsDraft(events: CoachEvent[]): string | null {
  for (let i = 0; i < events.length; i++) {
    const event = events[i]!;
    const title = event.title.trim();
    const hasDetails =
      event.date.trim() ||
      event.time.trim() ||
      event.location.trim() ||
      event.link.trim() ||
      (event.imageUrl ?? '').trim();
    if (!title && hasDetails) {
      return `Event ${i + 1} needs a title before saving.`;
    }
    if (title && event.date.trim() && !isValidCoachEventDate(event.date)) {
      return `Event ${i + 1} has an invalid date. Use YYYY-MM-DD or DD/MM/YYYY.`;
    }
  }
  return null;
}

export function serializeCoachEvents(events: CoachEvent[]): CoachEvent[] {
  return events
    .map(e => {
      const imageUrl = (e.imageUrl ?? '').trim();
      return {
        id: e.id || createEmptyEvent().id,
        title: e.title.trim(),
        date: e.date.trim(),
        time: e.time.trim(),
        location: e.location.trim(),
        link: e.link.trim(),
        ...(imageUrl ? { imageUrl } : {}),
      };
    })
    .filter(e => e.title)
    .slice(0, MAX_COACH_EVENTS);
}

/** Upcoming first (by date), then undated; past dates excluded when date parses. */
export function getUpcomingCoachEvents(
  events: CoachEvent[],
  limit = PUBLIC_UPCOMING_EVENTS,
  now = new Date(),
): CoachEvent[] {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  const withSort = events.map((event, index) => {
    const ts = parseEventDateMs(event.date);
    return { event, index, ts };
  });

  const upcoming = withSort.filter(row => {
    if (row.event.date.trim() && row.ts == null) return false;
    return row.ts == null || row.ts >= startOfToday;
  });
  upcoming.sort((a, b) => {
    if (a.ts == null && b.ts == null) return a.index - b.index;
    if (a.ts == null) return 1;
    if (b.ts == null) return -1;
    if (a.ts !== b.ts) return a.ts - b.ts;
    return a.index - b.index;
  });

  return upcoming.slice(0, limit).map(row => row.event);
}

function parseEventDateMs(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (ymd) {
    const y = parseInt(ymd[1]!, 10);
    const m = parseInt(ymd[2]!, 10) - 1;
    const d = parseInt(ymd[3]!, 10);
    const dt = new Date(y, m, d);
    if (dt.getFullYear() === y && dt.getMonth() === m && dt.getDate() === d) return dt.getTime();
  }

  const dmy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  if (dmy) {
    const d = parseInt(dmy[1]!, 10);
    const m = parseInt(dmy[2]!, 10) - 1;
    const y = parseInt(dmy[3]!, 10);
    const dt = new Date(y, m, d);
    if (dt.getFullYear() === y && dt.getMonth() === m && dt.getDate() === d) return dt.getTime();
  }

  const fallback = Date.parse(trimmed);
  return Number.isFinite(fallback) ? fallback : null;
}
