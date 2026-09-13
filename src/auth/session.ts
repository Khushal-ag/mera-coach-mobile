import type { Session } from '../types/models';
import { secureStorage } from './secureStorage';

const KEY = 'meracoach_session';

// In-memory mirrors so apiFetch can read identity synchronously.
let currentToken: string | null = null;
let currentCoachCode: string | undefined;
let currentCoachId: string | undefined;
let currentCoachName: string | undefined;

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
  initialized = true;
  listeners.forEach(listener => listener());
}

export async function saveSession(session: Session): Promise<void> {
  expiredOnRestore = false;
  setCurrentIdentity(session);
  await secureStorage.setItem(KEY, JSON.stringify(session));
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
    setCurrentIdentity(null);
    return null;
  }
}

export async function clearSession(): Promise<void> {
  setCurrentIdentity(null);
  await secureStorage.deleteItem(KEY);
}

/** True when the JWT `exp` claim is in the past (or the token cannot be decoded). */
export function isTokenExpired(token: string): boolean {
  return isExpired(token);
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
