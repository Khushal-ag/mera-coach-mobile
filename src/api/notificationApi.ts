import { apiFetch, apiGet, apiPost, apiPut } from './client';
import { num, text } from './parse';

/** The four groups a coach can switch on or off. */
export type NotificationGroup = 'LEADS_CLIENTS' | 'BUSINESS' | 'SUBSCRIPTION' | 'FEEDBACK';

export interface AppNotification {
  id: number;
  type: string;
  groupCode: string;
  title: string;
  body: string;
  /** Screen the alert opens: leads, client, premium, packages, posts, reviews. */
  route: string;
  /** Client code, lead id ... for that screen. */
  refCode: string;
  isRead: boolean;
  /** ISO date-time (UTC). */
  createdAt: string;
}

export interface NotificationPage {
  items: AppNotification[];
  unreadCount: number;
  hasMore: boolean;
}

export interface NotificationPreference {
  groupCode: string;
  label: string;
  isEnabled: boolean;
}

export const NOTIFICATION_PAGE_SIZE = 20;

function mapNotification(raw: unknown): AppNotification {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    id: num(r.notificationId),
    type: text(r.type),
    groupCode: text(r.groupCode),
    title: text(r.title),
    body: text(r.body),
    route: text(r.route),
    refCode: text(r.refCode),
    isRead: r.isRead === true,
    createdAt: text(r.createdAt),
  };
}

export async function getNotifications(page: number): Promise<NotificationPage> {
  const raw = (await apiGet<Record<string, unknown>>('/Notification/list', {
    page,
    pageSize: NOTIFICATION_PAGE_SIZE,
  })) as Record<string, unknown> | null;
  return {
    items: (Array.isArray(raw?.items) ? raw.items : []).map(mapNotification),
    unreadCount: num(raw?.unreadCount),
    hasMore: raw?.hasMore === true,
  };
}

export async function getUnreadNotificationCount(): Promise<number> {
  return num(await apiGet<number>('/Notification/unread-count'));
}

/** Pass an id to mark one alert read, or nothing to mark them all. */
export async function markNotificationsRead(notificationId?: number): Promise<void> {
  await apiPost('/Notification/read', notificationId == null ? { all: true } : { notificationId });
}

export async function markNotificationUnread(notificationId: number): Promise<void> {
  await apiPost('/Notification/unread', { notificationId });
}

export async function deleteNotification(notificationId: number): Promise<void> {
  await apiFetch(`/Notification/${notificationId}`, { method: 'DELETE' });
}

export async function clearNotifications(): Promise<void> {
  await apiPost('/Notification/clear');
}

export async function registerPushDevice(params: {
  pushToken: string;
  platform: 'android' | 'ios';
  appVersion?: string;
}): Promise<void> {
  await apiPost('/Notification/device', params);
}

export async function removePushDevice(pushToken: string): Promise<void> {
  await apiPost('/Notification/device/remove', { pushToken });
}

function mapPreference(raw: unknown): NotificationPreference {
  const r = (raw ?? {}) as Record<string, unknown>;
  return { groupCode: text(r.groupCode), label: text(r.label), isEnabled: r.isEnabled !== false };
}

export async function getNotificationPreferences(): Promise<NotificationPreference[]> {
  const raw = await apiGet<unknown[]>('/Notification/preferences');
  return (Array.isArray(raw) ? raw : []).map(mapPreference);
}

export async function updateNotificationPreference(
  groupCode: string,
  isEnabled: boolean,
): Promise<NotificationPreference[]> {
  const raw = await apiPut<unknown[]>('/Notification/preferences', {
    preferences: [{ groupCode, isEnabled }],
  });
  return (Array.isArray(raw) ? raw : []).map(mapPreference);
}
