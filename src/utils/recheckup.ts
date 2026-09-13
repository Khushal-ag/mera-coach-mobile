import { parseDob } from './validation';
import type { ClientSummary } from '../types/models';

/**
 * Default weekly BMI checkup cadence. Prefer coach profile interval when the API
 * exposes one; until then callers use this constant.
 */
export const RECHECKUP_INTERVAL_DAYS = 7;

type CheckupUrgency = 'never' | 'overdue' | 'due' | 'ok';

interface CheckupStatus {
  urgency: CheckupUrgency;
  /** Whole days since the last checkup; null when there has never been one. */
  daysSince: number | null;
  /** Raw API string, safe to render even when it could not be parsed. */
  label?: string;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Parse the API's lastCheckupDate. It arrives display-ready rather than as ISO, so accept
 * DD/MM/YYYY and DD-MM-YYYY alongside YYYY-MM-DD / ISO. Returns null when the string is
 * absent or unparseable; callers must keep showing the raw text in that case.
 */
function parseCheckupDate(value: string | undefined | null): Date | null {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return null;
  const direct = parseDob(trimmed);
  if (direct) return direct;
  // DD-MM-YYYY only; do not rewrite YYYY-MM-DD (that would break ISO parsing).
  if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(trimmed)) {
    return parseDob(trimmed.replace(/-/g, '/'));
  }
  return null;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function daysBetween(from: Date, to: Date): number {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / MS_PER_DAY);
}

function resolveIntervalDays(intervalDays?: number): number {
  if (typeof intervalDays === 'number' && Number.isFinite(intervalDays) && intervalDays > 0) {
    return Math.floor(intervalDays);
  }
  return RECHECKUP_INTERVAL_DAYS;
}

function classifyCheckup(
  client: ClientSummary,
  today: Date,
  intervalDays = RECHECKUP_INTERVAL_DAYS,
): CheckupStatus {
  const label = client.lastCheckupDate;
  const date = parseCheckupDate(label);

  // No date at all => never checked up. An unparseable date is different: a checkup clearly
  // happened, we just can't age it, so treat it as due rather than inventing "never".
  if (!date) {
    return label
      ? { urgency: 'due', daysSince: null, label }
      : { urgency: 'never', daysSince: null };
  }

  const days = daysBetween(date, today);
  if (days >= intervalDays) return { urgency: 'overdue', daysSince: days, label };
  return { urgency: 'ok', daysSince: days, label };
}

export function needsRecheckup(status: CheckupStatus): boolean {
  return status.urgency !== 'ok';
}

const URGENCY_RANK: Record<CheckupUrgency, number> = {
  never: 0,
  overdue: 1,
  due: 2,
  ok: 3,
};

interface RankedClient {
  client: ClientSummary;
  status: CheckupStatus;
}

/**
 * Never-checked-up first, then longest-overdue first. Clients the coach needs to call today
 * end up at the top without any filtering, so nobody is hidden behind a threshold.
 */
export function rankForRecheckup(
  clients: ClientSummary[],
  today = new Date(),
  intervalDays?: number,
): RankedClient[] {
  const interval = resolveIntervalDays(intervalDays);
  return clients
    .map(client => ({ client, status: classifyCheckup(client, today, interval) }))
    .sort((a, b) => {
      const byUrgency = URGENCY_RANK[a.status.urgency] - URGENCY_RANK[b.status.urgency];
      if (byUrgency !== 0) return byUrgency;
      const bySpan = (b.status.daysSince ?? 0) - (a.status.daysSince ?? 0);
      if (bySpan !== 0) return bySpan;
      return a.client.name.localeCompare(b.client.name);
    });
}

export function dueForRecheckup(
  clients: ClientSummary[],
  today = new Date(),
  intervalDays?: number,
): RankedClient[] {
  return rankForRecheckup(clients, today, intervalDays).filter(r => needsRecheckup(r.status));
}

export function describeCheckup(status: CheckupStatus): string {
  switch (status.urgency) {
    case 'never':
      return 'Due now';
    case 'due':
      // daysSince is null only when the API sent a date we could not parse.
      if (status.daysSince == null) return 'Check-up due';
      return `Due now · ${status.daysSince}d ago`;
    case 'overdue':
      return `${status.daysSince}d overdue`;
    case 'ok':
      return status.daysSince === 0 ? 'Checked up today' : `OK · ${status.daysSince}d ago`;
  }
}

export function describeLastCheckup(status: CheckupStatus): string {
  return status.label ? `Last check-up ${status.label}` : 'No check-up recorded';
}

export function lastCheckupLabel(lastCheckupDate?: string | null): string {
  const label = (lastCheckupDate ?? '').trim() || undefined;
  return describeLastCheckup({
    urgency: label ? 'ok' : 'never',
    daysSince: null,
    label,
  });
}

/**
 * Whole days until the due window. 0 when already due/overdue/never.
 * Kept for dashboard-style countdowns; Checkups list no longer gates the button on this.
 */
export function daysUntilRecheckup(
  status: CheckupStatus,
  intervalDays = RECHECKUP_INTERVAL_DAYS,
): number {
  if (needsRecheckup(status)) return 0;
  if (status.daysSince == null) return 0;
  return Math.max(0, resolveIntervalDays(intervalDays) - status.daysSince);
}

/** Countdown copy for the due window (informational; not a button lock). */
export function describeRecheckupGate(
  status: CheckupStatus,
  intervalDays = RECHECKUP_INTERVAL_DAYS,
): string {
  const days = daysUntilRecheckup(status, intervalDays);
  if (days <= 0) return 'Re-checkup available';
  if (days === 1) return 'Available tomorrow';
  return `Available in ${days} days`;
}
