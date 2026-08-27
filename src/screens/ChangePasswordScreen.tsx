import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadow } from '../constants/theme';
import FormFieldLabel from '../components/FormFieldLabel';
import KeyboardSafeScroll, { useScrollLowerFieldsIntoView } from '../components/KeyboardSafeScroll';
import ScreenHeader from '../components/ScreenHeader';
import { changePassword } from '../api/coachApi';
import { getErrorMessage } from '../api/client';
import type { ProfileStackScreenProps } from '../types/navigation';
import type { IoniconName } from '../types/wizard';

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
        <Ionicons name={icon} size={18} color={Colors.textLight} style={styles.inputIcon} />
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder={placeholder}
          placeholderTextColor={Colors.textLight}
          secureTextEntry={!visible}
          value={value}
          onChangeText={onChangeText}
          onFocus={onFocus}
        />
        <TouchableOpacity onPress={onToggleVisible} style={styles.eyeBtn}>
          <Ionicons
            name={visible ? 'eye-off-outline' : 'eye-outline'}
            size={18}
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

  const handleSubmit = async () => {
    if (!currentPassword) return setError('Current password is required.');
    if (newPassword.length < 6) return setError('New password must be at least 6 characters.');
    if (newPassword !== confirmPassword) return setError('New passwords do not match.');

    setError('');
    setSubmitting(true);
    try {
      await changePassword({ currentPassword, newPassword });
      Alert.alert('Password Changed', 'Your password has been updated successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      setError(getErrorMessage(err, 'Something went wrong. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardSafeScroll
      ref={scrollRef}
      style={styles.container}
      contentContainerStyle={styles.inner}
    >
      <ScreenHeader title="Change Password" onBack={() => navigation.goBack()} />

      <View style={styles.card}>
        {error ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={18} color={Colors.primary} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

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

        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <>
              <Text style={styles.submitText}>Update Password</Text>
              <Ionicons name="checkmark" size={18} color={Colors.white} />
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardSafeScroll>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inner: { flexGrow: 1 },
  card: {
    backgroundColor: Colors.white,
    margin: 20,
    borderRadius: Radius.lg,
    padding: 24,
    ...Shadow.md,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.sm,
    padding: 12,
    marginBottom: 16,
  },
  errorText: { color: Colors.primary, fontSize: 13, fontWeight: '600', flex: 1 },
  field: { marginBottom: 16 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    backgroundColor: Colors.background,
    paddingHorizontal: 12,
    height: 50,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 14, color: Colors.textDark },
  eyeBtn: { padding: 4 },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.pill,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    ...Shadow.md,
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
});
