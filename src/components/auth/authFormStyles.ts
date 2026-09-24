import { StyleSheet } from 'react-native';
import { AuthLayout } from '../../constants/authLayout';
import {
  Colors,
  FontFamily,
  Radius,
  Spacing,
  formFieldStyles,
  headingFont,
} from '../../constants/theme';

/** Shared typography + field chrome for Login, Register, Forgot Password. */
export const authFormStyles = StyleSheet.create({
  form: {
    width: AuthLayout.formWidthPct,
    maxWidth: AuthLayout.formMaxWidth,
    paddingTop: AuthLayout.formTopGap,
    backgroundColor: 'transparent',
  },
  title: {
    fontSize: AuthLayout.titleSize,
    fontFamily: headingFont.extraBold,
    color: Colors.textDark,
    marginBottom: AuthLayout.titleToSubtitleGap,
  },
  sub: {
    fontSize: 12,
    fontFamily: FontFamily.regular,
    color: Colors.textLight,
    marginBottom: AuthLayout.subtitleToFieldsGap,
    lineHeight: AuthLayout.subtitleLineHeight,
  },
  inputWrap: {
    ...formFieldStyles.wrap,
    backgroundColor: Colors.white,
    marginBottom: AuthLayout.fieldGap,
    height: AuthLayout.inputHeight,
    borderRadius: Radius.md,
    borderColor: Colors.border,
    borderWidth: 1,
  },
  inputWrapError: formFieldStyles.wrapError,
  inputIcon: formFieldStyles.inputIcon,
  input: formFieldStyles.input,
  eyeBtn: formFieldStyles.eyeBtn,
  ctaBtn: {
    height: AuthLayout.buttonHeight,
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: AuthLayout.orGap,
    gap: Spacing.sm,
  },
  orLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
  },
  orText: {
    fontSize: 12,
    fontFamily: FontFamily.semibold,
    color: Colors.textLight,
  },
});
