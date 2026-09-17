// ============================================================
// IL PATTO FIRMATO — la copia che resta
// ------------------------------------------------------------
// Il titolare, il 17 settembre 2026:
//
//   «Come faccio ad allegare la firma sul patto? Vorrei anche una
//    copia digitale, oltreché cartacea, da mantenere nell'app.»
//
// La schermata del Patto gli diceva già «fotografa la copia firmata
// e allegala al profilo». Quel punto di aggancio NON ESISTEVA: un
// altro cartello davanti a una porta murata.
//
// ------------------------------------------------------------
// PERCHÉ NON SI FIRMA COL DITO
// ------------------------------------------------------------
// La decisione era già nel codice, ed è giusta: una firma-immagine
// applicata in automatico non è una firma valida, e in una
// contestazione conta meno di niente. Si firma su carta, davanti, in
// due copie. Qui si conserva la PROVA di quella firma.
//
// ------------------------------------------------------------
// LA FOTO NON BASTA: SI CONGELA ANCHE IL TESTO
// ------------------------------------------------------------
// Il patto si genera al volo dalle regole correnti. Se un domani
// cambiano le dieci ore di disdetta, o i giorni di sospensione, o i
// prezzi, nessuno è più in grado di ricostruire CHE COSA ha firmato
// una persona oggi: la schermata mostrerebbe le regole nuove sopra
// una firma vecchia.
//
// Quindi accanto alla foto si salva il testo esatto del momento.
// La foto prova CHE ha firmato. Il testo dice CHE COSA.
// ============================================================

export const PATTO_FIRMATO_VERSION = 1;

/** Quanto può pesare la foto di una pagina firmata. */
export const MAX_MB = 12;

/** Che cosa si accetta: una foto o un PDF scansionato. */
export const TIPI_AMMESSI = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/webp',
  'application/pdf',
];

export interface SnapshotPatto {
  /** la versione del testo del patto al momento della firma */
  versioneTesto: number;
  /** il testo per intero, come è stato stampato */
  testo: string;
  /** i numeri che contano, estratti per poterli leggere senza rileggere tutto */
  percorso: string;
  rate: number;
  importoRata: number;
  disdettaOre: number;
}

export interface PattoFirmato {
  id: string;
  studentId: string;
  studentName: string;
  /** il giorno in cui è stato firmato sulla carta */
  firmatoIl: Date;
  /** quando è stata allegata la copia */
  allegatoIl: Date;
  /** chi l'ha allegata */
  allegatoDa: string;
  /** dove sta la foto o il PDF */
  fileUrl: string;
  fileTipo: string;
  /** il percorso nello Storage, per poterla togliere davvero */
  filePath?: string;
  snapshot: SnapshotPatto;
}

// ------------------------------------------------------------
// Si può allegare?
// ------------------------------------------------------------

export interface EsitoAllegato {
  ok: boolean;
  problemi: string[];
}

export const controllaAllegato = (file: {
  tipo?: string;
  byte?: number;
  nome?: string;
}): EsitoAllegato => {
  const problemi: string[] = [];
  const tipo = (file?.tipo || '').toLowerCase();
  const byte = file?.byte || 0;

  if (!tipo) {
    problemi.push('Non riesco a capire che tipo di file è.');
  } else if (!TIPI_AMMESSI.includes(tipo)) {
    problemi.push(
      'Si allega una foto della pagina firmata, oppure una scansione in PDF. '
      + `Questo è «${tipo}».`
    );
  }
  if (byte <= 0) {
    problemi.push('Il file sembra vuoto.');
  } else if (byte > MAX_MB * 1024 * 1024) {
    const mb = Math.round(byte / (1024 * 1024));
    problemi.push(
      `La foto pesa ${mb} MB, il massimo è ${MAX_MB}. `
      + 'Rifalla con meno risoluzione, o scansionala in PDF.'
    );
  }
  return { ok: problemi.length === 0, problemi };
};

// ------------------------------------------------------------
// La data della firma
// ------------------------------------------------------------
// Non è il giorno della foto. Si firma di persona, e la foto può
// arrivare il giorno dopo o la settimana dopo: la data di un
// contratto non si indovina da quando qualcuno ha aperto l'app.
// ------------------------------------------------------------

const dueCifre = (n: number): string => (n < 10 ? `0${n}` : String(n));

/** Una data in «17/09/2026», come la si scrive a mano. */
export const scriviGiorno = (d: Date): string =>
  d instanceof Date && !isNaN(d.getTime())
    ? `${dueCifre(d.getDate())}/${dueCifre(d.getMonth() + 1)}/${d.getFullYear()}`
    : '';

/**
 * Rilegge quella data. Restituisce null se non è una data vera:
 * il 31/02 non esiste, e un contratto datato a un giorno che non
 * esiste è peggio di un contratto senza data.
 */
export const leggiGiorno = (testo: string): Date | null => {
  const m = (testo || '').trim().match(/^(\d{1,2})\s*[/\-.]\s*(\d{1,2})\s*[/\-.]\s*(\d{4})$/);
  if (!m) return null;
  const g = Number(m[1]);
  const me = Number(m[2]);
  const a = Number(m[3]);
  const d = new Date(a, me - 1, g);
  if (d.getFullYear() !== a || d.getMonth() !== me - 1 || d.getDate() !== g) return null;
  return d;
};

// ------------------------------------------------------------
// Che cosa si legge sullo schermo
// ------------------------------------------------------------

const giornoItaliano = (d: Date): string =>
  d instanceof Date && !isNaN(d.getTime())
    ? d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'data non nota';

/** La riga sul profilo dell'allievo. */
export const descriviPattoFirmato = (p: PattoFirmato | null): string => {
  if (!p) {
    return 'Nessun patto firmato allegato. Stampalo, fallo firmare in due '
      + 'copie e fotografa quella dello studio.';
  }
  return `Patto firmato il ${giornoItaliano(p.firmatoIl)}`
    + (p.snapshot?.percorso ? ` — ${p.snapshot.percorso}` : '')
    + '. La copia è qui: si apre e si legge.';
};

/**
 * Che cosa si legge prima di allegare.
 * Non «sei sicuro?»: che cosa resta scritto, e perché.
 */
export const confermaAllegato = (nome: string, quando: Date): string =>
  `Stai allegando il patto firmato di ${nome.trim() || 'questa persona'}, `
  + `datato ${giornoItaliano(quando)}.\n\n`
  + 'Insieme alla foto resta scritto il TESTO esatto di oggi: se un domani '
  + 'le regole cambiano, si potrà sempre vedere che cosa ha firmato.\n\n'
  + 'La copia di carta resta la firma valida: questa è la prova che la '
  + 'conserva.';

/**
 * Cancellare la copia di un contratto firmato non è un'operazione
 * qualunque: si dice che cosa sparisce e che la carta resta l'unica.
 */
export const confermaCancellazione = (nome: string): string =>
  `Stai per togliere la copia digitale del patto di ${nome.trim() || 'questa persona'}.\n\n`
  + 'Da quel momento l\'unica prova resta la copia di carta. Non si '
  + 'recupera: se ti serve di nuovo, andrà rifotografata.';
