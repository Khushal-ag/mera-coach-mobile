import { createElement } from 'react';
import type { TextInputProps, TextProps } from 'react-native';

// Large system font sizes (common on Android) overflow fixed-height controls. Text may grow a little for
// readability but is capped so layouts hold on every device. React 19 ignores `defaultProps` on function
// components, so the cap is applied by swapping the `Text` / `TextInput` exports of react-native.
export const MAX_FONT_SCALE = 1.25;

// eslint-disable-next-line @typescript-eslint/no-require-imports
const rn = require('react-native');
const NativeText = rn.Text;
const NativeTextInput = rn.TextInput;

function CappedText(props: TextProps) {
  return createElement(NativeText, { maxFontSizeMultiplier: MAX_FONT_SCALE, ...props });
}

function CappedTextInput(props: TextInputProps) {
  return createElement(NativeTextInput, { maxFontSizeMultiplier: MAX_FONT_SCALE, ...props });
}
Object.assign(CappedTextInput, NativeTextInput);

function patchExport(key: 'Text' | 'TextInput', value: typeof CappedText | typeof CappedTextInput) {
  try {
    Object.defineProperty(rn, key, { get: () => value, configurable: true });
  } catch {
    try {
      rn[key] = value;
    } catch {
      // Bun test preloads capped Text/TextInput on the react-native mock (read-only exports).
    }
  }
}

patchExport('Text', CappedText);
patchExport('TextInput', CappedTextInput);
