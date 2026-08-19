import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

import type { Session } from '../types/models';

const KEY = 'meracoach_session';

interface SessionStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  deleteItem(key: string): Promise<void>;
}

// expo-secure-store isn't available on web; fall back to localStorage there
// (fine for browser-preview testing — native builds always use SecureStore).
const storage: SessionStorage =
  Platform.OS === 'web'
    ? {
        getItem: async k => (typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null),
        setItem: async (k, v) => {
          if (typeof localStorage !== 'undefined') localStorage.setItem(k, v);
        },
        deleteItem: async k => {
          if (typeof localStorage !== 'undefined') localStorage.removeItem(k);
        },
      }
    : {
        getItem: SecureStore.getItemAsync,
        setItem: (key, value) => SecureStore.setItemAsync(key, value),
        deleteItem: SecureStore.deleteItemAsync,
      };

// In-memory mirror so apiFetch can read the token synchronously without an await on every call.
let currentToken: string | null = null;

export function getCurrentToken(): string | null {
  return currentToken;
}

export async function saveSession(session: Session): Promise<void> {
  currentToken = session.token;
  await storage.setItem(KEY, JSON.stringify(session));
}

export async function restoreSession(): Promise<Session | null> {
  const raw = await storage.getItem(KEY);
  if (!raw) return null;
  try {
    const session: Session = JSON.parse(raw);
    if (isExpired(session.token)) {
      await clearSession();
      return null;
    }
    currentToken = session.token;
    return session;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  currentToken = null;
  await storage.deleteItem(KEY);
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
