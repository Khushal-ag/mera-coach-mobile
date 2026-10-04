// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');
const globals = require('globals');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    rules: {
      // Allow explicit `any`; do not surface as IDE/lint errors.
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    // TypeScript turns no-undef off. JS under __tests__ (jest-setup.js) still
    // needs the Jest globals so `jest` is defined without disabling the rule.
    files: ['**/__tests__/**/*.{js,jsx}'],
    languageOptions: {
      globals: globals.jest,
    },
  },
  // Must stay last: turns off any ESLint formatting rules that would otherwise
  // fight with Prettier over things like quotes, semicolons and line length.
  prettierConfig,
]);
