import { createElement } from 'react';
import { createHash } from 'node:crypto';
import { jest as bunJest, mock } from 'bun:test';

globalThis.__DEV__ = false;

const Platform = {
  OS: 'ios',
  Version: '0',
  select(specifics) {
    if (!specifics) return undefined;
    return specifics[Platform.OS] ?? specifics.native ?? specifics.default;
  },
};

const MAX_FONT_SCALE = 1.25;

function mockComponent(name) {
  function MockComponent(props) {
    return createElement(name, props, props.children);
  }
  MockComponent.displayName = name;
  return MockComponent;
}

function capFontComponent(Native, name) {
  function Capped(props) {
    return createElement(Native, { maxFontSizeMultiplier: MAX_FONT_SCALE, ...props });
  }
  Capped.displayName = name;
  return Capped;
}

const PixelRatio = {
  get() {
    return 2;
  },
  getFontScale() {
    return 1;
  },
  getPixelSizeForLayoutSize(n) {
    return n;
  },
  roundToNearestPixel(n) {
    return Math.round(n);
  },
};

const reactNativeTarget = {
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
  PixelRatio,
  Text: capFontComponent(mockComponent('Text'), 'Text'),
  TextInput: capFontComponent(mockComponent('TextInput'), 'TextInput'),
  View: mockComponent('View'),
  Image: mockComponent('Image'),
  FlatList: mockComponent('FlatList'),
  TouchableOpacity: mockComponent('TouchableOpacity'),
  Pressable: mockComponent('Pressable'),
  ScrollView: mockComponent('ScrollView'),
  Modal: mockComponent('Modal'),
  AccessibilityInfo: {
    announceForAccessibility: () => {},
    addEventListener: () => ({ remove() {} }),
  },
  Animated: {
    Value: class {
      constructor(v) {
        this._value = v;
      }
      setValue(v) {
        this._value = v;
      }
      interpolate() {
        return 0;
      }
    },
    timing: () => ({ start: cb => cb?.({ finished: true }) }),
    spring: () => ({ start: cb => cb?.({ finished: true }) }),
    View: mockComponent('Animated.View'),
  },
  Easing: {
    out: fn => fn,
    in: fn => fn,
    cubic: t => t,
    ease: t => t,
  },
  useWindowDimensions: () => ({ width: 390, height: 844, scale: 2, fontScale: 1 }),
};

const reactNative = new Proxy(reactNativeTarget, {
  defineProperty(target, property, attributes) {
    Object.defineProperty(target, property, attributes);
    return true;
  },
});

reactNative.default = reactNative;

mock.module('react-native', () => reactNative);

mock.module('@expo/vector-icons', () => ({
  Ionicons: mockComponent('Ionicons'),
  AntDesign: mockComponent('AntDesign'),
  FontAwesome: mockComponent('FontAwesome'),
}));

const netInfoState = {
  type: 'wifi',
  isConnected: true,
  isInternetReachable: true,
};

mock.module('@react-native-community/netinfo', () => {
  const unsubscribe = () => {};
  const fetch = async () => netInfoState;
  const refresh = async () => netInfoState;
  const addEventListener = listener => {
    if (typeof listener === 'function') listener(netInfoState);
    return unsubscribe;
  };
  const useNetInfo = () => netInfoState;
  const configure = () => {};
  const netInfo = { configure, fetch, refresh, addEventListener, useNetInfo };
  return {
    __esModule: true,
    default: netInfo,
    configure,
    fetch,
    refresh,
    addEventListener,
    useNetInfo,
  };
});

mock.module('expo-location', () => ({
  requestForegroundPermissionsAsync: async () => ({ status: 'granted' }),
  getCurrentPositionAsync: async () => ({
    coords: { latitude: 0, longitude: 0 },
  }),
}));

mock.module('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///tmp/',
  cacheDirectory: 'file:///tmp/cache/',
  writeAsStringAsync: async () => {},
  readAsStringAsync: async () => '',
  deleteAsync: async () => {},
  getInfoAsync: async () => ({ exists: false }),
  downloadAsync: async () => ({ uri: 'file:///tmp/x.pdf', status: 200 }),
}));

mock.module('expo-sharing', () => ({
  isAvailableAsync: async () => true,
  shareAsync: async () => {},
}));

mock.module('expo-modules-core', () => ({
  requireOptionalNativeModule: () => null,
}));

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

if (typeof bunJest.advanceTimersByTimeAsync !== 'function') {
  bunJest.advanceTimersByTimeAsync = async ms => {
    bunJest.advanceTimersByTime(ms);
    await Promise.resolve();
    await Promise.resolve();
  };
}

globalThis.jest = bunJest;
