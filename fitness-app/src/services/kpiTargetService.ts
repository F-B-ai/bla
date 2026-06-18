import { doc, updateDoc, getDocs, collection, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface KPIIndicator {
  id: string;
  label: string;
  sogliaMinima: string;
  target: string;
}

export const getAllKPITargets = async (): Promise<Record<string, Record<string, number>>> => {
  const result: Record<string, Record<string, number>> = {};

  const queries = [
    query(collection(db, 'users'), where('role', '==', 'collaborator')),
    query(collection(db, 'users'), where('role', '==', 'manager')),
  ];

  for (const q of queries) {
    const snapshot = await getDocs(q);
    for (const d of snapshot.docs) {
      const data = d.data();
      if (data.kpiTargets) {
        result[d.id] = data.kpiTargets as Record<string, number>;
      }
    }
  }

  return result;
};

export const saveKPITargets = async (
  userId: string,
  targets: Record<string, number>
): Promise<void> => {
  await updateDoc(doc(db, 'users', userId), { kpiTargets: targets });
};

export const getAllKPIIndicators = async (): Promise<Record<string, KPIIndicator[]>> => {
  const result: Record<string, KPIIndicator[]> = {};

  const queries = [
    query(collection(db, 'users'), where('role', '==', 'collaborator')),
    query(collection(db, 'users'), where('role', '==', 'manager')),
  ];

  for (const q of queries) {
    const snapshot = await getDocs(q);
    for (const d of snapshot.docs) {
      const data = d.data();
      if (data.kpiIndicators && Array.isArray(data.kpiIndicators)) {
        result[d.id] = data.kpiIndicators as KPIIndicator[];
      }
    }
  }

  return result;
};

export const saveKPIIndicators = async (
  userId: string,
  indicators: KPIIndicator[]
): Promise<void> => {
  await updateDoc(doc(db, 'users', userId), { kpiIndicators: indicators });
};
