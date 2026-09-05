// ============================================================
// OGGI — la voce del gemello (dominio puro)
// ------------------------------------------------------------
// Non è un cruscotto e non è un menù. Tre strati, mai di più:
//   1. LO STATO   — una riga di linguaggio. Mai un numero nudo.
//   2. IL PERCHÉ  — l'evidenza che l'ha prodotta, dai dati veri.
//   3. L'AZIONE   — una sola cosa per oggi.
//
// COLD START: il gemello è magro per quasi tutti (6 attivi su 39
// alla misura). Quindi "non ti conosco ancora" NON è il caso
// limite: è il caso principale, ed è progettato per primo.
// Il Metodo regge la schermata dal giorno zero; la richiesta del
// dato arriva DENTRO quel linguaggio, non come un modulo.
//
// Funzione pura: stessi input → stesso output (testabile).
// ============================================================

export const OGGI_VERSION = 1;

// ------------------------------------------------------------
// Le dimensioni del Metodo: una per giorno della settimana.
// Il Metodo è visibile SEMPRE, anche quando il gemello tace.
// ------------------------------------------------------------

export type DimensioneKey =
  | 'movimento' | 'energia' | 'emozioni' | 'pensiero'
  | 'fasciale' | 'pnei' | 'respiro';

export interface Dimensione {
  key: DimensioneKey;
  nome: string;
  /** la domanda che quella dimensione pone al corpo */
  domanda: string;
  /** cosa si osserva oggi, in una riga */
  osserva: string;
}

export const DIMENSIONI: Dimensione[] = [
  { key: 'respiro', nome: 'Respiro',
    domanda: 'Da dove parte il tuo respiro?',
    osserva: 'Tre respiri, senza correggerli. Nota solo dove arrivano.' },
  { key: 'movimento', nome: 'Movimento',
    domanda: 'Come si organizza il tuo corpo quando si muove?',
    osserva: 'Il primo movimento della giornata dice più di un test.' },
  { key: 'energia', nome: 'Energia',
    domanda: 'Quanta ne hai davvero, e quanta ne stai spendendo?',
    osserva: 'La stanchezza vera e quella nervosa non sono la stessa cosa.' },
  { key: 'emozioni', nome: 'Emozioni',
    domanda: 'Cosa sta trattenendo il corpo, oggi?',
    osserva: 'Non serve capirlo. Serve accorgersene.' },
  { key: 'pensiero', nome: 'Pensiero',
    domanda: 'La tua testa è qui, o è già a stasera?',
    osserva: 'Dove va il pensiero, va il tono.' },
  { key: 'fasciale', nome: 'Fasciale',
    domanda: 'Dove il tuo corpo perde scorrimento?',
    osserva: 'La rigidità non è dove fa male: è dove non scivola.' },
  { key: 'pnei', nome: 'PNEI',
    domanda: 'Come stanno dialogando testa, ormoni e difese?',
    osserva: 'Sonno, digestione e umore raccontano la stessa storia.' },
];

/** Dimensione del giorno: deterministica sulla data, uguale per tutti. */
export const dimensioneDelGiorno = (date: Date): Dimensione =>
  DIMENSIONI[date.getDay() % DIMENSIONI.length];

// ------------------------------------------------------------
// Input: ciò che il gemello sa davvero
// ------------------------------------------------------------

export interface TwinState {
  readiness?: {
    latest_v2?: number | null;
    latest_penalized?: number | null;
    slope_14d?: number | null;
    checkins_14d?: number | null;
    checkin_gap_days?: number | null;
  };
  load?: {
    status?: string | null;     // 'calibrating' | 'ok' | 'alto' | ...
    acwr?: number | null;
    weekly_volume_kg?: number | null;
  };
  adherence?: {
    workouts_28d?: number | null;
    presences_14d?: number | null;
    consistency_weeks?: number | null;
  };
}

export interface OggiInput {
  date: Date;
  twin: TwinState | null;
  /** l'allievo ha già fatto il check-in di oggi? */
  checkinOggi: boolean;
  /** ha una scheda attiva assegnata */
  haSchedaAttiva: boolean;
  /** si è già allenato oggi */
  allenatoOggi: boolean;
  /** ha già respirato oggi */
  respiratoOggi?: boolean;
  nome?: string;
}

// ------------------------------------------------------------
// Output
// ------------------------------------------------------------

export type Maturita = 'sconosciuto' | 'in_ascolto' | 'noto';
export type Tono = 'pronto' | 'misura' | 'recupero' | 'neutro';

export interface AzioneOggi {
  titolo: string;
  sottotitolo: string;
  /** route interna da aprire */
  route: string;
  /** l'azione è la richiesta del primo dato (innesto A) */
  apreIlGemello?: boolean;
}

export interface Oggi {
  version: number;
  maturita: Maturita;
  /** la riga di stato — mai un numero nudo */
  stato: string;
  tono: Tono;
  /** l'evidenza, in righe brevi e vere */
  perche: string[];
  azione: AzioneOggi;
  dimensione: Dimensione;
}

// ------------------------------------------------------------
// Maturità: quanto il gemello conosce davvero questa persona
// ------------------------------------------------------------

const readCheckins = (t: TwinState | null): number =>
  t?.readiness?.checkins_14d ?? 0;

export const maturitaDi = (t: TwinState | null): Maturita => {
  if (!t) return 'sconosciuto';
  const c = readCheckins(t);
  const w = t.adherence?.workouts_28d ?? 0;
  if (c === 0 && w === 0) return 'sconosciuto';
  if (c < 3) return 'in_ascolto';
  return 'noto';
};

// ------------------------------------------------------------
// Lo stato: dal dato al linguaggio
// ------------------------------------------------------------

const statoDaReadiness = (score: number): { stato: string; tono: Tono } => {
  if (score >= 75) return { stato: 'Il corpo è pronto.', tono: 'pronto' };
  if (score >= 60) return { stato: 'Il corpo risponde.', tono: 'pronto' };
  if (score >= 45) return { stato: 'Il corpo chiede misura.', tono: 'misura' };
  return { stato: 'Il corpo chiede recupero.', tono: 'recupero' };
};

// ------------------------------------------------------------
// Il perché: solo evidenze vere. Nessuna riga senza un dato dietro.
// ------------------------------------------------------------

const costruisciPerche = (input: OggiInput): string[] => {
  const t = input.twin;
  const out: string[] = [];
  if (!t) return out;

  const r = t.readiness || {};
  const l = t.load || {};
  const a = t.adherence || {};

  if ((r.checkins_14d ?? 0) > 0) {
    out.push(`${r.checkins_14d} ascolti negli ultimi 14 giorni.`);
  }
  if (r.slope_14d !== null && r.slope_14d !== undefined && Math.abs(r.slope_14d) >= 1.5) {
    out.push(r.slope_14d < 0
      ? 'La tua risposta sta scendendo, giorno dopo giorno.'
      : 'La tua risposta sta salendo, giorno dopo giorno.');
  }
  if (l.status === 'calibrating') {
    out.push('Il carico è ancora in taratura: servono tre settimane per leggerlo.');
  } else if (l.acwr !== null && l.acwr !== undefined && l.acwr > 1.5) {
    out.push('Stai chiedendo al corpo più di quanto gli hai abituato.');
  }
  if ((a.consistency_weeks ?? 0) >= 4) {
    out.push(`${a.consistency_weeks} settimane di costanza consecutive.`);
  }
  if ((r.checkin_gap_days ?? 0) > 7) {
    out.push(`Non ti ascolti da ${r.checkin_gap_days} giorni.`);
  }
  return out.slice(0, 3);
};

// ------------------------------------------------------------
// L'azione: UNA sola. Gerarchia esplicita.
// ------------------------------------------------------------

const scegliAzione = (
  input: OggiInput, tono: Tono, dim: Dimensione, maturita: Maturita
): AzioneOggi => {
  // 0. A gemello vuoto il primo passo è un GESTO, non un modulo.
  //    "Il gemello nasce dal gesto, non dai numeri": a chi non ha
  //    ancora niente si chiede di fare, non di compilare.
  if (maturita === 'sconosciuto' && !input.respiratoOggi) {
    return {
      titolo: 'Un respiro. Sei minuti.',
      sottotitolo: 'È da qui che il gemello comincia a conoscerti.',
      route: 'Respiro',
      apreIlGemello: true,
    };
  }
  // 1. Poi l'ascolto: è il dato che dà voce al gemello.
  if (!input.checkinOggi) {
    return {
      titolo: 'Ascoltati un minuto',
      sottotitolo: dim.osserva,
      route: 'Checkin',
      apreIlGemello: true,
    };
  }
  // 2. Se il corpo chiede recupero, l'allenamento non è l'azione di oggi:
  //    è il respiro. Non un consiglio scritto — un atto da fare adesso.
  if (tono === 'recupero') {
    return input.respiratoOggi
      ? {
        titolo: 'Oggi si recupera',
        sottotitolo: 'Hai già respirato. Movimento leggero, il carico può aspettare un giorno.',
        route: 'Storia',
      }
      : {
        titolo: 'Respira, prima di tutto',
        sottotitolo: 'Il corpo chiede recupero: cinque minuti di respiro valgono più di una seduta.',
        route: 'Respiro',
      };
  }
  // 3. Se c'è una scheda e non ti sei ancora allenato, quella è la cosa.
  if (input.haSchedaAttiva && !input.allenatoOggi) {
    return {
      titolo: tono === 'misura' ? 'Allenati, con misura' : 'La seduta di oggi',
      sottotitolo: tono === 'misura'
        ? 'Tieni un margine: oggi il corpo chiede di non forzare.'
        : 'Il corpo risponde: è una buona giornata per lavorare.',
      route: 'Scheda',
    };
  }
  // 4. Nient'altro in coda: resta il Metodo. E quando la dimensione del
  //    giorno è il respiro, il Metodo non è una frase da leggere: è un
  //    atto da fare, e finisce dentro il gemello.
  if (dim.key === 'respiro' && !input.respiratoOggi) {
    return {
      titolo: dim.domanda,
      sottotitolo: 'Tre minuti. Il respiro è la dimensione di oggi.',
      route: 'Respiro',
    };
  }
  return {
    titolo: dim.domanda,
    sottotitolo: dim.osserva,
    route: 'Storia',
  };
};

// ------------------------------------------------------------
// API
// ------------------------------------------------------------

// ============================================================
// CONTRATTO VERSO LA VISTA (concordato col CTO architettura)
// ------------------------------------------------------------
// La schermata riceve, non calcola. `presence` la decide questo
// dominio, mai la grafica; le righe sono già linguaggio; la
// scintilla è un'intensità, non un punteggio da mostrare.
// ============================================================

export type Presence = 'empty' | 'thin' | 'alive';

export interface TwinContract {
  presence: Presence;
  lines: { stato: string; perche: string; azione: string } | null;
  spark: { intensity: number };
  next: { kind: string; minutes: number | null; href: string } | null;
}

const PRESENCE_DA_MATURITA: Record<Maturita, Presence> = {
  sconosciuto: 'empty',
  in_ascolto: 'thin',
  noto: 'alive',
};

/**
 * Intensità della scintilla: 0..1.
 * Non è un punteggio travestito — dice quanto il gemello ha da
 * dire. A gemello vuoto resta bassa ("filo sottile, scintilla
 * bassa"), e sale col tono di chi è pronto.
 */
const intensitaScintilla = (presence: Presence, tono: Tono): number => {
  const base = presence === 'empty' ? 0.18 : presence === 'thin' ? 0.42 : 0.7;
  const perTono = tono === 'pronto' ? 0.3 : tono === 'misura' ? 0.12
    : tono === 'recupero' ? 0.0 : 0.08;
  return Math.round(Math.min(1, base + perTono) * 100) / 100;
};

/** Da quale atto è fatta l'azione, e quanto dura. */
const kindDiRoute = (route: string): { kind: string; minutes: number | null } => {
  switch (route) {
    case 'Respiro': return { kind: 'respiro', minutes: 6 };
    case 'Checkin': return { kind: 'ascolto', minutes: 1 };
    case 'Scheda': return { kind: 'seduta', minutes: null };
    default: return { kind: 'storia', minutes: null };
  }
};

/** Adatta l'esito del dominio alla forma che la vista si aspetta. */
export const toTwinContract = (o: Oggi): TwinContract => {
  const presence = PRESENCE_DA_MATURITA[o.maturita];
  const { kind, minutes } = kindDiRoute(o.azione.route);
  return {
    presence,
    lines: {
      stato: o.stato,
      // una riga sola: la prima evidenza, o la voce del Metodo
      perche: o.perche[0] || o.dimensione.osserva,
      azione: o.azione.titolo,
    },
    spark: { intensity: intensitaScintilla(presence, o.tono) },
    next: { kind, minutes, href: o.azione.route },
  };
};

export const computeOggi = (input: OggiInput): Oggi => {
  const dim = dimensioneDelGiorno(input.date);
  const maturita = maturitaDi(input.twin);

  let stato: string;
  let tono: Tono;

  if (maturita === 'sconosciuto') {
    // Il Metodo regge la schermata: non fingiamo di sapere.
    // NB: qui NON si dichiara uno stato del corpo ("è quieto"),
    // perché non lo sappiamo. Si dichiara l'assenza di voce.
    stato = 'Il tuo sistema non ha ancora voce.';
    tono = 'neutro';
  } else if (maturita === 'in_ascolto') {
    stato = 'Ti sto conoscendo.';
    tono = 'neutro';
  } else {
    const score = input.twin?.readiness?.latest_penalized
      ?? input.twin?.readiness?.latest_v2
      ?? null;
    if (score === null) {
      stato = 'Ti sto conoscendo.';
      tono = 'neutro';
    } else {
      const s = statoDaReadiness(score);
      stato = s.stato;
      tono = s.tono;
    }
  }

  const perche = maturita === 'sconosciuto'
    ? ['Il gemello nasce dal gesto, non dai numeri.']
    : costruisciPerche(input);

  return {
    version: OGGI_VERSION,
    maturita,
    stato,
    tono,
    perche,
    azione: scegliAzione(input, tono, dim, maturita),
    dimensione: dim,
  };
};
