import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const requestNotificationPermissions = async (): Promise<boolean> => {
  if (Platform.OS === 'web') return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
};

export const registerPushToken = async (userId: string): Promise<string | null> => {
  if (Platform.OS === 'web') return null;
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
  if (Platform.OS === 'web') return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: 'default',
      },
      trigger: null,
    });
  } catch {}
};

export const updateBadgeCount = async (count: number): Promise<void> => {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.setBadgeCountAsync(count);
  } catch {}
};
