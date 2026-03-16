import 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { registerRootComponent } from 'expo';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './navigation/AppNavigator';
import { Ionicons } from '@expo/vector-icons';
import * as Font from 'expo-font';

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
  const [fontsLoaded, setFontsLoaded] = useState(Platform.OS !== 'web');

  useEffect(() => {
    if (Platform.OS === 'web') {
      // The icon component uses fontFamily 'ionicons' (lowercase).
      // We must ensure the @font-face matches that exact name.
      const cdnUrl = 'https://unpkg.com/@expo/vector-icons@14.0.4/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf';

      const injectFontCSS = (url: string) => {
        if (!document.getElementById('ionicons-font-style')) {
          const style = document.createElement('style');
          style.id = 'ionicons-font-style';
          style.textContent = `
            @font-face {
              font-family: 'ionicons';
              src: url('${url}') format('truetype');
              font-weight: normal;
              font-style: normal;
              font-display: block;
            }
          `;
          document.head.appendChild(style);
        }
      };

      // Try loading with expo-font first (Ionicons.font = { 'ionicons': asset })
      Font.loadAsync(Ionicons.font)
        .then(() => setFontsLoaded(true))
        .catch(() => {
          // Fallback: inject CSS @font-face + FontFace API with correct lowercase name
          injectFontCSS(cdnUrl);
          if (typeof FontFace !== 'undefined') {
            const font = new FontFace('ionicons', `url(${cdnUrl})`);
            font.load().then((loaded) => {
              document.fonts.add(loaded);
              setFontsLoaded(true);
            }).catch(() => {
              Font.loadAsync({ 'ionicons': cdnUrl })
                .then(() => setFontsLoaded(true))
                .catch(() => setFontsLoaded(true));
            });
          } else {
            Font.loadAsync({ 'ionicons': cdnUrl })
              .then(() => setFontsLoaded(true))
              .catch(() => setFontsLoaded(true));
          }
        });
    }
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
