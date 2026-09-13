import React from 'react';
import { Dimensions, StyleSheet, Text } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Colors, FontFamily, IconSize, Spacing, TouchTarget } from '../constants/theme';
import type {
  CheckupsStackParamList,
  ClientsStackParamList,
  DashboardStackParamList,
  MainTabParamList,
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
const ClientsStack = createNativeStackNavigator<ClientsStackParamList>();
const CheckupsStack = createNativeStackNavigator<CheckupsStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

const TAB_ICONS: Record<keyof MainTabParamList, { active: IoniconName; inactive: IoniconName }> = {
  Dashboard: { active: 'grid', inactive: 'grid-outline' },
  Clients: { active: 'people', inactive: 'people-outline' },
  Checkups: { active: 'clipboard', inactive: 'clipboard-outline' },
  Profile: { active: 'person-circle', inactive: 'person-circle-outline' },
};

const TAB_COUNT = Object.keys(TAB_ICONS).length;
const TAB_BAR_BASE_HEIGHT = 64;

function DashboardStackNavigator() {
  return (
    <DashboardStack.Navigator screenOptions={{ headerShown: false }}>
      <DashboardStack.Screen name="DashboardHome" component={DashboardScreen} />
      <DashboardStack.Screen name="Leads" component={MyLeadsScreen} />
      <DashboardStack.Screen name="Notifications" component={NotificationsScreen} />
    </DashboardStack.Navigator>
  );
}

function ClientsStackNavigator() {
  return (
    <ClientsStack.Navigator screenOptions={{ headerShown: false }}>
      <ClientsStack.Screen name="ClientListHome" component={ClientListScreen} />
      <ClientsStack.Screen name="ClientDetail" component={ClientDetailScreen} />
      <ClientsStack.Screen name="AddClient" component={AddClientScreen} />
      <ClientsStack.Screen name="ClientBmi" component={ClientBmiScreen} />
      <ClientsStack.Screen name="ClientBmiReport" component={ClientBmiReportScreen} />
      <ClientsStack.Screen name="ClientDietPlan" component={ClientDietPlanScreen} />
    </ClientsStack.Navigator>
  );
}

function CheckupsStackNavigator() {
  return (
    <CheckupsStack.Navigator screenOptions={{ headerShown: false }}>
      <CheckupsStack.Screen name="CheckupListHome" component={ReCheckupListScreen} />
      <CheckupsStack.Screen name="ClientBmi" component={ClientBmiScreen} />
    </CheckupsStack.Navigator>
  );
}

function ProfileStackNavigator() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="ProfileHome" component={CoachProfileScreen} />
      <ProfileStack.Screen name="EditProfile" component={EditProfileScreen} />
      <ProfileStack.Screen name="EditGallery" component={EditGalleryScreen} />
      <ProfileStack.Screen name="EditPackages" component={EditPackagesScreen} />
      <ProfileStack.Screen name="EditEvents" component={EditEventsScreen} />
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
        tabBarAccessibilityLabel: route.name,
        tabBarActiveTintColor: Colors.primary,
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
        tabBarIcon: ({ focused, color }) => {
          const icons = TAB_ICONS[route.name];
          return (
            <Ionicons
              name={focused ? icons.active : icons.inactive}
              size={IconSize.xl}
              color={color}
            />
          );
        },
        tabBarLabel: ({ color }) => (
          <Text
            style={{ fontSize: 11, fontFamily: FontFamily.semibold, color, marginTop: 1 }}
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
      <Tab.Screen name="Dashboard" component={DashboardStackNavigator} />
      <Tab.Screen
        name="Clients"
        component={ClientsStackNavigator}
        listeners={({ navigation }) => ({
          tabPress: e => {
            // Nested stack restores ClientDetail after opening a profile; always land on list.
            e.preventDefault();
            navigation.navigate('Clients', { screen: 'ClientListHome' });
          },
        })}
      />
      <Tab.Screen name="Checkups" component={CheckupsStackNavigator} />
      <Tab.Screen name="Profile" component={ProfileStackNavigator} />
    </Tab.Navigator>
  );
}
