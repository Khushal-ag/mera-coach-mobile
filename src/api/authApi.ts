import { apiPost } from './client';
import { hashPassword } from '../utils/hash';
import type { Session } from '../types/models';

interface LoginParams {
  userName: string;
  password: string;
  userType?: string;
}

export async function login({
  userName,
  password,
  userType = 'COACH',
}: LoginParams): Promise<Session> {
  const hashedPassword = await hashPassword(password);
  return apiPost<Session>('/v{version}/Auth/login', {
    userName,
    password: hashedPassword,
    userType,
  });
}

/** Identifier only. The API never says whether the account exists and does not return the code. */
export async function requestPasswordReset(userName: string): Promise<void> {
  await apiPost('/v{version}/Auth/forgot-password', { userName: userName.trim() });
}

/** Plaintext new password — the API stores the same SHA-256 hex as change-password. Do not client-hash. */
export async function resetPassword(params: { token: string; newPassword: string }): Promise<void> {
  await apiPost('/v{version}/Auth/reset-password', {
    token: params.token.trim(),
    newPassword: params.newPassword,
  });
}
