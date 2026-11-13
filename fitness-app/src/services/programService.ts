import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  getDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { TrainingProgram, WorkoutPlan, Exercise, ExerciseCategory } from '../types';
import { allDefaultExercises, DefaultExercise } from '../data/defaultExercises';
import { GruppoMuscolare } from '../domain/muscoli';
import { fondiConCanone } from '../domain/filmEsercizio';
import { annota } from './registroService';
import { AzioneRegistro } from '../domain/registro';

const PROGRAMS_COLLECTION = 'trainingPrograms';
const PLANS_COLLECTION = 'workoutPlans';
const EXERCISES_COLLECTION = 'exerciseLibrary';

// ============================================================
// LE SCHEDE FINISCONO NEL REGISTRO — punto 1.2 del 23 settembre
// ------------------------------------------------------------
// 2 novembre 2026. «Devi dirmi tutto quello che avviene nell'app.»
// Ho contato: quaranta servizi scrivono, tre annotavano. Questo —
// dodici scritture, le schede e le programmazioni — non annotava
// niente.
//
// È l'unica delle tre mansioni del foglio firmato che il Registro
// ancora non vedeva. Gli appuntamenti sì, la chat non esiste, le
// schede no.
//
// Come per le sedute: il nome dell'allievo si risolve qui dentro e
// in modo asincrono, perché la riga deve restare leggibile anche
// quando quella scheda non ci sarà più.
// ============================================================
const annotaScheda = (
  azione: AzioneRegistro,
  schedaId: string,
  studentId: string,
  dettaglio?: string
): void => {
  void (async () => {
    let nome = '';
    try {
      if (studentId) {
        const snap = await getDoc(doc(db, 'users', studentId));
        if (snap.exists()) {
          const d = snap.data() as { name?: string; surname?: string };
          nome = `${d.name || ''} ${d.surname || ''}`.trim();
        }
      }
    } catch {
      // senza nome la riga vale meno, ma esiste
    }
    annota({ azione, oggetto: 'scheda', oggettoId: schedaId, oggettoNome: nome, dettaglio });
  })();
};

/** Legge lo studentId di una scheda prima che sparisca. */
const allievoDellaScheda = async (
  collezione: string,
  id: string
): Promise<string> => {
  const snap = await getDoc(doc(db, collezione, id)).catch(() => null);
  if (!snap?.exists()) return '';
  return String((snap.data() as { studentId?: string }).studentId || '');
};

// --- Programmi sessione singola ---

export const createProgram = async (
  program: Omit<TrainingProgram, 'id'>
): Promise<string> => {
  const docRef = await addDoc(collection(db, PROGRAMS_COLLECTION), {
    ...program,
    createdAt: Timestamp.now(),
  });
  annotaScheda('creato', docRef.id,
    String((program as { studentId?: string }).studentId || ''), 'programma di seduta');
  return docRef.id;
};

export const getStudentPrograms = async (
  studentId: string
): Promise<TrainingProgram[]> => {
  const q = query(
    collection(db, PROGRAMS_COLLECTION),
    where('studentId', '==', studentId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as TrainingProgram));
};

export const updateProgram = async (
  programId: string,
  data: Partial<TrainingProgram>
): Promise<void> => {
  await updateDoc(doc(db, PROGRAMS_COLLECTION, programId), data);
};

// --- Piani di allenamento (programmazioni settimanali/mensili) ---

export const createWorkoutPlan = async (
  plan: Omit<WorkoutPlan, 'id'>
): Promise<string> => {
  // Disattiva tutti i piani attivi precedenti per lo stesso studente
  if (plan.isActive && plan.studentId) {
    try {
      const activeQuery = query(
        collection(db, PLANS_COLLECTION),
        where('studentId', '==', plan.studentId),
        where('isActive', '==', true)
      );
      const activeSnapshot = await getDocs(activeQuery);
      for (const activeDoc of activeSnapshot.docs) {
        await updateDoc(doc(db, PLANS_COLLECTION, activeDoc.id), { isActive: false });
      }
    } catch {
      // Fallback: filtra lato client
      const fallbackQuery = query(
        collection(db, PLANS_COLLECTION),
        where('studentId', '==', plan.studentId)
      );
      const fallbackSnapshot = await getDocs(fallbackQuery);
      for (const d of fallbackSnapshot.docs) {
        if (d.data().isActive === true) {
          await updateDoc(doc(db, PLANS_COLLECTION, d.id), { isActive: false });
        }
      }
    }
  }

  // Assicura che startDate e endDate siano Date valide prima di convertire
  const startDate = plan.startDate instanceof Date ? plan.startDate : new Date(plan.startDate as any);
  const endDate = plan.endDate instanceof Date ? plan.endDate : new Date(plan.endDate as any);

  const docRef = await addDoc(collection(db, PLANS_COLLECTION), {
    ...plan,
    startDate: Timestamp.fromDate(startDate),
    endDate: Timestamp.fromDate(endDate),
    createdAt: Timestamp.now(),
  });
  annotaScheda('creato', docRef.id, plan.studentId || '', 'piano di allenamento');
  return docRef.id;
};

export const getStudentWorkoutPlans = async (
  studentId: string
): Promise<WorkoutPlan[]> => {
  try {
    const q = query(
      collection(db, PLANS_COLLECTION),
      where('studentId', '==', studentId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as WorkoutPlan));
  } catch (error) {
    console.warn('Query con orderBy fallita, uso fallback:', error);
    // Fallback senza orderBy (ordina lato client)
    const q = query(
      collection(db, PLANS_COLLECTION),
      where('studentId', '==', studentId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs
      .map((d) => ({ ...d.data(), id: d.id } as WorkoutPlan))
      .sort((a, b) => {
        const ta = (a.createdAt as any)?.seconds || 0;
        const tb = (b.createdAt as any)?.seconds || 0;
        return tb - ta;
      });
  }
};

export const getActiveWorkoutPlan = async (
  studentId: string
): Promise<WorkoutPlan | null> => {
  try {
    // Query composita (richiede indice Firestore su studentId + isActive)
    const q = query(
      collection(db, PLANS_COLLECTION),
      where('studentId', '==', studentId),
      where('isActive', '==', true)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    const d = snapshot.docs[0];
    return { ...d.data(), id: d.id } as WorkoutPlan;
  } catch (error) {
    console.warn('Query composita fallita, uso fallback:', error);
    // Fallback: filtra lato client se l'indice composito non esiste
    const q = query(
      collection(db, PLANS_COLLECTION),
      where('studentId', '==', studentId)
    );
    const snapshot = await getDocs(q);
    const activePlan = snapshot.docs.find((d) => d.data().isActive === true);
    if (!activePlan) return null;
    return { ...activePlan.data(), id: activePlan.id } as WorkoutPlan;
  }
};

// --- Libreria esercizi ---

export const getExerciseLibrary = async (): Promise<Exercise[]> => {
  const snapshot = await getDocs(collection(db, EXERCISES_COLLECTION));
  return snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as Exercise));
};

export const addExerciseToLibrary = async (
  exercise: Omit<Exercise, 'id'>
): Promise<string> => {
  const docRef = await addDoc(collection(db, EXERCISES_COLLECTION), exercise);
  return docRef.id;
};

export const getExercise = async (exerciseId: string): Promise<Exercise | null> => {
  const docSnap = await getDoc(doc(db, EXERCISES_COLLECTION, exerciseId));
  if (!docSnap.exists()) return null;
  return { ...docSnap.data(), id: docSnap.id } as Exercise;
};

export const deleteWorkoutPlan = async (planId: string): Promise<void> => {
  // Si legge PRIMA: dopo la cancellazione l'allievo non è più
  // ricavabile, e la riga direbbe «ha eliminato scheda» e basta.
  const sid = await allievoDellaScheda(PLANS_COLLECTION, planId);
  await deleteDoc(doc(db, PLANS_COLLECTION, planId));
  annotaScheda('eliminato', planId, sid, 'piano di allenamento');
};

export const updateWorkoutPlan = async (
  planId: string,
  data: Partial<Omit<WorkoutPlan, 'id'>>
): Promise<void> => {
  const update: Record<string, unknown> = { ...data };
  if (data.startDate) {
    const sd = data.startDate instanceof Date ? data.startDate : new Date(data.startDate as any);
    update.startDate = Timestamp.fromDate(sd);
  }
  if (data.endDate) {
    const ed = data.endDate instanceof Date ? data.endDate : new Date(data.endDate as any);
    update.endDate = Timestamp.fromDate(ed);
  }
  const sid = await allievoDellaScheda(PLANS_COLLECTION, planId);
  await updateDoc(doc(db, PLANS_COLLECTION, planId), update);
  annotaScheda('modificato', planId, sid, 'piano di allenamento');
};

export const deleteProgram = async (programId: string): Promise<void> => {
  const sid = await allievoDellaScheda(PROGRAMS_COLLECTION, programId);
  await deleteDoc(doc(db, PROGRAMS_COLLECTION, programId));
  annotaScheda('eliminato', programId, sid, 'programma di seduta');
};

// --- Template personalizzati ---

const CUSTOM_TEMPLATES_COLLECTION = 'customWorkoutTemplates';

export interface CustomWorkoutTemplate {
  id: string;
  name: string;
  description: string;
  gender: 'male' | 'female';
  category: string;
  weeklySchedule: {
    dayOfWeek: number;
    dayName: string;
    exercises: Omit<Exercise, 'id'>[];
    notes: string;
  }[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export const getCustomTemplates = async (): Promise<CustomWorkoutTemplate[]> => {
  const q = query(
    collection(db, CUSTOM_TEMPLATES_COLLECTION),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as CustomWorkoutTemplate));
};

export const createCustomTemplate = async (
  template: Omit<CustomWorkoutTemplate, 'id'>
): Promise<string> => {
  const docRef = await addDoc(collection(db, CUSTOM_TEMPLATES_COLLECTION), {
    ...template,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return docRef.id;
};

export const updateCustomTemplate = async (
  templateId: string,
  data: Partial<Omit<CustomWorkoutTemplate, 'id'>>
): Promise<void> => {
  await updateDoc(doc(db, CUSTOM_TEMPLATES_COLLECTION, templateId), {
    ...data,
    updatedAt: Timestamp.now(),
  });
};

export const deleteCustomTemplate = async (templateId: string): Promise<void> => {
  await deleteDoc(doc(db, CUSTOM_TEMPLATES_COLLECTION, templateId));
};

// --- Libreria esercizi con defaults ---

export interface LibraryExercise {
  id: string;
  name: string;
  description: string;
  sets: number;
  reps: string;
  restSeconds: number;
  category: ExerciseCategory;
  notes: string;
  videoUrl?: string;
  videoLabel?: string;
  /** secondo filmato (es. versione uomo), quando esiste */
  videoUrlAlt?: string;
  videoAltLabel?: string;
  imageUrl?: string;
  gender: 'male' | 'female' | 'unisex';
  /** il gruppo muscolare: la categoria con cui si cerca davvero */
  muscolo: GruppoMuscolare;
  fromFirestore: boolean;
}

export const getFullExerciseLibrary = async (): Promise<LibraryExercise[]> => {
  const firestoreExercises = await getExerciseLibrary();

  const firestoreMap = new Map<string, Exercise>();
  for (const ex of firestoreExercises) {
    firestoreMap.set(ex.name.toLowerCase().trim(), ex);
  }

  const result: LibraryExercise[] = [];

  // Il canone per nome: serve a non farlo coprire da una voce salvata
  // senza film. Un campo VUOTO non può cancellare un filmato che esiste.
  const canonePerNome = new Map(
    allDefaultExercises.map((d) => [d.name.toLowerCase().trim(), d])
  );

  for (const ex of firestoreExercises) {
    const canone = canonePerNome.get(ex.name.toLowerCase().trim());
    const conFilm = fondiConCanone({
      name: ex.name,
      videoUrl: ex.videoUrl,
      videoLabel: (ex as any).videoLabel,
      videoUrlAlt: (ex as any).videoUrlAlt,
      videoAltLabel: (ex as any).videoAltLabel,
    }, canone);

    result.push({
      id: ex.id,
      name: ex.name,
      description: ex.description || '',
      sets: ex.sets,
      reps: ex.reps,
      restSeconds: ex.restSeconds,
      category: ex.category,
      notes: ex.notes || '',
      videoUrl: conFilm.videoUrl,
      videoLabel: conFilm.videoLabel,
      videoUrlAlt: conFilm.videoUrlAlt,
      videoAltLabel: conFilm.videoAltLabel,
      imageUrl: ex.imageUrl,
      gender: (ex as any).gender || 'unisex',
      // Un esercizio salvato dal coach puo' non avere il gruppo: si
      // eredita dal canone se il nome coincide, altrimenti finisce in
      // «Da classificare», dove si vede e si sistema.
      muscolo: ((ex as any).muscolo as GruppoMuscolare)
        || canone?.muscolo || 'daClassificare',
      fromFirestore: true,
    });
  }

  for (const def of allDefaultExercises) {
    const key = def.name.toLowerCase().trim();
    if (firestoreMap.has(key)) continue;
    result.push({
      id: `default_${key.replace(/\s+/g, '_')}`,
      name: def.name,
      description: def.description,
      sets: def.sets,
      reps: def.reps,
      restSeconds: def.restSeconds,
      category: def.category,
      notes: def.notes,
      // gli esercizi del canone arrivano col filmato già attaccato
      videoUrl: def.videoUrl,
      videoLabel: def.videoLabel,
      videoUrlAlt: def.videoUrlAlt,
      videoAltLabel: def.videoAltLabel,
      gender: def.gender,
      muscolo: def.muscolo,
      fromFirestore: false,
    });
  }

  return result;
};
