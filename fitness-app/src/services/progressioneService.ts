// ============================================================
// PROGRESSIONE — servizio
// ------------------------------------------------------------
// Qui si prendono i dati veri (log delle sedute, analisi dello
// squat, prontezza del gemello) e si consegnano al motore, che
// decide l'asse. Nessun ragionamento qui dentro: si ragiona in
// src/domain/progressione.ts, e lì si testa.
// ============================================================

import {
  collection, doc, getDoc, getDocs, query, where, orderBy, limit, Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { getStudentWorkoutLogs } from './workoutLogService';
import { getPersonId } from './twinEventService';
import { WorkoutLog } from '../types';
import {
  Sessione, QualitaOsservata, IngressoProgressione, PassoProposto,
  Confronto, CapacitaLetta,
  prossimoPasso, confronta, leggiCapacita, leggiAdattamento, Adattamento,
  Obiettivo, AsseId,
} from '../domain/progressione';

// ------------------------------------------------------------
// Dai log dell'app al linguaggio del motore
// ------------------------------------------------------------

/** Solo le serie davvero completate: le altre non sono mai successe. */
export const sessioniDaLog = (logs: WorkoutLog[]): Sessione[] =>
  (logs || [])
    .filter((l) => l.status === 'completed')
    .map((l) => {
      const data = (l.date as any)?.toDate?.() || (l.date instanceof Date ? l.date : new Date());
      return {
        data,
        durataMin: l.durationMinutes,
        esercizi: (l.exerciseLogs || []).map((e) => ({
          nome: e.exerciseName,
          tecnica: e.technique,
          serie: (e.sets || [])
            .filter((s) => s.completed)
            .map((s) => ({
              reps: s.reps,
              kg: s.weight,
              rpe: s.rpe,
              secondi: s.holdSeconds,
            })),
        })),
      };
    })
    .sort((a, b) => a.data.getTime() - b.data.getTime());

/** Gli esercizi che compaiono davvero nello storico, dal più frequente. */
export const eserciziDelloStorico = (sessioni: Sessione[]): string[] => {
  const conta = new Map<string, number>();
  for (const s of sessioni) {
    for (const e of s.esercizi) {
      if (!e.serie.some((x) => x.reps > 0 || (x.secondi || 0) > 0)) continue;
      conta.set(e.nome, (conta.get(e.nome) || 0) + 1);
    }
  }
  return Array.from(conta.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([nome]) => nome);
};

const qualitaDaSquat = (p: Record<string, any> | undefined): QualitaOsservata | undefined => {
  if (!p) return undefined;
  const n = (v: any) => (typeof v === 'number' && isFinite(v) ? v : undefined);
  const q: QualitaOsservata = {
    valgo: n(p.knee_valgus_bottom_pct),
    shiftAnca: n(p.hip_shift_pct),
    tronco: n(p.trunk_lean_bottom_deg),
    profonditaGrad: n(p.bottom_knee_angle_deg),
  };
  return Object.values(q).some((v) => v !== undefined) ? q : undefined;
};

// ------------------------------------------------------------
// La lettura completa di un allievo
// ------------------------------------------------------------

export interface LetturaProgressione {
  sessioni: Sessione[];
  esercizi: string[];
  esercizio?: string;
  passo: PassoProposto;
  confronti: Confronto[];
  capacita: CapacitaLetta[];
  adattamento: Adattamento;
  prontezza?: number;
  qualita?: { ultima?: QualitaOsservata; precedente?: QualitaOsservata };
}

/**
 * Legge tutto ciò che serve al motore. Le parti che mancano
 * (nessuna analisi dello squat, gemello non ancora calcolato)
 * restano semplicemente assenti: il motore sa tacere.
 */
export const leggiProgressione = async (
  studentId: string,
  opzioni?: { esercizio?: string; obiettivo?: Obiettivo; ultimiAssi?: AsseId[] }
): Promise<LetturaProgressione> => {
  const logs = await getStudentWorkoutLogs(studentId);
  const sessioni = sessioniDaLog(logs);
  const esercizi = eserciziDelloStorico(sessioni);

  let qualita: LetturaProgressione['qualita'];
  let prontezza: number | undefined;

  // Contesto oggettivo dal gemello: se non c'è, si prosegue lo stesso.
  try {
    const personId = await getPersonId(studentId);
    const cutoff = new Date(Date.now() - 365 * 86400000);
    const snap = await getDocs(query(
      collection(db, 'human_events'),
      where('person_id', '==', personId),
      where('ts', '>=', Timestamp.fromDate(cutoff)),
      orderBy('ts', 'desc'),
      limit(200)
    ));
    const squat = snap.docs
      .map((d) => d.data())
      .filter((e: any) => e.type === 'movement.squat_assessed')
      .map((e: any) => e.payload as Record<string, any>);
    const ultima = qualitaDaSquat(squat[0]);
    const precedente = qualitaDaSquat(squat[1]);
    if (ultima || precedente) qualita = { ultima, precedente };

    const twin = await getDoc(doc(db, 'twins', personId));
    if (twin.exists()) {
      const r = (twin.data() as any)?.readiness || {};
      const v = r.latest_penalized ?? r.latest_v2;
      if (typeof v === 'number' && isFinite(v)) prontezza = v;
    }
  } catch {
    /* nessun contesto: il motore lavora sui soli log, e lo dichiara */
  }

  const ingresso: IngressoProgressione = {
    storia: sessioni,
    esercizio: opzioni?.esercizio,
    obiettivo: opzioni?.obiettivo,
    ultimiAssi: opzioni?.ultimiAssi,
    prontezza,
    qualita,
  };

  return {
    sessioni,
    esercizi,
    esercizio: opzioni?.esercizio,
    passo: prossimoPasso(ingresso),
    confronti: confronta(sessioni, opzioni?.esercizio),
    capacita: leggiCapacita(sessioni, { qualita, prontezza }),
    adattamento: leggiAdattamento(sessioni, opzioni?.esercizio),
    prontezza,
    qualita,
  };
};
