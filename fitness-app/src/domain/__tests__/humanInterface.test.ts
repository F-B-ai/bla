import {
  costruisciQuadro, EventoQuadro, HUMAN_INTERFACE_VERSION, ESTRATTORI,
} from '../humanInterface';

// ============================================================
// HUMAN INTERFACE — il quadro nel tempo.
// La regola che tutti i test difendono: con UN solo punto non
// esiste tendenza. Una freccia disegnata su una misura sola è
// una bugia, e questa è la parte del prodotto che deve essere
// più onesta di tutte.
// ============================================================

const g = (giorniFa: number) => new Date(Date.now() - giorniFa * 86400000);

const ev = (type: string, ts: Date, payload: Record<string, any>): EventoQuadro =>
  ({ type, ts, payload });

const traccia = (q: ReturnType<typeof costruisciQuadro>, chiave: string) =>
  q.tracce.find((t) => t.chiave === chiave);

describe('quadro vuoto', () => {
  it('nessun evento: nessuna traccia, nessuna traiettoria, non esplode', () => {
    const q = costruisciQuadro([]);
    expect(q.tracce).toHaveLength(0);
    expect(q.haTraiettoria).toBe(false);
    expect(q.inizio).toBeNull();
    expect(q.areeCoperte).toBe(0);
    expect(q.version).toBe(HUMAN_INTERFACE_VERSION);
  });

  it('eventi malformati non rompono nulla', () => {
    expect(() => costruisciQuadro([
      { type: 'posture.assessed', ts: g(1), payload: {} },
      { type: 'movement.gait_assessed', ts: g(2), payload: { cadence_spm: null } },
      { type: 'body.composition_estimated', ts: g(3), payload: { estimated_body_fat: 'ciao' } },
    ] as any)).not.toThrow();
    const q = costruisciQuadro([
      { type: 'body.composition_estimated', ts: g(3), payload: { estimated_body_fat: 'ciao' } },
    ] as any);
    expect(q.tracce).toHaveLength(0);
  });
});

describe('UNA sola misura = nessuna tendenza', () => {
  it('un solo punto → "prima_volta", mai migliora o peggiora', () => {
    const q = costruisciQuadro([
      ev('body.composition_estimated', g(10), { estimated_body_fat: 22 }),
    ]);
    const t = traccia(q, 'body_fat')!;
    expect(t.punti).toHaveLength(1);
    expect(t.direzione).toBe('prima_volta');
    expect(t.delta).toBe(0);
    expect(q.haTraiettoria).toBe(false);
  });

  it('due misure aprono la traiettoria', () => {
    const q = costruisciQuadro([
      ev('body.composition_estimated', g(60), { estimated_body_fat: 26 }),
      ev('body.composition_estimated', g(2), { estimated_body_fat: 22 }),
    ]);
    expect(q.haTraiettoria).toBe(true);
    expect(traccia(q, 'body_fat')!.direzione).not.toBe('prima_volta');
  });
});

describe('il verso della misura: salire non è sempre meglio', () => {
  it('massa grassa che SCENDE = migliora', () => {
    const q = costruisciQuadro([
      ev('body.composition_estimated', g(90), { estimated_body_fat: 28 }),
      ev('body.composition_estimated', g(1), { estimated_body_fat: 23 }),
    ]);
    const t = traccia(q, 'body_fat')!;
    expect(t.delta).toBe(-5);
    expect(t.direzione).toBe('migliora');
  });

  it('massa muscolare che SCENDE = peggiora', () => {
    const q = costruisciQuadro([
      ev('body.composition_estimated', g(90), { estimated_muscle_mass: 40 }),
      ev('body.composition_estimated', g(1), { estimated_muscle_mass: 35 }),
    ]);
    expect(traccia(q, 'muscle_mass')!.direzione).toBe('peggiora');
  });

  it('simmetria del passo che SALE = migliora', () => {
    const q = costruisciQuadro([
      ev('movement.gait_assessed', g(50), { step_symmetry_pct: 82 }),
      ev('movement.gait_assessed', g(1), { step_symmetry_pct: 94 }),
    ]);
    expect(traccia(q, 'simmetria_passo')!.direzione).toBe('migliora');
  });

  it('inclinazione del tronco che SALE = peggiora', () => {
    const q = costruisciQuadro([
      ev('movement.gait_assessed', g(50), { trunk_lean_deg: 4 }),
      ev('movement.gait_assessed', g(1), { trunk_lean_deg: 9 }),
    ]);
    expect(traccia(q, 'tronco_cammino')!.direzione).toBe('peggiora');
  });
});

describe('il rumore non diventa un traguardo', () => {
  it('una differenza sotto soglia resta "stabile"', () => {
    const q = costruisciQuadro([
      ev('body.composition_estimated', g(40), { estimated_body_fat: 22 }),
      ev('body.composition_estimated', g(1), { estimated_body_fat: 22.4 }),
    ]);
    expect(traccia(q, 'body_fat')!.direzione).toBe('stabile');
  });

  it('sopra soglia il cambiamento si dichiara', () => {
    const q = costruisciQuadro([
      ev('body.composition_estimated', g(40), { estimated_body_fat: 22 }),
      ev('body.composition_estimated', g(1), { estimated_body_fat: 19 }),
    ]);
    expect(traccia(q, 'body_fat')!.direzione).toBe('migliora');
  });
});

describe('postura: si contano i distretti da lavorare', () => {
  it('meno rilievi nel tempo = migliora', () => {
    const q = costruisciQuadro([
      ev('posture.assessed', g(120), { findings: [
        { area: 'shoulders', severity: 'moderate' },
        { area: 'pelvis', severity: 'mild' },
        { area: 'knees', severity: 'mild' },
      ] }),
      ev('posture.assessed', g(3), { findings: [
        { area: 'shoulders', severity: 'mild' },
        { area: 'pelvis', severity: 'normal' },
      ] }),
    ]);
    const t = traccia(q, 'rilievi_postura')!;
    expect(t.primo.valore).toBe(3);
    expect(t.ultimo.valore).toBe(1);
    expect(t.direzione).toBe('migliora');
  });

  it('i rilievi "normal" non si contano come da lavorare', () => {
    const q = costruisciQuadro([
      ev('posture.assessed', g(1), { findings: [
        { area: 'shoulders', severity: 'normal' },
        { area: 'pelvis', severity: 'normal' },
      ] }),
    ]);
    expect(traccia(q, 'rilievi_postura')!.ultimo.valore).toBe(0);
  });
});

describe('le cinque catene del Sistema Stellato entrano nel quadro', () => {
  it('una catena che sale nel tempo = migliora', () => {
    const q = costruisciQuadro([
      ev('mindmovement.assessed', g(100), { catene: [
        { catena: 'E', score: 40 }, { catena: 'IE', score: 60 },
      ] }),
      ev('mindmovement.assessed', g(5), { catene: [
        { catena: 'E', score: 72 }, { catena: 'IE', score: 62 },
      ] }),
    ]);
    const e = traccia(q, 'catena_E')!;
    expect(e.primo.valore).toBe(40);
    expect(e.ultimo.valore).toBe(72);
    expect(e.direzione).toBe('migliora');
    // I-E è salita di 2: sotto soglia, resta stabile
    expect(traccia(q, 'catena_IE')!.direzione).toBe('stabile');
  });

  it('catene con score null non creano tracce fantasma', () => {
    const q = costruisciQuadro([
      ev('mindmovement.assessed', g(5), { catene: [
        { catena: 'A', score: null }, { catena: 'F', score: 55 },
      ] }),
    ]);
    expect(traccia(q, 'catena_A')).toBeUndefined();
    expect(traccia(q, 'catena_F')).toBeDefined();
  });
});

describe('il quadro d\'insieme', () => {
  it('dice quali valutazioni sono state fatte e quante volte', () => {
    const q = costruisciQuadro([
      ev('posture.assessed', g(30), { findings: [] }),
      ev('posture.assessed', g(2), { findings: [] }),
      ev('movement.gait_assessed', g(10), { cadence_spm: 110 }),
    ]);
    const post = q.valutazioni.find((v) => v.tipo === 'posture.assessed')!;
    expect(post.quante).toBe(2);
    expect(post.ultima).not.toBeNull();
    const squat = q.valutazioni.find((v) => v.tipo === 'movement.squat_assessed')!;
    expect(squat.quante).toBe(0);
    expect(squat.ultima).toBeNull();
  });

  it('conta le aree coperte, su cinque', () => {
    const q = costruisciQuadro([
      ev('movement.gait_assessed', g(10), { cadence_spm: 110 }),
      ev('body.composition_estimated', g(9), { estimated_body_fat: 20 }),
    ]);
    expect(q.areeCoperte).toBe(2);
    expect(q.areeTotali).toBe(5);
  });

  it('i punti sono sempre in ordine di tempo, anche se arrivano mescolati', () => {
    const q = costruisciQuadro([
      ev('movement.gait_assessed', g(2), { cadence_spm: 118 }),
      ev('movement.gait_assessed', g(90), { cadence_spm: 100 }),
      ev('movement.gait_assessed', g(40), { cadence_spm: 108 }),
    ]);
    const t = traccia(q, 'cadenza')!;
    expect(t.punti.map((p) => p.valore)).toEqual([100, 108, 118]);
    expect(t.primo.valore).toBe(100);
    expect(t.ultimo.valore).toBe(118);
    expect(t.giorniCoperti).toBeGreaterThan(80);
  });

  it('le tracce con più storia vengono prima', () => {
    const q = costruisciQuadro([
      ev('body.composition_estimated', g(5), { estimated_body_fat: 20 }),
      ev('movement.gait_assessed', g(60), { cadence_spm: 100 }),
      ev('movement.gait_assessed', g(30), { cadence_spm: 105 }),
      ev('movement.gait_assessed', g(1), { cadence_spm: 110 }),
    ]);
    expect(q.tracce[0].chiave).toBe('cadenza');
  });

  it('riproducibile: stessi eventi → stesso quadro', () => {
    const eventi = [
      ev('movement.squat_assessed', g(20), { bottom_knee_angle_deg: 95 }),
      ev('movement.squat_assessed', g(1), { bottom_knee_angle_deg: 82 }),
    ];
    expect(JSON.stringify(costruisciQuadro(eventi)))
      .toBe(JSON.stringify(costruisciQuadro(eventi)));
  });

  it('ogni estrattore dichiara un verso e un\'area: nessuna misura senza significato', () => {
    for (const e of ESTRATTORI) {
      expect(['alto_meglio', 'basso_meglio']).toContain(e.verso);
      expect(e.etichetta.length).toBeGreaterThan(3);
      expect(e.area.length).toBeGreaterThan(2);
    }
  });
});
