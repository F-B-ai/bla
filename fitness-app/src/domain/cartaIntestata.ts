import { CAMPI_TUTTI } from '../data/onboardingForm';
import { EsitoOnboarding, Risposte } from './onboarding';
import { PERIMETRO } from './perimetro';

// ============================================================
// LA CARTA INTESTATA — il foglio che si consegna dopo il colloquio
// A.S.D. Evolution Sport · Mind Movement Lab
// ------------------------------------------------------------
// Il titolare, il 19 settembre 2026:
//
//   «In base alla scheda di onboarding, scrivendo poche cose che
//    possono interessare all'allievo — innanzitutto l'obiettivo,
//    e alcune cose che abbiamo rilevato, ma NON tutte: ci sono
//    cose che rimangono per noi. Produci una carta intestata in
//    cui posso fare un piccolo preventivo.»
//
// ------------------------------------------------------------
// QUESTO FOGLIO ESCE DALLO STUDIO
// ------------------------------------------------------------
// È la differenza con tutto il resto. La scheda di onboarding la
// leggono due persone. Questo foglio finisce in una borsa, su un
// tavolo di cucina, in mano a un marito, a una figlia, a un altro
// studio se la persona decide di non venire.
//
// Per questo le regole qui sono più strette che altrove:
//
//  1. I campi marcati `sensibile` nella scheda NON escono. Mai.
//     La lista non è scritta qui: si legge dalla scheda, così se
//     un domani se ne marca uno nuovo, sparisce da sé anche da
//     questo foglio.
//
//  2. Le ATTENZIONI del coach non escono. «Verifica prima di
//     assegnare carichi», «sistema già molto attivato»: sono
//     istruzioni per chi programma, non frasi da far leggere alla
//     persona di cui parlano.
//
//  3. Niente punteggi sulla persona. Stress 9 su 10 e «sonno di
//     pessima qualità» sono giudizi: veri, utili a noi, e
//     umilianti su un foglio che si consegna con un preventivo.
//
//  4. Se c'è un limite fisico si dice CHE c'è, mai QUALE. È la
//     stessa regola del gemello, scritta in domain/onboarding.ts
//     dal primo giorno: la sintesi esce, il dettaglio resta.
//
// Quello che esce, allora? L'obiettivo con le parole sue, i fatti
// neutri che spiegano perché il percorso è quello, e i numeri.
// ============================================================

export const CARTA_VERSION = 1;

/**
 * I campi che non escono dalla scheda.
 *
 * Si leggono dal modulo, non da una lista scritta a mano qui: una
 * seconda lista prima o poi diverge, e a divergere sarebbe quella
 * che protegge i dati di salute.
 */
export const CAMPI_SENSIBILI: string[] = CAMPI_TUTTI
  .filter((c: any) => c.sensibile)
  .map((c: any) => c.id);

/** Campi che non sono marcati sensibili ma restano comunque interni. */
export const CAMPI_INTERNI = [
  'stress', 'sonno_qualita', 'blocchi', 'perche_noi', 'provenienza',
];

export const fuoriDallaCarta = (campo: string): boolean =>
  CAMPI_SENSIBILI.includes(campo) || CAMPI_INTERNI.includes(campo);

// ------------------------------------------------------------
// Che cosa si scrive sul foglio
// ------------------------------------------------------------

export interface VocePreventivo {
  descrizione: string;
  importo: number;
}

export interface Carta {
  allievo: string;
  data: Date;
  /** l'obiettivo con le parole sue */
  obiettivoFrase: string;
  obiettivi: string[];
  orizzonte: string | null;
  /** i fatti neutri che spiegano il percorso */
  rilievi: string[];
  voci: VocePreventivo[];
  totale: number;
  rate: number;
  importoRata: number;
  /** righe vuote da riempire a penna, se il preventivo non è stato scritto */
  righeDaRiempire: number;
  validoGiorni: number;
  diciture: string[];
}

/** Per quanti giorni vale il preventivo. */
export const VALIDO_GIORNI = 15;

/** Se non si scrive nessuna voce, il foglio esce con le righe da riempire. */
export const RIGHE_VUOTE = 4;

const testo = (v: unknown): string =>
  typeof v === 'string' ? v.trim() : '';

const numero = (v: unknown): number | null =>
  typeof v === 'number' && !isNaN(v) ? v : null;

const lista = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];

/**
 * I rilievi che si possono consegnare.
 *
 * Fatti, non giudizi. Ognuno risponde alla domanda che la persona
 * si sta facendo davvero: «perché mi propone proprio questo?».
 */
export const rilieviCondivisibili = (
  r: Risposte, e: EsitoOnboarding
): string[] => {
  const risposte = r || {};
  const out: string[] = [];

  const anni = numero(risposte.anni_attivita);
  const freq = numero(risposte.frequenza);
  if (anni !== null && anni > 0) {
    out.push(`Attività fisica alle spalle: ${anni} ${anni === 1 ? 'anno' : 'anni'}.`);
  }
  if (freq !== null) {
    out.push(freq > 0
      ? `Frequenza attuale: ${freq} ${freq === 1 ? 'giorno' : 'giorni'} a settimana.`
      : 'Si riparte da fermi: il primo blocco serve a costruire l\'abitudine, non il carico.');
  }

  const sport = testo(risposte.sport);
  if (sport) out.push(`Sport praticati: ${sport}.`);

  const professione = testo(risposte.professione);
  if (professione) {
    out.push(`Professione: ${professione} — la giornata tipo entra nella programmazione.`);
  }

  const ore = testo(risposte.sonno_ore);
  if (ore) out.push(`Ore di sonno dichiarate: ${ore}. Il recupero fa parte del programma.`);

  const alimentazione = testo(risposte.alimentazione);
  if (alimentazione) out.push(`Alimentazione attuale: ${alimentazione}.`);

  if (testo(risposte.nutrizione_interesse).startsWith('Sì')) {
    out.push('Interesse per il percorso nutrizionale integrato: sì.');
  }

  // REGOLA 4: che c'è, mai quale.
  if (e?.haControindicazioni) {
    out.push(
      'C\'è una condizione fisica da rispettare, che hai dichiarato in sede di '
      + 'colloquio: la programmazione ne tiene conto fin dal primo giorno. '
      + 'Il dettaglio resta nella tua scheda, e non compare su questo foglio.'
    );
  }

  return out;
};

/** Le righe in fondo al foglio. */
export const dicitureCarta = (e: EsitoOnboarding): string[] => {
  const righe = [PERIMETRO];
  const sanitario = (e?.obiettivi || []).some((o) =>
    o.includes('dolore cronico') || o.includes('Riabilitazione'));
  if (sanitario) {
    righe.push(
      'L\'obiettivo indicato ha natura sanitaria: il percorso affianca il '
      + 'professionista sanitario che ti segue, non lo sostituisce.'
    );
  }
  righe.push(`Preventivo valido ${VALIDO_GIORNI} giorni dalla data di emissione.`);
  return righe;
};

const arrotonda2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * Compone il foglio.
 *
 * Se il preventivo non è stato scritto, non si inventa un totale
 * zero: escono le righe vuote, e si riempiono a penna davanti alla
 * persona. Un foglio che dice «Totale: 0 €» è peggio di un foglio
 * con le righe bianche.
 */
export const componiCarta = (input: {
  allievo: string;
  risposte: Risposte;
  esito: EsitoOnboarding;
  voci?: VocePreventivo[];
  rate?: number;
  data?: Date;
}): Carta => {
  const r = input.risposte || {};
  const voci = (input.voci || []).filter(
    (v) => v.descrizione.trim() && v.importo > 0
  );
  const totale = arrotonda2(voci.reduce((s, v) => s + v.importo, 0));
  const rate = input.rate && input.rate > 1 ? Math.floor(input.rate) : 1;

  return {
    allievo: (input.allievo || '').trim() || '________________________',
    data: input.data || new Date(),
    obiettivoFrase: testo(r.obiettivo_principale),
    obiettivi: lista(r.obiettivi),
    orizzonte: input.esito?.orizzonte || null,
    rilievi: rilieviCondivisibili(r, input.esito),
    voci,
    totale,
    rate,
    importoRata: rate > 1 && totale > 0 ? arrotonda2(totale / rate) : 0,
    righeDaRiempire: voci.length ? 0 : RIGHE_VUOTE,
    validoGiorni: VALIDO_GIORNI,
    diciture: dicitureCarta(input.esito),
  };
};

// ------------------------------------------------------------
// Il controllo prima di stampare
// ------------------------------------------------------------

export interface EsitoCarta {
  ok: boolean;
  problemi: string[];
}

/**
 * L'ultima rete prima che il foglio esca.
 *
 * Non si fida della composizione: ricontrolla che nessun testo dei
 * campi sensibili sia finito dentro, comunque ci sia arrivato. Una
 * regola che vive solo nella funzione che compone si aggira alla
 * prima modifica distratta.
 */
export const controllaCarta = (carta: Carta, risposte: Risposte): EsitoCarta => {
  const problemi: string[] = [];
  const dentro = [
    ...(carta.rilievi || []),
    carta.obiettivoFrase || '',
    ...(carta.voci || []).map((v) => v.descrizione),
  ].join(' \n ').toLowerCase();

  CAMPI_SENSIBILI.concat(CAMPI_INTERNI).forEach((campo) => {
    const valore = testo((risposte || {})[campo]);
    // Le risposte corte ('No', 'Sì') coincidono con mezzo vocabolario:
    // si controllano solo i testi che identificano davvero qualcosa.
    if (valore.length >= 12 && dentro.includes(valore.toLowerCase())) {
      problemi.push(
        `Sul foglio è finito il testo del campo «${campo}», che resta a noi. `
        + 'Toglilo prima di consegnarlo.'
      );
    }
  });

  if (!carta.obiettivoFrase && !carta.obiettivi.length) {
    problemi.push(
      'Manca l\'obiettivo: è la prima cosa che la persona cerca sul foglio. '
      + 'Compila «Il tuo obiettivo principale» nella scheda.'
    );
  }

  return { ok: problemi.length === 0, problemi };
};

/** Che cosa si legge prima di stampare. */
export const riepilogaCarta = (carta: Carta): string => {
  const pezzi = [`${carta.rilievi.length} righe di rilievo`];
  if (carta.voci.length) {
    pezzi.push(`preventivo di ${carta.voci.length} voci per ${carta.totale} €`);
    if (carta.rate > 1) pezzi.push(`in ${carta.rate} rate da ${carta.importoRata} €`);
  } else {
    pezzi.push('preventivo da riempire a penna');
  }
  return `Sul foglio: l'obiettivo, ${pezzi.join(', ')}. `
    + 'Il dettaglio di salute e le tue note interne non escono.';
};
