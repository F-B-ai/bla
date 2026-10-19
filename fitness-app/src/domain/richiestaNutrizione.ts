// ============================================================
// L'ALLIEVO CHIEDE UNA CONSULENZA NUTRIZIONALE
// ------------------------------------------------------------
// Deciso il 12 ottobre 2026. Fino a oggi, nella sua area, l'allievo
// vedeva le visite che qualcun altro gli aveva fissato e basta. Se
// voleva una consulenza doveva dirlo a voce a chi incontrava — e
// quello che si dice a voce in sala, quasi sempre, non arriva.
//
// LA RICHIESTA NON È UN APPUNTAMENTO. È una domanda: «vorrei
// parlarne». Chi la riceve decide se, quando e con chi — e la decide
// il titolare, perché questa è la regola dello studio: le richieste
// arrivano a lui e a nessun altro.
//
// COSA NON C'È DENTRO, ed è una scelta: nessuna domanda sulla salute,
// nessun elenco di sintomi, nessun obiettivo clinico da spuntare. Una
// richiesta di appuntamento che diventa un questionario sanitario
// raccoglie dati che lo studio non deve avere in quel momento e che
// nessuno leggerà prima della visita. Si chiede quando la persona può
// esserci e, se vuole, una riga sua.
// ============================================================

export const RICHIESTA_NUTRIZIONE_VERSION = 1;

/** Quando può venire. Tre fasce: più di così diventa un'agenda. */
export type FasciaOraria = 'mattina' | 'pomeriggio' | 'sera';

export const FASCE: { valore: FasciaOraria; etichetta: string; quando: string }[] = [
  { valore: 'mattina', etichetta: 'Mattina', quando: '7:00 – 13:00' },
  { valore: 'pomeriggio', etichetta: 'Pomeriggio', quando: '13:00 – 18:00' },
  { valore: 'sera', etichetta: 'Sera', quando: '18:00 – 22:00' },
];

export const MAX_NOTA = 400;

// ------------------------------------------------------------
// 19 ottobre 2026 — L'ORARIO LO DÀ IL NUTRIZIONISTA
// ------------------------------------------------------------
// Prima la richiesta aspettava che il titolare trovasse un buco
// nell'agenda di un'altra persona: per saperlo doveva chiedere, e
// finché non chiedeva la richiesta restava ferma. Adesso l'orario lo
// propone chi quell'agenda ce l'ha in mano.
//
// Il titolare però resta in mezzo, e di proposito: la richiesta
// arriva a lui, la proposta passa da lui, e la visita esiste solo
// quando l'ha confermata. Un tocco, non un lavoro — ma è il tocco che
// tiene il controllo dello studio dove deve stare.
export type StatoRichiestaNutrizione =
  | 'in_attesa'   // l'allievo ha chiesto, nessuno ha ancora proposto
  | 'proposta'    // il nutrizionista ha dato un orario, manca la conferma
  | 'fissata'
  | 'chiusa';

/** Quanto può essere lungo l'orario proposto, scritto a mano. */
export const MAX_ORARIO = 120;

export interface RichiestaNutrizione {
  id?: string;
  studentId: string;
  /** il nome serve a chi legge: cercarlo ogni volta costa una lettura in più */
  allievo: string;
  fasce: FasciaOraria[];
  nota: string;
  stato: StatoRichiestaNutrizione;
  creataIl: Date;
  chiusaIl?: Date | null;
  /** cosa ne è stato, scritto dal titolare quando la chiude */
  esito?: string;
  /** l'orario che il nutrizionista propone, scritto da lui */
  orarioProposto?: string;
  /** chi l'ha proposto: serve all'allievo per sapere chi lo aspetta */
  propostoDa?: string;
  propostoIl?: Date | null;
}

export interface EsitoControllo {
  valido: boolean;
  problemi: string[];
}

/**
 * Una richiesta è valida quando dice almeno QUANDO la persona può.
 *
 * La nota è facoltativa apposta: obbligare a scrivere qualcosa per
 * poter chiedere un appuntamento allontana proprio le persone più
 * timide, che sono quelle che non lo chiederebbero mai a voce.
 */
export const controllaRichiesta = (
  r: Pick<RichiestaNutrizione, 'fasce' | 'nota'>
): EsitoControllo => {
  const problemi: string[] = [];
  const fasce = r?.fasce || [];

  if (fasce.length === 0) {
    problemi.push('Dimmi almeno quando puoi venire: mattina, pomeriggio o sera.');
  }
  if ((r?.nota || '').length > MAX_NOTA) {
    problemi.push(`La nota è lunga ${r.nota.length} caratteri: il massimo è ${MAX_NOTA}. `
      + 'Il resto lo racconti in visita, che è il posto giusto.');
  }

  return { valido: problemi.length === 0, problemi };
};

/**
 * L'orario che il nutrizionista scrive.
 *
 * Campo libero e non un calendario: l'agenda del nutrizionista non sta
 * dentro questa applicazione, e un selettore di data qui mentirebbe
 * sui posti liberi. Si scrive come si direbbe a voce — «martedì 21,
 * alle 18:30» — e chi legge capisce.
 */
export const controllaProposta = (orario: string): EsitoControllo => {
  const problemi: string[] = [];
  const o = (orario || '').trim();

  if (o.length === 0) {
    problemi.push('Scrivi quando puoi riceverlo: giorno e ora.');
  } else if (o.length < 4) {
    problemi.push('Troppo corto per essere un giorno e un\'ora. '
      + 'Scrivilo come lo diresti: «martedì 21, alle 18:30».');
  } else if (o.length > MAX_ORARIO) {
    problemi.push(`Sono ${o.length} caratteri: il massimo è ${MAX_ORARIO}. `
      + 'Qui va solo quando, il resto si dice in visita.');
  }

  return { valido: problemi.length === 0, problemi };
};

// ------------------------------------------------------------
// IL CONTROLLO GENERALE, OGNI QUINDICI GIORNI
// ------------------------------------------------------------
// Non è una consulenza e non si chiede: c'è. Ogni quindici giorni, in
// studio, gratuito per tutti, col nutrizionista e con Francesco
// insieme. Scritto qui perché un servizio che esiste e che nessuno
// sa che esiste è un servizio che non esiste: fino a oggi lo sapeva
// chi per caso era in sala quando se ne parlava.
export const GIORNI_CONTROLLO = 15;

export const TITOLO_CONTROLLO = 'Il controllo generale, ogni 15 giorni';

export const TESTO_CONTROLLO =
  'Ogni quindici giorni c\'è un controllo generale in studio, aperto a tutti '
  + 'gli allievi e gratuito: lo facciamo insieme, il nutrizionista e Francesco. '
  + 'Non devi prenotarlo e non devi chiedere niente — ti diciamo noi la data. '
  + 'Serve a vedere come stai andando: se c\'è qualcosa da cambiare si decide lì.';

/**
 * Quando cade il prossimo controllo, contando di quindici in quindici
 * dal primo. Se la data di partenza non è buona, non si inventa un
 * giorno: si restituisce `null` e lo schermo mostra la cadenza senza
 * la data, che è vero.
 */
export const prossimoControllo = (
  primo: Date | null | undefined,
  adesso: Date = new Date()
): Date | null => {
  if (!(primo instanceof Date) || isNaN(primo.getTime())) return null;
  const giorno = 24 * 60 * 60 * 1000;
  const prossimo = new Date(primo.getTime());
  while (prossimo.getTime() < adesso.getTime()) {
    prossimo.setTime(prossimo.getTime() + GIORNI_CONTROLLO * giorno);
  }
  return prossimo;
};

/**
 * Una richiesta aperta alla volta.
 *
 * Non è un limite burocratico: chi non riceve risposta rimanda, e
 * dieci richieste uguali dello stesso allievo fanno sembrare pieno un
 * elenco che invece contiene una persona sola. Finché quella è
 * aperta, all'allievo si mostra a che punto è.
 */
export const richiestaAperta = (
  richieste: RichiestaNutrizione[]
): RichiestaNutrizione | null =>
  (richieste || []).find((r) => r.stato === 'in_attesa' || r.stato === 'proposta')
  || null;

export const puoChiedere = (richieste: RichiestaNutrizione[]): boolean =>
  richiestaAperta(richieste) === null;

/** «Mattina o sera», pronto da leggere. */
export const descriviFasce = (fasce: FasciaOraria[]): string => {
  const nomi = (fasce || [])
    .map((f) => FASCE.find((x) => x.valore === f)?.etichetta.toLowerCase())
    .filter(Boolean) as string[];
  if (nomi.length === 0) return 'quando capita';
  if (nomi.length === 1) return nomi[0];
  return `${nomi.slice(0, -1).join(', ')} o ${nomi[nomi.length - 1]}`;
};

export interface StatoLeggibile {
  titolo: string;
  testo: string;
}

/**
 * Che cosa legge l'allievo dopo aver chiesto.
 *
 * «In attesa» da solo non dice niente e lascia la persona a
 * controllare l'app ogni giorno. Qui si dice chi ha la richiesta in
 * mano e che cosa succede dopo: è l'unica cosa che toglie l'ansia di
 * essere stati dimenticati.
 */
export const spiegaStato = (r: RichiestaNutrizione | null): StatoLeggibile | null => {
  if (!r) return null;
  if (r.stato === 'in_attesa') {
    return {
      titolo: 'Richiesta inviata',
      testo: 'È arrivata al titolare dello studio, che ti farà sapere quando '
        + 'può fissarla. Non serve richiederla: resta qui finché non ha risposta.',
    };
  }
  if (r.stato === 'proposta') {
    const chi = (r.propostoDa || '').trim();
    return {
      titolo: 'Ti è stato proposto un orario',
      testo: `${chi ? `${chi} ti` : 'Ti'} aspetta ${r.orarioProposto}. `
        + 'Manca solo la conferma dello studio: appena arriva la trovi '
        + 'fra le tue visite. Se quell\'orario non ti va, dillo in chat.',
    };
  }
  if (r.stato === 'fissata') {
    return {
      titolo: 'Visita fissata',
      testo: 'La trovi qui sotto fra le tue visite, con giorno e ora.',
    };
  }
  return {
    titolo: 'Richiesta chiusa',
    testo: r.esito?.trim() || 'Se ti serve ancora, puoi farne una nuova.',
  };
};

/** La riga che il titolare legge nell'elenco. */
export const rigaPerTitolare = (r: RichiestaNutrizione): string => {
  if (r.stato === 'proposta' && r.orarioProposto) {
    const chi = (r.propostoDa || 'il nutrizionista').trim();
    return `${r.allievo} · ${chi} propone: ${r.orarioProposto}`;
  }
  return `${r.allievo} · può ${descriviFasce(r.fasce)}`;
};
