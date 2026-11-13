// ============================================================
// L'ASSISTENTE — raccogliere i dati veri
// ------------------------------------------------------------
// Il modello non deve sapere niente da sé: ogni numero che userà
// esce da qui, letto dalla banca dati di ESSĒRE in questo momento.
//
// È il motivo per cui questo file esiste invece di passare le
// risposte grezze a un prompt: `controllaBozza` confronta le cifre
// scritte nella bozza con QUESTA lista. Se la lista fosse
// approssimata, il controllo non varrebbe niente.
//
// Nessuna regola qui: stanno in src/domain/assistente.ts.
// ============================================================

import { getStudentPaymentPlans } from './paymentService';
import { getStudentSessions } from './sessionService';
import { Student, TrainingSession, PaymentPlan } from '../types';
import {
  ContestoAssistente, Bozza, EsitoBozza,
  istruzioniAssistente, leggiBozza, controllaBozza,
} from '../domain/assistente';
import { callClaude } from './aiService';

const giorno = (d: unknown): string => {
  const data = d instanceof Date ? d
    : (d && typeof d === 'object' && 'toDate' in (d as any))
      ? (d as any).toDate()
      : new Date(d as string);
  return isNaN(data?.getTime?.()) ? '' : data.toLocaleDateString('it-IT');
};

const oraDi = (d: unknown): string => {
  const data = d instanceof Date ? d
    : (d && typeof d === 'object' && 'toDate' in (d as any))
      ? (d as any).toDate()
      : new Date(d as string);
  return isNaN(data?.getTime?.()) ? '' : data.toLocaleTimeString('it-IT', {
    hour: '2-digit', minute: '2-digit',
  });
};

const euro = (n: number): string =>
  new Intl.NumberFormat('it-IT', { maximumFractionDigits: 2 }).format(n);

/** Che cosa sappiamo, e che cosa non siamo riusciti a leggere. */
export interface DatiAssistente {
  righe: string[];
  /**
   * Le letture fallite, per nome.
   *
   * Non si nascondono: una lettura fallita e «non c'è niente» si
   * vedrebbero identiche, e l'assistente scriverebbe «non risulta
   * nessuna rata aperta» a una persona che ne ha una scaduta.
   */
  nonLette: string[];
}

/**
 * I dati che l'assistente può usare per questa persona.
 *
 * Ogni riga è una frase intera in italiano: il modello la legge e
 * la cita, non la deve interpretare.
 */
export const datiPerAssistente = async (
  allievo: Student | null
): Promise<DatiAssistente> => {
  const righe: string[] = [];
  const nonLette: string[] = [];

  if (!allievo) {
    return {
      righe: ['Non sappiamo chi scrive: non è un allievo registrato.'],
      nonLette: [],
    };
  }

  righe.push(`Allievo: ${allievo.name} ${allievo.surname}.`);

  // --- Le sedute ---
  try {
    const sedute: TrainingSession[] = await getStudentSessions(allievo.id);
    const adesso = Date.now();
    const future = sedute
      .filter((s) => {
        const d = (s as any).date;
        const t = d instanceof Date ? d.getTime()
          : d?.toDate ? d.toDate().getTime() : new Date(d).getTime();
        return !isNaN(t) && t >= adesso && (s as any).status !== 'cancelled';
      })
      .slice(0, 3);

    if (future.length) {
      future.forEach((s) => {
        const d = (s as any).date;
        righe.push(`Prossima seduta: ${giorno(d)} alle ${oraDi(d)}.`);
      });
    } else {
      righe.push('Non ha sedute future in agenda.');
    }
  } catch (e: any) {
    nonLette.push(`agenda (${e?.message || e})`);
  }

  // --- I pagamenti ---
  try {
    const piani: PaymentPlan[] = await getStudentPaymentPlans(allievo.id);
    const attivo = piani[0];
    if (!attivo) {
      righe.push('Non risulta nessun piano di pagamento aperto.');
    } else {
      const rate = attivo.installments || [];
      righe.push(
        `Percorso: ${rate.length} rate, totale ${euro(attivo.totalAmount || 0)} €.`
      );
      const scadute = rate.filter((r) => r.status === 'overdue');
      const inAttesa = rate.filter((r) => r.status === 'pending');
      scadute.forEach((r) => {
        righe.push(`Rata SCADUTA il ${giorno(r.dueDate)}: ${euro(r.amount)} €. Non risulta saldata.`);
      });
      if (inAttesa.length) {
        const p = inAttesa[0];
        righe.push(`Prossima rata: ${euro(p.amount)} € entro il ${giorno(p.dueDate)}.`);
      }
      if (!scadute.length && !inAttesa.length) {
        righe.push('Tutte le rate risultano saldate.');
      }
      if (typeof attivo.includedLessons === 'number') {
        const usate = attivo.usedLessons || 0;
        righe.push(
          `Lezioni del percorso: ${usate} usate su ${attivo.includedLessons}.`
        );
      }
    }
  } catch (e: any) {
    nonLette.push(`pagamenti (${e?.message || e})`);
  }

  return { righe, nonLette };
};

/** Il contesto pronto da dare al dominio. */
export const contestoPer = (input: {
  messaggio: string;
  allievo: Student | null;
  dati: DatiAssistente;
  oggi?: Date;
}): ContestoAssistente => ({
  oggi: (input.oggi || new Date()).toISOString().slice(0, 10),
  messaggio: input.messaggio,
  contatto: input.allievo
    ? `${input.allievo.name} ${input.allievo.surname}`
    : '',
  dati: input.dati.righe,
});

// ------------------------------------------------------------
// La chiamata
// ------------------------------------------------------------

/**
 * Scrive la bozza di risposta.
 *
 * Nessun prefill JSON qui: il formato è a righe apposta, perché la
 * bozza contiene testo libero con a capo — dentro un JSON quel testo
 * arriverebbe con le virgolette da sistemare e gli a capo scappati,
 * e basterebbe una virgoletta fuori posto per perdere tutto.
 *
 * L'esito NON si prende dal modello: si ricontrolla contro i dati
 * veri con controllaBozza(), che è la rete che conta.
 */
export const scriviBozza = async (
  contesto: ContestoAssistente
): Promise<{ bozza: Bozza; esito: EsitoBozza }> => {
  const risposta = await callClaude(
    [{ role: 'user', content: contesto.messaggio }],
    istruzioniAssistente(contesto),
    900,
    undefined,
    'claude-sonnet-4-5',
    'segreteria'
  );
  const bozza = leggiBozza(risposta);
  return { bozza, esito: controllaBozza(bozza, contesto) };
};
