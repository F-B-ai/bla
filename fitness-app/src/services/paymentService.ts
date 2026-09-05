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
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { messaggioPromemoria } from '../domain/patto';
import { PaymentPlan, Installment, CollaboratorEarning, PaymentStatus } from '../types';
import { scegliPiano, Scelta, TipoImpegnoPiano } from '../domain/piani';

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

export { calculateCollaboratorEarnings, calculateFullEarnings } from '../domain/formulas';

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
  // Il testo vive nel dominio (patto.ts) insieme alle regole del
  // patto firmato: messaggio e contratto non possono divergere.
  return messaggioPromemoria({
    nome: studentName, importo: amount, scadenza: dueDate,
    giorniAllaScadenza: daysUntil,
  }) || `Ciao ${studentName}, la rata di ${amount} € è in scadenza il ${dueDate.toLocaleDateString('it-IT')}.`;
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
/**
 * Scala una lezione (o una consulenza) dal percorso e DICE che cosa
 * è successo. Prima falliva in silenzio quando il percorso non
 * copriva la data di oggi — creato dopo la lezione, o in partenza
 * domani: la lezione non veniva scalata e nessuno lo sapeva.
 *
 * La scelta del percorso vive in src/domain/piani.ts e si testa lì.
 */
export const scalaDalPercorso = async (
  studentId: string,
  tipo: TipoImpegnoPiano,
  oggi: Date = new Date()
): Promise<Scelta> => {
  const piani = await getStudentPaymentPlans(studentId);
  const scelta = scegliPiano(piani.map((p) => ({
    id: p.id,
    inizio: toSafeDate(p.startDate),
    fine: toSafeDate(p.endDate),
    lezioniIncluse: p.includedLessons || 0,
    lezioniUsate: p.usedLessons || 0,
    consulenzeIncluse: p.includedConsultations || 0,
    consulenzeUsate: p.usedConsultations || 0,
    creatoIl: p.createdAt ? toSafeDate(p.createdAt) : undefined,
  })), tipo, oggi);

  if (scelta.esito !== 'scalata' || !scelta.piano) return scelta;

  const usate = tipo === 'lezione'
    ? scelta.piano.lezioniUsate
    : scelta.piano.consulenzeUsate;

  if (tipo === 'lezione') await decrementPlanLesson(scelta.piano.id, usate);
  else await decrementPlanConsultation(scelta.piano.id, usate);

  return scelta;
};

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

// ------------------------------------------------------------
// TEMPO REALE
// Il difetto: si segnava la lezione, il software la scalava davvero,
// ma la schermata del percorso continuava a mostrare il numero
// vecchio finché non si chiudeva e riapriva l'app. Il conto era
// giusto e sembrava sbagliato: peggio di un conto sbagliato.
// ------------------------------------------------------------

/** Tutti i percorsi, in tempo reale (staff). */
export const subscribeToPaymentPlans = (
  callback: (plans: PaymentPlan[]) => void,
  onError?: () => void
): Unsubscribe => onSnapshot(
  collection(db, PAYMENTS_COLLECTION),
  (snap) => callback(snap.docs.map((d) => ({ ...d.data(), id: d.id } as PaymentPlan))),
  () => { if (onError) onError(); }
);

/** I percorsi di un allievo, in tempo reale. */
export const subscribeToStudentPaymentPlans = (
  studentId: string,
  callback: (plans: PaymentPlan[]) => void,
  onError?: () => void
): Unsubscribe => onSnapshot(
  query(collection(db, PAYMENTS_COLLECTION), where('studentId', '==', studentId)),
  (snap) => callback(snap.docs.map((d) => ({ ...d.data(), id: d.id } as PaymentPlan))),
  () => { if (onError) onError(); }
);
