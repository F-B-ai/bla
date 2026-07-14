// ============================================================
// TWIN EVENT SERVICE — scrittura dual-write su human_events (M3)
// ------------------------------------------------------------
// Il modulo UNICO da cui ogni service emette eventi del Digital
// Human Twin (doc 02 §3.4 — strangler fig):
//   - il documento legacy resta la fonte della UI (nessuna
//     schermata cambia);
//   - l'evento twin è il "secondo sistema": se la sua scrittura
//     fallisce NON deve mai far fallire l'operazione principale
//     → emit() non lancia mai, logga e basta.
// person_id stabile (02 §6.1): ULID salvato in users/{uid}.person_id
// alla prima emissione — MAI lo uid Firebase (non sopravvive a
// cambi istanza). tenant_id (02 §6.2): slug da brand.licenseId.
// ============================================================

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  Timestamp,
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { brand } from '../config/brand';
import {
  TWIN_SCHEMA_VERSION,
  H0_CLIENT_EVENT_TYPES,
  PER_DAY_TYPES,
  TwinEventType,
  TwinEventSource,
  ulid,
  dayKey,
  deterministicEventId,
} from '../domain/twinEvents';

const EVENTS_COLLECTION = 'human_events';

// tenant slug: parte "umana" del licenseId (essere-mml-001 → essere-mml)
const TENANT_ID = brand.licenseId.replace(/-\d+$/, '');

// --- person_id stabile, con cache di sessione (1 lettura per utente) ---
const personIdCache = new Map<string, string>();

export const getPersonId = async (uid: string): Promise<string> => {
  const cached = personIdCache.get(uid);
  if (cached) return cached;
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);
  const existing = snap.exists() ? (snap.data().person_id as string | undefined) : undefined;
  if (existing) {
    personIdCache.set(uid, existing);
    return existing;
  }
  const personId = `p_${ulid()}`;
  // best-effort: se l'update fallisce (regole), l'evento usa comunque
  // il personId generato in questa sessione — la riconciliazione
  // notturna segnalerà l'anomalia.
  try {
    await updateDoc(userRef, { person_id: personId });
  } catch {
    /* vedi sopra */
  }
  personIdCache.set(uid, personId);
  return personId;
};

export interface EmitOptions {
  /** uid del soggetto dell'evento (default: utente corrente). Un coach
   *  che registra una valutazione per un allievo passa qui l'uid
   *  dell'allievo; actor_id resta chi scrive. */
  subjectUid?: string;
  /** Quando è ACCADUTO (default: adesso). */
  ts?: Date;
  source?: TwinEventSource;
  sourceDetail?: string;
  confidence?: number;
  sourceRef?: { collection: string; doc_id: string };
  supersedes?: string;
}

/**
 * Emette un evento twin. NON lancia mai: il chiamante non deve
 * preoccuparsene (il doc legacy è già stato scritto ed è la fonte UI).
 * Ritorna l'id evento, o null se l'emissione è fallita/saltata.
 */
export const emitTwinEvent = async (
  type: TwinEventType,
  payload: Record<string, unknown>,
  opts: EmitOptions = {}
): Promise<string | null> => {
  try {
    if (!(H0_CLIENT_EVENT_TYPES as readonly string[]).includes(type)) return null;
    const actorUid = auth.currentUser?.uid;
    if (!actorUid) return null;
    const subjectUid = opts.subjectUid || actorUid;
    const personId = await getPersonId(subjectUid);

    const ts = opts.ts || new Date();
    const eventId = PER_DAY_TYPES.has(type)
      ? deterministicEventId(type, personId, dayKey(ts), opts.source || 'app')
      : ulid();

    await setDoc(doc(db, EVENTS_COLLECTION, eventId), {
      id: eventId,
      schema_version: TWIN_SCHEMA_VERSION,
      person_id: personId,
      tenant_id: TENANT_ID,
      type,
      ts: Timestamp.fromDate(ts),
      recorded_at: Timestamp.now(),
      source: opts.source || 'app',
      source_detail: opts.sourceDetail || null,
      actor_id: actorUid,
      payload,
      confidence: opts.confidence ?? 0.9, // default self-report (02 §3.1)
      source_ref: opts.sourceRef || null,
      supersedes: opts.supersedes || null,
    });
    return eventId;
  } catch (e) {
    // Il twin è il secondo sistema: mai rompere il flusso principale.
    console.warn('[twin] emissione evento fallita:', type, (e as Error)?.message);
    return null;
  }
};
