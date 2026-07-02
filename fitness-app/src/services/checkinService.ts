import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  limit,
} from 'firebase/firestore';
import { db } from '../config/firebase';

const CHECKIN_COLLECTION = 'checkins';

export interface CheckinRecord {
  id: string;
  studentId: string;
  studentName: string;
  timestamp: Date;
}

const isToday = (date: Date): boolean => {
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
};

export const registerCheckin = async (
  studentId: string,
  studentName: string
): Promise<{ success: boolean; alreadyCheckedIn?: boolean }> => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // Filtro solo per data lato server (nessun indice composito richiesto),
  // per studente lato client: i check-in di oggi sono pochi.
  const existing = await getDocs(
    query(
      collection(db, CHECKIN_COLLECTION),
      where('timestamp', '>=', Timestamp.fromDate(todayStart))
    )
  );

  if (existing.docs.some((d) => d.data().studentId === studentId)) {
    return { success: false, alreadyCheckedIn: true };
  }

  await addDoc(collection(db, CHECKIN_COLLECTION), {
    studentId,
    studentName,
    timestamp: Timestamp.now(),
  });

  return { success: true };
};

export const getTodayCheckins = async (): Promise<CheckinRecord[]> => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const snapshot = await getDocs(
    query(
      collection(db, CHECKIN_COLLECTION),
      where('timestamp', '>=', Timestamp.fromDate(todayStart)),
      orderBy('timestamp', 'desc')
    )
  );

  return snapshot.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      studentId: data.studentId,
      studentName: data.studentName,
      timestamp: (data.timestamp as Timestamp).toDate(),
    };
  });
};

export const getRecentCheckins = async (days: number = 7): Promise<CheckinRecord[]> => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const snapshot = await getDocs(
    query(
      collection(db, CHECKIN_COLLECTION),
      where('timestamp', '>=', Timestamp.fromDate(startDate)),
      orderBy('timestamp', 'desc'),
      limit(200)
    )
  );

  return snapshot.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      studentId: data.studentId,
      studentName: data.studentName,
      timestamp: (data.timestamp as Timestamp).toDate(),
    };
  });
};
