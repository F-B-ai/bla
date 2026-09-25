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
// I header di hosting fanno parte del meccanismo di aggiornamento tanto
// quanto lo script: se `/sw.js` si serve con una cache lunga, lo script
// non viene mai interpellato.
const firebase = JSON.parse(
  fs.readFileSync(path.join(radice, 'firebase.json'), 'utf8')
);

// I commenti nominano apposta il difetto vecchio, per spiegarlo. Il
// test guarda il CODICE: senza questa riga cadrebbe su una spiegazione.
// Anche i commenti HTML: in web/index.html il racconto di che cosa non
// funzionava sta fra <!-- e -->, e nomina il codice che non c'è più.
const senzaCommenti = (t: string): string =>
  t
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

const html = senzaCommenti(htmlGrezzo);

// Solo il pezzo che viene davvero iniettato in produzione.
const iniettato = (() => {
  const m = postbuild.match(/const swScript = `[\s\S]*?`;/);
  return m ? m[0] : '';
})();

describe('lo script di aggiornamento esiste dove serve', () => {
  it('la copia iniettata in produzione c\'è', () => {
    expect(iniettato.length).toBeGreaterThan(200);
    expect(iniettato).toContain("register('/sw.js'");
  });

  it('e la copia leggibile pure', () => {
    expect(html).toContain("register('/sw.js'");
  });

  // La guardia che decide se iniettare deve cercare un segno stabile.
  // Cercava il testo esatto `register('/sw.js')`: aggiungendo un
  // argomento alla register non lo riconosceva più, e avrebbe messo
  // nella pagina DUE script di aggiornamento.
  it('la guardia non si basa sulla firma della register', () => {
    const guardia = postbuild.match(/if \(!html\.includes\([^)]*\)\) \{\s*html = html\.replace\('<\/body>', swScript/);
    expect(guardia).not.toBeNull();
    expect(guardia![0]).toContain('essere-aggiornamento');
    expect(guardia![0]).not.toContain("register('/sw.js')");
  });
});

// ============================================================
// «NON HO VISTO LA SCRITTA AGGIORNAMENTO» — 13 settembre 2026
// ------------------------------------------------------------
// Il meccanismo era giusto e non veniva MAI interpellato. Il
// browser controlla se c'è un service worker nuovo rileggendo
// `/sw.js` dalla PROPRIA cache HTTP — e `/sw.js` veniva servito
// con «immutable, un anno», perché in firebase.json la regola
// `**/*.js` stava DOPO quella specifica e la sovrascriveva.
// Ogni `reg.update()` rileggeva gli stessi byte vecchi.
// ============================================================

describe('il browser deve poter VEDERE una versione nuova', () => {
  it('il controllo non passa mai dalla cache HTTP', () => {
    [iniettato, html].forEach((c) => expect(c).toContain('updateViaCache'));
    [iniettato, html].forEach((c) => expect(c).toMatch(/updateViaCache['"]?\s*:\s*'none'/));
  });

  it('e il service worker non si serve con una cache lunga', () => {
    const regole = firebase.hosting.headers as Array<{
      source: string;
      headers: Array<{ key: string; value: string }>;
    }>;
    // Vince l'ultima regola che combacia: quella di `sw.js` deve stare
    // DOPO `**/*.js`, altrimenti il service worker eredita «un anno».
    const indice = (s: string) => regole.findIndex((r) => r.source === s);
    const js = indice('**/*.js');
    const sw = Math.max(indice('sw.js'), indice('/sw.js'));
    expect(js).toBeGreaterThanOrEqual(0);
    expect(sw).toBeGreaterThan(js);

    const cacheDi = (s: string) => regole
      .filter((r) => r.source === s)
      .flatMap((r) => r.headers)
      .filter((h) => h.key.toLowerCase() === 'cache-control')
      .map((h) => h.value);
    expect(cacheDi('/sw.js').join(' ')).toContain('no-store');
  });

  it('il documento dell\'App non resta in cache un\'ora', () => {
    const generica = (firebase.hosting.headers as Array<{
      source: string; headers: Array<{ key: string; value: string }>;
    }>).find((r) => r.source === '**');
    const cc = generica?.headers.find((h) => h.key.toLowerCase() === 'cache-control');
    expect(cc?.value).toContain('no-store');
  });

  it('ma i file con l\'impronta nel nome restano immutable', () => {
    const js = (firebase.hosting.headers as Array<{
      source: string; headers: Array<{ key: string; value: string }>;
    }>).find((r) => r.source === '**/*.js');
    const cc = js?.headers.find((h) => h.key.toLowerCase() === 'cache-control');
    expect(cc?.value).toContain('immutable');
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

// ============================================================
// «L'APP NON SI APRE, SCHERMO NERO» — 23 settembre 2026
// ------------------------------------------------------------
// Poco dopo una pubblicazione. Il service worker faceva
// `skipWaiting()` appena installato: prendeva il comando di un'App
// APERTA e un istante dopo cancellava le cache vecchie. A una
// pagina viva veniva tolto il pavimento da sotto.
//
// L'avviso «c'è una versione nuova» esisteva già, e non faceva mai
// in tempo a comparire: il ricambio avveniva prima che ci fosse
// qualcosa da toccare.
// ============================================================

const sw = fs.readFileSync(path.join(radice, 'web', 'sw.js'), 'utf8');

describe('la versione nuova aspetta il suo turno', () => {
  const swPulito = senzaCommenti(sw);

  it('il service worker NON prende il comando da solo', () => {
    // `skipWaiting` può esistere solo dentro il gestore dei messaggi,
    // cioè quando è la pagina a chiederlo. Mai nell'install.
    const install = swPulito.match(/addEventListener\('install'[\s\S]*?\n\}\);/);
    expect(install).not.toBeNull();
    expect(install![0]).not.toContain('skipWaiting');
  });

  it('passa avanti solo se glielo chiede la pagina', () => {
    expect(swPulito).toContain("'SKIP_WAITING'");
    expect(swPulito).toMatch(/addEventListener\('message'/);
  });

  it('e la pagina lo chiede quando qualcuno tocca l\'avviso', () => {
    [iniettato, html].forEach((c) => {
      expect(c).toContain('SKIP_WAITING');
      expect(c).toContain('postMessage');
      // Si ricarica quando il ricambio è avvenuto davvero.
      expect(c).toContain('controllerchange');
    });
  });
});

describe('se malgrado tutto la schermata resta vuota', () => {
  // Il difetto che ha permesso allo schermo nero di restare nero: la
  // rete di sicurezza esisteva SOLO nella copia leggibile. Expo non
  // usa web/index.html come sorgente — in produzione finisce solo ciò
  // che postbuild-web.js inietta. Per mesi abbiamo creduto attiva una
  // protezione che sul sito vero non c'era.
  it('la riparazione sta nella copia che finisce in produzione', () => {
    expect(iniettato).toContain('riparaUnaVolta');
    expect(iniettato).toContain("getElementById('root')");
  });

  it('guarda se la schermata è piena, non un segnale da ricordarsi', () => {
    // `__markAppLoaded` si fidava di una chiamata che l'App doveva
    // fare. Se l'App moriva prima, il segnale non arrivava; se la
    // funzione non c'era, non serviva a niente. Adesso: il DOM.
    [iniettato, html].forEach((c) => expect(c).toContain('childElementCount'));
    expect(postbuild).not.toContain('__markAppLoaded');
    expect(html).not.toContain('__markAppLoaded');
  });

  it('ricarica una volta sola: un giro infinito è peggio del nero', () => {
    [iniettato, html].forEach((c) => {
      expect(c).toContain('sessionStorage');
      expect(c).toMatch(/setItem\(SEGNO/);
    });
  });

  it('e ricarica lo stesso se le pulizie si piantano', () => {
    // Il difetto della rete vecchia: nessun catch. Se `caches.keys()`
    // rigettava, la catena moriva zitta e lo schermo restava nero.
    [iniettato, html].forEach((c) => {
      expect(c).toMatch(/\.then\(ricarica\)\s*\.catch\(ricarica\)/);
      expect(c).toMatch(/setTimeout\(ricarica,\s*4000\)/);
    });
  });
});

describe('le due copie non divergono', () => {
  // Non si confrontano carattere per carattere — una è minificata.
  // Si confronta che facciano le stesse cose.
  const segni = [
    "register('/sw.js'",
    'updateViaCache',
    'updatefound',
    'statechange',
    'visibilitychange',
    'essere-aggiornamento',
    'location.reload',
    '60000',
    // Aggiunti il 23 settembre 2026: sono esattamente i pezzi che
    // stavano in una copia sola, ed è così che è nato lo schermo nero.
    'SKIP_WAITING',
    'controllerchange',
    'riparaUnaVolta',
    'childElementCount',
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
