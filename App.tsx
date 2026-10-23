import React, { useEffect } from 'react';
import { Text, TextInput } from 'react-native';
import { useFonts } from 'expo-font';
import { NavigationContainer, type LinkingOptions } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import ErrorBoundary from './src/components/ErrorBoundary';
import { queryClient } from './src/api/queryClient';
import { fontMap } from './src/constants/fonts';
import { Colors } from './src/constants/theme';
import type { RootStackParamList } from './src/types/navigation';
import { APP_SCHEME, subscribePaidReturnDeepLinks } from './src/utils/appDeepLink';

void SplashScreen.preventAutoHideAsync();

// Large system font sizes (common on Android) overflow fixed-height controls.
// Let text grow a little for readability but cap it so layouts hold on every device.
type WithDefaults = { defaultProps?: { maxFontSizeMultiplier?: number } };
for (const Component of [Text, TextInput] as unknown as WithDefaults[]) {
  Component.defaultProps = { ...Component.defaultProps, maxFontSizeMultiplier: 1.25 };
}

// Native scheme from app.json (`expo.scheme`) + path map for web / deep links.
const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [`${APP_SCHEME}://`],
  config: {
    screens: {
      Home: '',
      PublicBmi: 'bmi',
      CoachList: 'coach-list',
      CoachPublicProfile: 'coach-profile',
      Login: 'login',
      Register: 'register',
      Main: {
        screens: {
          Dashboard: {
            screens: {
              DashboardHome: 'dashboard',
              Leads: 'leads',
              Notifications: 'notifications',
              ClientListHome: 'clients',
              ClientDetail: 'client-detail',
              AddClient: 'add-client',
              Premium: 'premium',
              ClientBmi: 'client-bmi',
              ClientBmiReport: 'client-bmi-report',
              ClientDietPlan: 'client-diet-plan',
              CheckupListHome: 'checkups',
            },
          },
          Packages: {
            screens: {
              PackagesHome: 'packages',
              EditPackages: 'edit-packages',
            },
          },
          Events: {
            screens: {
              EventsHome: 'events',
              AddEvent: 'add-event',
            },
          },
          Profile: {
            screens: {
              ProfileHome: 'profile',
              EditProfile: 'edit-profile',
              GalleryHome: 'gallery',
              EditGallery: 'edit-gallery',
              ChangePassword: 'change-password',
              ChangeMpin: 'change-mpin',
              Legal: 'legal',
              Leads: 'profile-leads',
            },
          },
        },
      },
    },
  },
};

export default function App() {
  const [fontsLoaded, fontError] = useFonts(fontMap);
  const fontsReady = fontsLoaded || Boolean(fontError);

  useEffect(() => {
    // Match splash / brand surface so Android root view never flashes white between screens.
    void SystemUI.setBackgroundColorAsync(Colors.secondary);
  }, []);

  useEffect(() => {
    if (fontsReady) {
      void SplashScreen.hideAsync();
    }
  }, [fontsReady]);

  useEffect(() => subscribePaidReturnDeepLinks(), []);

  if (!fontsReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <NavigationContainer linking={linking}>
              <StatusBar style="dark" />
              <AppNavigator />
            </NavigationContainer>
          </QueryClientProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
