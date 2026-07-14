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
import { brand } from '../../config/brand';
import jsQRStatic from 'jsqr';

// Risolve la funzione di decodifica in modo robusto rispetto all'interop
// dei moduli (CJS/ESM): scarta i wrapper .default finché trova la funzione.
const resolveDecoder = (mod: any): any => {
  let m = mod;
  for (let i = 0; i < 3 && m && typeof m !== 'function'; i++) m = m.default;
  return typeof m === 'function' ? m : null;
};
const jsQR = resolveDecoder(jsQRStatic);

// Codice da digitare alla reception (semplice e a prova di fotocamera)
export const CHECKIN_MANUAL_CODE = brand.checkinManualCode.toUpperCase();

// Accetta il codice manuale o qualsiasi QR di accesso ESSĒRE: il codice
// attuale ('ESSERE_ACCESS_2024'), il vecchio ('ESSERE_ACCESS') o il
// vecchio QR con URL ('https://...?checkin=ESSERE_ACCESS').
const isValidCheckinQR = (text: string): boolean => {
  const t = text.trim().toUpperCase();
  return t.includes('ESSERE_ACCESS') || t.includes(brand.checkinQRCode.toUpperCase()) || t === CHECKIN_MANUAL_CODE;
};

type CheckinState = 'idle' | 'scanning' | 'processing' | 'success' | 'already' | 'error' | 'camera_error';

export const CheckinScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [state, setState] = useState<CheckinState>('idle');
  const [scannerReady, setScannerReady] = useState(false);
  const [cameraErrorMsg, setCameraErrorMsg] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [showScanHint, setShowScanHint] = useState(false);
  const containerRef = useRef<string>('qr-reader-' + Math.random().toString(36).substring(7));
  const streamRef = useRef<any>(null);
  const rafRef = useRef<any>(null);
  const videoElRef = useRef<any>(null);

  const stopScanner = useCallback(() => {
    if (rafRef.current) { try { cancelAnimationFrame(rafRef.current); } catch {} rafRef.current = null; }
    if (streamRef.current) {
      try { streamRef.current.getTracks().forEach((t: any) => t.stop()); } catch {}
      streamRef.current = null;
    }
    if (videoElRef.current) {
      try { videoElRef.current.srcObject = null; videoElRef.current.remove(); } catch {}
      videoElRef.current = null;
    }
    setScannerReady(false);
  }, []);

  const handleScan = useCallback(async (decodedText: string, method: 'qr' | 'manuale' = 'qr') => {
    if (state === 'success' || state === 'already') return;

    stopScanner();

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
      const result = await registerCheckin(user.id, displayName, method);
      if (result.success) {
        setState('success');
      } else if (result.alreadyCheckedIn) {
        setState('already');
      }
    } catch {
      setState('error');
    }
  }, [user, state, stopScanner]);

  // Avvia la fotocamera DENTRO il tocco dell'utente: su iOS getUserMedia
  // richiede l'attivazione utente, quindi va chiamato subito, senza await
  // prima. Otteniamo lo stream e SOLO DOPO mostriamo la vista scanner.
  const startScanner = useCallback(async () => {
    if (Platform.OS !== 'web') return;
    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraErrorMsg('La fotocamera non è disponibile in questa app. Usa "Scatta foto del QR" o il codice.');
      setState('camera_error');
      return;
    }
    setScannerReady(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;
      setState('scanning');
    } catch (e: any) {
      const name = e?.name || '';
      let msg = 'Non è stato possibile aprire la fotocamera. Usa "Scatta foto del QR" o il codice.';
      if (name === 'NotAllowedError' || /denied|permission/i.test(String(name))) {
        msg = 'Permesso fotocamera negato. Abilitalo nelle impostazioni del telefono, oppure usa "Scatta foto del QR".';
      }
      setCameraErrorMsg(msg);
      setState('camera_error');
    }
  }, []);

  // Quando entriamo in "scanning" e abbiamo lo stream: monta il video e scansiona i frame.
  useEffect(() => {
    if (state !== 'scanning' || !streamRef.current) return;
    if (typeof document === 'undefined') return;
    let stopped = false;
    const timer = setTimeout(() => {
      const container = document.getElementById(containerRef.current);
      if (!container) { setCameraErrorMsg('Errore di avvio. Riprova.'); setState('camera_error'); return; }
      const video = document.createElement('video');
      video.setAttribute('playsinline', 'true');
      (video as any).playsInline = true;
      video.muted = true;
      (video as any).autoplay = true;
      video.style.width = '100%';
      video.style.height = '100%';
      video.style.objectFit = 'cover';
      videoElRef.current = video;
      try { container.innerHTML = ''; } catch {}
      container.appendChild(video);
      video.srcObject = streamRef.current;

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true } as any);
      let lastDecode = 0;

      const tick = () => {
        if (stopped) return;
        const now = Date.now();
        const v = videoElRef.current;
        // decodifica ~8 volte al secondo: più leggero e più affidabile del
        // full-frame a 60fps, specialmente su iPhone
        if (v && v.readyState >= 2 && v.videoWidth > 0 && ctx && now - lastDecode > 120) {
          lastDecode = now;
          if (!stopped) setScannerReady(true);
          // downscale a max 640px: jsQR lavora meglio e pesa meno
          const scale = Math.min(1, 640 / v.videoWidth);
          canvas.width = Math.round(v.videoWidth * scale);
          canvas.height = Math.round(v.videoHeight * scale);
          ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
          try {
            const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR ? jsQR(img.data, img.width, img.height, { inversionAttempts: 'attemptBoth' }) : null;
            if (code && code.data) { handleScan(code.data); return; }
          } catch {}
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      const startLoop = () => { if (!stopped) rafRef.current = requestAnimationFrame(tick); };
      video.play().then(startLoop).catch(startLoop);
    }, 60);

    // Se il decoder non è disponibile, meglio dirlo subito che girare a vuoto
    if (!jsQR) {
      setCameraErrorMsg('Il lettore QR non è disponibile su questa versione. Usa "Scatta una foto del QR" o il codice.');
      setState('camera_error');
      return () => { stopped = true; clearTimeout(timer); };
    }

    // Dopo 6 secondi senza lettura, mostra un aiuto (senza fermare la scansione)
    const hintTimer = setTimeout(() => { if (!stopped) setShowScanHint(true); }, 6000);
    return () => { stopped = true; clearTimeout(timer); clearTimeout(hintTimer); setShowScanHint(false); };
  }, [state, handleScan]);

  // Pulisce la fotocamera quando si lascia lo stato scanning
  useEffect(() => {
    if (state !== 'scanning') stopScanner();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

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
      try {
        if (!jsQR) throw new Error('decoder');
        const url = URL.createObjectURL(file);
        const img: any = await new Promise((res, rej) => {
          const im = new Image();
          im.onload = () => res(im);
          im.onerror = rej;
          im.src = url;
        });
        // prova a più risoluzioni: aiuta con foto grandi o sfocate
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true } as any);
        let decoded: string | null = null;
        for (const maxW of [800, 1200, 500]) {
          const scale = Math.min(1, maxW / img.width);
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          ctx!.drawImage(img, 0, 0, canvas.width, canvas.height);
          const data = ctx!.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(data.data, data.width, data.height, { inversionAttempts: 'attemptBoth' });
          if (code && code.data) { decoded = code.data; break; }
        }
        URL.revokeObjectURL(url);
        if (decoded) { handleScan(decoded); return; }
        throw new Error('no-qr');
      } catch {
        setCameraErrorMsg('Non sono riuscito a leggere il QR dalla foto. Avvicinati al QR, mettilo bene a fuoco e riprova — oppure usa il codice.');
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
      handleScan(manualCode, 'manuale');
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
              onPress={startScanner}
              activeOpacity={0.85}
            >
              <Ionicons name="qr-code-outline" size={24} color={colors.white} />
              <Text style={styles.scanButtonText}>Scansiona QR</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.liveLink}
              onPress={scanFromPhoto}
              activeOpacity={0.7}
            >
              <Ionicons name="camera-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.liveLinkText}>Scatta una foto del QR</Text>
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
                  <Ionicons name="arrow-forward" size={22} color={colors.white} />
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
              {scannerReady && (
                <View pointerEvents="none" style={styles.reticle}>
                  <View style={[styles.corner, styles.cornerTL]} />
                  <View style={[styles.corner, styles.cornerTR]} />
                  <View style={[styles.corner, styles.cornerBL]} />
                  <View style={[styles.corner, styles.cornerBR]} />
                </View>
              )}
              {!scannerReady && (
                <View style={styles.scannerLoading}>
                  <ActivityIndicator size="large" color={colors.accent} />
                  <Text style={styles.loadingText}>Attivazione fotocamera...</Text>
                </View>
              )}
            </View>
            {showScanHint && (
              <View style={styles.scanHint}>
                <Ionicons name="bulb-outline" size={16} color={colors.warning} />
                <Text style={styles.scanHintText}>
                  Difficoltà a leggere? Avvicinati al QR, evita riflessi, oppure usa il codice {CHECKIN_MANUAL_CODE}
                </Text>
              </View>
            )}
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
              <Ionicons name="refresh" size={20} color={colors.white} />
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
              <Ionicons name="camera" size={20} color={colors.white} />
              <Text style={styles.retryButtonText}>Scatta foto del QR</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={startScanner}>
              <Text style={styles.secondaryButtonText}>Riprova scansione live</Text>
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
    color: colors.white,
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
    backgroundColor: colors.black,
    position: 'relative',
  },
  scannerBox: {
    width: '100%',
    height: '100%',
  },
  reticle: {
    position: 'absolute',
    top: '14%', left: '14%', right: '14%', bottom: '14%',
  },
  corner: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderColor: colors.white,
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 12 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 12 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 12 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 12 },
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
  scanHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.warning + '15',
    borderWidth: 1,
    borderColor: colors.warning + '40',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
    maxWidth: 350,
  },
  scanHintText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 18,
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
    color: colors.white,
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
