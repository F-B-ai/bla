// ============================================================
// LA BOZZA DELLA SCHEDA — perché il lavoro non si perde
// ------------------------------------------------------------
// Il titolare, l'11 settembre 2026:
//
//   «Durante la stesura di una programmazione, nel caso in cui per
//    sbaglio dovessi uscire, tutto il lavoro è perso.»
//
// Vero: titolo, allievo e tutti gli esercizi dei sette giorni
// vivevano solo nella memoria della schermata. Un tocco fuori posto,
// una telefonata che porta l'App in secondo piano, il browser che si
// ricarica — e mezz'ora di lavoro spariva senza un avviso.
//
// Lui proponeva due strade: un pulsante da premere ogni tanto, o un
// salvataggio automatico ogni tre minuti. Ho scelto una terza, che
// prende il buono di entrambe:
//
//   **La bozza si salva DA SOLA, sul telefono, a ogni modifica.**
//
// Perché non ogni tre minuti sul server:
//   1. Un salvataggio sul server fallisce proprio quando la
//      connessione va male — cioè spesso nel momento in cui stai per
//      perdere il lavoro. La bozza locale non può fallire.
//   2. Tre minuti di lavoro perso è comunque lavoro perso. Qui non si
//      perde niente: la bozza è sempre vecchia di un secondo.
//   3. Salvare a metà sul server vuol dire creare schede incomplete
//      che l'allievo potrebbe vedere. La bozza non esce dal telefono.
//
// Perché non solo un pulsante: perché un pulsante lo premi finché ci
// pensi, e smetti di pensarci esattamente quando sei concentrato sul
// lavoro — cioè quando servirebbe.
//
// Il pulsante **Salva** resta dov'è, e continua a fare la cosa vera:
// pubblicare la scheda all'allievo. La bozza è una rete, non un
// sostituto.
// ============================================================

export const BOZZA_VERSION = 1;

export interface BozzaScheda {
  /** versione del formato: una bozza vecchia non si prova a leggere */
  v: number;
  allievoId: string;
  titolo: string;
  giornoScelto: number;
  /** gli esercizi, per giorno della settimana (0 = lunedì) */
  eserciziPerGiorno: Record<number, unknown[]>;
  /** se si stava modificando una scheda già esistente */
  pianoInModificaId?: string;
  /** quando è stata scritta, in millisecondi */
  salvataAlle: number;
}

/** Dopo quanto una bozza non si propone più: è roba di un'altra vita. */
export const GIORNI_VALIDITA = 7;

export const contaEsercizi = (
  perGiorno: Record<number, unknown[]> | null | undefined
): number =>
  Object.values(perGiorno || {}).reduce(
    (somma, lista) => somma + (Array.isArray(lista) ? lista.length : 0),
    0
  );

/**
 * Una bozza senza niente dentro non si salva e non si propone.
 * Il titolo da solo non basta: si scrive per primo e non è lavoro.
 */
export const vuota = (b: Partial<BozzaScheda> | null | undefined): boolean => {
  if (!b) return true;
  return contaEsercizi(b.eserciziPerGiorno) === 0;
};

export const scaduta = (b: BozzaScheda, adesso: number = Date.now()): boolean =>
  adesso - b.salvataAlle > GIORNI_VALIDITA * 24 * 60 * 60 * 1000;

/** Si propone di riprendere solo ciò che ha senso riprendere. */
export const daProporre = (
  b: BozzaScheda | null | undefined,
  adesso: number = Date.now()
): boolean => !!b && b.v === BOZZA_VERSION && !vuota(b) && !scaduta(b, adesso);

// ------------------------------------------------------------
// Come si dice il tempo a una persona
// ------------------------------------------------------------

export const quantoFa = (quando: number, adesso: number = Date.now()): string => {
  const secondi = Math.max(0, Math.floor((adesso - quando) / 1000));
  if (secondi < 45) return 'adesso';
  const minuti = Math.round(secondi / 60);
  if (minuti < 60) return minuti === 1 ? 'di un minuto fa' : `di ${minuti} minuti fa`;
  const ore = Math.round(minuti / 60);
  if (ore < 24) return ore === 1 ? 'di un\'ora fa' : `di ${ore} ore fa`;
  const giorni = Math.round(ore / 24);
  return giorni === 1 ? 'di ieri' : `di ${giorni} giorni fa`;
};

const dueCifre = (n: number): string => (n < 10 ? `0${n}` : String(n));

/** La riga sempre visibile in schermata, che dice che la rete c'è. */
export const etichettaSalvataggio = (quando: number | null): string => {
  if (!quando) return '';
  const d = new Date(quando);
  return `Bozza salvata alle ${dueCifre(d.getHours())}:${dueCifre(d.getMinutes())}`;
};

/**
 * Che cosa si legge quando si rientra e c'è del lavoro non finito.
 * Il nome dell'allievo lo passa la schermata: qui non si conosce nessuno.
 */
export const descriviBozza = (
  b: BozzaScheda,
  nomeAllievo?: string | null,
  adesso: number = Date.now()
): string => {
  const n = contaEsercizi(b.eserciziPerGiorno);
  const esercizi = n === 1 ? '1 esercizio' : `${n} esercizi`;
  const titolo = b.titolo?.trim() ? `«${b.titolo.trim()}»` : 'senza titolo';
  const perChi = nomeAllievo?.trim() ? ` per ${nomeAllievo.trim()}` : '';
  return `Scheda ${titolo}${perChi} · ${esercizi} · ${quantoFa(b.salvataAlle, adesso)}`;
};
