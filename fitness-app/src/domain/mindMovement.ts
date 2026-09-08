// ============================================================
// MIND MOVEMENT™ — scoring dei domini (dominio puro)
// ------------------------------------------------------------
// Ogni test produce un punteggio normalizzato 0-100; il dominio
// è la media dei suoi test compilati. Nessun test compilato =
// dominio "non valutato" (mai numeri inventati). I punteggi
// orientano il colloquio: l'interpretazione resta del
// professionista (doc 06: mai diagnosi).
// ============================================================

import {
  MM_TESTS,
  MM_DOMAINS,
  MMDomainKey,
  MMTest,
  MM_PROTOCOL_VERSION,
} from '../data/mindMovementProtocol';

export const MM_SCORING_VERSION = 1;

export interface MMResult {
  testId: string;
  /** score5: 1-5 · seconds: numero · choice: indice opzione (0 = migliore) · leftright: indice 0-3 */
  value: number;
  nota?: string;
}

export interface MMDomainScore {
  key: MMDomainKey;
  nome: string;
  emoji: string;
  /** 0-100, null se nessun test del dominio è stato compilato */
  score: number | null;
  testDone: number;
  testTotal: number;
  /** test con esito da attenzionare (punteggio normalizzato < 50) */
  flags: Array<{ testId: string; nome: string; esito: string }>;
}

export interface MMAssessmentScores {
  protocolVersion: number;
  scoringVersion: number;
  domains: MMDomainScore[];
  /** media dei domini valutati, null se nessuno */
  overall: number | null;
  compiled: number;
  total: number;
}

const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));

/** Normalizza il valore di un test a 0-100 (100 = ottimale). */
export const normalizeResult = (test: MMTest, value: number): number => {
  switch (test.input) {
    case 'score5':
      return Math.round(clamp01((value - 1) / 4) * 100);
    case 'seconds': {
      // soglia = 50; il doppio della soglia = 100
      const soglia = test.sogliaSecondi || 10;
      return Math.round(clamp01(value / (soglia * 2)) * 100);
    }
    case 'choice': {
      const n = (test.opzioni || []).length;
      if (n <= 1) return 100;
      return Math.round(clamp01(1 - value / (n - 1)) * 100);
    }
    case 'leftright':
      // 0 = norma (100) · alterato mono (40) · bilaterale (20)
      return value === 0 ? 100 : value === 3 ? 20 : 40;
  }
};

/** Descrive l'esito di un test in parole (per flags e sintesi AI). */
export const describeResult = (test: MMTest, value: number): string => {
  switch (test.input) {
    case 'score5':
      return `${value}/5`;
    case 'seconds':
      return `${value}s${test.sogliaSecondi ? ` (soglia ${test.sogliaSecondi}s)` : ''}`;
    case 'choice':
      return (test.opzioni || [])[value] || `opzione ${value}`;
    case 'leftright':
      return ['nella norma', 'alterato sx', 'alterato dx', 'alterato bilaterale'][value] || `${value}`;
  }
};

export const computeMMScores = (results: MMResult[]): MMAssessmentScores => {
  const byId = new Map(results.map((r) => [r.testId, r]));
  const domains: MMDomainScore[] = MM_DOMAINS.map((d) => {
    const tests = MM_TESTS.filter((t) => t.dominio === d.key);
    const done = tests.filter((t) => byId.has(t.id));
    const scores = done.map((t) => normalizeResult(t, (byId.get(t.id) as MMResult).value));
    const flags = done
      .map((t) => ({ t, s: normalizeResult(t, (byId.get(t.id) as MMResult).value) }))
      .filter(({ s }) => s < 50)
      .map(({ t }) => ({
        testId: t.id,
        nome: t.nome,
        esito: describeResult(t, (byId.get(t.id) as MMResult).value),
      }));
    return {
      key: d.key,
      nome: d.nome,
      emoji: d.emoji,
      score: scores.length === 0 ? null : Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      testDone: done.length,
      testTotal: tests.length,
      flags,
    };
  });

  const valutati = domains.filter((d) => d.score !== null);
  return {
    protocolVersion: MM_PROTOCOL_VERSION,
    scoringVersion: MM_SCORING_VERSION,
    domains,
    overall: valutati.length === 0
      ? null
      : Math.round(valutati.reduce((a, d) => a + (d.score as number), 0) / valutati.length),
    compiled: results.length,
    total: MM_TESTS.length,
  };
};
