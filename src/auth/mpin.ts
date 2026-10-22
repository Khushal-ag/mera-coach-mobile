import { generateMpinSalt, hashMpin, verifyMpin } from '../utils/mpinCrypto';
import { secureStorage } from './secureStorage';

const MPIN_KEY = 'meracoach_mpin';
const LOGIN_ID_KEY = 'meracoach_last_login_id';
const DEFERRED_KEY = 'meracoach_mpin_deferred';
const ATTEMPTS_KEY = 'meracoach_mpin_attempts';

/** Wrong MPINs allowed before the MPIN is cleared and the coach must sign in with the password. */
export const MAX_MPIN_ATTEMPTS = 5;

interface StoredMpin {
  salt: string;
  hash: string;
  /** Login email this MPIN belongs to. */
  loginId: string;
}

type Listener = () => void;
const listeners = new Set<Listener>();

let initialized = false;
let configured = false;
let setupDeferred = false;
let lastLoginId: string | null = null;
/** In-memory only: cleared when the JS process restarts (cold start). */
let unlockedThisSession = false;

function notify(): void {
  listeners.forEach(listener => listener());
}

export function subscribeToMpinState(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function isMpinInitialized(): boolean {
  return initialized;
}

export function isMpinConfigured(): boolean {
  return configured;
}

export function isMpinSetupDeferred(): boolean {
  return setupDeferred;
}

export function isMpinUnlocked(): boolean {
  return unlockedThisSession;
}

export function getLastLoginId(): string | null {
  return lastLoginId;
}

export function markMpinUnlocked(): void {
  if (unlockedThisSession) return;
  unlockedThisSession = true;
  notify();
}

export function lockMpinSession(): void {
  if (!unlockedThisSession) return;
  unlockedThisSession = false;
  notify();
}

async function readStoredMpin(): Promise<StoredMpin | null> {
  const raw = await secureStorage.getItem(MPIN_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredMpin;
    if (!parsed?.salt || !parsed?.hash || !parsed?.loginId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function restoreMpinState(): Promise<void> {
  const [stored, loginId, deferredRaw] = await Promise.all([
    readStoredMpin(),
    secureStorage.getItem(LOGIN_ID_KEY),
    secureStorage.getItem(DEFERRED_KEY),
  ]);
  configured = stored != null;
  lastLoginId = loginId?.trim() || stored?.loginId || null;
  setupDeferred = deferredRaw === '1';
  // Cold start always requires unlock when an MPIN exists.
  unlockedThisSession = false;
  initialized = true;
  notify();
}

/** Fail closed after a broken SecureStore restore so splash cannot hang forever. */
export function markMpinRestoreFailed(): void {
  configured = false;
  setupDeferred = false;
  unlockedThisSession = false;
  initialized = true;
  notify();
}

/**
 * Drop MPIN when its owner email does not match the restored session / last login id.
 * Prevents a desynced verifier from unlocking another coach's JWT.
 */
export async function ensureMpinMatchesLogin(
  ...expectedLoginIds: (string | null | undefined)[]
): Promise<void> {
  // Login accepts email or mobile, so the session email may differ from the typed id the MPIN was saved under.
  const expected = expectedLoginIds
    .map(id => id?.trim().toLowerCase())
    .filter((id): id is string => !!id);
  if (!expected.length || !configured) return;
  const stored = await readStoredMpin();
  if (!stored) return;
  if (!expected.includes(stored.loginId.toLowerCase())) {
    await clearMpin();
  }
}

/** Persist email/mobile used at login so password screens can prefill after JWT expiry. */
export async function rememberLoginId(loginId: string): Promise<void> {
  const trimmed = loginId.trim();
  if (!trimmed) return;

  const previous = lastLoginId;
  lastLoginId = trimmed;
  await secureStorage.setItem(LOGIN_ID_KEY, trimmed);

  // Different account: drop the previous user's MPIN so it cannot unlock this session.
  if (previous && previous.toLowerCase() !== trimmed.toLowerCase()) {
    await clearMpinOnly();
    await clearMpinSetupDeferred();
  }

  notify();
}

export async function setMpin(mpin: string, loginId?: string): Promise<void> {
  const owner = (loginId ?? lastLoginId)?.trim();
  if (!owner) {
    throw new Error('Cannot save MPIN without a login email.');
  }
  const salt = await generateMpinSalt();
  const hash = await hashMpin(mpin, salt);
  const payload: StoredMpin = { salt, hash, loginId: owner };
  await secureStorage.setItem(MPIN_KEY, JSON.stringify(payload));
  await secureStorage.setItem(LOGIN_ID_KEY, owner);
  await secureStorage.deleteItem(DEFERRED_KEY);
  await secureStorage.deleteItem(ATTEMPTS_KEY);
  configured = true;
  setupDeferred = false;
  lastLoginId = owner;
  unlockedThisSession = true;
  notify();
}

async function verifyStoredMpin(mpin: string): Promise<boolean> {
  const stored = await readStoredMpin();
  if (!stored) return false;
  return verifyMpin(mpin, stored.salt, stored.hash);
}

async function readFailedAttempts(): Promise<number> {
  const n = Number.parseInt((await secureStorage.getItem(ATTEMPTS_KEY)) ?? '0', 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

type MpinAttempt =
  | { status: 'ok' }
  | { status: 'wrong'; remaining: number }
  /** Too many wrong tries: the MPIN was cleared. The caller signs the coach out. */
  | { status: 'locked' };

/**
 * Checks an MPIN and counts wrong tries on the device, so closing and reopening the app does not
 * reset the limit. A correct MPIN resets the count. After MAX_MPIN_ATTEMPTS wrong tries the MPIN is
 * cleared and the coach has to sign in with the password.
 */
export async function attemptMpin(mpin: string): Promise<MpinAttempt> {
  if (await verifyStoredMpin(mpin)) {
    await secureStorage.deleteItem(ATTEMPTS_KEY);
    return { status: 'ok' };
  }
  const failed = (await readFailedAttempts()) + 1;
  if (failed >= MAX_MPIN_ATTEMPTS) {
    await clearMpin();
    await clearMpinSetupDeferred();
    return { status: 'locked' };
  }
  await secureStorage.setItem(ATTEMPTS_KEY, String(failed));
  return { status: 'wrong', remaining: MAX_MPIN_ATTEMPTS - failed };
}

export async function deferMpinSetup(): Promise<void> {
  await secureStorage.setItem(DEFERRED_KEY, '1');
  setupDeferred = true;
  unlockedThisSession = true;
  notify();
}

export async function clearMpinSetupDeferred(): Promise<void> {
  await secureStorage.deleteItem(DEFERRED_KEY);
  setupDeferred = false;
  notify();
}

async function clearMpinOnly(): Promise<void> {
  await secureStorage.deleteItem(MPIN_KEY);
  await secureStorage.deleteItem(ATTEMPTS_KEY);
  configured = false;
}

/** Clears MPIN verifier only (keeps last login id for password prefill). */
export async function clearMpin(): Promise<void> {
  await clearMpinOnly();
  unlockedThisSession = false;
  notify();
}
