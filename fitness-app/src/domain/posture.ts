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

// v4 (10 novembre 2026) — le coordinate vanno RADDRIZZATE prima di
// misurare: vedi `raddrizza` qui sotto.
export const POSTURE_METRICS_VERSION = 4;

// ============================================================
// 10 novembre 2026 — GLI ANGOLI NON ERANO «REALI»
// ------------------------------------------------------------
// MediaPipe restituisce x in frazioni della LARGHEZZA della foto e y
// in frazioni dell'ALTEZZA. Sono due righelli diversi. Su una foto
// quadrata coincidono; su una foto verticale da telefono (3:4, 9:16)
// no — e fino a v3 gli angoli si calcolavano su quei numeri così
// com'erano.
//
// Effetto, su una foto 3:4:
//   • ogni deviazione dalla VERTICALE (testa in avanti, tronco, filo
//     a piombo) usciva GONFIATA: 45° veri si leggevano 53°;
//   • ogni inclinazione dall'ORIZZONTALE (spalle, bacino) usciva
//     SCHIACCIATA: 4° veri si leggevano 3°.
//
// Il confronto prima/dopo fra due foto con lo stesso formato resta
// valido nel verso (entrambe storte allo stesso modo). I numeri
// assoluti no, e nemmeno le soglie lieve/moderato.
//
// Il rimedio è uno solo e sta a monte: portare x nello stesso
// righello di y (frazioni dell'altezza) PRIMA di qualunque formula.
// ============================================================

/**
 * Porta i landmark su un righello unico: x e y entrambe in frazioni
 * dell'ALTEZZA della foto. Da chiamare sempre prima di misurare.
 * Con dimensioni mancanti o assurde restituisce i punti invariati:
 * meglio la misura di prima che una divisione per zero.
 */
export const raddrizza = (
  lm: Landmark[],
  larghezza: number,
  altezza: number
): Landmark[] => {
  if (!(larghezza > 0) || !(altezza > 0)) return lm;
  const k = larghezza / altezza;
  return lm.map((p) => ({ ...p, x: p.x * k }));
};

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
  /**
   * Di quanto oscilla questo numero rileggendo la STESSA foto più
   * volte (±, stessa unità del valore). È la ripetibilità della
   * lettura: non dice quanto il numero è vicino al vero, dice quanto
   * è stabile. Assente se la foto è stata letta una volta sola.
   */
  tolerance?: number;
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

// ============================================================
// 10 novembre 2026 — LEGGERE PIÙ VOLTE, E DIRE DI QUANTO SI OSCILLA
// ------------------------------------------------------------
// Il titolare: «Devi creare qualcosa di altissima precisione,
// altrimenti tutto perde valore.»
//
// La precisione non si dichiara: si misura. Ho preso una foto vera e
// l'ho fatta rileggere sedici volte spostandola di pochi pixel. I
// punti non cadono mai nello stesso posto: tremano. Col modello
// leggero il punto tipico si sposta di ~5 pixel, e una volta su
// sedici un punto è saltato di 94. Un numero letto una volta sola,
// quindi, porta con sé un'incertezza che nessuno vedeva.
//
// Due rimedi, tutti e due qui:
//  1. si legge la foto PIÙ VOLTE e si tiene la MEDIANA di ogni punto
//     (la mediana ignora il punto che salta; la media no);
//  2. accanto a ogni misura si scrive di quanto ha oscillato (±).
//
// E una conseguenza che vale più dei due rimedi: fra un «prima» e un
// «dopo» una differenza conta SOLO se è più grande dell'oscillazione.
// Sotto quel margine non è un miglioramento: è rumore.
// ============================================================

export const mediana = (a: number[]): number => {
  if (!a.length) return NaN;
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** Dispersione robusta (stima della deviazione standard dalla MAD). */
export const dispersione = (a: number[]): number => {
  if (a.length < 2) return 0;
  const m = mediana(a);
  return 1.4826 * mediana(a.map((x) => Math.abs(x - m)));
};

/**
 * Fonde più letture della stessa foto in uno scheletro solo: per
 * ogni punto, la mediana di x, di y e della visibilità.
 */
export const fondiLetture = (letture: Landmark[][]): Landmark[] | null => {
  const buone = (letture || []).filter((l) => l && l.length >= 33);
  if (!buone.length) return null;
  return buone[0].map((_, i) => ({
    x: mediana(buone.map((l) => l[i].x)),
    y: mediana(buone.map((l) => l[i].y)),
    visibility: mediana(buone.map((l) => l[i].visibility ?? 1)),
  }));
};

/** Sotto questo numero di letture l'oscillazione non si stima. */
export const LETTURE_MINIME = 3;

/**
 * Misura da più letture GIÀ RADDRIZZATE della stessa foto. Il valore
 * è quello dello scheletro mediano; `tolerance` è di quanto la stessa
 * misura ha oscillato da una lettura all'altra.
 */
export const misuraRipetuta = (letture: Landmark[][], view: PostureView): PostureMetrics => {
  const fuso = fondiLetture(letture);
  if (!fuso) return computePostureMetrics([], view);
  const base = computePostureMetrics(fuso, view);
  const buone = letture.filter((l) => l && l.length >= 33);
  if (base.quality !== 'ok' || buone.length < LETTURE_MINIME) return base;

  const singole = buone.map((l) => computePostureMetrics(l, view));
  const conMargine = (f: PostureFinding): PostureFinding => {
    const valori = singole
      .map((m) => m.findings.find((x) => x.key === f.key))
      .map((x) => (x ? x.value_deg ?? x.value_pct : undefined))
      .filter((x): x is number => typeof x === 'number');
    if (valori.length < LETTURE_MINIME) return f;
    return { ...f, tolerance: round1(dispersione(valori)) };
  };
  const findings = base.findings.map(conMargine);
  return {
    ...base,
    findings,
    notable: base.notable.map((n) => findings.find((f) => f.key === n.key) || n),
    quality_notes: [...base.quality_notes, `Foto letta ${buone.length} volte: accanto a ogni misura c'è di quanto ha oscillato.`],
  };
};

// Sotto questi valori non si parla di cambiamento, qualunque sia la
// ripetibilità della lettura: fra due foto diverse la persona non si
// rimette mai identica, e questo margine lo copre.
export const MARGINE_MINIMO_GRADI = 2;
export const MARGINE_MINIMO_PERCENTO = 3;

export interface Cambiamento {
  key: string;
  label: string;
  view: PostureView;
  prima: number;
  dopo: number;
  /** dopo − prima: negativo = la deviazione si è ridotta */
  delta: number;
  /** quanto deve valere |delta| per contare */
  margine: number;
  unita: '°' | '%';
  esito: 'ridotta' | 'aumentata' | 'entro il margine';
}

/**
 * Confronta la stessa misura fra due valutazioni. Tutte le misure
 * sono DEVIAZIONI (0 = allineato): «ridotta» è il verso buono.
 * Ritorna null se le due non sono la stessa misura o manca un valore.
 */
export const cambiamento = (
  prima: PostureFinding | undefined,
  dopo: PostureFinding | undefined,
  view: PostureView = 'frontale'
): Cambiamento | null => {
  if (!prima || !dopo || prima.key !== dopo.key) return null;
  const inGradi = prima.value_deg != null && dopo.value_deg != null;
  const a = inGradi ? prima.value_deg : prima.value_pct;
  const b = inGradi ? dopo.value_deg : dopo.value_pct;
  if (typeof a !== 'number' || typeof b !== 'number') return null;
  const t = Math.hypot(prima.tolerance || 0, dopo.tolerance || 0);
  const margine = round1(Math.max(inGradi ? MARGINE_MINIMO_GRADI : MARGINE_MINIMO_PERCENTO, 2 * t));
  const delta = round1(b - a);
  return {
    key: dopo.key,
    label: dopo.label,
    view,
    prima: a,
    dopo: b,
    delta,
    margine,
    unita: inGradi ? '°' : '%',
    esito: Math.abs(delta) <= margine ? 'entro il margine' : delta < 0 ? 'ridotta' : 'aumentata',
  };
};

/** Tutte le misure in comune fra due valutazioni, vista per vista. */
export const cambiamenti = (
  prima: PostureMetrics[] | null | undefined,
  dopo: PostureMetrics[] | null | undefined
): Cambiamento[] => {
  const out: Cambiamento[] = [];
  for (const d of dopo || []) {
    if (!d || d.quality !== 'ok') continue;
    const p = (prima || []).find((x) => x && x.view === d.view && x.quality === 'ok');
    if (!p) continue;
    for (const f of d.findings) {
      const c = cambiamento(p.findings.find((x) => x.key === f.key), f, d.view);
      if (c) out.push(c);
    }
  }
  return out;
};
