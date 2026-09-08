import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db, auth } from '../config/firebase';

// ============================================================
// CONSENSI PRIVACY (GDPR art. 9 — dati salute = categoria speciale)
// ------------------------------------------------------------
// Consensi granulari, separati, non pre-spuntati, revocabili
// (doc 06 §3.1-3.2). Salvati in consents/{uid} con versione del
// testo: se il testo cambia (nuova versione), si richiede la
// decisione. Il consenso "secondaryUse" (finalità secondarie
// pseudonimizzate) è SEMPRE facoltativo: l'app funziona identica
// se rifiutato — è la base giuridica del miglioramento di
// algoritmi e benchmark (assetto titolare autonomo delimitato).
// ============================================================

export const CONSENT_TEXT_VERSION = 1;

export type ConsentKey =
  | 'wellness' // check-in Stato ESSĒRE, diario, dati benessere
  | 'posturalAI' // foto posturali + analisi con AI
  | 'bodyComp' // stima composizione corporea da foto (AI)
  | 'externalAI' // trattamento dei propri dati tramite AI esterna (Anthropic)
  | 'secondaryUse'; // FACOLTATIVO: benchmark pseudonimizzati + miglioramento algoritmi

export interface ConsentChoices {
  wellness: boolean;
  posturalAI: boolean;
  bodyComp: boolean;
  externalAI: boolean;
  secondaryUse: boolean;
}

export interface ConsentRecord {
  version: number;
  choices: ConsentChoices;
  decidedAt: Date;
}

export const CONSENT_LABELS: Record<
  ConsentKey,
  { title: string; description: string; optionalNote?: string }
> = {
  wellness: {
    title: 'Dati di benessere',
    description:
      'Registrazione dei check-in quotidiani (sonno, energia, umore, dolori), diario e misurazioni per il tuo percorso con il coach.',
  },
  posturalAI: {
    title: 'Foto posturali e analisi AI',
    description:
      'Scatto e conservazione di foto posturali e loro analisi con intelligenza artificiale, per la valutazione e il monitoraggio della postura.',
  },
  bodyComp: {
    title: 'Stima composizione corporea',
    description:
      'Stima della composizione corporea a partire da foto, elaborata con intelligenza artificiale. Il risultato è sempre indicativo (un range, non una diagnosi).',
  },
  externalAI: {
    title: 'AI esterna (Anthropic)',
    description:
      "Invio dei dati necessari (mai più del necessario) a un fornitore di AI esterno (Anthropic) per le funzioni intelligenti dell'app: AI Coach, Assistente, analisi. Il fornitore non usa i tuoi dati per addestrare i propri modelli.",
  },
  secondaryUse: {
    title: 'Miglioramento del servizio (facoltativo)',
    description:
      'Uso dei tuoi dati in forma pseudonimizzata e aggregata per statistiche di confronto tra palestre e per migliorare gli algoritmi (es. punteggio di prontezza). Nessun dato identificabile. Puoi rifiutare o revocare quando vuoi: il servizio resta identico.',
    optionalNote: 'Facoltativo — non cambia nulla di ciò che vedi nell\'app.',
  },
};

const EMPTY_CHOICES: ConsentChoices = {
  wellness: false,
  posturalAI: false,
  bodyComp: false,
  externalAI: false,
  secondaryUse: false,
};

// Cache in-memory per i check sincroni ripetuti (es. ogni chiamata AI)
let _cache: { uid: string; record: ConsentRecord | null } | null = null;

export const clearConsentCache = (): void => {
  _cache = null;
};

export const getConsents = async (uid: string): Promise<ConsentRecord | null> => {
  if (_cache && _cache.uid === uid) return _cache.record;
  try {
    const snap = await getDoc(doc(db, 'consents', uid));
    if (!snap.exists()) {
      _cache = { uid, record: null };
      return null;
    }
    const data = snap.data();
    const record: ConsentRecord = {
      version: data.version || 0,
      choices: { ...EMPTY_CHOICES, ...(data.choices || {}) },
      decidedAt: data.decidedAt?.toDate?.() || new Date(0),
    };
    _cache = { uid, record };
    return record;
  } catch {
    return null; // errore di rete: non bloccare, si riprova al prossimo check
  }
};

export const saveConsents = async (
  uid: string,
  choices: ConsentChoices
): Promise<void> => {
  await setDoc(doc(db, 'consents', uid), {
    version: CONSENT_TEXT_VERSION,
    choices,
    decidedAt: Timestamp.now(),
    // storicizza ogni decisione (prova del consenso, art. 7.1)
    history: {
      [`v${CONSENT_TEXT_VERSION}_${Date.now()}`]: { choices, at: Timestamp.now() },
    },
  }, { merge: true });
  _cache = { uid, record: { version: CONSENT_TEXT_VERSION, choices, decidedAt: new Date() } };
};

/** True se l'utente deve (ri)prendere una decisione sui consensi. */
export const needsConsentDecision = async (uid: string): Promise<boolean> => {
  const record = await getConsents(uid);
  return !record || record.version < CONSENT_TEXT_VERSION;
};

/** Consenso dell'utente corrente (per le funzioni che trattano i SUOI dati). */
export const hasOwnConsent = async (key: ConsentKey): Promise<boolean> => {
  const uid = auth.currentUser?.uid;
  if (!uid) return false;
  const record = await getConsents(uid);
  return record?.choices?.[key] === true;
};

/** Consenso di un allievo (per operazioni dello staff sui suoi dati). */
export const hasStudentConsent = async (
  studentId: string,
  key: ConsentKey
): Promise<boolean> => {
  try {
    const snap = await getDoc(doc(db, 'consents', studentId));
    return snap.exists() && snap.data()?.choices?.[key] === true;
  } catch {
    return false;
  }
};

/** Lancia un errore leggibile se manca il consenso (choke point AI). */
export const ensureOwnConsent = async (key: ConsentKey): Promise<void> => {
  const ok = await hasOwnConsent(key);
  if (!ok) {
    throw new Error(
      `Per usare questa funzione serve il tuo consenso "${CONSENT_LABELS[key].title}". ` +
      'Puoi darlo (o revocarlo) in Profilo → Consensi privacy.'
    );
  }
};
