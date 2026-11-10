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

// ============================================================
// 10 novembre 2026 — GLI ANGOLI NON ERANO «REALI»
// ------------------------------------------------------------
// MediaPipe dà x in frazioni della LARGHEZZA e y in frazioni
// dell'ALTEZZA: due righelli diversi. Su una foto verticale da
// telefono gli angoli calcolati su quei numeri uscivano storti, e la
// scheda li chiamava «angoli reali».
//
// Qui costruisco la persona in PIXEL, con un angolo che decido io,
// la metto in una foto 3:4 e chiedo l'angolo. Senza raddrizzare esce
// sbagliato (lo dimostro); raddrizzando esce giusto.
// ============================================================

import { raddrizza } from '../posture';

describe('le foto non sono quadrate: prima si raddrizza, poi si misura', () => {
  const W = 750;
  const H = 1000; // 3:4, il formato di un telefono in verticale

  /** Profilo con la testa avanti di un angolo NOTO, in pixel veri. */
  const profilo = (gradiVeri: number): Landmark[] => {
    const lm = base();
    const spalla = { x: 375, y: 300 };
    const su = 120; // l'orecchio è 120 px sopra la spalla
    const avanti = su * Math.tan((gradiVeri * Math.PI) / 180);
    const px = (x: number, y: number) => ({ x: x / W, y: y / H });
    set(lm, 7, px(spalla.x + avanti, spalla.y - su).x, px(0, spalla.y - su).y);
    set(lm, LM.L_SHOULDER, px(spalla.x, 0).x, px(0, spalla.y).y);
    set(lm, LM.L_HIP, px(spalla.x, 0).x, px(0, 600).y);
    set(lm, LM.L_ANKLE, px(spalla.x, 0).x, px(0, 950).y);
    // lato destro coperto
    [8, LM.R_SHOULDER, LM.R_HIP, LM.R_ANKLE].forEach((i) => set(lm, i, 0.5, 0.5, 0.1));
    return lm;
  };

  /** Spalle inclinate di un angolo NOTO, in pixel veri. */
  const frontale = (gradiVeri: number): Landmark[] => {
    const lm = base();
    const mezza = 110;
    const dy = mezza * Math.tan((gradiVeri * Math.PI) / 180);
    set(lm, LM.L_SHOULDER, (375 + mezza) / W, (300 - dy) / H);
    set(lm, LM.R_SHOULDER, (375 - mezza) / W, (300 + dy) / H);
    set(lm, LM.L_HIP, (375 + 60) / W, 600 / H);
    set(lm, LM.R_HIP, (375 - 60) / W, 600 / H);
    set(lm, LM.L_ANKLE, (375 + 60) / W, 950 / H);
    set(lm, LM.R_ANKLE, (375 - 60) / W, 950 / H);
    set(lm, LM.NOSE, 375 / W, 180 / H);
    return lm;
  };

  it('SENZA raddrizzare, la testa in avanti esce gonfiata (il difetto)', () => {
    const storto = find(computePostureMetrics(profilo(45), 'laterale').findings, 'forward_head');
    expect(storto.value_deg!).toBeGreaterThan(52); // 45° veri letti ~53°
  });

  it('raddrizzando, la testa in avanti è quella vera', () => {
    for (const veri of [10, 20, 30, 45]) {
      const f = find(
        computePostureMetrics(raddrizza(profilo(veri), W, H), 'laterale').findings,
        'forward_head'
      );
      expect(f.value_deg!).toBeCloseTo(veri, 0);
    }
  });

  it('SENZA raddrizzare, le spalle escono schiacciate (il difetto)', () => {
    const storto = find(computePostureMetrics(frontale(4), 'frontale').findings, 'shoulder_tilt');
    expect(storto.value_deg!).toBeLessThan(3.2); // 4° veri letti ~3°
  });

  it('raddrizzando, l\'inclinazione delle spalle è quella vera', () => {
    for (const veri of [2, 4, 6]) {
      const f = find(
        computePostureMetrics(raddrizza(frontale(veri), W, H), 'frontale').findings,
        'shoulder_tilt'
      );
      expect(f.value_deg!).toBeCloseTo(veri, 0);
    }
  });

  it('su una foto quadrata raddrizzare non cambia niente', () => {
    const lm = profilo(20);
    expect(raddrizza(lm, 800, 800)).toEqual(lm);
  });

  it('con dimensioni mancanti restituisce i punti com\'erano, senza rompersi', () => {
    const lm = profilo(20);
    expect(raddrizza(lm, 0, 1000)).toBe(lm);
    expect(raddrizza(lm, 750, NaN)).toBe(lm);
  });

  it('non tocca la visibilità né la y', () => {
    const r = raddrizza(profilo(20), W, H);
    const o = profilo(20);
    r.forEach((p, i) => {
      expect(p.y).toBe(o[i].y);
      expect(p.visibility).toBe(o[i].visibility);
    });
  });
});
