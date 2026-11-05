// ============================================================
// L'INDIRIZZO DEL TELEFONO — versione per app native
// ------------------------------------------------------------
// Sul telefono vero (iOS/Android come applicazione compilata) le
// notifiche passano da expo-notifications, non da Firebase Messaging:
// quella libreria è fatta per i browser e qui non esiste.
//
// Questo file serve a una cosa sola e importante: esistere. Metro
// sceglie `indirizzoPush.web.ts` quando costruisce per il web e
// QUESTO quando costruisce per il telefono — così la libreria del
// browser non finisce mai dentro un pacchetto nativo, dove
// all'avvio esploderebbe.
// ============================================================

export interface EsitoIndirizzo {
  token: string | null;
  /** perché non c'è, con parole che si possono leggere */
  motivo?: string;
}

export const prendiIndirizzoPush = async (): Promise<EsitoIndirizzo> =>
  ({ token: null, motivo: 'non è la versione web' });
