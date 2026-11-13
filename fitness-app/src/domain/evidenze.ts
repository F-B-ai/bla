// ============================================================
// EXECUTIVE — che cosa guardare oggi, e quale decisione propone
// ------------------------------------------------------------
// 11 novembre 2026. Il titolare: un agente centrale che analizzi gli
// indicatori, identifichi le anomalie, proponga decisioni e tenga
// traccia di quello che fa.
//
// Questo è il suo primo pezzo, e fa una cosa sola: legge il rapporto
// del mattino e ne tira fuori le poche righe che meritano una
// decisione, in ordine. Non aggiunge numeri suoi: ogni evidenza cita
// i numeri del rapporto e dice da quale sezione vengono.
//
// CHE COSA NON FA, apposta.
//  • Non decide. Ogni riga finisce con una PROPOSTA: chi decide è il
//    titolare. Nessuna proposta è un'azione che parte da sola.
//  • Non usa intelligenza artificiale. Sono regole scritte, che si
//    leggono qui sotto: la stessa situazione produce la stessa
//    evidenza, e si può sempre risalire al perché.
//  • Non giudica le persone. Dice che cosa risulta nell'applicazione
//    («nessuna seduta registrata»), non che cosa una persona ha fatto
//    o non ha fatto.
//
// La traccia di quello che ha segnalato è il rapporto stesso: ogni
// giorno il foglio salvato porta le sue evidenze, e non si riscrive
// la storia dei giorni passati.
// ============================================================

import { RapportoMattino } from './rapportoMattino';

export const EVIDENZE_VERSIONE = 1;

/** In che ordine vanno guardate. */
export type LivelloEvidenza = 'da fare' | 'da guardare' | 'da sapere';

export interface Evidenza {
  chiave: string;
  livello: LivelloEvidenza;
  titolo: string;
  /** i numeri del rapporto che la motivano */
  perche: string;
  /** che cosa può decidere il titolare: mai un'azione automatica */
  proposta: string;
  /** da quale sezione del rapporto viene */
  sezione: 'incassi' | 'rate' | 'lezioni' | 'collaboratori' | 'dati';
}

// Sotto queste soglie una differenza non si segnala.
export const SCARTO_MINIMO_EURO = 1;
export const GIORNI_RITARDO_LUNGO = 30;

const euro = (x: number): string =>
  `${x.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

const plurale = (n: number, uno: string, tanti: string): string =>
  `${n} ${n === 1 ? uno : tanti}`;

const ORDINE: Record<LivelloEvidenza, number> = { 'da fare': 0, 'da guardare': 1, 'da sapere': 2 };

/**
 * Le evidenze del giorno, dal rapporto. Lista vuota = niente che
 * richieda una decisione: è una risposta, non un vuoto.
 */
export const evidenzeDelGiorno = (r: RapportoMattino): Evidenza[] => {
  const out: Evidenza[] = [];

  // --- bonifici dichiarati: l'allievo aspetta una risposta ---
  if (r.rate.daConfermare.length > 0) {
    const tot = r.rate.daConfermare.reduce((s, x) => s + x.importo, 0);
    out.push({
      chiave: 'bonifici_da_confermare',
      livello: 'da fare',
      titolo: `${plurale(r.rate.daConfermare.length, 'bonifico dichiarato', 'bonifici dichiarati')} da confermare`,
      perche: `${r.rate.daConfermare.map((x) => x.allievo).join(', ')} — ${euro(tot)} in tutto.`,
      proposta: 'Controlla il conto e conferma o rifiuta ogni bonifico in Piani di pagamento.',
      sezione: 'rate',
    });
  }

  // --- sedute fatte e non scalate dal percorso ---
  const daScalare = r.lezioni.righe.filter((x) => x.stato === 'sedute da scalare');
  if (daScalare.length > 0) {
    out.push({
      chiave: 'sedute_da_scalare',
      livello: 'da fare',
      titolo: `${plurale(daScalare.length, 'allievo ha', 'allievi hanno')} sedute non scalate dal percorso`,
      perche: `${daScalare.map((x) => x.allievo).join(', ')}: il percorso è esaurito o manca.`,
      proposta: 'Decidi per ognuno se rinnovare il percorso o scalare le sedute da quello esistente.',
      sezione: 'lezioni',
    });
  }

  // --- percentuali mancanti: la quota non si può calcolare ---
  const senzaPct = r.collaboratori.righe.filter(
    (x) => x.id !== '' && x.rate.numero > 0 && x.quotaCollaboratore === null
  );
  if (senzaPct.length > 0) {
    out.push({
      chiave: 'percentuale_mancante',
      livello: 'da fare',
      titolo: `Percentuale non impostata per ${plurale(senzaPct.length, 'collaboratore', 'collaboratori')}`,
      perche: `${senzaPct.map((x) => `${x.nome} (${euro(x.rate.importo)} di rate nel mese)`).join(', ')}: senza percentuale la quota non si calcola.`,
      proposta: 'Imposta la percentuale nella scheda del collaboratore o dell\'allievo.',
      sezione: 'collaboratori',
    });
  }

  // --- rate scadute ---
  if (r.rate.scadute.length > 0) {
    const piuVecchia = r.rate.scadute.reduce((m, x) => Math.max(m, x.giorni), 0);
    const lunghe = r.rate.scadute.filter((x) => x.giorni > GIORNI_RITARDO_LUNGO).length;
    out.push({
      chiave: 'rate_scadute',
      livello: 'da guardare',
      titolo: `${plurale(r.rate.scadute.length, 'rata scaduta', 'rate scadute')} per ${euro(r.rate.totaleScaduto)}`,
      perche: `La più vecchia è scaduta da ${plurale(piuVecchia, 'giorno', 'giorni')}`
        + (lunghe > 0 ? `; ${lunghe} da più di ${GIORNI_RITARDO_LUNGO} giorni.` : '.'),
      proposta: 'Verifica che non siano pagamenti presi e non segnati; poi decidi a chi mandare il promemoria (lo prepara l\'applicazione, lo invii tu).',
      sezione: 'rate',
    });
  }

  // --- lezioni senza nessun percorso ---
  const senzaPercorso = r.lezioni.righe.filter((x) => x.stato === 'nessun percorso');
  if (senzaPercorso.length > 0) {
    const sedute = senzaPercorso.reduce((s, x) => s + x.sedute, 0);
    out.push({
      chiave: 'lezioni_senza_percorso',
      livello: 'da guardare',
      titolo: `${plurale(senzaPercorso.length, 'allievo ha', 'allievi hanno')} svolto lezioni senza un percorso registrato`,
      perche: `${plurale(sedute, 'seduta', 'sedute')} in tutto: ${senzaPercorso.map((x) => `${x.allievo} (${x.sedute}, con ${x.collaboratore})`).join(', ')}.`,
      proposta: 'Chiedi al collaboratore che cosa è stato concordato, e registra il percorso o segna la prova. Solo dopo, se serve, parlane con l\'allievo.',
      sezione: 'lezioni',
    });
  }

  // --- collaboratori con allievi e nessuna seduta registrata nel mese ---
  const fermi = r.collaboratori.righe.filter((x) => x.id !== '' && x.allievi > 0 && x.sedute === 0);
  if (fermi.length > 0) {
    out.push({
      chiave: 'nessuna_seduta_registrata',
      livello: 'da guardare',
      titolo: `${plurale(fermi.length, 'collaboratore ha', 'collaboratori hanno')} allievi assegnati e nessuna seduta registrata nel mese`,
      perche: `${fermi.map((x) => `${x.nome} (${plurale(x.allievi, 'allievo', 'allievi')})`).join(', ')}. Vuol dire che nell'applicazione non risulta: non che non abbiano lavorato.`,
      proposta: 'Chiedi che le sedute vengano segnate: senza, non si possono calcolare né le lezioni scalate né le quote.',
      sezione: 'collaboratori',
    });
  }

  // --- rate e movimenti che non tornano ---
  const scarto = Math.round((r.incassi.rate.mese.importo - r.incassi.movimenti.mese.importo) * 100) / 100;
  if (Math.abs(scarto) >= SCARTO_MINIMO_EURO) {
    out.push({
      chiave: 'scarto_rate_movimenti',
      livello: 'da sapere',
      titolo: `Rate e movimenti del mese differiscono di ${euro(Math.abs(scarto))}`,
      perche: `Rate segnate pagate: ${euro(r.incassi.rate.mese.importo)}. Movimenti in entrata: ${euro(r.incassi.movimenti.mese.importo)}. I due registri non sono collegati.`,
      proposta: scarto > 0
        ? 'Ci sono rate segnate pagate che non hanno un movimento in entrata: se tieni la contabilità sui movimenti, vanno registrate anche lì.'
        : 'Ci sono movimenti in entrata che non corrispondono a rate segnate pagate: controlla se qualche rata è rimasta da segnare.',
      sezione: 'incassi',
    });
  }

  // --- dati incompleti ---
  if (r.avvisi.length > 0) {
    out.push({
      chiave: 'dati_incompleti',
      livello: 'da sapere',
      titolo: `${plurale(r.avvisi.length, 'dato incompleto', 'dati incompleti')} nel rapporto`,
      perche: r.avvisi.join(' '),
      proposta: 'Completa le date mancanti: finché mancano, quelle registrazioni restano fuori dai conti.',
      sezione: 'dati',
    });
  }

  return out.sort((a, b) => ORDINE[a.livello] - ORDINE[b.livello]);
};

/** Il rapporto insieme alle sue evidenze: è quello che si salva ogni giorno. */
export interface RapportoCompleto extends RapportoMattino {
  evidenze: Evidenza[];
}

export const conEvidenze = (r: RapportoMattino): RapportoCompleto => ({
  ...r,
  evidenze: evidenzeDelGiorno(r),
});
