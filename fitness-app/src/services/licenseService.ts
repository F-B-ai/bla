import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

// ============================================================
// LICENZA WHITE-LABEL
// ------------------------------------------------------------
// La licenza dell'istanza è il documento Firestore `config/license`,
// scrivibile solo dal fornitore dell'app (via service account).
// Campi supportati:
//   active: boolean        — false = istanza sospesa (kill-switch)
//   expiresAt: Timestamp   — opzionale, scadenza automatica
//   message: string        — opzionale, messaggio mostrato nel blocco
//
// Fail-open: se il documento non esiste o la lettura fallisce
// (offline, regole, ecc.) l'app resta operativa — la sospensione
// avviene solo con un `active: false` esplicito o licenza scaduta.
// ============================================================

export interface LicenseStatus {
  active: boolean;
  message?: string;
}

export const checkLicense = async (): Promise<LicenseStatus> => {
  try {
    const snap = await getDoc(doc(db, 'config', 'license'));
    if (!snap.exists()) return { active: true };
    const data = snap.data() as {
      active?: boolean;
      expiresAt?: Timestamp;
      message?: string;
    };
    if (data.active === false) {
      return { active: false, message: data.message };
    }
    if (data.expiresAt && data.expiresAt.toDate().getTime() < Date.now()) {
      return { active: false, message: data.message };
    }
    return { active: true };
  } catch {
    return { active: true };
  }
};
