import { Platform } from 'react-native';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { brand } from '../config/brand';
import { CondizioniAvvisi } from '../domain/avvisoTelefono';

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

const isIOSWeb = (): boolean => {
  if (!isWeb || typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

const isStandalonePWA = (): boolean => {
  if (typeof window === 'undefined') return false;
  return (window as any).navigator?.standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches;
};

export const getNotificationStatus = (): 'granted' | 'denied' | 'default' | 'unsupported' => {
  if (!isWeb) return 'unsupported';
  if (!webNotificationsSupported()) return 'unsupported';
  if (isIOSWeb() && !isStandalonePWA()) return 'unsupported';
  return Notification.permission as 'granted' | 'denied' | 'default';
};

export const requestNotificationPermissions = async (): Promise<boolean> => {
  if (isWeb) {
    if (!webNotificationsSupported()) return false;
    if (isIOSWeb() && !isStandalonePWA()) return false;
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

/**
 * L'indirizzo a cui il server può bussare.
 *
 * 22 ottobre 2026. Fino a oggi, sul telefono, l'app chiedeva il
 * PERMESSO di mandare notifiche e poi non registrava niente: nessun
 * indirizzo, nessuno a cui mandarle. Il permesso c'era, la notifica
 * non arrivava mai, e sembrava una scelta.
 *
 * Qui si chiede a Firebase un indirizzo per questo telefono e lo si
 * scrive sulla scheda della persona. Da quel momento una funzione sul
 * server può raggiungerlo anche con l'app chiusa.
 *
 * Tre ragioni per cui può non succedere, e nessuna è un guasto:
 *  · su iPhone funziona SOLO con l'app installata dalla schermata
 *    home; da Safari il sistema non lo permette;
 *  · se la persona ha negato il permesso, non si insiste;
 *  · se il browser non sa fare i push, si esce e basta.
 * In tutti e tre i casi resta l'avviso dentro l'app, che c'è sempre.
 */
const registraIndirizzoWeb = async (userId: string): Promise<string | null> => {
  try {
    if (!webNotificationsSupported()) return null;
    if (getNotificationStatus() !== 'granted') return null;
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null;

    const { getMessaging, getToken, isSupported } = await import('firebase/messaging');
    if (!(await isSupported())) return null;

    const chiave = (brand as { vapidKey?: string }).vapidKey;
    if (!chiave) return null;

    // Si riusa il service worker che l'app ha già: due service worker
    // sullo stesso sito litigano per chi mostra la notifica, e ne
    // esce una doppia o nessuna.
    const sw = (navigator as { serviceWorker?: { ready: Promise<unknown> } }).serviceWorker;
    if (!sw) return null;
    const registrazione = await sw.ready;
    const token = await getToken(getMessaging(), {
      vapidKey: chiave,
      serviceWorkerRegistration: registrazione as never,
    });
    if (!token) return null;

    await updateDoc(doc(db, 'users', userId), { pushToken: token }).catch(() => {});
    return token;
  } catch {
    // Un indirizzo che non si riesce a prendere non deve rompere
    // l'avvio dell'app: la notifica è un di più, entrare è il minimo.
    return null;
  }
};

/**
 * Le condizioni vere di QUESTO telefono, lette adesso.
 *
 * Non si fida di niente di salvato: permesso, installazione e
 * indirizzo si rileggono ogni volta. Uno stato ricordato da ieri è
 * esattamente il modo in cui una schermata dice «tutto a posto»
 * mentre non arriva niente.
 */
export const condizioniAvvisi = async (): Promise<CondizioniAvvisi> => {
  const iOS = isIOSWeb();
  const installata = !iOS || isStandalonePWA();
  const supportato = webNotificationsSupported();

  let indirizzo = false;
  let motivo: string | undefined;

  if (supportato && getNotificationStatus() === 'granted') {
    try {
      const { getMessaging, getToken, isSupported } = await import('firebase/messaging');
      if (!(await isSupported())) {
        motivo = 'questo browser non supporta i messaggi Firebase';
      } else {
        const chiave = (brand as { vapidKey?: string }).vapidKey;
        const sw = (navigator as { serviceWorker?: { ready: Promise<unknown> } }).serviceWorker;
        if (!chiave) {
          motivo = 'manca la chiave dei certificati push';
        } else if (!sw) {
          motivo = 'service worker non disponibile';
        } else {
          const token = await getToken(getMessaging(), {
            vapidKey: chiave,
            serviceWorkerRegistration: (await sw.ready) as never,
          });
          indirizzo = !!token;
          if (!token) motivo = 'il sistema non ha restituito nessun indirizzo';
        }
      }
    } catch (err) {
      indirizzo = false;
      const e = err as { code?: string; message?: string };
      motivo = e?.code || e?.message || String(err);
    }
  }

  return {
    supportato,
    permesso: getNotificationStatus(),
    iOS,
    installata,
    indirizzo,
    motivo,
  };
};

export const registerPushToken = async (userId: string): Promise<string | null> => {
  if (isWeb) {
    if (webNotificationsSupported() && Notification.permission === 'default') {
      if (!isIOSWeb() || isStandalonePWA()) {
        await requestNotificationPermissions();
      }
    }
    return registraIndirizzoWeb(userId);
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
          silent: false,
        } as NotificationOptions);
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
