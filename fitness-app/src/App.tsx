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
      Font.loadAsync({
        ...Ionicons.font,
      }).then(() => setFontsLoaded(true))
        .catch(() => {
          // Fallback: try loading from CDN for iOS Safari
          Font.loadAsync({
            'Ionicons': 'https://unpkg.com/@expo/vector-icons@14.0.0/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf',
          }).then(() => setFontsLoaded(true))
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
