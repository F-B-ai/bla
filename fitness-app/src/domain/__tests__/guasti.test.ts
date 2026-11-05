import fs from 'fs';
import path from 'path';
import {
  ripulisci, componiGuasto, schermataGuasto, passeggero,
  MAX_MESSAGGIO, MAX_TRACCIA, TENTATIVI,
} from '../guasti';

// ============================================================
// IL GUASTO CHE NON SI RACCONTA
// ------------------------------------------------------------
// 23 e 24 settembre 2026: l'App non parte, due volte, e tutte e due
// le volte torna a funzionare senza che nessuno sappia perché.
// L'unica informazione esistente al mondo era un messaggio del
// titolare che diceva «non carica».
// ============================================================

describe('che cosa NON finisce nel registro', () => {
  it('gli indirizzi email spariscono', () => {
    expect(ripulisci('errore per mario.rossi@gmail.com'))
      .toBe('errore per [indirizzo]');
  });

  it('i numeri di telefono spariscono', () => {
    expect(ripulisci('chiamare 333 1234567')).toContain('[numero]');
    expect(ripulisci('chiamare 333 1234567')).not.toContain('1234567');
  });

  it('le chiavi spariscono, anche nude', () => {
    expect(ripulisci('api_key: sk-ant-abc123xyz')).toContain('[chiave]');
    expect(ripulisci('token=QWERTY')).toContain('[chiave]');
    // Una chiave vera ha il miscuglio: maiuscole, minuscole e cifre.
    const chiave = 'a1b2C3d4e5f6G7h8i9j0k1L2m3n4o5p6';
    expect(ripulisci('bundle ' + chiave)).toContain('[codice]');
    // E una parola lunga qualsiasi NON è una chiave: nel pacchetto
    // offuscato i nomi delle funzioni sono lunghi, e servono a capire.
    const nome = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    expect(ripulisci('at ' + nome)).toContain(nome);
  });

  // Si sostituisce invece di cancellare: sapere CHE c'era un
  // indirizzo aiuta a capire, e non dice di chi era.
  it('resta il contesto attorno a ciò che si toglie', () => {
    const r = ripulisci('login fallito per tizio@x.it durante il salvataggio');
    expect(r).toContain('login fallito');
    expect(r).toContain('durante il salvataggio');
  });

  it('un testo vuoto o assente non manda in errore la ripulitura', () => {
    expect(ripulisci('')).toBe('');
    expect(ripulisci(null)).toBe('');
    expect(ripulisci(undefined)).toBe('');
  });
});

describe('il rapporto si compone sempre', () => {
  // Un registro dei guasti che si guasta sarebbe una beffa.
  it('qualunque cosa arrivi, ne esce un rapporto valido', () => {
    [new Error('x'), 'stringa', null, undefined, 42, {}, { message: 'm' }]
      .forEach((e) => {
        const g = componiGuasto({ errore: e });
        expect(typeof g.messaggio).toBe('string');
        expect(g.messaggio.length).toBeGreaterThan(0);
        expect(g.quando instanceof Date).toBe(true);
      });
  });

  it('un errore senza messaggio lo dice, invece di restare vuoto', () => {
    expect(componiGuasto({ errore: {} }).messaggio).toBe('Errore senza messaggio');
  });

  it('i campi mancanti diventano «sconosciuta», non stringhe vuote', () => {
    const g = componiGuasto({ errore: new Error('x') });
    expect(g.schermata).toBe('sconosciuta');
    expect(g.versione).toBe('sconosciuta');
    expect(g.ruolo).toBe('sconosciuto');
  });

  it('messaggi e tracce lunghissime si accorciano, e lo dicono', () => {
    const g = componiGuasto({ errore: new Error('x'.repeat(5000)) });
    expect(g.messaggio.length).toBeLessThan(MAX_MESSAGGIO + 60);
    expect(g.messaggio).toContain('altri');
    expect(MAX_TRACCIA).toBeGreaterThan(MAX_MESSAGGIO);
  });

  it('la ripulitura vale anche dentro la traccia tecnica', () => {
    const e = new Error('ops');
    e.stack = 'Error: ops\n  at tizio@x.it';
    expect(componiGuasto({ errore: e }).traccia).not.toContain('tizio@x.it');
  });
});

describe('che cosa legge chi è davanti allo schermo', () => {
  const g = componiGuasto({ errore: new Error('Cannot read property x'), schermata: 'Agenda' });
  const s = schermataGuasto(g);

  // «Ho dovuto fingere che era andata bene»: la frase dev'essere
  // leggibile davanti a un allievo seduto accanto.
  it('dice che il resto funziona e che si può riprovare', () => {
    expect(s.testo).toContain('resto dell\'App funziona');
    expect(s.azione).toBe('Riprova');
  });

  it('non è un allarme e non dà la colpa a chi guarda', () => {
    const tutto = (s.titolo + ' ' + s.testo).toLowerCase();
    ['grave', 'critico', 'fatale', 'errore grave', 'hai sbagliato'].forEach((p) =>
      expect(tutto).not.toContain(p));
  });

  it('il dettaglio tecnico c\'è, ma non è la prima cosa', () => {
    expect(s.dettaglio).toContain('Cannot read property x');
    expect(s.titolo).not.toContain('Cannot read');
    expect(s.dettaglio).toContain('Agenda');
  });

  it('dice che il guasto è già registrato: nessuno deve trascriverlo', () => {
    expect(s.testo).toContain('registrato');
  });
});

describe('i guasti passeggeri', () => {
  it('rete, attese e server occupato: vale la pena riprovare', () => {
    ['Network request failed', 'timeout', 'Failed to fetch', 'Service unavailable',
     'Errore API (503)', 'too many requests'].forEach((m) =>
      expect(passeggero(new Error(m))).toBe(true));
  });

  // Riprovare non migliora una chiave sbagliata: si dice subito
  // com'è, invece di far aspettare due volte per lo stesso no.
  it('permessi, chiavi e dati non validi: si dice subito', () => {
    ['permission-denied', 'Chiave API non valida', 'Unauthorized',
     'malformed request'].forEach((m) =>
      expect(passeggero(new Error(m))).toBe(false));
  });

  it('un errore senza messaggio non si riprova alla cieca', () => {
    expect(passeggero(null)).toBe(false);
    expect(passeggero(new Error(''))).toBe(false);
  });

  it('due tentativi, non una raffica', () => {
    expect(TENTATIVI).toBe(2);
  });
});

// ------------------------------------------------------------
// CHE SIA DAVVERO COLLEGATO
// ------------------------------------------------------------

const leggi = (p: string) =>
  fs.readFileSync(path.join(__dirname, '..', '..', p), 'utf8');
const radice = (p: string) =>
  fs.readFileSync(path.join(__dirname, '..', '..', '..', p), 'utf8');

describe('il riparo registra e lascia riprovare', () => {
  const app = leggi('App.tsx');

  // I due buchi del riparo precedente.
  it('registra: prima l\'errore spariva con la schermata', () => {
    expect(app).toContain('componentDidCatch');
    expect(app).toContain('registraGuasto');
  });

  it('si può riprovare: prima l\'unica uscita era chiudere l\'App', () => {
    expect(app).toContain('TouchableOpacity');
    expect(app).toMatch(/setState\(\{\s*guasto:\s*null\s*\}\)/);
  });

  it('non mostra più il messaggio tecnico grezzo come prima cosa', () => {
    expect(app).toContain('schermataGuasto');
    // e i colori vengono dalla palette, non scritti a mano qui dentro
    expect(app).toContain('colors.background');
    expect(app).not.toMatch(/errorTitle:\s*\{[^}]*color:\s*'#/);
  });

  it('e se la registrazione fallisce non rompe la schermata', () => {
    expect(app).toMatch(/registraGuasto\([^)]*\)[\s\S]{0,40}\.catch\(/);
  });
});

describe('il registro non diventa un secondo problema', () => {
  const regole = radice('firestore.rules');
  const blocco = regole.slice(regole.indexOf('match /guasti/'));

  it('chi subisce un guasto lo può scrivere', () => {
    expect(blocco).toMatch(/allow create: if isAuthenticated\(\);/);
  });

  // Un registro che si può correggere non è un registro.
  it('nessuno lo modifica e nessuno lo cancella dall\'App', () => {
    expect(blocco).toMatch(/allow update: if false;/);
    expect(blocco).toMatch(/allow delete: if false;/);
  });

  it('lo legge solo il titolare', () => {
    expect(blocco).toMatch(/allow read: if isOwner\(\);/);
  });
});

describe('l\'AI riprova da sola prima di disturbare', () => {
  const ai = leggi('services/aiService.ts');

  it('il tentativo in più sta nel punto da cui passano tutte le funzioni', () => {
    expect(ai).toContain('callClaudeUnaVolta');
    expect(ai).toMatch(/tentativo <= TENTATIVI/);
  });

  it('riprova solo i guasti passeggeri', () => {
    expect(ai).toMatch(/!passeggero\(e\)\) break/);
  });

  it('l\'errore vero non si perde per strada', () => {
    expect(ai).toContain('throw ultimo');
  });

  // Se il secondo tentativo riesce, a chi lavora non risulta niente —
  // ma nel registro resta, perché è lì che si vede il peggioramento.
  it('il tentativo fallito finisce nel registro anche se il secondo riesce', () => {
    expect(ai).toMatch(/registraGuasto\(\{[\s\S]{0,200}tentativo/);
  });
});
