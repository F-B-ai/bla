// ============================================================
// ANALISI POSTURALE — metriche deterministiche (AI Biomechanics v3)
// ------------------------------------------------------------
// STESSA DOTTRINA di cammino (gait.ts) e squat (squat.ts):
// LE FORMULE CALCOLANO, L'AI SPIEGA.
//
// Fino a v2 la postura era l'unica analisi SENZA questo strato:
// le foto andavano dritte al modello, a cui si chiedeva di
// "stimare a occhio" angoli e asimmetrie — cosa che nessun
// modello visivo sa fare in modo affidabile. Qui estraiamo i
// landmark scheletrici (MediaPipe) e MISURIAMO con la trigonometria:
//   • FRONTALE/POSTERIORE (piano coronale): inclinazione spalle,
//     obliquità del bacino, scostamento laterale del capo, sway.
//   • LATERALE (piano sagittale): testa in avanti (orecchio vs
//     spalla), inclinazione del tronco, filo a piombo.
//
// ONESTÀ (in UI): pose 2D monoculare da foto → PROXY per screening
// wellness, MAI valutazione clinica (doc 06). Le soglie sono
// indicative e prudenti: sotto ~2° il rumore di misura domina.
// ============================================================

import { Landmark, LM } from './gait';

export const POSTURE_METRICS_VERSION = 3;

// Orecchie: indici MediaPipe non presenti nel sottoinsieme LM di gait,
// ma servono per la testa-in-avanti sulla vista laterale.
const L_EAR = 7;
const R_EAR = 8;

export type PostureView = 'frontale' | 'laterale' | 'posteriore';

export type PostureSeverity = 'normale' | 'lieve' | 'moderato';

/** Un singolo rilievo misurato, con la sua gravità già classificata. */
export interface PostureFinding {
  key: string;
  /** etichetta leggibile in italiano */
  label: string;
  /** valore in gradi, quando la metrica è un angolo */
  value_deg?: number;
  /** valore in percentuale, quando la metrica è un rapporto */
  value_pct?: number;
  severity: PostureSeverity;
  /** lato/verso interessato, quando ha senso (es. "spalla sinistra più alta") */
  direction?: string;
}

export interface PostureMetrics {
  version: number;
  view: PostureView;
  /** tutti i rilievi misurati per questa vista, gravità inclusa */
  findings: PostureFinding[];
  /** i soli rilievi con severità > normale, dal più marcato */
  notable: PostureFinding[];
  quality: 'ok' | 'insufficiente';
  quality_notes: string[];
}

// ---------------- utilità geometriche ----------------

const deg = (rad: number): number => (rad * 180) / Math.PI;
const round1 = (x: number): number => Math.round(x * 10) / 10;
const vis = (p: Landmark): number => (p.visibility ?? 1);
const mid = (a: Landmark, b: Landmark): Landmark => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2,
  visibility: Math.min(vis(a), vis(b)),
});

/** Inclinazione di una linea SINISTRA→DESTRA rispetto all'orizzontale.
 *  y cresce verso il basso. Ritorna |gradi| e quale estremo è più in alto. */
export const lineTilt = (
  left: Landmark,
  right: Landmark
): { deg: number; leftHigher: boolean } => {
  const dx = right.x - left.x;
  const dy = right.y - left.y;
  const ang = Math.abs(deg(Math.atan2(dy, Math.abs(dx) || 1e-6)));
  return { deg: ang, leftHigher: left.y < right.y };
};

/** Deviazione dalla VERTICALE del vettore base→top (top sopra base).
 *  0° = perfettamente verticale. Ritorna |gradi| e il verso orizzontale. */
export const verticalDeviation = (
  base: Landmark,
  top: Landmark
): { deg: number; dx: number } => {
  const dx = top.x - base.x; // + = top spostato verso destra-immagine
  const dyUp = base.y - top.y; // + = top effettivamente sopra la base
  const ang = deg(Math.atan2(Math.abs(dx), Math.abs(dyUp) || 1e-6));
  return { deg: ang, dx };
};

// ---------------- classificazione gravità ----------------
// Soglie PRUDENTI (proxy wellness). "moderato" resta raro.

const classifyAngle = (d: number, lieve: number, moderato: number): PostureSeverity =>
  d >= moderato ? 'moderato' : d >= lieve ? 'lieve' : 'normale';

const classifyPct = (p: number, lieve: number, moderato: number): PostureSeverity =>
  p >= moderato ? 'moderato' : p >= lieve ? 'lieve' : 'normale';

// ---------------- validità dei landmark ----------------

const MIN_VIS = 0.5;
const allVisible = (pts: Landmark[]): boolean => pts.every((p) => vis(p) >= MIN_VIS);

/** Sceglie il lato (sinistra/destra) più visibile per la vista laterale:
 *  nella foto di profilo un emilato è occluso e ha visibility bassa. */
const bestSagittalSide = (
  lm: Landmark[]
): { ear: Landmark; shoulder: Landmark; hip: Landmark; ankle: Landmark } => {
  const leftVis =
    vis(lm[L_EAR]) + vis(lm[LM.L_SHOULDER]) + vis(lm[LM.L_HIP]) + vis(lm[LM.L_ANKLE]);
  const rightVis =
    vis(lm[R_EAR]) + vis(lm[LM.R_SHOULDER]) + vis(lm[LM.R_HIP]) + vis(lm[LM.R_ANKLE]);
  return leftVis >= rightVis
    ? { ear: lm[L_EAR], shoulder: lm[LM.L_SHOULDER], hip: lm[LM.L_HIP], ankle: lm[LM.L_ANKLE] }
    : { ear: lm[R_EAR], shoulder: lm[LM.R_SHOULDER], hip: lm[LM.R_HIP], ankle: lm[LM.R_ANKLE] };
};

// ============================================================
// VISTA FRONTALE / POSTERIORE — piano coronale
// ============================================================

const computeCoronal = (lm: Landmark[], view: PostureView): PostureMetrics => {
  const notes: string[] = [];
  const findings: PostureFinding[] = [];

  const lSh = lm[LM.L_SHOULDER];
  const rSh = lm[LM.R_SHOULDER];
  const lHip = lm[LM.L_HIP];
  const rHip = lm[LM.R_HIP];
  const nose = lm[LM.NOSE];

  if (!allVisible([lSh, rSh, lHip, rHip])) {
    notes.push(
      'Spalle o bacino non ben visibili: inquadra il corpo intero, di fronte, con indumenti aderenti.'
    );
    return {
      version: POSTURE_METRICS_VERSION,
      view,
      findings: [],
      notable: [],
      quality: 'insufficiente',
      quality_notes: notes,
    };
  }

  const shoulderWidth = Math.abs(rSh.x - lSh.x) || 1e-6;

  // 1. Inclinazione delle spalle
  const sh = lineTilt(lSh, rSh);
  findings.push({
    key: 'shoulder_tilt',
    label: 'Inclinazione delle spalle',
    value_deg: round1(sh.deg),
    severity: classifyAngle(sh.deg, 2, 4),
    direction: sh.deg < 1 ? undefined : `${sh.leftHigher ? 'sinistra' : 'destra'} più alta`,
  });

  // 2. Obliquità del bacino
  const pel = lineTilt(lHip, rHip);
  findings.push({
    key: 'pelvic_obliquity',
    label: 'Obliquità del bacino',
    value_deg: round1(pel.deg),
    severity: classifyAngle(pel.deg, 2, 4),
    direction: pel.deg < 1 ? undefined : `${pel.leftHigher ? 'sinistra' : 'destra'} più alta`,
  });

  // 3. Scostamento laterale del capo (naso rispetto al centro spalle)
  if (vis(nose) >= MIN_VIS) {
    const shMidX = (lSh.x + rSh.x) / 2;
    const headShiftPct = (Math.abs(nose.x - shMidX) / shoulderWidth) * 100;
    findings.push({
      key: 'head_shift',
      label: 'Scostamento laterale del capo',
      value_pct: Math.round(headShiftPct),
      severity: classifyPct(headShiftPct, 6, 12),
      direction:
        headShiftPct < 4 ? undefined : nose.x < shMidX ? 'verso sinistra' : 'verso destra',
    });
  }

  // 4. Sway coronale: centro spalle vs centro caviglie (se le caviglie ci sono)
  const lAnk = lm[LM.L_ANKLE];
  const rAnk = lm[LM.R_ANKLE];
  if (allVisible([lAnk, rAnk])) {
    const shMidX = (lSh.x + rSh.x) / 2;
    const ankMidX = (lAnk.x + rAnk.x) / 2;
    const swayPct = (Math.abs(shMidX - ankMidX) / shoulderWidth) * 100;
    findings.push({
      key: 'coronal_sway',
      label: 'Sbandamento laterale del tronco',
      value_pct: Math.round(swayPct),
      severity: classifyPct(swayPct, 8, 16),
      direction: swayPct < 5 ? undefined : shMidX < ankMidX ? 'verso sinistra' : 'verso destra',
    });
  }

  return finalize(view, findings, notes);
};

// ============================================================
// VISTA LATERALE — piano sagittale
// ============================================================

const computeSagittal = (lm: Landmark[]): PostureMetrics => {
  const notes: string[] = [];
  const findings: PostureFinding[] = [];
  const s = bestSagittalSide(lm);

  if (!allVisible([s.ear, s.shoulder, s.hip])) {
    notes.push(
      'Punti del profilo non ben visibili: inquadra di lato, corpo intero, capelli che non coprano l\'orecchio.'
    );
    return {
      version: POSTURE_METRICS_VERSION,
      view: 'laterale',
      findings: [],
      notable: [],
      quality: 'insufficiente',
      quality_notes: notes,
    };
  }

  // 1. Testa in avanti: deviazione dell'orecchio dalla verticale sulla spalla
  const fh = verticalDeviation(s.shoulder, s.ear);
  findings.push({
    key: 'forward_head',
    label: 'Testa in avanti (orecchio vs spalla)',
    value_deg: round1(fh.deg),
    severity: classifyAngle(fh.deg, 10, 18),
    direction: fh.deg < 6 ? undefined : 'capo anteposto',
  });

  // 2. Inclinazione del tronco: spalla rispetto alla verticale sull'anca
  const trunk = verticalDeviation(s.hip, s.shoulder);
  findings.push({
    key: 'trunk_inclination',
    label: 'Inclinazione del tronco',
    value_deg: round1(trunk.deg),
    severity: classifyAngle(trunk.deg, 6, 12),
    direction: trunk.deg < 4 ? undefined : trunk.dx * (s.shoulder.x - s.hip.x) >= 0 ? 'in avanti' : 'indietro',
  });

  // 3. Filo a piombo sagittale: scostamento orecchio→caviglia sulla verticale,
  //    in % dell'altezza orecchio→caviglia (se la caviglia è visibile).
  if (vis(s.ankle) >= MIN_VIS) {
    const height = Math.abs(s.ankle.y - s.ear.y) || 1e-6;
    const plumbPct = (Math.abs(s.ear.x - s.ankle.x) / height) * 100;
    findings.push({
      key: 'sagittal_plumb',
      label: 'Allineamento sul filo a piombo',
      value_pct: Math.round(plumbPct),
      severity: classifyPct(plumbPct, 6, 12),
    });
  }

  return finalize('laterale', findings, notes);
};

// ---------------- assemblaggio finale ----------------

const finalize = (
  view: PostureView,
  findings: PostureFinding[],
  notes: string[]
): PostureMetrics => {
  const notable = findings
    .filter((f) => f.severity !== 'normale')
    .sort((a, b) => sevRank(b.severity) - sevRank(a.severity));
  if (findings.length === 0 && notes.length === 0) {
    notes.push('Nessun landmark utile rilevato.');
  }
  return {
    version: POSTURE_METRICS_VERSION,
    view,
    findings,
    notable,
    quality: findings.length > 0 ? 'ok' : 'insufficiente',
    quality_notes: notes,
  };
};

const sevRank = (s: PostureSeverity): number =>
  s === 'moderato' ? 2 : s === 'lieve' ? 1 : 0;

// ============================================================
// API pubblica: da un set di landmark (una foto) → metriche
// ============================================================

export const computePostureMetrics = (lm: Landmark[], view: PostureView): PostureMetrics => {
  if (!lm || lm.length < 33) {
    return {
      version: POSTURE_METRICS_VERSION,
      view,
      findings: [],
      notable: [],
      quality: 'insufficiente',
      quality_notes: ['Landmark incompleti: la persona non è stata letta correttamente.'],
    };
  }
  return view === 'laterale' ? computeSagittal(lm) : computeCoronal(lm, view);
};
