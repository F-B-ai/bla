import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, ActivityIndicator, TouchableOpacity } from 'react-native';
import { registerRootComponent } from 'expo';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './navigation/AppNavigator';
import { AuthProvider } from './hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';
import * as Font from 'expo-font';
import { colors } from './config/theme';
import { Guasto, componiGuasto, schermataGuasto } from './domain/guasti';
import { registraGuasto } from './services/guastiService';

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

// ============================================================
// QUANDO UNA SCHERMATA SI FERMA
// ------------------------------------------------------------
// Questo riparo c'era già, e aveva due buchi grossi:
//
//  1. NON REGISTRAVA NIENTE. Nessun `componentDidCatch`: l'errore
//     compariva sullo schermo e spariva con esso. Il 23 e il 24
//     settembre 2026 l'App non è partita due volte e tutte e due le
//     volte è tornata a funzionare senza che nessuno sapesse perché.
//     L'unica traccia al mondo era un messaggio del titolare.
//
//  2. NON SI POTEVA RIPROVARE. Una volta rotta, la schermata restava
//     rotta: l'unica via d'uscita era chiudere l'App. Con un allievo
//     seduto accanto — «ho dovuto fingere che era andata bene» — era
//     una figuraccia senza rimedio.
//
// E mostrava il messaggio tecnico grezzo, in rosso, come prima cosa.
// Adesso: una frase leggibile davanti a chiunque, il dettaglio sotto
// per chi deve aggiustare, un pulsante che rimette in piedi la
// schermata, e il guasto scritto nel registro. Vedi domain/guasti.ts.
// ============================================================
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { guasto: Guasto | null }
> {
  state: { guasto: Guasto | null } = { guasto: null };

  static getDerivedStateFromError(error: Error) {
    return { guasto: componiGuasto({ errore: error }) };
  }

  componentDidCatch(error: Error) {
    // Non si aspetta: la schermata si disegna subito, la scrittura
    // arriva quando arriva. E se non arriva, non rompe niente.
    registraGuasto({ errore: error }).catch(() => {});
  }

  render() {
    const g = this.state.guasto;
    if (!g) return this.props.children;
    const s = schermataGuasto(g);
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>{s.titolo}</Text>
        <Text style={styles.errorMessage}>{s.testo}</Text>
        <TouchableOpacity
          style={styles.errorButton}
          onPress={() => this.setState({ guasto: null })}
          accessibilityRole="button"
        >
          <Text style={styles.errorButtonText}>{s.azione}</Text>
        </TouchableOpacity>
        <Text style={styles.errorDetail}>{s.dettaglio}</Text>
      </View>
    );
  }
}

function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    // Qui si chiamava `window.__markAppLoaded()`, per dire a una rete di
    // sicurezza «sono partita». Quella funzione in produzione non è mai
    // esistita: viveva in web/index.html, che Expo non usa come sorgente
    // della pagina. La chiamata era protetta da un `if`, quindi non ha
    // mai dato errore — ha solo non fatto niente, per mesi.
    // Adesso la rete guarda se la schermata è piena davvero, invece di
    // aspettare che qualcuno le mandi un segnale. Vedi web/index.html.
    const load = Platform.OS === 'web' ? loadIcoFontsWeb : () => Font.loadAsync({ ...Ionicons.font });
    load()
      .then(() => setFontsLoaded(true))
      .catch(() => setFontsLoaded(true));
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={styles.errorContainer}>
        <ActivityIndicator size="large" color="#D40000" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <ErrorBoundary>
      <AuthProvider>
        <SafeAreaProvider>
          <StatusBar style="light" />
          <AppNavigator />
        </SafeAreaProvider>
      </AuthProvider>
    </ErrorBoundary>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 20,
  },
  errorTitle: {
    // Era rosso allarme. Una pagina che si ferma non è un'emergenza:
    // il rosso serve a chi guarda da fuori per capire che è grave,
    // e con un allievo accanto è proprio quello che non serve.
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
  },
  errorMessage: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 420,
    opacity: 0.85,
  },
  errorButton: {
    marginTop: 22,
    paddingVertical: 12,
    paddingHorizontal: 34,
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  errorButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  errorDetail: {
    // Il dettaglio tecnico c'è, ma non è la prima cosa che si legge.
    marginTop: 26,
    color: colors.text,
    fontSize: 11,
    textAlign: 'center',
    maxWidth: 420,
    opacity: 0.4,
  },
});

registerRootComponent(App);
export default App;
