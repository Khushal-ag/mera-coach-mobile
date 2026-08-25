import React, { useEffect, useState } from 'react';
import { Dimensions, Text } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '../constants/theme';
import { useAuthState } from '../auth/useAuthState';
import type { MainTabParamList, RootStackParamList } from '../types/navigation';
import type { IoniconName } from '../types/wizard';

import SplashScreen from '../screens/SplashScreen';
import HomeScreen from '../screens/HomeScreen';
import CoachListScreen from '../screens/CoachListScreen';
import CoachPublicProfileScreen from '../screens/CoachPublicProfileScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import DashboardScreen from '../screens/DashboardScreen';
import ClientListScreen from '../screens/ClientListScreen';
import ClientDetailScreen from '../screens/ClientDetailScreen';
import AddClientScreen from '../screens/AddClientScreen';
import MyLeadsScreen from '../screens/MyLeadsScreen';
import ReCheckupListScreen from '../screens/ReCheckupListScreen';
import CoachProfileScreen from '../screens/CoachProfileScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ClientBmiScreen from '../screens/clientDetail/ClientBmiScreen';
import ClientBmiReportScreen from '../screens/clientDetail/ClientBmiReportScreen';
import ClientDietPlanScreen from '../screens/clientDetail/ClientDietPlanScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';
import LegalScreen from '../screens/LegalScreen';
import EditProfileScreen from '../screens/EditProfileScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_ICONS: Record<keyof MainTabParamList, { active: IoniconName; inactive: IoniconName }> = {
  Dashboard: { active: 'grid', inactive: 'grid-outline' },
  Clients: { active: 'people', inactive: 'people-outline' },
  Checkups: { active: 'clipboard', inactive: 'clipboard-outline' },
  Profile: { active: 'person-circle', inactive: 'person-circle-outline' },
};

const TAB_COUNT = Object.keys(TAB_ICONS).length;

const TAB_BAR_BASE_HEIGHT = 62;

function MainTabs() {
  // Pinning an explicit width bypasses internal minWidth so four tabs split evenly on narrow screens.
  const tabWidth = Dimensions.get('window').width / TAB_COUNT;
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 6);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarAccessibilityLabel: route.name,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textLight,
        tabBarStyle: {
          backgroundColor: Colors.white,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          paddingBottom: bottomPad,
          paddingTop: 6,
          height: TAB_BAR_BASE_HEIGHT + insets.bottom,
        },
        tabBarItemStyle: { width: tabWidth, paddingHorizontal: 0 },
        tabBarIconStyle: { marginBottom: -2 },
        tabBarIcon: ({ focused, color, size }) => {
          const icons = TAB_ICONS[route.name];
          return (
            <Ionicons
              name={focused ? icons.active : icons.inactive}
              size={size - 2}
              color={color}
            />
          );
        },
        tabBarLabel: ({ color }) => (
          <Text
            style={{ fontSize: 10, fontWeight: '600', color }}
            numberOfLines={1}
            allowFontScaling={false}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {route.name}
          </Text>
        ),
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Clients" component={ClientListScreen} />
      <Tab.Screen name="Checkups" component={ReCheckupListScreen} />
      <Tab.Screen name="Profile" component={CoachProfileScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const authStatus = useAuthState();

  // Keep splash up for at least 2.5s regardless of how fast the session check resolves.
  const [minSplashElapsed, setMinSplashElapsed] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setMinSplashElapsed(true), 2500);
    return () => clearTimeout(timer);
  }, []);

  if (authStatus === 'loading' || !minSplashElapsed) {
    return <SplashScreen />;
  }

  // key remounts the stack when auth flips. Home exists in both trees so without a remount
  // React Navigation would keep the pre-login Home route instead of starting at Main.
  return (
    <Stack.Navigator key={authStatus} screenOptions={{ headerShown: false }}>
      {authStatus === 'signedIn' ? (
        // Protected screens only register while signed in, so they're unreachable (not just
        // hidden) when signed out. Must be inlined here, not returned from a sub-component —
        // React Navigation only reads direct JSX children.
        //
        // Public Home / coach browse stay registered while signed in so the header Home
        // control can open the landing page without clearing the session.
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="CoachList" component={CoachListScreen} />
          <Stack.Screen name="CoachPublicProfile" component={CoachPublicProfileScreen} />
          <Stack.Screen name="ClientDetail" component={ClientDetailScreen} />
          <Stack.Screen name="AddClient" component={AddClientScreen} />
          <Stack.Screen name="Leads" component={MyLeadsScreen} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
          <Stack.Screen name="ClientBmi" component={ClientBmiScreen} />
          <Stack.Screen name="ClientBmiReport" component={ClientBmiReportScreen} />
          <Stack.Screen name="ClientDietPlan" component={ClientDietPlanScreen} />
          <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
          <Stack.Screen name="Legal" component={LegalScreen} />
          <Stack.Screen name="EditProfile" component={EditProfileScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="CoachList" component={CoachListScreen} />
          <Stack.Screen name="CoachPublicProfile" component={CoachPublicProfileScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
