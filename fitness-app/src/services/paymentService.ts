import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { PaymentPlan, Installment, CollaboratorEarning, PaymentStatus } from '../types';

const PAYMENTS_COLLECTION = 'paymentPlans';
const EARNINGS_COLLECTION = 'collaboratorEarnings';

// --- Piani di pagamento ---

export const createPaymentPlan = async (
  plan: Omit<PaymentPlan, 'id'>
): Promise<string> => {
  const docRef = await addDoc(collection(db, PAYMENTS_COLLECTION), {
    ...plan,
    createdAt: Timestamp.now(),
  });
  return docRef.id;
};

export const getStudentPaymentPlans = async (
  studentId: string
): Promise<PaymentPlan[]> => {
  const q = query(
    collection(db, PAYMENTS_COLLECTION),
    where('studentId', '==', studentId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as PaymentPlan));
};

export const markInstallmentPaid = async (
  planId: string,
  installmentId: string,
  installments: Installment[]
): Promise<void> => {
  const updated = installments.map((inst) =>
    inst.id === installmentId
      ? { ...inst, status: 'paid' as PaymentStatus, paidDate: new Date() }
      : inst
  );
  await updateDoc(doc(db, PAYMENTS_COLLECTION, planId), {
    installments: updated,
  });
};

// --- Calcolo commissioni collaboratore e manager ---

export const calculateCollaboratorEarnings = (
  totalPaid: number,
  commissionPercentage: number
): { collaboratorShare: number; ownerShare: number } => {
  const collaboratorShare = (totalPaid * commissionPercentage) / 100;
  const ownerShare = totalPaid - collaboratorShare;
  return { collaboratorShare, ownerShare };
};

export const calculateFullEarnings = (
  totalPaid: number,
  coachCommissionPercentage: number,
  managerCommissionPercentage: number
): { coachShare: number; managerShare: number; ownerShare: number } => {
  const coachShare = (totalPaid * coachCommissionPercentage) / 100;
  const managerShare = (totalPaid * managerCommissionPercentage) / 100;
  const ownerShare = totalPaid - coachShare - managerShare;
  return { coachShare, managerShare, ownerShare };
};

export const getCollaboratorEarnings = async (
  collaboratorId: string,
  period?: string
): Promise<CollaboratorEarning[]> => {
  let q = query(
    collection(db, EARNINGS_COLLECTION),
    where('collaboratorId', '==', collaboratorId)
  );
  if (period) {
    q = query(q, where('period', '==', period));
  }
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ ...d.data() } as CollaboratorEarning));
};

export const saveEarningRecord = async (
  earning: CollaboratorEarning
): Promise<void> => {
  await addDoc(collection(db, EARNINGS_COLLECTION), earning);
};

// --- Rate e scadenze ---

export const getUpcomingInstallments = async (
  userId: string,
  role: 'student' | 'collaborator'
): Promise<{ plan: PaymentPlan; installment: Installment }[]> => {
  const field = role === 'student' ? 'studentId' : 'collaboratorId';
  const q = query(
    collection(db, PAYMENTS_COLLECTION),
    where(field, '==', userId)
  );
  const snapshot = await getDocs(q);
  const plans = snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as PaymentPlan));

  const upcoming: { plan: PaymentPlan; installment: Installment }[] = [];
  const now = new Date();

  for (const plan of plans) {
    for (const inst of plan.installments) {
      if (inst.status !== 'paid') {
        const dueDate = inst.dueDate instanceof Date ? inst.dueDate : new Date(inst.dueDate as unknown as string);
        if (dueDate >= now) {
          upcoming.push({ plan, installment: inst });
        }
      }
    }
  }

  return upcoming.sort(
    (a, b) => new Date(a.installment.dueDate).getTime() - new Date(b.installment.dueDate).getTime()
  );
};

export const deletePaymentPlan = async (planId: string): Promise<void> => {
  await deleteDoc(doc(db, PAYMENTS_COLLECTION, planId));
};

export const updatePaymentPlan = async (
  planId: string,
  data: Partial<Omit<PaymentPlan, 'id'>>
): Promise<void> => {
  await updateDoc(doc(db, PAYMENTS_COLLECTION, planId), data);
};

export const getAllPaymentPlans = async (): Promise<PaymentPlan[]> => {
  const snapshot = await getDocs(collection(db, PAYMENTS_COLLECTION));
  return snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as PaymentPlan));
};

export const getPaymentReminderMessage = (
  studentName: string,
  amount: number,
  dueDate: Date,
  daysUntil: number
): string => {
  if (daysUntil === 15) {
    return `Ciao ${studentName}! Ti ricordiamo che tra 15 giorni (${dueDate.toLocaleDateString('it-IT')}) è previsto il pagamento della rata di €${amount}. Organizzati per tempo!`;
  }
  if (daysUntil <= 7 && daysUntil > 1) {
    return `Ciao ${studentName}, mancano ${daysUntil} giorni al pagamento della rata di €${amount} (${dueDate.toLocaleDateString('it-IT')}). Non dimenticare!`;
  }
  return `Ciao ${studentName}, domani scade la rata di €${amount}. Ricordati di effettuare il pagamento!`;
};

// Decrement a lesson from a payment plan
export const decrementPlanLesson = async (planId: string, currentUsed: number): Promise<void> => {
  await updateDoc(doc(db, PAYMENTS_COLLECTION, planId), {
    usedLessons: currentUsed + 1,
  });
};

// Decrement a consultation from a payment plan
export const decrementPlanConsultation = async (planId: string, currentUsed: number): Promise<void> => {
  await updateDoc(doc(db, PAYMENTS_COLLECTION, planId), {
    usedConsultations: currentUsed + 1,
  });
};

const toSafeDate = (d: unknown): Date => {
  if (d instanceof Date) return d;
  if (d && typeof d === 'object' && 'toDate' in d && typeof (d as any).toDate === 'function')
    return (d as any).toDate();
  if (d && typeof d === 'object' && 'seconds' in d)
    return new Date((d as any).seconds * 1000);
  return new Date(d as string);
};

// Get active plan for student (the one within date range and not fully used)
export const getActiveStudentPlan = async (studentId: string): Promise<PaymentPlan | null> => {
  const plans = await getStudentPaymentPlans(studentId);
  const now = new Date();
  return plans.find((p) => {
    const start = toSafeDate(p.startDate);
    const end = toSafeDate(p.endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return false;
    const endOfDay = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999);
    return start <= now && endOfDay >= now;
  }) || null;
};
