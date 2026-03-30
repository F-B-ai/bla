import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { WorkoutLog, ExerciseLog, SetLog, WorkoutLogStatus } from '../types';

const WORKOUT_LOGS_COLLECTION = 'workoutLogs';

// --- Crea una nuova sessione di allenamento ---
export const startWorkoutLog = async (
  log: Omit<WorkoutLog, 'id'>
): Promise<string> => {
  const docRef = await addDoc(collection(db, WORKOUT_LOGS_COLLECTION), {
    ...log,
    date: Timestamp.fromDate(log.date),
    startedAt: Timestamp.now(),
    status: 'in_progress',
    exerciseLogs: log.exerciseLogs || [],
    notes: log.notes || '',
  });
  return docRef.id;
};

// --- Aggiorna i log degli esercizi (chiamato ogni volta che si completa una serie) ---
export const updateExerciseLogs = async (
  workoutLogId: string,
  exerciseLogs: ExerciseLog[]
): Promise<void> => {
  await updateDoc(doc(db, WORKOUT_LOGS_COLLECTION, workoutLogId), {
    exerciseLogs,
  });
};

// --- Completa la sessione ---
export const completeWorkoutLog = async (
  workoutLogId: string,
  notes?: string
): Promise<void> => {
  const updateData: Record<string, unknown> = {
    status: 'completed' as WorkoutLogStatus,
    completedAt: Timestamp.now(),
  };
  if (notes !== undefined) updateData.notes = notes;

  // Calcola durata
  const docSnap = await getDoc(doc(db, WORKOUT_LOGS_COLLECTION, workoutLogId));
  if (docSnap.exists()) {
    const data = docSnap.data();
    const startedAt = data.startedAt?.toDate?.() || new Date();
    const now = new Date();
    updateData.durationMinutes = Math.round((now.getTime() - startedAt.getTime()) / 60000);
  }

  await updateDoc(doc(db, WORKOUT_LOGS_COLLECTION, workoutLogId), updateData);
};

// --- Abbandona la sessione ---
export const abandonWorkoutLog = async (workoutLogId: string): Promise<void> => {
  await updateDoc(doc(db, WORKOUT_LOGS_COLLECTION, workoutLogId), {
    status: 'abandoned' as WorkoutLogStatus,
    completedAt: Timestamp.now(),
  });
};

// --- Recupera sessione in corso per uno studente ---
export const getActiveWorkoutLog = async (
  studentId: string
): Promise<WorkoutLog | null> => {
  const q = query(
    collection(db, WORKOUT_LOGS_COLLECTION),
    where('studentId', '==', studentId),
    where('status', '==', 'in_progress')
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const d = snapshot.docs[0];
  return { ...d.data(), id: d.id } as WorkoutLog;
};

// --- Storico allenamenti di uno studente ---
export const getStudentWorkoutLogs = async (
  studentId: string
): Promise<WorkoutLog[]> => {
  const q = query(
    collection(db, WORKOUT_LOGS_COLLECTION),
    where('studentId', '==', studentId),
    orderBy('startedAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as WorkoutLog));
};

// --- Allenamenti di oggi per un collaboratore (tutti i suoi studenti) ---
export const getTodayWorkoutLogs = async (
  collaboratorId: string
): Promise<WorkoutLog[]> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const q = query(
    collection(db, WORKOUT_LOGS_COLLECTION),
    where('collaboratorId', '==', collaboratorId),
    where('startedAt', '>=', Timestamp.fromDate(today)),
    where('startedAt', '<', Timestamp.fromDate(tomorrow))
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as WorkoutLog));
};

// --- Tutti gli allenamenti visibili al coach ---
export const getCollaboratorWorkoutLogs = async (
  collaboratorId: string
): Promise<WorkoutLog[]> => {
  const q = query(
    collection(db, WORKOUT_LOGS_COLLECTION),
    where('collaboratorId', '==', collaboratorId),
    orderBy('startedAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as WorkoutLog));
};

// --- Tutti gli allenamenti (per owner) ---
export const getAllWorkoutLogs = async (): Promise<WorkoutLog[]> => {
  const q = query(
    collection(db, WORKOUT_LOGS_COLLECTION),
    orderBy('startedAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as WorkoutLog));
};

// --- Real-time subscription per un singolo workout log ---
export const subscribeToWorkoutLog = (
  workoutLogId: string,
  callback: (log: WorkoutLog | null) => void
): Unsubscribe => {
  return onSnapshot(doc(db, WORKOUT_LOGS_COLLECTION, workoutLogId), (snap) => {
    if (!snap.exists()) {
      callback(null);
      return;
    }
    callback({ ...snap.data(), id: snap.id } as WorkoutLog);
  });
};

// --- Real-time subscription per allenamenti in corso di uno studente specifico ---
export const subscribeToStudentActiveWorkout = (
  studentId: string,
  callback: (log: WorkoutLog | null) => void
): Unsubscribe => {
  const q = query(
    collection(db, WORKOUT_LOGS_COLLECTION),
    where('studentId', '==', studentId),
    where('status', '==', 'in_progress')
  );
  return onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      callback(null);
      return;
    }
    const d = snapshot.docs[0];
    callback({ ...d.data(), id: d.id } as WorkoutLog);
  });
};

// --- Real-time: tutti gli allenamenti in corso (per coach/owner) ---
export const subscribeToActiveWorkouts = (
  collaboratorId: string | null,
  callback: (logs: WorkoutLog[]) => void
): Unsubscribe => {
  let q;
  if (collaboratorId) {
    q = query(
      collection(db, WORKOUT_LOGS_COLLECTION),
      where('collaboratorId', '==', collaboratorId),
      where('status', '==', 'in_progress')
    );
  } else {
    // Owner vede tutto
    q = query(
      collection(db, WORKOUT_LOGS_COLLECTION),
      where('status', '==', 'in_progress')
    );
  }
  return onSnapshot(q, (snapshot) => {
    const logs = snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as WorkoutLog));
    callback(logs);
  });
};
