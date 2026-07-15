import { computeSignatures, pearson, PortraitEvent } from '../portrait';

// ============================================================
// Test Ritratto ESSĒRE: persone sintetiche con personalità NOTE
// — se il motore riconosce il mattiniero costruito a tavolino,
// possiamo fidarci quando legge Mario.
// ============================================================

const MS_DAY = 86400000;
const NOW = new Date('2026-07-14T20:00:00');

const ev = (type: string, daysAgo: number, hour: number, payload: Record<string, any> = {}): PortraitEvent => {
  const d = new Date(NOW.getTime() - daysAgo * MS_DAY);
  d.setHours(hour, 30, 0, 0);
  return { type, ts: d, payload };
};

/** Persona sintetica: mattiniera, costante 3×/settimana, volume in
 *  crescita, recupero rapido, check-in quotidiano con umore stabile. */
const buildMorningGrinder = (): PortraitEvent[] => {
  const events: PortraitEvent[] = [];
  for (let week = 0; week < 10; week++) {
    for (const day of [1, 3, 5]) {
      const daysAgo = week * 7 + day;
      const volume = 3000 + (10 - week) * 150; // cresce verso il presente
      events.push(ev('gym.checkin', daysAgo, 7));
      events.push(ev('workout.completed', daysAgo, 8, { total_volume_kg: volume }));
    }
    for (let d = 0; d < 7; d++) {
      const daysAgo = week * 7 + d;
      events.push(ev('wellness.checkin_submitted', daysAgo, 7, {
        score: 75, mood: 4, sleep: 4, energy: 4, soreness: 2,
      }));
    }
  }
  return events;
};

describe('Pearson', () => {
  it('correlazione perfetta = 1, inversa = -1, piatta = 0', () => {
    expect(pearson([1, 2, 3, 4], [2, 4, 6, 8])).toBeCloseTo(1, 5);
    expect(pearson([1, 2, 3, 4], [8, 6, 4, 2])).toBeCloseTo(-1, 5);
    expect(pearson([1, 2, 3, 4], [5, 5, 5, 5])).toBe(0);
  });
});

describe('Ritratto — persona sintetica nota (mattiniera costante)', () => {
  const sig = computeSignatures(buildMorningGrinder(), 90);
  const byKey = (k: string) => sig.signatures.find((s) => s.key === k);

  it('riconosce il cronotipo mattutino con prova', () => {
    const c = byKey('cronotipo');
    expect(c?.label).toBe('Mattiniero');
    expect(c?.evidence).toContain('%');
    expect(c?.confidence).toBe('solida');
  });

  it('riconosce il ritmo costante ~3/settimana', () => {
    const r = byKey('ritmo');
    expect(r?.label).toContain('Costante');
    expect(r?.evidence).toContain('settimana');
  });

  it('riconosce il volume in crescita', () => {
    expect(byKey('progressione')?.label).toBe('In crescita');
  });

  it('riconosce il recupero rapido (readiness stabile dopo i carichi)', () => {
    expect(byKey('recupero')?.label).toBe('Recupero rapido');
  });

  it('umore stabile + frequenza stabile → "si allena a prescindere"', () => {
    expect(byKey('legame_umore')?.label).toBe('Si allena a prescindere');
  });

  it('costanza: 10 settimane di fila', () => {
    expect(byKey('costanza')?.label).toContain('settimane di fila');
  });

  it('maturità: ritratto ricco (≥3 firme solide)', () => {
    expect(sig.maturity).toBe('ricco');
  });
});

describe("Ritratto — persona serale sensibile all'umore", () => {
  const events: PortraitEvent[] = [];
  // 8 settimane: umore alterna alto/basso; si allena SOLO nelle settimane di umore alto
  for (let week = 0; week < 8; week++) {
    const happy = week % 2 === 0;
    for (let d = 0; d < 7; d++) {
      events.push(ev('wellness.checkin_submitted', week * 7 + d, 21, {
        score: happy ? 80 : 40, mood: happy ? 5 : 2, sleep: 3, energy: 3, soreness: 2,
      }));
    }
    if (happy) {
      for (const day of [1, 4]) {
        events.push(ev('workout.completed', week * 7 + day, 20, { total_volume_kg: 2500 }));
      }
    }
  }
  const sig = computeSignatures(events, 90);
  const byKey = (k: string) => sig.signatures.find((s) => s.key === k);

  it('riconosce il cronotipo serale', () => {
    expect(byKey('cronotipo')?.label).toBe('Serale');
  });

  it("riconosce la sensibilità all'umore (si allena solo quando sta bene)", () => {
    expect(byKey('legame_umore')?.label).toBe("Sensibile all'umore");
  });

  it('ritmo a ondate, non costante', () => {
    expect(byKey('ritmo')?.label).toContain('ondate');
  });
});

describe('Onestà sul cold start', () => {
  it('pochissimi eventi → nessun tratto inventato, maturità "appena_iniziato"', () => {
    const few = [
      ev('gym.checkin', 1, 9),
      ev('workout.completed', 1, 10, { total_volume_kg: 2000 }),
      ev('wellness.checkin_submitted', 0, 8, { score: 70, mood: 4 }),
    ];
    const sig = computeSignatures(few, 90);
    expect(sig.signatures.length).toBeLessThanOrEqual(1);
    expect(sig.maturity).toBe('appena_iniziato');
  });

  it('zero eventi → zero firme, zero crash', () => {
    const sig = computeSignatures([], 90);
    expect(sig.signatures).toHaveLength(0);
    expect(sig.eventsCount).toBe(0);
  });
});
