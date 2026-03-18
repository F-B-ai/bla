import 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { registerRootComponent } from 'expo';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './navigation/AppNavigator';
import { Ionicons } from '@expo/vector-icons';
import * as Font from 'expo-font';
import { FontDisplay } from 'expo-font';

/**
 * On web, expo-font's Font.loadAsync does NOT wait for the font to actually
 * download on Safari, iOS, Firefox, and Edge (isFontLoadingListenerSupported
 * returns false). This causes icons to be invisible because the app renders
 * before the font is ready. We use the browser's native document.fonts API
 * to reliably wait for the font, with a timeout fallback.
 */
async function loadIcoFontsWeb(): Promise<void> {
  // Wait for the HTML inline script to finish loading the font via FontFace API
  // This is set by index.html before the JS bundle runs
  const globalReady = (window as any).__ioniconsReady;
  if (globalReady) {
    try {
      await globalReady;
    } catch {
      // Continue - we have fallbacks below
    }
  }

  // Trigger expo-font to inject its @font-face CSS rule into the
  // <style id="expo-generated-fonts"> element. The Ionicons component checks
  // Font.isLoaded('ionicons') which ONLY looks at rules in that element.
  // Use a direct URI string to avoid silent Asset.fromModule() failures.
  try {
    await Font.loadAsync({
      ionicons: { uri: '/Ionicons.ttf', display: FontDisplay.BLOCK } as any,
    });
  } catch {
    try {
      await Font.loadAsync({ ...Ionicons.font });
    } catch {
      // Both approaches failed - manually inject the CSS rule so isLoaded() returns true
    }
  }

  // Safety net: if expo-font still doesn't recognize the font, manually inject
  // the @font-face rule into the expo-generated-fonts style element
  if (!Font.isLoaded('ionicons')) {
    try {
      let style = document.getElementById('expo-generated-fonts') as HTMLStyleElement | null;
      if (!style) {
        style = document.createElement('style');
        style.id = 'expo-generated-fonts';
        style.type = 'text/css';
        document.head.appendChild(style);
      }
      style.appendChild(
        document.createTextNode(
          "@font-face{font-family:ionicons;src:url(/Ionicons.ttf);font-display:block}"
        )
      );
    } catch {
      // Proceed anyway
    }
  }

  // Final check: use the native document.fonts API to confirm the font is ready
  if (typeof document !== 'undefined' && document.fonts) {
    try {
      await Promise.race([
        document.fonts.ready,
        new Promise<void>((resolve) => setTimeout(resolve, 5000)),
      ]);
    } catch {
      // Proceed anyway
    }
  }
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  state = { hasError: false, error: '' };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Errore nell'app</Text>
          <Text style={styles.errorMessage}>{this.state.error}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    const load = Platform.OS === 'web' ? loadIcoFontsWeb : () => Font.loadAsync({ ...Ionicons.font });
    load()
      .then(() => setFontsLoaded(true))
      .catch(() => {
        setFontsLoaded(true);
      });
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={styles.errorContainer}>
        <ActivityIndicator size="large" color="#D40000" />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <AppNavigator />
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    padding: 20,
  },
  errorTitle: {
    color: '#e94560',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 10,
  },
  errorMessage: {
    color: '#ffffff',
    fontSize: 14,
    textAlign: 'center',
  },
});

registerRootComponent(App);
export default App;
