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
let _delegate: 'GPU' | 'CPU' | null = null;

// Import dinamico NATIVO del browser, invisibile a Metro: la libreria
// MediaPipe contiene costrutti che il bundler non sa trasformare,
// quindi la self-hostiamo in /wasm e la carichiamo a runtime.
// eslint-disable-next-line no-new-func
const nativeImport = new Function('p', 'return import(p)') as (p: string) => Promise<any>;

const withTimeout = <T>(p: Promise<T>, ms: number, msg: string): Promise<T> =>
  Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(msg)), ms)),
  ]);

export type GaitStatus = 'engine' | 'analyzing';

const getLandmarker = async (
  onStatus?: (s: GaitStatus) => void,
  forceCPU: boolean = false
): Promise<any> => {
  if (_landmarker && (!forceCPU || _delegate === 'CPU')) return _landmarker;
  if (Platform.OS !== 'web') {
    throw new Error("L'analisi del cammino è disponibile solo dalla web app (PWA).");
  }
  onStatus?.('engine');
  const vision = await withTimeout(
    nativeImport('/wasm/vision_bundle.mjs'),
    60000,
    'Il motore di analisi non si scarica: controlla la connessione e riprova.'
  );
  const fileset = await vision.FilesetResolver.forVisionTasks('/wasm');
  const options = (delegate: 'GPU' | 'CPU') => ({
    baseOptions: {
      modelAssetPath: '/models/pose_landmarker_lite.task',
      delegate,
    },
    runningMode: 'VIDEO',
    numPoses: 1,
  });
  if (_landmarker) {
    try { _landmarker.close(); } catch { /* già chiuso */ }
    _landmarker = null;
  }
  if (forceCPU) {
    _landmarker = await withTimeout(
      vision.PoseLandmarker.createFromOptions(fileset, options('CPU')),
      60000,
      'Il motore di analisi non parte su questo dispositivo. Riprova o usa un altro telefono.'
    );
    _delegate = 'CPU';
    return _landmarker;
  }
  try {
    // Safari iOS a volte si blocca sul delegate GPU: timeout stretto + ripiego CPU
    _landmarker = await withTimeout(
      vision.PoseLandmarker.createFromOptions(fileset, options('GPU')),
      45000,
      'GPU_TIMEOUT'
    );
    _delegate = 'GPU';
  } catch {
    _landmarker = await withTimeout(
      vision.PoseLandmarker.createFromOptions(fileset, options('CPU')),
      60000,
      'Il motore di analisi non parte su questo dispositivo. Riprova o usa un altro telefono.'
    );
    _delegate = 'CPU';
  }
  return _landmarker;
};

/**
 * Estrae i landmark scheletrici da un file video, interamente
 * on-device. onProgress: 0..1 per la barra di avanzamento.
 */
export const extractLandmarksFromVideo = async (
  file: Blob,
  onProgress?: (p: number) => void,
  onStatus?: (s: GaitStatus) => void
): Promise<LandmarkFrame[]> => {
  const landmarker = await getLandmarker(onStatus);
  onStatus?.('analyzing');
  const doc = (globalThis as any).document;
  const url = (globalThis as any).URL.createObjectURL(file);
  const video = doc.createElement('video');
  video.src = url;
  video.muted = true;
  video.playsInline = true;
  video.setAttribute('playsinline', ''); // iOS: obbligatorio anche come attributo
  video.preload = 'auto';

  try {
    await withTimeout(
      new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve();
        video.onerror = () => reject(new Error('Video non leggibile. Usa un formato standard (mp4/mov).'));
        video.load();
      }),
      20000,
      'Il video non si apre: riprova o scegli un altro file.'
    );

    const duration = Math.min(video.duration || 0, MAX_ANALYSIS_SECONDS);
    if (!duration || duration < 3) {
      throw new Error('Video troppo corto: riprendi almeno 6-8 passi (5-10 secondi).');
    }

    // iOS: sblocca la pipeline di decodifica (senza play il seek può
    // non consegnare mai i fotogrammi). Muto + playsinline = permesso.
    try {
      await withTimeout(video.play(), 5000, 'play');
      video.pause();
    } catch {
      /* alcuni browser non lo richiedono: si prosegue */
    }

    // Fotogrammi letti da una TELA RIDOTTA (max 720px): su iOS il
    // rilevatore sull'elemento video diretto a volte produce zero
    // risultati, e il 4K è 4-8 volte più lento del necessario.
    const doc2 = (globalThis as any).document;
    const canvas = doc2.createElement('canvas');
    const scale = Math.min(1, 720 / (video.videoHeight || 720));
    canvas.width = Math.round((video.videoWidth || 720) * scale);
    canvas.height = Math.round((video.videoHeight || 720) * scale);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const samplePass = (detector: any): Promise<LandmarkFrame[]> => (async () => {
      const step = 1 / TARGET_SAMPLE_FPS;
      const out: LandmarkFrame[] = [];
      let sampleN = 0;
      for (let t = 0.05; t < duration; t += step) {
        // Su iOS 'seeked' a volte non scatta: timeout generoso sui primi
        // fotogrammi (il decoder si scalda), poi più stretto.
        const seekTimeout = sampleN < 5 ? 2000 : 1000;
        await new Promise<void>((resolve) => {
          const timer = setTimeout(() => resolve(), seekTimeout);
          video.onseeked = () => { clearTimeout(timer); resolve(); };
          try {
            video.currentTime = t;
          } catch {
            clearTimeout(timer);
            resolve();
          }
        });
        try {
          if (video.readyState >= 2 && ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const res = detector.detectForVideo(canvas, Math.round(t * 1000));
            const lm = res?.landmarks?.[0];
            if (lm && lm.length >= 33) {
              out.push({
                t: t * 1000,
                landmarks: lm.map((p: any) => ({ x: p.x, y: p.y, visibility: p.visibility })),
              });
            }
          }
        } catch {
          /* singolo fotogramma illeggibile: si continua */
        }
        sampleN++;
        onProgress?.(Math.min(1, t / duration));
      }
      return out;
    })();

    let frames = await samplePass(landmarker);

    // GPU che produce zero su tutto il video (noto su alcuni Safari):
    // un solo retry completo con il motore in CPU, poi verdetto onesto.
    if (frames.length === 0 && _delegate === 'GPU') {
      const cpuDetector = await getLandmarker(onStatus, true);
      onStatus?.('analyzing');
      frames = await samplePass(cpuDetector);
    }
    onProgress?.(1);

    if (frames.length === 0) {
      throw new Error(
        'Non sono riuscito a leggere la persona nel video. Controlla: corpo intero inquadrato, buona luce, formato video standard.'
      );
    }
    return frames;
  } finally {
    (globalThis as any).URL.revokeObjectURL(url);
  }
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
