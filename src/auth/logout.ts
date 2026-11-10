import { clearSession } from './session';
import { unregisterPush } from '../notifications/pushRegistration';

/**
 * Full local sign-out: stop push alerts for this phone while the token still works, then drop the JWT
 * (and re-lock MPIN via clearSession).
 * React Query cache is cleared inside clearSession so account switches stay clean.
 */
export async function logoutLocal(): Promise<void> {
  await unregisterPush();
  await clearSession();
}
