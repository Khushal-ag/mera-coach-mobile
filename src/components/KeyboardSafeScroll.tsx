import React, { forwardRef, useCallback, type RefObject } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const KEYBOARD_SCROLL_PADDING = 160;

type KeyboardSafeScrollProps = Omit<ScrollViewProps, 'contentContainerStyle' | 'style'> & {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** Bottom padding beyond the safe-area inset. Default {@link KEYBOARD_SCROLL_PADDING}. */
  keyboardPadding?: number;
  /**
   * KeyboardAvoidingView on iOS only; Android uses `softwareKeyboardLayoutMode: resize`.
   * Default true.
   */
  withAvoidingView?: boolean;
  avoidingViewStyle?: StyleProp<ViewStyle>;
};

const KeyboardSafeScroll = forwardRef<ScrollView, KeyboardSafeScrollProps>(
  function KeyboardSafeScroll(
    {
      children,
      style,
      contentContainerStyle,
      keyboardPadding = KEYBOARD_SCROLL_PADDING,
      withAvoidingView = true,
      avoidingViewStyle,
      keyboardShouldPersistTaps = 'handled',
      keyboardDismissMode = 'on-drag',
      automaticallyAdjustKeyboardInsets = true,
      showsVerticalScrollIndicator = false,
      ...rest
    },
    ref,
  ) {
    const insets = useSafeAreaInsets();
    const bottomPad = keyboardPadding + insets.bottom;
    const scroll = (
      <ScrollView
        ref={ref}
        style={style}
        contentContainerStyle={[contentContainerStyle, { paddingBottom: bottomPad }]}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        keyboardDismissMode={keyboardDismissMode}
        automaticallyAdjustKeyboardInsets={automaticallyAdjustKeyboardInsets}
        showsVerticalScrollIndicator={showsVerticalScrollIndicator}
        {...rest}
      >
        {children}
      </ScrollView>
    );

    if (!withAvoidingView) return scroll;

    return (
      <KeyboardAvoidingView
        style={[styles.flex, avoidingViewStyle]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {scroll}
      </KeyboardAvoidingView>
    );
  },
);

export default KeyboardSafeScroll;

/** Call from lower TextInput `onFocus` after keyboard resize. */
export function useScrollLowerFieldsIntoView(
  scrollRef: RefObject<ScrollView | null>,
  delayMs = 120,
) {
  return useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, delayMs);
  }, [scrollRef, delayMs]);
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
