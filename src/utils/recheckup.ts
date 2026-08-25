import { parseDob } from './validation';
import type { ClientSummary } from '../types/models';

/**
 * Weekly BMI checkup cadence. Clients are due when the last checkup is at least
 * RECHECKUP_INTERVAL_DAYS old, or when they have never been checked.
 */
export const RECHECKUP_INTERVAL_DAYS = 7;

export type CheckupUrgency = 'never' | 'overdue' | 'due' | 'ok';

export interface CheckupStatus {
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
 * absent or unparseable — callers must keep showing the raw text in that case.
 */
function parseCheckupDate(value: string | undefined | null): Date | null {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return null;
  const direct = parseDob(trimmed);
  if (direct) return direct;
  // DD-MM-YYYY only — do not rewrite YYYY-MM-DD (that would break ISO parsing).
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

function classifyCheckup(client: ClientSummary, today: Date): CheckupStatus {
  const label = client.lastCheckupDate;
  const date = parseCheckupDate(label);

  // No date at all → never checked up. An unparseable date is different: a checkup clearly
  // happened, we just can't age it, so treat it as due rather than inventing "never".
  if (!date) {
    return label
      ? { urgency: 'due', daysSince: null, label }
      : { urgency: 'never', daysSince: null };
  }

  const days = daysBetween(date, today);
  if (days >= RECHECKUP_INTERVAL_DAYS) return { urgency: 'overdue', daysSince: days, label };
  return { urgency: 'ok', daysSince: days, label };
}

/** Every urgency other than 'ok' is something the coach should act on. */
export function needsRecheckup(status: CheckupStatus): boolean {
  return status.urgency !== 'ok';
}

const URGENCY_RANK: Record<CheckupUrgency, number> = {
  never: 0,
  overdue: 1,
  due: 2,
  ok: 3,
};

export interface RankedClient {
  client: ClientSummary;
  status: CheckupStatus;
}

/**
 * Never-checked-up first, then longest-overdue first. Clients the coach needs to call today
 * end up at the top without any filtering, so nobody is hidden behind a threshold.
 */
export function rankForRecheckup(clients: ClientSummary[], today = new Date()): RankedClient[] {
  return clients
    .map(client => ({ client, status: classifyCheckup(client, today) }))
    .sort((a, b) => {
      const byUrgency = URGENCY_RANK[a.status.urgency] - URGENCY_RANK[b.status.urgency];
      if (byUrgency !== 0) return byUrgency;
      const bySpan = (b.status.daysSince ?? 0) - (a.status.daysSince ?? 0);
      if (bySpan !== 0) return bySpan;
      return a.client.name.localeCompare(b.client.name);
    });
}

/** Due / overdue clients only, already ranked for the Checkups work list. */
export function dueForRecheckup(clients: ClientSummary[], today = new Date()): RankedClient[] {
  return rankForRecheckup(clients, today).filter(r => needsRecheckup(r.status));
}

/** Status line for a card (separate from the always-visible last-checkup line). */
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

/** Always-shown last checkup line — honest when the API has no date. */
export function describeLastCheckup(status: CheckupStatus): string {
  return status.label ? `Last check-up ${status.label}` : 'No check-up recorded';
}

/** Client list / card helper when you only have the raw API date string. */
export function lastCheckupLabel(lastCheckupDate?: string | null): string {
  const label = (lastCheckupDate ?? '').trim() || undefined;
  return describeLastCheckup({
    urgency: label ? 'ok' : 'never',
    daysSince: null,
    label,
  });
}

/**
 * Whole days until the weekly BMI due window. 0 when already due/overdue/never.
 * Kept for dashboard-style countdowns; Checkups list no longer gates the button on this.
 */
export function daysUntilRecheckup(status: CheckupStatus): number {
  if (needsRecheckup(status)) return 0;
  if (status.daysSince == null) return 0;
  return Math.max(0, RECHECKUP_INTERVAL_DAYS - status.daysSince);
}

/** Countdown copy for the weekly due window (informational; not a button lock). */
export function describeRecheckupGate(status: CheckupStatus): string {
  const days = daysUntilRecheckup(status);
  if (days <= 0) return 'Re-checkup available';
  if (days === 1) return 'Available tomorrow';
  return `Available in ${days} days`;
}
