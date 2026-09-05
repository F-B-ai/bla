// ============================================================
// SISTEMA STELLATO — motore di scoring e di decisione
// Metodo Mind Movement™ · specifica §4, §5, §7
// ------------------------------------------------------------
// FUNZIONE PURA: stessi input → stesso output, sempre. Nessuna
// dipendenza da rete, orologio o stato globale: è testabile in
// isolamento (§7, riga "Motore di scoring") e ogni referto resta
// riproducibile anche dopo l'aggiornamento delle regole.
//
// REGOLA D'ORO (§5): il software PROPONE, l'operatore VALIDA.
// L'output porta sempre `richiedeFirmaOperatore: true`. Nessuna
// prescrizione è consegnabile senza conferma umana.
// ============================================================

import {
  CATALOG_VERSION,
  CHAINS,
  ChainKey,
  StellatoTest,
  TEST_BY_ID,
  VALIDATION_WEIGHT,
  STAR_LINKS,
  PRESCRIPTION_RULES,
  PrescriptionRule,
  RuleCondition,
  DEFAULT_THRESHOLDS,
  StellatoThresholds,
  RED_FLAGS,
} from '../data/stellatoProtocol';

export const SCORING_VERSION = 1;

// ------------------------------------------------------------
// Input
// ------------------------------------------------------------

export interface TestResult {
  testId: string;
  /** test monolaterale: valore numerico, oppure indice opzione per 'category' */
  value?: number;
  /** test bilaterale */
  left?: number;
  right?: number;
  /** test di confronto: il quadro di riferimento è cambiato? */
  cambia?: boolean;
  nota?: string;
}

export interface StellatoInput {
  results: TestResult[];
  /** id delle red flag positive (§2.1) */
  redFlags?: string[];
  thresholds?: StellatoThresholds;
}

// ------------------------------------------------------------
// Output
// ------------------------------------------------------------

export interface ChainScore {
  key: ChainKey;
  sigla: string;
  nome: string;
  /** 0-100 · null se nessun test della catena è stato compilato */
  score: number | null;
  /** |sinistra − destra| medio pesato · null se nessun test bilaterale */
  asimmetria: number | null;
  testUsati: number;
  /** somma dei pesi efficaci: quanto è "sostenuto" il punteggio */
  pesoTotale: number;
}

export interface StarReading {
  a: ChainKey;
  b: ChainKey;
  lettura: string;
  conseguenza: string;
  /** differenziale a − b (positivo = a più disponibile di b) */
  differenziale: number | null;
  /** la relazione è rilevante per questo soggetto? */
  rilevante: boolean;
}

export interface CausativeReceptor {
  recettore: 'podalico' | 'oculare' | 'occlusale';
  testId: string;
  testNome: string;
  validazione: string;
}

export interface Priority {
  ordine: number;
  titolo: string;
  motivo: string;
}

export interface StellatoDecision {
  /** Livello 0: red flag → nessuna prescrizione, referto di invio */
  bloccato: boolean;
  redFlags: string[];
  motivoBlocco?: string;
  /** Livello 1 */
  recettoreCausativo: CausativeReceptor | null;
  /** Livello 2 */
  catenaPrioritaria: ChainKey | null;
  prioritaPerAsimmetria: boolean;
  /** Livello 3 */
  regoleAttivate: PrescriptionRule[];
  priorita: Priority[];
  prescrizione: string[];
  /** raccomandazioni di consulto generate automaticamente (§6.11) */
  consulti: string[];
  /** §5: mai consegnabile senza conferma umana */
  richiedeFirmaOperatore: true;
}

export interface StellatoScores {
  catalogVersion: number;
  scoringVersion: number;
  chains: ChainScore[];
  catenaPiuRestrittiva: ChainKey | null;
  catenaDominante: ChainKey | null;
  relazioni: StarReading[];
  /** misure oggettive ad alta validazione: le uniche confrontabili nel tempo (§6.6) */
  misureOggettive: Array<{ testId: string; nome: string; valore: string; unita?: string }>;
  compilati: number;
  totali: number;
  /** test compilati che sono ancora "da definire" col founder: esclusi dallo scoring */
  esclusiDaDefinire: string[];
}

export interface StellatoOutcome {
  scores: StellatoScores;
  decision: StellatoDecision;
}

// ------------------------------------------------------------
// Normalizzazione: ogni test → 0-100 (100 = piena disponibilità)
// ------------------------------------------------------------

const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));
const round1 = (x: number): number => Math.round(x * 10) / 10;

/** Normalizza un singolo valore secondo il tipo di input del test. */
export const normalizeValue = (test: StellatoTest, value: number): number | null => {
  switch (test.input) {
    case 'number': {
      const peggiore = test.peggiore;
      const migliore = test.migliore;
      if (peggiore === undefined || migliore === undefined) return null;
      if (peggiore === migliore) return null;
      // funziona in entrambi i versi: migliore può essere < peggiore
      return Math.round(clamp01((value - peggiore) / (migliore - peggiore)) * 100);
    }
    case 'scale03':
      // 0 = nessun segno (ottimale), 3 = massimo (peggiore)
      return Math.round(clamp01((3 - value) / 3) * 100);
    case 'scale05':
      // 5 = forza piena
      return Math.round(clamp01(value / 5) * 100);
    case 'category': {
      const opt = test.opzioni?.[value];
      return opt ? opt.score : null;
    }
    default:
      // 'confronto' e 'flag' non producono punteggio di catena
      return null;
  }
};

/** Punteggio normalizzato di un risultato (media dei due lati se bilaterale). */
const resultScore = (test: StellatoTest, r: TestResult): number | null => {
  if (test.bilaterale && (r.left !== undefined || r.right !== undefined)) {
    const l = r.left !== undefined ? normalizeValue(test, r.left) : null;
    const d = r.right !== undefined ? normalizeValue(test, r.right) : null;
    const vals = [l, d].filter((v): v is number => v !== null);
    if (vals.length === 0) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }
  if (r.value === undefined) return null;
  return normalizeValue(test, r.value);
};

/** Asimmetria |sx − dx| in punti normalizzati, se il test è bilaterale e completo. */
const resultAsymmetry = (test: StellatoTest, r: TestResult): number | null => {
  if (!test.bilaterale || r.left === undefined || r.right === undefined) return null;
  const l = normalizeValue(test, r.left);
  const d = normalizeValue(test, r.right);
  if (l === null || d === null) return null;
  return Math.abs(l - d);
};

/** Peso efficace di un test su una catena: peso dichiarato × peso di validazione (§4.1). */
export const effectiveWeight = (test: StellatoTest, chain: ChainKey): number => {
  const c = test.catene.find((x) => x.chain === chain);
  if (!c) return 0;
  return c.peso * VALIDATION_WEIGHT[test.validazione];
};

// ------------------------------------------------------------
// Punteggi di catena
// ------------------------------------------------------------

export const computeChainScores = (results: TestResult[]): ChainScore[] => {
  return CHAINS.map((chain) => {
    let sumW = 0;
    let sumWS = 0;
    let sumAW = 0;
    let sumAWS = 0;
    let used = 0;

    for (const r of results) {
      const test = TEST_BY_ID[r.testId];
      if (!test || test.daDefinire) continue; // §3.4: escluso finché non è definito
      const w = effectiveWeight(test, chain.key);
      if (w === 0) continue;

      const s = resultScore(test, r);
      if (s !== null) {
        sumW += w;
        sumWS += w * s;
        used++;
      }
      const a = resultAsymmetry(test, r);
      if (a !== null) {
        sumAW += w;
        sumAWS += w * a;
      }
    }

    return {
      key: chain.key,
      sigla: chain.sigla,
      nome: chain.nome,
      score: sumW > 0 ? round1(sumWS / sumW) : null,
      asimmetria: sumAW > 0 ? round1(sumAWS / sumAW) : null,
      testUsati: used,
      pesoTotale: round1(sumW),
    };
  });
};

// ------------------------------------------------------------
// Relazioni della stella (§4.2)
// ------------------------------------------------------------

const readStarLinks = (
  chains: ChainScore[],
  th: StellatoThresholds
): StarReading[] => {
  const byKey: Record<string, ChainScore> = {};
  chains.forEach((c) => { byKey[c.key] = c; });

  return STAR_LINKS.map((link) => {
    const a = byKey[link.a];
    const b = byKey[link.b];
    const diff = a?.score !== null && a?.score !== undefined &&
      b?.score !== null && b?.score !== undefined
      ? round1(a.score - b.score)
      : null;
    // rilevante se il differenziale è marcato, o se una delle due è bassa
    const rilevante = diff !== null && (
      Math.abs(diff) >= th.differentialRelevant ||
      (a.score !== null && a.score < th.chainLow) ||
      (b.score !== null && b.score < th.chainLow)
    );
    return {
      a: link.a, b: link.b,
      lettura: link.lettura,
      conseguenza: link.conseguenza,
      differenziale: diff,
      rilevante,
    };
  });
};

// ------------------------------------------------------------
// Valutazione delle regole dichiarative (§5 L3)
// ------------------------------------------------------------

const chainScore = (chains: ChainScore[], key: ChainKey): number | null =>
  chains.find((c) => c.key === key)?.score ?? null;

const isTestPositivo = (results: TestResult[], testId: string): boolean => {
  const r = results.find((x) => x.testId === testId);
  const test = TEST_BY_ID[testId];
  if (!r || !test) return false;
  if (test.input === 'confronto') return r.cambia === true;
  if (test.input === 'category' && r.value !== undefined) {
    return test.opzioni?.[r.value]?.positivo === true;
  }
  return false;
};

const matchesCondition = (
  when: RuleCondition,
  chains: ChainScore[],
  results: TestResult[],
  th: StellatoThresholds
): boolean => {
  if (when.chainLow) {
    const s = chainScore(chains, when.chainLow);
    if (s === null || s >= th.chainLow) return false;
  }
  if (when.chainHigh) {
    const s = chainScore(chains, when.chainHigh);
    if (s === null || s <= th.chainHigh) return false;
  }
  if (when.testPositivo && !isTestPositivo(results, when.testPositivo)) return false;
  if (when.testOpzione) {
    const r = results.find((x) => x.testId === when.testOpzione!.testId);
    const test = TEST_BY_ID[when.testOpzione.testId];
    if (!r || !test || r.value === undefined) return false;
    if (test.opzioni?.[r.value]?.label !== when.testOpzione.label) return false;
  }
  if (when.differenzialeSopra) {
    const a = chainScore(chains, when.differenzialeSopra.a);
    const b = chainScore(chains, when.differenzialeSopra.b);
    if (a === null || b === null) return false;
    if (Math.abs(a - b) < when.differenzialeSopra.valore) return false;
  }
  if (when.tutteSopra !== undefined) {
    const valued = chains.filter((c) => c.score !== null);
    if (valued.length === 0) return false;
    if (!valued.every((c) => (c.score as number) > when.tutteSopra!)) return false;
  }
  return true;
};

// ------------------------------------------------------------
// Motore di decisione: la gerarchia del §5, in quest'ordine
// e senza scorciatoie.
// ------------------------------------------------------------

export const decide = (
  input: StellatoInput,
  chains: ChainScore[]
): StellatoDecision => {
  const th = input.thresholds || DEFAULT_THRESHOLDS;
  const results = input.results;
  const redFlags = input.redFlags || [];

  // --- Consulti: generati comunque, anche in caso di blocco ---
  const consulti: string[] = [];
  for (const r of results) {
    const test = TEST_BY_ID[r.testId];
    if (!test?.consulto) continue;
    const positivo = isTestPositivo(results, r.testId);
    // per i numerici con follow-up, si segnala se sotto metà scala
    const s = resultScore(test, r);
    const alterato = positivo || (s !== null && s < 50);
    if (alterato) consulti.push(`${test.nome}: ${test.consulto}`);
  }

  // --- LIVELLO 0 — Sicurezza: blocco assoluto, mai bypassabile ---
  if (redFlags.length > 0) {
    const labels = redFlags
      .map((id) => RED_FLAGS.find((f) => f.id === id)?.label || id)
      .join(', ');
    return {
      bloccato: true,
      redFlags,
      motivoBlocco:
        `Red flag positiva (${labels}). Il sistema non produce prescrizione: ` +
        'si genera un referto di invio a un professionista sanitario.',
      recettoreCausativo: null,
      catenaPrioritaria: null,
      prioritaPerAsimmetria: false,
      regoleAttivate: [],
      priorita: [],
      prescrizione: [],
      consulti,
      richiedeFirmaOperatore: true,
    };
  }

  // --- LIVELLO 1 — Recettore causativo ---
  let recettoreCausativo: CausativeReceptor | null = null;
  for (const r of results) {
    const test = TEST_BY_ID[r.testId];
    if (!test?.recettore || test.daDefinire) continue;
    if (test.input === 'confronto' && r.cambia === true) {
      recettoreCausativo = {
        recettore: test.recettore,
        testId: test.id,
        testNome: test.nome,
        validazione: test.validazione,
      };
      break;
    }
  }

  // --- LIVELLO 2 — Catena prioritaria ---
  const valued = chains.filter((c) => c.score !== null);
  let catenaPrioritaria: ChainKey | null = null;
  let prioritaPerAsimmetria = false;

  if (valued.length > 0) {
    const piuBassa = valued.reduce((min, c) =>
      (c.score as number) < (min.score as number) ? c : min);
    catenaPrioritaria = piuBassa.key;

    // L'asimmetria rilevante di un'altra catena ha la precedenza sul valore
    // assoluto: un sistema squilibrato si degrada più in fretta di un
    // sistema uniformemente rigido.
    const asimmetriche = chains
      .filter((c) => c.asimmetria !== null && (c.asimmetria as number) >= th.asymmetryRelevant)
      .sort((a, b) => (b.asimmetria as number) - (a.asimmetria as number));
    if (asimmetriche.length > 0 && asimmetriche[0].key !== piuBassa.key) {
      catenaPrioritaria = asimmetriche[0].key;
      prioritaPerAsimmetria = true;
    }
  }

  // --- LIVELLO 3 — Prescrizione (regole dichiarative) ---
  const regoleAttivate = PRESCRIPTION_RULES
    .filter((rule) => matchesCondition(rule.when, chains, results, th))
    .sort((a, b) => a.ordine - b.ordine);

  const priorita: Priority[] = [];
  if (recettoreCausativo) {
    priorita.push({
      ordine: 1,
      titolo: `Recettore ${recettoreCausativo.recettore}: affrontare per primo`,
      motivo:
        `Il test "${recettoreCausativo.testNome}" ha modificato il quadro di riferimento. ` +
        'Trattare le catene senza toccare l\'ingresso che le organizza produce miglioramenti che regrediscono.',
    });
  }
  if (catenaPrioritaria) {
    const c = chains.find((x) => x.key === catenaPrioritaria)!;
    priorita.push({
      ordine: priorita.length + 1,
      titolo: `Catena ${c.sigla} — ${c.nome}`,
      motivo: prioritaPerAsimmetria
        ? `Asimmetria ${c.asimmetria} punti: ha la precedenza sul valore assoluto.`
        : `Punteggio più basso del profilo (${c.score}).`,
    });
  }
  for (const rule of regoleAttivate) {
    if (priorita.length >= th.maxPriorita) break;
    priorita.push({
      ordine: priorita.length + 1,
      titolo: rule.profilo,
      motivo: rule.prescrizione[0],
    });
  }

  const prescrizione = regoleAttivate.flatMap((r) => r.prescrizione);

  return {
    bloccato: false,
    redFlags: [],
    recettoreCausativo,
    catenaPrioritaria,
    prioritaPerAsimmetria,
    regoleAttivate,
    priorita: priorita.slice(0, th.maxPriorita),
    prescrizione,
    consulti,
    richiedeFirmaOperatore: true,
  };
};

// ------------------------------------------------------------
// API pubblica
// ------------------------------------------------------------

export const computeStellato = (input: StellatoInput): StellatoOutcome => {
  const th = input.thresholds || DEFAULT_THRESHOLDS;
  const results = input.results.filter((r) => TEST_BY_ID[r.testId]);
  const chains = computeChainScores(results);
  const valued = chains.filter((c) => c.score !== null);

  const piuRestrittiva = valued.length
    ? valued.reduce((m, c) => ((c.score as number) < (m.score as number) ? c : m)).key
    : null;
  const dominante = valued.length
    ? valued.reduce((m, c) => ((c.score as number) > (m.score as number) ? c : m)).key
    : null;

  // Misure oggettive (§6.6): solo i test ad alta validazione con output
  // numerico — le uniche adatte a misurare il cambiamento nel tempo.
  const misureOggettive: StellatoScores['misureOggettive'] = [];
  for (const r of results) {
    const t = TEST_BY_ID[r.testId];
    if (!t?.followUp || t.input !== 'number') continue;
    const valore = t.bilaterale
      ? `${r.left ?? '—'} / ${r.right ?? '—'}`
      : `${r.value ?? '—'}`;
    if (valore === '— / —' || valore === '—') continue;
    misureOggettive.push({ testId: t.id, nome: t.nome, valore, unita: t.unita });
  }

  const esclusiDaDefinire = results
    .filter((r) => TEST_BY_ID[r.testId]?.daDefinire)
    .map((r) => TEST_BY_ID[r.testId].nome);

  const scores: StellatoScores = {
    catalogVersion: CATALOG_VERSION,
    scoringVersion: SCORING_VERSION,
    chains,
    catenaPiuRestrittiva: piuRestrittiva,
    catenaDominante: dominante,
    relazioni: readStarLinks(chains, th),
    misureOggettive,
    compilati: results.length,
    totali: Object.keys(TEST_BY_ID).length,
    esclusiDaDefinire,
  };

  return { scores, decision: decide({ ...input, results }, chains) };
};
