import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import ReloadState from '../../../components/ReloadState';
import { Colors } from '../../../constants/theme';

interface ClientPhaseLoadShellProps {
  isLoading: boolean;
  /** True when load failed or profile/data is missing after load. */
  isError: boolean;
  errorMessage: string;
  onRetry: () => void;
  children: React.ReactNode;
  emptyTitle?: string;
  retryLabel?: string;
  retrying?: boolean;
}

export default function ClientPhaseLoadShell({
  isLoading,
  isError,
  errorMessage,
  onRetry,
  children,
  emptyTitle = 'Could not load client',
  retryLabel,
  retrying = false,
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
        <ReloadState
          title={emptyTitle}
          message={errorMessage}
          onRetry={onRetry}
          retryLabel={retryLabel}
          loading={retrying}
          showPullHint={false}
        />
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
});
