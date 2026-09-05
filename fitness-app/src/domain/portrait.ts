// ============================================================
// RITRATTO ESSĒRE — firme comportamentali (Tappa A)
// ------------------------------------------------------------
// "Comprendi chi sei attraverso il movimento": qui il twin passa
// da COSA FA una persona a COME È quando si muove. Dominio puro.
//
// Regole non negoziabili:
//  - ogni tratto esiste SOLO se c'è il dato che lo prova
//    (evidence citata; sotto la soglia minima il tratto non esce);
//  - descriviamo COMPORTAMENTI osservati, mai etichette
//    psicologiche o cliniche (doc 06);
//  - confidence onesta: 'solida' con dati abbondanti, 'iniziale'
//    appena sopra la soglia.
// ============================================================

import { linearSlope } from './brain';

export const PORTRAIT_SIGNATURES_VERSION = 1;

export interface PortraitEvent {
  type: string;
  ts: Date;
  payload: Record<string, any>;
}

export interface Signature {
  key:
    | 'cronotipo'
    | 'ritmo'
    | 'progressione'
    | 'recupero'
    | 'legame_umore'
    | 'costanza';
  /** etichetta breve del tratto, es. "Mattiniero" */
  label: string;
  /** la PROVA numerica, citabile nel ritratto */
  evidence: string;
  confidence: 'solida' | 'iniziale';
}

const MS_DAY = 86400000;

const mean = (xs: number[]): number =>
  xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length;

/** Correlazione di Pearson; 0 se una serie è piatta. */
export const pearson = (xs: number[], ys: number[]): number => {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return 0;
  const mx = mean(xs.slice(0, n));
  const my = mean(ys.slice(0, n));
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    dx += (xs[i] - mx) ** 2;
    dy += (ys[i] - my) ** 2;
  }
  if (dx === 0 || dy === 0) return 0;
  return num / Math.sqrt(dx * dy);
};

// ------------------------------------------------------------
// Le firme
// ------------------------------------------------------------

/** Cronotipo: quando la persona SI PRESENTA (checkin + workout). */
const chronotype = (events: PortraitEvent[]): Signature | null => {
  const hours = events
    .filter((e) => e.type === 'gym.checkin' || e.type === 'workout.started' || e.type === 'workout.completed')
    .map((e) => e.ts.getHours());
  if (hours.length < 8) return null;
  const buckets = {
    mattina: hours.filter((h) => h >= 5 && h < 12).length,
    pranzo: hours.filter((h) => h >= 12 && h < 15).length,
    sera: hours.filter((h) => h >= 15 && h < 23).length,
  };
  const total = hours.length;
  const top = (Object.entries(buckets) as Array<[string, number]>).sort((a, b) => b[1] - a[1])[0];
  const share = top[1] / total;
  if (share < 0.6) {
    return {
      key: 'cronotipo',
      label: 'Orari flessibili',
      evidence: `presenze distribuite: ${Math.round((buckets.mattina / total) * 100)}% mattina, ${Math.round((buckets.pranzo / total) * 100)}% pranzo, ${Math.round((buckets.sera / total) * 100)}% sera (${total} rilevazioni)`,
      confidence: total >= 20 ? 'solida' : 'iniziale',
    };
  }
  const labels: Record<string, string> = {
    mattina: 'Mattiniero', pranzo: 'Della pausa pranzo', sera: 'Serale',
  };
  return {
    key: 'cronotipo',
    label: labels[top[0]],
    evidence: `${Math.round(share * 100)}% delle presenze in fascia ${top[0]} (${top[1]} su ${total})`,
    confidence: total >= 20 ? 'solida' : 'iniziale',
  };
};

/** Ritmo: quanto spesso, e quanto regolarmente. */
const rhythm = (events: PortraitEvent[], windowDays: number): Signature | null => {
  const workouts = events.filter((e) => e.type === 'workout.completed');
  const weeks = Math.max(1, Math.floor(windowDays / 7));
  if (workouts.length < 4 || weeks < 3) return null;
  const perWeek: number[] = Array(weeks).fill(0);
  const now = Math.max(...events.map((e) => e.ts.getTime()));
  for (const w of workouts) {
    const wk = Math.floor((now - w.ts.getTime()) / (7 * MS_DAY));
    if (wk >= 0 && wk < weeks) perWeek[wk]++;
  }
  const avg = mean(perWeek);
  const sd = Math.sqrt(mean(perWeek.map((x) => (x - avg) ** 2)));
  const regular = avg > 0 && sd / Math.max(avg, 0.1) < 0.6;
  return {
    key: 'ritmo',
    label: regular ? `Costante (${avg.toFixed(1)}/settimana)` : `A ondate (${avg.toFixed(1)}/settimana in media)`,
    evidence: regular
      ? `frequenza stabile: ${avg.toFixed(1)} allenamenti/settimana con poca variazione su ${weeks} settimane`
      : `settimane piene e settimane vuote: media ${avg.toFixed(1)}/settimana ma con forti oscillazioni su ${weeks} settimane`,
    confidence: weeks >= 5 ? 'solida' : 'iniziale',
  };
};

/** Progressione: come cresce il volume — accumulo o strappi. */
const progression = (events: PortraitEvent[], windowDays: number): Signature | null => {
  const workouts = events.filter(
    (e) => e.type === 'workout.completed' && typeof e.payload.total_volume_kg === 'number'
  );
  const weeks = Math.max(1, Math.floor(windowDays / 7));
  if (workouts.length < 6 || weeks < 4) return null;
  const now = Math.max(...events.map((e) => e.ts.getTime()));
  const volPerWeek: number[] = Array(weeks).fill(0);
  for (const w of workouts) {
    const wk = Math.floor((now - w.ts.getTime()) / (7 * MS_DAY));
    if (wk >= 0 && wk < weeks) volPerWeek[wk] += w.payload.total_volume_kg;
  }
  const series = volPerWeek.slice().reverse(); // dal passato al presente
  const active = series.filter((v) => v > 0);
  if (active.length < 4) return null;
  const slope = linearSlope(series.map((v, i) => ({ x: i, y: v })));
  const avg = mean(active);
  const slopePct = avg > 0 ? (slope / avg) * 100 : 0;
  let label: string;
  let evidence: string;
  if (slopePct > 3) {
    label = 'In crescita';
    evidence = `volume settimanale in aumento (~${Math.round(slopePct)}%/settimana su ${active.length} settimane attive)`;
  } else if (slopePct < -3) {
    label = 'In calo';
    evidence = `volume settimanale in discesa (~${Math.round(Math.abs(slopePct))}%/settimana su ${active.length} settimane attive)`;
  } else {
    label = 'Stabile';
    evidence = `volume settimanale costante (~${Math.round(avg)} kg/settimana su ${active.length} settimane attive)`;
  }
  return { key: 'progressione', label, evidence, confidence: active.length >= 6 ? 'solida' : 'iniziale' };
};

/** Recupero: la readiness del GIORNO DOPO le sedute più pesanti. */
const recovery = (events: PortraitEvent[]): Signature | null => {
  const workouts = events.filter(
    (e) => e.type === 'workout.completed' && typeof e.payload.total_volume_kg === 'number'
  );
  const wellness = events.filter(
    (e) => e.type === 'wellness.checkin_submitted' && typeof e.payload.score === 'number'
  );
  if (workouts.length < 4 || wellness.length < 6) return null;
  const volumes = workouts.map((w) => w.payload.total_volume_kg as number);
  // "pesante" = top 25% delle SUE sedute (soglia assoluta tipo 1.2×media
  // non scatta mai per chi è molto regolare)
  const sorted = [...volumes].sort((a, b) => a - b);
  const heavyThreshold = sorted[Math.floor(sorted.length * 0.75)];
  const heavy = workouts.filter((w) => (w.payload.total_volume_kg as number) >= heavyThreshold);
  const baseline = mean(wellness.map((w) => w.payload.score as number));
  const nextDayScores: number[] = [];
  for (const h of heavy) {
    const next = wellness.find((w) => {
      const dt = w.ts.getTime() - h.ts.getTime();
      return dt > 6 * 3600000 && dt < 40 * 3600000; // il check-in del giorno dopo
    });
    if (next) nextDayScores.push(next.payload.score as number);
  }
  if (nextDayScores.length < 2) return null;
  const delta = mean(nextDayScores) - baseline;
  const fast = delta >= -5;
  return {
    key: 'recupero',
    label: fast ? 'Recupero rapido' : 'Recupero lento',
    evidence: fast
      ? `dopo le sedute più pesanti la readiness resta in media a ${Math.round(mean(nextDayScores))} (baseline ${Math.round(baseline)}) su ${nextDayScores.length} casi`
      : `dopo le sedute più pesanti la readiness scende in media di ${Math.round(Math.abs(delta))} punti (${nextDayScores.length} casi)`,
    confidence: nextDayScores.length >= 4 ? 'solida' : 'iniziale',
  };
};

/** Legame umore↔presenza: si allena PER stare bene o QUANDO sta bene? */
const moodLink = (events: PortraitEvent[], windowDays: number): Signature | null => {
  const weeks = Math.max(1, Math.floor(windowDays / 7));
  const wellness = events.filter(
    (e) => e.type === 'wellness.checkin_submitted' && typeof e.payload.mood === 'number'
  );
  const workouts = events.filter((e) => e.type === 'workout.completed');
  if (wellness.length < 10 || workouts.length < 4 || weeks < 4) return null;
  const now = Math.max(...events.map((e) => e.ts.getTime()));
  const moodPerWeek: number[][] = Array.from({ length: weeks }, () => []);
  const workPerWeek: number[] = Array(weeks).fill(0);
  for (const w of wellness) {
    const wk = Math.floor((now - w.ts.getTime()) / (7 * MS_DAY));
    if (wk >= 0 && wk < weeks) moodPerWeek[wk].push(w.payload.mood as number);
  }
  for (const w of workouts) {
    const wk = Math.floor((now - w.ts.getTime()) / (7 * MS_DAY));
    if (wk >= 0 && wk < weeks) workPerWeek[wk]++;
  }
  const paired: Array<{ mood: number; work: number }> = [];
  for (let i = 0; i < weeks; i++) {
    if (moodPerWeek[i].length > 0) paired.push({ mood: mean(moodPerWeek[i]), work: workPerWeek[i] });
  }
  if (paired.length < 4) return null;
  const r = pearson(paired.map((p) => p.mood), paired.map((p) => p.work));
  if (Math.abs(r) < 0.4) {
    return {
      key: 'legame_umore',
      label: 'Si allena a prescindere',
      evidence: `la frequenza non segue l'umore (correlazione debole su ${paired.length} settimane): l'allenamento è un'abitudine, non un termometro`,
      confidence: paired.length >= 6 ? 'solida' : 'iniziale',
    };
  }
  return {
    key: 'legame_umore',
    label: r > 0 ? "Sensibile all'umore" : 'Si allena per reagire',
    evidence: r > 0
      ? `nelle settimane di umore basso si allena visibilmente meno (correlazione ${r.toFixed(2)} su ${paired.length} settimane)`
      : `nelle settimane di umore basso si allena DI PIÙ: usa il movimento per risalire (correlazione ${r.toFixed(2)} su ${paired.length} settimane)`,
    confidence: paired.length >= 6 ? 'solida' : 'iniziale',
  };
};

/** Costanza: settimane consecutive con ≥2 allenamenti (dal presente). */
const consistency = (events: PortraitEvent[], windowDays: number): Signature | null => {
  const workouts = events.filter((e) => e.type === 'workout.completed');
  if (workouts.length < 2) return null;
  const weeks = Math.max(1, Math.floor(windowDays / 7));
  const now = Math.max(...events.map((e) => e.ts.getTime()));
  let streak = 0;
  for (let w = 0; w < weeks; w++) {
    const inWeek = workouts.filter((e) => {
      const d = Math.floor((now - e.ts.getTime()) / MS_DAY);
      return d >= w * 7 && d < (w + 1) * 7;
    }).length;
    if (inWeek >= 2) streak++;
    else break;
  }
  if (streak < 2) return null;
  return {
    key: 'costanza',
    label: `${streak} settimane di fila`,
    evidence: `almeno 2 allenamenti a settimana per ${streak} settimane consecutive`,
    confidence: streak >= 4 ? 'solida' : 'iniziale',
  };
};

// ------------------------------------------------------------
// Entry point
// ------------------------------------------------------------

export interface PortraitSignatures {
  version: number;
  windowDays: number;
  eventsCount: number;
  signatures: Signature[];
  /** onestà sul cold start: quanto è "conosciuta" questa persona */
  maturity: 'ricco' | 'parziale' | 'appena_iniziato';
}

export const computeSignatures = (
  events: PortraitEvent[],
  windowDays: number = 90
): PortraitSignatures => {
  const signatures = [
    chronotype(events),
    rhythm(events, windowDays),
    progression(events, windowDays),
    recovery(events),
    moodLink(events, windowDays),
    consistency(events, windowDays),
  ].filter((s): s is Signature => s !== null);

  const solid = signatures.filter((s) => s.confidence === 'solida').length;
  return {
    version: PORTRAIT_SIGNATURES_VERSION,
    windowDays,
    eventsCount: events.length,
    signatures,
    maturity: solid >= 3 ? 'ricco' : signatures.length >= 2 ? 'parziale' : 'appena_iniziato',
  };
};
