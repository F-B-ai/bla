import { httpsCallable } from 'firebase/functions';
import { spiegaErroreAdmin } from '../domain/erroreAdmin';
import { functions } from '../config/firebase';

// ============================================================
// Operazioni admin sulle credenziali — via Cloud Functions
// ------------------------------------------------------------
// Sostituisce il vecchio meccanismo "accedi come l'utente con la
// managedPassword salvata in chiaro" (vulnerabilità V1, bonificata
// in M0). Le funzioni girano server-side con Admin SDK e verificano
// il ruolo del chiamante (functions/src/index.ts).
// Richiedono il piano Blaze + deploy delle Functions: finché non
// sono attive, gli errori vengono tradotti in un messaggio chiaro.
// ============================================================

// Prima qui c'era un solo messaggio buono per tutto: «le Cloud
// Functions (piano Blaze) non sono attive». Ci finiva dentro anche il
// codice `internal`, che è quello che una Function restituisce quando
// il SUO codice fallisce — cioè praticamente ogni errore vero.
//
// Le Functions erano attive e rispondevano. Quel messaggio non è mai
// stato vero, e mandava a cercare nel posto sbagliato.
// La classificazione vive in domain/erroreAdmin.
const translateError = (err: unknown): Error =>
  new Error(spiegaErroreAdmin(err));

export const adminSetUserEmail = async (
  targetUserId: string,
  newEmail: string
): Promise<void> => {
  try {
    const fn = httpsCallable(functions, 'adminChangeEmail');
    await fn({ targetUserId, newEmail });
  } catch (err) {
    throw translateError(err);
  }
};

export const adminSetUserPassword = async (
  targetUserId: string,
  newPassword: string
): Promise<void> => {
  try {
    const fn = httpsCallable(functions, 'adminChangePassword');
    await fn({ targetUserId, newPassword });
  } catch (err) {
    throw translateError(err);
  }
};

export const adminDeleteAuthUser = async (targetUserId: string): Promise<void> => {
  try {
    const fn = httpsCallable(functions, 'adminDeleteUser');
    await fn({ targetUserId });
  } catch (err) {
    throw translateError(err);
  }
};

/**
 * Riscrive il ruolo di ogni persona dentro il suo token di accesso.
 *
 * Serve perché le regole dei file leggono il ruolo dal token, non da
 * Firestore: la lettura di Firestore da dentro quelle regole non
 * funziona in produzione, e finché il token non porta il ruolo, per i
 * file una persona vale quanto un allievo qualsiasi — titolare compreso.
 *
 * ⚠️ Il token si aggiorna solo al rinnovo: dopo questa operazione si
 * esce e si rientra, oppure si aspetta la scadenza (un'ora).
 *
 * Solo il titolare può eseguirla.
 */
export const allineaRuoliNeiToken = async (): Promise<number> => {
  try {
    const fn = httpsCallable(functions, 'migrateUserClaims');
    const res = await fn({});
    return (res.data as { migrated?: number })?.migrated ?? 0;
  } catch (err) {
    throw translateError(err);
  }
};

/** Pulizia one-shot dei campi managedPassword residui (solo owner). */
export const cleanAllManagedPasswords = async (): Promise<number> => {
  try {
    const fn = httpsCallable(functions, 'cleanManagedPasswords');
    const res = await fn({});
    return (res.data as { cleaned?: number })?.cleaned ?? 0;
  } catch (err) {
    throw translateError(err);
  }
};

// ============================================================
// CREARE L'ACCESSO AL POSTO DELLA PERSONA
// ------------------------------------------------------------
// 14 settembre 2026: «Non tutti, soprattutto le persone più anziane,
// capiscono come fare.» L'invito da completare da soli non è una
// strada per tutti; l'accesso lo crea il titolare e lo detta a voce.
// ============================================================

export interface StatoAccesso {
  haAccesso: boolean;
  email: string;
  /** ha un accesso ma non è mai entrata */
  maiEntrata: boolean;
}

/** Questa persona può entrare nell'App? */
export const leggiStatoAccesso = async (
  targetUserId: string
): Promise<StatoAccesso> => {
  try {
    const fn = httpsCallable(functions, 'adminStatoAccesso');
    const res = await fn({ targetUserId });
    const d = res.data as Partial<StatoAccesso>;
    return {
      haAccesso: !!d?.haAccesso,
      email: d?.email || '',
      maiEntrata: d?.maiEntrata !== false,
    };
  } catch (err) {
    throw translateError(err);
  }
};

/**
 * Crea l'accesso per una persona già in anagrafica.
 *
 * Restituisce gli eventuali avvisi: l'accesso a quel punto ESISTE
 * comunque, e nascondere che qualcosa di secondario non è riuscito
 * sarebbe peggio che dirlo.
 */
export const creaAccessoPerAllievo = async (
  targetUserId: string,
  email: string,
  password: string
): Promise<string[]> => {
  try {
    const fn = httpsCallable(functions, 'adminCreaAccesso');
    const res = await fn({ targetUserId, email, password });
    return (res.data as { avvisi?: string[] })?.avvisi || [];
  } catch (err) {
    throw translateError(err);
  }
};
