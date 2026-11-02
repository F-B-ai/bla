// ============================================================
// QUELLO CHE L'AGENDA NON È RIUSCITA A LEGGERE
// ------------------------------------------------------------
// Il titolare, il 15 settembre 2026:
//
//   «Ho perso tutti gli appuntamenti di Consulenza che avevo, non li
//    vedo più.»
//
// Il primo problema non è stato trovare la causa: è stato che la
// schermata non sapeva dirmela. In `loadData` c'erano due catture
// mute —
//
//   getOspitiConfermati().catch(() => [])
//   getAllAppointments().catch(() => [])
//
// — e una lista vuota per un guasto si vede IDENTICA a una lista
// vuota perché non c'è niente. Con gli ospiti dentro (che sono
// proprio le consulenze con chi non è ancora in anagrafica), una
// lettura fallita fa sparire tutto senza una parola.
//
// È la terza volta questa settimana, in tre file diversi: le foto,
// le consulenze in sospeso, e adesso l'agenda. Stesso difetto, e
// stesso rimedio — il vuoto e il guasto devono avere due facce.
//
// QUI NON SI INDOVINA LA CAUSA. Si dice che cosa non si è letto, e
// si mostra il motivo tecnico: brutto ma vero, e permette di
// chiedere aiuto con qualcosa in mano invece che con «non funziona».
// ============================================================

export const CARICAMENTO_AGENDA_VERSION = 1;

export type PezzoAgenda =
  | 'ospiti'
  | 'visite'
  | 'sedute'
  | 'allievi'
  | 'impegni';

/** Come si chiama, in italiano, il pezzo che manca. */
const NOMI: Record<PezzoAgenda, string> = {
  ospiti: 'le consulenze con persone non ancora in anagrafica',
  visite: 'le visite col nutrizionista',
  sedute: 'le sedute',
  allievi: 'l\'elenco degli allievi',
  impegni: 'i tuoi impegni della giornata',
};

export interface Mancanza {
  pezzo: PezzoAgenda;
  /** il codice o il messaggio arrivato da Firestore */
  motivo?: string;
}

const motivoLeggibile = (m: unknown): string => {
  const e = m as { code?: string; message?: string } | undefined;
  return String(e?.code || e?.message || m || '').trim();
};

/** Riduce un errore qualunque a una Mancanza. */
export const mancanza = (pezzo: PezzoAgenda, errore: unknown): Mancanza => ({
  pezzo,
  motivo: motivoLeggibile(errore) || undefined,
});

// ------------------------------------------------------------
// 9 novembre 2026 — UN «PERMESSO NEGATO» NON È SEMPRE UN GUASTO
// ------------------------------------------------------------
// Un collaboratore apre il calendario e vede un allarme rosso: «Non
// sono riuscito a leggere le consulenze con persone non ancora in
// anagrafica · permission-denied».
//
// Non era un guasto. Gli ospiti sono contatti del titolare
// (`bookingRequests: if isOwner()`), e un collaboratore NON deve
// leggerli: il database sta facendo il suo lavoro. Ma lo schermo
// chiedeva comunque — scelta mia, per non far sparire gli ospiti in
// silenzio al TITOLARE il giorno che il suo ruolo non si legge bene —
// e per il collaboratore quel «no» previsto diventava un allarme su
// una cosa che funziona.
//
// Un allarme rosso su qualcosa che va bene è il modo più sicuro di
// far smettere la gente di dare retta agli allarmi veri.
export const ERRORE_PERMESSO = 'permission-denied';

/**
 * Il fallimento di lettura degli ospiti si segnala SOLO a chi avrebbe
 * il diritto di leggerli — il titolare. A un collaboratore il permesso
 * negato è lo stato normale, e si tace.
 *
 * Qualunque ALTRO errore (rete, timeout, server) si segnala sempre, a
 * chiunque: quello è un guasto vero per tutti, titolare compreso.
 */
export const vaSegnalataMancanzaOspiti = (
  errore: unknown,
  puoLeggereOspiti: boolean
): boolean => {
  const codice = String((errore as { code?: string })?.code || '').trim();
  const permessoNegato = codice === ERRORE_PERMESSO;
  if (permessoNegato && !puoLeggereOspiti) return false;
  return true;
};

const elenco = (nomi: string[]): string =>
  nomi.length === 1
    ? nomi[0]
    : `${nomi.slice(0, -1).join(', ')} e ${nomi[nomi.length - 1]}`;

/**
 * La riga che compare in cima all'agenda quando qualcosa non si è
 * potuto leggere. `null` quando è andato tutto bene: nessun avviso
 * inutile.
 */
export const descriviMancanze = (mancanze: Mancanza[]): string | null => {
  const m = (mancanze || []).filter(Boolean);
  if (!m.length) return null;

  const nomi = Array.from(new Set(m.map((x) => NOMI[x.pezzo] || 'una parte dell\'agenda')));
  const motivi = Array.from(new Set(m.map((x) => x.motivo).filter(Boolean)));

  return `Non sono riuscito a leggere ${elenco(nomi)}. `
    + 'NON vuol dire che non ci siano: vuol dire che la lettura non è '
    + 'riuscita, e quello che manca qui sotto potrebbe esserci.'
    + (motivi.length ? `\n\nDettaglio tecnico: ${motivi.join(' · ')}` : '');
};

/**
 * Il titolo dell'avviso. Corto, e non allarmista su dati che quasi
 * sempre sono al loro posto.
 */
export const titoloMancanze = (mancanze: Mancanza[]): string =>
  (mancanze || []).length > 1
    ? 'Agenda incompleta'
    : 'Manca un pezzo dell\'agenda';
