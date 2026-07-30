import {
  computePostureMetrics,
  lineTilt,
  verticalDeviation,
  POSTURE_METRICS_VERSION,
  PostureFinding,
} from '../posture';
import { Landmark, LM } from '../gait';

// ============================================================
// Test AI Biomechanics v3: POSTURE sintetiche a GEOMETRIA NOTA.
// Costruisco scheletri con angoli che decido io; se il motore li
// ritrova (entro il rumore di misura) lo screening è affidabile.
// ============================================================

const L_EAR = 7;
const R_EAR = 8;

const base = (): Landmark[] =>
  Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 0.9 }));

const set = (lm: Landmark[], idx: number, x: number, y: number, v = 0.9): void => {
  lm[idx] = { x, y, visibility: v };
};

const find = (findings: PostureFinding[], key: string): PostureFinding =>
  findings.find((f) => f.key === key)!;

// Costruisce una coppia sinistra/destra con inclinazione nota (gradi).
// rightHigher=true → il punto destro (immagine) è più in alto.
const tiltedPair = (
  cx: number,
  cy: number,
  halfWidth: number,
  tiltDeg: number,
  rightHigher: boolean
): [Landmark, Landmark] => {
  const dy = halfWidth * 2 * Math.tan((tiltDeg * Math.PI) / 180);
  const left: Landmark = { x: cx - halfWidth, y: cy + (rightHigher ? dy / 2 : -dy / 2), visibility: 0.9 };
  const right: Landmark = { x: cx + halfWidth, y: cy + (rightHigher ? -dy / 2 : dy / 2), visibility: 0.9 };
  return [left, right];
};

describe('primitive geometriche', () => {
  it('lineTilt misura un angolo noto e il lato più alto', () => {
    const [l, r] = tiltedPair(0.5, 0.3, 0.1, 5, true);
    const t = lineTilt(l, r);
    expect(t.deg).toBeCloseTo(5, 0);
    expect(t.leftHigher).toBe(false); // destra più alta
  });

  it('verticalDeviation è 0 su una linea perfettamente verticale', () => {
    const base_ = { x: 0.5, y: 0.6 };
    const top = { x: 0.5, y: 0.4 };
    expect(verticalDeviation(base_, top).deg).toBeCloseTo(0, 1);
  });

  it('verticalDeviation misura un angolo noto dalla verticale', () => {
    // top spostato lateralmente di 15° rispetto alla verticale
    const base_ = { x: 0.5, y: 0.6 };
    const vDist = 0.2;
    const dx = vDist * Math.tan((15 * Math.PI) / 180);
    const top = { x: 0.5 + dx, y: 0.6 - vDist };
    expect(verticalDeviation(base_, top).deg).toBeCloseTo(15, 0);
  });
});

describe('vista frontale — piano coronale', () => {
  it('scheletro allineato → tutto normale, nessun notable', () => {
    const lm = base();
    set(lm, LM.NOSE, 0.5, 0.15);
    set(lm, LM.L_SHOULDER, 0.4, 0.3);
    set(lm, LM.R_SHOULDER, 0.6, 0.3);
    set(lm, LM.L_HIP, 0.44, 0.55);
    set(lm, LM.R_HIP, 0.56, 0.55);
    set(lm, LM.L_ANKLE, 0.45, 0.9);
    set(lm, LM.R_ANKLE, 0.55, 0.9);

    const m = computePostureMetrics(lm, 'frontale');
    expect(m.version).toBe(POSTURE_METRICS_VERSION);
    expect(m.quality).toBe('ok');
    expect(m.notable).toHaveLength(0);
    expect(find(m.findings, 'shoulder_tilt').severity).toBe('normale');
  });

  it('spalla sinistra alzata di 6° → rilevata, lato e gravità corretti', () => {
    const lm = base();
    set(lm, LM.NOSE, 0.5, 0.15);
    const [ls, rs] = tiltedPair(0.5, 0.3, 0.1, 6, false); // sinistra più alta
    lm[LM.L_SHOULDER] = ls;
    lm[LM.R_SHOULDER] = rs;
    set(lm, LM.L_HIP, 0.44, 0.55);
    set(lm, LM.R_HIP, 0.56, 0.55);

    const m = computePostureMetrics(lm, 'frontale');
    const st = find(m.findings, 'shoulder_tilt');
    expect(st.value_deg).toBeCloseTo(6, 0);
    expect(st.severity).toBe('moderato'); // ≥4°
    expect(st.direction).toContain('sinistra');
    expect(m.notable[0].key).toBe('shoulder_tilt');
  });

  it('bacino obliquo di 3° → lieve', () => {
    const lm = base();
    set(lm, LM.L_SHOULDER, 0.4, 0.3);
    set(lm, LM.R_SHOULDER, 0.6, 0.3);
    const [lh, rh] = tiltedPair(0.5, 0.55, 0.06, 3, true); // destra più alta
    lm[LM.L_HIP] = lh;
    lm[LM.R_HIP] = rh;

    const m = computePostureMetrics(lm, 'frontale');
    const pel = find(m.findings, 'pelvic_obliquity');
    expect(pel.value_deg).toBeCloseTo(3, 0);
    expect(pel.severity).toBe('lieve');
    expect(pel.direction).toContain('destra');
  });

  it('capo spostato lateralmente → head_shift in % con verso', () => {
    const lm = base();
    set(lm, LM.L_SHOULDER, 0.4, 0.3);
    set(lm, LM.R_SHOULDER, 0.6, 0.3); // larghezza spalle = 0.2
    set(lm, LM.L_HIP, 0.44, 0.55);
    set(lm, LM.R_HIP, 0.56, 0.55);
    // naso spostato 0.03 a destra del centro (0.5) → 0.03/0.2 = 15%
    set(lm, LM.NOSE, 0.53, 0.15);

    const m = computePostureMetrics(lm, 'frontale');
    const hs = find(m.findings, 'head_shift');
    expect(hs.value_pct).toBe(15);
    expect(hs.severity).toBe('moderato'); // ≥12%
    expect(hs.direction).toContain('destra');
  });

  it('spalle non visibili → qualità insufficiente, niente numeri inventati', () => {
    const lm = base();
    set(lm, LM.L_SHOULDER, 0.4, 0.3, 0.2); // visibility bassa
    set(lm, LM.R_SHOULDER, 0.6, 0.3, 0.2);
    set(lm, LM.L_HIP, 0.44, 0.55, 0.2);
    set(lm, LM.R_HIP, 0.56, 0.55, 0.2);

    const m = computePostureMetrics(lm, 'frontale');
    expect(m.quality).toBe('insufficiente');
    expect(m.findings).toHaveLength(0);
    expect(m.quality_notes.length).toBeGreaterThan(0);
  });
});

describe('vista laterale — piano sagittale', () => {
  // Profilo: lato SINISTRO ben visibile, lato destro occluso (vis bassa).
  const sideSkeleton = (opts: {
    forwardHeadDeg: number;
    trunkDeg: number;
  }): Landmark[] => {
    const lm = base();
    // annego il lato destro (occluso nel profilo)
    for (const idx of [R_EAR, LM.R_SHOULDER, LM.R_HIP, LM.R_ANKLE]) {
      lm[idx] = { x: 0.5, y: 0.5, visibility: 0.1 };
    }
    const hip = { x: 0.5, y: 0.6 };
    // spalla: inclinazione tronco nota rispetto alla verticale sull'anca
    const trunkV = 0.22;
    const trunkDx = trunkV * Math.tan((opts.trunkDeg * Math.PI) / 180);
    const shoulder = { x: hip.x + trunkDx, y: hip.y - trunkV };
    // orecchio: testa-in-avanti nota rispetto alla verticale sulla spalla
    const headV = 0.14;
    const headDx = headV * Math.tan((opts.forwardHeadDeg * Math.PI) / 180);
    const ear = { x: shoulder.x + headDx, y: shoulder.y - headV };
    const ankle = { x: hip.x, y: 0.95 };
    set(lm, L_EAR, ear.x, ear.y);
    set(lm, LM.L_SHOULDER, shoulder.x, shoulder.y);
    set(lm, LM.L_HIP, hip.x, hip.y);
    set(lm, LM.L_ANKLE, ankle.x, ankle.y);
    return lm;
  };

  it('profilo neutro → forward head e tronco normali', () => {
    const m = computePostureMetrics(sideSkeleton({ forwardHeadDeg: 2, trunkDeg: 1 }), 'laterale');
    expect(m.quality).toBe('ok');
    expect(find(m.findings, 'forward_head').severity).toBe('normale');
    expect(find(m.findings, 'trunk_inclination').severity).toBe('normale');
  });

  it('testa in avanti di 20° → moderato, misurato correttamente', () => {
    const m = computePostureMetrics(sideSkeleton({ forwardHeadDeg: 20, trunkDeg: 2 }), 'laterale');
    const fh = find(m.findings, 'forward_head');
    expect(fh.value_deg).toBeCloseTo(20, 0);
    expect(fh.severity).toBe('moderato'); // ≥18°
    expect(m.notable.map((n) => n.key)).toContain('forward_head');
  });

  it('tronco inclinato in avanti di 8° → lieve', () => {
    const m = computePostureMetrics(sideSkeleton({ forwardHeadDeg: 3, trunkDeg: 8 }), 'laterale');
    const tr = find(m.findings, 'trunk_inclination');
    expect(tr.value_deg).toBeCloseTo(8, 0);
    expect(tr.severity).toBe('lieve');
  });

  it('sceglie il lato più visibile (destro) quando il sinistro è occluso', () => {
    const lm = base();
    for (const idx of [L_EAR, LM.L_SHOULDER, LM.L_HIP, LM.L_ANKLE]) {
      lm[idx] = { x: 0.5, y: 0.5, visibility: 0.1 };
    }
    // lato destro con testa avanti 15°
    const hip = { x: 0.5, y: 0.6 };
    const shoulder = { x: 0.5, y: 0.38 };
    const headV = 0.14;
    const ear = { x: 0.5 + headV * Math.tan((15 * Math.PI) / 180), y: 0.24 };
    set(lm, R_EAR, ear.x, ear.y);
    set(lm, LM.R_SHOULDER, shoulder.x, shoulder.y);
    set(lm, LM.R_HIP, hip.x, hip.y);
    set(lm, LM.R_ANKLE, 0.5, 0.95);

    const m = computePostureMetrics(lm, 'laterale');
    expect(m.quality).toBe('ok');
    expect(find(m.findings, 'forward_head').value_deg).toBeCloseTo(15, 0);
  });
});
