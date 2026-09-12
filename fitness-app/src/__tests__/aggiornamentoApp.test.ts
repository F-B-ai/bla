import fs from 'fs';
import path from 'path';

// ============================================================
// «IL TASTO NON C'È»
// ------------------------------------------------------------
// Il 12 settembre 2026 il titolare ha guardato una schermata senza il
// pulsante che gli avevo appena pubblicato. Il pulsante era in rete da
// nove minuti: era la sua App a eseguire ancora il codice vecchio.
//
// Il meccanismo di aggiornamento aveva due buchi:
//
//  1. `var hasController = !!navigator.serviceWorker.controller` si
//     leggeva UNA VOLTA, al caricamento. Se quel caricamento non aveva
//     un service worker attivo, la variabile restava falsa per sempre
//     e il ricaricamento non avveniva mai più.
//
//  2. il controllo girava solo su un timer da 60 secondi, e iOS
//     sospende i timer di una PWA in secondo piano.
//
// E lo script vive in DUE posti: `web/index.html` (leggibile) e
// `postbuild-web.js` (la copia minificata che finisce in produzione).
// Due copie divergono sempre, e quella che conta è la seconda.
// Questo test le tiene insieme.
// ============================================================

const radice = path.join(__dirname, '..', '..');
const htmlGrezzo = fs.readFileSync(path.join(radice, 'web', 'index.html'), 'utf8');
const postbuild = fs.readFileSync(path.join(radice, 'postbuild-web.js'), 'utf8');

// I commenti nominano apposta il difetto vecchio, per spiegarlo. Il
// test guarda il CODICE: senza questa riga cadrebbe su una spiegazione.
const senzaCommenti = (t: string): string =>
  t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const html = senzaCommenti(htmlGrezzo);

// Solo il pezzo che viene davvero iniettato in produzione.
const iniettato = (() => {
  const m = postbuild.match(/const swScript = `[\s\S]*?`;/);
  return m ? m[0] : '';
})();

describe('lo script di aggiornamento esiste dove serve', () => {
  it('la copia iniettata in produzione c\'è', () => {
    expect(iniettato.length).toBeGreaterThan(200);
    expect(iniettato).toContain("register('/sw.js')");
  });

  it('e la copia leggibile pure', () => {
    expect(html).toContain("register('/sw.js')");
  });
});

describe('i due buchi che hanno nascosto una versione nuova', () => {
  // Buco 1: la variabile letta una volta sola.
  it('`hasController` non esiste più in nessuna delle due copie', () => {
    expect(iniettato).not.toContain('hasController');
    expect(html).not.toContain('hasController');
  });

  it('il controllo si legge al momento, non al caricamento', () => {
    [iniettato, html].forEach((c) =>
      expect(c).toContain('navigator.serviceWorker.controller'));
  });

  // Buco 2: iOS sospende i timer in secondo piano.
  it('si controlla anche quando l\'App torna in primo piano', () => {
    [iniettato, html].forEach((c) => expect(c).toContain('visibilitychange'));
  });

  it('il controllo periodico resta, come rete di riserva', () => {
    [iniettato, html].forEach((c) => expect(c).toContain('60000'));
  });
});

describe('che cosa succede quando c\'è una versione nuova', () => {
  // Un ricaricamento a sorpresa mentre scrivi una scheda è peggio del
  // problema che risolve. Si dice, e decide la persona.
  it('compare un avviso, e NON si ricarica di nascosto', () => {
    [iniettato, html].forEach((c) => {
      expect(c).toContain('essere-aggiornamento');
      expect(c).toContain('versione nuova');
    });
  });

  it('l\'avviso si tocca e ricarica', () => {
    [iniettato, html].forEach((c) => {
      expect(c).toContain('addEventListener');
      expect(c).toContain('location.reload');
    });
  });

  it('e sta sopra a tutto, anche alla barra in basso', () => {
    expect(iniettato).toContain('z-index:2147483647');
    expect(iniettato).toContain('safe-area-inset-bottom');
  });
});

describe('le due copie non divergono', () => {
  // Non si confrontano carattere per carattere — una è minificata.
  // Si confronta che facciano le stesse cose.
  const segni = [
    "register('/sw.js')",
    'updatefound',
    'statechange',
    'visibilitychange',
    'essere-aggiornamento',
    'location.reload',
    '60000',
  ];

  it('ogni pezzo che conta sta in tutte e due', () => {
    const mancanti = segni.filter(
      (s) => !iniettato.includes(s) || !html.includes(s)
    );
    expect(mancanti).toEqual([]);
  });

  it('lo script iniettato compila', () => {
    const dentro = iniettato.match(/<script>([\s\S]*)<\/script>/);
    expect(dentro).not.toBeNull();
    // se non è JavaScript valido, questa riga esplode
    expect(() => new Function(dentro![1])).not.toThrow();
  });
});
