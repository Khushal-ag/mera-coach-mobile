import type { Session } from '../types/models';
import { lockMpinSession } from './mpin';
import { secureStorage } from './secureStorage';

const KEY = 'meracoach_session';

// In-memory mirrors so apiFetch can read identity synchronously.
let currentToken: string | null = null;
let currentCoachCode: string | undefined;
let currentCoachId: string | undefined;
let currentCoachName: string | undefined;
let currentEmail: string | undefined;

export function getCurrentToken(): string | null {
  return currentToken;
}

export function getCurrentCoachCode(): string | undefined {
  return currentCoachCode;
}

export function getCurrentCoachId(): string | undefined {
  return currentCoachId;
}

export function getCurrentCoachName(): string | undefined {
  return currentCoachName?.trim() || undefined;
}

/** Login email from the restored/saved session (for MPIN owner checks). */
export function getCurrentEmail(): string | undefined {
  return currentEmail?.trim() || undefined;
}

/** Numeric coach id for Document upload `savedBy` (API expects number, not display name). */
export function getDocumentSavedById(fallback?: string | number): number {
  const fromSession = Number(getCurrentCoachId());
  if (fromSession) return fromSession;
  const fromFallback = Number(fallback);
  return Number.isFinite(fromFallback) && fromFallback ? fromFallback : 0;
}

/** Keep session display name in sync after Edit Profile rename (used as FCBY/savedBy). */
export async function updateSessionFullName(fullName: string): Promise<void> {
  const trimmed = fullName.trim();
  if (!trimmed) return;
  currentCoachName = trimmed;
  const raw = await secureStorage.getItem(KEY);
  if (!raw) return;
  try {
    const session: Session = JSON.parse(raw);
    if (session.fullName === trimmed) return;
    await saveSession({ ...session, fullName: trimmed });
  } catch {
    // Memory already updated; persist best-effort.
  }
}

// Minimal pub-sub so AppNavigator can reactively swap screen trees — see useAuthState.ts.
type Listener = () => void;
const listeners = new Set<Listener>();
let initialized = false;
/** Set when restoreSession drops an expired JWT (cleared on successful saveSession). */
let expiredOnRestore = false;

export function subscribeToAuthState(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function isAuthInitialized(): boolean {
  return initialized;
}

export function isAuthenticated(): boolean {
  return currentToken !== null;
}

/** True after a cold start cleared an expired token (for login messaging). */
export function didSessionExpireOnRestore(): boolean {
  return expiredOnRestore;
}

function setCurrentIdentity(session: Session | null): void {
  currentToken = session?.token ?? null;
  currentCoachCode = session?.coachCode;
  currentCoachId = session?.coachId;
  currentCoachName = session?.fullName;
  currentEmail = session?.email;
  initialized = true;
  listeners.forEach(listener => listener());
}

/** Fail closed after a broken SecureStore restore so splash cannot hang forever. */
export function markAuthRestoreFailed(): void {
  currentToken = null;
  currentCoachCode = undefined;
  currentCoachId = undefined;
  currentCoachName = undefined;
  currentEmail = undefined;
  initialized = true;
  listeners.forEach(listener => listener());
}

/** Drop React Query cache without a static import on the session cold path. */
async function clearQueryCacheLazy(): Promise<void> {
  try {
    // Lazy require — dynamic import() triggers IDE TS1323 under Expo `module: "preserve"`.
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- intentional lazy load
    const { clearAppQueryCache } =
      require('../api/queryClient') as typeof import('../api/queryClient');
    clearAppQueryCache();
  } catch {
    /* ignore if RQ module unavailable (unit tests) */
  }
}

export async function saveSession(session: Session): Promise<void> {
  expiredOnRestore = false;
  // Persist first so a failed write cannot leave UI signed-in with no durable session.
  await secureStorage.setItem(KEY, JSON.stringify(session));
  setCurrentIdentity(session);
}

export async function restoreSession(): Promise<Session | null> {
  const raw = await secureStorage.getItem(KEY);
  if (!raw) {
    setCurrentIdentity(null);
    return null;
  }
  try {
    const session: Session = JSON.parse(raw);
    if (isExpired(session.token)) {
      // Drop the JWT only — MPIN + last login id stay in SecureStore for faster re-auth.
      expiredOnRestore = true;
      await clearSession();
      return null;
    }
    expiredOnRestore = false;
    setCurrentIdentity(session);
    return session;
  } catch {
    // Drop corrupt blob (+ RQ / MPIN lock) so cold starts don't keep re-parsing a bad session.
    await clearSession();
    return null;
  }
}

export async function clearSession(): Promise<void> {
  // Re-lock MPIN so a same-process re-login cannot skip the unlock gate.
  lockMpinSession();
  setCurrentIdentity(null);
  await secureStorage.deleteItem(KEY);
  // Wipe coach/client cache on every session drop (logout, 401, expired restore).
  await clearQueryCacheLazy();
}

// Manual base64url decode — `atob` isn't guaranteed to exist in React Native's JS engine.
const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function base64UrlDecode(input: string): string {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  let output = '';
  let buffer = 0;
  let bits = 0;
  for (const char of base64) {
    const value = BASE64_CHARS.indexOf(char);
    if (value === -1) continue;
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      output += String.fromCharCode((buffer >> bits) & 0xff);
    }
  }
  return output;
}

function isExpired(token: string): boolean {
  try {
    const payload = JSON.parse(base64UrlDecode(token.split('.')[1] ?? ''));
    if (!payload.exp) return false;
    return Date.now() >= payload.exp * 1000;
  } catch {
    return true;
  }
}
