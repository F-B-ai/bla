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

// ============================================================
// DI CHI È QUESTA FOTO
// ------------------------------------------------------------
// Il titolare, l'11 settembre 2026:
//
//   «Fai in modo, se ci sono, riferimenti precisi a quelle foto —
//    cioè di chi sono — non messe così e io che devo indovinare.»
//
// Aveva ragione: la schermata mostrava `front_1757606400000.jpg`
// dentro una cartella chiamata come un codice di venti caratteri.
// Per sapere di chi fosse una foto bisognava andare a cercare l'id
// dell'allievo da un'altra parte. Nessuno lo fa — e quindi nessuno
// cancella niente, e lo spazio cresce.
//
// I percorsi veri sono fatti così:
//   postural/{idAllievo}/{vista}_{quando}.jpg
//   bia/{idAllievo}/{nomefile}
//   bodycomp/{idAllievo}/{nomefile}
//   avatars/{idPersona}/{nomefile}
//
// Qui il percorso si legge. Il nome della persona lo mette la
// schermata, che ha l'elenco: questo modulo non sa chi sia nessuno.
// ============================================================

/** Le cartelle in cui il secondo pezzo del percorso è una persona. */
export const CARTELLE_PER_PERSONA = ['postural', 'bia', 'bodycomp', 'avatars'];

const VISTE: Record<string, string> = {
  front: 'Frontale',
  side_left: 'Laterale SX',
  side_right: 'Laterale DX',
  back: 'Posteriore',
};

export interface FileLetto {
  /** la cartella di primo livello */
  cartella: string;
  /** l'id della persona, quando il percorso ce l'ha */
  personaId?: string;
  /** «Frontale», «Laterale SX»… quando il nome del file lo dice */
  vista?: string;
  /** la data ricavata dal nome del file, quando c'è */
  quando?: Date;
}

/**
 * Legge un percorso dello Storage e ne ricava quello che si può.
 * Non inventa: i campi che il percorso non dice restano assenti.
 */
export const leggiPercorso = (percorso: string): FileLetto => {
  const pezzi = (percorso || '').split('/').filter(Boolean);
  const cartella = pezzi[0] || '';
  const out: FileLetto = { cartella };

  if (CARTELLE_PER_PERSONA.includes(cartella) && pezzi.length >= 3) {
    out.personaId = pezzi[1];
  }

  const nomeFile = pezzi[pezzi.length - 1] || '';

  // `side_left_1757606400000.jpg` → vista + istante
  const m = nomeFile.match(/^(front|side_left|side_right|back)_(\d{10,})\./);
  if (m) {
    out.vista = VISTE[m[1]];
    const n = Number(m[2]);
    // millisecondi da epoch: si accettano solo date credibili
    if (n > 1000000000000 && n < 4000000000000) out.quando = new Date(n);
  }
  return out;
};

/**
 * La riga che si legge sotto il nome del file: chi, che vista, quando.
 * `nome` lo passa la schermata; se non lo conosce, si dice così invece
 * di mostrare un codice.
 */
export const descriviFile = (
  percorso: string,
  nome?: string | null
): string => {
  const l = leggiPercorso(percorso);
  const pezzi: string[] = [];

  if (l.personaId) {
    pezzi.push(nome && nome.trim() ? nome.trim() : 'Persona non più in elenco');
  }
  if (l.vista) pezzi.push(l.vista);
  if (l.quando) {
    pezzi.push(l.quando.toLocaleDateString('it-IT', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    }));
  }
  return pezzi.join(' · ');
};

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
