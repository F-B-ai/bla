import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';
import { RapportoMattino } from '../domain/rapportoMattino';
import { RapportoCompleto, conEvidenze } from '../domain/evidenze';

// ============================================================
// RAPPORTO DEL MATTINO — la porta del titolare
// ------------------------------------------------------------
// Il rapporto non si legge dal database: dall'applicazione quella
// collezione non la legge nessuno. Si chiede alla funzione sul
// server, che controlla che chi chiama sia il titolare e risponde.
// ============================================================

/** Perché non è arrivato, in parole. */
export const spiegaErroreRapporto = (err: unknown): string => {
  const e = err as { code?: string; message?: string } | undefined;
  const codice = String(e?.code || '');
  if (codice.includes('not-found')) {
    return 'Il rapporto non è ancora attivo sul server: la funzione non è stata pubblicata.';
  }
  if (codice.includes('permission-denied')) {
    return 'Il rapporto del mattino è riservato al titolare.';
  }
  if (codice.includes('unauthenticated')) {
    return 'Sessione scaduta: esci e rientra.';
  }
  if (codice.includes('unavailable') || codice.includes('deadline-exceeded')) {
    return 'Il server non risponde: controlla la connessione e riprova.';
  }
  return e?.message || 'Non sono riuscito a leggere il rapporto.';
};

/**
 * L'ultimo rapporto scritto dal motore notturno. Con `aggiorna` lo
 * fa ricalcolare adesso sugli ultimi dati.
 */
export const leggiRapportoMattino = async (aggiorna = false): Promise<RapportoCompleto> => {
  const fn = httpsCallable(functions, 'rapportoMattino');
  const r = await fn(aggiorna ? { aggiorna: true } : {});
  const dati = r.data as RapportoMattino & Partial<RapportoCompleto>;
  // Un foglio scritto prima che esistessero le evidenze non le porta:
  // si ricavano qui, con la stessa identica funzione del server.
  return Array.isArray(dati.evidenze) ? (dati as RapportoCompleto) : conEvidenze(dati);
};
