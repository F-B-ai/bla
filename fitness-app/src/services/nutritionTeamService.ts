import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../config/firebase';
import { NutritionTeamNote } from '../types';

const TEAM_NOTES_COLLECTION = 'nutritionTeamNotes';

export const addTeamNote = async (
  note: Omit<NutritionTeamNote, 'id'>
): Promise<string> => {
  const docRef = await addDoc(collection(db, TEAM_NOTES_COLLECTION), {
    ...note,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return docRef.id;
};

export const getTeamNotes = async (): Promise<NutritionTeamNote[]> => {
  const q = query(
    collection(db, TEAM_NOTES_COLLECTION),
    orderBy('isPinned', 'desc'),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as NutritionTeamNote));
};

export const updateTeamNote = async (
  noteId: string,
  data: Partial<Omit<NutritionTeamNote, 'id'>>
): Promise<void> => {
  await updateDoc(doc(db, TEAM_NOTES_COLLECTION, noteId), {
    ...data,
    updatedAt: Timestamp.now(),
  });
};

export const deleteTeamNote = async (noteId: string): Promise<void> => {
  await deleteDoc(doc(db, TEAM_NOTES_COLLECTION, noteId));
};

export const togglePinNote = async (
  noteId: string,
  isPinned: boolean
): Promise<void> => {
  await updateDoc(doc(db, TEAM_NOTES_COLLECTION, noteId), {
    isPinned: !isPinned,
    updatedAt: Timestamp.now(),
  });
};

export const uploadTeamAttachment = async (
  fileUri: string,
  fileName: string
): Promise<string> => {
  const timestamp = Date.now();
  const fileRef = ref(storage, `nutritionTeam/${timestamp}_${fileName}`);
  const response = await fetch(fileUri);
  const blob = await response.blob();
  await uploadBytes(fileRef, blob);
  return getDownloadURL(fileRef);
};
