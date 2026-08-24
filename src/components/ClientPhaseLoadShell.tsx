import React from 'react';
import { View, ActivityIndicator, StyleSheet, TouchableOpacity, Text } from 'react-native';
import EmptyState from './EmptyState';
import { Colors } from '../constants/theme';

interface ClientPhaseLoadShellProps {
  isLoading: boolean;
  /** True when load failed or profile/data is missing after load. */
  isError: boolean;
  errorMessage: string;
  onRetry: () => void;
  children: React.ReactNode;
  emptyTitle?: string;
}

/** Shared loading / error / retry chrome for client phase screens. */
export default function ClientPhaseLoadShell({
  isLoading,
  isError,
  errorMessage,
  onRetry,
  children,
  emptyTitle = 'Could not load client',
}: ClientPhaseLoadShellProps) {
  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} accessibilityLabel="Loading client" />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.center}>
        <EmptyState title={emptyTitle} message={errorMessage} />
        <TouchableOpacity
          style={styles.retryBtn}
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel="Retry loading client"
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    padding: 24,
  },
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: Colors.primary,
    borderRadius: 20,
  },
  retryText: { color: Colors.white, fontWeight: '700', fontSize: 14 },
});
