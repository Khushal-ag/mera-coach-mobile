/**
 * Dev-only Reactotron setup. Imported from index.ts behind `__DEV__`.
 *
 * Connection:
 * - iOS Simulator / Metro on same machine: default localhost works
 * - Android Emulator: run `adb reverse tcp:9090 tcp:9090`, or set host to `10.0.2.2`
 * - Physical device: set host to your machine's LAN IP (e.g. `192.168.1.42`)
 */
import Reactotron from 'reactotron-react-native';

Reactotron.configure({
  name: 'Mera Coach',
  // host: '10.0.2.2', // Android emulator without adb reverse
  // host: '192.168.x.x', // physical device — your machine's LAN IP
})
  .useReactNative({
    networking: {
      // Expo SDK 56+ uses expo/fetch (bypasses XHR); 5.3+ instruments it.
      // Pass fetch explicitly in case the expo.builtin marker was re-wrapped.
      fetch: globalThis.fetch,
      ignoreUrls: /symbolicate|generate_204|logs/,
    },
    errors: { veto: () => false },
  })
  .connect();

export default Reactotron;
