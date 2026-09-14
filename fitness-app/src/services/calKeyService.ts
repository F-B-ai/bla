import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';
import { brand } from '../config/brand';
import { istruzioniPonte as testoPonte } from '../domain/ponteCal';

// ============================================================
// LA CHIAVE DEL PONTE CAL
// ------------------------------------------------------------
// Chi riceve le richieste su WhatsApp le scrive direttamente nella
// coda dell'app usando questa chiave. La genera solo il titolare,
// si vede UNA volta sola, e sul server resta solo la sua impronta.
//
// Chi ha la chiave può fare DUE cose, e nessuna delle due cambia
// l'agenda:
//   · scrivere richieste in attesa (POST /v1/cal);
//   · leggere gli spazi liberi (GET /v1/cal/liberi) — solo ore,
//     nessun nome, nessun telefono.
// Non può confermare niente, non può cancellare, non può vedere chi
// viene. Rigenerarla spegne all'istante quella vecchia.
// ============================================================

export const CAL_ENDPOINT = `${brand.appUrl}/v1/cal`;
export const CAL_LIBERI_ENDPOINT = `${brand.appUrl}/v1/cal/liberi`;

export const generaChiaveCAL = async (): Promise<string> => {
  try {
    const fn = httpsCallable<unknown, { chiave: string }>(functions, 'calKeyRotate');
    const res = await fn({});
    return res.data.chiave;
  } catch (err) {
    const e = err as { code?: string; message?: string };
    if ((e?.code || '').includes('permission-denied')) {
      throw new Error('Solo il titolare può generare la chiave.');
    }
    throw new Error(
      'Non riesco a generare la chiave: le Cloud Functions non rispondono.'
    );
  }
};

/**
 * Le istruzioni da consegnare a chi riceve le richieste (il bot, o
 * una persona). Si copiano da Richieste WhatsApp e si inoltrano.
 *
 * Il testo vive in domain/ponteCal.ts, dove si può provare senza
 * Firebase: qui ci si mette solo l'indirizzo dell'App.
 */
export const istruzioniPonte = (chiave: string): string =>
  testoPonte(brand.appUrl, chiave);
