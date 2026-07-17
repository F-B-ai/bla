import { allTemplates, essereTemplates } from '../workoutTemplates';
import { allDefaultExercises } from '../defaultExercises';

// ============================================================
// Guardia di coerenza: i template citano SOLO esercizi che
// esistono in libreria (un refuso nel nome = esercizio senza
// descrizione per l'allievo), e la filosofia del founder è
// rispettata (petto col bilanciere solo nella forza pesante).
// ============================================================

const lib = new Set(allDefaultExercises.map((e) => e.name.toLowerCase()));

describe('Libreria esercizi', () => {
  it('nessun duplicato', () => {
    const names = allDefaultExercises.map((e) => e.name.toLowerCase());
    expect(names.length).toBe(new Set(names).size);
  });

  it('panca declinata con bilanciere eliminata (decisione founder)', () => {
    expect(allDefaultExercises.some((e) => /declinata/i.test(e.name))).toBe(false);
  });

  it('la panca piana con bilanciere è marcata come riservata alla forza', () => {
    const panca = allDefaultExercises.find((e) => e.name === 'Panca piana con bilanciere');
    expect(panca?.notes).toContain('FORZA');
  });
});

describe('Template ESSĒRE — coerenza con la libreria', () => {
  it('ogni esercizio citato (inclusi abbinati e giri giganti) esiste in libreria', () => {
    const missing: string[] = [];
    for (const t of essereTemplates) {
      for (const day of t.weeklySchedule) {
        for (const e of day.exercises) {
          if (!lib.has(e.name.toLowerCase())) missing.push(`${t.name} → ${e.name}`);
          if (e.pairedExerciseName && !lib.has(e.pairedExerciseName.toLowerCase())) {
            missing.push(`${t.name} → abbinato: ${e.pairedExerciseName}`);
          }
          for (const g of e.giantExercises || []) {
            if (!lib.has(g.name.toLowerCase())) missing.push(`${t.name} → gigante: ${g.name}`);
          }
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it('6 template nuovi: postura/forza/ipertrofia uomo + postura/drenante/ricomposizione donna', () => {
    expect(essereTemplates).toHaveLength(6);
    const cats = essereTemplates.map((t) => `${t.gender}:${t.category}`);
    expect(cats).toEqual(expect.arrayContaining([
      'male:Posturale', 'male:Forza', 'male:Ipertrofia',
      'female:Posturale', 'female:Drenante', 'female:Ricomposizione',
    ]));
  });

  it('filosofia petto: bilanciere SOLO nel template di forza', () => {
    for (const t of essereTemplates) {
      for (const day of t.weeklySchedule) {
        for (const e of day.exercises) {
          if (/panca.*bilanciere/i.test(e.name)) {
            expect(t.category).toBe('Forza');
          }
        }
      }
    }
  });

  it('le tecniche avanzate nei template sono configurate complete', () => {
    for (const t of essereTemplates) {
      for (const day of t.weeklySchedule) {
        for (const e of day.exercises) {
          if (e.technique === 'superset' || e.technique === 'compound_set') {
            expect(e.pairedExerciseName).toBeTruthy();
            expect(e.pairedReps).toBeTruthy();
          }
          if (e.technique === 'giant_set') {
            expect((e.giantExercises || []).length).toBeGreaterThanOrEqual(1);
          }
          if (e.technique === 'rest_pause_failure') {
            expect(e.rpPauses).toBeGreaterThanOrEqual(1);
          }
        }
      }
    }
  });

  it('tutti i template (vecchi e nuovi) hanno almeno 2 giorni e 3 esercizi/giorno', () => {
    for (const t of allTemplates) {
      expect(t.weeklySchedule.length).toBeGreaterThanOrEqual(2);
      for (const day of t.weeklySchedule) {
        expect(day.exercises.length).toBeGreaterThanOrEqual(3);
      }
    }
  });
});
