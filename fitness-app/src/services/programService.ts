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
import { TrainingProgram, WorkoutPlan, Exercise } from '../types';

const PROGRAMS_COLLECTION = 'trainingPrograms';
const PLANS_COLLECTION = 'workoutPlans';
const EXERCISES_COLLECTION = 'exerciseLibrary';

// --- Programmi sessione singola ---

export const createProgram = async (
  program: Omit<TrainingProgram, 'id'>
): Promise<string> => {
  const docRef = await addDoc(collection(db, PROGRAMS_COLLECTION), {
    ...program,
    createdAt: Timestamp.now(),
  });
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
    const activeQuery = query(
      collection(db, PLANS_COLLECTION),
      where('studentId', '==', plan.studentId),
      where('isActive', '==', true)
    );
    const activeSnapshot = await getDocs(activeQuery);
    for (const activeDoc of activeSnapshot.docs) {
      await updateDoc(doc(db, PLANS_COLLECTION, activeDoc.id), { isActive: false });
    }
  }

  const docRef = await addDoc(collection(db, PLANS_COLLECTION), {
    ...plan,
    startDate: Timestamp.fromDate(plan.startDate),
    endDate: Timestamp.fromDate(plan.endDate),
    createdAt: Timestamp.now(),
  });
  return docRef.id;
};

export const getStudentWorkoutPlans = async (
  studentId: string
): Promise<WorkoutPlan[]> => {
  const q = query(
    collection(db, PLANS_COLLECTION),
    where('studentId', '==', studentId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as WorkoutPlan));
};

export const getActiveWorkoutPlan = async (
  studentId: string
): Promise<WorkoutPlan | null> => {
  const q = query(
    collection(db, PLANS_COLLECTION),
    where('studentId', '==', studentId),
    where('isActive', '==', true)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const d = snapshot.docs[0];
  return { ...d.data(), id: d.id } as WorkoutPlan;
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
  await deleteDoc(doc(db, PLANS_COLLECTION, planId));
};

export const deleteProgram = async (programId: string): Promise<void> => {
  await deleteDoc(doc(db, PROGRAMS_COLLECTION, programId));
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
