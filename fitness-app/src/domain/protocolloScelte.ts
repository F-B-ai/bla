import { Priorita, AreaLavoro } from './protocollo';

// ============================================================
// LE SCELTE DEL DIRETTORE TECNICO
// A.S.D. Evolution Sport · Mind Movement Lab
// ------------------------------------------------------------
// Il titolare, il 18 settembre 2026:
//
//   «Oltre alle informazioni e alle indicazioni attraverso i test,
//    voglio aggiungere io o modificare qualcosa, anche in base alle
//    esigenze dell'allievo in termini economici o di tempo.»
//
// Fino a qui il protocollo lo decideva il codice. Le soglie
// accendevano le priorità, l'ordine era quello delle regole, e chi
// aveva davanti la persona poteva solo stampare.
//
// È sbagliato al contrario: gli strumenti misurano, le persone
// decidono. Una macchina non sa che quella signora fa la cassiera
// in piedi otto ore, che il ginocchio fa male solo in discesa, che
// ci sono due mesi prima del matrimonio della figlia.
//
// ------------------------------------------------------------
// LA REGOLA CHE NON SI ROMPE
// ------------------------------------------------------------
// Quello che aggiunge lui nasce marcato «riferito, non misurato».
// Non perché valga meno — spesso vale di più — ma perché il giorno
// in cui qualcuno legge quel foglio deve poter distinguere che cosa
// è uscito da uno strumento e che cosa dall'occhio di chi guardava.
//
// È la stessa regola che il protocollo ha scritta in cima dal primo
// giorno: «un'area senza misura resta dichiarata non misurata: non
// si riempie con un'ipotesi». La sua osservazione non è un'ipotesi,
// ma non è nemmeno una misura, e le due cose non si mescolano.
//
// ------------------------------------------------------------
// E IL MOTIVO SI SCRIVE
// ------------------------------------------------------------
// Mettere da parte una priorità che una misura ha acceso è una
// decisione vera: si scrive perché. Serve a lui fra sei mesi, serve
// all'allievo che vede una scelta e non un capriccio, e serve il
// giorno in cui qualcuno chiede conto di quel foglio.
//
// Spostare l'ordine no: quella è solo sequenza di lavoro.
// ============================================================

export const PROTOCOLLO_SCELTE_VERSION = 1;

/** Sotto questa lunghezza, un motivo non è un motivo. */
export const MOTIVO_MINIMO = 8;

/** Da dove viene una priorità del protocollo. */
export type Origine = 'misurata' | 'riferita';

export interface PrioritaScelta extends Priorita {
  origine: Origine;
  /** perché il direttore tecnico l'ha aggiunta (solo per le riferite) */
  motivo?: string;
}

/** Una priorità che le misure avevano acceso e che si è messa da parte. */
export interface MessaDaParte {
  titolo: string;
  motivo: string;
}

/**
 * Le decisioni prese sopra il referto.
 *
 * Non contiene le priorità: contiene che cosa è stato FATTO alle
 * priorità. Il referto resta quello che è, e si può sempre rileggere
 * senza le scelte sopra.
 */
export interface Scelte {
  /** i titoli messi da parte, col perché */
  messeDaParte: MessaDaParte[];
  /** le priorità aggiunte a mano, sempre «riferite» */
  aggiunte: PrioritaScelta[];
  /** l'ordine voluto: titoli, dal primo all'ultimo */
  ordine: string[];
  /** la riga del direttore tecnico sul foglio dell'allievo */
  nota: string;
  /** perché quel numero di sedute, quel ritmo, quelle rate */
  motivoPiano: string;
}

export const SCELTE_VUOTE: Scelte = {
  messeDaParte: [], aggiunte: [], ordine: [], nota: '', motivoPiano: '',
};

// ------------------------------------------------------------
// Il motivo è scritto davvero?
// ------------------------------------------------------------

export interface EsitoMotivo {
  ok: boolean;
  problema: string;
}

/**
 * Un trattino non è un motivo, e nemmeno «ok».
 * Chi scrive «-» per togliersi il campo di torno non sta decidendo:
 * sta aggirando la domanda, e fra sei mesi non saprà perché.
 */
export const controllaMotivo = (motivo: string): EsitoMotivo => {
  const t = (motivo || '').trim();
  if (!t) return { ok: false, problema: 'Scrivi perché: serve a te fra sei mesi.' };
  if (!/[a-zA-ZàèéìòùÀÈÉÌÒÙ]/.test(t)) {
    return { ok: false, problema: 'Scrivi il motivo a parole, non un segno.' };
  }
  if (t.length < MOTIVO_MINIMO) {
    return {
      ok: false,
      problema: `Un motivo di ${t.length} caratteri non dice niente. `
        + 'Bastano poche parole: «lavora in piedi», «ha due mesi».',
    };
  }
  return { ok: true, problema: '' };
};

// ------------------------------------------------------------
// Aggiungere una priorità propria
// ------------------------------------------------------------

export interface EsitoAggiunta {
  ok: boolean;
  problemi: string[];
  /** pronta da mettere nelle scelte, se ok */
  priorita?: PrioritaScelta;
}

/**
 * La priorità che mette lui.
 *
 * L'origine NON è un parametro: è sempre «riferita». Non si può
 * chiamare questa funzione in modo da ottenere una priorità che si
 * spaccia per misurata, e questo è voluto.
 */
export const aggiungiPriorita = (input: {
  titolo: string;
  area: AreaLavoro;
  comeSiLavora: string;
  motivo: string;
  forza?: 'alta' | 'media';
}): EsitoAggiunta => {
  const problemi: string[] = [];
  const titolo = (input.titolo || '').trim();
  const come = (input.comeSiLavora || '').trim();

  if (titolo.length < 3) problemi.push('Dai un titolo alla priorità: due o tre parole.');
  if (come.length < MOTIVO_MINIMO) {
    problemi.push('Scrivi che cosa si fa in pratica: è la parte che l\'allievo legge e mette in atto.');
  }
  const m = controllaMotivo(input.motivo);
  if (!m.ok) problemi.push(`Su che cosa la basi? ${m.problema}`);

  if (problemi.length) return { ok: false, problemi };
  return {
    ok: true,
    problemi: [],
    priorita: {
      area: input.area,
      titolo,
      perche: (input.motivo || '').trim(),
      comeSiLavora: come,
      // Una priorità riferita non ha misure: dirlo è la cosa onesta.
      misure: [],
      forza: input.forza || 'media',
      origine: 'riferita',
      motivo: (input.motivo || '').trim(),
    },
  };
};

// ------------------------------------------------------------
// Il protocollo finale: referto + scelte
// ------------------------------------------------------------

/**
 * Le priorità su cui si lavora davvero.
 *
 * Il referto entra intero, le messe da parte escono, le aggiunte
 * entrano, e l'ordine è quello voluto. Quello che l'ordine non
 * nomina resta in coda nell'ordine in cui stava: una priorità non
 * sparisce mai per una dimenticanza: si toglie solo dicendo perché.
 */
export const prioritaFinali = (
  lette: Priorita[],
  scelte: Scelte = SCELTE_VUOTE
): PrioritaScelta[] => {
  const fuori = new Set((scelte.messeDaParte || []).map((x) => x.titolo));
  const misurate: PrioritaScelta[] = (lette || [])
    .filter((p) => !fuori.has(p.titolo))
    .map((p) => ({ ...p, origine: 'misurata' as Origine }));
  const tutte = [...misurate, ...(scelte.aggiunte || [])];

  const ordine = scelte.ordine || [];
  const posizione = (p: PrioritaScelta): number => {
    const i = ordine.indexOf(p.titolo);
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };
  return tutte
    .map((p, i) => ({ p, i }))
    .sort((a, b) => (posizione(a.p) - posizione(b.p)) || (a.i - b.i))
    .map((x) => x.p);
};

/** Quante ne ha toccate: serve a sapere se c'è qualcosa da raccontare. */
export const quanteScelte = (scelte: Scelte = SCELTE_VUOTE): number =>
  (scelte.messeDaParte?.length || 0)
  + (scelte.aggiunte?.length || 0)
  + (scelte.nota?.trim() ? 1 : 0)
  + (scelte.motivoPiano?.trim() ? 1 : 0);

// ------------------------------------------------------------
// Come si legge sul foglio dell'allievo
// ------------------------------------------------------------

/** Il cartellino accanto a una priorità aggiunta a mano. */
export const ETICHETTA_RIFERITA = 'riferita, non misurata';

export const marcaOrigine = (p: PrioritaScelta): string =>
  p.origine === 'riferita' ? ` (${ETICHETTA_RIFERITA})` : '';

/**
 * Le righe della sezione «Le scelte del direttore tecnico».
 *
 * Esiste solo se ci sono scelte: un titolo vuoto su un documento
 * che si consegna a una persona è peggio che non averlo.
 */
export const righeScelte = (scelte: Scelte = SCELTE_VUOTE): string[] => {
  const righe: string[] = [];
  (scelte.aggiunte || []).forEach((p) => {
    righe.push(`Aggiunta: ${p.titolo} — ${p.motivo || p.perche}. `
      + `Non nasce da una misura: è un'osservazione raccolta di persona (${ETICHETTA_RIFERITA}).`);
  });
  (scelte.messeDaParte || []).forEach((m) => {
    righe.push(`Messa da parte per ora: ${m.titolo} — ${m.motivo}. `
      + 'La misura che l\'aveva accesa resta scritta qui sopra, e si riprende quando è il momento.');
  });
  if (scelte.motivoPiano?.trim()) {
    righe.push(`Sul numero di sedute e sul ritmo: ${scelte.motivoPiano.trim()}`);
  }
  return righe;
};

/**
 * Che cosa si legge prima di stampare.
 * Non «sei sicuro?»: che cosa sta per leggere la persona.
 */
export const riepilogaScelte = (scelte: Scelte = SCELTE_VUOTE): string => {
  const n = quanteScelte(scelte);
  if (n === 0) {
    return 'Il protocollo è quello che esce dalle misure, senza tue modifiche.';
  }
  const pezzi: string[] = [];
  const agg = scelte.aggiunte?.length || 0;
  const via = scelte.messeDaParte?.length || 0;
  if (agg) pezzi.push(`${agg} ${agg === 1 ? 'priorità aggiunta' : 'priorità aggiunte'} da te`);
  if (via) pezzi.push(`${via} ${via === 1 ? 'messa da parte' : 'messe da parte'}`);
  if (scelte.nota?.trim()) pezzi.push('la tua nota');
  if (scelte.motivoPiano?.trim()) pezzi.push('il motivo del piano');
  return `Sul foglio dell'allievo finiscono anche: ${pezzi.join(', ')}. `
    + 'Quello che hai aggiunto è marcato come osservazione, non come misura.';
};
