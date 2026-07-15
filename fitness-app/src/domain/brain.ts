// ============================================================
// ESSĒRE BRAIN — formule del motore notturno (Tappa 1)
// ------------------------------------------------------------
// Dominio PURO (niente I/O): il batch notturno (functions/brain)
// orchestra, QUI si calcola. Fonti canoniche: doc 02 §4.1 (tabella
// stati derivati) e doc 03 §2.2/2.3 (ACWR EWMA, churn euristico).
// Ogni output porta la versione della formula: un numero senza
// versione non è riproducibile, quindi non esiste.
// ============================================================

export const BRAIN_FORMULAS_VERSION = 1;

// ------------------------------------------------------------
// Trend: pendenza di una serie (regressione lineare semplice)
// ------------------------------------------------------------

/** Pendenza per GIORNO di una serie {dayOffset, value}. */
export const linearSlope = (points: Array<{ x: number; y: number }>): number => {
  const n = points.length;
  if (n < 2) return 0;
  const mx = points.reduce((s, p) => s + p.x, 0) / n;
  const my = points.reduce((s, p) => s + p.y, 0) / n;
  let num = 0;
  let den = 0;
  for (const p of points) {
    num += (p.x - mx) * (p.y - my);
    den += (p.x - mx) * (p.x - mx);
  }
  return den === 0 ? 0 : num / den;
};

// ------------------------------------------------------------
// Carico: ACWR con EWMA (doc 03 §2.2)
// EWMA_t = λ·L_t + (1−λ)·EWMA_{t−1} · λ = 2/(N+1)
// acuto N=7, cronico N=28. Cold start: <21 giorni → "in calibrazione"
// ------------------------------------------------------------

export interface AcwrResult {
  status: 'ok' | 'calibrating';
  acwr?: number;
  acute?: number;
  chronic?: number;
}

export const computeAcwr = (dailyLoads: number[]): AcwrResult => {
  // dailyLoads: carico per giorno, dal più vecchio al più recente
  // (0 nei giorni di riposo). Serve storia ≥ 21 giorni (03 §2.2).
  if (dailyLoads.length < 21) return { status: 'calibrating' };
  const ewma = (n: number): number => {
    const lambda = 2 / (n + 1);
    let v = dailyLoads[0];
    for (let i = 1; i < dailyLoads.length; i++) {
      v = lambda * dailyLoads[i] + (1 - lambda) * v;
    }
    return v;
  };
  const acute = ewma(7);
  const chronic = ewma(28);
  if (chronic <= 0) return { status: 'calibrating' };
  const r = (x: number) => Math.round(x * 100) / 100;
  return { status: 'ok', acwr: r(acute / chronic), acute: r(acute), chronic: r(chronic) };
};

/** Penalità readiness da carico (03 §2.1): 0 · −5 · −10. */
export const acwrPenalty = (acwr: number | undefined): number => {
  if (acwr === undefined) return 0;
  if (acwr > 1.5) return 10;
  if (acwr > 1.3) return 5;
  return 0;
};

// ------------------------------------------------------------
// Rischio abbandono — euristica a punti H0 (doc 02 §4.1)
// Ogni fattore attivo è SPIEGATO: la riga "da attenzionare" mostra
// le cause, mai solo il numero (fiducia del coach).
// ------------------------------------------------------------

export const CHURN_FORMULA_VERSION = 1;

export interface ChurnInput {
  /** presenze nelle ultime 2 settimane */
  presences14d: number;
  /** presenze medie in 2 settimane, baseline personale (8 settimane precedenti) */
  baseline14d: number;
  /** giorni consecutivi senza check-in Stato ESSĒRE */
  checkinGapDays: number;
  /** true se ha almeno una rata scaduta non pagata */
  hasOverdue: boolean;
  /** giorni dall'ultimo workout completato (Infinity se mai) */
  daysSinceWorkout: number;
}

export interface ChurnFactor {
  key: 'presenze' | 'checkin' | 'pagamenti' | 'allenamenti';
  points: number;
  reason: string;
}

export interface ChurnResult {
  version: number;
  score: number; // 0-100
  level: 'verde' | 'giallo' | 'rosso';
  factors: ChurnFactor[];
}

export const computeChurn = (input: ChurnInput): ChurnResult => {
  const factors: ChurnFactor[] = [];

  // Presenze < 50% della baseline personale (+30). Con baseline nulla
  // (nuovo iscritto) il fattore non scatta: niente falsi allarmi day-1.
  if (input.baseline14d >= 2 && input.presences14d < input.baseline14d * 0.5) {
    factors.push({
      key: 'presenze',
      points: 30,
      reason: `${input.presences14d} presenze in 2 settimane (di solito ${Math.round(input.baseline14d)})`,
    });
  }
  if (input.checkinGapDays > 7) {
    factors.push({
      key: 'checkin',
      points: 20,
      reason: `nessun check-in da ${input.checkinGapDays} giorni`,
    });
  }
  if (input.hasOverdue) {
    factors.push({ key: 'pagamenti', points: 25, reason: 'rata scaduta non pagata' });
  }
  if (input.daysSinceWorkout > 10) {
    factors.push({
      key: 'allenamenti',
      points: 25,
      reason: input.daysSinceWorkout === Infinity
        ? 'nessun allenamento registrato'
        : `nessun allenamento da ${input.daysSinceWorkout} giorni`,
    });
  }

  const score = Math.min(100, factors.reduce((s, f) => s + f.points, 0));
  return {
    version: CHURN_FORMULA_VERSION,
    score,
    level: score >= 70 ? 'rosso' : score >= 40 ? 'giallo' : 'verde',
    factors,
  };
};

// ------------------------------------------------------------
// Coda "da attenzionare" — le regole che accendono una riga
// (deterministiche; la proposta AI arriva in Tappa 2)
// ------------------------------------------------------------

export interface AttentionItem {
  type: 'churn' | 'readiness_trend' | 'carico' | 'pagamenti' | 'traguardo';
  severity: 'rosso' | 'giallo' | 'verde';
  reason: string;
}

export interface AttentionInput {
  churn: ChurnResult;
  /** pendenza readiness per giorno sugli ultimi 14gg (negativa = cala) */
  readinessSlope14d: number;
  /** numero di check-in negli ultimi 14gg (per non leggere trend nel vuoto) */
  checkins14d: number;
  acwr: AcwrResult;
  hasOverdue: boolean;
  /** settimane consecutive con ≥2 workout completati */
  consistencyWeeks: number;
}

export const buildAttention = (a: AttentionInput): AttentionItem[] => {
  const items: AttentionItem[] = [];

  if (a.churn.score >= 40) {
    items.push({
      type: 'churn',
      severity: a.churn.level === 'rosso' ? 'rosso' : 'giallo',
      reason: a.churn.factors.map((f) => f.reason).join(' · '),
    });
  }

  // Trend readiness: cala di >1.5 punti/giorno su base dati decente
  if (a.checkins14d >= 5 && a.readinessSlope14d < -1.5) {
    items.push({
      type: 'readiness_trend',
      severity: 'giallo',
      reason: `readiness in calo (~${Math.abs(Math.round(a.readinessSlope14d * 7))} punti/settimana)`,
    });
  }

  if (a.acwr.status === 'ok' && (a.acwr.acwr as number) > 1.5) {
    items.push({
      type: 'carico',
      severity: 'giallo',
      reason: `carico in rapida crescita (ACWR ${a.acwr.acwr}) — valutare scarico`,
    });
  }

  if (a.hasOverdue && a.churn.score < 40) {
    // pagamento scaduto ma persona attiva: tono diverso (promemoria, non sollecito)
    items.push({
      type: 'pagamenti',
      severity: 'giallo',
      reason: 'rata scaduta ma frequenza regolare: probabile dimenticanza',
    });
  }

  // Il positivo È una decisione (celebrare = retention)
  if (a.consistencyWeeks >= 8 && a.churn.score === 0) {
    items.push({
      type: 'traguardo',
      severity: 'verde',
      reason: `${a.consistencyWeeks} settimane di costanza: da riconoscere`,
    });
  }

  const order = { rosso: 0, giallo: 1, verde: 2 } as const;
  return items.sort((x, y) => order[x.severity] - order[y.severity]);
};
