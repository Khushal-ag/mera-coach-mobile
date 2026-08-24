import React from 'react';
import { NavigationContainer, type LinkingOptions } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import ErrorBoundary from './src/components/ErrorBoundary';
import { queryClient } from './src/api/queryClient';
import type { RootStackParamList } from './src/types/navigation';

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
          Dashboard: 'dashboard',
          Clients: 'clients',
          Checkups: 'checkups',
          Profile: 'profile',
        },
      },
      Leads: 'leads',
      ClientDetail: 'client-detail',
      AddClient: 'add-client',
      Notifications: 'notifications',
      ClientBmi: 'client-bmi',
      ChangePassword: 'change-password',
      Legal: 'legal',
    },
  },
};

export default function App() {
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
