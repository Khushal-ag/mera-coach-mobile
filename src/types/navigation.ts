import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

import type { ClientSummary, Coach } from './models';

export type DashboardStackParamList = {
  DashboardHome: undefined;
  Leads: undefined;
  Notifications: undefined;
};

export type ClientsStackParamList = {
  ClientListHome: undefined;
  ClientDetail: { client?: ClientSummary } | undefined;
  AddClient: undefined;
  ClientBmi: { client?: ClientSummary } | undefined;
  ClientBmiReport: { client?: ClientSummary } | undefined;
  ClientDietPlan: { client?: ClientSummary } | undefined;
};

export type CheckupsStackParamList = {
  CheckupListHome: undefined;
  ClientBmi: { client?: ClientSummary } | undefined;
};

export type ProfileStackParamList = {
  ProfileHome: undefined;
  EditProfile: undefined;
  ChangePassword: undefined;
  Legal: undefined;
  Leads: undefined;
};

export type MainTabParamList = {
  Dashboard: NavigatorScreenParams<DashboardStackParamList> | undefined;
  Clients: NavigatorScreenParams<ClientsStackParamList> | undefined;
  Checkups: NavigatorScreenParams<CheckupsStackParamList> | undefined;
  Profile: NavigatorScreenParams<ProfileStackParamList> | undefined;
};

/** Public + auth root stack (signed-in coach browsing stays reachable without signing out). */
export type RootStackParamList = {
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
  Home: undefined;
  CoachList: { categoryCode?: string } | undefined;
  CoachPublicProfile:
    | {
        coach?: Coach;
        coachCode?: string;
        coachCodes?: string[];
        coaches?: Coach[];
      }
    | undefined;
  Login: undefined;
  Register: undefined;
};

export type RootScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;

export type MainTabScreenProps<T extends keyof MainTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;

export type DashboardStackScreenProps<T extends keyof DashboardStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<DashboardStackParamList, T>,
    MainTabScreenProps<'Dashboard'>
  >;

export type ClientsStackScreenProps<T extends keyof ClientsStackParamList> = CompositeScreenProps<
  NativeStackScreenProps<ClientsStackParamList, T>,
  MainTabScreenProps<'Clients'>
>;

export type CheckupsStackScreenProps<T extends keyof CheckupsStackParamList> = CompositeScreenProps<
  NativeStackScreenProps<CheckupsStackParamList, T>,
  MainTabScreenProps<'Checkups'>
>;

export type ProfileStackScreenProps<T extends keyof ProfileStackParamList> = CompositeScreenProps<
  NativeStackScreenProps<ProfileStackParamList, T>,
  MainTabScreenProps<'Profile'>
>;

declare global {
  namespace ReactNavigation {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends RootStackParamList {}
  }
}
