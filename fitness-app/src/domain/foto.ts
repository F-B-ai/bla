// ============================================================
// QUANTO DEVE PESARE UNA FOTO CHE PARTE
// ------------------------------------------------------------
// 27 settembre 2026, 19:16, con un allievo davanti: «errore 502»
// sull'analisi posturale. La funzione sul server aveva 256 MiB e
// moriva sotto il peso di quattro foto a risoluzione piena.
//
// La memoria del server è stata alzata quella sera stessa, ed era la
// cosa giusta da fare subito. Ma era una toppa: spedire trenta
// megabyte per farne analizzare l'equivalente di sei è uno spreco
// che si paga due volte — in attesa per chi carica, e in memoria per
// chi riceve.
//
// LA CURA: si ridimensiona prima di partire.
//
// PERCHÉ 1280 E NON DI PIÙ. Una valutazione posturale guarda
// allineamenti, inclinazioni e simmetrie: linee lunghe decine di
// centimetri su un corpo intero. A 1280 pixel sul lato lungo, una
// persona alta 1,75 m occupa circa 1200 pixel — sette pixel per
// centimetro. Il dettaglio che si perde è quello della grana della
// pelle, che non serve a nessuna delle misure che facciamo.
//
// PERCHÉ NON SI RITAGLIA. Ritagliare toglierebbe peso più in fretta,
// ma una posturale ha bisogno della persona INTERA, dalla pianta del
// piede alla sommità del capo: senza i piedi si perde il riferimento
// a terra, e metà delle misure non si possono più fare. Si riduce la
// scala, mai il campo.
// ============================================================

export const FOTO_VERSION = 1;

/** Il lato lungo massimo di una foto che parte per l'analisi. */
export const LATO_MASSIMO = 1280;

/** Quanto si comprime il JPEG. Sotto 0.8 compaiono i gradini sui bordi. */
export const QUALITA = 0.82;

/** Oltre questo, l'API non accetta comunque: si dice prima. */
export const PESO_MASSIMO_MB = 20;

export interface Misure { larghezza: number; altezza: number }

/**
 * Le misure dopo la riduzione, a proporzioni intatte.
 *
 * Una foto già piccola NON si ingrandisce: ingrandire non aggiunge
 * informazione, aggiunge solo peso e sfocatura.
 */
export const misureRidotte = (m: Misure, lato: number = LATO_MASSIMO): Misure => {
  const l = Math.max(1, Math.round(m.larghezza));
  const a = Math.max(1, Math.round(m.altezza));
  const piuLungo = Math.max(l, a);
  if (piuLungo <= lato) return { larghezza: l, altezza: a };
  const fattore = lato / piuLungo;
  return {
    larghezza: Math.max(1, Math.round(l * fattore)),
    altezza: Math.max(1, Math.round(a * fattore)),
  };
};

/** Va ridotta? */
export const daRidurre = (m: Misure, lato: number = LATO_MASSIMO): boolean =>
  Math.max(m.larghezza, m.altezza) > lato;

/**
 * Quanto si risparmia, all'incirca.
 *
 * Il peso di un JPEG va con l'area, non con il lato: dimezzare il
 * lato lungo porta il peso a un quarto. Serve a dirlo, non a
 * decidere: la decisione è già presa da `daRidurre`.
 */
export const risparmioStimato = (m: Misure, lato: number = LATO_MASSIMO): number => {
  if (!daRidurre(m, lato)) return 0;
  const r = misureRidotte(m, lato);
  const prima = m.larghezza * m.altezza;
  const dopo = r.larghezza * r.altezza;
  return Math.round((1 - dopo / prima) * 100);
};

/** Il peso di un base64, in MB: cresce di un terzo rispetto ai byte. */
export const pesoBase64MB = (caratteri: number): number =>
  Math.round((caratteri * 0.75 / (1024 * 1024)) * 10) / 10;

/**
 * Il messaggio per una foto che resta troppo pesante anche ridotta.
 * Dice il peso e dice che fare: un limite senza una via d'uscita è
 * solo una porta chiusa.
 */
export const troppoPesante = (mb: number): string =>
  `Questa foto pesa ${Math.round(mb)} MB e non si riesce ad alleggerirla `
  + `abbastanza (il limite è ${PESO_MASSIMO_MB} MB). Rifalla, oppure `
  + 'ritagliane i bordi — la stanza attorno, mai la persona: per la '
  + 'postura servono i piedi e la testa dentro l\'inquadratura.';
