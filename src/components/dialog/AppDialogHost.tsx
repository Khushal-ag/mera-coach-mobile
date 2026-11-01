import React, { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Colors,
  FontFamily,
  IconSize,
  PressOpacity,
  Radius,
  Shadow,
  Spacing,
  Typography,
} from '../../constants/theme';
import type { IoniconName } from '../../types/icons';
import {
  getDialogQueue,
  shiftDialog,
  subscribeDialogs,
  type DialogButton,
  type DialogTone,
} from './dialogStore';

const TONES: Record<DialogTone, { icon: IoniconName; color: string; wash: string }> = {
  success: { icon: 'checkmark', color: Colors.secondary, wash: Colors.secondaryLight },
  error: { icon: 'close', color: Colors.destructive, wash: Colors.destructiveSoft },
  warning: { icon: 'alert', color: Colors.destructiveOrange, wash: Colors.accentLight },
  danger: { icon: 'alert', color: Colors.destructive, wash: Colors.destructiveSoft },
  info: { icon: 'information', color: Colors.secondary, wash: Colors.secondaryLight },
};

const ENTER_MS = 200;
const EXIT_MS = 140;
// iOS reports the dismissal through Modal.onDismiss; this only covers it not firing.
const IOS_FLUSH_FALLBACK_MS = 400;

/**
 * Draws every `appAlert()` request, one at a time. Mount once at the app root.
 * A button's `onPress` runs after the dialog has fully closed, so it can safely open a
 * native picker, navigate or raise the next dialog without colliding with this Modal.
 */
export default function AppDialogHost() {
  const queue = useSyncExternalStore(subscribeDialogs, getDialogQueue, getDialogQueue);
  const current = queue[0];
  const { height } = useWindowDimensions();
  const progress = useMemo(() => new Animated.Value(0), []);
  const scale = useMemo(
    () => progress.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }),
    [progress],
  );
  const pending = useRef<(() => void) | null>(null);
  const closing = useRef(false);

  const currentId = current?.id;
  const announce = current ? [current.title, current.message].filter(Boolean).join('. ') : '';
  useEffect(() => {
    if (currentId === undefined) return;
    closing.current = false;
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: ENTER_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    void AccessibilityInfo.announceForAccessibility(announce);
    // Re-run only when a different dialog takes the stage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentId]);

  const flush = () => {
    const action = pending.current;
    pending.current = null;
    action?.();
  };

  const close = (action?: () => void) => {
    if (!current || closing.current) return;
    closing.current = true;
    pending.current = action ?? null;
    Animated.timing(progress, {
      toValue: 0,
      duration: EXIT_MS,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      const another = getDialogQueue().length > 1;
      shiftDialog();
      if (another) {
        setTimeout(flush, 0);
        return;
      }
      setTimeout(flush, Platform.OS === 'ios' ? IOS_FLUSH_FALLBACK_MS : 0);
    });
  };

  const dismiss = () => {
    if (current?.cancelable) close(current.onDismiss);
  };

  const buttons = current?.buttons ?? [];
  const sideBySide = buttons.length === 2 && buttons.every(b => b.text.length <= 11);
  const cancels = buttons.filter(b => b.style === 'cancel');
  const others = buttons.filter(b => b.style !== 'cancel');
  const ordered = sideBySide ? [...cancels, ...others] : [...others, ...cancels];
  const tone = TONES[current?.tone ?? 'info'];
  const mainButton = others[0];

  return (
    <Modal
      visible={current !== undefined}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={dismiss}
      onDismiss={flush}
    >
      <Animated.View style={[styles.backdrop, { opacity: progress }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={dismiss}
          accessible={false}
          importantForAccessibility="no"
        />
      </Animated.View>
      <View style={styles.center} pointerEvents="box-none">
        {current ? (
          <Animated.View
            style={[
              styles.card,
              {
                opacity: progress,
                transform: [{ scale }],
              },
            ]}
            accessibilityViewIsModal
          >
            <View style={[styles.badgeWash, { backgroundColor: tone.wash }]}>
              <View style={[styles.badge, { backgroundColor: tone.color }]}>
                <Ionicons
                  name={current.icon ?? tone.icon}
                  size={IconSize.xxl}
                  color={Colors.white}
                />
              </View>
            </View>
            <Text style={styles.title} accessibilityRole="header">
              {current.title}
            </Text>
            {current.message ? (
              <ScrollView
                style={{ maxHeight: height * 0.35 }}
                contentContainerStyle={styles.messageContent}
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
                <Text style={styles.message}>{current.message}</Text>
              </ScrollView>
            ) : null}
            <View style={sideBySide ? styles.rowButtons : styles.columnButtons}>
              {ordered.map((button, index) => (
                <DialogAction
                  key={`${button.text}-${index}`}
                  button={button}
                  accent={tone.color}
                  solid={button === mainButton}
                  sideBySide={sideBySide}
                  onPress={() => close(button.onPress)}
                />
              ))}
            </View>
          </Animated.View>
        ) : null}
      </View>
    </Modal>
  );
}

function DialogAction({
  button,
  accent,
  solid,
  sideBySide,
  onPress,
}: {
  button: DialogButton;
  accent: string;
  solid: boolean;
  sideBySide: boolean;
  onPress: () => void;
}) {
  const isCancel = button.style === 'cancel';
  const destructive = button.style === 'destructive';
  const fill = destructive
    ? Colors.destructive
    : accent === Colors.destructive
      ? Colors.primary
      : accent;

  let chrome: ViewStyle = styles.outline;
  let labelColor: string = fill;
  if (solid || destructive) {
    chrome = { ...styles.solid, backgroundColor: fill };
    labelColor = Colors.white;
  } else if (isCancel) {
    chrome = sideBySide ? styles.neutralOutline : styles.ghost;
    labelColor = Colors.textLight;
  } else {
    chrome = { ...styles.outline, borderColor: fill };
  }

  return (
    <TouchableOpacity
      style={[styles.button, sideBySide && styles.buttonFlex, chrome]}
      onPress={onPress}
      activeOpacity={PressOpacity.default}
      accessibilityRole="button"
      accessibilityLabel={button.text}
    >
      {button.icon ? <Ionicons name={button.icon} size={IconSize.md} color={labelColor} /> : null}
      <Text style={[styles.buttonLabel, { color: labelColor }]} numberOfLines={1}>
        {button.text}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: Colors.scrim },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    alignItems: 'center',
    ...Shadow.lg,
  },
  badgeWash: {
    width: 76,
    height: 76,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  badge: {
    width: 52,
    height: 52,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...Typography.headline, textAlign: 'center' },
  messageContent: { paddingTop: Spacing.xs },
  message: { ...Typography.body, color: Colors.textLight, textAlign: 'center' },
  rowButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
    width: '100%',
    marginTop: Spacing.lg,
  },
  columnButtons: { gap: Spacing.xs, width: '100%', marginTop: Spacing.lg },
  button: {
    minHeight: 48,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  buttonFlex: { flex: 1 },
  solid: {},
  outline: { backgroundColor: Colors.white, borderWidth: 1.5 },
  neutralOutline: { backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.border },
  ghost: { backgroundColor: 'transparent', minHeight: 44 },
  buttonLabel: { fontFamily: FontFamily.bold, fontSize: 15 },
});
