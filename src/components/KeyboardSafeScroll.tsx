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
import { Spacing } from '../constants/theme';

/** Modest content gap when the keyboard is closed; insets come from tab bar / StickyFooter. */
export const KEYBOARD_SCROLL_PADDING = Spacing.lg;

/**
 * Use with {@link StickyFooter}: button lives outside the scroll, so only a small
 * gap above the footer is needed (keyboard handled via automaticallyAdjustKeyboardInsets).
 */
export const STICKY_FOOTER_KEYBOARD_PADDING = Spacing.sm;

type KeyboardSafeScrollProps = Omit<ScrollViewProps, 'contentContainerStyle' | 'style'> & {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** Bottom padding for content. Default {@link KEYBOARD_SCROLL_PADDING}. */
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
    const scroll = (
      <ScrollView
        ref={ref}
        style={style}
        contentContainerStyle={[contentContainerStyle, { paddingBottom: keyboardPadding }]}
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

/**
 * Call from lower TextInput `onFocus` after keyboard resize — scrolls near the end
 * so fields above a sticky footer stay visible.
 */
export function useScrollLowerFieldsIntoView(
  scrollRef: RefObject<ScrollView | null>,
  delayMs = 160,
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
