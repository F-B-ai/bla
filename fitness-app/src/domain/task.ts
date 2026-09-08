// ============================================================
// LA DATA DI UN TASK
// ------------------------------------------------------------
// Il difetto trovato: createTask scriveva `date: Timestamp.now()`
// a codice fisso. Il giorno scelto nel modale arrivava fino al
// servizio e lì veniva buttato via, così ogni task nasceva oggi.
// updateTask invece la data la rispettava — ed è per questo che
// la correzione a mano funzionava, e che il difetto sembrava
// «l'app me lo sposta» invece di «l'app non lo scrive».
//
// La logica sta qui, fuori da Firestore, perché si possa provare
// senza database: una data sbagliata su un'agenda è un
// appuntamento perso, non un dettaglio.
// ============================================================

/** Mezzogiorno: nessun fuso orario può spostare il giorno. */
const ORA_SICURA = 12;

const valida = (d: Date): boolean => d instanceof Date && !Number.isNaN(d.getTime());

/**
 * Il giorno «YYYY-MM-DD» del campo diventa mezzogiorno LOCALE di
 * quel giorno. Costruirlo dai pezzi, e non con new Date(stringa),
 * evita l'insidia nota: la forma solo-data è interpretata come
 * UTC, e a ovest di Greenwich il task finirebbe al giorno prima.
 */
export const daCampoGiorno = (giorno: string): Date | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((giorno || '').trim());
  if (!m) return null;
  const [, a, me, g] = m;
  const anno = Number(a);
  const mese = Number(me);
  const giornoNum = Number(g);
  if (mese < 1 || mese > 12 || giornoNum < 1 || giornoNum > 31) return null;
  const d = new Date(anno, mese - 1, giornoNum, ORA_SICURA, 0, 0, 0);
  // Il 31 febbraio diventerebbe il 3 marzo senza questo controllo.
  if (d.getFullYear() !== anno || d.getMonth() !== mese - 1 || d.getDate() !== giornoNum) {
    return null;
  }
  return d;
};

/**
 * La data scelta, oppure null se non è stato scelto niente di
 * leggibile. Restituire null invece di ripiegare è ciò che permette
 * a chi modifica un task di NON toccarne la data quando il valore
 * arrivato è illeggibile: in una modifica, ripiegare su «adesso»
 * sarebbe esattamente il difetto che stiamo chiudendo.
 */
export const dataScelta = (
  scelta: Date | string | null | undefined
): Date | null => {
  if (scelta instanceof Date) return valida(scelta) ? scelta : null;

  if (typeof scelta === 'string') {
    const testo = scelta.trim();
    // Chi ha la FORMA del campo giorno passa solo da daCampoGiorno.
    // Senza questa guardia il ripiego generico qui sotto accetterebbe
    // «2026-02-31» e lo trasformerebbe nel 3 marzo, in silenzio.
    if (/^\d{4}-\d{2}-\d{2}$/.test(testo)) return daCampoGiorno(testo);
    const d = new Date(testo);
    return valida(d) ? d : null;
  }

  return null;
};

/**
 * La data con cui un task NUOVO va scritto.
 *
 * Regola: si rispetta ciò che ha scelto la persona. Si scrive
 * «adesso» solo quando non è stato scelto nulla, o quando ciò che è
 * arrivato non è una data leggibile — perché una data illeggibile
 * salvata com'è renderebbe il task invisibile in qualunque agenda.
 */
export const dataDelTask = (
  scelta: Date | string | null | undefined,
  adesso: Date = new Date()
): Date => dataScelta(scelta) ?? adesso;
