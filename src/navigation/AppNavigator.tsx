import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuthState } from '../auth/useAuthState';
import type { RootStackParamList } from '../types/navigation';

import SplashScreen from '../screens/home/SplashScreen';
import HomeScreen from '../screens/home/HomeScreen';
import HomeExploreScreen from '../screens/home/HomeExploreScreen';
import CoachListScreen from '../screens/publicCoach/CoachListScreen';
import CoachPublicProfileScreen from '../screens/publicCoach/CoachPublicProfileScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import MainTabNavigator from './MainTabNavigator';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const authStatus = useAuthState();

  const [minSplashElapsed, setMinSplashElapsed] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setMinSplashElapsed(true), 2500);
    return () => clearTimeout(timer);
  }, []);

  if (authStatus === 'loading' || !minSplashElapsed) {
    return <SplashScreen />;
  }

  return (
    <Stack.Navigator key={authStatus} screenOptions={{ headerShown: false }}>
      {authStatus === 'signedIn' ? (
        <>
          <Stack.Screen name="Main" component={MainTabNavigator} />
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen
            name="HomeExplore"
            component={HomeExploreScreen}
            options={{ gestureEnabled: true, animation: 'slide_from_right' }}
          />
          <Stack.Screen name="CoachList" component={CoachListScreen} />
          <Stack.Screen name="CoachPublicProfile" component={CoachPublicProfileScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen
            name="HomeExplore"
            component={HomeExploreScreen}
            options={{ gestureEnabled: true, animation: 'slide_from_right' }}
          />
          <Stack.Screen name="CoachList" component={CoachListScreen} />
          <Stack.Screen name="CoachPublicProfile" component={CoachPublicProfileScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
