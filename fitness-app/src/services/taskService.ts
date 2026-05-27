import {
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { DailyTask } from '../types';

const TASKS_COLLECTION = 'dailyTasks';

const stripUndefined = (obj: Record<string, unknown>): Record<string, unknown> => {
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) clean[k] = v;
  }
  return clean;
};

export const createTask = async (
  task: Omit<DailyTask, 'id'>
): Promise<string> => {
  const data = stripUndefined({
    ...task,
    date: Timestamp.fromDate(task.date instanceof Date ? task.date : new Date(task.date as any)),
    createdAt: Timestamp.fromDate(task.createdAt instanceof Date ? task.createdAt : new Date()),
    completedAt: task.completedAt ? Timestamp.fromDate(task.completedAt) : null,
  });
  const docRef = await addDoc(collection(db, TASKS_COLLECTION), data);
  return docRef.id;
};

export const getTasksByOwner = async (ownerId: string): Promise<DailyTask[]> => {
  const q = query(
    collection(db, TASKS_COLLECTION),
    where('ownerId', '==', ownerId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as DailyTask));
};

export const updateTask = async (
  taskId: string,
  updates: Partial<Omit<DailyTask, 'id'>>
): Promise<void> => {
  const data: Record<string, unknown> = { ...updates };
  if (updates.date) data.date = Timestamp.fromDate(updates.date instanceof Date ? updates.date : new Date(updates.date as any));
  if (updates.completedAt) data.completedAt = Timestamp.fromDate(updates.completedAt);
  if (updates.createdAt) data.createdAt = Timestamp.fromDate(updates.createdAt instanceof Date ? updates.createdAt : new Date(updates.createdAt as any));
  const clean = stripUndefined(data);
  await updateDoc(doc(db, TASKS_COLLECTION, taskId), clean);
};

export const toggleTaskComplete = async (
  taskId: string,
  isCompleted: boolean
): Promise<void> => {
  const updates: Record<string, unknown> = { isCompleted };
  if (isCompleted) {
    updates.completedAt = Timestamp.fromDate(new Date());
  } else {
    updates.completedAt = null;
  }
  await updateDoc(doc(db, TASKS_COLLECTION, taskId), updates);
};

export const deleteTask = async (taskId: string): Promise<void> => {
  await deleteDoc(doc(db, TASKS_COLLECTION, taskId));
};
