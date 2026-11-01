import { useEffect, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';

import { appAlert } from '../utils/appDialog';

/**
 * Asks before the screen is left (header back, swipe, Android back) while `dirty`.
 * Call the returned function instead of `goBack` once the changes are saved.
 */
export function useUnsavedChangesGuard(dirty: boolean) {
  const navigation = useNavigation();
  const saved = useRef(false);

  useEffect(
    () =>
      navigation.addListener('beforeRemove', e => {
        if (!dirty || saved.current) return;
        e.preventDefault();
        appAlert(
          'Leave without saving?',
          'Changes you have not saved will be lost.',
          [
            { text: 'Keep editing', style: 'cancel' },
            {
              text: 'Leave',
              style: 'destructive',
              onPress: () => navigation.dispatch(e.data.action),
            },
          ],
          { icon: 'exit-outline' },
        );
      }),
    [navigation, dirty],
  );

  return (leave: () => void) => () => {
    saved.current = true;
    leave();
  };
}
