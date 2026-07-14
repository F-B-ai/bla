import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../config/firebase';
import { BodyCompositionEstimate } from '../types';
import { emitTwinEvent } from './twinEventService';
import { CONFIDENCE } from '../domain/twinEvents';

const COLLECTION_NAME = 'bodyCompositionEstimates';

/**
 * Carica un'immagine di composizione corporea su Firebase Storage.
 * Percorso: bodycomp/{studentId}/{view}_{timestamp}.jpg
 */
export const uploadBodyCompImage = async (
  studentId: string,
  view: string,
  uri: string
): Promise<string> => {
  const timestamp = Date.now();
  const imageRef = ref(
    storage,
    `bodycomp/${studentId}/${view}_${timestamp}.jpg`
  );

  const response = await fetch(uri);
  const blob = await response.blob();
  await uploadBytes(imageRef, blob);

  return getDownloadURL(imageRef);
};

/**
 * Salva una stima di composizione corporea su Firestore.
 */
export const saveEstimate = async (
  estimate: Omit<BodyCompositionEstimate, 'id'>
): Promise<string> => {
  const docRef = await addDoc(collection(db, COLLECTION_NAME), {
    ...estimate,
    date: Timestamp.fromDate(estimate.date instanceof Date ? estimate.date : new Date(estimate.date)),
    createdAt: Timestamp.fromDate(estimate.createdAt instanceof Date ? estimate.createdAt : new Date(estimate.createdAt)),
  });

  // Dual-write twin (M3): stima AI = la sorgente più incerta (02 §3.1),
  // sempre range/tendenza, mai verità. Il dettaglio resta nel doc legacy.
  emitTwinEvent(
    'body.composition_estimated',
    {
      estimated_body_fat: estimate.estimatedBodyFat ?? null,
      estimated_muscle_mass: estimate.estimatedMuscleMass ?? null,
    },
    {
      subjectUid: estimate.studentId,
      source: 'ai',
      confidence: CONFIDENCE.aiBodyComp,
      sourceRef: { collection: COLLECTION_NAME, doc_id: docRef.id },
    }
  );

  return docRef.id;
};

/**
 * Recupera tutte le stime di composizione corporea di uno studente,
 * ordinate per data decrescente.
 */
export const getStudentEstimates = async (
  studentId: string
): Promise<BodyCompositionEstimate[]> => {
  const q = query(
    collection(db, COLLECTION_NAME),
    where('studentId', '==', studentId)
  );
  const snapshot = await getDocs(q);
  const results = snapshot.docs.map(
    (d) => ({ ...d.data(), id: d.id } as BodyCompositionEstimate)
  );
  // Ordina per data decrescente
  results.sort((a, b) => {
    const da =
      a.date && typeof a.date === 'object' && 'seconds' in a.date
        ? (a.date as any).seconds
        : new Date(a.date as any).getTime() / 1000;
    const db2 =
      b.date && typeof b.date === 'object' && 'seconds' in b.date
        ? (b.date as any).seconds
        : new Date(b.date as any).getTime() / 1000;
    return db2 - da;
  });
  return results;
};

/**
 * Elimina una stima di composizione corporea.
 */
export const deleteEstimate = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, COLLECTION_NAME, id));
};
