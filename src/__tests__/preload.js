import { createHash } from 'node:crypto';
import { mock } from 'bun:test';

const Platform = {
  OS: 'ios',
  Version: '0',
  select(specifics) {
    if (!specifics) return undefined;
    return specifics[Platform.OS] ?? specifics.native ?? specifics.default;
  },
};

const reactNative = {
  Platform,
  AppState: {
    currentState: 'active',
    addEventListener() {
      return { remove() {} };
    },
  },
  StyleSheet: {
    create: styles => styles,
    hairlineWidth: 1,
    flatten: style => style,
    absoluteFillObject: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  },
  Linking: {
    canOpenURL: async () => true,
    openURL: async () => {},
    addEventListener: () => ({ remove() {} }),
  },
  NativeModules: {
    RNCNetInfo: {
      configure() {},
      addListener() {},
      removeListeners() {},
      getCurrentState: async () => ({
        type: 'wifi',
        isConnected: true,
        isInternetReachable: true,
        details: {},
      }),
    },
  },
  NativeEventEmitter: class NativeEventEmitter {
    addListener() {
      return { remove() {} };
    }
    removeAllListeners() {}
  },
  TurboModuleRegistry: {
    get() {
      return null;
    },
  },
};

reactNative.default = reactNative;

mock.module('react-native', () => reactNative);

mock.module('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA256' },
  digestStringAsync: async (_algorithm, data) => createHash('sha256').update(data).digest('hex'),
  getRandomBytesAsync: async size => Uint8Array.from({ length: size }, (_, i) => i + 1),
}));

mock.module('expo-secure-store', () => ({
  getItemAsync: async () => null,
  setItemAsync: async () => {},
  deleteItemAsync: async () => {},
}));

if (typeof globalThis.jest === 'undefined') {
  globalThis.jest = {
    mock() {},
  };
}
