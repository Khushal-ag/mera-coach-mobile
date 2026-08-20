import React from 'react';
import { NavigationContainer, type LinkingOptions } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AppNavigator from './src/navigation/AppNavigator';
import { queryClient } from './src/api/queryClient';
import type { RootStackParamList } from './src/types/navigation';

// Web-only deep links (e.g. http://localhost:8081/dashboard) so individual screens
// can be opened/screenshotted directly instead of only via in-app navigation.
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
          Leads: 'leads',
          Checkups: 'checkups',
          Profile: 'profile',
        },
      },
      ClientDetail: 'client-detail',
      AddClient: 'add-client',
      Notifications: 'notifications',
      ClientLifestyle: 'client-lifestyle',
      ClientDiet: 'client-diet',
      ClientBmi: 'client-bmi',
    },
  },
};

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <NavigationContainer linking={linking}>
          <StatusBar style="light" />
          <AppNavigator />
        </NavigationContainer>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
