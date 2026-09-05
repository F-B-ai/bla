import {
  linearSlope,
  computeAcwr,
  acwrPenalty,
  computeChurn,
  buildAttention,
  BRAIN_FORMULAS_VERSION,
} from '../brain';

// ============================================================
// Test Brain Tappa 1: il motore notturno decide chi finisce
// nella coda del mattino — ogni regola verificata a tavolino.
// ============================================================

describe('Trend — linearSlope', () => {
  it('serie piatta → pendenza 0', () => {
    expect(linearSlope([{ x: 0, y: 70 }, { x: 1, y: 70 }, { x: 2, y: 70 }])).toBe(0);
  });
  it('cala di 2 punti/giorno → pendenza -2', () => {
    const pts = [0, 1, 2, 3, 4].map((d) => ({ x: d, y: 80 - 2 * d }));
    expect(linearSlope(pts)).toBeCloseTo(-2, 5);
  });
  it('meno di 2 punti → 0 (mai NaN)', () => {
    expect(linearSlope([{ x: 0, y: 50 }])).toBe(0);
    expect(linearSlope([])).toBe(0);
  });
});

describe('Carico — ACWR con EWMA (03 §2.2)', () => {
  it('sotto 21 giorni di storia → in calibrazione, MAI un numero', () => {
    const r = computeAcwr(Array(20).fill(100));
    expect(r.status).toBe('calibrating');
    expect(r.acwr).toBeUndefined();
  });

  it('carico costante → ACWR ≈ 1', () => {
    const r = computeAcwr(Array(56).fill(300));
    expect(r.status).toBe('ok');
    expect(r.acwr).toBeCloseTo(1, 1);
  });

  it('raddoppio improvviso nell\'ultima settimana → ACWR > 1.3', () => {
    const loads = [...Array(49).fill(200), ...Array(7).fill(600)];
    const r = computeAcwr(loads);
    expect(r.status).toBe('ok');
    expect(r.acwr as number).toBeGreaterThan(1.3);
  });

  it('stop completo (infortunio/vacanza) → ACWR < 0.8', () => {
    const loads = [...Array(49).fill(300), ...Array(7).fill(0)];
    const r = computeAcwr(loads);
    expect(r.acwr as number).toBeLessThan(0.8);
  });

  it('penalità readiness: 0 / -5 / -10 alle soglie giuste', () => {
    expect(acwrPenalty(1.2)).toBe(0);
    expect(acwrPenalty(1.4)).toBe(5);
    expect(acwrPenalty(1.6)).toBe(10);
    expect(acwrPenalty(undefined)).toBe(0);
  });
});

describe('Churn — euristica a fattori spiegati (02 §4.1)', () => {
  const base = {
    presences14d: 4,
    baseline14d: 4,
    checkinGapDays: 1,
    hasOverdue: false,
    daysSinceWorkout: 2,
  };

  it('allievo regolare → 0, verde, nessun fattore', () => {
    const r = computeChurn(base);
    expect(r.score).toBe(0);
    expect(r.level).toBe('verde');
    expect(r.factors).toHaveLength(0);
    expect(r.version).toBe(1);
  });

  it('presenze crollate sotto il 50% della PROPRIA baseline → +30', () => {
    const r = computeChurn({ ...base, presences14d: 1, baseline14d: 5 });
    expect(r.score).toBe(30);
    expect(r.factors[0].key).toBe('presenze');
    expect(r.factors[0].reason).toContain('1 presenze');
  });

  it('nuovo iscritto (baseline vuota) → il fattore presenze NON scatta', () => {
    const r = computeChurn({ ...base, presences14d: 0, baseline14d: 0 });
    expect(r.factors.find((f) => f.key === 'presenze')).toBeUndefined();
  });

  it('tutti i fattori attivi → cap a 100, rosso', () => {
    const r = computeChurn({
      presences14d: 0,
      baseline14d: 6,
      checkinGapDays: 12,
      hasOverdue: true,
      daysSinceWorkout: 15,
    });
    expect(r.score).toBe(100);
    expect(r.level).toBe('rosso');
    expect(r.factors).toHaveLength(4);
  });

  it('soglie: 40 = giallo, 70 = rosso', () => {
    const giallo = computeChurn({ ...base, checkinGapDays: 9, hasOverdue: true }); // 20+25=45
    expect(giallo.level).toBe('giallo');
    const rosso = computeChurn({ ...base, presences14d: 1, baseline14d: 6, checkinGapDays: 9, hasOverdue: true }); // 30+20+25=75
    expect(rosso.level).toBe('rosso');
  });
});

describe('Coda "da attenzionare" — le regole del mattino', () => {
  const quiet = {
    churn: computeChurn({ presences14d: 4, baseline14d: 4, checkinGapDays: 1, hasOverdue: false, daysSinceWorkout: 2 }),
    readinessSlope14d: 0,
    checkins14d: 10,
    acwr: computeAcwr(Array(56).fill(300)),
    hasOverdue: false,
    consistencyWeeks: 3,
  };

  it('allievo tranquillo → coda vuota (niente rumore)', () => {
    expect(buildAttention(quiet)).toHaveLength(0);
  });

  it('readiness in caduta → segnalato SOLO con dati sufficienti', () => {
    const conDati = buildAttention({ ...quiet, readinessSlope14d: -2, checkins14d: 8 });
    expect(conDati.find((i) => i.type === 'readiness_trend')).toBeDefined();
    const senzaDati = buildAttention({ ...quiet, readinessSlope14d: -2, checkins14d: 2 });
    expect(senzaDati.find((i) => i.type === 'readiness_trend')).toBeUndefined();
  });

  it('rata scaduta ma persona attiva → tono "promemoria", non sollecito', () => {
    const items = buildAttention({ ...quiet, hasOverdue: true });
    const pag = items.find((i) => i.type === 'pagamenti');
    expect(pag?.reason).toContain('dimenticanza');
  });

  it('8 settimane di costanza → riga VERDE (celebrare è una decisione)', () => {
    const items = buildAttention({ ...quiet, consistencyWeeks: 8 });
    expect(items.find((i) => i.type === 'traguardo')?.severity).toBe('verde');
  });

  it('ordinamento: rosso prima di giallo prima di verde', () => {
    const churnRosso = computeChurn({ presences14d: 0, baseline14d: 6, checkinGapDays: 12, hasOverdue: true, daysSinceWorkout: 15 });
    const items = buildAttention({ ...quiet, churn: churnRosso, consistencyWeeks: 8, readinessSlope14d: -2 });
    const sev = items.map((i) => i.severity);
    expect(sev).toEqual([...sev].sort((a, b) => ({ rosso: 0, giallo: 1, verde: 2 }[a] - { rosso: 0, giallo: 1, verde: 2 }[b])));
  });

  it('versione formule dichiarata', () => {
    expect(BRAIN_FORMULAS_VERSION).toBe(1);
  });
});
