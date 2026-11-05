import fs from 'fs';
import path from 'path';
import { istruzioniPonte } from '../domain/ponteCal';

// ============================================================
// LE DUE PORTE DEL BOT
// ------------------------------------------------------------
// /v1/cal        → scrive richieste in coda (non crea appuntamenti)
// /v1/cal/liberi → LEGGE gli spazi liberi, e basta
//
// Sono due funzioni diverse apposta: quella che legge non può
// scrivere, e quella che scrive non legge. Se le rotte si
// confondessero, il confine sparirebbe senza che nessuno se ne
// accorga — e il titolare ha chiesto esattamente quel confine.
// ============================================================

const radice = path.join(__dirname, '..', '..');
const firebase = JSON.parse(
  fs.readFileSync(path.join(radice, 'firebase.json'), 'utf8')
);
const cal = fs.readFileSync(
  path.join(radice, 'functions', 'src', 'cal.ts'), 'utf8'
);

// ------------------------------------------------------------
// DUE SPAZI DI PUBBLICAZIONE, NON UNO
// ------------------------------------------------------------
// Dal 15 ottobre 2026 il progetto pubblica due cose: l'applicazione
// (sito «essere-3fe6f») e il sito pubblico di mindmovementlab.it
// (sito «mindmovementlab»). In firebase.json `hosting` è quindi un
// elenco, e queste regole riguardano SOLO l'applicazione: prenderne
// un'altra significherebbe controllare le intestazioni del sito
// vetrina credendo di controllare quelle dell'app.
const hostingApp = (() => {
  const h = (firebase as { hosting: unknown }).hosting;
  const elenco = Array.isArray(h) ? h : [h];
  const app = (elenco as Array<{ site?: string; public?: string }>)
    .find((x) => x.site === 'essere-3fe6f' || x.public === 'dist');
  if (!app) throw new Error('firebase.json: manca lo spazio dell\'applicazione');
  return app as {
    rewrites: Array<{ source: string; function?: { functionId: string }; destination?: string }>;
    headers: Array<{ source: string; headers: Array<{ key: string; value: string }> }>;
  };
})();

const rewrites = hostingApp.rewrites;

const indice = (s: string) => rewrites.findIndex((r) => r.source === s);

describe('le rotte esistono e vanno alla funzione giusta', () => {
  it('scrivere passa da calIngest', () => {
    expect(rewrites[indice('/v1/cal')]?.function?.functionId).toBe('calIngest');
  });

  it('leggere passa da calLiberi', () => {
    expect(rewrites[indice('/v1/cal/liberi')]?.function?.functionId)
      .toBe('calLiberi');
  });

  // Vince la PRIMA rotta che combacia: se «/v1/cal» stesse davanti,
  // la lettura rischierebbe di finire nella porta che scrive.
  it('la rotta più specifica sta davanti', () => {
    expect(indice('/v1/cal/liberi')).toBeGreaterThanOrEqual(0);
    expect(indice('/v1/cal/liberi')).toBeLessThan(indice('/v1/cal'));
  });

  it('e il catch-all dell\'App resta ultimo', () => {
    expect(rewrites[rewrites.length - 1].source).toBe('**');
  });
});

describe('chi legge non scrive', () => {
  // La funzione che legge gli spazi non deve toccare niente.
  const liberi = cal.slice(cal.indexOf('export const calLiberi'));

  it('calLiberi non crea, non aggiorna, non cancella', () => {
    ['.add(', '.set(', '.update(', '.delete('].forEach((v) =>
      expect(liberi).not.toContain(v));
  });

  it('e non fa uscire nomi né telefoni: soltanto ore', () => {
    ['persona', 'telefono', 'whatsapp', 'studentId', 'note']
      .forEach((c) => expect(liberi).not.toContain(`x.${c}`));
  });

  it('la risposta porta con sé il limite, insieme ai dati', () => {
    expect(liberi).toContain('AVVISO_SOLA_LETTURA');
  });
});

describe('le istruzioni che il titolare inoltra', () => {
  // Il pulsante «Copia chiave e istruzioni» deve consegnare il ponte
  // INTERO: se descrive solo metà, chi esegue usa solo metà.
  const testo = istruzioniPonte('https://essere-3fe6f.web.app', 'CHIAVE-DI-PROVA');

  it('parlano di tutte e due le porte', () => {
    expect(testo).toContain('/v1/cal/liberi');
    expect(testo).toMatch(/POST\s+\S+\/v1\/cal\b/);
  });

  it('portano la chiave, una volta sola da incollare', () => {
    expect(testo).toContain('CHIAVE-DI-PROVA');
  });

  it('e la regola della giornata, con i tre orari', () => {
    ['09:00', '17:30', '19:30'].forEach((o) => expect(testo).toContain(o));
  });

  // Il limite che il titolare ha messo per primo.
  it('dicono a chiare lettere che nessuna porta crea appuntamenti', () => {
    expect(testo).toContain('Nessuna delle due crea appuntamenti');
    expect(testo).toContain('RICHIESTE IN ATTESA');
  });

  it('e vietano di dire alla persona che è fatta', () => {
    expect(testo).toContain('NON dire mai che l\'appuntamento è preso');
  });

  it('spiegano che dalla lettura non escono nomi né telefoni', () => {
    expect(testo).toContain('SOLO ore');
  });
});

describe('la regola della giornata non è scritta qui', () => {
  // Vive in src/domain/orariStudio.ts, copiata a ogni build da
  // copy-domain.js. Una copia a mano divergerebbe.
  it('cal.ts importa gli orari dal dominio condiviso', () => {
    expect(cal).toContain('./domain/orariStudio');
  });

  it('e non riscrive i numeri per conto suo', () => {
    const liberi = cal.slice(cal.indexOf('export const calLiberi'));
    expect(liberi).not.toContain("'09:00'");
    expect(liberi).not.toContain("'17:30'");
    expect(liberi).not.toContain("'19:30'");
  });

  it('il file è nell\'elenco di quelli copiati', () => {
    const copia = fs.readFileSync(
      path.join(radice, 'functions', 'copy-domain.js'), 'utf8'
    );
    expect(copia).toContain('orariStudio.ts');
  });
});

// ============================================================
// I DUE SPAZI DI PUBBLICAZIONE — 15 ottobre 2026
// ------------------------------------------------------------
// Il dominio mindmovementlab.it è stato comprato, e il sito non
// poteva andare sullo spazio dell'applicazione: lì la radice «/» è
// l'app, e chi digitasse il dominio troverebbe una schermata di
// accesso invece del sito.
//
// Da qui in poi i due spazi non devono mescolarsi: è il genere di
// errore che non dà nessun segnale — tutto «funziona», solo che
// mostra la cosa sbagliata a chi arriva.
// ============================================================

describe('l\'applicazione e il sito pubblico restano separati', () => {
  const spazi = (() => {
    const h = (firebase as { hosting: unknown }).hosting;
    return (Array.isArray(h) ? h : [h]) as Array<{ site?: string; public?: string }>;
  })();

  it('sono due, e ciascuno ha il suo nome', () => {
    expect(spazi).toHaveLength(2);
    expect(spazi.map((s) => s.site).sort())
      .toEqual(['essere-3fe6f', 'mindmovementlab']);
  });

  it('pubblicano cartelle diverse', () => {
    const app = spazi.find((s) => s.site === 'essere-3fe6f');
    const sito = spazi.find((s) => s.site === 'mindmovementlab');
    expect(app?.public).toBe('dist');
    expect(sito?.public).toBe('sito-dist');
  });

  it('il sito pubblico NON ha il catch-all dell\'applicazione', () => {
    // Se ce l'avesse, qualunque indirizzo sbagliato del sito
    // restituirebbe l'applicazione: il visitatore che sbaglia a
    // digitare una pagina finirebbe sulla schermata di accesso.
    const sito = spazi.find((s) => s.site === 'mindmovementlab') as {
      rewrites?: Array<{ source: string }>;
    };
    expect(sito.rewrites).toBeUndefined();
  });
});
