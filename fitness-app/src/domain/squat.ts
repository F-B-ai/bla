// ============================================================
// ANALISI DELLO SQUAT — metriche deterministiche (AI Biomechanics v2)
// ------------------------------------------------------------
// Stessa dottrina del cammino (gait.ts): LE FORMULE CALCOLANO,
// L'AI SPIEGA. Input: serie di landmark MediaPipe (33 punti,
// coordinate normalizzate, y verso il basso).
//
// Vista LATERALE: ripetizioni, angolo del ginocchio al fondo,
// profondità, inclinazione del tronco al fondo, tempo di discesa
// e risalita. Vista FRONTALE: ripetizioni, valgismo dinamico al
// fondo, deriva laterale del bacino.
//
// ONESTÀ (in UI): pose 2D monoculare → proxy per screening
// wellness, MAI valutazione clinica (doc 06).
// ============================================================

import { LandmarkFrame, LM, movingAverage, findPeaks } from './gait';

export const SQUAT_METRICS_VERSION = 1;

export type SquatView = 'laterale' | 'frontale';

export interface SquatMetrics {
  version: number;
  view: SquatView;
  duration_s: number;
  frames: number;
  /** ripetizioni riconosciute */
  reps?: number;
  /** angolo medio del ginocchio al punto più basso, gradi (laterale) */
  bottom_knee_angle_deg?: number;
  /** classificazione della profondità (laterale) */
  depth?: 'profondo' | 'parallelo' | 'parziale';
  /** inclinazione media del tronco al fondo, gradi (laterale) */
  trunk_lean_bottom_deg?: number;
  /** tempo medio di discesa/risalita, secondi (laterale) */
  tempo_down_s?: number;
  tempo_up_s?: number;
  /** deviazione mediale del ginocchio al fondo, % larghezza bacino (frontale) */
  knee_valgus_bottom_pct?: { left: number; right: number };
  /** deriva laterale del bacino al fondo, % larghezza bacino (frontale) */
  hip_shift_pct?: number;
  quality: 'ok' | 'insufficiente';
  quality_notes: string[];
}

const deg = (rad: number): number => (rad * 180) / Math.PI;
const round1 = (x: number): number => Math.round(x * 10) / 10;
const mean = (xs: number[]): number =>
  xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length;
const mid = (a: { x: number; y: number }, b: { x: number; y: number }) => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2,
});

/** Angolo interno al ginocchio: tra i vettori ginocchio→anca e
 *  ginocchio→caviglia (180° = gamba tesa). */
export const kneeAngle = (
  hip: { x: number; y: number },
  knee: { x: number; y: number },
  ankle: { x: number; y: number }
): number => {
  const v1 = { x: hip.x - knee.x, y: hip.y - knee.y };
  const v2 = { x: ankle.x - knee.x, y: ankle.y - knee.y };
  const dot = v1.x * v2.x + v1.y * v2.y;
  const n1 = Math.hypot(v1.x, v1.y);
  const n2 = Math.hypot(v2.x, v2.y);
  if (n1 === 0 || n2 === 0) return 180;
  const c = Math.min(1, Math.max(-1, dot / (n1 * n2)));
  return deg(Math.acos(c));
};

// ------------------------------------------------------------
// Segmentazione delle ripetizioni: il bacino scende e risale.
// hipY (y cresce verso il basso) → i MASSIMI locali sono i fondi.
// ------------------------------------------------------------

interface Rep {
  bottomIdx: number;
  /** indici di inizio/fine della rip (attraversamento del 30% di profondità) */
  startIdx: number;
  endIdx: number;
}

const segmentReps = (frames: LandmarkFrame[], fps: number): Rep[] => {
  const hipY = movingAverage(
    frames.map((f) => mid(f.landmarks[LM.L_HIP], f.landmarks[LM.R_HIP]).y),
    Math.max(3, Math.round(fps / 6))
  );
  const standing = [...hipY].sort((a, b) => a - b)[Math.floor(hipY.length * 0.1)]; // p10 = in piedi
  const deepest = Math.max(...hipY);
  const range = deepest - standing;
  // escursione minima: il bacino deve scendere in modo significativo
  if (range < 0.04) return [];

  // fondi = massimi locali distanti almeno ~1.2s e sotto almeno il 60% dell'escursione
  const peaks = findPeaks(hipY, Math.max(3, Math.round(fps * 1.2))).filter(
    (i) => hipY[i] >= standing + range * 0.6
  );

  const threshold = standing + range * 0.3; // 30% di profondità
  const reps: Rep[] = [];
  for (const p of peaks) {
    let start = p;
    while (start > 0 && hipY[start] > threshold) start--;
    let end = p;
    while (end < hipY.length - 1 && hipY[end] > threshold) end++;
    reps.push({ bottomIdx: p, startIdx: start, endIdx: end });
  }
  return reps;
};

// ------------------------------------------------------------
// Controllo qualità
// ------------------------------------------------------------

const checkQuality = (frames: LandmarkFrame[]): string[] => {
  const notes: string[] = [];
  if (frames.length < 40) notes.push(`Poche pose rilevate (${frames.length}): inquadra tutto il corpo, con buona luce.`);
  const duration = frames.length > 1 ? (frames[frames.length - 1].t - frames[0].t) / 1000 : 0;
  if (duration < 5) notes.push(`Video troppo corto (${duration.toFixed(1)}s): riprendi almeno 3-5 ripetizioni.`);
  const keyIdx = [LM.L_HIP, LM.R_HIP, LM.L_KNEE, LM.R_KNEE, LM.L_ANKLE, LM.R_ANKLE];
  let visSum = 0;
  let visN = 0;
  for (const f of frames) {
    for (const i of keyIdx) {
      const v = f.landmarks[i]?.visibility;
      if (v !== undefined) { visSum += v; visN++; }
    }
  }
  if (visN > 0 && visSum / visN < 0.5) {
    notes.push('Gambe e bacino spesso non visibili: riprendi la persona intera.');
  }
  return notes;
};

// ------------------------------------------------------------
// Entry point
// ------------------------------------------------------------

export const computeSquatMetrics = (
  frames: LandmarkFrame[],
  view: SquatView
): SquatMetrics => {
  const notes = checkQuality(frames);
  const duration = frames.length > 1 ? (frames[frames.length - 1].t - frames[0].t) / 1000 : 0;
  const out: SquatMetrics = {
    version: SQUAT_METRICS_VERSION,
    view,
    duration_s: round1(duration),
    frames: frames.length,
    quality: notes.length === 0 ? 'ok' : 'insufficiente',
    quality_notes: [...notes],
  };
  if (out.quality !== 'ok') return out;

  const fps = frames.length / Math.max(duration, 0.1);
  const reps = segmentReps(frames, fps);
  if (reps.length < 2) {
    out.quality = 'insufficiente';
    out.quality_notes.push('Non riconosco abbastanza ripetizioni: servono almeno 2-3 squat completi, ripresi per intero.');
    return out;
  }
  out.reps = reps.length;

  if (view === 'laterale') {
    // Angolo del ginocchio al fondo (media delle due gambe, media sulle rip)
    const bottomAngles = reps.map((r) => {
      const f = frames[r.bottomIdx];
      const left = kneeAngle(f.landmarks[LM.L_HIP], f.landmarks[LM.L_KNEE], f.landmarks[LM.L_ANKLE]);
      const right = kneeAngle(f.landmarks[LM.R_HIP], f.landmarks[LM.R_KNEE], f.landmarks[LM.R_ANKLE]);
      return (left + right) / 2;
    });
    const angle = mean(bottomAngles);
    out.bottom_knee_angle_deg = round1(angle);
    out.depth = angle < 90 ? 'profondo' : angle <= 110 ? 'parallelo' : 'parziale';

    // Tronco al fondo
    const leans = reps.map((r) => {
      const f = frames[r.bottomIdx];
      const sh = mid(f.landmarks[LM.L_SHOULDER], f.landmarks[LM.R_SHOULDER]);
      const hip = mid(f.landmarks[LM.L_HIP], f.landmarks[LM.R_HIP]);
      return Math.abs(deg(Math.atan2(sh.x - hip.x, hip.y - sh.y)));
    });
    out.trunk_lean_bottom_deg = round1(mean(leans));

    // Tempo di discesa/risalita (dal 30% di profondità al fondo e ritorno)
    out.tempo_down_s = round1(mean(reps.map((r) => (frames[r.bottomIdx].t - frames[r.startIdx].t) / 1000)));
    out.tempo_up_s = round1(mean(reps.map((r) => (frames[r.endIdx].t - frames[r.bottomIdx].t) / 1000)));
  } else {
    // FRONTALE: valgismo al fondo (deviazione del ginocchio dalla retta
    // anca→caviglia, verso l'interno ricavato dai dati) + deriva bacino
    const dev = (f: LandmarkFrame, hipIdx: number, kneeIdx: number, ankleIdx: number, otherHipIdx: number): number => {
      const hip = f.landmarks[hipIdx];
      const knee = f.landmarks[kneeIdx];
      const ankle = f.landmarks[ankleIdx];
      const hipW = Math.abs(f.landmarks[LM.L_HIP].x - f.landmarks[LM.R_HIP].x) || 1e-6;
      const tt = (knee.y - hip.y) / ((ankle.y - hip.y) || 1e-6);
      const expectedX = hip.x + tt * (ankle.x - hip.x);
      const inwardSign = Math.sign(f.landmarks[otherHipIdx].x - hip.x) || 1;
      return (((knee.x - expectedX) * inwardSign) / hipW) * 100;
    };
    const left = reps.map((r) => dev(frames[r.bottomIdx], LM.L_HIP, LM.L_KNEE, LM.L_ANKLE, LM.R_HIP));
    const right = reps.map((r) => dev(frames[r.bottomIdx], LM.R_HIP, LM.R_KNEE, LM.R_ANKLE, LM.L_HIP));
    out.knee_valgus_bottom_pct = { left: round1(mean(left)), right: round1(mean(right)) };

    // Deriva laterale del bacino al fondo rispetto alla posizione in piedi
    const standX = mean(
      frames.slice(0, Math.max(3, Math.round(fps))).map((f) => mid(f.landmarks[LM.L_HIP], f.landmarks[LM.R_HIP]).x)
    );
    const shifts = reps.map((r) => {
      const f = frames[r.bottomIdx];
      const hipW = Math.abs(f.landmarks[LM.L_HIP].x - f.landmarks[LM.R_HIP].x) || 1e-6;
      return (Math.abs(mid(f.landmarks[LM.L_HIP], f.landmarks[LM.R_HIP]).x - standX) / hipW) * 100;
    });
    out.hip_shift_pct = round1(mean(shifts));
  }

  return out;
};
