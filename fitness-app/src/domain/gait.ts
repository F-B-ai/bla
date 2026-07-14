// ============================================================
// ANALISI DEL CAMMINO — metriche deterministiche (AI Biomechanics v1)
// ------------------------------------------------------------
// Dottrina 03 §2: LE FORMULE CALCOLANO, L'AI SPIEGA. Questo file
// è dominio puro: riceve serie temporali di landmark scheletrici
// (33 punti MediaPipe Pose, coordinate normalizzate 0..1, y verso
// il basso) e produce metriche riproducibili e versionate.
//
// ONESTÀ SUL METODO (da mostrare anche in UI): pose 2D monoculare
// da telefono → questi sono PROXY per screening wellness, non
// misure cliniche. Wording: "cosa guardare", MAI diagnosi (06).
//
// Viste: LATERALE (cadenza, simmetria passo, tronco, braccia),
// FRONTALE (caduta pelvica, valgismo dinamico proxy).
// ============================================================

export const GAIT_METRICS_VERSION = 1;

// Indici landmark MediaPipe Pose (subset usato)
export const LM = {
  NOSE: 0,
  L_SHOULDER: 11, R_SHOULDER: 12,
  L_WRIST: 15, R_WRIST: 16,
  L_HIP: 23, R_HIP: 24,
  L_KNEE: 25, R_KNEE: 26,
  L_ANKLE: 27, R_ANKLE: 28,
} as const;

export interface Landmark {
  x: number;
  y: number;
  visibility?: number;
}

export interface LandmarkFrame {
  /** timestamp in millisecondi dall'inizio del video */
  t: number;
  /** 33 landmark MediaPipe (ne usiamo un sottoinsieme) */
  landmarks: Landmark[];
}

export type GaitView = 'laterale' | 'frontale';

export interface GaitMetrics {
  version: number;
  view: GaitView;
  duration_s: number;
  frames: number;
  /** passi al minuto (solo laterale) */
  cadence_spm?: number;
  /** simmetria tempi di passo sx/dx, 100 = perfetta (solo laterale) */
  step_symmetry_pct?: number;
  /** inclinazione media del tronco rispetto alla verticale, gradi (laterale) */
  trunk_lean_deg?: number;
  /** simmetria oscillazione braccia sx/dx, 100 = perfetta (laterale) */
  arm_swing_symmetry_pct?: number;
  /** semi-ampiezza oscillazione del bacino, gradi (frontale) */
  pelvic_drop_deg?: number;
  /** deviazione mediale del ginocchio rispetto alla linea anca-caviglia,
   *  in % della larghezza bacino; positivo = verso l'interno (frontale) */
  knee_valgus_pct?: { left: number; right: number };
  quality: 'ok' | 'insufficiente';
  quality_notes: string[];
}

// ------------------------------------------------------------
// Signal processing minimale (niente dipendenze)
// ------------------------------------------------------------

export const movingAverage = (xs: number[], window: number): number[] => {
  if (window <= 1) return xs.slice();
  const half = Math.floor(window / 2);
  return xs.map((_, i) => {
    const a = Math.max(0, i - half);
    const b = Math.min(xs.length, i + half + 1);
    let s = 0;
    for (let j = a; j < b; j++) s += xs[j];
    return s / (b - a);
  });
};

/** Indici dei massimi locali sopra la media, con distanza minima. */
export const findPeaks = (xs: number[], minDistance: number): number[] => {
  const mean = xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
  const peaks: number[] = [];
  for (let i = 1; i < xs.length - 1; i++) {
    if (xs[i] > xs[i - 1] && xs[i] >= xs[i + 1] && xs[i] > mean) {
      if (peaks.length === 0 || i - peaks[peaks.length - 1] >= minDistance) {
        peaks.push(i);
      } else if (xs[i] > xs[peaks[peaks.length - 1]]) {
        peaks[peaks.length - 1] = i; // tieni il più alto dei vicini
      }
    }
  }
  return peaks;
};

const deg = (rad: number): number => (rad * 180) / Math.PI;
const mid = (a: Landmark, b: Landmark): Landmark => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2,
});
const round1 = (x: number): number => Math.round(x * 10) / 10;

const percentile = (xs: number[], p: number): number => {
  if (xs.length === 0) return 0;
  const sorted = [...xs].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor((p / 100) * sorted.length)));
  return sorted[idx];
};

// ------------------------------------------------------------
// Controllo qualità dell'input
// ------------------------------------------------------------

const MIN_DURATION_S = 4;
const MIN_FRAMES = 40;
const MIN_VISIBILITY = 0.5;

const checkQuality = (frames: LandmarkFrame[]): { ok: boolean; notes: string[] } => {
  const notes: string[] = [];
  if (frames.length < MIN_FRAMES) notes.push(`Poche pose rilevate (${frames.length}): servono almeno ~${MIN_FRAMES} fotogrammi utili.`);
  const duration = frames.length > 1 ? (frames[frames.length - 1].t - frames[0].t) / 1000 : 0;
  if (duration < MIN_DURATION_S) notes.push(`Video troppo corto (${duration.toFixed(1)}s): servono almeno ${MIN_DURATION_S}s di cammino.`);
  const keyIdx = [LM.L_HIP, LM.R_HIP, LM.L_ANKLE, LM.R_ANKLE];
  let visSum = 0;
  let visN = 0;
  for (const f of frames) {
    for (const i of keyIdx) {
      const v = f.landmarks[i]?.visibility;
      if (v !== undefined) { visSum += v; visN++; }
    }
  }
  if (visN > 0 && visSum / visN < MIN_VISIBILITY) {
    notes.push('Bacino/caviglie spesso non visibili: inquadra la persona intera, con buona luce.');
  }
  return { ok: notes.length === 0, notes };
};

// ------------------------------------------------------------
// Metriche — vista LATERALE
// ------------------------------------------------------------

const lateralMetrics = (frames: LandmarkFrame[], out: GaitMetrics): void => {
  const duration = (frames[frames.length - 1].t - frames[0].t) / 1000;
  const fps = frames.length / duration;

  // Separazione orizzontale caviglie: un massimo per ogni passo
  const sep = movingAverage(
    frames.map((f) => Math.abs(f.landmarks[LM.L_ANKLE].x - f.landmarks[LM.R_ANKLE].x)),
    Math.max(3, Math.round(fps / 8))
  );
  // distanza minima tra passi: 0.3s (cadenza max ~200 spm)
  const peaks = findPeaks(sep, Math.max(2, Math.round(fps * 0.3)));

  if (peaks.length >= 4) {
    const steps = peaks.length - 1;
    const spanS = (frames[peaks[peaks.length - 1]].t - frames[peaks[0]].t) / 1000;
    out.cadence_spm = round1((steps / spanS) * 60);

    // Simmetria: i passi alternano sx-avanti / dx-avanti → confronta
    // gli intervalli pari e dispari tra i picchi
    const intervals: number[] = [];
    for (let i = 1; i < peaks.length; i++) {
      intervals.push(frames[peaks[i]].t - frames[peaks[i - 1]].t);
    }
    const even = intervals.filter((_, i) => i % 2 === 0);
    const odd = intervals.filter((_, i) => i % 2 === 1);
    if (even.length > 0 && odd.length > 0) {
      const mEven = even.reduce((a, b) => a + b, 0) / even.length;
      const mOdd = odd.reduce((a, b) => a + b, 0) / odd.length;
      out.step_symmetry_pct = round1((Math.min(mEven, mOdd) / Math.max(mEven, mOdd)) * 100);
    }
  } else {
    out.quality_notes.push('Passi rilevati insufficienti per cadenza/simmetria (cammina per almeno 6-8 passi).');
  }

  // Inclinazione tronco: linea spalle-bacino vs verticale
  const leans = frames.map((f) => {
    const sh = mid(f.landmarks[LM.L_SHOULDER], f.landmarks[LM.R_SHOULDER]);
    const hip = mid(f.landmarks[LM.L_HIP], f.landmarks[LM.R_HIP]);
    return Math.abs(deg(Math.atan2(sh.x - hip.x, hip.y - sh.y)));
  });
  out.trunk_lean_deg = round1(leans.reduce((a, b) => a + b, 0) / leans.length);

  // Oscillazione braccia: escursione del polso (x) rispetto al bacino
  const excursion = (wristIdx: number): number => {
    const rel = frames.map((f) => {
      const hip = mid(f.landmarks[LM.L_HIP], f.landmarks[LM.R_HIP]);
      return f.landmarks[wristIdx].x - hip.x;
    });
    return percentile(rel, 95) - percentile(rel, 5);
  };
  const left = excursion(LM.L_WRIST);
  const right = excursion(LM.R_WRIST);
  if (left > 0.005 && right > 0.005) {
    out.arm_swing_symmetry_pct = round1((Math.min(left, right) / Math.max(left, right)) * 100);
  }
};

// ------------------------------------------------------------
// Metriche — vista FRONTALE
// ------------------------------------------------------------

const frontalMetrics = (frames: LandmarkFrame[], out: GaitMetrics): void => {
  // Caduta pelvica: angolo della linea tra le anche vs orizzontale;
  // semi-ampiezza dell'oscillazione (p95 − p5)/2
  const hipAngles = frames.map((f) => {
    const l = f.landmarks[LM.L_HIP];
    const r = f.landmarks[LM.R_HIP];
    return deg(Math.atan2(l.y - r.y, Math.abs(l.x - r.x) || 1e-6));
  });
  out.pelvic_drop_deg = round1((percentile(hipAngles, 95) - percentile(hipAngles, 5)) / 2);

  // Valgismo dinamico (proxy): deviazione del ginocchio dalla linea
  // anca→caviglia, in % della larghezza del bacino. Positivo = verso
  // l'interno del corpo. La direzione "interno" si ricava dai dati
  // (dov'è l'altra anca), così funziona sia di fronte che di spalle.
  const kneeDev = (hipIdx: number, kneeIdx: number, ankleIdx: number, otherHipIdx: number): number => {
    const devs = frames.map((f) => {
      const hip = f.landmarks[hipIdx];
      const knee = f.landmarks[kneeIdx];
      const ankle = f.landmarks[ankleIdx];
      const hipW = Math.abs(f.landmarks[LM.L_HIP].x - f.landmarks[LM.R_HIP].x) || 1e-6;
      // x atteso del ginocchio sulla retta anca-caviglia alla sua altezza
      const tt = (knee.y - hip.y) / ((ankle.y - hip.y) || 1e-6);
      const expectedX = hip.x + tt * (ankle.x - hip.x);
      const inwardSign = Math.sign(f.landmarks[otherHipIdx].x - hip.x) || 1;
      return (((knee.x - expectedX) * inwardSign) / hipW) * 100;
    });
    return round1(devs.reduce((a, b) => a + b, 0) / devs.length);
  };
  out.knee_valgus_pct = {
    left: kneeDev(LM.L_HIP, LM.L_KNEE, LM.L_ANKLE, LM.R_HIP),
    right: kneeDev(LM.R_HIP, LM.R_KNEE, LM.R_ANKLE, LM.L_HIP),
  };
};

// ------------------------------------------------------------
// Entry point
// ------------------------------------------------------------

export const computeGaitMetrics = (
  frames: LandmarkFrame[],
  view: GaitView
): GaitMetrics => {
  const quality = checkQuality(frames);
  const out: GaitMetrics = {
    version: GAIT_METRICS_VERSION,
    view,
    duration_s: frames.length > 1 ? round1((frames[frames.length - 1].t - frames[0].t) / 1000) : 0,
    frames: frames.length,
    quality: quality.ok ? 'ok' : 'insufficiente',
    quality_notes: [...quality.notes],
  };
  if (!quality.ok) return out;

  if (view === 'laterale') lateralMetrics(frames, out);
  else frontalMetrics(frames, out);

  return out;
};
