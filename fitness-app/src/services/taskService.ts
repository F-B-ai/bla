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
import { dataDelTask, dataScelta } from '../domain/task';

const TASKS_COLLECTION = 'dailyTasks';

export const createTask = async (
  task: Omit<DailyTask, 'id'>
): Promise<string> => {
  const docRef = await addDoc(collection(db, TASKS_COLLECTION), {
    ownerId: task.ownerId,
    title: task.title,
    description: task.description || '',
    priority: task.priority || 'medium',
    isCompleted: false,
    completedAt: null,
    // Il giorno scelto da chi scrive il task, non il giorno in cui
    // lo scrive: erano la stessa cosa per un errore, e un task per
    // giovedì finiva su oggi.
    date: Timestamp.fromDate(dataDelTask(task.date)),
    createdAt: Timestamp.now(),
    startTime: task.startTime || null,
    endTime: task.endTime || null,
  });
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
  const data: Record<string, unknown> = {};
  if (updates.title !== undefined) data.title = updates.title;
  if (updates.description !== undefined) data.description = updates.description;
  if (updates.priority !== undefined) data.priority = updates.priority;
  if (updates.isCompleted !== undefined) data.isCompleted = updates.isCompleted;
  if (updates.startTime !== undefined) data.startTime = updates.startTime || null;
  if (updates.endTime !== undefined) data.endTime = updates.endTime || null;
  if (updates.completedAt) data.completedAt = Timestamp.fromDate(updates.completedAt);
  if (updates.date) {
    // Se il giorno arrivato non è leggibile la data resta com'è:
    // in una modifica, ripiegare su «adesso» sposterebbe il task a
    // oggi — cioè il difetto che stiamo chiudendo.
    const d = dataScelta(updates.date as Date | string);
    if (d) data.date = Timestamp.fromDate(d);
  }
  await updateDoc(doc(db, TASKS_COLLECTION, taskId), data);
};

export const toggleTaskComplete = async (
  taskId: string,
  isCompleted: boolean
): Promise<void> => {
  await updateDoc(doc(db, TASKS_COLLECTION, taskId), {
    isCompleted,
    completedAt: isCompleted ? Timestamp.now() : null,
  });
};

export const deleteTask = async (taskId: string): Promise<void> => {
  await deleteDoc(doc(db, TASKS_COLLECTION, taskId));
};
