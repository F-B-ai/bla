import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';
import { brand } from '../config/brand';

// ============================================================
// LA CHIAVE DEL PONTE CAL
// ------------------------------------------------------------
// Chi riceve le richieste su WhatsApp le scrive direttamente nella
// coda dell'app usando questa chiave. La genera solo il titolare,
// si vede UNA volta sola, e sul server resta solo la sua impronta.
//
// Chi ha la chiave può SCRIVERE richieste in attesa. Non può
// leggere l'agenda, non può confermare niente, non può cancellare.
// Rigenerarla spegne all'istante quella vecchia.
// ============================================================

export const CAL_ENDPOINT = `${brand.appUrl}/v1/cal`;

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

/** Le istruzioni da consegnare a chi scriverà le richieste. */
export const istruzioniPonte = (chiave: string): string => [
  'PONTE CAL — come scrivere le richieste dentro ESSĒRE.',
  '',
  `Indirizzo: POST ${CAL_ENDPOINT}`,
  'Intestazione: x-cal-key: ' + chiave,
  'Corpo (JSON): { "testo": "<uno o più pacchetti CAL>" }',
  '',
  'Esempio:',
  `curl -X POST ${CAL_ENDPOINT} \\`,
  `  -H "x-cal-key: ${chiave}" \\`,
  '  -H "Content-Type: application/json" \\',
  '  -d \'{"testo":"CAL prenota\\npersona: Maria Rossi\\ntelefono: 333 1234567\\ngiorno: 2026-09-02\\nora: 15:00\\ntipo: visita\\nnote: prima volta"}\'',
  '',
  'Si possono mandare più pacchetti insieme (massimo 20 per volta).',
  'Entrano come RICHIESTE IN ATTESA: nessun appuntamento nasce da qui.',
  'Solo «CAL prenota» entra in coda; gli altri comandi si gestiscono nell\'app.',
  'Chi ha questa chiave scrive richieste e basta: non legge l\'agenda,',
  'non conferma, non cancella. Se la perdi, rigenerala: la vecchia muore.',
  '',
  `Chi non può fare chiamate HTTP usa la pagina: ${brand.appUrl}/cal.html`,
].join('\n');
