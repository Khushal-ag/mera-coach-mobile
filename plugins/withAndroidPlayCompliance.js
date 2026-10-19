const { AndroidConfig, withAndroidManifest, withAndroidStyles, withAppBuildGradle, withGradleProperties } =
  require('expo/config-plugins');

/**
 * Google Play release fixes for the generated android/ project (gitignored; EAS prebuild).
 *
 * Must stay first in app.json `plugins`. Expo runs earlier-registered mods last, so this
 * plugin runs after the built-in orientation and system-bar mods and can undo them.
 *
 * Keep rules: the Expo template proguard-rules.pro plus consumer rules shipped by
 * React Native, Hermes, Expo modules, Reanimated, and Worklets. Do not add -dontobfuscate
 * or a blanket -keep, or Play's obfuscation percentage stays low.
 *
 * Remaining Android 15 edge-to-edge calls this plugin cannot remove (React Native 0.86.3,
 * pinned by Expo SDK 57; still present on RN main):
 * - WindowUtil.enableEdgeToEdge sets statusBarColor / navigationBarColor
 * - StatusBarModule still reads and writes statusBarColor
 * - Theme.FullScreenDialog in React Native resources sets android:statusBarColor
 * react-native-screens 4.26 no longer calls those Window APIs (setters are no-ops).
 */

const DEPRECATED_STYLE_ITEMS = [
  'android:statusBarColor',
  'android:navigationBarColor',
  'android:windowLayoutInDisplayCutoutMode',
  'android:fitsSystemWindows',
];

const PROGUARD_ANDROID = 'getDefaultProguardFile("proguard-android.txt")';
const PROGUARD_OPTIMIZE = 'getDefaultProguardFile("proguard-android-optimize.txt")';

function stripScreenOrientation(nodes) {
  for (const node of nodes ?? []) {
    if (node.$ && Object.prototype.hasOwnProperty.call(node.$, 'android:screenOrientation')) {
      delete node.$['android:screenOrientation'];
    }
    if (node.$ && node.$['android:resizeableActivity'] === 'false') {
      node.$['android:resizeableActivity'] = 'true';
    }
  }
}

function withReleaseMinify(config) {
  config = withGradleProperties(config, (config) => {
    config.modResults = AndroidConfig.BuildProperties.updateAndroidBuildProperty(
      config.modResults,
      'android.enableMinifyInReleaseBuilds',
      'true',
    );
    config.modResults = AndroidConfig.BuildProperties.updateAndroidBuildProperty(
      config.modResults,
      'android.enableShrinkResourcesInReleaseBuilds',
      'true',
    );
    // The Expo template caps metaspace at 512m. R8 on this New Architecture app
    // exhausts that and the release build dies with OutOfMemoryError: Metaspace.
    config.modResults = AndroidConfig.BuildProperties.updateAndroidBuildProperty(
      config.modResults,
      'org.gradle.jvmargs',
      '-Xmx4096m -XX:MaxMetaspaceSize=1024m',
    );
    return config;
  });

  return withAppBuildGradle(config, (config) => {
    const contents = config.modResults.contents;
    if (contents.includes('-dontobfuscate') && !contents.includes('# -dontobfuscate')) {
      throw new Error('android/app/build.gradle disables R8 obfuscation with -dontobfuscate');
    }
    if (!contents.includes(PROGUARD_OPTIMIZE)) {
      if (!contents.includes(PROGUARD_ANDROID)) {
        throw new Error(
          'android/app/build.gradle is missing getDefaultProguardFile("proguard-android.txt")',
        );
      }
      config.modResults.contents = contents.replace(PROGUARD_ANDROID, PROGUARD_OPTIMIZE);
    }
    return config;
  });
}

function withLargeScreens(config) {
  return withAndroidManifest(config, (config) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);
    if (application.$['android:resizeableActivity'] !== 'true') {
      application.$['android:resizeableActivity'] = 'true';
    }
    stripScreenOrientation(application.activity);
    stripScreenOrientation(application['activity-alias']);
    return config;
  });
}

function withEdgeToEdgeStyles(config) {
  return withAndroidStyles(config, (config) => {
    const styles = config.modResults.resources?.style ?? [];
    for (const style of styles) {
      if (!Array.isArray(style.item)) {
        continue;
      }
      style.item = style.item.filter((item) => !DEPRECATED_STYLE_ITEMS.includes(item.$?.name));
    }
    return config;
  });
}

function withAndroidPlayCompliance(config) {
  config = withReleaseMinify(config);
  config = withLargeScreens(config);
  config = withEdgeToEdgeStyles(config);
  return config;
}

module.exports = withAndroidPlayCompliance;
