import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';
import { ControlloAccessi } from '../domain/controlloAccessi';

// ============================================================
// CONTROLLO ACCESSI — la porta del titolare
// ------------------------------------------------------------
// Gli account di accesso non si leggono dall'applicazione: li legge
// la funzione sul server, che prima controlla che chi chiama sia il
// titolare.
// ============================================================

export const leggiControlloAccessi = async (): Promise<ControlloAccessi> => {
  const fn = httpsCallable(functions, 'controlloAccessi');
  const r = await fn({});
  return r.data as ControlloAccessi;
};

export const spiegaErroreControllo = (err: unknown): string => {
  const e = err as { code?: string; message?: string } | undefined;
  const codice = String(e?.code || '');
  if (codice.includes('not-found')) {
    return 'Il controllo accessi non è ancora attivo sul server: la funzione non è stata pubblicata.';
  }
  if (codice.includes('permission-denied')) return 'Il controllo accessi è riservato al titolare.';
  if (codice.includes('unauthenticated')) return 'Sessione scaduta: esci e rientra.';
  if (codice.includes('unavailable') || codice.includes('deadline-exceeded')) {
    return 'Il server non risponde: controlla la connessione e riprova.';
  }
  return e?.message || 'Non sono riuscito a leggere gli accessi.';
};
