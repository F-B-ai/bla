import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius } from '../../config/theme';
import { requestNotificationPermissions } from '../../services/pushNotificationService';

const DISMISSED_KEY = 'essere_notif_prompt_dismissed';

const isIOSWeb = (): boolean => {
  if (Platform.OS !== 'web') return false;
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

const isStandalone = (): boolean => {
  if (typeof window === 'undefined') return false;
  return (window as any).navigator?.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
};

export const NotificationPrompt: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission === 'granted' || Notification.permission === 'denied') return;

    try {
      const dismissed = localStorage.getItem(DISMISSED_KEY);
      if (dismissed) return;
    } catch {}

    setVisible(true);
  }, []);

  const handleEnable = async () => {
    const granted = await requestNotificationPermissions();
    if (granted) {
      setVisible(false);
      try { localStorage.setItem(DISMISSED_KEY, '1'); } catch {}
    }
  };

  const handleDismiss = () => {
    setVisible(false);
    try { localStorage.setItem(DISMISSED_KEY, '1'); } catch {}
  };

  if (!visible) return null;

  const isiOS = isIOSWeb();
  const standalone = isStandalone();

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Ionicons name="notifications" size={24} color={colors.accent} />
        <View style={styles.textBlock}>
          <Text style={styles.title}>Attiva le notifiche</Text>
          <Text style={styles.body}>
            {isiOS && !standalone
              ? 'Per ricevere notifiche su iPhone, aggiungi prima l\'app alla schermata Home (Condividi → Aggiungi a Home), poi attiva le notifiche.'
              : 'Ricevi aggiornamenti su appuntamenti, messaggi e allenamenti.'}
          </Text>
        </View>
        <TouchableOpacity onPress={handleDismiss} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close" size={20} color={colors.textLight} />
        </TouchableOpacity>
      </View>
      {(!isiOS || standalone) && (
        <TouchableOpacity style={styles.button} onPress={handleEnable}>
          <Ionicons name="notifications-outline" size={16} color="#FFF" />
          <Text style={styles.buttonText}>Attiva Notifiche</Text>
        </TouchableOpacity>
      )}
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
    borderColor: colors.accent + '40',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  textBlock: { flex: 1 },
  title: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  body: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2, lineHeight: 18 },
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
