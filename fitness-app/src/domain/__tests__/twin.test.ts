import {
  computeReadinessV2,
  READINESS_FORMULA_VERSION,
  READINESS_WEIGHTS,
} from '../formulas';
import {
  ulid,
  dayKey,
  deterministicEventId,
  H0_CLIENT_EVENT_TYPES,
  PER_DAY_TYPES,
  TWIN_SCHEMA_VERSION,
} from '../twinEvents';

// ============================================================
// Test M3: readiness v2 (formula canonica 03 §2.1) e spina
// dorsale eventi twin (02 §3). Criterio di accettazione:
// "stesso input → stesso punteggio" verificato in CI.
// ============================================================

describe('Readiness v2 — formula canonica (03 §2.1)', () => {
  it('i pesi sommano a 1 (invariante della formula)', () => {
    const sum =
      READINESS_WEIGHTS.sleep +
      READINESS_WEIGHTS.energy +
      READINESS_WEIGHTS.mood +
      READINESS_WEIGHTS.soreness;
    expect(sum).toBeCloseTo(1, 10);
  });

  it('caso peggiore = 0 (tutto al minimo, dolori al massimo)', () => {
    expect(computeReadinessV2(1, 1, 1, 5).score).toBe(0);
  });

  it('caso migliore = 100 (tutto al massimo, nessun dolore)', () => {
    expect(computeReadinessV2(5, 5, 5, 1).score).toBe(100);
  });

  it('tutto a metà (3,3,3,3) = 50', () => {
    expect(computeReadinessV2(3, 3, 3, 3).score).toBe(50);
  });

  it('il sonno pesa più dell\'umore (0.30 vs 0.20)', () => {
    const soloSonno = computeReadinessV2(5, 1, 1, 5).score; // solo sonno pieno
    const soloUmore = computeReadinessV2(1, 1, 5, 5).score; // solo umore pieno
    expect(soloSonno).toBe(30);
    expect(soloUmore).toBe(20);
    expect(soloSonno).toBeGreaterThan(soloUmore);
  });

  it('riproducibile: stesso input → stesso punteggio (criterio M3)', () => {
    const a = computeReadinessV2(4, 3, 5, 2);
    const b = computeReadinessV2(4, 3, 5, 2);
    expect(a.score).toBe(b.score);
    expect(a.breakdown).toEqual(b.breakdown);
    expect(a.version).toBe(READINESS_FORMULA_VERSION);
  });

  it('la scomposizione spiega il punteggio (somma ≈ score)', () => {
    const r = computeReadinessV2(4, 3, 5, 2);
    const sum =
      r.breakdown.sleep + r.breakdown.energy + r.breakdown.mood + r.breakdown.soreness;
    expect(Math.abs(sum - r.score)).toBeLessThanOrEqual(0.5);
  });

  it('input fuori scala vengono clampati (robustezza)', () => {
    expect(computeReadinessV2(9, 9, 9, -3).score).toBe(100);
    expect(computeReadinessV2(0, 0, 0, 99).score).toBe(0);
  });
});

describe('Twin events — spina dorsale (02 §3)', () => {
  it('schema version = 1', () => {
    expect(TWIN_SCHEMA_VERSION).toBe(1);
  });

  it('la tassonomia H0 client contiene i tipi cablati nei service', () => {
    for (const t of [
      'wellness.checkin_submitted',
      'gym.checkin',
      'workout.started',
      'workout.completed',
      'workout.abandoned',
      'body.composition_estimated',
      'posture.assessed',
    ]) {
      expect(H0_CLIENT_EVENT_TYPES).toContain(t);
    }
  });

  it('ULID: 26 caratteri, ordinabile per tempo', () => {
    const a = ulid(1000000000000);
    const b = ulid(2000000000000);
    expect(a).toHaveLength(26);
    expect(b).toHaveLength(26);
    expect(a < b).toBe(true); // il prefisso tempo ordina lessicograficamente
  });

  it('ULID: due chiamate stesso ms → id diversi (parte random)', () => {
    expect(ulid(1700000000000)).not.toBe(ulid(1700000000000));
  });

  it('eventi per-giorno: id deterministico → il retry non duplica', () => {
    const day = dayKey(new Date('2026-07-13T18:30:00'));
    const id1 = deterministicEventId('wellness.checkin_submitted', 'p_ABC', day, 'app');
    const id2 = deterministicEventId('wellness.checkin_submitted', 'p_ABC', day, 'app');
    expect(id1).toBe(id2);
    expect(day).toBe('2026-07-13');
    expect(id1).not.toContain('.'); // id Firestore-safe
  });

  it('il check-in benessere è un fatto per-giorno; il workout no', () => {
    expect(PER_DAY_TYPES.has('wellness.checkin_submitted')).toBe(true);
    expect(PER_DAY_TYPES.has('workout.completed')).toBe(false);
  });
});
