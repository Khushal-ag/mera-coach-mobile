import Constants from 'expo-constants';

/**
 * Version of the installed build, read from app.json at build time.
 * Kept out of appConfig.ts so plain config and utility tests do not load the Expo runtime.
 */
export const APP_VERSION: string = Constants.expoConfig?.version ?? '';
