import { PERIMETRO } from './perimetro';

// ============================================================
// L'ASSISTENTE — scrive la risposta, non la manda
// A.S.D. Evolution Sport · Mind Movement Lab
// ------------------------------------------------------------
// Il titolare, il 19 settembre 2026:
//
//   «Ho bisogno di un'assistente WhatsApp, una per i DM, che non
//    sia io. Soprattutto dove la mia assistente è "il poliziotto
//    cattivo" e io il buono: quando chiedi i soldi a un allievo si
//    crea inevitabilmente attrito. Da 70 messaggi a settimana sono
//    arrivato a zero. Le persone seguivano esattamente le MIE
//    REGOLE, senza alzare un ciglio.»
//
// Il meccanismo è vero e funziona. Una segreteria che applica il
// regolamento non è meno credibile di una persona: è di più,
// perché un regolamento non ha giornate storte.
//
// ------------------------------------------------------------
// TRE REGOLE, E NESSUNA È DECORATIVA
// ------------------------------------------------------------
//
//  1. LA BOZZA NON PARTE DA SOLA. L'assistente scrive, il titolare
//     manda. Scrivere un messaggio costa tre minuti, approvarne uno
//     già scritto ne costa cinque secondi: settanta messaggi sono
//     sei minuti invece di tre ore e mezza. Il guadagno resta,
//     il rischio no.
//
//  2. I NUMERI NON SI INVENTANO. Un importo sbagliato mandato a nome
//     del titolare a una persona che paga non si riprende più, e
//     rovina esattamente il rapporto che questa cosa protegge. Ogni
//     cifra in euro che compare nella bozza deve comparire nei dati
//     che le abbiamo dato. Lo controlla `controllaBozza`, e se manca
//     dice QUALE.
//
//  3. SI FIRMA UN UFFICIO, NON UNA PERSONA. «La segreteria di Mind
//     Movement Lab» esiste: è il titolare e questa applicazione. Un
//     nome di fantasia, prima o poi, qualcuno lo chiede al telefono
//     — e quel momento costa più di tutti i messaggi risparmiati.
// ============================================================

export const ASSISTENTE_VERSION = 1;

/** Chi firma. Un ufficio è vero; una persona inventata no. */
export const FIRMA = 'La segreteria di Mind Movement Lab';

export type Categoria =
  | 'appuntamento'
  | 'informazioni'
  | 'soldi'
  | 'disdetta'
  | 'reclamo'
  | 'personale'
  | 'altro';

export interface RegoleCategoria {
  /** l'assistente prepara una bozza? */
  scrive: boolean;
  /**
   * Può un domani passare in automatico?
   * false qui vuol dire MAI, non «non ancora».
   */
  puoAndareInAutomatico: boolean;
  perche: string;
}

export const REGOLE_CATEGORIA: Record<Categoria, RegoleCategoria> = {
  appuntamento: {
    scrive: true, puoAndareInAutomatico: true,
    perche: 'Proporre un orario libero è reversibile: se sbaglia si risposta.',
  },
  informazioni: {
    scrive: true, puoAndareInAutomatico: true,
    perche: 'Orari, indirizzo, come funziona un percorso: fatti, non decisioni.',
  },
  soldi: {
    scrive: true, puoAndareInAutomatico: false,
    perche: 'Un importo sbagliato a nome tuo non si riprende. Scrive lei, mandi tu. Sempre.',
  },
  disdetta: {
    scrive: true, puoAndareInAutomatico: false,
    perche: 'Dietro una disdetta c\'è quasi sempre qualcosa che va letto da te.',
  },
  reclamo: {
    scrive: true, puoAndareInAutomatico: false,
    perche: 'Chi si lamenta sta ancora parlando con te: è il momento in cui si tiene o si perde una persona.',
  },
  personale: {
    scrive: false, puoAndareInAutomatico: false,
    perche: 'Non è lavoro. L\'assistente non ci mette bocca: ti avvisa e basta.',
  },
  altro: {
    scrive: true, puoAndareInAutomatico: false,
    perche: 'Se non si capisce in quale cassetto va, non va da sola da nessuna parte.',
  },
};

export const CATEGORIE = Object.keys(REGOLE_CATEGORIA) as Categoria[];

/** Le categorie che non andranno in automatico nemmeno fra un anno. */
export const MAI_IN_AUTOMATICO: Categoria[] = CATEGORIE
  .filter((c) => !REGOLE_CATEGORIA[c].puoAndareInAutomatico);

// ------------------------------------------------------------
// La voce
// ------------------------------------------------------------

/**
 * Come scrive la segreteria.
 *
 * «Calda ma decisa» non è un ossimoro: è una persona che ti vuole
 * bene e non cambia le regole per farti contento.
 */
export const VOCE: string[] = [
  'Diretta: si dice la cosa nella prima riga, non alla terza.',
  'Calda ma decisa: gentile nel tono, ferma nel contenuto.',
  'Breve: due o tre frasi. Se serve di più, serve una telefonata.',
  'Mai formule da ufficio: niente «La informiamo che», «Gentile utente», «cordiali saluti».',
  'Niente entusiasmo finto e niente punti esclamativi a raffica.',
  'Dà sempre un passo concreto: che cosa succede adesso, e che cosa deve fare la persona.',
  'Del «no» dice il motivo, una volta, senza scusarsi tre volte.',
];

// ------------------------------------------------------------
// Che cosa le diamo in mano
// ------------------------------------------------------------

export interface ContestoAssistente {
  /** oggi, YYYY-MM-DD: senza, «giovedì» non vuol dire niente */
  oggi: string;
  /** il messaggio arrivato, testuale */
  messaggio: string;
  /** chi è, se l'abbiamo riconosciuto */
  contatto: string;
  /**
   * I dati che l'assistente PUÒ usare, già composti da noi.
   * Ogni numero che userà deve venire da qui.
   */
  dati: string[];
}

/**
 * Le istruzioni per il modello.
 *
 * Il divieto sui numeri è ripetuto due volte, in apertura e in
 * chiusura: è l'unica cosa che, se salta, manda a una persona che
 * paga una cifra che non deve.
 */
export const istruzioniAssistente = (c: ContestoAssistente): string => `
Sei la segreteria di Mind Movement Lab, lo studio di Francesco Busanca a Gragnano.
Scrivi la RISPOSTA a un messaggio ricevuto. Non la mandi tu: la rilegge Francesco.

Oggi è ${c.oggi}.
${c.contatto ? `Chi scrive: ${c.contatto}.` : 'Non sappiamo chi scrive.'}

REGOLA PRIMA, SOPRA OGNI ALTRA
Non inventare NESSUN numero. Importi, rate, scadenze, orari, date: usa solo
quelli scritti qui sotto. Se un dato ti serve e non c'è, NON stimarlo:
scrivilo tra i problemi e lascia la frase senza il numero.

DATI CHE PUOI USARE
${c.dati.length ? c.dati.map((d) => `- ${d}`).join('\n') : '- (nessuno)'}

COME SCRIVI
${VOCE.map((v) => `- ${v}`).join('\n')}
- Ti firmi «${FIRMA}». Mai con un nome di persona.
- Non sei Francesco e non scrivi come se lo fossi: sei la sua segreteria.
- Non prometti risultati di salute. ${PERIMETRO}

IL MESSAGGIO RICEVUTO
"""
${c.messaggio}
"""

RISPONDI ESATTAMENTE IN QUESTO FORMATO, NIENT'ALTRO:
CATEGORIA: una fra ${CATEGORIE.join(' | ')}
PERCHE: perché hai scelto quella categoria, una riga
BOZZA:
(la risposta da mandare, a capo liberi)
FINE BOZZA
PROBLEMI: i dati che ti sono mancati, separati da ; — oppure "nessuno"

Ricorda: nessun numero che non sia nei DATI qui sopra.
`.trim();

// ------------------------------------------------------------
// Rileggere quello che ha scritto
// ------------------------------------------------------------

export interface Bozza {
  categoria: Categoria;
  perche: string;
  testo: string;
  problemi: string[];
}

const VUOTA: Bozza = {
  categoria: 'altro', perche: '', testo: '', problemi: [],
};

const dopo = (grezzo: string, etichetta: string): string => {
  const re = new RegExp(`^\\s*${etichetta}\\s*:\\s*(.*)$`, 'im');
  const m = grezzo.match(re);
  return m ? m[1].trim() : '';
};

/**
 * Dal testo del modello alla bozza.
 *
 * La categoria non si prende per buona alla cieca: se non è una di
 * quelle che conosciamo diventa `altro`, che è la più prudente —
 * non va mai in automatico.
 */
export const leggiBozza = (grezzo: string): Bozza => {
  const t = String(grezzo || '');
  if (!t.trim()) return { ...VUOTA, problemi: ['L\'assistente non ha risposto.'] };

  const cat = dopo(t, 'CATEGORIA').toLowerCase().replace(/[^a-z]/g, '');
  const categoria = (CATEGORIE as string[]).includes(cat)
    ? (cat as Categoria)
    : 'altro';

  const m = t.match(/BOZZA\s*:\s*([\s\S]*?)(?:\n\s*FINE BOZZA|$)/i);
  const testo = m ? m[1].trim() : '';

  const probGrezzi = dopo(t, 'PROBLEMI');
  const problemi = (!probGrezzi || /^nessuno\.?$/i.test(probGrezzi))
    ? []
    : probGrezzi.split(';').map((x) => x.trim()).filter(Boolean);

  return {
    categoria,
    perche: dopo(t, 'PERCHE') || dopo(t, 'PERCHÉ'),
    testo,
    problemi,
  };
};

// ------------------------------------------------------------
// Il controllo prima di consegnarla al titolare
// ------------------------------------------------------------

export interface EsitoBozza {
  ok: boolean;
  /** cose che fermano la bozza */
  gravi: string[];
  /** cose da guardare, non bloccanti */
  avvisi: string[];
}

/** Ogni cifra seguita da € o «euro», normalizzata. */
export const importiIn = (testo: string): string[] => {
  const out: string[] = [];
  const re = /(\d{1,3}(?:[.\s]\d{3})*(?:[.,]\d{1,2})?)\s*(?:€|eur\b|euro\b)/gi;
  let m = re.exec(testo || '');
  while (m) {
    out.push(m[1].replace(/[.\s]/g, '').replace(',', '.').replace(/\.00$/, ''));
    m = re.exec(testo || '');
  }
  return out;
};

const FORMULE = [
  'la informiamo che', 'gentile utente', 'cordiali saluti',
  'distinti saluti', 'in attesa di un suo riscontro', 'la ringraziamo per',
];

const PROMESSE = ['guarire', 'guarirà', 'curare', 'curerà', 'diagnosi', 'risolverà il dolore'];

/**
 * L'ultima rete prima che la bozza arrivi sotto gli occhi del
 * titolare — e, con un dito, sotto quelli di una persona che paga.
 *
 * Non si fida di quello che ha scritto il modello: ricontrolla il
 * testo contro i dati che gli erano stati dati. Un divieto scritto
 * solo nel prompt è un divieto che il modello può dimenticare.
 */
export const controllaBozza = (b: Bozza, c: ContestoAssistente): EsitoBozza => {
  const gravi: string[] = [];
  const avvisi: string[] = [];
  const testo = b?.testo || '';

  if (!testo.trim()) {
    return { ok: false, gravi: ['La bozza è vuota.'], avvisi: [] };
  }

  // REGOLA 2: ogni euro deve venire dai dati.
  const consentiti = new Set(importiIn((c?.dati || []).join(' ')));
  importiIn(testo).forEach((imp) => {
    if (!consentiti.has(imp)) {
      gravi.push(
        `Nella bozza c'è «${imp} €», che non sta nei dati che le abbiamo dato. `
        + 'Non mandarla: o il numero è sbagliato, o se l\'è inventato.'
      );
    }
  });

  // REGOLA 3: si firma un ufficio.
  if (!testo.includes(FIRMA)) {
    avvisi.push(`Manca la firma «${FIRMA}».`);
  }
  if (/^\s*(francesco|giuseppe)\s*$/im.test(testo)) {
    gravi.push(
      'La bozza si firma con un nome di persona. La segreteria è un ufficio, '
      + 'e a nome tuo scrivi tu.'
    );
  }

  const basso = testo.toLowerCase();
  PROMESSE.forEach((p) => {
    if (basso.includes(p)) {
      gravi.push(`La bozza contiene «${p}»: è fuori dal nostro perimetro.`);
    }
  });
  FORMULE.forEach((f) => {
    if (basso.includes(f)) avvisi.push(`Suona da ufficio postale: «${f}».`);
  });

  if (testo.length > 700) {
    avvisi.push('È lunga: su WhatsApp due o tre frasi si leggono, dieci righe no.');
  }
  (b.problemi || []).forEach((p) => avvisi.push(`Le è mancato un dato: ${p}`));

  return { ok: gravi.length === 0, gravi, avvisi };
};

/** Che cosa si legge sopra la bozza, prima di copiarla. */
export const spiegaBozza = (b: Bozza): string => {
  const r = REGOLE_CATEGORIA[b.categoria];
  if (!r.scrive) {
    return `Questo è un messaggio ${b.categoria}: l'assistente non ci mette bocca. ${r.perche}`;
  }
  return `Letto come «${b.categoria}». ${r.perche}`
    + (r.puoAndareInAutomatico
      ? ''
      : ' Questa categoria non andrà mai in automatico: la mandi sempre tu.');
};
