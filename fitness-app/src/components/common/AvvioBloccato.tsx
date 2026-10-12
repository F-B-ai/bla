// ============================================================
// LA SCHERMATA CHE SOSTITUISCE LA ROTELLA INFINITA
// ------------------------------------------------------------
// Quando l'app non finisce di aprirsi, dopo dodici secondi smette di
// girare e dice che cosa sta succedendo, con tre cose da toccare.
//
// «Ripara l'app» fa quello che la rete di sicurezza della pagina fa
// da sola quando lo schermo resta vuoto: cancella le cache, toglie il
// service worker e ricarica. Qui serve un pulsante perché lo schermo
// NON è vuoto — c'è una rotella — e quel controllo automatico non
// scatta mai.
// ============================================================

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius } from '../../config/theme';
import { spiegaBlocco } from '../../domain/avvio';

export interface AvvioBloccatoProps {
  errore?: string | null;
  onRiprova: () => void;
  onEsci: () => void;
}

/** Cancella la copia salvata sul telefono e ricarica. */
export const riparaApp = (): void => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  const ricarica = () => { try { window.location.reload(); } catch { /* niente */ } };
  const lavori: Promise<unknown>[] = [];
  try {
    const w = window as unknown as {
      caches?: { keys: () => Promise<string[]>; delete: (n: string) => Promise<boolean> };
      navigator?: { serviceWorker?: { getRegistrations?: () => Promise<{ unregister: () => Promise<boolean> }[]> } };
    };
    if (w.caches?.keys) {
      lavori.push(w.caches.keys().then((nomi) => Promise.all(nomi.map((n) => w.caches!.delete(n)))));
    }
    const sw = w.navigator?.serviceWorker;
    if (sw?.getRegistrations) {
      lavori.push(sw.getRegistrations().then((rs) => Promise.all(rs.map((r) => r.unregister()))));
    }
  } catch { /* si ricarica lo stesso */ }
  Promise.all(lavori).then(ricarica).catch(ricarica);
  // Se qualcosa resta appeso, si ricarica comunque: meglio una
  // riparazione a metà che una schermata ferma per sempre.
  setTimeout(ricarica, 4000);
};

export const AvvioBloccato: React.FC<AvvioBloccatoProps> = ({ errore, onRiprova, onEsci }) => {
  const s = spiegaBlocco(errore);
  return (
    <View style={styles.pieno}>
      <View style={styles.cerchio}>
        <Ionicons name="cloud-offline-outline" size={40} color={colors.warning} />
      </View>
      <Text style={styles.titolo}>{s.titolo}</Text>
      <Text style={styles.testo}>{s.testo}</Text>

      <TouchableOpacity style={styles.principale} onPress={onRiprova} accessibilityLabel="Riprova">
        <Text style={styles.principaleTxt}>Riprova</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondario}
        onPress={riparaApp}
        accessibilityLabel="Ripara l'app"
      >
        <Text style={styles.secondarioTxt}>Ripara l'app</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.terziario} onPress={onEsci} accessibilityLabel="Esci e rientra">
        <Text style={styles.terziarioTxt}>Esci e rientra</Text>
      </TouchableOpacity>

      {!!s.dettaglio && <Text style={styles.dettaglio}>{s.dettaglio}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  pieno: {
    flex: 1,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  cerchio: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  titolo: {
    fontSize: fontSize.xxl,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  testo: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: spacing.xl,
  },
  // 52 px: si tocca con una mano sola, spesso in piedi, già innervositi.
  principale: {
    alignSelf: 'stretch',
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.lg,
    backgroundColor: colors.accent,
  },
  principaleTxt: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.white,
  },
  secondario: {
    alignSelf: 'stretch',
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.sm,
  },
  secondarioTxt: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  terziario: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  terziarioTxt: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  dettaglio: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
