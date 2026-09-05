import { computeMMScores, normalizeResult, describeResult } from '../mindMovement';
import { MM_TESTS, MM_DOMAINS } from '../../data/mindMovementProtocol';

// ============================================================
// Test Protocollo Mind Movement™: la batteria è coerente e lo
// scoring non inventa mai numeri su domini non valutati.
// ============================================================

describe('Batteria — coerenza strutturale', () => {
  it('ogni dominio ha almeno 3 test', () => {
    for (const d of MM_DOMAINS) {
      expect(MM_TESTS.filter((t) => t.dominio === d.key).length).toBeGreaterThanOrEqual(3);
    }
  });

  it('id univoci e input validi', () => {
    const ids = MM_TESTS.map((t) => t.id);
    expect(ids.length).toBe(new Set(ids).size);
    for (const t of MM_TESTS) {
      if (t.input === 'choice') expect((t.opzioni || []).length).toBeGreaterThanOrEqual(2);
      if (t.input === 'seconds') expect(t.sogliaSecondi).toBeGreaterThan(0);
    }
  });
});

describe('Normalizzazione', () => {
  const score5 = MM_TESTS.find((t) => t.input === 'score5')!;
  const seconds = MM_TESTS.find((t) => t.input === 'seconds')!;
  const choice = MM_TESTS.find((t) => t.input === 'choice')!;
  const leftright = MM_TESTS.find((t) => t.input === 'leftright')!;

  it('score5: 1 → 0, 3 → 50, 5 → 100', () => {
    expect(normalizeResult(score5, 1)).toBe(0);
    expect(normalizeResult(score5, 3)).toBe(50);
    expect(normalizeResult(score5, 5)).toBe(100);
  });

  it('seconds: soglia → 50, doppio soglia → 100', () => {
    const s = seconds.sogliaSecondi as number;
    expect(normalizeResult(seconds, s)).toBe(50);
    expect(normalizeResult(seconds, s * 2)).toBe(100);
    expect(normalizeResult(seconds, 0)).toBe(0);
  });

  it('choice: prima opzione 100, ultima 0', () => {
    const n = (choice.opzioni || []).length;
    expect(normalizeResult(choice, 0)).toBe(100);
    expect(normalizeResult(choice, n - 1)).toBe(0);
  });

  it('leftright: norma 100, monolaterale 40, bilaterale 20', () => {
    expect(normalizeResult(leftright, 0)).toBe(100);
    expect(normalizeResult(leftright, 1)).toBe(40);
    expect(normalizeResult(leftright, 3)).toBe(20);
  });

  it('describeResult produce testo leggibile', () => {
    expect(describeResult(score5, 4)).toBe('4/5');
    expect(describeResult(leftright, 2)).toContain('dx');
  });
});

describe('Scoring dei domini — onestà', () => {
  it('nessun risultato → tutti i domini null, overall null', () => {
    const s = computeMMScores([]);
    expect(s.overall).toBeNull();
    for (const d of s.domains) expect(d.score).toBeNull();
  });

  it('solo un dominio compilato → gli altri restano null', () => {
    const neuroTests = MM_TESTS.filter((t) => t.dominio === 'neuromotorio');
    const results = neuroTests.map((t) => ({
      testId: t.id,
      value: t.input === 'score5' ? 5 : t.input === 'seconds' ? (t.sogliaSecondi || 10) * 2 : 0,
    }));
    const s = computeMMScores(results);
    const neuro = s.domains.find((d) => d.key === 'neuromotorio')!;
    expect(neuro.score).toBe(100);
    expect(neuro.flags).toHaveLength(0);
    expect(s.domains.find((d) => d.key === 'neurovegetativo')!.score).toBeNull();
    expect(s.overall).toBe(100);
  });

  it('esiti compromessi → flags con esito descritto', () => {
    const romberg = MM_TESTS.find((t) => t.id === 'romberg')!;
    const s = computeMMScores([{ testId: 'romberg', value: (romberg.opzioni!.length - 1) }]);
    const dom = s.domains.find((d) => d.key === 'neuro_recettoriale')!;
    expect(dom.score).toBe(0);
    expect(dom.flags).toHaveLength(1);
    expect(dom.flags[0].nome).toContain('Romberg');
  });

  it('batteria completa perfetta → overall 100', () => {
    const results = MM_TESTS.map((t) => ({
      testId: t.id,
      value: t.input === 'score5' ? 5 : t.input === 'seconds' ? (t.sogliaSecondi || 10) * 2 : 0,
    }));
    const s = computeMMScores(results);
    expect(s.overall).toBe(100);
    expect(s.compiled).toBe(MM_TESTS.length);
  });
});
