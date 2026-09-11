// ============================================================
// LE CARTELLE DELLO STORAGE — e perché non si parte dalla radice
// ------------------------------------------------------------
// L'11 settembre 2026 la schermata «Gestione Spazio» si è fermata
// con un errore secco:
//
//     Firebase Storage: User does not have permission
//     to access ''. (storage/unauthorized)
//
// Quel `''` è la radice del bucket. La schermata chiedeva l'elenco
// di TUTTO, partendo da lì.
//
// Funzionava perché fino al 9 settembre la prima regola del bucket
// era `allow read, write: if request.auth != null` — un carattere
// jolly che concedeva tutto a chiunque avesse fatto login, radice
// compresa. Quella regola era la stessa che lasciava a ogni allievo
// le foto posturali di tutti gli altri. È stata chiusa, e con lei è
// sparito l'unico motivo per cui l'elenco dalla radice riusciva.
//
// **La correzione non è riaprire la radice.** Elencare l'intero
// bucket è precisamente il potere che abbiamo tolto, e non lo
// rimettiamo dentro per far funzionare una schermata di servizio.
//
// L'App sa quali cartelle usa: sono queste. Si chiede l'elenco di
// ognuna, una per una, con i permessi che ognuna ha già. Nessuna
// regola cambia, e la schermata torna a funzionare.
//
// Il test in `__tests__/cartelleStorage.test.ts` legge `storage.rules`
// e verifica che questo elenco non resti indietro: se domani si
// aggiunge una cartella alle regole e non qui, il test cade.
// ============================================================

export const CARTELLE_VERSION = 1;

export interface CartellaStorage {
  /** il prefisso vero nel bucket */
  id: string;
  /** come si chiama per una persona */
  nome: string;
  /** che cosa c'è dentro, in una riga */
  contenuto: string;
  /** i dati del corpo di una persona: si trattano con più riguardo */
  sensibile: boolean;
}

/**
 * Le cartelle di primo livello che l'App usa davvero.
 * L'ordine è quello con cui si leggono in schermata: prima i dati
 * delle persone, poi i materiali dello studio.
 */
export const CARTELLE: CartellaStorage[] = [
  { id: 'postural', nome: 'Foto posturali', sensibile: true,
    contenuto: 'Le foto della valutazione posturale, una cartella per allievo.' },
  { id: 'bia', nome: 'Esami BIA', sensibile: true,
    contenuto: 'I referti della bioimpedenziometria.' },
  { id: 'bodycomp', nome: 'Composizione corporea', sensibile: true,
    contenuto: 'Le foto e i documenti della composizione corporea.' },
  { id: 'avatars', nome: 'Immagini del profilo', sensibile: false,
    contenuto: 'L\'immagine che ogni persona ha scelto per sé.' },
  { id: 'academy', nome: 'Materiali Academy', sensibile: false,
    contenuto: 'I documenti e i filmati dei corsi.' },
  { id: 'exercise-videos', nome: 'Filmati degli esercizi', sensibile: false,
    contenuto: 'I video del metodo, quelli che l\'allievo vede nella scheda.' },
  { id: 'content', nome: 'Contenuti', sensibile: false,
    contenuto: 'I materiali pubblicati dallo studio.' },
  { id: 'nutritionTeam', nome: 'Team nutrizione', sensibile: true,
    contenuto: 'Gli allegati del team nutrizionale: non li legge l\'allievo.' },
];

export const PREFISSI: string[] = CARTELLE.map((c) => c.id);

const PER_ID = new Map(CARTELLE.map((c) => [c.id, c]));

export const cartella = (id?: string | null): CartellaStorage | undefined =>
  (id ? PER_ID.get(id) : undefined);

/**
 * Come si chiama una cartella in schermata. Una cartella che non
 * conosciamo tiene il suo nome tecnico invece di sparire: se nel
 * bucket è finito qualcosa che l'App non mette, va visto.
 */
export const nomeCartella = (id: string): string =>
  PER_ID.get(id)?.nome || id;

/** Contiene dati del corpo di una persona? */
export const sensibile = (id: string): boolean =>
  PER_ID.get(id)?.sensibile === true;

// ------------------------------------------------------------
// Che cosa raccontare quando una cartella non si apre
// ------------------------------------------------------------
//
// Prima bastava una cartella negata per far fallire l'intera
// scansione: la schermata mostrava un errore tecnico e zero dati.
// Adesso le cartelle si leggono una per una — quella che non si
// apre si segna e si va avanti, e alla fine si dice quali mancano.

export interface EsitoScansione<T> {
  file: T[];
  /** le cartelle che i permessi non hanno lasciato aprire */
  negate: string[];
  /** le cartelle che hanno dato un errore diverso (rete, per esempio) */
  fallite: string[];
}

export const eNegato = (err: unknown): boolean => {
  const codice = (err as { code?: string } | null)?.code || '';
  const testo = err instanceof Error ? err.message : String(err ?? '');
  return codice === 'storage/unauthorized'
    || /unauthorized|permission/i.test(testo);
};

/**
 * La riga che spiega una scansione parziale, senza far finta che
 * sia andato tutto bene e senza mostrare un codice di errore a chi
 * vuole solo sapere quanto spazio sta usando.
 */
export const spiegaScansione = <T>(esito: EsitoScansione<T>): string => {
  const { negate, fallite } = esito;
  if (negate.length === 0 && fallite.length === 0) return '';

  const pezzi: string[] = [];
  if (negate.length > 0) {
    const nomi = negate.map(nomeCartella).join(', ');
    pezzi.push(
      negate.length === 1
        ? `La cartella «${nomi}» non è leggibile con il tuo accesso.`
        : `Queste cartelle non sono leggibili con il tuo accesso: ${nomi}.`
    );
  }
  if (fallite.length > 0) {
    const nomi = fallite.map(nomeCartella).join(', ');
    pezzi.push(
      fallite.length === 1
        ? `La cartella «${nomi}» non ha risposto: riprova.`
        : `Queste cartelle non hanno risposto: ${nomi}. Riprova.`
    );
  }
  pezzi.push('Il totale qui sotto è calcolato sul resto.');
  return pezzi.join(' ');
};
