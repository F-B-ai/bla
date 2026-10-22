// ============================================================
// LA NOTIFICA CHE ARRIVA ANCHE CON L'APP CHIUSA
// ------------------------------------------------------------
// Il titolare, il 22 ottobre 2026: «e ad ogni richiesta di visita,
// posso avere una notifica».
//
// Dentro l'applicazione l'avviso c'era già. Ma lo si vedeva solo
// aprendo — e chi apre l'app per controllare se c'è qualcosa da fare,
// di solito, è chi già sospetta che ci sia. Le richieste che arrivano
// mentre il telefono è in tasca aspettavano che qualcuno si
// ricordasse di guardare.
//
// Mancavano i due pezzi in mezzo, e qui si controlla che ci siano
// entrambi: il telefono che si iscrive, e il server che bussa. Uno
// solo dei due non serve a niente, ed è il modo più facile di avere
// una funzione che sembra fatta e non arriva mai.
// ============================================================

import fs from 'fs';
import path from 'path';

const leggi = (relativo: string): string =>
  fs.readFileSync(path.join(__dirname, '..', '..', relativo), 'utf8');

const leggiFunzioni = (relativo: string): string =>
  fs.readFileSync(path.join(__dirname, '..', '..', '..', 'functions', relativo), 'utf8');

describe('la chiave sta dove stanno le altre impostazioni', () => {
  const marchio = leggi('config/brand.ts');

  it('c\'è, ed è quella dei certificati push web', () => {
    expect(marchio).toMatch(/vapidKey: 'B[A-Za-z0-9_-]{80,}'/);
  });

  it('e sta accanto alla configurazione Firebase, non sparsa altrove', () => {
    expect(marchio.indexOf('vapidKey')).toBeGreaterThan(marchio.indexOf('messagingSenderId'));
  });
});

describe('il telefono si iscrive', () => {
  const push = leggi('services/pushNotificationService.ts');

  it('chiede un indirizzo a Firebase e lo scrive sulla scheda della persona', () => {
    expect(push).toMatch(/getToken\(getMessaging\(\)/);
    expect(push).toMatch(/vapidKey: chiave/);
    expect(push).toMatch(/updateDoc\(doc\(db, 'users', userId\), \{ pushToken: token \}\)/);
  });

  it('riusa il service worker che l\'app ha già', () => {
    // due service worker sullo stesso sito litigano per chi mostra la
    // notifica: esce doppia, o non esce
    expect(push).toMatch(/serviceWorkerRegistration: registrazione/);
    expect(push).not.toMatch(/firebase-messaging-sw/);
  });

  it('non si iscrive senza permesso, e non insiste', () => {
    const i = push.indexOf('const registraIndirizzoWeb');
    const blocco = push.slice(i, i + 700);
    expect(blocco).toMatch(/getNotificationStatus\(\) !== 'granted'/);
  });

  it('e se non riesce non rompe l\'avvio: entrare viene prima', () => {
    const i = push.indexOf('const registraIndirizzoWeb');
    const blocco = push.slice(i, push.indexOf('export const registerPushToken'));
    expect(blocco).toMatch(/catch \{/);
    expect(blocco).toMatch(/return null;/);
  });

  it('l\'iscrizione parte davvero: non è una funzione scritta e mai chiamata', () => {
    expect(push).toMatch(/return registraIndirizzoWeb\(userId\);/);
  });
});

describe('il server bussa', () => {
  const fn = leggiFunzioni('src/avvisi.ts');
  const indice = leggiFunzioni('src/index.ts');

  it('parte da sola appena nasce un avviso', () => {
    expect(fn).toMatch(/onDocumentCreated\(/);
    expect(fn).toMatch(/document: "notifications\/\{avvisoId\}"/);
  });

  it('ed è esportata: una funzione non esportata non viene pubblicata', () => {
    expect(indice).toMatch(/export \{avvisaSulTelefono\} from ".\/avvisi";/);
  });

  it('manda dati, non una notifica pronta: la disegna il nostro service worker', () => {
    expect(fn).toMatch(/data: \{/);
    expect(fn).not.toMatch(/notification: \{/);
  });

  it('senza indirizzo non fa niente, e non è un guasto', () => {
    expect(fn).toMatch(/if \(!token\) return;/);
  });

  // L'avviso dentro l'app è già salvato quando questa funzione parte.
  // Un errore che si propaga farebbe riprovare all'infinito per un
  // telefono che non esiste più.
  it('un telefono irraggiungibile non fa fallire niente', () => {
    expect(fn).toMatch(/logger\.warn\(/);
    expect(fn).not.toMatch(/throw /);
  });

  it('e un indirizzo scaduto si cancella invece di essere ritentato per sempre', () => {
    expect(fn).toMatch(/INDIRIZZI_MORTI/);
    expect(fn).toMatch(/FieldValue\.delete\(\)/);
  });
});

describe('il service worker sa mostrarla', () => {
  const sw = fs.readFileSync(
    path.join(__dirname, '..', '..', '..', 'public', 'sw.js'), 'utf8'
  );

  it('ascolta i push e legge gli stessi campi che il server manda', () => {
    expect(sw).toMatch(/addEventListener\('push'/);
    expect(sw).toMatch(/data\.title/);
    expect(sw).toMatch(/data\.body/);
  });

  it('e toccandola si apre l\'app invece di non succedere niente', () => {
    expect(sw).toMatch(/addEventListener\('notificationclick'/);
    expect(sw).toMatch(/clients\.openWindow/);
  });
});
