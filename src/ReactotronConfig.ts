/**
 * Dev-only Reactotron. Imported from index.ts behind `__DEV__`.
 * Android emulator: `adb reverse tcp:9090 tcp:9090` (or host `10.0.2.2`).
 * Physical device: set host to your machine's LAN IP.
 */
import Reactotron from 'reactotron-react-native';

Reactotron.configure({
  name: 'Mera Coach',
  // host: '10.0.2.2', // Android emulator without adb reverse
  // host: '192.168.x.x', // physical device — your machine's LAN IP
})
  .useReactNative({
    networking: {
      // Expo SDK 56+ uses expo/fetch; pass fetch explicitly for Reactotron 5.3+.
      fetch: globalThis.fetch,
      ignoreUrls: /symbolicate|generate_204|logs/,
    },
    errors: { veto: () => false },
  })
  .connect();

export default Reactotron;
