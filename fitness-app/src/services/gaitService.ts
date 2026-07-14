// ============================================================
// GAIT SERVICE — analisi del cammino (AI Biomechanics v1)
// ------------------------------------------------------------
// Pipeline: video → pose estimation ON-DEVICE (MediaPipe WASM,
// self-hostato: il video NON lascia mai il dispositivo) →
// metriche deterministiche (src/domain/gait) → interpretazione
// AI via gateway → salvataggio legacy + evento twin.
//
// Solo web (PWA): la libreria e il modello (~17MB) si caricano
// in lazy SOLO quando il coach apre l'analisi — il bundle
// iniziale dell'app non cresce di un byte.
// ============================================================

import { Platform } from 'react-native';
import { collection, addDoc, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { LandmarkFrame, GaitMetrics, computeGaitMetrics, GaitView } from '../domain/gait';
import { emitTwinEvent } from './twinEventService';
import { callClaude } from './aiService';

const COLLECTION = 'gaitAssessments';

// Analizza al massimo questi secondi di video (bastano 6-8 passi)
const MAX_ANALYSIS_SECONDS = 20;
// Campiona a ~15 fps di analisi: sufficiente per la cadenza, metà del costo
const TARGET_SAMPLE_FPS = 15;

export interface GaitAssessment {
  id: string;
  studentId: string;
  assessorId: string;
  date: Date;
  view: GaitView;
  metrics: GaitMetrics;
  aiNarrative: string;
}

// ------------------------------------------------------------
// 1. Pose estimation on-device (lazy: si carica solo qui)
// ------------------------------------------------------------

let _landmarker: any | null = null;

const getLandmarker = async (): Promise<any> => {
  if (_landmarker) return _landmarker;
  if (Platform.OS !== 'web') {
    throw new Error("L'analisi del cammino è disponibile solo dalla web app (PWA).");
  }
  const vision = await import('@mediapipe/tasks-vision');
  const fileset = await vision.FilesetResolver.forVisionTasks('/wasm');
  _landmarker = await vision.PoseLandmarker.createFromOptions(fileset, {
    baseOptions: {
      modelAssetPath: '/models/pose_landmarker_lite.task',
      delegate: 'GPU', // fallback CPU automatico se WebGL non c'è
    },
    runningMode: 'VIDEO',
    numPoses: 1,
  });
  return _landmarker;
};

/**
 * Estrae i landmark scheletrici da un file video, interamente
 * on-device. onProgress: 0..1 per la barra di avanzamento.
 */
export const extractLandmarksFromVideo = async (
  file: Blob,
  onProgress?: (p: number) => void
): Promise<LandmarkFrame[]> => {
  const landmarker = await getLandmarker();
  const doc = (globalThis as any).document;
  const url = (globalThis as any).URL.createObjectURL(file);
  const video = doc.createElement('video');
  video.src = url;
  video.muted = true;
  video.playsInline = true;

  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error('Video non leggibile. Usa un formato standard (mp4/mov).'));
  });

  const duration = Math.min(video.duration || 0, MAX_ANALYSIS_SECONDS);
  if (!duration || duration < 3) {
    (globalThis as any).URL.revokeObjectURL(url);
    throw new Error('Video troppo corto: riprendi almeno 6-8 passi (5-10 secondi).');
  }

  // Campionamento per seek: deterministico e affidabile anche quando
  // il tab va in background (a differenza del playback in tempo reale).
  const step = 1 / TARGET_SAMPLE_FPS;
  const frames: LandmarkFrame[] = [];
  for (let t = 0; t < duration; t += step) {
    await new Promise<void>((resolve) => {
      video.onseeked = () => resolve();
      video.currentTime = t;
    });
    const res = landmarker.detectForVideo(video, Math.round(t * 1000));
    const lm = res?.landmarks?.[0];
    if (lm && lm.length >= 33) {
      frames.push({
        t: t * 1000,
        landmarks: lm.map((p: any) => ({ x: p.x, y: p.y, visibility: p.visibility })),
      });
    }
    onProgress?.(Math.min(1, t / duration));
  }
  (globalThis as any).URL.revokeObjectURL(url);
  onProgress?.(1);
  return frames;
};

// ------------------------------------------------------------
// 2. Interpretazione AI (l'AI spiega, non calcola)
// ------------------------------------------------------------

const NARRATIVE_SYSTEM = `Sei l'assistente biomeccanico di una palestra. Ricevi METRICHE GIÀ CALCOLATE (deterministiche) dall'analisi del cammino di un allievo e le spieghi al coach in italiano.

Regole ferree:
- NON sei un medico: questo è uno screening wellness. MAI diagnosi, MAI nomi di patologie, MAI "rischio di infortunio X%". Se qualcosa merita approfondimento clinico, scrivi "da approfondire con un professionista sanitario".
- Commenta SOLO i numeri che ricevi: non inventare metriche non presenti.
- Valori di riferimento indicativi per il cammino: cadenza 100-120 passi/min; simmetria passo ≥ 90%; inclinazione tronco < 8°; simmetria braccia ≥ 80%; caduta pelvica < 5°; valgismo proxy < 15%.
- Struttura: 1) In sintesi (2 frasi), 2) Cosa guardare (elenco puntato, max 3 punti, dal più rilevante), 3) Spunti pratici per il coach (esercizi/attenzioni generiche da sala, max 3).
- Tono: pratico, da collega esperto. Massimo 150 parole.`;

export const interpretGaitMetrics = async (
  metrics: GaitMetrics,
  studentName: string
): Promise<string> => {
  const user = JSON.stringify(metrics, null, 1);
  return callClaude(
    [{ role: 'user', content: `Allievo: ${studentName}. Metriche del cammino (vista ${metrics.view}):\n${user}` }],
    NARRATIVE_SYSTEM,
    700,
    undefined,
    'claude-sonnet-4-5',
    'gait'
  );
};

// ------------------------------------------------------------
// 3. Persistenza: doc legacy + evento twin
// ------------------------------------------------------------

export const saveGaitAssessment = async (input: {
  studentId: string;
  assessorId: string;
  view: GaitView;
  metrics: GaitMetrics;
  aiNarrative: string;
}): Promise<string> => {
  const ref = await addDoc(collection(db, COLLECTION), {
    ...input,
    date: Timestamp.now(),
  });

  // Dual-write twin: SOLO le metriche sintetiche (payload = riassunto)
  const m = input.metrics;
  emitTwinEvent(
    'movement.gait_assessed',
    {
      view: m.view,
      metrics_version: m.version,
      cadence_spm: m.cadence_spm ?? null,
      step_symmetry_pct: m.step_symmetry_pct ?? null,
      trunk_lean_deg: m.trunk_lean_deg ?? null,
      arm_swing_symmetry_pct: m.arm_swing_symmetry_pct ?? null,
      pelvic_drop_deg: m.pelvic_drop_deg ?? null,
      knee_valgus_pct: m.knee_valgus_pct ?? null,
    },
    {
      subjectUid: input.studentId,
      source: 'ai',
      // pose 2D monoculare: proxy per screening (02 §3.1, riga AI-foto)
      confidence: 0.65,
      sourceRef: { collection: COLLECTION, doc_id: ref.id },
    }
  );

  return ref.id;
};

export const getStudentGaitAssessments = async (studentId: string): Promise<GaitAssessment[]> => {
  const snap = await getDocs(
    query(collection(db, COLLECTION), where('studentId', '==', studentId), orderBy('date', 'desc'))
  );
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      studentId: data.studentId,
      assessorId: data.assessorId,
      date: data.date?.toDate?.() || new Date(),
      view: data.view,
      metrics: data.metrics,
      aiNarrative: data.aiNarrative || '',
    };
  });
};

export { computeGaitMetrics };
export type { GaitMetrics, GaitView, LandmarkFrame };
