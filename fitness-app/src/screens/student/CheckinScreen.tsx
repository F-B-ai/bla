import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, borderRadius } from '../../config/theme';
import { useAuth } from '../../hooks/useAuth';
import { registerCheckin } from '../../services/checkinService';

// Accetta qualsiasi QR di accesso ESSĒRE: il codice attuale
// ('ESSERE_ACCESS_2024'), il vecchio codice ('ESSERE_ACCESS') o il
// vecchio QR con URL ('https://...?checkin=ESSERE_ACCESS').
const isValidCheckinQR = (text: string): boolean =>
  text.trim().toUpperCase().includes('ESSERE_ACCESS');

type CheckinState = 'idle' | 'scanning' | 'success' | 'already' | 'error';

export const CheckinScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [state, setState] = useState<CheckinState>('idle');
  const [scannerReady, setScannerReady] = useState(false);
  const scannerRef = useRef<any>(null);
  const containerRef = useRef<string>('qr-reader-' + Math.random().toString(36).substring(7));

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch {}
      scannerRef.current = null;
    }
    setScannerReady(false);
  }, []);

  const handleScan = useCallback(async (decodedText: string) => {
    if (state === 'success' || state === 'already') return;

    await stopScanner();

    if (!isValidCheckinQR(decodedText)) {
      setState('error');
      return;
    }

    if (!user) {
      setState('error');
      return;
    }

    const displayName = user.name
      ? `${user.name}${(user as any).surname ? ' ' + (user as any).surname : ''}`
      : user.email || 'Utente';

    try {
      const result = await registerCheckin(user.id, displayName);
      if (result.success) {
        setState('success');
      } else if (result.alreadyCheckedIn) {
        setState('already');
      }
    } catch {
      setState('error');
    }
  }, [user, state, stopScanner]);

  const startScanner = useCallback(async () => {
    if (Platform.OS !== 'web') return;
    setState('scanning');

    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode(containerRef.current);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          handleScan(decodedText);
        },
        () => {}
      );
      setScannerReady(true);
    } catch {
      setState('error');
    }
  }, [handleScan]);

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  const handleRetry = () => {
    setState('idle');
  };

  return (
    <View style={styles.container}>
      <View style={{ ...styles.header, paddingTop: insets.top + spacing.md }}>
        <Text style={styles.headerTitle}>Check-in</Text>
      </View>

      <View style={styles.content}>
        {state === 'idle' && (
          <View style={styles.idleContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="qr-code" size={64} color={colors.accent} />
            </View>
            <Text style={styles.mainText}>Registra il tuo accesso</Text>
            <Text style={styles.subText}>
              Scansiona il QR code alla reception per registrare la tua presenza in palestra
            </Text>
            <TouchableOpacity
              style={styles.scanButton}
              onPress={startScanner}
              activeOpacity={0.7}
            >
              <Ionicons name="camera" size={24} color="#fff" />
              <Text style={styles.scanButtonText}>Scansiona QR</Text>
            </TouchableOpacity>
          </View>
        )}

        {state === 'scanning' && (
          <View style={styles.scanningContainer}>
            <Text style={styles.scanningTitle}>Inquadra il QR code</Text>
            <View style={styles.scannerWrapper}>
              <View
                nativeID={containerRef.current}
                style={styles.scannerBox}
              />
              {!scannerReady && (
                <View style={styles.scannerLoading}>
                  <ActivityIndicator size="large" color={colors.accent} />
                  <Text style={styles.loadingText}>Attivazione fotocamera...</Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => { stopScanner(); setState('idle'); }}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Annulla</Text>
            </TouchableOpacity>
          </View>
        )}

        {state === 'success' && (
          <View style={styles.resultContainer}>
            <View style={[styles.resultCircle, { backgroundColor: colors.success + '20' }]}>
              <Ionicons name="checkmark-circle" size={80} color={colors.success} />
            </View>
            <Text style={styles.resultTitle}>Check-in registrato!</Text>
            <Text style={styles.resultSubtitle}>
              Benvenuto {user?.name || ''}! Buon allenamento!
            </Text>
            <Text style={styles.resultTime}>
              {new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        )}

        {state === 'already' && (
          <View style={styles.resultContainer}>
            <View style={[styles.resultCircle, { backgroundColor: colors.info + '20' }]}>
              <Ionicons name="information-circle" size={80} color={colors.info} />
            </View>
            <Text style={styles.resultTitle}>Già registrato</Text>
            <Text style={styles.resultSubtitle}>
              Hai già effettuato il check-in oggi. Buon allenamento!
            </Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
              <Text style={styles.retryButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        )}

        {state === 'error' && (
          <View style={styles.resultContainer}>
            <View style={[styles.resultCircle, { backgroundColor: colors.error + '20' }]}>
              <Ionicons name="close-circle" size={80} color={colors.error} />
            </View>
            <Text style={styles.resultTitle}>QR non valido</Text>
            <Text style={styles.resultSubtitle}>
              Assicurati di inquadrare il QR code della palestra alla reception
            </Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
              <Ionicons name="refresh" size={20} color="#fff" />
              <Text style={styles.retryButtonText}>Riprova</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === 'web' ? spacing.lg : 60,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  headerTitle: {
    fontSize: fontSize.title,
    fontWeight: '700',
    color: colors.text,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },

  idleContainer: {
    alignItems: 'center',
    gap: spacing.md,
  },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.accent + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  mainText: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  subText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 20,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.xl + 8,
    paddingVertical: spacing.md + 4,
    borderRadius: borderRadius.xl,
    marginTop: spacing.lg,
  },
  scanButtonText: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: '#fff',
  },

  scanningContainer: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
  },
  scanningTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.lg,
  },
  scannerWrapper: {
    width: '100%',
    aspectRatio: 1,
    maxWidth: 350,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    backgroundColor: '#000',
    position: 'relative',
  },
  scannerBox: {
    width: '100%',
    height: '100%',
  },
  scannerLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    marginTop: spacing.md,
  },
  cancelButton: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  cancelButtonText: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
    fontWeight: '600',
  },

  resultContainer: {
    alignItems: 'center',
    gap: spacing.md,
  },
  resultCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  resultTitle: {
    fontSize: fontSize.title,
    fontWeight: '700',
    color: colors.text,
  },
  resultSubtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 20,
  },
  resultTime: {
    fontSize: fontSize.hero,
    fontWeight: '800',
    color: colors.accent,
    marginTop: spacing.md,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
    marginTop: spacing.lg,
  },
  retryButtonText: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: '#fff',
  },
});
