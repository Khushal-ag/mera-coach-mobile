import React, { createElement, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TurboModuleRegistry,
  View,
} from 'react-native';
import type { WebView as WebViewComponent } from 'react-native-webview';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  Colors,
  HitSlop,
  IconSize,
  PressOpacity,
  Radius,
  Spacing,
  Typography,
} from '../../constants/theme';
import type { DashboardVideo } from '../../utils/youtubeFeed';
import { YOUTUBE_EMBED_ORIGIN, isAllowedPlayerUrl, youTubeEmbedHtml } from '../../utils/youtube';

/**
 * react-native-webview throws while it loads (and logs an error) when the installed binary was built without its native
 * module, for example a dev client or store build older than this feature. Look for the module first, load the package on
 * first use, and fall back to opening YouTube when it is missing.
 */
let webViewModule: typeof WebViewComponent | null | undefined;
function getWebView(): typeof WebViewComponent | null {
  if (webViewModule === undefined) {
    webViewModule = null;
    if (TurboModuleRegistry.get('RNCWebViewModule')) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        webViewModule = require('react-native-webview').WebView;
      } catch {
        webViewModule = null;
      }
    }
  }
  return webViewModule ?? null;
}

interface VideoPlayerModalProps {
  /** The video to play, or null to keep the player closed. */
  video: DashboardVideo | null;
  onClose: () => void;
}

/** Full-screen in-app YouTube player. */
export default function VideoPlayerModal({ video, onClose }: VideoPlayerModalProps) {
  return (
    <Modal
      visible={video !== null}
      animationType="slide"
      onRequestClose={onClose}
      supportedOrientations={['portrait', 'landscape']}
    >
      {/* A Modal is a separate native window, so it needs its own provider for the insets to be measured. */}
      <SafeAreaProvider>
        <SafeAreaView style={styles.screen} edges={['top', 'bottom', 'left', 'right']}>
          <View style={styles.bar}>
            <Text style={styles.title} numberOfLines={2}>
              {video?.title ?? ''}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={HitSlop.sm}
              activeOpacity={PressOpacity.default}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close video"
            >
              <Ionicons name="close" size={IconSize.xl} color={Colors.white} />
            </TouchableOpacity>
          </View>
          <View style={styles.stage}>{video ? <Player key={video.id} video={video} /> : null}</View>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

/** One video's WebView with its own load and failure state; remounted per video through its key. */
function Player({ video }: { video: DashboardVideo }) {
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const webView = getWebView();

  if (failed || !webView) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>This video could not be played here.</Text>
        <TouchableOpacity
          style={styles.fallbackBtn}
          onPress={() => Linking.openURL(`https://www.youtube.com/watch?v=${video.id}`)}
          activeOpacity={PressOpacity.default}
          accessibilityRole="button"
          accessibilityLabel="Open the video in YouTube"
        >
          <Ionicons name="logo-youtube" size={IconSize.lg} color={Colors.white} />
          <Text style={styles.fallbackBtnText}>Open in YouTube</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      {createElement(webView, {
        style: styles.web,
        originWhitelist: ['https://*', 'about:blank'],
        source: { html: youTubeEmbedHtml(video.id), baseUrl: YOUTUBE_EMBED_ORIGIN },
        allowsInlineMediaPlayback: true,
        allowsFullscreenVideo: true,
        mediaPlaybackRequiresUserAction: false,
        javaScriptEnabled: true,
        domStorageEnabled: true,
        setSupportMultipleWindows: false,
        onShouldStartLoadWithRequest: request => isAllowedPlayerUrl(request.url),
        onLoadEnd: () => setLoading(false),
        onError: () => setFailed(true),
        onHttpError: () => setFailed(true),
      })}
      {loading ? (
        <View style={styles.loading} pointerEvents="none">
          <ActivityIndicator color={Colors.white} />
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  title: { ...Typography.bodyStrong, color: Colors.white, flex: 1, minWidth: 0 },
  closeBtn: { padding: Spacing.xs },
  stage: { flex: 1, justifyContent: 'center' },
  web: { flex: 1, backgroundColor: '#000' },
  loading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallback: { alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.xl },
  fallbackText: { ...Typography.body, color: Colors.white, textAlign: 'center' },
  fallbackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.secondary,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  fallbackBtnText: { ...Typography.bodyStrong, color: Colors.white },
});
