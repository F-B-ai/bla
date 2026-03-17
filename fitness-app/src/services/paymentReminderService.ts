import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { PaymentPlan, Installment, AppNotification } from '../types';

const NOTIFICATIONS_COLLECTION = 'notifications';

const REMINDER_MESSAGES = {
  week: (name: string, amount: number, dueDate: string) =>
    `Ciao ${name}! Tra una settimana scade la tua rata di €${amount} (${dueDate}). ` +
    `Continuando con costanza il tuo percorso, stai investendo nel tuo benessere e nella tua salute. ` +
    `Ogni sessione ti avvicina ai tuoi obiettivi!`,
  threeDays: (name: string, amount: number, dueDate: string) =>
    `${name}, mancano 3 giorni alla scadenza della rata di €${amount} (${dueDate}). ` +
    `Il tuo impegno sta dando risultati: non fermarti proprio adesso! ` +
    `Regolarizzando il pagamento potrai continuare senza interruzioni il percorso che hai iniziato.`,
  oneDay: (name: string, amount: number, dueDate: string) =>
    `${name}, domani scade la rata di €${amount} (${dueDate}). ` +
    `Ricorda che il tuo percorso fitness è un investimento su di te. ` +
    `Provvedi al pagamento per continuare a goderti le tue sessioni senza interruzioni!`,
  overdue: (name: string, amount: number, dueDate: string) =>
    `${name}, la rata di €${amount} prevista per il ${dueDate} risulta scaduta. ` +
    `Contattaci per regolarizzare la tua posizione e riprendere il tuo percorso di benessere!`,
};

export const generatePaymentReminders = async (
  studentId: string,
  studentName: string,
  plans: PaymentPlan[]
): Promise<AppNotification[]> => {
  const now = new Date();
  const reminders: AppNotification[] = [];

  for (const plan of plans) {
    for (const inst of plan.installments) {
      if (inst.status === 'paid') continue;

      const dueDate = inst.dueDate instanceof Date
        ? inst.dueDate
        : new Date(inst.dueDate as unknown as string);

      const dueDateStr = dueDate.toLocaleDateString('it-IT');
      const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      let message = '';
      let type: 'payment_reminder_week' | 'payment_reminder_3days' | 'payment_reminder_1day' | 'payment_due' | null = null;

      if (diffDays <= 0) {
        message = REMINDER_MESSAGES.overdue(studentName, inst.amount, dueDateStr);
        type = 'payment_due';
      } else if (diffDays <= 1) {
        message = REMINDER_MESSAGES.oneDay(studentName, inst.amount, dueDateStr);
        type = 'payment_reminder_1day';
      } else if (diffDays <= 3) {
        message = REMINDER_MESSAGES.threeDays(studentName, inst.amount, dueDateStr);
        type = 'payment_reminder_3days';
      } else if (diffDays <= 7) {
        message = REMINDER_MESSAGES.week(studentName, inst.amount, dueDateStr);
        type = 'payment_reminder_week';
      }

      if (type && message) {
        reminders.push({
          id: '',
          userId: studentId,
          type,
          title: diffDays <= 0 ? 'Rata scaduta' : 'Promemoria pagamento',
          body: message,
          data: {
            planId: plan.id,
            installmentId: inst.id,
            amount: String(inst.amount),
            dueDate: dueDateStr,
          },
          read: false,
          createdAt: new Date(),
        });
      }
    }
  }

  return reminders;
};

export const sendPaymentReminder = async (
  notification: Omit<AppNotification, 'id'>
): Promise<string> => {
  // Controlla se un reminder simile è già stato inviato oggi
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const q = query(
    collection(db, NOTIFICATIONS_COLLECTION),
    where('userId', '==', notification.userId),
    where('type', '==', notification.type),
  );
  const existing = await getDocs(q);

  // Evita duplicati nello stesso giorno
  const alreadySentToday = existing.docs.some((d) => {
    const data = d.data();
    const createdAt = data.createdAt?.toDate?.() || new Date(data.createdAt);
    return createdAt >= today;
  });

  if (alreadySentToday) return '';

  const docRef = await addDoc(collection(db, NOTIFICATIONS_COLLECTION), {
    ...notification,
    createdAt: Timestamp.now(),
  });
  return docRef.id;
};

export const getStudentNotifications = async (
  studentId: string
): Promise<AppNotification[]> => {
  const q = query(
    collection(db, NOTIFICATIONS_COLLECTION),
    where('userId', '==', studentId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map((d) => ({ ...d.data(), id: d.id } as AppNotification))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};
