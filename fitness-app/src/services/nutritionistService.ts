import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../config/firebase';
import {
  NutritionistAppointment,
  NutritionistAppointmentStatus,
  BodyMeasurement,
  BiaDocument,
} from '../types';

// ============================================================
// APPUNTAMENTI NUTRIZIONISTA
// ============================================================

const APPOINTMENTS_COLLECTION = 'nutritionistAppointments';
const MEASUREMENTS_COLLECTION = 'bodyMeasurements';
const BIA_COLLECTION = 'biaDocuments';
const CANCELLATION_HOURS_LIMIT = 10;

export const createAppointment = async (
  appointment: Omit<NutritionistAppointment, 'id'>
): Promise<string> => {
  const docRef = await addDoc(collection(db, APPOINTMENTS_COLLECTION), {
    ...appointment,
    date: Timestamp.fromDate(appointment.date),
    createdAt: Timestamp.now(),
  });
  return docRef.id;
};

export const cancelAppointment = async (
  appointmentId: string,
  appointmentDate: Date
): Promise<{ success: boolean; isLate: boolean }> => {
  const now = new Date();
  const hoursUntilAppointment =
    (appointmentDate.getTime() - now.getTime()) / (1000 * 60 * 60);
  const isLate = hoursUntilAppointment < CANCELLATION_HOURS_LIMIT;

  const updateData: Partial<NutritionistAppointment> = {
    status: isLate ? 'cancelled_late' : 'cancelled',
    cancelledAt: now,
    isCountedAsCompleted: isLate,
  };

  await updateDoc(doc(db, APPOINTMENTS_COLLECTION, appointmentId), updateData);
  return { success: true, isLate };
};

export const getStudentAppointments = async (
  studentId: string
): Promise<NutritionistAppointment[]> => {
  const q = query(
    collection(db, APPOINTMENTS_COLLECTION),
    where('studentId', '==', studentId),
    orderBy('date', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as NutritionistAppointment));
};

export const getAllAppointments = async (): Promise<NutritionistAppointment[]> => {
  const q = query(
    collection(db, APPOINTMENTS_COLLECTION),
    orderBy('date', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as NutritionistAppointment));
};

export const updateAppointmentStatus = async (
  appointmentId: string,
  status: NutritionistAppointmentStatus,
  notes?: string
): Promise<void> => {
  const updateData: Record<string, unknown> = { status };
  if (notes !== undefined) updateData.notes = notes;
  if (status === 'completed') updateData.isCountedAsCompleted = true;
  await updateDoc(doc(db, APPOINTMENTS_COLLECTION, appointmentId), updateData);
};

export const deleteAppointment = async (appointmentId: string): Promise<void> => {
  await deleteDoc(doc(db, APPOINTMENTS_COLLECTION, appointmentId));
};

// ============================================================
// MISURE CORPOREE
// ============================================================

export const addMeasurement = async (
  measurement: Omit<BodyMeasurement, 'id'>
): Promise<string> => {
  const docRef = await addDoc(collection(db, MEASUREMENTS_COLLECTION), {
    ...measurement,
    date: Timestamp.fromDate(measurement.date),
    createdAt: Timestamp.now(),
  });
  return docRef.id;
};

export const getStudentMeasurements = async (
  studentId: string
): Promise<BodyMeasurement[]> => {
  const q = query(
    collection(db, MEASUREMENTS_COLLECTION),
    where('studentId', '==', studentId),
    orderBy('date', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as BodyMeasurement));
};

export const deleteMeasurement = async (measurementId: string): Promise<void> => {
  await deleteDoc(doc(db, MEASUREMENTS_COLLECTION, measurementId));
};

// ============================================================
// DOCUMENTI BIA (PDF)
// ============================================================

export const uploadBiaPdf = async (
  studentId: string,
  fileUri: string,
  fileName: string
): Promise<string> => {
  const timestamp = Date.now();
  const pdfRef = ref(
    storage,
    `bia/${studentId}/${timestamp}_${fileName}`
  );

  const response = await fetch(fileUri);
  const blob = await response.blob();
  await uploadBytes(pdfRef, blob);

  return getDownloadURL(pdfRef);
};

export const addBiaDocument = async (
  biaDoc: Omit<BiaDocument, 'id'>
): Promise<string> => {
  const docRef = await addDoc(collection(db, BIA_COLLECTION), {
    ...biaDoc,
    date: Timestamp.fromDate(biaDoc.date),
    createdAt: Timestamp.now(),
  });
  return docRef.id;
};

export const getStudentBiaDocuments = async (
  studentId: string
): Promise<BiaDocument[]> => {
  const q = query(
    collection(db, BIA_COLLECTION),
    where('studentId', '==', studentId),
    orderBy('date', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as BiaDocument));
};

export const deleteBiaDocument = async (biaDocId: string): Promise<void> => {
  await deleteDoc(doc(db, BIA_COLLECTION, biaDocId));
};
