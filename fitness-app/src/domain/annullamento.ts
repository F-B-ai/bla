// ============================================================
// ANNULLARE UNA SEDUTA — la regola delle dieci ore
// ------------------------------------------------------------
// Il titolare, il 14 settembre 2026:
//
//   «Gli allievi possono annullare entro le 10 ore. Se sono passate
//    le 10 ore si avvisa col messaggio, e il pulsante annulla non
//    funziona: quindi la lezione resta valida.»
//
// Prima non era così. L'App avvisava — «sarà considerata come
// eseguita e verrà addebitata» — e poi offriva **«Annulla comunque»**,
// che annullava davvero. Cioè: il limite si poteva sempre scavalcare,
// bastava toccare il secondo pulsante. Un limite che si può
// scavalcare da soli non è un limite, è un consiglio.
//
// E la stessa frase, con lo stesso secondo pulsante, era scritta in
// TRE schermate diverse, ognuna con la sua copia del numero 10.
// Quattro copie in tutto contando i due servizi. Adesso il numero e
// la decisione vivono qui, e chi deve chiedere «si può?» lo chiede a
// questo file.
//
// ------------------------------------------------------------
// CHI PUÒ ANCORA ANNULLARE
// ------------------------------------------------------------
// Lo STUDIO sì, sempre: se una persona telefona due ore prima perché
// ha avuto un imprevisto vero, quella decisione la prende un essere
// umano, non un contatore di ore. Per questo il messaggio che legge
// l'allievo non finisce con un muro: gli dice di avvisare lo studio.
//
// L'ALLIEVO, da solo, no. E non solo perché il pulsante sparisce:
// anche le regole di Firestore lo impediscono, altrimenti sarebbe
// una porta chiusa con un cartello invece che con una serratura.
// ============================================================

export const ANNULLAMENTO_VERSION = 1;

/** Quante ore prima si può ancora annullare da soli. */
export const ORE_LIMITE = 10;

const ORA = 60 * 60 * 1000;

export type EsitoAnnullamento =
  | 'si_puo'
  | 'troppo_tardi'
  | 'gia_passata'
  | 'non_annullabile'
  | 'data_non_valida';

export interface Verdetto {
  esito: EsitoAnnullamento;
  /** l'unica cosa che la schermata deve guardare per decidere */
  puo: boolean;
  titolo: string;
  messaggio: string;
  /** quante ne mancano davvero, con i decimali */
  ore: number;
}

/**
 * Quante ore mancano alla seduta. Negativo se è già passata.
 * NaN se la data non è una data: chi chiama non deve indovinare.
 */
export const oreMancanti = (quando: Date, adesso: Date = new Date()): number => {
  if (!(quando instanceof Date) || isNaN(quando.getTime())) return NaN;
  return (quando.getTime() - adesso.getTime()) / ORA;
};

/**
 * Come si dice il tempo che manca, in italiano e senza decimali.
 * «2,7 ore» non lo dice nessuno.
 */
export const descriviAttesa = (ore: number): string => {
  if (isNaN(ore)) return 'non so quanto';
  if (ore < 0) return 'è già passata';
  if (ore < 1) return 'meno di un\'ora';
  const n = Math.floor(ore);
  return n === 1 ? 'circa un\'ora' : `circa ${n} ore`;
};

/**
 * Si può annullare?
 *
 * `stato` serve perché una seduta già completata o già annullata non
 * si annulla di nuovo — e dirlo è meglio che lasciare un pulsante che
 * sembra funzionare.
 */
export const valutaAnnullamento = (input: {
  quando: Date;
  stato?: string;
  adesso?: Date;
}): Verdetto => {
  const adesso = input.adesso || new Date();
  const ore = oreMancanti(input.quando, adesso);

  if (isNaN(ore)) {
    return {
      esito: 'data_non_valida', puo: false, ore: NaN,
      titolo: 'Non riesco a leggere la data',
      messaggio: 'Questa seduta ha una data che non riesco a leggere, '
        + 'quindi non posso annullarla da qui. Avvisa lo studio.',
    };
  }

  const stato = input.stato || 'scheduled';
  if (stato !== 'scheduled') {
    return {
      esito: 'non_annullabile', puo: false, ore,
      titolo: 'Non c\'è niente da annullare',
      messaggio: stato === 'completed'
        ? 'Questa seduta risulta già svolta.'
        : 'Questa seduta è già stata annullata.',
    };
  }

  if (ore <= 0) {
    return {
      esito: 'gia_passata', puo: false, ore,
      titolo: 'Seduta già passata',
      messaggio: 'L\'orario di questa seduta è passato: non si annulla più. '
        + 'Se non ci sei stato, parlane con lo studio.',
    };
  }

  if (ore < ORE_LIMITE) {
    return {
      esito: 'troppo_tardi', puo: false, ore,
      titolo: 'Troppo tardi per annullare',
      messaggio: `Le sedute si annullano dall'App fino a ${ORE_LIMITE} ore prima. `
        + `Alla tua manca ${descriviAttesa(ore)}, quindi resta in programma `
        + 'e viene conteggiata.\n\n'
        + 'Se davvero non puoi venire, avvisa subito lo studio: '
        + 'l\'annullamento lo può ancora fare chi ti segue.',
    };
  }

  return {
    esito: 'si_puo', puo: true, ore,
    titolo: 'Annullare questa seduta?',
    messaggio: `Mancano ancora più di ${ORE_LIMITE} ore, quindi non ti viene `
      + 'conteggiata: il posto torna libero e la lezione resta nel tuo percorso.',
  };
};

/**
 * Il limite va detto PRIMA, non quando si tocca il pulsante.
 * Questa è la riga che sta sulla scheda della seduta.
 */
export const avvisoSullaScheda = (
  quando: Date,
  adesso: Date = new Date()
): string | null => {
  const ore = oreMancanti(quando, adesso);
  if (isNaN(ore) || ore <= 0 || ore >= ORE_LIMITE) return null;
  return `Non è più annullabile: mancano meno di ${ORE_LIMITE} ore.`;
};
