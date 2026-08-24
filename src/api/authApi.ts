import { apiFetch } from './client';
import { hashPassword } from '../utils/hash';
import type { Session } from '../types/models';

export interface LoginParams {
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
  return apiFetch<Session>('/v{version}/Auth/login', {
    method: 'POST',
    body: JSON.stringify({ userName, password: hashedPassword, userType }),
  });
}
