// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');

module.exports = defineConfig([
  expoConfig,
  // Must stay last: turns off any ESLint formatting rules that would otherwise
  // fight with Prettier over things like quotes, semicolons and line length.
  prettierConfig,
  {
    ignores: ['dist/*'],
  },
]);
