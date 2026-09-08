import {
  computeScore,
  adviceForScore,
  calculateLevel,
  xpForLevel,
  calculateCollaboratorEarnings,
  calculateFullEarnings,
  daysUntilDue,
  isInstallmentOverdue,
} from '../formulas';

// ============================================================
// Test smoke M0: la logica che fa danni se sbaglia
// (punteggi Stato ESSĒRE, XP/livelli, soldi, scadenze rate)
// ============================================================

describe('Stato ESSĒRE — computeScore', () => {
  it('caso peggiore = 0 (tutto al minimo, dolori al massimo)', () => {
    expect(computeScore(1, 1, 1, 5)).toBe(0);
  });

  it('caso migliore = 100 (tutto al massimo, dolori al minimo)', () => {
    expect(computeScore(5, 5, 5, 1)).toBe(100);
  });

  it('valori medi = 50', () => {
    expect(computeScore(3, 3, 3, 3)).toBe(50);
  });

  it('i dolori sono invertiti: più dolore = punteggio più basso', () => {
    const pocoDolore = computeScore(4, 4, 4, 1);
    const moltoDolore = computeScore(4, 4, 4, 5);
    expect(pocoDolore).toBeGreaterThan(moltoDolore);
  });

  it('il punteggio è sempre 0-100 e intero su tutta la griglia', () => {
    for (let sleep = 1; sleep <= 5; sleep++)
      for (let energy = 1; energy <= 5; energy++)
        for (let mood = 1; mood <= 5; mood++)
          for (let soreness = 1; soreness <= 5; soreness++) {
            const s = computeScore(sleep, energy, mood, soreness);
            expect(s).toBeGreaterThanOrEqual(0);
            expect(s).toBeLessThanOrEqual(100);
            expect(Number.isInteger(s)).toBe(true);
          }
  });
});

describe('Stato ESSĒRE — adviceForScore (soglie 75/50)', () => {
  it('75+ = spingere (verde)', () => {
    expect(adviceForScore(75).color).toBe('success');
    expect(adviceForScore(100).color).toBe('success');
  });

  it('50-74 = moderato (giallo)', () => {
    expect(adviceForScore(50).color).toBe('warning');
    expect(adviceForScore(74).color).toBe('warning');
  });

  it('sotto 50 = recupero (rosso)', () => {
    expect(adviceForScore(49).color).toBe('error');
    expect(adviceForScore(0).color).toBe('error');
  });
});

describe('Gamification — livelli e XP', () => {
  it('0 XP = livello 1', () => {
    expect(calculateLevel(0)).toBe(1);
  });

  it('le soglie livello sono coerenti con xpForLevel', () => {
    // raggiunti gli XP totali del livello L, si è almeno al livello L+1
    for (let level = 1; level <= 10; level++) {
      const xp = xpForLevel(level);
      expect(calculateLevel(xp)).toBe(level + 1);
      expect(calculateLevel(xp - 1)).toBe(level);
    }
  });

  it('xpForLevel è crescente', () => {
    for (let level = 1; level < 20; level++) {
      expect(xpForLevel(level + 1)).toBeGreaterThan(xpForLevel(level));
    }
  });
});

describe('Pagamenti — ripartizione incassi', () => {
  it('commissione coach 30% su 100€', () => {
    const r = calculateCollaboratorEarnings(100, 30);
    expect(r.collaboratorShare).toBe(30);
    expect(r.ownerShare).toBe(70);
  });

  it('le quote sommano SEMPRE al totale (mai creare o distruggere denaro)', () => {
    for (const total of [0, 35, 89.9, 249, 1490]) {
      for (const pct of [0, 10, 33.5, 50, 100]) {
        const r = calculateCollaboratorEarnings(total, pct);
        expect(r.collaboratorShare + r.ownerShare).toBeCloseTo(total, 10);
      }
    }
  });

  it('ripartizione a tre (coach + manager + owner) somma al totale', () => {
    const r = calculateFullEarnings(200, 30, 10);
    expect(r.coachShare).toBe(60);
    expect(r.managerShare).toBe(20);
    expect(r.ownerShare).toBe(120);
    expect(r.coachShare + r.managerShare + r.ownerShare).toBeCloseTo(200, 10);
  });

  it('commissioni a zero: tutto all owner', () => {
    const r = calculateFullEarnings(150, 0, 0);
    expect(r.ownerShare).toBe(150);
  });
});

describe('Pagamenti — scadenze rate', () => {
  const today = new Date('2026-07-04T15:30:00');

  it('rata che scade oggi: 0 giorni, non in ritardo', () => {
    const due = new Date('2026-07-04T09:00:00');
    expect(daysUntilDue(due, today)).toBe(0);
    expect(isInstallmentOverdue(due, false, today)).toBe(false);
  });

  it('rata scaduta ieri: -1 giorno, in ritardo se non pagata', () => {
    const due = new Date('2026-07-03');
    expect(daysUntilDue(due, today)).toBe(-1);
    expect(isInstallmentOverdue(due, false, today)).toBe(true);
  });

  it('rata scaduta ma pagata: NON in ritardo', () => {
    const due = new Date('2026-06-01');
    expect(isInstallmentOverdue(due, true, today)).toBe(false);
  });

  it('rata tra 15 giorni', () => {
    const due = new Date('2026-07-19');
    expect(daysUntilDue(due, today)).toBe(15);
  });
});
