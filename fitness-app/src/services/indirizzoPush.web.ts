import { getMessaging, getToken, isSupported } from 'firebase/messaging';
import { brand } from '../config/brand';
import { EsitoIndirizzo } from './indirizzoPush';

// ============================================================
// L'INDIRIZZO DEL TELEFONO — versione web
// ------------------------------------------------------------
// 22 ottobre 2026, terza diagnosi. Il pannello ha finito il lavoro e
// ha detto il motivo vero:
//
//     Requiring unknown module "1192".
//
// Non era Firebase, non era iOS, non era il permesso: era il
// costruttore del pacchetto. `firebase/messaging` veniva caricato
// con un `await import(...)` scritto dentro una funzione, e non era
// importato in modo statico da NESSUNA parte del programma — quindi
// Metro non lo metteva nel pacchetto, e al momento di usarlo quel
// modulo semplicemente non c'era.
//
// Un import dinamico non è una promessa che il modulo esista: è una
// richiesta di qualcosa che qualcun altro deve aver messo lì.
//
// Qui l'import è STATICO, in cima, dove il costruttore lo vede. E il
// file è separato per piattaforma — `.web.ts` per il browser,
// `indirizzoPush.ts` per l'app nativa — così questa libreria, che è
// fatta per i browser, non finisce in un pacchetto dove non può
// funzionare.
// ============================================================

export const prendiIndirizzoPush = async (): Promise<EsitoIndirizzo> => {
  try {
    if (!(await isSupported())) {
      return { token: null, motivo: 'questo browser non supporta i messaggi Firebase' };
    }

    const chiave = (brand as { vapidKey?: string }).vapidKey;
    if (!chiave) return { token: null, motivo: 'manca la chiave dei certificati push' };

    const sw = (navigator as { serviceWorker?: { ready: Promise<unknown> } }).serviceWorker;
    if (!sw) return { token: null, motivo: 'service worker non disponibile' };

    // Si riusa il service worker che l'app ha già: due service worker
    // sullo stesso sito litigano per chi mostra la notifica, e ne
    // esce una doppia o nessuna.
    const token = await getToken(getMessaging(), {
      vapidKey: chiave,
      serviceWorkerRegistration: (await sw.ready) as never,
    });

    if (!token) return { token: null, motivo: 'il sistema non ha restituito nessun indirizzo' };
    return { token };
  } catch (err) {
    const e = err as { code?: string; message?: string };
    return { token: null, motivo: e?.code || e?.message || String(err) };
  }
};
