import React, { useRef, useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Colors,
  HitSlop,
  IconSize,
  PressOpacity,
  Radius,
  Shadow,
  Spacing,
  formFieldStyles,
} from '../../constants/theme';
import AppButton from '../../components/AppButton';
import FormErrorBanner from '../../components/FormErrorBanner';
import FormFieldLabel from '../../components/FormFieldLabel';
import KeyboardSafeScroll, {
  STICKY_FOOTER_KEYBOARD_PADDING,
  useScrollLowerFieldsIntoView,
} from '../../components/KeyboardSafeScroll';
import WaveScreenHeader from '../../components/WaveScreenHeader';
import StickyFooter from '../../components/StickyFooter';
import { changePassword } from '../../api/coachApi';
import { toUserMessage } from '../../api/client';
import type { ProfileStackScreenProps } from '../../types/navigation';
import type { IoniconName } from '../../types/wizard';

interface PasswordFieldProps {
  label: string;
  icon: IoniconName;
  value: string;
  onChangeText: (v: string) => void;
  visible: boolean;
  onToggleVisible: () => void;
  placeholder: string;
  onFocus?: () => void;
}

function PasswordField({
  label,
  icon,
  value,
  onChangeText,
  visible,
  onToggleVisible,
  placeholder,
  onFocus,
}: PasswordFieldProps) {
  return (
    <View style={styles.field}>
      <FormFieldLabel required>{label}</FormFieldLabel>
      <View style={styles.inputWrap}>
        <Ionicons
          name={icon}
          size={IconSize.md}
          color={Colors.textLight}
          style={styles.inputIcon}
        />
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder={placeholder}
          placeholderTextColor={Colors.textLight}
          secureTextEntry={!visible}
          value={value}
          onChangeText={onChangeText}
          onFocus={onFocus}
          accessibilityLabel={label}
        />
        <TouchableOpacity
          onPress={onToggleVisible}
          style={styles.eyeBtn}
          hitSlop={HitSlop.sm}
          activeOpacity={PressOpacity.default}
          accessibilityRole="button"
          accessibilityLabel={visible ? `Hide ${label}` : `Show ${label}`}
        >
          <Ionicons
            name={visible ? 'eye-off-outline' : 'eye-outline'}
            size={IconSize.md}
            color={Colors.textLight}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function ChangePasswordScreen({
  navigation,
}: ProfileStackScreenProps<'ChangePassword'>) {
  const scrollRef = useRef<ScrollView>(null);
  const scrollLowerFieldsIntoView = useScrollLowerFieldsIntoView(scrollRef);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const handleSubmit = async () => {
    if (submittingRef.current) return;
    if (!currentPassword) return setError('Current password is required.');
    if (newPassword.length < 6) return setError('New password must be at least 6 characters.');
    if (newPassword !== confirmPassword) return setError('New passwords do not match.');

    setError('');
    submittingRef.current = true;
    setSubmitting(true);
    try {
      await changePassword({ currentPassword, newPassword });
      Alert.alert('Password Changed', 'Your password has been updated successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      setError(toUserMessage(err, 'Something went wrong. Please try again.'));
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <WaveScreenHeader title="Change Password" onBack={() => navigation.goBack()} />

      <KeyboardSafeScroll
        ref={scrollRef}
        style={styles.body}
        keyboardPadding={STICKY_FOOTER_KEYBOARD_PADDING}
      >
        <View style={styles.card}>
          <FormErrorBanner message={error || null} />

          <PasswordField
            label="Current Password"
            icon="lock-closed-outline"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            visible={showCurrent}
            onToggleVisible={() => setShowCurrent(v => !v)}
            placeholder="Enter your current password"
          />
          <PasswordField
            label="New Password"
            icon="key-outline"
            value={newPassword}
            onChangeText={setNewPassword}
            visible={showNew}
            onToggleVisible={() => setShowNew(v => !v)}
            placeholder="At least 6 characters"
            onFocus={scrollLowerFieldsIntoView}
          />
          <PasswordField
            label="Confirm New Password"
            icon="key-outline"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            visible={showConfirm}
            onToggleVisible={() => setShowConfirm(v => !v)}
            placeholder="Re-enter your new password"
            onFocus={scrollLowerFieldsIntoView}
          />
        </View>
      </KeyboardSafeScroll>

      <StickyFooter>
        <AppButton
          label="Update Password"
          onPress={() => void handleSubmit()}
          loading={submitting}
          icon="checkmark"
        />
      </StickyFooter>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  body: { flex: 1 },
  card: {
    backgroundColor: Colors.white,
    margin: Spacing.lg,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    ...Shadow.md,
  },
  field: { marginBottom: Spacing.md },
  inputWrap: formFieldStyles.wrap,
  inputIcon: formFieldStyles.inputIcon,
  input: formFieldStyles.input,
  eyeBtn: formFieldStyles.eyeBtn,
});
