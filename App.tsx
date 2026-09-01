import React, { useEffect } from 'react';
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

void SplashScreen.preventAutoHideAsync();

// Path-based URLs for web (React Navigation). Empty prefixes keep native deep links off.
const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [],
  config: {
    screens: {
      Home: '',
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
            },
          },
          Clients: {
            screens: {
              ClientListHome: 'clients',
              ClientDetail: 'client-detail',
              AddClient: 'add-client',
              ClientBmi: 'client-bmi',
              ClientBmiReport: 'client-bmi-report',
              ClientDietPlan: 'client-diet-plan',
            },
          },
          Checkups: {
            screens: {
              CheckupListHome: 'checkups',
              ClientBmi: 'checkup-bmi',
            },
          },
          Profile: {
            screens: {
              ProfileHome: 'profile',
              EditProfile: 'edit-profile',
              ChangePassword: 'change-password',
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

  if (!fontsReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <NavigationContainer linking={linking}>
              <StatusBar style="light" />
              <AppNavigator />
            </NavigationContainer>
          </QueryClientProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
