import 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { registerRootComponent } from 'expo';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './navigation/AppNavigator';
import { AuthProvider } from './hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';
import * as Font from 'expo-font';

/**
 * On web, expo-font's Font.loadAsync has a bug: it passes the font URI as a
 * plain string to ExpoFontLoader.loadAsync which expects an object with .uri,
 * resulting in @font-face { src: url(undefined) }. The Ionicons component
 * checks Font.isLoaded('ionicons') which only looks at CSS rules inside the
 * <style id="expo-generated-fonts"> element.
 *
 * Fix: manually inject the correct @font-face rule into that element so
 * Font.isLoaded('ionicons') returns true, then wait for the browser to
 * confirm the font is ready.
 */
async function loadIcoFontsWeb(): Promise<void> {
  // 1. Wait for the HTML inline script to finish loading the font via FontFace API
  const globalReady = (window as any).__ioniconsReady;
  if (globalReady) {
    try { await globalReady; } catch {}
  }

  // 2. Inject the correct @font-face into the expo-generated-fonts element
  //    BEFORE calling Font.loadAsync, so the Ionicons component's
  //    Font.isLoaded('ionicons') check returns true.
  try {
    let style = document.getElementById('expo-generated-fonts') as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement('style');
      style.id = 'expo-generated-fonts';
      style.type = 'text/css';
      document.head.appendChild(style);
    }
    // Check if the rule already exists
    const sheet = style.sheet;
    let hasRule = false;
    if (sheet) {
      for (let i = 0; i < sheet.cssRules.length; i++) {
        const rule = sheet.cssRules[i];
        if (rule instanceof CSSFontFaceRule && rule.style.fontFamily === 'ionicons') {
          hasRule = true;
          break;
        }
      }
    }
    if (!hasRule) {
      style.appendChild(
        document.createTextNode(
          "@font-face{font-family:ionicons;src:url(/Ionicons.ttf);font-display:block}"
        )
      );
    }
  } catch {}

  // 3. Wait for the browser to confirm the font is actually ready for rendering
  if (typeof document !== 'undefined' && document.fonts) {
    try {
      await Promise.race([
        document.fonts.ready,
        new Promise<void>((resolve) => setTimeout(resolve, 5000)),
      ]);
    } catch {}
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
      <AuthProvider>
        <SafeAreaProvider>
          <StatusBar style="light" />
          <AppNavigator />
        </SafeAreaProvider>
      </AuthProvider>
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
