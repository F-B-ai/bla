import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius } from '../../config/theme';
import { brand } from '../../config/brand';

const DISMISSED_KEY = 'essere_install_prompt_dismissed';
const MIN_VISITS_BEFORE_PROMPT = 2;
const VISIT_COUNT_KEY = 'essere_visit_count';

const isIOSWeb = (): boolean => {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

const isStandalone = (): boolean => {
  if (typeof window === 'undefined') return false;
  return (window as any).navigator?.standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches;
};

export const InstallPrompt: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isiOS, setIsiOS] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (isStandalone()) return;

    try {
      const dismissed = localStorage.getItem(DISMISSED_KEY);
      if (dismissed) return;

      const visits = parseInt(localStorage.getItem(VISIT_COUNT_KEY) || '0', 10) + 1;
      localStorage.setItem(VISIT_COUNT_KEY, String(visits));
      if (visits < MIN_VISITS_BEFORE_PROMPT) return;
    } catch { return; }

    if (isIOSWeb()) {
      setIsiOS(true);
      setVisible(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      if (result.outcome === 'accepted') {
        dismiss();
      }
    }
  };

  const dismiss = () => {
    setVisible(false);
    try { localStorage.setItem(DISMISSED_KEY, '1'); } catch {}
  };

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconBox}>
          <Ionicons name="phone-portrait-outline" size={28} color={colors.accent} />
        </View>
        <View style={styles.textBlock}>
          <Text style={styles.title}>Installa l'app</Text>
          <Text style={styles.body}>
            {isiOS
              ? 'Tocca l\'icona Condividi in basso, poi "Aggiungi a Home" per un\'esperienza completa con notifiche push.'
              : `Aggiungi ${brand.appName} alla schermata Home per accesso rapido e notifiche.`}
          </Text>
        </View>
        <TouchableOpacity onPress={dismiss} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close" size={20} color={colors.textLight} />
        </TouchableOpacity>
      </View>
      {isiOS ? (
        <View style={styles.iosSteps}>
          <View style={styles.step}>
            <View style={styles.stepNum}><Text style={styles.stepNumText}>1</Text></View>
            <Ionicons name="share-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.stepText}>Tocca Condividi</Text>
          </View>
          <View style={styles.step}>
            <View style={styles.stepNum}><Text style={styles.stepNumText}>2</Text></View>
            <Ionicons name="add-circle-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.stepText}>Aggiungi a Home</Text>
          </View>
        </View>
      ) : deferredPrompt ? (
        <TouchableOpacity style={styles.button} onPress={handleInstall}>
          <Ionicons name="download-outline" size={16} color="#FFF" />
          <Text style={styles.buttonText}>Installa</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.accent + '30',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.accent + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: { flex: 1 },
  title: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  body: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2, lineHeight: 18 },
  iosSteps: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 4,
  },
  stepNum: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  stepText: { fontSize: fontSize.sm, color: colors.textSecondary },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.accent,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
  buttonText: { color: '#FFF', fontWeight: '700', fontSize: fontSize.sm },
});
