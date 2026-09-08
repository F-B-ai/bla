import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { Linking } from 'react-native';
import { db } from '../config/firebase';
import { PaymentPlan, AppNotification } from '../types';
import { brand } from '../config/brand';

const NOTIFICATIONS_COLLECTION = 'diaryEntries';

const MSG_PREFIX = `*APP ${brand.appName}*\n\n`;

const REMINDER_MESSAGES = {
  week: (name: string, amount: number, dueDate: string) =>
    MSG_PREFIX +
    `Ciao ${name} \u{1F60A}\n\n` +
    `Ti scrivo per ricordarti che il ${dueDate} è in programma il rinnovo del tuo percorso (€${amount}).\n\n` +
    `È solo un piccolo passaggio organizzativo — il vero lavoro lo stai già facendo tu, ` +
    `ogni volta che ti alleni e scegli di investire su di te.\n\n` +
    `Sistemando questo dettaglio per tempo, potremo continuare a dedicarci al 100% ai tuoi obiettivi ` +
    `senza pensieri. I tuoi risultati parlano chiaro: stai andando alla grande \u{1F4AA}\n\n` +
    `Per qualsiasi cosa, sono qui. A presto!`,

  oneDay: (name: string, amount: number, dueDate: string) =>
    MSG_PREFIX +
    `Ciao ${name} \u{1F44B}\n\n` +
    `Solo un veloce promemoria: domani (${dueDate}) è previsto il rinnovo del tuo percorso di €${amount}.\n\n` +
    `Niente di complicato — è quel piccolo dettaglio che ti permette di continuare ` +
    `a concentrarti solo su ciò che conta davvero: i tuoi progressi e il tuo benessere.\n\n` +
    `Quando è tutto in ordine possiamo lavorare insieme senza interruzioni, ` +
    `e tu meriti esattamente questo \u{2728}\n\n` +
    `Se hai bisogno di qualsiasi cosa, scrivimi pure. Ci vediamo presto!`,

  overdue: (name: string, amount: number, dueDate: string) =>
    MSG_PREFIX +
    `Ciao ${name} \u{1F60A}\n\n` +
    `Spero che vada tutto bene! Ti scrivo perché il rinnovo di €${amount} previsto per il ${dueDate} ` +
    `risulta ancora in sospeso.\n\n` +
    `So che tra mille impegni può sfuggire — capita a tutti! ` +
    `È davvero solo una piccola formalità per poter continuare il tuo percorso senza intoppi.\n\n` +
    `I progressi che hai fatto sono troppo importanti per fermarsi per un dettaglio amministrativo. ` +
    `Fammi sapere se posso aiutarti in qualche modo \u{1F64F}\n\n` +
    `A presto!`,
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

      const rawDate = inst.dueDate as any;
      const dueDate = rawDate instanceof Date
        ? rawDate
        : rawDate?.toDate ? rawDate.toDate()
        : rawDate?.seconds ? new Date(rawDate.seconds * 1000)
        : new Date(rawDate);

      if (isNaN(dueDate.getTime())) continue;

      const dueDateStr = dueDate.toLocaleDateString('it-IT');
      const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      let message = '';
      let type: 'payment_reminder_15days' | 'payment_reminder_week' | 'payment_reminder_3days' | 'payment_reminder_1day' | 'payment_due' | null = null;

      if (diffDays <= 0) {
        message = REMINDER_MESSAGES.overdue(studentName, inst.amount, dueDateStr);
        type = 'payment_due';
      } else if (diffDays <= 1) {
        message = REMINDER_MESSAGES.oneDay(studentName, inst.amount, dueDateStr);
        type = 'payment_reminder_1day';
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
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const q = query(
    collection(db, NOTIFICATIONS_COLLECTION),
    where('userId', '==', notification.userId)
  );
  const existing = await getDocs(q);

  const alreadySentToday = existing.docs.some((d) => {
    const data = d.data();
    if (data.docType !== 'notification' || data.type !== notification.type) return false;
    if (data.data?.installmentId !== notification.data?.installmentId) return false;
    const createdAt = data.createdAt?.toDate?.() || new Date(data.createdAt);
    return createdAt >= today;
  });

  if (alreadySentToday) return '';

  const docRef = await addDoc(collection(db, NOTIFICATIONS_COLLECTION), {
    docType: 'notification',
    ...notification,
    createdAt: Timestamp.now(),
  });
  return docRef.id;
};

export const generateAndSendRemindersForAllStudents = async (
  plans: PaymentPlan[],
  students: Array<{ id: string; name: string }>
): Promise<number> => {
  let sentCount = 0;
  const studentMap = new Map(students.map((s) => [s.id, s.name]));

  for (const plan of plans) {
    const studentName = studentMap.get(plan.studentId);
    if (!studentName) continue;

    const reminders = await generatePaymentReminders(plan.studentId, studentName, [plan]);
    for (const reminder of reminders) {
      const { id, ...reminderData } = reminder;
      const docId = await sendPaymentReminder(reminderData);
      if (docId) sentCount++;
    }
  }

  return sentCount;
};

export const sendWhatsAppReminder = async (
  phone: string,
  message: string
): Promise<boolean> => {
  if (!phone) return false;
  const cleanPhone = phone.replace(/[^0-9+]/g, '');
  const intlPhone = cleanPhone.startsWith('+') ? cleanPhone : `+39${cleanPhone}`;
  const encoded = encodeURIComponent(message);
  const url = `https://wa.me/${intlPhone.replace('+', '')}?text=${encoded}`;
  try {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
      return true;
    }
    return false;
  } catch {
    return false;
  }
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
