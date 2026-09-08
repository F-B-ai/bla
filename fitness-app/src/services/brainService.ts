// ============================================================
// BRAIN SERVICE — la coda del mattino (Tappa 2, lato client)
// ------------------------------------------------------------
// Legge gli stati derivati scritti dal motore notturno
// (twins/{person_id}) e gestisce l'esito di ogni riga:
// "Gestito ✓" emette coach.attention_handled — la LABEL umana
// che nel tempo addestra il Brain (doc 00 §5: il dataset che
// nessun concorrente sta raccogliendo).
// ============================================================

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { emitTwinEvent, TENANT_ID } from './twinEventService';
import { AttentionItem, ChurnFactor } from '../domain/brain';

export interface BrainProposal {
  action: 'messaggio' | 'chiamata' | 'programma' | 'reception';
  why: string;
  draft: string | null;
  model?: string;
}

export interface BrainRow {
  personId: string;
  uid: string;
  name: string;
  severity: 'rosso' | 'giallo' | 'verde';
  attention: AttentionItem[];
  churnScore: number;
  churnFactors: ChurnFactor[];
  proposal: BrainProposal | null;
}

export interface BrainStatus {
  lastRun: Date | null;
  students: number;
  aat7d: number;
}

export const getBrainStatus = async (): Promise<BrainStatus | null> => {
  try {
    const snap = await getDoc(doc(db, 'config', 'brainStatus'));
    if (!snap.exists()) return null;
    const d = snap.data();
    return {
      lastRun: d.last_run?.toDate?.() || null,
      students: d.students || 0,
      aat7d: d.aat_7d || 0,
    };
  } catch {
    return null;
  }
};

const severityRank = { rosso: 0, giallo: 1, verde: 2 } as const;

/** La coda del mattino: righe con segnalazioni, già epurate di quelle
 *  gestite dopo l'ultimo calcolo. */
export const getBrainQueue = async (): Promise<BrainRow[]> => {
  const twinsSnap = await getDocs(collection(db, 'twins'));
  const rows: BrainRow[] = [];
  let oldestComputed: Date | null = null;

  for (const d of twinsSnap.docs) {
    const t = d.data();
    const attention = (t.attention || []) as AttentionItem[];
    if (attention.length === 0) continue;
    const computed = t.computed_at?.toDate?.() || null;
    if (computed && (!oldestComputed || computed < oldestComputed)) oldestComputed = computed;
    rows.push({
      personId: t.person_id,
      uid: t.uid,
      name: t.name || '(senza nome)',
      severity: attention[0].severity,
      attention,
      churnScore: t.churn?.score ?? 0,
      churnFactors: (t.churn?.factors || []) as ChurnFactor[],
      proposal: (t.proposal as BrainProposal) || null,
    });
  }

  // Righe già gestite dopo il calcolo → fuori dalla coda
  if (rows.length > 0 && oldestComputed) {
    try {
      const handledSnap = await getDocs(
        query(
          collection(db, 'human_events'),
          where('tenant_id', '==', TENANT_ID),
          where('type', '==', 'coach.attention_handled'),
          where('ts', '>=', Timestamp.fromDate(oldestComputed))
        )
      );
      const handled = new Set(handledSnap.docs.map((x) => x.data().person_id as string));
      return rows
        .filter((r) => !handled.has(r.personId))
        .sort((a, b) => severityRank[a.severity] - severityRank[b.severity] || b.churnScore - a.churnScore);
    } catch {
      /* indice in costruzione o rete: coda non filtrata ma viva */
    }
  }
  return rows.sort(
    (a, b) => severityRank[a.severity] - severityRank[b.severity] || b.churnScore - a.churnScore
  );
};

/** Esito della riga: il coach l'ha gestita (o scelto di ignorarla).
 *  outcome è la label: 'inviato' | 'chiamato' | 'modificato' | 'ignorato'. */
export const markAttentionHandled = async (
  row: BrainRow,
  outcome: 'inviato' | 'chiamato' | 'modificato' | 'ignorato'
): Promise<void> => {
  await emitTwinEvent(
    'coach.attention_handled',
    {
      attention_types: row.attention.map((a) => a.type),
      severity: row.severity,
      proposal_action: row.proposal?.action || null,
      outcome,
    },
    { subjectUid: row.uid, source: 'coach', confidence: 1.0 }
  );
};
