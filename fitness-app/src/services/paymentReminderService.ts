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

const NOTIFICATIONS_COLLECTION = 'diaryEntries';

const MSG_PREFIX = `*APP ESSĒRE*\n\n`;

const REMINDER_MESSAGES = {
  fifteenDays: (name: string, amount: number, dueDate: string) =>
    MSG_PREFIX +
    `Ciao ${name}, tra 15 giorni è previsto il rinnovo della tua rata di €${amount} (${dueDate}). ` +
    `Pensa a quanto sei cambiato da quando hai iniziato questo percorso: ogni allenamento ha costruito ` +
    `una versione più forte di te. Chi investe con costanza nel proprio corpo ottiene risultati che ` +
    `chi si ferma non vedrà mai. Il tuo futuro te stesso ti ringrazierà per aver scelto di continuare. ` +
    `Noi siamo pronti a darti il meglio — e quando tutto è in ordine, possiamo concentrarci solo sui tuoi risultati.`,

  week: (name: string, amount: number, dueDate: string) =>
    MSG_PREFIX +
    `${name}, manca una settimana alla scadenza della tua rata di €${amount} (${dueDate}). ` +
    `Hai già costruito un ritmo, un'abitudine, una disciplina — e sai quanto è difficile ` +
    `ricostruirla se si interrompe. Gli allievi più costanti nei pagamenti sono anche quelli che ` +
    `raggiungono i risultati migliori, perché vivono il percorso con piena responsabilità. ` +
    `Mantieni il ritmo: la regolarità fuori dalla palestra riflette la regolarità dentro. ` +
    `Con la tua puntualità, possiamo pianificare al meglio ogni dettaglio del tuo programma.`,

  threeDays: (name: string, amount: number, dueDate: string) =>
    MSG_PREFIX +
    `${name}, mancano 3 giorni alla scadenza della rata di €${amount} (${dueDate}). ` +
    `Il tuo impegno sta dando risultati concreti — non fermarti proprio adesso! ` +
    `Regolarizzando il pagamento potrai continuare senza interruzioni il percorso che hai iniziato. ` +
    `I tuoi progressi parlano chiaro: sei sulla strada giusta. Mantieni la continuità!`,

  oneDay: (name: string, amount: number, dueDate: string) =>
    MSG_PREFIX +
    `${name}, domani scade la tua rata di €${amount} (${dueDate}). ` +
    `Ogni giorno che hai investito in te stesso ti ha portato fin qui — non lasciare che un ` +
    `dettaglio amministrativo rallenti il tuo slancio. Provvedi oggi al pagamento e domani ` +
    `potrai allenarti con la mente libera, concentrato solo su ciò che conta: i tuoi progressi. ` +
    `Quando sei in regola, possiamo dedicarti il 100% della nostra attenzione e del nostro tempo ` +
    `senza distrazioni. Il tuo percorso merita continuità.`,

  overdue: (name: string, amount: number, dueDate: string) =>
    MSG_PREFIX +
    `${name}, la rata di €${amount} prevista per il ${dueDate} risulta scaduta. ` +
    `Sappiamo che la vita è piena di impegni, ma ogni giorno che passa senza regolarizzare ` +
    `la posizione è un giorno in cui il tuo percorso perde slancio. I tuoi progressi sono reali ` +
    `e meritano di essere protetti. Contattaci oggi stesso: insieme troviamo la soluzione migliore ` +
    `per riprendere senza perdere ciò che hai costruito.`,
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
      } else if (diffDays <= 3) {
        message = REMINDER_MESSAGES.threeDays(studentName, inst.amount, dueDateStr);
        type = 'payment_reminder_3days';
      } else if (diffDays <= 7) {
        message = REMINDER_MESSAGES.week(studentName, inst.amount, dueDateStr);
        type = 'payment_reminder_week';
      } else if (diffDays <= 15) {
        message = REMINDER_MESSAGES.fifteenDays(studentName, inst.amount, dueDateStr);
        type = 'payment_reminder_15days';
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
