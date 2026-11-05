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

/**
 * Cancella tutto quello che l'app tiene sul telefono, e ricarica.
 *
 * TRE DEPOSITI, non uno — ed è la ragione per cui la prima versione di
 * questa riparazione non bastava e il blocco tornava:
 *
 *   · le CACHE del browser (i file dell'app);
 *   · il SERVICE WORKER, che quelle cache le riempie;
 *   · e IndexedDB, dove Firestore tiene la copia locale dei dati e
 *     Firebase tiene l'accesso.
 *
 * Il terzo era rimasto fuori. È proprio quello che si incarta sulle
 * app installate dalla schermata home, e finché resta lì il blocco
 * ritorna al primo riavvio: si ripara la vetrina e si lascia il guasto
 * nel retro.
 *
 * Cancellando IndexedDB si perde anche l'accesso, e va detto a chi
 * tocca il pulsante: si rientra con email e password, e non si perde
 * nessun dato — quelli stanno sul server.
 */
export const riparaApp = (): void => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  const ricarica = () => { try { window.location.reload(); } catch { /* niente */ } };
  const lavori: Promise<unknown>[] = [];
  try {
    const w = window as unknown as {
      caches?: { keys: () => Promise<string[]>; delete: (n: string) => Promise<boolean> };
      indexedDB?: {
        databases?: () => Promise<{ name?: string }[]>;
        deleteDatabase: (n: string) => { onsuccess: unknown; onerror: unknown };
      };
      navigator?: { serviceWorker?: { getRegistrations?: () => Promise<{ unregister: () => Promise<boolean> }[]> } };
    };
    if (w.caches?.keys) {
      lavori.push(w.caches.keys().then((nomi) => Promise.all(nomi.map((n) => w.caches!.delete(n)))));
    }
    const sw = w.navigator?.serviceWorker;
    if (sw?.getRegistrations) {
      lavori.push(sw.getRegistrations().then((rs) => Promise.all(rs.map((r) => r.unregister()))));
    }

    const idb = w.indexedDB;
    if (idb) {
      const cancella = (nome: string) => new Promise<void>((fine) => {
        try {
          const r = idb.deleteDatabase(nome) as unknown as Record<string, unknown>;
          // `onblocked` succede quando l'app è aperta anche altrove: non
          // si aspetta all'infinito, si va avanti e si ricarica.
          r.onsuccess = () => fine();
          r.onerror = () => fine();
          r.onblocked = () => fine();
          setTimeout(fine, 2500);
        } catch { fine(); }
      });

      if (idb.databases) {
        lavori.push(
          idb.databases()
            .then((elenco) => Promise.all(
              elenco.map((d) => (d.name ? cancella(d.name) : Promise.resolve()))
            ))
            // Safari non sempre sa elencarli: allora si cancellano
            // quelli noti, che sono quelli che si incartano.
            .catch(() => Promise.all(NOMI_NOTI.map(cancella)))
        );
      } else {
        lavori.push(Promise.all(NOMI_NOTI.map(cancella)));
      }
    }
  } catch { /* si ricarica lo stesso */ }
  Promise.all(lavori).then(ricarica).catch(ricarica);
  // Se qualcosa resta appeso, si ricarica comunque: meglio una
  // riparazione a metà che una schermata ferma per sempre.
  setTimeout(ricarica, 6000);
};

/** I depositi di Firebase, per i browser che non sanno elencarli. */
const NOMI_NOTI = [
  'firebaseLocalStorageDb',
  'firebase-heartbeat-database',
  'firebase-installations-database',
];

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
      <Text style={styles.piccolo}>
        «Ripara» cancella la copia tenuta sul telefono: dovrai rifare l'accesso.
        I dati stanno sul server e non si toccano.
      </Text>

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
  piccolo: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 16,
  },
  dettaglio: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
