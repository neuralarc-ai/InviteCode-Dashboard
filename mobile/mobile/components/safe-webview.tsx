import { type ReactElement } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface SafeWebViewProps {
  source: { html: string };
  style?: object;
  scrollEnabled?: boolean;
  showsVerticalScrollIndicator?: boolean;
  showsHorizontalScrollIndicator?: boolean;
  scalesPageToFit?: boolean;
  startInLoadingState?: boolean;
  renderLoading?: () => ReactElement;
}

let WebView: typeof import('react-native-webview').WebView | null = null;

// Try to import WebView, but don't fail if it's not available
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const webviewModule = require('react-native-webview');
  WebView = webviewModule.WebView;
} catch (error) {
  console.warn('react-native-webview not available:', error);
  WebView = null;
}

export function SafeWebView(props: SafeWebViewProps): ReactElement {
  const theme = useColorScheme();
  const colors = Colors[theme];

  // If WebView is not available, show a fallback
  if (!WebView) {
    return (
      <View style={[styles.fallbackContainer, props.style]}>
        <ThemedText
          type="default"
          style={styles.fallbackText}
          lightColor={colors.textSecondary}
          darkColor={colors.textSecondary}>
          HTML preview is not available. Please rebuild the app with native modules enabled.
        </ThemedText>
        <View style={styles.htmlPreview}>
          <ThemedText
            type="default"
            style={styles.htmlText}
            lightColor={colors.textPrimary}
            darkColor={colors.textPrimary}>
            {props.source.html.replace(/<[^>]*>/g, '').substring(0, 500)}
            {props.source.html.length > 500 ? '...' : ''}
          </ThemedText>
        </View>
      </View>
    );
  }

  // WebView is available, use it normally
  return (
    <WebView
      source={props.source}
      style={props.style}
      scrollEnabled={props.scrollEnabled}
      showsVerticalScrollIndicator={props.showsVerticalScrollIndicator}
      showsHorizontalScrollIndicator={props.showsHorizontalScrollIndicator}
      scalesPageToFit={props.scalesPageToFit}
      startInLoadingState={props.startInLoadingState}
      renderLoading={props.renderLoading}
    />
  );
}

const styles = StyleSheet.create({
  fallbackContainer: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  fallbackText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
  htmlPreview: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  htmlText: {
    fontSize: 12,
    fontFamily: 'monospace',
    lineHeight: 18,
  },
});

