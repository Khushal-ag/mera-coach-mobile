import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

import type { ClientSummary, Coach } from './models';

export type MainTabParamList = {
  Dashboard: undefined;
  Clients: undefined;
  Checkups: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Home: undefined;
  CoachList: { categoryCode?: string } | undefined;
  CoachPublicProfile: { coach?: Coach; coachCode?: string } | undefined;
  Login: undefined;
  Register: undefined;
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
  ClientDetail: { client?: ClientSummary } | undefined;
  AddClient: undefined;
  Leads: undefined;
  Notifications: undefined;
  ClientBmi: { client?: ClientSummary } | undefined;
  ClientBmiReport: { client?: ClientSummary } | undefined;
  ChangePassword: undefined;
  Legal: undefined;
  EditProfile: undefined;
};

export type RootScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;

export type MainTabScreenProps<T extends keyof MainTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;

declare global {
  namespace ReactNavigation {
    // Empty on purpose: this is React Navigation's documented pattern for typing
    // useNavigation()/Link/etc. globally without passing <RootStackParamList> everywhere.
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends RootStackParamList {}
  }
}
