import { httpsCallable } from 'firebase/functions';
import { doc, getDoc } from 'firebase/firestore';
import { db, functions } from '../config/firebase';
import { adminDeleteAuthUser } from './adminAuthService';
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

/**
 * Elimina un accesso che non ha nessuna scheda in anagrafica.
 *
 * La fotografia può essere vecchia di qualche minuto: prima di
 * eliminare si guarda di nuovo se, nel frattempo, a quell'accesso è
 * stata collegata una scheda. Se c'è, non si elimina niente da qui:
 * una persona vera si toglie da Team, non da questo schermo.
 *
 * L'eliminazione la fa il server (adminDeleteUser): solo il titolare
 * attivo può chiederla, e ogni eliminazione resta nel Registro.
 */
export const eliminaAccessoSenzaScheda = async (uid: string): Promise<void> => {
  if (!uid) throw new Error('Accesso non indicato.');
  const scheda = await getDoc(doc(db, 'users', uid));
  if (scheda.exists()) {
    throw new Error('Nel frattempo questo accesso è stato collegato a una scheda: non lo elimino da qui.');
  }
  await adminDeleteAuthUser(uid);
};
