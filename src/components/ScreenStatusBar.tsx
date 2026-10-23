import React from 'react';
import { StatusBar, type StatusBarStyle } from 'expo-status-bar';
import { useIsFocused } from '@react-navigation/native';

/**
 * Sets the status bar style while this screen is the one the user is looking at.
 * Tabs and stacks keep earlier screens mounted underneath, so a plain <StatusBar> would let
 * whichever screen mounted last win. The app default is dark icons (pale screens); screens with a
 * dark top, such as the green wave header, render this with `light`.
 */
export default function ScreenStatusBar({ style }: { style: StatusBarStyle }) {
  const focused = useIsFocused();
  return focused ? <StatusBar style={style} /> : null;
}
