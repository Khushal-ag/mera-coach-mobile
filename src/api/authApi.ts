import { apiPost } from './client';
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
  return apiPost<Session>('/v{version}/Auth/login', {
    userName,
    password: hashedPassword,
    userType,
  });
}
