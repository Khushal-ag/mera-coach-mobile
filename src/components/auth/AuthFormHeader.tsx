import React from 'react';
import { View, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BrandLogo from '../BrandLogo';
import { AuthLayout } from '../../constants/authLayout';
import { authLogoHeight } from '../../constants/images';
import {
  Colors,
  HitSlop,
  IconSize,
  PressOpacity,
  Shadow,
  TouchTarget,
} from '../../constants/theme';

type AuthFormHeaderProps = {
  onBack: () => void;
  backAccessibilityLabel: string;
};

export default function AuthFormHeader({ onBack, backAccessibilityLabel }: AuthFormHeaderProps) {
  const insets = useSafeAreaInsets();
  const { width: screenW } = useWindowDimensions();
  const logoSize = authLogoHeight(screenW);
  const rowHeight = Math.max(logoSize, TouchTarget.header);

  return (
    <View style={[styles.header, { paddingTop: insets.top + AuthLayout.headerTopExtra }]}>
      <View style={[styles.row, { minHeight: rowHeight }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={onBack}
          hitSlop={HitSlop.sm}
          activeOpacity={PressOpacity.default}
          accessibilityRole="button"
          accessibilityLabel={backAccessibilityLabel}
        >
          <Ionicons name="chevron-back-outline" size={IconSize.lg} color={Colors.secondary} />
        </TouchableOpacity>
        <BrandLogo size={logoSize} style={styles.logo} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    width: '100%',
    paddingHorizontal: AuthLayout.headerPadH,
    paddingBottom: 0,
  },
  row: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtn: {
    position: 'absolute',
    left: 0,
    top: '50%',
    marginTop: -(TouchTarget.header / 2),
    width: TouchTarget.header,
    height: TouchTarget.header,
    borderRadius: TouchTarget.header / 2,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    ...Shadow.sm,
  },
  logo: { marginBottom: 0 },
});
