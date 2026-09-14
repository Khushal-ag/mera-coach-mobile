import { clearSession } from './session';

/**
 * Full local sign-out: drop JWT (and re-lock MPIN via clearSession).
 * React Query cache is cleared inside clearSession so account switches stay clean.
 */
export async function logoutLocal(): Promise<void> {
  await clearSession();
}
