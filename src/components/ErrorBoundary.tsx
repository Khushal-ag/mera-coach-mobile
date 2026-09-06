import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors } from '../constants/theme';
import ReloadState from './ReloadState';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  private handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.wrap} accessibilityRole="alert">
          <ReloadState
            title="Something went wrong"
            message="Please try again. If this keeps happening, restart the app."
            onRetry={this.handleRetry}
            retryLabel="Try again"
            showPullHint={false}
          />
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 32,
  },
});
