import type { NavigationProp, ParamListBase } from '@react-navigation/native';

import type { NavigationReturnTo } from '../types/navigation';

/** Cross-tab back target when entering Clients/Checkups stacks from Dashboard. */
export const RETURN_TO_DASHBOARD: NavigationReturnTo = {
  name: 'Dashboard',
  params: { screen: 'DashboardHome' },
};

export function navigateBack(
  navigation: NavigationProp<ParamListBase>,
  returnTo?: NavigationReturnTo,
): void {
  if (returnTo) {
    navigation.navigate(returnTo.name, returnTo.params);
    return;
  }
  if (navigation.canGoBack()) {
    navigation.goBack();
    return;
  }
  navigation.navigate('Dashboard', { screen: 'DashboardHome' });
}

export function navigateToDashboard(navigation: NavigationProp<ParamListBase>): void {
  navigation.navigate('Dashboard', { screen: 'DashboardHome' });
}
