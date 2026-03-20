import {
  collection,
  doc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  arrayUnion,
  arrayRemove,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  Student,
  Manager,
  Collaborator,
  NutritionistAppointment,
} from '../types';

// ============================================================
// MANAGER NUTRIZIONISTA - GESTIONE TEAM E ALLIEVI
// ============================================================

/**
 * Assegna un nutrizionista coach a un manager nutrizionista
 */
export const assignNutritionistToManager = async (
  managerId: string,
  nutritionistId: string
): Promise<void> => {
  await updateDoc(doc(db, 'users', managerId), {
    assignedNutritionists: arrayUnion(nutritionistId),
  });
};

/**
 * Rimuove un nutrizionista coach da un manager nutrizionista
 */
export const removeNutritionistFromManager = async (
  managerId: string,
  nutritionistId: string
): Promise<void> => {
  await updateDoc(doc(db, 'users', managerId), {
    assignedNutritionists: arrayRemove(nutritionistId),
  });
};

/**
 * Assegna un allievo a un nutrizionista coach
 */
export const assignStudentToNutritionist = async (
  studentId: string,
  nutritionistId: string,
  nutritionManagerId?: string
): Promise<void> => {
  const updateData: Record<string, unknown> = {
    assignedNutritionistId: nutritionistId,
  };
  if (nutritionManagerId) {
    updateData.assignedNutritionManagerId = nutritionManagerId;
  }
  await updateDoc(doc(db, 'users', studentId), updateData);
};

/**
 * Rimuove l'assegnazione nutrizionista da un allievo
 */
export const removeStudentFromNutritionist = async (
  studentId: string
): Promise<void> => {
  await updateDoc(doc(db, 'users', studentId), {
    assignedNutritionistId: '',
    assignedNutritionManagerId: '',
  });
};

/**
 * Ottieni i nutrizionisti coach assegnati a un manager
 */
export const getManagerNutritionists = async (
  managerId: string
): Promise<Collaborator[]> => {
  const managerDoc = await getDocs(
    query(collection(db, 'users'), where('__name__', '==', managerId))
  );
  if (managerDoc.empty) return [];

  const managerData = managerDoc.docs[0].data() as Manager;
  const nutritionistIds = managerData.assignedNutritionists || [];

  if (nutritionistIds.length === 0) return [];

  const allCollabs = await getDocs(
    query(collection(db, 'users'), where('role', '==', 'collaborator'))
  );

  return allCollabs.docs
    .map((d) => ({ ...d.data(), id: d.id } as Collaborator))
    .filter((c) => nutritionistIds.includes(c.id));
};

/**
 * Ottieni gli allievi seguiti dai nutrizionisti di un manager
 */
export const getNutritionManagerStudents = async (
  managerId: string
): Promise<Student[]> => {
  const allStudents = await getDocs(
    query(collection(db, 'users'), where('role', '==', 'student'))
  );

  return allStudents.docs
    .map((d) => ({ ...d.data(), id: d.id } as Student))
    .filter(
      (s) =>
        s.assignedNutritionManagerId === managerId ||
        s.assignedNutritionistId !== undefined
    );
};

/**
 * Ottieni gli appuntamenti nutrizionali gestiti dal team del manager
 */
export const getNutritionManagerAppointments = async (
  managerId: string,
  nutritionistIds: string[]
): Promise<NutritionistAppointment[]> => {
  const q = query(
    collection(db, 'nutritionistAppointments'),
    orderBy('date', 'desc')
  );
  const snapshot = await getDocs(q);
  const allAppts = snapshot.docs.map(
    (d) => ({ ...d.data(), id: d.id } as NutritionistAppointment)
  );

  // Filtra per appuntamenti del team del manager
  return allAppts.filter(
    (a) =>
      a.nutritionManagerId === managerId ||
      (a.nutritionistId && nutritionistIds.includes(a.nutritionistId))
  );
};

/**
 * Statistiche del team nutrizionista
 */
export interface NutritionTeamStats {
  totalNutritionists: number;
  totalStudents: number;
  totalAppointments: number;
  completedAppointments: number;
  scheduledAppointments: number;
  cancelledAppointments: number;
  completionRate: number;
}

export const getNutritionTeamStats = (
  nutritionists: Collaborator[],
  students: Student[],
  appointments: NutritionistAppointment[]
): NutritionTeamStats => {
  const completed = appointments.filter((a) => a.status === 'completed' || a.isCountedAsCompleted);
  const scheduled = appointments.filter((a) => a.status === 'scheduled');
  const cancelled = appointments.filter(
    (a) => a.status === 'cancelled' || a.status === 'cancelled_late'
  );

  return {
    totalNutritionists: nutritionists.length,
    totalStudents: students.length,
    totalAppointments: appointments.length,
    completedAppointments: completed.length,
    scheduledAppointments: scheduled.length,
    cancelledAppointments: cancelled.length,
    completionRate:
      appointments.length > 0
        ? Math.round((completed.length / appointments.length) * 100)
        : 0,
  };
};
