import 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { registerRootComponent } from 'expo';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './navigation/AppNavigator';
import { Ionicons } from '@expo/vector-icons';
import * as Font from 'expo-font';

// Direct require so Metro/webpack resolves the .ttf asset at build time
const ioniconsFont = require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf');

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
      // Register Ionicons with expo-font so Font.isLoaded('ionicons') returns true.
      // Without this the <Ionicons> component renders an empty <Text/>.
      // Use require()'d asset so the bundler resolves the real URL.
      Font.loadAsync({ ionicons: ioniconsFont })
        .then(() => setFontsLoaded(true))
        .catch(() => {
          // Last resort: try with the local copy served from /Ionicons.ttf
          Font.loadAsync({ ionicons: { uri: '/Ionicons.ttf', display: Font.FontDisplay.BLOCK } })
            .then(() => setFontsLoaded(true))
            .catch(() => setFontsLoaded(true));
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
