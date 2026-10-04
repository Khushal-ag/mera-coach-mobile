/**
 * Jest does not load bunfig.toml / src/__tests__/preload.js.
 * The real NetInfo module crashes under Jest when fetch resolves undefined
 * and InternetReachability.update reads state.isInternetReachable.
 */
jest.mock('@react-native-community/netinfo', () => {
  const state = {
    type: 'wifi',
    isConnected: true,
    isInternetReachable: true,
  };

  const unsubscribe = () => {};

  const fetch = jest.fn(() => Promise.resolve(state));
  const refresh = jest.fn(() => Promise.resolve(state));
  const addEventListener = jest.fn(listener => {
    if (typeof listener === 'function') listener(state);
    return unsubscribe;
  });
  const useNetInfo = jest.fn(() => state);
  const configure = jest.fn();

  const netInfo = {
    configure,
    fetch,
    refresh,
    addEventListener,
    useNetInfo,
  };

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
