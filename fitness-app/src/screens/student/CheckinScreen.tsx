import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, borderRadius } from '../../config/theme';
import { useAuth } from '../../hooks/useAuth';
import { registerCheckin } from '../../services/checkinService';

// Codice da digitare alla reception (semplice e a prova di fotocamera)
export const CHECKIN_MANUAL_CODE = 'MMLAB';

// Accetta il codice manuale o qualsiasi QR di accesso ESSĒRE: il codice
// attuale ('ESSERE_ACCESS_2024'), il vecchio ('ESSERE_ACCESS') o il
// vecchio QR con URL ('https://...?checkin=ESSERE_ACCESS').
const isValidCheckinQR = (text: string): boolean => {
  const t = text.trim().toUpperCase();
  return t.includes('ESSERE_ACCESS') || t === CHECKIN_MANUAL_CODE;
};

type CheckinState = 'idle' | 'scanning' | 'processing' | 'success' | 'already' | 'error' | 'camera_error';

export const CheckinScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [state, setState] = useState<CheckinState>('idle');
  const [scannerReady, setScannerReady] = useState(false);
  const [cameraErrorMsg, setCameraErrorMsg] = useState('');
  const [manualCode, setManualCode] = useState('');
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

  // Il bottone si limita a passare in stato "scanning": l'avvio reale
  // avviene nell'useEffect sotto, quando il contenitore è già nel DOM.
  const startScanner = useCallback(() => {
    if (Platform.OS !== 'web') return;
    setScannerReady(false);
    setState('scanning');
  }, []);

  // Avvia la fotocamera DOPO che l'elemento contenitore è montato.
  useEffect(() => {
    if (state !== 'scanning') return;
    let cancelled = false;
    let started = false;
    const startTimer = setTimeout(async () => {
      try {
        if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('NO_CAMERA_API');
        }
        const { Html5Qrcode } = await import('html5-qrcode');
        if (cancelled) return;
        const el = typeof document !== 'undefined' ? document.getElementById(containerRef.current) : null;
        if (!el) throw new Error('NO_CONTAINER');
        const scanner = new Html5Qrcode(containerRef.current);
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => handleScan(decodedText),
          () => {}
        );
        started = true;
        if (!cancelled) setScannerReady(true);
      } catch (e: any) {
        const name = e?.name || e?.message || '';
        let msg = 'Non è stato possibile aprire la fotocamera. Tocca "Scatta foto del QR".';
        if (name === 'NotAllowedError' || /denied|permission/i.test(String(name))) {
          msg = 'Permesso fotocamera negato. Abilitalo nelle impostazioni del telefono, oppure usa "Scatta foto del QR".';
        } else if (name === 'NotFoundError' || name === 'NO_CAMERA_API') {
          msg = 'La fotocamera live non è disponibile in questa app. Usa "Scatta foto del QR" per registrare l\'accesso.';
        }
        if (!cancelled) { setCameraErrorMsg(msg); setState('camera_error'); }
      }
    }, 250);
    // Watchdog: se entro 9s la fotocamera non parte, non restare bloccato
    const watchdog = setTimeout(() => {
      if (!cancelled && !started) {
        stopScanner();
        setCameraErrorMsg('La fotocamera live non si è avviata. Tocca "Scatta foto del QR".');
        setState('camera_error');
      }
    }, 9000);
    return () => { cancelled = true; clearTimeout(startTimer); clearTimeout(watchdog); };
  }, [state, handleScan, stopScanner]);

  // Metodo principale: scatta una foto del QR e decodificala.
  // Affidabile su iOS PWA, dove la fotocamera "live" è spesso bloccata.
  const scanFromPhoto = useCallback(() => {
    if (typeof document === 'undefined') return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    (input as any).capture = 'environment';
    // IMPORTANTE iOS: l'input deve essere agganciato al DOM, altrimenti
    // il click viene ignorato e la fotocamera non si apre.
    input.style.position = 'fixed';
    input.style.left = '-9999px';
    input.style.opacity = '0';
    document.body.appendChild(input);
    const cleanupInput = () => { try { input.remove(); } catch {} };
    input.onchange = async () => {
      const file = input.files && input.files[0];
      cleanupInput();
      if (!file) return; // utente ha annullato
      setState('processing');
      const tmpId = 'qr-file-' + Math.random().toString(36).slice(2);
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        const div = document.createElement('div');
        div.id = tmpId; div.style.display = 'none';
        document.body.appendChild(div);
        const qr = new Html5Qrcode(tmpId);
        const result = await qr.scanFile(file, false);
        try { document.body.removeChild(div); } catch {}
        handleScan(result);
      } catch {
        try { const d = document.getElementById(tmpId); if (d) d.remove(); } catch {}
        setCameraErrorMsg('Non sono riuscito a leggere il QR dalla foto. Avvicinati al QR, mettilo bene a fuoco e riprova.');
        setState('camera_error');
      }
    };
    // Se l'utente annulla il picker, ripulisci comunque l'input
    setTimeout(() => { if (input.parentNode && !input.files?.length) { /* lasciato per onchange */ } }, 60000);
    input.click();
  }, [handleScan]);

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  const handleRetry = () => {
    setManualCode('');
    setState('idle');
  };

  const confirmManualCode = useCallback(() => {
    if (!manualCode.trim()) return;
    if (isValidCheckinQR(manualCode)) {
      setState('processing');
      handleScan(manualCode);
    } else {
      setState('error');
    }
  }, [manualCode, handleScan]);

  return (
    <View style={styles.container}>
      <View style={{ ...styles.header, paddingTop: insets.top + spacing.md }}>
        <Text style={styles.headerTitle}>Check-in</Text>
      </View>

      <View style={styles.content}>
        {state === 'idle' && (
          <View style={styles.idleContainer}>
            <View style={styles.heroRing}>
              <View style={styles.iconCircle}>
                <Ionicons name="qr-code" size={64} color={colors.accent} />
              </View>
            </View>
            <Text style={styles.mainText}>Check-in in palestra</Text>
            <Text style={styles.subText}>
              Inquadra il QR alla reception per registrare il tuo accesso
            </Text>

            <TouchableOpacity
              style={styles.scanButton}
              onPress={scanFromPhoto}
              activeOpacity={0.85}
            >
              <Ionicons name="camera" size={24} color="#fff" />
              <Text style={styles.scanButtonText}>Scansiona QR</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.liveLink}
              onPress={startScanner}
              activeOpacity={0.7}
            >
              <Ionicons name="scan-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.liveLinkText}>Scansione continua</Text>
            </TouchableOpacity>

            {/* Codice manuale */}
            <View style={styles.manualCard}>
              <Text style={styles.manualCardLabel}>Non funziona la fotocamera?</Text>
              <Text style={styles.manualCardHint}>Inserisci il codice della reception</Text>
              <View style={styles.codeRow}>
                <TextInput
                  style={styles.codeInput}
                  value={manualCode}
                  onChangeText={setManualCode}
                  placeholder="CODICE"
                  placeholderTextColor={colors.textLight}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={confirmManualCode}
                />
                <TouchableOpacity
                  style={[styles.codeConfirm, !manualCode.trim() && { opacity: 0.4 }]}
                  onPress={confirmManualCode}
                  disabled={!manualCode.trim()}
                  activeOpacity={0.8}
                >
                  <Ionicons name="arrow-forward" size={22} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {state === 'processing' && (
          <View style={styles.resultContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={styles.resultSubtitle}>Lettura del QR in corso...</Text>
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
            <Text style={styles.resultTitle}>Codice non valido</Text>
            <Text style={styles.resultSubtitle}>
              Controlla il codice mostrato alla reception e riprova.
            </Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
              <Ionicons name="refresh" size={20} color="#fff" />
              <Text style={styles.retryButtonText}>Riprova</Text>
            </TouchableOpacity>
          </View>
        )}

        {state === 'camera_error' && (
          <View style={styles.resultContainer}>
            <View style={[styles.resultCircle, { backgroundColor: colors.warning + '20' }]}>
              <Ionicons name="camera-outline" size={80} color={colors.warning} />
            </View>
            <Text style={styles.resultTitle}>Fotocamera non disponibile</Text>
            <Text style={styles.resultSubtitle}>{cameraErrorMsg}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={scanFromPhoto}>
              <Ionicons name="camera" size={20} color="#fff" />
              <Text style={styles.retryButtonText}>Scatta foto del QR</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => setState('scanning')}>
              <Text style={styles.secondaryButtonText}>Riprova con la fotocamera</Text>
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
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: colors.accent + '14',
    justifyContent: 'center',
    alignItems: 'center',
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
  heroRing: {
    width: 156,
    height: 156,
    borderRadius: 78,
    borderWidth: 1,
    borderColor: colors.accent + '30',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  liveLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
  },
  liveLinkText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  manualCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginTop: spacing.xl,
    alignItems: 'center',
  },
  manualCardLabel: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
  },
  manualCardHint: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: spacing.md,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    width: '100%',
  },
  codeInput: {
    flex: 1,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    letterSpacing: 3,
  },
  codeConfirm: {
    width: 50,
    height: 50,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButton: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  secondaryButtonText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontWeight: '600',
  },
});
