import { doc, updateDoc, getDocs, collection, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';

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
