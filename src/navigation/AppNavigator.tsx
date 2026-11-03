import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuthState } from '../auth/useAuthState';
import type { RootStackParamList } from '../types/navigation';

import SplashScreen from '../screens/home/SplashScreen';
import HomeScreen from '../screens/home/HomeScreen';
import PublicBmiScreen from '../screens/home/PublicBmiScreen';
import CoachListScreen from '../screens/publicCoach/CoachListScreen';
import CoachPublicProfileScreen from '../screens/publicCoach/CoachPublicProfileScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import MainTabNavigator from './MainTabNavigator';

const Stack = createNativeStackNavigator<RootStackParamList>();

const publicScreens = (
  <>
    <Stack.Screen name="Home" component={HomeScreen} />
    <Stack.Screen name="PublicBmi" component={PublicBmiScreen} />
    <Stack.Screen name="CoachList" component={CoachListScreen} />
    <Stack.Screen name="CoachPublicProfile" component={CoachPublicProfileScreen} />
  </>
);

export default function AppNavigator() {
  const authStatus = useAuthState();

  const [minSplashElapsed, setMinSplashElapsed] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setMinSplashElapsed(true), 1200);
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
          {publicScreens}
        </>
      ) : (
        <>
          {publicScreens}
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
