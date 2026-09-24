import React from 'react';
import { Dimensions, StyleSheet, Text } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Colors, FontFamily, IconSize, Spacing, TouchTarget } from '../constants/theme';
import type {
  DashboardStackParamList,
  EventsStackParamList,
  MainTabParamList,
  PackagesStackParamList,
  ProfileStackParamList,
} from '../types/navigation';
import type { IoniconName } from '../types/icons';

import DashboardScreen from '../screens/dashboard/DashboardScreen';
import ClientListScreen from '../screens/clients/ClientListScreen';
import ClientDetailScreen from '../screens/clients/detail/ClientDetailScreen';
import AddClientScreen from '../screens/addClient/AddClientScreen';
import MyLeadsScreen from '../screens/clients/MyLeadsScreen';
import ReCheckupListScreen from '../screens/checkups/ReCheckupListScreen';
import CoachProfileScreen from '../screens/profile/CoachProfileScreen';
import NotificationsScreen from '../screens/dashboard/NotificationsScreen';
import ClientBmiScreen from '../screens/clients/detail/ClientBmiScreen';
import ClientBmiReportScreen from '../screens/clients/detail/ClientBmiReportScreen';
import ClientDietPlanScreen from '../screens/clients/detail/ClientDietPlanScreen';
import ChangePasswordScreen from '../screens/auth/ChangePasswordScreen';
import ChangeMpinScreen from '../screens/auth/ChangeMpinScreen';
import LegalScreen from '../screens/profile/LegalScreen';
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import EditGalleryScreen from '../screens/profile/EditGalleryScreen';
import EditPackagesScreen from '../screens/profile/EditPackagesScreen';
import EditEventsScreen from '../screens/profile/EditEventsScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();
const DashboardStack = createNativeStackNavigator<DashboardStackParamList>();
const PackagesStack = createNativeStackNavigator<PackagesStackParamList>();
const EventsStack = createNativeStackNavigator<EventsStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

/** Outline icons only — Figma tab chrome. */
const TAB_ICONS: Record<keyof MainTabParamList, IoniconName> = {
  Dashboard: 'grid-outline',
  Packages: 'cube-outline',
  Events: 'calendar-outline',
  Profile: 'person-outline',
};

const TAB_LABELS: Record<keyof MainTabParamList, string> = {
  Dashboard: 'Dashboard',
  Packages: 'Packages',
  Events: 'Events',
  Profile: 'Profile',
};

const TAB_COUNT = Object.keys(TAB_ICONS).length;
const TAB_BAR_BASE_HEIGHT = 64;

function DashboardStackNavigator() {
  return (
    <DashboardStack.Navigator screenOptions={{ headerShown: false }}>
      <DashboardStack.Screen name="DashboardHome" component={DashboardScreen} />
      <DashboardStack.Screen name="Leads" component={MyLeadsScreen} />
      <DashboardStack.Screen name="Notifications" component={NotificationsScreen} />
      <DashboardStack.Screen name="ClientListHome" component={ClientListScreen} />
      <DashboardStack.Screen name="ClientDetail" component={ClientDetailScreen} />
      <DashboardStack.Screen name="AddClient" component={AddClientScreen} />
      <DashboardStack.Screen name="ClientBmi" component={ClientBmiScreen} />
      <DashboardStack.Screen name="ClientBmiReport" component={ClientBmiReportScreen} />
      <DashboardStack.Screen name="ClientDietPlan" component={ClientDietPlanScreen} />
      <DashboardStack.Screen name="CheckupListHome" component={ReCheckupListScreen} />
    </DashboardStack.Navigator>
  );
}

function PackagesStackNavigator() {
  return (
    <PackagesStack.Navigator screenOptions={{ headerShown: false }}>
      <PackagesStack.Screen name="PackagesHome" component={EditPackagesScreen} />
    </PackagesStack.Navigator>
  );
}

function EventsStackNavigator() {
  return (
    <EventsStack.Navigator screenOptions={{ headerShown: false }}>
      <EventsStack.Screen name="EventsHome" component={EditEventsScreen} />
    </EventsStack.Navigator>
  );
}

function ProfileStackNavigator() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="ProfileHome" component={CoachProfileScreen} />
      <ProfileStack.Screen name="EditProfile" component={EditProfileScreen} />
      <ProfileStack.Screen name="EditGallery" component={EditGalleryScreen} />
      <ProfileStack.Screen name="ChangePassword" component={ChangePasswordScreen} />
      <ProfileStack.Screen name="ChangeMpin" component={ChangeMpinScreen} />
      <ProfileStack.Screen name="Legal" component={LegalScreen} />
      <ProfileStack.Screen name="Leads" component={MyLeadsScreen} />
    </ProfileStack.Navigator>
  );
}

export default function MainTabNavigator() {
  const tabWidth = Dimensions.get('window').width / TAB_COUNT;
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 6);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarAccessibilityLabel: TAB_LABELS[route.name],
        tabBarActiveTintColor: Colors.secondary,
        tabBarInactiveTintColor: Colors.textLight,
        tabBarStyle: {
          backgroundColor: Colors.white,
          borderTopColor: Colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          paddingBottom: bottomPad,
          paddingTop: Spacing.xs,
          height: TAB_BAR_BASE_HEIGHT + insets.bottom,
        },
        tabBarItemStyle: { width: tabWidth, paddingHorizontal: 0, minHeight: TouchTarget.min },
        tabBarIconStyle: { marginBottom: -2 },
        tabBarIcon: ({ color }) => (
          <Ionicons name={TAB_ICONS[route.name]} size={IconSize.xl} color={color} />
        ),
        tabBarLabel: ({ color }) => (
          <Text
            style={{ fontSize: 11, fontFamily: FontFamily.semibold, color, marginTop: 1 }}
            numberOfLines={1}
            allowFontScaling={false}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {TAB_LABELS[route.name]}
          </Text>
        ),
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardStackNavigator} />
      <Tab.Screen name="Packages" component={PackagesStackNavigator} />
      <Tab.Screen name="Events" component={EventsStackNavigator} />
      <Tab.Screen name="Profile" component={ProfileStackNavigator} />
    </Tab.Navigator>
  );
}
