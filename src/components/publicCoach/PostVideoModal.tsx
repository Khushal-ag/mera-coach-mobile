import React, { createElement, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  Colors,
  HitSlop,
  IconSize,
  PressOpacity,
  Spacing,
  Typography,
} from '../../constants/theme';
import { getWebView } from '../dashboard/VideoPlayerModal';

interface PostVideoModalProps {
  /** Absolute URL of the video, or null to keep the player closed. */
  uri: string | null;
  title: string;
  onClose: () => void;
  /** Called when the video cannot be played in the app, for example an older build without the WebView module. */
  onUnavailable: (uri: string) => void;
}

const htmlFor = (uri: string) =>
  `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">` +
  `<style>html,body{margin:0;height:100%;background:#000}video{width:100%;height:100%}</style></head>` +
  `<body><video src="${encodeURI(uri)}" controls autoplay playsinline></video></body></html>`;

/** Full-screen in-app player for a coach's uploaded video. */
export default function PostVideoModal({
  uri,
  title,
  onClose,
  onUnavailable,
}: PostVideoModalProps) {
  const [loading, setLoading] = useState(true);
  const webView = uri ? getWebView() : null;

  if (uri && !webView) {
    // Defer so the parent is not updated while this renders.
    setTimeout(() => {
      onClose();
      onUnavailable(uri);
    }, 0);
    return null;
  }

  return (
    <Modal
      visible={uri !== null}
      animationType="slide"
      onRequestClose={onClose}
      supportedOrientations={['portrait', 'landscape']}
    >
      {/* A Modal is a separate native window, so it needs its own provider for the insets to be measured. */}
      <SafeAreaProvider>
        <SafeAreaView style={styles.screen} edges={['top', 'bottom', 'left', 'right']}>
          <View style={styles.bar}>
            <Text style={styles.title} numberOfLines={2}>
              {title}
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
          <View style={styles.stage}>
            {uri && webView
              ? createElement(webView, {
                  key: uri,
                  style: styles.web,
                  originWhitelist: ['https://*', 'http://*', 'about:blank'],
                  source: { html: htmlFor(uri), baseUrl: new URL(uri).origin },
                  allowsInlineMediaPlayback: true,
                  allowsFullscreenVideo: true,
                  mediaPlaybackRequiresUserAction: false,
                  javaScriptEnabled: true,
                  setSupportMultipleWindows: false,
                  onShouldStartLoadWithRequest: request =>
                    request.url === 'about:blank' || request.url.startsWith(new URL(uri).origin),
                  onLoadEnd: () => setLoading(false),
                })
              : null}
            {loading && uri ? (
              <View style={styles.loading} pointerEvents="none">
                <ActivityIndicator color={Colors.white} />
              </View>
            ) : null}
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
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
  loading: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
});
