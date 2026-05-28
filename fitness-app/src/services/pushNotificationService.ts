import { Platform } from 'react-native';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

let Notifications: any = null;

if (Platform.OS !== 'web') {
  try {
    Notifications = require('expo-notifications');
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch {}
}

const isWeb = Platform.OS === 'web';

const webNotificationsSupported = (): boolean => {
  if (!isWeb) return false;
  return typeof window !== 'undefined' && 'Notification' in window;
};

const webBadgeSupported = (): boolean => {
  if (!isWeb) return false;
  return typeof navigator !== 'undefined' && 'setAppBadge' in navigator;
};

export const requestNotificationPermissions = async (): Promise<boolean> => {
  if (isWeb) {
    if (!webNotificationsSupported()) return false;
    try {
      if (Notification.permission === 'granted') return true;
      if (Notification.permission === 'denied') return false;
      const result = await Notification.requestPermission();
      return result === 'granted';
    } catch {
      return false;
    }
  }
  if (!Notifications) return false;
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
};

export const registerPushToken = async (userId: string): Promise<string | null> => {
  if (isWeb) {
    await requestNotificationPermissions();
    return null;
  }
  if (!Notifications) return null;
  try {
    const granted = await requestNotificationPermissions();
    if (!granted) return null;
    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData.data;
    await updateDoc(doc(db, 'users', userId), { pushToken: token }).catch(() => {});
    return token;
  } catch {
    return null;
  }
};

export const showLocalNotification = async (
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<void> => {
  if (isWeb) {
    if (!webNotificationsSupported()) return;
    try {
      if (Notification.permission !== 'granted') return;
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        await reg.showNotification(title, {
          body,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          data: data || {},
          tag: 'essere-' + Date.now(),
          renotify: true,
          vibrate: [200, 100, 200],
        });
      } else {
        new Notification(title, { body, icon: '/icon-192.png' });
      }
    } catch {}
    return;
  }
  if (!Notifications) return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, data: data || {}, sound: 'default' },
      trigger: null,
    });
  } catch {}
};

export const updateBadgeCount = async (count: number): Promise<void> => {
  if (isWeb) {
    if (!webBadgeSupported()) return;
    try {
      if (count > 0) {
        await (navigator as any).setAppBadge(count);
      } else {
        await (navigator as any).clearAppBadge();
      }
    } catch {}
    return;
  }
  if (!Notifications) return;
  try {
    await Notifications.setBadgeCountAsync(count);
  } catch {}
};
