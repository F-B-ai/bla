// ============================================================
// DIGITAL HUMAN TWIN — registro eventi canonico (M3, doc 02 §3)
// ------------------------------------------------------------
// Questo file è DOMINIO PURO: niente Firebase, niente I/O.
// - La tassonomia è CHIUSA: si estende con una PR sul pacchetto
//   documenti (docs/essere-os/02 §3.3), mai ad hoc.
// - Gli eventi "per giorno" (check-in) hanno ID deterministico:
//   il retry non duplica (doc 02 §3.2).
// - Il payload è un riassunto, non un dump: il dettaglio resta
//   nel documento legacy puntato da source_ref.
// ============================================================

export const TWIN_SCHEMA_VERSION = 1;

/** Tassonomia H0 — sottoinsieme del registro 42 tipi (02 §3.3) che
 *  i client possono scrivere in Fase 1 (dual-write). La whitelist
 *  nelle security rules DEVE coincidere con questa lista. */
export const H0_CLIENT_EVENT_TYPES = [
  'person.onboarded',
  'wellness.checkin_submitted',
  'breathing.session_completed',
  'gym.checkin',
  'workout.started',
  'workout.completed',
  'workout.abandoned',
  'body.measurement_recorded',
  'body.composition_estimated',
  'posture.assessed',
  'movement.gait_assessed',
  'movement.squat_assessed',
  'mindmovement.assessed',
  'coach.attention_handled',
  'event.corrected',
] as const;

export type TwinEventType = (typeof H0_CLIENT_EVENT_TYPES)[number];

export type TwinEventSource = 'app' | 'coach' | 'wearable' | 'ai' | 'system';

/** Fedeltà della misura, non verità assoluta (02 §3.1 — prior dichiarati). */
export const CONFIDENCE = {
  coach: 1.0,
  selfReport: 0.9,
  aiPosture: 0.65,
  aiBodyComp: 0.55,
  backfillPenalty: 0.05, // si sottrae alla riga d'origine
} as const;

export interface TwinEventDoc {
  id: string;
  schema_version: number;
  person_id: string;
  tenant_id: string;
  type: TwinEventType;
  ts: Date; // quando è ACCADUTO (il service lo converte in Timestamp)
  recorded_at: Date; // quando è stato SCRITTO
  source: TwinEventSource;
  source_detail: string | null;
  actor_id: string;
  payload: Record<string, unknown>;
  confidence: number;
  source_ref: { collection: string; doc_id: string } | null;
  supersedes: string | null;
}

// ------------------------------------------------------------
// ULID — ordinabile per tempo, 26 char Crockford base32 (02 §3.1)
// ------------------------------------------------------------
const B32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

const randomBytes = (n: number): Uint8Array => {
  const out = new Uint8Array(n);
  const g: any = typeof globalThis !== 'undefined' ? (globalThis as any) : {};
  if (g.crypto?.getRandomValues) {
    g.crypto.getRandomValues(out);
  } else {
    for (let i = 0; i < n; i++) out[i] = Math.floor(Math.random() * 256);
  }
  return out;
};

export const ulid = (nowMs: number = Date.now()): string => {
  // 48 bit di tempo → 10 char
  let t = nowMs;
  const time = new Array<string>(10);
  for (let i = 9; i >= 0; i--) {
    time[i] = B32[t % 32];
    t = Math.floor(t / 32);
  }
  // 80 bit random → 16 char
  const rnd = randomBytes(16);
  let rand = '';
  for (let i = 0; i < 16; i++) rand += B32[rnd[i] % 32];
  return time.join('') + rand;
};

/** Chiave-giorno locale (Europe/Rome è il fuso dell'istanza; per gli
 *  eventi self-report vale il giorno percepito dal device). */
export const dayKey = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const g = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${g}`;
};

/** ID deterministico per gli eventi "per giorno": il retry non duplica.
 *  Formato leggibile (debuggabilità > eleganza): type_person_day_source. */
export const deterministicEventId = (
  type: TwinEventType,
  personId: string,
  day: string,
  source: TwinEventSource
): string => `${type.replace(/\./g, '-')}_${personId}_${day}_${source}`;

/** I tipi che si deduplicano per giorno (02 §3.2: fatti "per giorno"). */
export const PER_DAY_TYPES: ReadonlySet<TwinEventType> = new Set([
  'wellness.checkin_submitted',
] as TwinEventType[]);
