import {
  collection,
  doc,
  getDocs,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';

const KPI_TARGETS_COLLECTION = 'kpiTargets';

export interface KPITargets {
  userId: string;
  targets: Record<string, number>;
  updatedAt: Date;
}

export const getAllKPITargets = async (): Promise<Record<string, Record<string, number>>> => {
  const snapshot = await getDocs(collection(db, KPI_TARGETS_COLLECTION));
  const result: Record<string, Record<string, number>> = {};
  for (const d of snapshot.docs) {
    result[d.id] = (d.data().targets as Record<string, number>) || {};
  }
  return result;
};

export const saveKPITargets = async (
  userId: string,
  targets: Record<string, number>
): Promise<void> => {
  await setDoc(doc(db, KPI_TARGETS_COLLECTION, userId), {
    userId,
    targets,
    updatedAt: Timestamp.now(),
  });
};
