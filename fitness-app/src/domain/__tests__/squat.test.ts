import { computeSquatMetrics, kneeAngle, SQUAT_METRICS_VERSION } from '../squat';
import { LandmarkFrame, Landmark, LM } from '../gait';

// ============================================================
// Test AI Biomechanics v2: squat sintetici a GEOMETRIA NOTA.
// Le gambe sono costruite come un compasso: decido io l'angolo
// del ginocchio al fondo — se il motore lo ritrova, è affidabile.
// ============================================================

const FPS = 30;

const baseLandmarks = (): Landmark[] =>
  Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 0.9 }));

/** Squat LATERALE: gamba a compasso — angolo ginocchio θ noto.
 *  φ = (180−θ)/2; ginocchio avanti di L1·sinφ, anca sopra in verticale. */
const lateralSquat = (opts: {
  reps: number;
  bottomKneeDeg: number;
  standingKneeDeg?: number;
  repSeconds?: number;
  trunkLeanBottomDeg?: number;
}): LandmarkFrame[] => {
  const standing = opts.standingKneeDeg ?? 170;
  const repS = opts.repSeconds ?? 4;
  const lean = ((opts.trunkLeanBottomDeg ?? 20) * Math.PI) / 180;
  const L1 = 0.18; // tibia
  const L2 = 0.17; // femore
  const ankle = { x: 0.5, y: 0.9 };
  const frames: LandmarkFrame[] = [];
  const totalS = 2 + opts.reps * repS; // 2s in piedi all'inizio
  for (let i = 0; i < totalS * FPS; i++) {
    const t = i / FPS;
    // profondità 0..1: 0 in piedi, 1 al fondo (sinusoide per ripetizione)
    let depth = 0;
    if (t > 2) {
      const s = ((t - 2) % repS) / repS;
      depth = Math.sin(Math.PI * s);
    }
    const theta = standing - (standing - opts.bottomKneeDeg) * depth;
    const phi = ((180 - theta) / 2) * (Math.PI / 180);
    const knee = { x: ankle.x + L1 * Math.sin(phi), y: ankle.y - L1 * Math.cos(phi) };
    const hip = { x: knee.x - L2 * Math.sin(phi), y: knee.y - L2 * Math.cos(phi) };
    const sh = { x: hip.x + 0.2 * Math.tan(lean * depth), y: hip.y - 0.2 };

    const lm = baseLandmarks();
    for (const [idxL, idxR, p] of [
      [LM.L_ANKLE, LM.R_ANKLE, ankle],
      [LM.L_KNEE, LM.R_KNEE, knee],
      [LM.L_HIP, LM.R_HIP, hip],
      [LM.L_SHOULDER, LM.R_SHOULDER, sh],
    ] as Array<[number, number, { x: number; y: number }]>) {
      lm[idxL] = { ...p, visibility: 0.9 };
      lm[idxR] = { ...p, visibility: 0.9 };
    }
    frames.push({ t: t * 1000, landmarks: lm });
  }
  return frames;
};

/** Squat FRONTALE: anche a larghezza fissa, ginocchia che cedono
 *  in dentro di una % nota al fondo. */
const frontalSquat = (opts: { reps: number; valgusL: number; valgusR: number }): LandmarkFrame[] => {
  const hipW = 0.12;
  const frames: LandmarkFrame[] = [];
  const repS = 4;
  const totalS = 2 + opts.reps * repS;
  for (let i = 0; i < totalS * FPS; i++) {
    const t = i / FPS;
    let depth = 0;
    if (t > 2) {
      const s = ((t - 2) % repS) / repS;
      depth = Math.sin(Math.PI * s);
    }
    const hipY = 0.55 + 0.12 * depth;
    const lm = baseLandmarks();
    lm[LM.L_HIP] = { x: 0.56, y: hipY, visibility: 0.9 };
    lm[LM.R_HIP] = { x: 0.44, y: hipY, visibility: 0.9 };
    lm[LM.L_KNEE] = { x: 0.56 - (opts.valgusL / 100) * hipW * depth, y: 0.72, visibility: 0.9 };
    lm[LM.R_KNEE] = { x: 0.44 + (opts.valgusR / 100) * hipW * depth, y: 0.72, visibility: 0.9 };
    lm[LM.L_ANKLE] = { x: 0.56, y: 0.9, visibility: 0.9 };
    lm[LM.R_ANKLE] = { x: 0.44, y: 0.9, visibility: 0.9 };
    lm[LM.L_SHOULDER] = { x: 0.56, y: hipY - 0.2, visibility: 0.9 };
    lm[LM.R_SHOULDER] = { x: 0.44, y: hipY - 0.2, visibility: 0.9 };
    frames.push({ t: t * 1000, landmarks: lm });
  }
  return frames;
};

describe('kneeAngle — geometria di base', () => {
  it('gamba tesa = 180°', () => {
    expect(kneeAngle({ x: 0.5, y: 0.5 }, { x: 0.5, y: 0.7 }, { x: 0.5, y: 0.9 })).toBeCloseTo(180, 0);
  });
  it('angolo retto = 90°', () => {
    expect(kneeAngle({ x: 0.7, y: 0.7 }, { x: 0.5, y: 0.7 }, { x: 0.5, y: 0.9 })).toBeCloseTo(90, 0);
  });
});

describe('Squat laterale — profondità nota (85°, profondo)', () => {
  const m = computeSquatMetrics(lateralSquat({ reps: 4, bottomKneeDeg: 85, trunkLeanBottomDeg: 25 }), 'laterale');

  it('qualità ok e versione dichiarata', () => {
    expect(m.quality).toBe('ok');
    expect(m.version).toBe(SQUAT_METRICS_VERSION);
  });

  it('conta 4 ripetizioni', () => {
    expect(m.reps).toBe(4);
  });

  it('ritrova l\'angolo del ginocchio al fondo ≈ 85° (±6°)', () => {
    expect(Math.abs((m.bottom_knee_angle_deg as number) - 85)).toBeLessThanOrEqual(6);
  });

  it('classifica la profondità: profondo', () => {
    expect(m.depth).toBe('profondo');
  });

  it('ritrova il tronco al fondo ≈ 25° (±4°)', () => {
    expect(Math.abs((m.trunk_lean_bottom_deg as number) - 25)).toBeLessThanOrEqual(4);
  });

  it('tempo discesa/risalita ≈ 1.6s (±0.5)', () => {
    expect(Math.abs((m.tempo_down_s as number) - 1.6)).toBeLessThanOrEqual(0.5);
    expect(Math.abs((m.tempo_up_s as number) - 1.6)).toBeLessThanOrEqual(0.5);
  });
});

describe('Squat laterale — parziale (120°)', () => {
  const m = computeSquatMetrics(lateralSquat({ reps: 3, bottomKneeDeg: 120 }), 'laterale');
  it('riconosce lo squat parziale', () => {
    expect(m.reps).toBe(3);
    expect(m.depth).toBe('parziale');
    expect((m.bottom_knee_angle_deg as number)).toBeGreaterThan(110);
  });
});

describe('Squat frontale — valgismo noto (sx 20%, dx 5%)', () => {
  const m = computeSquatMetrics(frontalSquat({ reps: 4, valgusL: 20, valgusR: 5 }), 'frontale');

  it('conta le ripetizioni e misura il valgismo al fondo (±4)', () => {
    expect(m.reps).toBe(4);
    expect(Math.abs((m.knee_valgus_bottom_pct as any).left - 20)).toBeLessThanOrEqual(4);
    expect(Math.abs((m.knee_valgus_bottom_pct as any).right - 5)).toBeLessThanOrEqual(4);
  });

  it('bacino centrato → deriva ≈ 0', () => {
    expect((m.hip_shift_pct as number)).toBeLessThanOrEqual(3);
  });
});

describe('Onestà del motore', () => {
  it('video troppo corto → insufficiente, spiegato', () => {
    const m = computeSquatMetrics(lateralSquat({ reps: 1, bottomKneeDeg: 90, repSeconds: 2 }).slice(0, 60), 'laterale');
    expect(m.quality).toBe('insufficiente');
    expect(m.quality_notes.length).toBeGreaterThan(0);
  });

  it('una sola ripetizione → insufficiente ("servono 2-3 squat")', () => {
    const m = computeSquatMetrics(lateralSquat({ reps: 1, bottomKneeDeg: 90 }), 'laterale');
    expect(m.quality).toBe('insufficiente');
    expect(m.quality_notes.join(' ')).toContain('ripetizioni');
  });

  it('persona ferma (nessuno squat) → insufficiente, mai numeri inventati', () => {
    const still = lateralSquat({ reps: 2, bottomKneeDeg: 168, standingKneeDeg: 170 });
    const m = computeSquatMetrics(still, 'laterale');
    expect(m.quality).toBe('insufficiente');
    expect(m.bottom_knee_angle_deg).toBeUndefined();
  });
});
