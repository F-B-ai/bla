// ============================================================
// GERARCHIA DELLA PROGRESSIONE DELLO STIMOLO
// A.S.D. Evolution Sport · Metodo Mind Movement™
// ------------------------------------------------------------
// Fino a qui il software conosceva UNA sola progressione:
// aggiungi chili. È la più povera delle undici, ed è anche
// l'unica che un allievo può subire senza adattarsi a niente.
//
// Qui dentro vivono tutte e undici, ordinate nel ciclo:
//
//   ESPOSIZIONE → DOMANDA → ADATTAMENTO → CAPACITÀ → PROGRESSIONE
//        ↑                                              ↓
//        └──────────────── nuovo stimolo ───────────────┘
//
// LA REGOLA CHE COMANDA TUTTO
//   La parola non è Overload. È Progressive Demand: la domanda
//   complessiva imposta al sistema. Il carico è solo uno dei modi
//   di aumentarla, ed è quello che costa di più al sistema.
//
// REGOLE FERREE (le stesse di tutto ESSĒRE)
//   · Si misura solo ciò che l'app registra davvero: kg, ripetizioni,
//     serie, RPE quando c'è, durata, tenuta isometrica, tecnica.
//   · Ciò che non registriamo — ROM sotto il bilanciere, braccio di
//     momento, instabilità — NON si stima: si dichiara «lo vedi tu».
//     Un numero inventato su una domanda meccanica è peggio del vuoto.
//   · Nessun aumento sopra una qualità che sta scendendo.
//   · Le formule scelgono l'asse. L'AI spiega. Il coach approva.
// ============================================================

export const PROGRESSIONE_VERSION = 1;

// ------------------------------------------------------------
// I quattro livelli + il ciclo
// ------------------------------------------------------------

export type Livello = 'esposizione' | 'domanda' | 'adattamento' | 'capacita';

export const CICLO: Array<{
  id: Livello | 'progressione';
  titolo: string;
  domanda: string;
}> = [
  { id: 'esposizione', titolo: 'Esposizione', domanda: 'A che cosa, e quanto, sto esponendo il sistema?' },
  { id: 'domanda', titolo: 'Domanda', domanda: 'Quanta richiesta meccanica, metabolica e neuromotoria sto creando?' },
  { id: 'adattamento', titolo: 'Adattamento', domanda: 'Come sta rispondendo il sistema?' },
  { id: 'capacita', titolo: 'Capacità', domanda: 'Che cosa è capace di fare oggi, che prima non faceva?' },
  { id: 'progressione', titolo: 'Progressione', domanda: 'Che cosa aumento adesso — e perché proprio quello?' },
];

// ------------------------------------------------------------
// Gli undici assi
// ------------------------------------------------------------

export type AsseId =
  | 'carico' | 'esposizione' | 'adattamento' | 'complessita' | 'meccanica'
  | 'volume' | 'intensita' | 'cedimento' | 'densita' | 'tecnica' | 'capacita';

/** Da dove arriva la lettura di questo asse. */
export type Fonte =
  /** l'app lo misura da sola, dai dati della seduta */
  | 'dati'
  /** l'app ne vede una parte, il resto lo giudica il coach */
  | 'mista'
  /** l'app non lo misura e non lo stima: lo dichiara il coach */
  | 'occhio';

export interface Asse {
  id: AsseId;
  nome: string;
  nomeEn: string;
  livello: Livello;
  cosaAumenta: string;
  fonte: Fonte;
  /** che cosa vede l'app, o perché non può vederlo */
  comeSiVede: string;
  esempio: string;
}

export const ASSI: Asse[] = [
  {
    id: 'esposizione', nome: 'Esposizione progressiva', nomeEn: 'Progressive Exposure',
    livello: 'esposizione', cosaAumenta: 'l\'esposizione alla richiesta',
    fonte: 'occhio',
    comeSiVede: 'ROM, velocità, instabilità e durata non vengono registrati sotto il bilanciere. '
      + 'L\'app conta le sedute e la tenuta isometrica; il resto lo dichiari tu.',
    esempio: 'Squat a ROM parziale → ROM completo → ROM completo con più carico → e poi con più velocità concentrica.',
  },
  {
    id: 'carico', nome: 'Sovraccarico progressivo', nomeEn: 'Progressive Overload',
    livello: 'domanda', cosaAumenta: 'il carico esterno',
    fonte: 'dati',
    comeSiVede: 'Peso della serie migliore, seduta per seduta.',
    esempio: 'Squat 80 kg × 8 → 82,5 × 8 → 85 × 8.',
  },
  {
    id: 'volume', nome: 'Volume progressivo', nomeEn: 'Progressive Volume',
    livello: 'domanda', cosaAumenta: 'la quantità di lavoro',
    fonte: 'dati',
    comeSiVede: 'Serie × ripetizioni × carico, sommato sulla seduta.',
    esempio: '3 × 8 × 70 kg = 1.680 kg → 3 × 10 × 70 kg = 2.100 kg. Stesso peso, più lavoro.',
  },
  {
    id: 'intensita', nome: 'Intensità progressiva', nomeEn: 'Progressive Intensity',
    livello: 'domanda', cosaAumenta: 'l\'intensità relativa',
    fonte: 'dati',
    comeSiVede: 'Carico della serie migliore rapportato al massimale stimato dallo storico (Epley).',
    esempio: '100 kg è un carico assoluto. 100 kg all\'85% del massimale è un\'intensità.',
  },
  {
    id: 'cedimento', nome: 'Prossimità al cedimento', nomeEn: 'Progressive Proximity to Failure',
    livello: 'domanda', cosaAumenta: 'la fatica dentro la serie',
    fonte: 'dati',
    comeSiVede: 'RIR calcolato dall\'RPE registrato (RIR = 10 − RPE). Senza RPE, questo asse resta cieco.',
    esempio: '3 RIR → 2 RIR → 1 RIR → 0-1 RIR, con lo stesso peso.',
  },
  {
    id: 'densita', nome: 'Densità progressiva', nomeEn: 'Progressive Density',
    livello: 'domanda', cosaAumenta: 'il lavoro per unità di tempo',
    fonte: 'dati',
    comeSiVede: 'Volume della seduta diviso la durata reale della seduta.',
    esempio: '4 serie in 20 minuti → in 18 → in 16. Stesso lavoro, più densità.',
  },
  {
    id: 'complessita', nome: 'Complessità progressiva', nomeEn: 'Progressive Complexity',
    livello: 'domanda', cosaAumenta: 'la complessità del compito motorio',
    fonte: 'mista',
    comeSiVede: 'L\'app vede il cambio di esercizio e di tecnica. Gradi di libertà, stabilizzazione '
      + 'e controllo del centro di massa li giudichi tu.',
    esempio: 'Squat → split squat → bulgarian split squat → squat monopodalico. Il peso può non cambiare.',
  },
  {
    id: 'meccanica', nome: 'Domanda meccanica progressiva', nomeEn: 'Progressive Mechanical Demand',
    livello: 'domanda', cosaAumenta: 'la richiesta meccanica reale',
    fonte: 'occhio',
    comeSiVede: 'Momento articolare, braccio di leva, profilo di resistenza e curva forza-lunghezza '
      + 'non sono misurabili da uno smartphone. Qui l\'app tace di proposito.',
    esempio: '20 kg in due esercizi diversi non sono 20 kg di stimolo meccanico.',
  },
  {
    id: 'tecnica', nome: 'Richiesta tecnica progressiva', nomeEn: 'Progressive Technical Demand',
    livello: 'domanda', cosaAumenta: 'la qualità con cui il carico viene gestito',
    fonte: 'mista',
    comeSiVede: 'Dall\'analisi dello squat: valgo del ginocchio, shift dell\'anca, inclinazione del tronco. '
      + 'Numeri veri, in gradi e percentuale.',
    esempio: '100 kg × 8 con compensi → 100 kg × 8 puliti. Il carico non è salito: è salita la qualità.',
  },
  {
    id: 'adattamento', nome: 'Adattamento progressivo', nomeEn: 'Progressive Adaptation',
    livello: 'adattamento', cosaAumenta: 'la capacità di tollerare lo stimolo',
    fonte: 'dati',
    comeSiVede: 'Stesso carico che diventa più facile: RIR che sale, o ripetizioni che salgono a parità di peso.',
    esempio: '50 kg × 10 con enorme fatica; sei settimane dopo, 50 kg × 10 facili. Il carico non è cambiato: è cambiata la persona.',
  },
  {
    id: 'capacita', nome: 'Capacità progressiva', nomeEn: 'Progressive Capacity',
    livello: 'capacita', cosaAumenta: 'ciò che il soggetto sa fare oggi',
    fonte: 'mista',
    comeSiVede: 'Forza, lavoro sostenibile, carico tollerato dai dati; movimento, controllo e recupero '
      + 'dalle valutazioni.',
    esempio: 'La domanda finale non è «quanto ha alzato», ma «quanto è capace di fare oggi rispetto a prima».',
  },
];

export const asse = (id: AsseId): Asse => ASSI.find((a) => a.id === id)!;

// ------------------------------------------------------------
// Che cosa l'app registra davvero (niente di più)
// ------------------------------------------------------------

export interface SerieFatta {
  reps: number;
  kg: number;
  /** 1-10, registrato solo se l'allievo lo inserisce */
  rpe?: number;
  /** tenuta isometrica, quando la tecnica la prevede */
  secondi?: number;
}

export interface EsercizioFatto {
  nome: string;
  tecnica?: string;
  serie: SerieFatta[];
}

export interface Sessione {
  data: Date;
  /** durata reale della seduta, dai log */
  durataMin?: number;
  esercizi: EsercizioFatto[];
}

/** Qualità esecutiva osservata: numeri veri dall'analisi dello squat. */
export interface QualitaOsservata {
  /** valgo del ginocchio al fondo, % */
  valgo?: number;
  /** shift dell'anca, % */
  shiftAnca?: number;
  /** inclinazione del tronco al fondo, ° */
  tronco?: number;
  /** angolo del ginocchio al fondo, °: più basso = più profondo */
  profonditaGrad?: number;
  data?: Date;
}

// ------------------------------------------------------------
// Soglie — in un posto solo
// ------------------------------------------------------------

export const SOGLIE = {
  /** entro questa differenza il carico si considera lo STESSO */
  caricoUguale: 0.025,
  /** sotto questa variazione percentuale non si parla di tendenza */
  rumore: 0.03,
  /** RIR: quanto deve salire perché sia adattamento e non caso */
  rirPiuFacile: 0.5,
  /** RIR: quanto può scendere restando "stessa fatica" */
  rirStessaFatica: 0.2,
  /** compenso (punti % o gradi): quanto deve peggiorare per fermare tutto */
  compensoPeggiora: 3,
  /** angolo del ginocchio oltre il quale il ROM è parziale */
  profonditaParziale: 100,
  /** prontezza sotto la quale non si aumenta niente */
  prontezzaBassa: 40,
  /** sedute minime perché esista una lettura */
  sedute: 2,
  /** serie con RPE minime perché il cedimento sia leggibile */
  serieConRpe: 3,
};

// ------------------------------------------------------------
// Misura di una seduta
// ------------------------------------------------------------

export interface MisureSessione {
  data: Date;
  serie: number;
  ripetizioni: number;
  volumeKg: number;
  caricoTop: number;
  ripsAlTop: number;
  /** Epley sulla serie migliore della seduta; 0 = non stimabile */
  massimaleStimato: number;
  /** kg al minuto: solo sulla seduta intera, mai sul singolo esercizio */
  densitaKgMin: number | null;
  /** media dei RIR (10 − RPE); null se nessun RPE registrato */
  rirMedio: number | null;
  serieConRpe: number;
  /** secondi di tenuta isometrica */
  tenutaSec: number;
  tecniche: string[];
}

const num = (v: unknown): number =>
  typeof v === 'number' && isFinite(v) ? v : 0;

const normalizza = (s: string): string => (s || '').trim().toLowerCase();

const arrotonda = (n: number, d = 1): number => {
  const f = Math.pow(10, d);
  return Math.round(n * f) / f;
};

/** Massimale stimato (Epley). Oltre le 12 ripetizioni la formula mente: si tace. */
export const massimaleEpley = (kg: number, reps: number): number =>
  kg > 0 && reps > 0 && reps <= 12 ? arrotonda(kg * (1 + reps / 30)) : 0;

export const misuraSessione = (s: Sessione, esercizio?: string): MisureSessione => {
  const lista = esercizio
    ? (s.esercizi || []).filter((e) => normalizza(e.nome) === normalizza(esercizio))
    : (s.esercizi || []);

  let serie = 0, ripetizioni = 0, volumeKg = 0, caricoTop = 0, ripsAlTop = 0;
  let massimale = 0, tenuta = 0, sommaRir = 0, conRpe = 0;
  const tecniche = new Set<string>();

  for (const e of lista) {
    if (e.tecnica) tecniche.add(e.tecnica);
    for (const set of e.serie || []) {
      const reps = num(set.reps);
      const kg = num(set.kg);
      const sec = num(set.secondi);
      if (reps <= 0 && sec <= 0) continue; // serie mai eseguita
      serie += 1;
      ripetizioni += reps;
      volumeKg += kg * reps;
      if (kg > caricoTop || (kg === caricoTop && reps > ripsAlTop)) {
        caricoTop = kg;
        ripsAlTop = reps;
      }
      massimale = Math.max(massimale, massimaleEpley(kg, reps));
      tenuta += sec;
      const rpe = set.rpe;
      if (typeof rpe === 'number' && isFinite(rpe) && rpe >= 1 && rpe <= 10) {
        sommaRir += 10 - rpe;
        conRpe += 1;
      }
    }
  }

  // La densità è un fatto della SEDUTA: dividere il volume di un
  // singolo esercizio per la durata di tutta la seduta darebbe un
  // numero che sembra vero e non lo è.
  const durata = num(s.durataMin);
  const densitaKgMin = !esercizio && durata > 0 && volumeKg > 0
    ? arrotonda(volumeKg / durata)
    : null;

  return {
    data: s.data,
    serie,
    ripetizioni,
    volumeKg: Math.round(volumeKg),
    caricoTop,
    ripsAlTop,
    massimaleStimato: massimale,
    densitaKgMin,
    rirMedio: conRpe > 0 ? arrotonda(sommaRir / conRpe) : null,
    serieConRpe: conRpe,
    tenutaSec: tenuta,
    tecniche: Array.from(tecniche),
  };
};

/** Sedute in cui quell'esercizio (o qualunque lavoro) è stato davvero fatto, dalla più vecchia. */
export const seduteUtili = (storia: Sessione[], esercizio?: string): MisureSessione[] =>
  (storia || [])
    .filter((s) => s && s.data instanceof Date && !isNaN(s.data.getTime()))
    .map((s) => misuraSessione(s, esercizio))
    .filter((m) => m.serie > 0)
    .sort((a, b) => a.data.getTime() - b.data.getTime());

// ------------------------------------------------------------
// Confronto fra due finestre: che cosa si è mosso, e di quanto
// ------------------------------------------------------------

export type Verso = 'su' | 'giu' | 'stabile' | 'non_misurato';

export interface Confronto {
  asse: AsseId;
  etichetta: string;
  unita: string;
  prima: number | null;
  dopo: number | null;
  deltaPct: number | null;
  verso: Verso;
}

const media = (vals: Array<number | null>): number | null => {
  const v = vals.filter((x): x is number => typeof x === 'number' && isFinite(x));
  return v.length ? arrotonda(v.reduce((a, b) => a + b, 0) / v.length) : null;
};

const versoDi = (prima: number | null, dopo: number | null, soglia = SOGLIE.rumore): Verso => {
  if (prima === null || dopo === null || prima === 0) return 'non_misurato';
  const d = (dopo - prima) / Math.abs(prima);
  if (Math.abs(d) < soglia) return 'stabile';
  return d > 0 ? 'su' : 'giu';
};

const pct = (prima: number | null, dopo: number | null): number | null =>
  prima === null || dopo === null || prima === 0
    ? null
    : arrotonda(((dopo - prima) / Math.abs(prima)) * 100);

/**
 * Confronta le ultime `finestra` sedute con le `finestra` precedenti.
 * Ritorna una riga per ogni asse che l'app misura davvero.
 */
export const confronta = (
  storia: Sessione[],
  esercizio?: string,
  finestra = 3
): Confronto[] => {
  const m = seduteUtili(storia, esercizio);
  const dopo = m.slice(-finestra);
  const prima = m.slice(Math.max(0, m.length - finestra * 2), Math.max(0, m.length - finestra));
  const massimaleStorico = m.reduce((max, x) => Math.max(max, x.massimaleStimato), 0);

  const intensitaDi = (set: MisureSessione[]): number | null => {
    if (!massimaleStorico) return null;
    return media(set.map((x) => (x.caricoTop > 0 ? (x.caricoTop / massimaleStorico) * 100 : null)));
  };

  const righe: Array<{ asse: AsseId; etichetta: string; unita: string; a: number | null; b: number | null; soglia?: number }> = [
    {
      asse: 'volume', etichetta: 'Volume per seduta', unita: 'kg',
      a: media(prima.map((x) => x.volumeKg)), b: media(dopo.map((x) => x.volumeKg)),
    },
    {
      asse: 'carico', etichetta: 'Carico della serie migliore', unita: 'kg',
      a: media(prima.map((x) => (x.caricoTop > 0 ? x.caricoTop : null))),
      b: media(dopo.map((x) => (x.caricoTop > 0 ? x.caricoTop : null))),
    },
    {
      asse: 'intensita', etichetta: 'Intensità relativa', unita: '% del massimale stimato',
      a: intensitaDi(prima), b: intensitaDi(dopo),
    },
    {
      asse: 'densita', etichetta: 'Densità', unita: 'kg/min',
      a: media(prima.map((x) => x.densitaKgMin)), b: media(dopo.map((x) => x.densitaKgMin)),
    },
    {
      asse: 'cedimento', etichetta: 'Riserva a fine serie', unita: 'RIR',
      a: media(prima.map((x) => x.rirMedio)), b: media(dopo.map((x) => x.rirMedio)),
      soglia: 0.001, // il RIR si legge in assoluto, non in percentuale
    },
  ];

  return righe.map((r) => ({
    asse: r.asse,
    etichetta: r.etichetta,
    unita: r.unita,
    prima: r.a,
    dopo: r.b,
    deltaPct: pct(r.a, r.b),
    verso: r.asse === 'cedimento'
      ? (r.a === null || r.b === null
        ? 'non_misurato'
        : Math.abs(r.b - r.a) < 0.3 ? 'stabile' : (r.b > r.a ? 'su' : 'giu'))
      : versoDi(r.a, r.b, r.soglia),
  }));
};

// ------------------------------------------------------------
// Adattamento: il sistema sta rispondendo, sì o no?
// ------------------------------------------------------------

export type TipoAdattamento =
  | 'stesso_carico_piu_facile'
  | 'stesso_carico_piu_ripetizioni'
  | 'carico_salito_stessa_fatica'
  | 'nessuno'
  | 'dati_insufficienti';

export interface Adattamento {
  visibile: boolean;
  tipo: TipoAdattamento;
  prova: string;
}

/**
 * Il protagonista non è lo stimolo: è la risposta.
 * Adattamento = stesso carico che costa meno, o più lavoro allo
 * stesso costo. Carico salito CON fatica salita non è adattamento:
 * è solo lavoro più duro, e va detto.
 */
export const leggiAdattamento = (
  storia: Sessione[],
  esercizio?: string
): Adattamento => {
  const m = seduteUtili(storia, esercizio).filter((x) => x.caricoTop > 0);
  if (m.length < SOGLIE.sedute) {
    return {
      visibile: false, tipo: 'dati_insufficienti',
      prova: m.length === 0
        ? 'Nessuna seduta registrata con un carico.'
        : 'Una sola seduta registrata: non esiste ancora un confronto.',
    };
  }

  const dopo = m[m.length - 1];
  const prima = m[m.length - 2];
  const delta = (dopo.caricoTop - prima.caricoTop) / prima.caricoTop;
  const kg = (x: MisureSessione) => `${arrotonda(x.caricoTop)} kg × ${x.ripsAlTop}`;

  if (Math.abs(delta) <= SOGLIE.caricoUguale) {
    if (prima.rirMedio !== null && dopo.rirMedio !== null
      && dopo.rirMedio >= prima.rirMedio + SOGLIE.rirPiuFacile) {
      return {
        visibile: true, tipo: 'stesso_carico_piu_facile',
        prova: `Stesso carico (${kg(prima)} → ${kg(dopo)}) con più riserva a fine serie: `
          + `${prima.rirMedio} → ${dopo.rirMedio} RIR.`,
      };
    }
    if (dopo.ripsAlTop > prima.ripsAlTop) {
      return {
        visibile: true, tipo: 'stesso_carico_piu_ripetizioni',
        prova: `Stesso carico, più ripetizioni: ${kg(prima)} → ${kg(dopo)}.`,
      };
    }
    return {
      visibile: false, tipo: 'nessuno',
      prova: `Stesso carico e stesse ripetizioni (${kg(dopo)}): il sistema non ha ancora risposto.`,
    };
  }

  if (delta > SOGLIE.caricoUguale) {
    if (prima.rirMedio !== null && dopo.rirMedio !== null
      && dopo.rirMedio >= prima.rirMedio - SOGLIE.rirStessaFatica) {
      return {
        visibile: true, tipo: 'carico_salito_stessa_fatica',
        prova: `Carico salito (${kg(prima)} → ${kg(dopo)}) a parità di fatica `
          + `(${prima.rirMedio} → ${dopo.rirMedio} RIR).`,
      };
    }
    return {
      visibile: false, tipo: 'nessuno',
      prova: `Il carico è salito (${kg(prima)} → ${kg(dopo)}), ma la fatica è salita con lui: `
        + 'è lavoro più duro, non ancora adattamento.',
    };
  }

  return {
    visibile: false, tipo: 'nessuno',
    prova: `Il carico è sceso (${kg(prima)} → ${kg(dopo)}).`,
  };
};

// ------------------------------------------------------------
// Qualità: il cancello che sta prima di ogni aumento
// ------------------------------------------------------------

export type StatoQualita = 'peggiora' | 'tiene' | 'migliora' | 'non_misurata';

export interface LetturaQualita {
  stato: StatoQualita;
  /** il compenso che si è mosso di più */
  segnale: string | null;
  romParziale: boolean;
}

export const leggiQualita = (
  ultima?: QualitaOsservata,
  precedente?: QualitaOsservata
): LetturaQualita => {
  const romParziale = typeof ultima?.profonditaGrad === 'number'
    && ultima.profonditaGrad > SOGLIE.profonditaParziale;

  if (!ultima || !precedente) {
    return { stato: 'non_misurata', segnale: null, romParziale };
  }

  const voci: Array<{ n: string; a?: number; b?: number; u: string }> = [
    { n: 'valgo del ginocchio', a: precedente.valgo, b: ultima.valgo, u: '%' },
    { n: 'shift dell\'anca', a: precedente.shiftAnca, b: ultima.shiftAnca, u: '%' },
    { n: 'inclinazione del tronco', a: precedente.tronco, b: ultima.tronco, u: '°' },
  ].filter((v) => typeof v.a === 'number' && typeof v.b === 'number');

  if (!voci.length) return { stato: 'non_misurata', segnale: null, romParziale };

  let peggiore = { n: '', d: 0, u: '', a: 0, b: 0 };
  let migliore = { n: '', d: 0, u: '', a: 0, b: 0 };
  for (const v of voci) {
    const d = (v.b as number) - (v.a as number); // compensi: salire = peggio
    if (d > peggiore.d) peggiore = { n: v.n, d, u: v.u, a: v.a as number, b: v.b as number };
    if (d < migliore.d) migliore = { n: v.n, d, u: v.u, a: v.a as number, b: v.b as number };
  }

  if (peggiore.d >= SOGLIE.compensoPeggiora) {
    return {
      stato: 'peggiora',
      segnale: `${peggiore.n}: ${arrotonda(peggiore.a)}${peggiore.u} → ${arrotonda(peggiore.b)}${peggiore.u}.`,
      romParziale,
    };
  }
  if (-migliore.d >= SOGLIE.compensoPeggiora) {
    return {
      stato: 'migliora',
      segnale: `${migliore.n}: ${arrotonda(migliore.a)}${migliore.u} → ${arrotonda(migliore.b)}${migliore.u}.`,
      romParziale,
    };
  }
  return { stato: 'tiene', segnale: null, romParziale };
};

// ------------------------------------------------------------
// LA DECISIONE: quale asse si aumenta adesso
// ------------------------------------------------------------

export type Obiettivo = 'forza' | 'ipertrofia' | 'ricomposizione' | 'salute';

export interface IngressoProgressione {
  storia: Sessione[];
  /** se presente, si ragiona su quell'esercizio; altrimenti sulla seduta */
  esercizio?: string;
  /** prontezza 0-100 dal gemello, se calcolata */
  prontezza?: number;
  qualita?: { ultima?: QualitaOsservata; precedente?: QualitaOsservata };
  /** gli assi già usati, dal più recente: serve a non ripetere sempre il carico */
  ultimiAssi?: AsseId[];
  obiettivo?: Obiettivo;
}

export interface PassoProposto {
  asse: AsseId;
  livello: Livello;
  titolo: string;
  /** che cosa si scrive sulla scheda, con i numeri */
  azione: string;
  /** perché proprio questo asse, coi numeri veri */
  perche: string;
  /** che cosa guardare la prossima seduta per sapere se ha funzionato */
  osserva: string;
  /** true = l'app non misura questo asse: serve l'occhio del coach */
  richiedeOcchio: boolean;
  fiducia: 'alta' | 'media' | 'bassa';
  /** i fatti misurati usati per decidere */
  prove: string[];
}

/** Ordine di preferenza degli assi quando il sistema HA risposto. */
const PREFERENZE: Record<Obiettivo, AsseId[]> = {
  ipertrofia: ['volume', 'carico', 'cedimento', 'densita', 'complessita'],
  forza: ['carico', 'intensita', 'volume', 'cedimento', 'complessita'],
  ricomposizione: ['densita', 'volume', 'carico', 'cedimento', 'complessita'],
  salute: ['esposizione', 'tecnica', 'volume', 'densita', 'carico'],
};

/** Incremento onesto del carico: piccolo sui pesi piccoli, mai oltre ~5%. */
export const incrementoCarico = (kg: number): number => {
  if (kg <= 0) return 0;
  if (kg < 10) return 0.5;
  if (kg < 20) return 1;
  if (kg < 40) return 2;
  return 2.5;
};

const kgTxt = (n: number) => `${arrotonda(n)} kg`.replace('.', ',');

export const prossimoPasso = (i: IngressoProgressione): PassoProposto => {
  const m = seduteUtili(i.storia, i.esercizio);
  const ultima = m[m.length - 1];
  const nome = i.esercizio || 'la seduta';
  const q = leggiQualita(i.qualita?.ultima, i.qualita?.precedente);
  const ad = leggiAdattamento(i.storia, i.esercizio);
  const prove: string[] = [];
  if (ultima) {
    prove.push(
      `Ultima seduta: ${ultima.serie} serie, ${ultima.ripetizioni} ripetizioni, `
      + `${ultima.volumeKg} kg di volume`
      + (ultima.caricoTop > 0 ? `, serie migliore ${kgTxt(ultima.caricoTop)} × ${ultima.ripsAlTop}` : '')
      + '.'
    );
    if (ultima.rirMedio !== null) prove.push(`Riserva media a fine serie: ${ultima.rirMedio} RIR.`);
    else prove.push('Nessun RPE registrato: la prossimità al cedimento resta cieca.');
    if (ultima.densitaKgMin !== null) prove.push(`Densità: ${ultima.densitaKgMin} kg/min.`);
  }
  if (ad.tipo !== 'dati_insufficienti') prove.push(ad.prova);
  if (q.segnale) prove.push(q.segnale);
  if (typeof i.prontezza === 'number') prove.push(`Prontezza del gemello: ${Math.round(i.prontezza)}/100.`);

  // — 1. Il sistema non ha ancora visto abbastanza —
  if (m.length < SOGLIE.sedute) {
    return {
      asse: 'esposizione', livello: 'esposizione',
      titolo: 'Prima esporre, poi aumentare',
      azione: `Ripeti ${nome} con gli stessi numeri. Nessun aumento: serve una seconda seduta uguale `
        + 'per avere qualcosa da confrontare.',
      perche: m.length === 0
        ? 'Non c\'è ancora nessuna seduta registrata: qualsiasi aumento sarebbe un\'ipotesi.'
        : 'Con una sola seduta non esiste una tendenza. Un aumento deciso su un punto solo è un tiro a indovinare.',
      osserva: 'Come cambia la fatica a parità di numeri. È il primo segnale di adattamento.',
      richiedeOcchio: true, fiducia: 'alta', prove,
    };
  }

  // — 2. La prontezza è bassa: non si aggiunge domanda a un sistema che non recupera —
  if (typeof i.prontezza === 'number' && i.prontezza < SOGLIE.prontezzaBassa) {
    return {
      asse: 'adattamento', livello: 'adattamento',
      titolo: 'Questa settimana non si aumenta niente',
      azione: `${nome}: stessi carichi, stesse ripetizioni, chiudi ogni serie con almeno 2 ripetizioni in riserva.`,
      perche: `La prontezza è ${Math.round(i.prontezza)}/100. L'adattamento avviene nel recupero, non nello stimolo: `
        + 'aumentare adesso costruisce fatica, non capacità.',
      osserva: 'La prontezza nei prossimi giorni. Si riprende ad aumentare quando risale.',
      richiedeOcchio: false, fiducia: 'alta', prove,
    };
  }

  // — 3. La qualità sta scendendo: mai carico sopra un compenso che cresce —
  if (q.stato === 'peggiora') {
    return {
      asse: 'tecnica', livello: 'domanda',
      titolo: 'Sale la qualità, non il carico',
      azione: `${nome}: stesso peso, stesse ripetizioni, esecuzione più pulita. `
        + 'Togli una serie se serve per tenere la traiettoria.',
      perche: `Il compenso è aumentato — ${q.segnale} Aggiungere carico su uno schema che sta peggiorando `
        + 'aumenta la domanda nel posto sbagliato.',
      osserva: 'Lo stesso compenso alla prossima analisi. Si torna ad aumentare quando è rientrato.',
      richiedeOcchio: true, fiducia: 'alta', prove,
    };
  }

  // — 4. ROM parziale: l'esposizione viene prima del carico —
  if (q.romParziale) {
    return {
      asse: 'esposizione', livello: 'esposizione',
      titolo: 'Prima il ROM, poi i chili',
      azione: `${nome}: stesso carico, ampiezza completa e controllata. Scendi il peso di quanto serve `
        + 'per arrivare in fondo senza compensare.',
      perche: `L'angolo al fondo resta sopra ${SOGLIE.profonditaParziale}°: il movimento è ancora parziale. `
        + 'Caricare un ROM parziale allena la parte già facile.',
      osserva: 'L\'angolo al fondo alla prossima analisi dello squat.',
      richiedeOcchio: true, fiducia: 'media', prove,
    };
  }

  // — 5. Il sistema non ha risposto: si consolida, non si aumenta —
  if (!ad.visibile && ad.tipo === 'nessuno') {
    return {
      asse: 'adattamento', livello: 'adattamento',
      titolo: 'Ripeti lo stesso stimolo',
      azione: `${nome}: identico alla scorsa volta. Nessun chilo in più, nessuna serie in più.`,
      perche: `${ad.prova} Lo stimolo non è ancora stato assorbito: ripeterlo è ciò che lo trasforma in capacità.`,
      osserva: 'Le stesse ripetizioni con più riserva a fine serie: è quello il momento in cui si aumenta.',
      richiedeOcchio: false, fiducia: 'alta', prove,
    };
  }

  // — 6. Il sistema HA risposto: si aumenta, ruotando l'asse —
  const obiettivo = i.obiettivo || 'ipertrofia';
  const recenti = (i.ultimiAssi || []).slice(0, 2);
  const ordine = PREFERENZE[obiettivo];
  const scelto = ordine.find((a) => !recenti.includes(a)) || ordine[0];
  return costruisciPasso(scelto, nome, ultima, ad, prove, q);
};

const costruisciPasso = (
  id: AsseId,
  nome: string,
  ultima: MisureSessione | undefined,
  ad: Adattamento,
  prove: string[],
  q: LetturaQualita
): PassoProposto => {
  const a = asse(id);
  const base = {
    asse: id,
    livello: a.livello,
    richiedeOcchio: a.fonte !== 'dati',
    fiducia: (q.stato === 'non_misurata' ? 'media' : 'alta') as PassoProposto['fiducia'],
    prove,
  };
  const top = ultima?.caricoTop || 0;
  const reps = ultima?.ripsAlTop || 0;
  const serie = ultima?.serie || 0;

  switch (id) {
    case 'volume':
      return {
        ...base,
        titolo: 'Più lavoro, stesso peso',
        azione: top > 0
          ? `${nome}: ${kgTxt(top)}, punta a ${reps + 1}-${reps + 2} ripetizioni sulla serie migliore `
            + '(stesso peso, stesse serie).'
          : `${nome}: aggiungi 1-2 ripetizioni per serie, senza cambiare niente altro.`,
        perche: `${ad.prova} Il volume è la via più economica per aumentare la domanda: `
          + 'costa meno al tessuto del carico e si può togliere subito se pesa troppo.',
        osserva: 'Se le ripetizioni in più arrivano con la stessa pulizia. Se no, si torna indietro di una.',
      };

    case 'carico': {
      const inc = incrementoCarico(top);
      return {
        ...base,
        titolo: 'Adesso i chili',
        azione: top > 0
          ? `${nome}: da ${kgTxt(top)} × ${reps} a ${kgTxt(top + inc)} × ${reps}. Solo sulla serie migliore.`
          : `${nome}: aggiungi il primo carico esterno, il più piccolo disponibile.`,
        perche: `${ad.prova} Il carico si alza quando il sistema ha già dimostrato di reggerlo, non prima.`,
        osserva: 'Le ripetizioni al nuovo peso. Se ne perdi più di due, il salto era troppo alto.',
      };
    }

    case 'cedimento': {
      const rir = ultima?.rirMedio;
      return {
        ...base,
        titolo: 'Stessi numeri, più vicino al limite',
        azione: rir !== null && rir !== undefined
          ? `${nome}: stesso peso e stesse ripetizioni, ma chiudi a ${Math.max(0, arrotonda(rir - 1))} RIR `
            + `invece di ${rir}.`
          : `${nome}: stesso peso, chiudi ogni serie con 1-2 ripetizioni in riserva e registra l'RPE.`,
        perche: `${ad.prova} La fatica dentro la serie sale senza toccare il bilanciere: `
          + 'è l\'aumento più reversibile che esista.',
        osserva: 'Se le ripetizioni tengono nelle serie successive. Se crollano, la riserva era già finita.',
      };
    }

    case 'densita':
      return {
        ...base,
        titolo: 'Stesso lavoro, meno tempo',
        azione: ultima?.densitaKgMin !== null && ultima?.densitaKgMin !== undefined
          ? `${nome}: stesse ${serie} serie, recuperi più corti di 15 secondi `
            + `(oggi ${ultima.densitaKgMin} kg/min).`
          : `${nome}: stesse serie, 15 secondi di recupero in meno.`,
        perche: `${ad.prova} La quantità di lavoro resta identica: cambia il tempo in cui viene prodotta.`,
        osserva: 'Se le ultime serie reggono le stesse ripetizioni con meno recupero.',
      };

    case 'intensita':
      return {
        ...base,
        titolo: 'Più vicino al massimale',
        azione: top > 0
          ? `${nome}: una serie a ${kgTxt(top + incrementoCarico(top) * 2)} per ${Math.max(3, reps - 2)} ripetizioni, `
            + 'poi torna ai carichi di lavoro.'
          : `${nome}: alza l'intensità relativa riducendo le ripetizioni e aumentando il carico.`,
        perche: `${ad.prova} L'intensità relativa sposta la domanda sul sistema nervoso, non sul volume.`,
        osserva: 'La qualità della serie pesante: se la traiettoria cambia, si scende.',
      };

    case 'complessita':
      return {
        ...base,
        titolo: 'Stesso peso, compito più difficile',
        azione: `${nome}: passa alla variante più esigente (bilaterale → monolaterale, stabile → instabile) `
          + 'tenendo il carico dov\'è.',
        perche: `${ad.prova} La complessità aumenta la domanda neuromotoria senza aumentare il carico sul tessuto. `
          + 'La variante giusta la scegli tu: l\'app non misura i gradi di libertà.',
        osserva: 'Il controllo nelle prime tre ripetizioni della nuova variante.',
      };

    default:
      return {
        ...base,
        titolo: 'Aumenta l\'esposizione',
        azione: `${nome}: stessa struttura, esposizione più ampia (ampiezza, controllo, durata).`,
        perche: ad.prova,
        osserva: 'Come regge la nuova esposizione a parità di carico.',
      };
  }
};

// ------------------------------------------------------------
// Le capacità: la domanda finale
// ------------------------------------------------------------

export type CapacitaId = 'forza' | 'lavoro' | 'movimento' | 'carico' | 'controllo' | 'recupero';

export interface CapacitaLetta {
  id: CapacitaId;
  nome: string;
  domanda: string;
  stato: 'misurata' | 'non_misurata';
  valore?: number;
  unita?: string;
  deltaPct?: number;
  verso?: Verso;
  nota: string;
}

/**
 * «Quanto è capace il soggetto di fare oggi rispetto a prima?»
 * Ciò che non abbiamo misurato resta 'non_misurata', senza freccia
 * e senza numero: è la parte del prodotto che deve essere più onesta.
 */
export const leggiCapacita = (
  storia: Sessione[],
  opzioni?: {
    qualita?: { ultima?: QualitaOsservata; precedente?: QualitaOsservata };
    prontezza?: number;
    finestra?: number;
  }
): CapacitaLetta[] => {
  const finestra = opzioni?.finestra || 3;
  const m = seduteUtili(storia);
  const dopo = m.slice(-finestra);
  const prima = m.slice(Math.max(0, m.length - finestra * 2), Math.max(0, m.length - finestra));
  const q = leggiQualita(opzioni?.qualita?.ultima, opzioni?.qualita?.precedente);

  const riga = (
    id: CapacitaId, nome: string, domanda: string, unita: string,
    a: number | null, b: number | null, notaVuota: string
  ): CapacitaLetta => {
    if (b === null) return { id, nome, domanda, stato: 'non_misurata', nota: notaVuota };
    if (a === null) {
      return {
        id, nome, domanda, stato: 'misurata', valore: b, unita,
        nota: 'Prima lettura: serve una seconda finestra per parlare di direzione.',
      };
    }
    return {
      id, nome, domanda, stato: 'misurata', valore: b, unita,
      deltaPct: pct(a, b) ?? undefined, verso: versoDi(a, b),
      nota: `Prima ${a} ${unita}, adesso ${b} ${unita}.`,
    };
  };

  const capacita: CapacitaLetta[] = [
    riga('forza', 'Forza', 'Quanto sa esprimere?', 'kg stimati',
      media(prima.map((x) => (x.massimaleStimato > 0 ? x.massimaleStimato : null))),
      media(dopo.map((x) => (x.massimaleStimato > 0 ? x.massimaleStimato : null))),
      'Nessuna serie sotto le 12 ripetizioni con un carico: il massimale non è stimabile.'),
    riga('lavoro', 'Capacità di lavoro', 'Quanto lavoro sostiene?', 'kg per seduta',
      media(prima.map((x) => x.volumeKg)), media(dopo.map((x) => x.volumeKg)),
      'Nessun volume registrato.'),
    riga('carico', 'Capacità di carico', 'Quanto carico tollera?', 'kg',
      media(prima.map((x) => (x.caricoTop > 0 ? x.caricoTop : null))),
      media(dopo.map((x) => (x.caricoTop > 0 ? x.caricoTop : null))),
      'Nessun carico esterno registrato.'),
  ];

  // Movimento e controllo arrivano dalle valutazioni, non dai log.
  const prof = opzioni?.qualita?.ultima?.profonditaGrad;
  const profPrima = opzioni?.qualita?.precedente?.profonditaGrad;
  capacita.push(
    typeof prof === 'number'
      ? {
        id: 'movimento', nome: 'Capacità di movimento', domanda: 'Quanto movimento sa produrre?',
        stato: 'misurata', valore: arrotonda(prof), unita: '° al fondo',
        ...(typeof profPrima === 'number'
          ? { deltaPct: pct(profPrima, prof) ?? undefined, verso: versoDi(profPrima, prof) }
          : {}),
        nota: prof > SOGLIE.profonditaParziale
          ? 'Ampiezza ancora parziale.'
          : 'Ampiezza piena raggiunta.',
      }
      : {
        id: 'movimento', nome: 'Capacità di movimento', domanda: 'Quanto movimento sa produrre?',
        stato: 'non_misurata',
        nota: 'Serve un\'analisi dello squat: l\'ampiezza non si deduce dai chili.',
      }
  );

  capacita.push({
    id: 'controllo', nome: 'Capacità di controllo', domanda: 'Quanto controlla il movimento?',
    stato: q.stato === 'non_misurata' ? 'non_misurata' : 'misurata',
    ...(q.stato === 'migliora' ? { verso: 'giu' as Verso } : {}),
    ...(q.stato === 'peggiora' ? { verso: 'su' as Verso } : {}),
    nota: q.stato === 'non_misurata'
      ? 'Servono due analisi dello squat per leggere i compensi nel tempo.'
      : (q.segnale || 'I compensi misurati sono stabili.'),
  });

  const rirDopo = media(dopo.map((x) => x.rirMedio));
  const rirPrima = media(prima.map((x) => x.rirMedio));
  const serieConRpe = dopo.reduce((s, x) => s + x.serieConRpe, 0);
  capacita.push(
    typeof opzioni?.prontezza === 'number'
      ? {
        id: 'recupero', nome: 'Capacità di recupero', domanda: 'Quanto recupera dallo stimolo?',
        stato: 'misurata', valore: Math.round(opzioni.prontezza), unita: '/100',
        nota: rirDopo !== null && rirPrima !== null
          ? `Riserva a fine serie: ${rirPrima} → ${rirDopo} RIR.`
          : 'Prontezza dal gemello.',
      }
      : serieConRpe >= SOGLIE.serieConRpe && rirDopo !== null
        ? {
          id: 'recupero', nome: 'Capacità di recupero', domanda: 'Quanto recupera dallo stimolo?',
          stato: 'misurata', valore: rirDopo, unita: 'RIR',
          ...(rirPrima !== null ? { verso: versoDi(rirPrima, rirDopo) } : {}),
          nota: 'Letta dalla riserva a fine serie, in mancanza di prontezza calcolata.',
        }
        : {
          id: 'recupero', nome: 'Capacità di recupero', domanda: 'Quanto recupera dallo stimolo?',
          stato: 'non_misurata',
          nota: 'Serve la prontezza del gemello o l\'RPE registrato sulle serie.',
        }
  );

  return capacita;
};

// ------------------------------------------------------------
// Il riassunto che va all'AI
// ------------------------------------------------------------

/**
 * L'AI non decide l'asse: lo decidono le formule qui sopra.
 * All'AI si consegnano i fatti misurati e l'asse scelto, e le si
 * chiede di scrivere la scheda LUNGO quell'asse. È il motivo per
 * cui non può rispondere "aggiungi 2,5 kg" a tutto.
 */
export const sintesiPerAI = (i: IngressoProgressione, passo: PassoProposto): string => {
  const a = asse(passo.asse);
  const conf = confronta(i.storia, i.esercizio)
    .filter((c) => c.verso !== 'non_misurato')
    .map((c) => `- ${c.etichetta}: ${c.prima} → ${c.dopo} ${c.unita} (${c.verso})`);

  return [
    `ASSE DI PROGRESSIONE DECISO DAL MOTORE: ${a.nome} (${a.nomeEn}) — livello ${a.livello}.`,
    `Cosa deve aumentare: ${a.cosaAumenta}.`,
    passo.richiedeOcchio
      ? 'ATTENZIONE: questo asse non è misurato dall\'app. Proponi, non affermare.'
      : 'Questo asse è misurato dai dati della seduta.',
    '',
    'FATTI MISURATI (non aggiungerne altri, non inventare numeri):',
    ...passo.prove.map((p) => `- ${p}`),
    ...(conf.length ? ['', 'ANDAMENTO fra le ultime sedute e le precedenti:', ...conf] : []),
    '',
    `AZIONE DA TRADURRE IN SCHEDA: ${passo.azione}`,
    `MOTIVO DA SPIEGARE ALL'ALLIEVO: ${passo.perche}`,
    '',
    'REGOLE: aumenta SOLO lungo l\'asse indicato; lascia invariato tutto il resto; '
    + 'non aggiungere carico se l\'asse non è il carico; nessuna diagnosi; '
    + 'parla all\'allievo in italiano semplice.',
  ].join('\n');
};
