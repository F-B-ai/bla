// ============================================================
// RITRATTO ESSĒRE — sintesi (Tappa B)
// ------------------------------------------------------------
// "Comprendi chi sei attraverso il movimento", mantenuto:
// le firme comportamentali (dominio, con le prove) vengono
// composte dall'AI in un ritratto in linguaggio umano.
// L'AI può usare SOLO le firme fornite: se non c'è la prova,
// il tratto non esiste. Cold start onesto, mai romanzato.
// ============================================================

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { getPersonId } from './twinEventService';
import { callClaude } from './aiService';
import {
  computeSignatures,
  PortraitEvent,
  PortraitSignatures,
  PORTRAIT_SIGNATURES_VERSION,
} from '../domain/portrait';

const PORTRAITS_COLLECTION = 'portraits';
const WINDOW_DAYS = 90;

export interface PortraitTrait {
  emoji: string;
  nome: string;
  evidenza: string;
}

export interface Portrait {
  personId: string;
  uid: string;
  name: string;
  essenza: string; // il paragrafo "chi è quando si allena"
  tratti: PortraitTrait[];
  come_allenarlo: string;
  da_ascoltare: string;
  maturity: PortraitSignatures['maturity'];
  signaturesVersion: number;
  generatedAt: Date;
}

// ------------------------------------------------------------
// 1. Eventi della persona (finestra 90gg)
// ------------------------------------------------------------

const getPersonEvents = async (subjectUid: string): Promise<PortraitEvent[]> => {
  const personId = await getPersonId(subjectUid);
  const cutoff = new Date(Date.now() - WINDOW_DAYS * 86400000);
  const snap = await getDocs(
    query(
      collection(db, 'human_events'),
      where('person_id', '==', personId),
      where('ts', '>=', Timestamp.fromDate(cutoff)),
      orderBy('ts', 'desc'),
      limit(600)
    )
  );
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      type: data.type,
      ts: data.ts?.toDate?.() || new Date(),
      payload: data.payload || {},
    };
  });
};

// ------------------------------------------------------------
// 2. La scrittura del ritratto (l'AI compone, le firme comandano)
// ------------------------------------------------------------

const PORTRAIT_SYSTEM = `Sei la voce di ESSĒRE ("Comprendi chi sei attraverso il movimento"). Ricevi le FIRME COMPORTAMENTALI di un allievo di palestra — tratti già calcolati dai suoi dati reali, ognuno con la sua prova — e componi il suo ritratto in italiano.

Rispondi SOLO con un oggetto JSON:
{"essenza": "3-4 frasi che raccontano CHI È questa persona quando si muove — scritte bene, calde, specifiche; intreccia i tratti, non elencarli",
 "tratti": [{"emoji": "🌅", "nome": "nome breve del tratto", "evidenza": "la prova, riformulata in modo leggibile"}],
 "come_allenarlo": "1-2 frasi pratiche per il coach",
 "da_ascoltare": "1 frase su cosa il coach deve tenere d'occhio o chiedere"}

Regole ferree:
- Usa SOLO le firme fornite. Non inventare tratti, numeri o abitudini non presenti.
- MAI etichette psicologiche o cliniche (no "ansioso", "depresso", "ossessivo"): descrivi comportamenti.
- Se maturity è "appena_iniziato": ritratto breve e onesto — "Sto ancora conoscendo [nome]" — e di' cosa serve per conoscerlo meglio (check-in e allenamenti tracciati). Niente riempitivi.
- Se maturity è "parziale": scrivi solo ciò che le firme sostengono, dichiarando che il quadro si completerà.
- Tono: un bravo coach che parla di una persona che stima. Mai linguaggio da software.`;

const buildUserContent = (name: string, sig: PortraitSignatures): string =>
  JSON.stringify({
    nome: name,
    maturity: sig.maturity,
    finestra_giorni: sig.windowDays,
    eventi_analizzati: sig.eventsCount,
    firme: sig.signatures.map((s) => ({
      tratto: s.label,
      prova: s.evidence,
      solidita: s.confidence,
    })),
  });

export const generatePortrait = async (
  subjectUid: string,
  studentName: string
): Promise<Portrait> => {
  const events = await getPersonEvents(subjectUid);
  const sig = computeSignatures(events, WINDOW_DAYS);

  const raw = await callClaude(
    [{ role: 'user', content: buildUserContent(studentName, sig) }],
    PORTRAIT_SYSTEM,
    900,
    undefined,
    'claude-sonnet-4-5',
    'portrait'
  );
  const cleaned = raw.replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(cleaned) as {
    essenza: string;
    tratti: PortraitTrait[];
    come_allenarlo: string;
    da_ascoltare: string;
  };

  const personId = await getPersonId(subjectUid);
  const portrait: Portrait = {
    personId,
    uid: subjectUid,
    name: studentName,
    essenza: parsed.essenza || '',
    tratti: Array.isArray(parsed.tratti) ? parsed.tratti : [],
    come_allenarlo: parsed.come_allenarlo || '',
    da_ascoltare: parsed.da_ascoltare || '',
    maturity: sig.maturity,
    signaturesVersion: PORTRAIT_SIGNATURES_VERSION,
    generatedAt: new Date(),
  };

  await setDoc(doc(db, PORTRAITS_COLLECTION, personId), {
    ...portrait,
    generatedAt: Timestamp.fromDate(portrait.generatedAt),
    // snapshot delle firme: il ritratto è verificabile a posteriori
    signatures: sig.signatures,
    eventsCount: sig.eventsCount,
  });

  return portrait;
};

export const getPortrait = async (subjectUid: string): Promise<Portrait | null> => {
  const personId = await getPersonId(subjectUid);
  const snap = await getDoc(doc(db, PORTRAITS_COLLECTION, personId));
  if (!snap.exists()) return null;
  const d = snap.data();
  return {
    personId,
    uid: d.uid,
    name: d.name,
    essenza: d.essenza || '',
    tratti: d.tratti || [],
    come_allenarlo: d.come_allenarlo || '',
    da_ascoltare: d.da_ascoltare || '',
    maturity: d.maturity || 'appena_iniziato',
    signaturesVersion: d.signaturesVersion || 1,
    generatedAt: d.generatedAt?.toDate?.() || new Date(),
  };
};
