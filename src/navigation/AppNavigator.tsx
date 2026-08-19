import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '../constants/theme';
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
import ClientLifestyleScreen from '../screens/clientDetail/ClientLifestyleScreen';
import ClientDietScreen from '../screens/clientDetail/ClientDietScreen';
import ClientBmiScreen from '../screens/clientDetail/ClientBmiScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_ICONS: Record<keyof MainTabParamList, { active: IoniconName; inactive: IoniconName }> = {
  Dashboard: { active: 'grid', inactive: 'grid-outline' },
  Clients: { active: 'people', inactive: 'people-outline' },
  Leads: { active: 'funnel', inactive: 'funnel-outline' },
  Checkups: { active: 'clipboard', inactive: 'clipboard-outline' },
  Profile: { active: 'person-circle', inactive: 'person-circle-outline' },
};

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textLight,
        tabBarStyle: {
          backgroundColor: Colors.white,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          paddingBottom: 6,
          paddingTop: 6,
          height: 62,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ focused, color, size }) => {
          const icons = TAB_ICONS[route.name];
          return (
            <Ionicons name={focused ? icons.active : icons.inactive} size={size} color={color} />
          );
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Clients" component={ClientListScreen} />
      <Tab.Screen name="Leads" component={MyLeadsScreen} />
      <Tab.Screen name="Checkups" component={ReCheckupListScreen} />
      <Tab.Screen name="Profile" component={CoachProfileScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="CoachList" component={CoachListScreen} />
      <Stack.Screen name="CoachPublicProfile" component={CoachPublicProfileScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="Main" component={MainTabs} />
      <Stack.Screen name="ClientDetail" component={ClientDetailScreen} />
      <Stack.Screen name="AddClient" component={AddClientScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="ClientLifestyle" component={ClientLifestyleScreen} />
      <Stack.Screen name="ClientDiet" component={ClientDietScreen} />
      <Stack.Screen name="ClientBmi" component={ClientBmiScreen} />
    </Stack.Navigator>
  );
}
