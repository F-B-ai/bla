import { httpsCallable } from 'firebase/functions';
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

const FUNCTIONS_NOT_READY =
  'Questa operazione richiede le Cloud Functions (piano Blaze) non ancora attive. ' +
  'In alternativa usa "Invia link reimpostazione password".';

const translateError = (err: unknown): Error => {
  const e = err as { code?: string; message?: string };
  const code = e?.code || '';
  if (
    code.includes('not-found') ||
    code.includes('unavailable') ||
    code.includes('internal') ||
    (e?.message || '').includes('fetch')
  ) {
    return new Error(FUNCTIONS_NOT_READY);
  }
  if (code.includes('permission-denied')) {
    return new Error('Non hai i permessi per questa operazione.');
  }
  return new Error(e?.message || 'Operazione non riuscita');
};

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
