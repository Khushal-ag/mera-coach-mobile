import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export interface SecureStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  deleteItem(key: string): Promise<void>;
}

/** expo-secure-store on native; localStorage fallback on web. */
export const secureStorage: SecureStorage =
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
