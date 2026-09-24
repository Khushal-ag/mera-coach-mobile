import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

import type { ClientSummary, Coach } from './models';

/** Optional back target for screens opened via cross-tab navigation (e.g. Dashboard → Add Client). */
export type NavigationReturnTo = {
  name: keyof MainTabParamList;
  params?: MainTabParamList[keyof MainTabParamList];
};

type WithReturnTo<T> = T & { returnTo?: NavigationReturnTo };

export type DashboardStackParamList = {
  DashboardHome: undefined;
  Leads: undefined;
  Notifications: undefined;
  ClientListHome: undefined;
  ClientDetail: WithReturnTo<{ client?: ClientSummary }> | undefined;
  AddClient: { returnTo?: NavigationReturnTo } | undefined;
  ClientBmi: WithReturnTo<{ client?: ClientSummary }> | undefined;
  ClientBmiReport: WithReturnTo<{ client?: ClientSummary }> | undefined;
  ClientDietPlan: WithReturnTo<{ client?: ClientSummary }> | undefined;
  CheckupListHome: undefined;
};

/** @deprecated Screens live under Dashboard — kept for gradual call-site migration. */
export type ClientsStackParamList = Pick<
  DashboardStackParamList,
  | 'ClientListHome'
  | 'ClientDetail'
  | 'AddClient'
  | 'ClientBmi'
  | 'ClientBmiReport'
  | 'ClientDietPlan'
>;

/** @deprecated Screens live under Dashboard — kept for gradual call-site migration. */
export type CheckupsStackParamList = Pick<DashboardStackParamList, 'CheckupListHome' | 'ClientBmi'>;

export type PackagesStackParamList = {
  PackagesHome: undefined;
};

export type EventsStackParamList = {
  EventsHome: undefined;
};

export type ProfileStackParamList = {
  ProfileHome: undefined;
  EditProfile: undefined;
  EditGallery: undefined;
  ChangePassword: undefined;
  ChangeMpin: undefined;
  Legal: undefined;
  Leads: undefined;
};

export type MainTabParamList = {
  Dashboard: NavigatorScreenParams<DashboardStackParamList> | undefined;
  Packages: NavigatorScreenParams<PackagesStackParamList> | undefined;
  Events: NavigatorScreenParams<EventsStackParamList> | undefined;
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
  ForgotPassword: undefined;
  MpinSetup: undefined;
  MpinUnlock: undefined;
};

export type RootScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;

type MainTabScreenProps<T extends keyof MainTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;

export type DashboardStackScreenProps<T extends keyof DashboardStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<DashboardStackParamList, T>,
    MainTabScreenProps<'Dashboard'>
  >;

/** Client screens now live on the Dashboard stack. */
export type ClientsStackScreenProps<T extends keyof ClientsStackParamList> =
  DashboardStackScreenProps<T>;

/** Checkup screens now live on the Dashboard stack. */
export type CheckupsStackScreenProps<T extends keyof CheckupsStackParamList> =
  DashboardStackScreenProps<T>;

export type PackagesStackScreenProps<T extends keyof PackagesStackParamList> = CompositeScreenProps<
  NativeStackScreenProps<PackagesStackParamList, T>,
  MainTabScreenProps<'Packages'>
>;

export type EventsStackScreenProps<T extends keyof EventsStackParamList> = CompositeScreenProps<
  NativeStackScreenProps<EventsStackParamList, T>,
  MainTabScreenProps<'Events'>
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
