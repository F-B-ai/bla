import {
  computeGaitMetrics,
  movingAverage,
  findPeaks,
  GAIT_METRICS_VERSION,
  LandmarkFrame,
  Landmark,
  LM,
} from '../gait';

// ============================================================
// Test AI Biomechanics v1: le metriche del cammino sono
// verificate su CAMMINATE SINTETICHE a verità nota — se la
// matematica dice 110 passi/min su un segnale costruito a 110,
// possiamo fidarci di lei sul video vero.
// ============================================================

const FPS = 30;

/** Costruisce 33 landmark di base (in piedi, centrato). */
const baseLandmarks = (): Landmark[] => {
  const lm: Landmark[] = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 0.9 }));
  lm[LM.L_SHOULDER] = { x: 0.56, y: 0.35, visibility: 0.9 };
  lm[LM.R_SHOULDER] = { x: 0.44, y: 0.35, visibility: 0.9 };
  lm[LM.L_HIP] = { x: 0.56, y: 0.55, visibility: 0.9 };
  lm[LM.R_HIP] = { x: 0.44, y: 0.55, visibility: 0.9 };
  lm[LM.L_KNEE] = { x: 0.56, y: 0.72, visibility: 0.9 };
  lm[LM.R_KNEE] = { x: 0.44, y: 0.72, visibility: 0.9 };
  lm[LM.L_ANKLE] = { x: 0.56, y: 0.9, visibility: 0.9 };
  lm[LM.R_ANKLE] = { x: 0.44, y: 0.9, visibility: 0.9 };
  lm[LM.L_WRIST] = { x: 0.58, y: 0.55, visibility: 0.9 };
  lm[LM.R_WRIST] = { x: 0.42, y: 0.55, visibility: 0.9 };
  return lm;
};

/** Camminata LATERALE sintetica: cadenza, tronco e braccia noti. */
const syntheticLateralWalk = (opts: {
  seconds: number;
  cadenceSpm: number;
  trunkLeanDeg: number;
  armAmpL: number;
  armAmpR: number;
}): LandmarkFrame[] => {
  const frames: LandmarkFrame[] = [];
  const n = Math.round(opts.seconds * FPS);
  // un passo = un massimo di separazione caviglie: |sin(π f_step t)|
  // ha un massimo ogni 1/f_step secondi
  const fStep = opts.cadenceSpm / 60;
  const trunkOffsetX = Math.tan((opts.trunkLeanDeg * Math.PI) / 180) * 0.2; // torso alto 0.2
  for (let i = 0; i < n; i++) {
    const t = i / FPS;
    const lm = baseLandmarks();
    const phase = Math.PI * fStep * t;
    const swing = 0.08 * Math.sin(phase);
    // vista laterale: le caviglie oscillano avanti/dietro in antifase
    lm[LM.L_ANKLE] = { x: 0.5 + swing, y: 0.9, visibility: 0.9 };
    lm[LM.R_ANKLE] = { x: 0.5 - swing, y: 0.9, visibility: 0.9 };
    // tronco inclinato costante
    lm[LM.L_SHOULDER] = { x: 0.56 + trunkOffsetX, y: 0.35, visibility: 0.9 };
    lm[LM.R_SHOULDER] = { x: 0.44 + trunkOffsetX, y: 0.35, visibility: 0.9 };
    // braccia in antifase con ampiezze diverse (asimmetria nota)
    lm[LM.L_WRIST] = { x: 0.5 + opts.armAmpL * Math.sin(2 * phase), y: 0.55, visibility: 0.9 };
    lm[LM.R_WRIST] = { x: 0.5 - opts.armAmpR * Math.sin(2 * phase), y: 0.55, visibility: 0.9 };
    frames.push({ t: t * 1000, landmarks: lm });
  }
  return frames;
};

/** Camminata FRONTALE sintetica: caduta pelvica e valgismo noti. */
const syntheticFrontalWalk = (opts: {
  seconds: number;
  pelvicDropDeg: number;
  valgusPctL: number;
  valgusPctR: number;
}): LandmarkFrame[] => {
  const frames: LandmarkFrame[] = [];
  const n = Math.round(opts.seconds * FPS);
  const hipW = 0.12;
  for (let i = 0; i < n; i++) {
    const t = i / FPS;
    const lm = baseLandmarks();
    // oscillazione del bacino: angolo θ(t) = drop · sin(2π t)
    const theta = ((opts.pelvicDropDeg * Math.PI) / 180) * Math.sin(2 * Math.PI * t);
    const dy = (Math.tan(theta) * hipW) / 2;
    lm[LM.L_HIP] = { x: 0.56, y: 0.55 + dy, visibility: 0.9 };
    lm[LM.R_HIP] = { x: 0.44, y: 0.55 - dy, visibility: 0.9 };
    // ginocchia deviate verso l'interno di una % nota della larghezza bacino
    lm[LM.L_KNEE] = { x: 0.56 - (opts.valgusPctL / 100) * hipW, y: 0.72, visibility: 0.9 };
    lm[LM.R_KNEE] = { x: 0.44 + (opts.valgusPctR / 100) * hipW, y: 0.72, visibility: 0.9 };
    frames.push({ t: t * 1000, landmarks: lm });
  }
  return frames;
};

describe('Signal processing di base', () => {
  it('movingAverage leviga senza spostare la media', () => {
    const xs = [0, 10, 0, 10, 0, 10, 0, 10];
    const sm = movingAverage(xs, 3);
    const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
    expect(Math.abs(mean(sm) - mean(xs))).toBeLessThan(1);
    expect(Math.max(...sm)).toBeLessThan(10);
  });

  it('findPeaks trova i massimi con distanza minima', () => {
    const xs = [0, 1, 0, 0, 5, 0, 0, 0, 5, 0, 1, 0];
    const peaks = findPeaks(xs, 3);
    expect(peaks).toEqual([4, 8]);
  });
});

describe('Cammino — vista laterale (verità nota)', () => {
  const walk = syntheticLateralWalk({
    seconds: 8,
    cadenceSpm: 110,
    trunkLeanDeg: 5,
    armAmpL: 0.05,
    armAmpR: 0.04, // 80% del sinistro
  });
  const m = computeGaitMetrics(walk, 'laterale');

  it('qualità ok su input valido', () => {
    expect(m.quality).toBe('ok');
    expect(m.version).toBe(GAIT_METRICS_VERSION);
    expect(m.duration_s).toBeGreaterThan(7);
  });

  it('cadenza ricostruita ≈ 110 passi/min (±5)', () => {
    expect(m.cadence_spm).toBeDefined();
    expect(Math.abs((m.cadence_spm as number) - 110)).toBeLessThanOrEqual(5);
  });

  it('passo sinusoidale perfetto → simmetria ≈ 100%', () => {
    expect(m.step_symmetry_pct).toBeDefined();
    expect(m.step_symmetry_pct as number).toBeGreaterThanOrEqual(93);
  });

  it('inclinazione tronco ricostruita ≈ 5° (±1°)', () => {
    expect(Math.abs((m.trunk_lean_deg as number) - 5)).toBeLessThanOrEqual(1);
  });

  it('asimmetria braccia ricostruita ≈ 80% (±6)', () => {
    expect(m.arm_swing_symmetry_pct).toBeDefined();
    expect(Math.abs((m.arm_swing_symmetry_pct as number) - 80)).toBeLessThanOrEqual(6);
  });

  it('riproducibile: stesso input → stesse metriche', () => {
    const m2 = computeGaitMetrics(walk, 'laterale');
    expect(m2).toEqual(m);
  });
});

describe('Cammino — vista frontale (verità nota)', () => {
  const walk = syntheticFrontalWalk({
    seconds: 8,
    pelvicDropDeg: 4,
    valgusPctL: 20,
    valgusPctR: 5,
  });
  const m = computeGaitMetrics(walk, 'frontale');

  it('caduta pelvica ricostruita ≈ 4° (±0.8°)', () => {
    expect(m.pelvic_drop_deg).toBeDefined();
    expect(Math.abs((m.pelvic_drop_deg as number) - 4)).toBeLessThanOrEqual(0.8);
  });

  it('valgismo proxy: sinistro ≈ 20%, destro ≈ 5% (±3)', () => {
    expect(m.knee_valgus_pct).toBeDefined();
    expect(Math.abs((m.knee_valgus_pct as any).left - 20)).toBeLessThanOrEqual(3);
    expect(Math.abs((m.knee_valgus_pct as any).right - 5)).toBeLessThanOrEqual(3);
  });

  it('ginocchia in linea → valgismo ≈ 0', () => {
    const straight = syntheticFrontalWalk({ seconds: 6, pelvicDropDeg: 2, valgusPctL: 0, valgusPctR: 0 });
    const ms = computeGaitMetrics(straight, 'frontale');
    expect(Math.abs((ms.knee_valgus_pct as any).left)).toBeLessThanOrEqual(2);
    expect(Math.abs((ms.knee_valgus_pct as any).right)).toBeLessThanOrEqual(2);
  });
});

describe('Controllo qualità input', () => {
  it('video troppo corto → insufficiente, con spiegazione', () => {
    const short = syntheticLateralWalk({ seconds: 2, cadenceSpm: 110, trunkLeanDeg: 3, armAmpL: 0.05, armAmpR: 0.05 });
    const m = computeGaitMetrics(short, 'laterale');
    expect(m.quality).toBe('insufficiente');
    expect(m.quality_notes.length).toBeGreaterThan(0);
    expect(m.cadence_spm).toBeUndefined();
  });

  it('landmark poco visibili → insufficiente', () => {
    const walk = syntheticLateralWalk({ seconds: 8, cadenceSpm: 110, trunkLeanDeg: 3, armAmpL: 0.05, armAmpR: 0.05 });
    for (const f of walk) {
      f.landmarks[LM.L_ANKLE].visibility = 0.2;
      f.landmarks[LM.R_ANKLE].visibility = 0.2;
      f.landmarks[LM.L_HIP].visibility = 0.2;
      f.landmarks[LM.R_HIP].visibility = 0.2;
    }
    const m = computeGaitMetrics(walk, 'laterale');
    expect(m.quality).toBe('insufficiente');
  });
});
