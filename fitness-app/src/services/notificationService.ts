import {
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { brand } from '../config/brand';
import { AppNotification, NotificationType } from '../types';
import { showLocalNotification, updateBadgeCount } from './pushNotificationService';

let _currentUserId: string | null = null;
export const setCurrentUserId = (uid: string | null) => { _currentUserId = uid; };

const NOTIFICATIONS_COLLECTION = 'diaryEntries';
const NOTIFICATION_PREFIX = `APP ${brand.appName}\n\n`;

const prefixBody = (body: string): string =>
  body.startsWith('APP ESS') ? body : NOTIFICATION_PREFIX + body;

export const createNotification = async (
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<string> => {
  const docRef = await addDoc(collection(db, NOTIFICATIONS_COLLECTION), {
    docType: 'notification',
    userId,
    type,
    title,
    body: prefixBody(body),
    data: data || {},
    read: false,
    createdAt: Timestamp.now(),
  });
  return docRef.id;
};

export const createBulkNotifications = async (
  userIds: string[],
  type: NotificationType,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<void> => {
  const batch = writeBatch(db);
  for (const userId of userIds) {
    const docRef = doc(collection(db, NOTIFICATIONS_COLLECTION));
    batch.set(docRef, {
      docType: 'notification',
      userId,
      type,
      title,
      body: prefixBody(body),
      data: data || {},
      read: false,
      createdAt: Timestamp.now(),
    });
  }
  await batch.commit();
};

export const getUserNotifications = async (
  userId: string
): Promise<AppNotification[]> => {
  const q = query(
    collection(db, NOTIFICATIONS_COLLECTION),
    where('userId', '==', userId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs
    .filter((d) => d.data().docType === 'notification')
    .map((d) => ({ ...d.data(), id: d.id } as AppNotification))
    .sort((a, b) => {
      const ta = (a.createdAt as any)?.seconds || 0;
      const tb = (b.createdAt as any)?.seconds || 0;
      return tb - ta;
    });
};

export const subscribeToUnreadCount = (
  userId: string,
  callback: (count: number) => void
): (() => void) => {
  let isFirstSnapshot = true;
  const q = query(
    collection(db, NOTIFICATIONS_COLLECTION),
    where('userId', '==', userId)
  );
  return onSnapshot(q, (snapshot) => {
    const unread = snapshot.docs.filter(
      (d) => d.data().docType === 'notification' && d.data().read === false
    );
    callback(unread.length);
    updateBadgeCount(unread.length).catch(() => {});
    if (!isFirstSnapshot) {
      for (const change of snapshot.docChanges()) {
        if (change.type === 'added') {
          const data = change.doc.data();
          if (data.docType === 'notification' && data.read === false) {
            showLocalNotification(data.title || 'Notifica', data.body || '').catch(() => {});
          }
        }
      }
    }
    isFirstSnapshot = false;
  }, (error) => {
    console.warn('subscribeToUnreadCount error:', error);
    callback(0);
  });
};

export const markAsRead = async (notificationId: string): Promise<void> => {
  await updateDoc(doc(db, NOTIFICATIONS_COLLECTION, notificationId), { read: true });
};

export const markAllAsRead = async (userId: string): Promise<void> => {
  const q = query(
    collection(db, NOTIFICATIONS_COLLECTION),
    where('userId', '==', userId)
  );
  const snapshot = await getDocs(q);
  const unreadDocs = snapshot.docs.filter(
    (d) => d.data().docType === 'notification' && d.data().read === false
  );
  const batch = writeBatch(db);
  for (const d of unreadDocs) {
    batch.update(d.ref, { read: true });
  }
  if (unreadDocs.length > 0) await batch.commit();
};

export const deleteNotification = async (notificationId: string): Promise<void> => {
  await deleteDoc(doc(db, NOTIFICATIONS_COLLECTION, notificationId));
};

export const getNotificationIcon = (type: NotificationType): string => {
  switch (type) {
    case 'payment_due':
    case 'payment_reminder_15days':
    case 'payment_reminder_week':
    case 'payment_reminder_3days':
    case 'payment_reminder_1day':
      return 'card';
    case 'session_reminder':
      return 'calendar';
    case 'new_program':
    case 'workout_renewal':
      return 'fitness';
    case 'new_message':
      return 'chatbubble';
    case 'session_cancelled':
      return 'close-circle';
    case 'new_content':
      return 'folder-open';
    case 'custom_alert':
      return 'megaphone';
    case 'badge_milestone':
      return 'trophy';
    default:
      return 'notifications';
  }
};

export const getNotificationColor = (type: NotificationType): string => {
  switch (type) {
    case 'payment_due':
      return '#FF453A';
    case 'payment_reminder_15days':
    case 'payment_reminder_week':
    case 'payment_reminder_3days':
    case 'payment_reminder_1day':
      return '#FF9F0A';
    case 'session_cancelled':
      return '#FF453A';
    case 'custom_alert':
      return '#D40000';
    case 'badge_milestone':
      return '#FFD700';
    case 'new_content':
    case 'new_program':
    case 'workout_renewal':
      return '#34C759';
    case 'new_message':
      return '#64D2FF';
    default:
      return '#8E8E93';
  }
};
