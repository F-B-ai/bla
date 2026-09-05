// ============================================================
// FORMULE CANONICHE ESSĒRE — src/domain (doc 03 §2)
// ------------------------------------------------------------
// Qui vive la logica pura che "fa danni se sbaglia": punteggi,
// XP/livelli, ripartizione economica. Zero dipendenze da Firebase
// o dalla UI: tutto testabile in CI senza infrastruttura.
// I service (wellnessService, gamificationService, paymentService)
// re-esportano da qui — non duplicare mai queste formule altrove.
// formula_version: 1 (Stato ESSĒRE v1 — la v2 wearable-aware è H1)
// ============================================================

export const FORMULA_VERSION = 1;

// --- Stato ESSĒRE: punteggio 0-100 dai 4 slider (1-5) ---
// dolori invertiti: soreness 1 (nessun dolore) → contributo pieno
export const computeScore = (
  sleep: number,
  energy: number,
  mood: number,
  soreness: number
): number => {
  const raw = sleep + energy + mood + (6 - soreness); // 4..20
  return Math.round(((raw - 4) / 16) * 100);
};

// ============================================================
// READINESS v2 — formula canonica doc 03 §2.1 (M3)
// ------------------------------------------------------------
// Differenza dalla v1: pesi non uniformi (il sonno è il predittore
// soggettivo più robusto; i dolori quasi quanto, perché sono l'unico
// segnale che deve poter bloccare). Il blend wearable (α ≤ 0.4) è H1:
// senza wearable α = 0 e questa È la formula completa.
// Ogni punteggio v2 è spiegabile: la scomposizione dice quanto ogni
// slider ha contribuito (un numero inspiegabile distrugge la fiducia
// del coach — vincolo di prodotto, doc 02 §4.2).
// changelog: v2 introdotta in M3 (pesi 0.30/0.25/0.20/0.25); la v1
// resta la formula mostrata in UI finché il batch non la promuove.
// ============================================================

export const READINESS_FORMULA_VERSION = 2;

export const READINESS_WEIGHTS = {
  sleep: 0.3,
  energy: 0.25,
  mood: 0.2,
  soreness: 0.25, // applicato a (1 − dolori normalizzati)
} as const;

export interface ReadinessV2 {
  score: number; // 0-100, arrotondato
  version: number;
  /** Contributo di ogni componente in punti (somma ≈ score). */
  breakdown: { sleep: number; energy: number; mood: number; soreness: number };
}

const norm15 = (x: number): number => {
  const clamped = Math.min(5, Math.max(1, x));
  return (clamped - 1) / 4; // 1..5 → 0..1
};

export const computeReadinessV2 = (
  sleep: number,
  energy: number,
  mood: number,
  soreness: number
): ReadinessV2 => {
  const parts = {
    sleep: 100 * READINESS_WEIGHTS.sleep * norm15(sleep),
    energy: 100 * READINESS_WEIGHTS.energy * norm15(energy),
    mood: 100 * READINESS_WEIGHTS.mood * norm15(mood),
    soreness: 100 * READINESS_WEIGHTS.soreness * (1 - norm15(soreness)),
  };
  const exact = parts.sleep + parts.energy + parts.mood + parts.soreness;
  return {
    score: Math.round(exact),
    version: READINESS_FORMULA_VERSION,
    breakdown: {
      sleep: Math.round(parts.sleep * 10) / 10,
      energy: Math.round(parts.energy * 10) / 10,
      mood: Math.round(parts.mood * 10) / 10,
      soreness: Math.round(parts.soreness * 10) / 10,
    },
  };
};

export interface ScoreAdvice {
  title: string;
  detail: string;
  color: 'success' | 'warning' | 'error';
}

// Soglie d'azione: ≥75 spingi · 50-74 moderato · <50 recupero
export const adviceForScore = (score: number): ScoreAdvice => {
  if (score >= 75) {
    return {
      title: 'Giornata per spingere',
      detail: 'Mente e corpo sono pronti: è il giorno giusto per intensità e carichi importanti.',
      color: 'success',
    };
  }
  if (score >= 50) {
    return {
      title: 'Allenamento moderato',
      detail: 'Allenati con buona tecnica ma senza cercare massimali: ascolta il corpo.',
      color: 'warning',
    };
  }
  return {
    title: 'Recupero attivo',
    detail: 'Oggi privilegia mobilità, respirazione e lavoro leggero: il recupero è allenamento.',
    color: 'error',
  };
};

// --- Gamification: livelli (il livello L richiede L*100 XP in più del precedente) ---
export const calculateLevel = (xp: number): number => {
  let level = 0;
  let xpRequired = 0;
  while (xpRequired <= xp) {
    level++;
    xpRequired += level * 100;
  }
  return level;
};

export const xpForLevel = (level: number): number => {
  let total = 0;
  for (let i = 1; i <= level; i++) {
    total += i * 100;
  }
  return total;
};

// --- Pagamenti: ripartizione incassi (denaro vero: mai sbagliare i conti) ---
export const calculateCollaboratorEarnings = (
  totalPaid: number,
  commissionPercentage: number
): { collaboratorShare: number; ownerShare: number } => {
  const collaboratorShare = (totalPaid * commissionPercentage) / 100;
  const ownerShare = totalPaid - collaboratorShare;
  return { collaboratorShare, ownerShare };
};

export const calculateFullEarnings = (
  totalPaid: number,
  coachCommissionPercentage: number,
  managerCommissionPercentage: number
): { coachShare: number; managerShare: number; ownerShare: number } => {
  const coachShare = (totalPaid * coachCommissionPercentage) / 100;
  const managerShare = (totalPaid * managerCommissionPercentage) / 100;
  const ownerShare = totalPaid - coachShare - managerShare;
  return { coachShare, managerShare, ownerShare };
};

// --- Rate: giorni alla scadenza (negativo = in ritardo) ---
export const daysUntilDue = (dueDate: Date, today: Date = new Date()): number => {
  const d = new Date(dueDate); d.setHours(0, 0, 0, 0);
  const t = new Date(today); t.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - t.getTime()) / 86400000);
};

export const isInstallmentOverdue = (
  dueDate: Date,
  isPaid: boolean,
  today: Date = new Date()
): boolean => !isPaid && daysUntilDue(dueDate, today) < 0;
