// ============================================================
// IL FILM DELL'ESERCIZIO — dove si trova, e chi vince
// ------------------------------------------------------------
// I filmati esistono e sono online. Non si vedevano per tre
// motivi che si sommavano:
//   1. la scheda apriva un LINK ESTERNO invece di montare il
//      lettore: fuori dall'app, e sul telefono spesso in bianco;
//   2. se il programma della settimana non portava il videoUrl,
//      il pulsante non compariva affatto — anche quando in
//      libreria il film c'era;
//   3. un esercizio salvato su Firestore SENZA film copriva
//      quello del canone, che il film ce l'ha.
//
// Qui vive la regola, in un posto solo: dato il nome di un
// esercizio e ciò che il programma porta con sé, qual è il film
// da mostrare. Il programma vince, la libreria copre il vuoto.
// ============================================================

export const FILM_VERSION = 1;

export type FonteFilm = 'programma' | 'libreria' | 'nessuna';

export interface FilmTrovato {
  url: string | null;
  fonte: FonteFilm;
  /** secondo filmato (es. versione uomo), quando la libreria ne ha due */
  alternativo?: string | null;
  etichetta?: string;
  etichettaAlternativo?: string;
}

/** Ciò che serve sapere di una voce di libreria per trovarne il film. */
export interface VoceLibreria {
  name: string;
  videoUrl?: string;
  videoLabel?: string;
  videoUrlAlt?: string;
  videoAltLabel?: string;
}

/**
 * Due nomi sono lo stesso esercizio se, tolti accenti, gradi,
 * punteggiatura e spazi doppi, dicono la stessa cosa.
 * «Distensioni su panca inclinata 30°» === «distensioni su panca
 * inclinata 30» === «Distensioni  su  Panca  Inclinata 30°».
 */
export const normalizzaNome = (nome: string): string =>
  (nome || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[°`'"«»]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const pulito = (v: unknown): string | null => {
  const s = typeof v === 'string' ? v.trim() : '';
  return s.length > 0 ? s : null;
};

/**
 * Il film da mostrare per questo esercizio.
 *  · Se il programma porta un link suo, vince: è la scelta del coach.
 *  · Se non ce l'ha, si cerca in libreria per NOME. È il caso normale
 *    per gli esercizi del canone, dove il film sta in libreria e la
 *    scheda porta solo serie e ripetizioni.
 *  · Se non c'è da nessuna parte, si dice, e non si mostra un tasto
 *    che non porta da nessuna parte.
 */
export const trovaFilm = (input: {
  nome: string;
  videoUrlProgramma?: string | null;
  libreria?: VoceLibreria[];
}): FilmTrovato => {
  const dalProgramma = pulito(input.videoUrlProgramma);

  const chiave = normalizzaNome(input.nome);
  const voce = chiave
    ? (input.libreria || []).find((v) => normalizzaNome(v.name) === chiave)
    : undefined;

  const dallaLibreria = voce ? pulito(voce.videoUrl) : null;
  const alternativo = voce ? pulito(voce.videoUrlAlt) : null;

  if (dalProgramma) {
    return {
      url: dalProgramma,
      fonte: 'programma',
      // Anche col link del coach, se la libreria ha la seconda versione
      // la si offre: è materiale che esiste e serve.
      alternativo: alternativo && alternativo !== dalProgramma ? alternativo : null,
      etichetta: voce?.videoLabel,
      etichettaAlternativo: voce?.videoAltLabel,
    };
  }

  if (dallaLibreria) {
    return {
      url: dallaLibreria,
      fonte: 'libreria',
      alternativo,
      etichetta: voce?.videoLabel,
      etichettaAlternativo: voce?.videoAltLabel,
    };
  }

  return { url: null, fonte: 'nessuna', alternativo: null };
};

/**
 * Fondere una voce salvata su Firestore con quella del canone.
 * Il difetto: un esercizio risalvato senza film copriva quello del
 * canone e faceva sparire il filmato. Il testo e i numeri restano
 * quelli salvati — è il coach che li ha scelti — ma un campo VUOTO
 * non può cancellare un film che esiste.
 */
export const fondiConCanone = <T extends VoceLibreria>(
  salvata: T,
  canone?: VoceLibreria
): T => {
  if (!canone) return salvata;
  return {
    ...salvata,
    videoUrl: pulito(salvata.videoUrl) || canone.videoUrl,
    videoLabel: pulito(salvata.videoLabel) || canone.videoLabel,
    videoUrlAlt: pulito(salvata.videoUrlAlt) || canone.videoUrlAlt,
    videoAltLabel: pulito(salvata.videoAltLabel) || canone.videoAltLabel,
  };
};

/** Un film si può riprodurre nell'app solo se è un file, non una pagina. */
export const riproducibile = (url: string | null | undefined): boolean => {
  const u = (url || '').trim().toLowerCase();
  if (!u) return false;
  if (/^(https?:)?\/\//.test(u) === false && !u.startsWith('/')) return false;
  return /\.(mp4|m4v|mov|webm)(\?|#|$)/.test(u);
};

/** Le pagine (YouTube, Instagram…) si aprono fuori: non si montano. */
export const daAprireFuori = (url: string | null | undefined): boolean =>
  Boolean((url || '').trim()) && !riproducibile(url);
