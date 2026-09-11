import fs from 'fs';
import path from 'path';
import {
  CARTELLE, PREFISSI, cartella, nomeCartella, sensibile,
  eNegato, spiegaScansione, EsitoScansione,
  leggiPercorso, descriviFile,
} from '../cartelleStorage';

// ============================================================
// «IMPOSSIBILE LEGGERE LO SPAZIO DI ARCHIVIAZIONE»
// ------------------------------------------------------------
// La schermata partiva dalla radice del bucket. Funzionava solo
// grazie al carattere jolly che concedeva tutto a chiunque fosse
// autenticato — la stessa regola che lasciava a ogni allievo le foto
// posturali di tutti gli altri. Chiusa quella, la radice non si
// elenca più, e la schermata è morta.
//
// Qui si verifica che l'elenco delle cartelle sia completo e che
// resti allineato alle regole vere, non a quello che ricordo io.
// ============================================================

describe('le cartelle che l\'App usa', () => {
  it('ognuna ha un nome leggibile e dice che cosa contiene', () => {
    CARTELLE.forEach((c) => {
      expect(c.id.length).toBeGreaterThan(2);
      expect(c.nome.length).toBeGreaterThan(3);
      expect(c.contenuto.length).toBeGreaterThan(25);
    });
  });

  it('nessun prefisso è ripetuto', () => {
    expect(new Set(PREFISSI).size).toBe(PREFISSI.length);
  });

  it('i dati del corpo sono marcati come sensibili', () => {
    ['postural', 'bia', 'bodycomp', 'nutritionTeam']
      .forEach((id) => expect(sensibile(id)).toBe(true));
    ['avatars', 'academy', 'content'].forEach((id) => expect(sensibile(id)).toBe(false));
  });

  it('una cartella sconosciuta tiene il suo nome invece di sparire', () => {
    expect(cartella('boh')).toBeUndefined();
    expect(nomeCartella('boh')).toBe('boh');
  });

  // La radice è precisamente ciò che non si chiede più.
  it('la radice non è nell\'elenco: è il difetto che abbiamo corretto', () => {
    expect(PREFISSI).not.toContain('');
    expect(PREFISSI.every((p) => p.length > 0)).toBe(true);
  });
});

// ============================================================
// IL TEST CHE GUARDA LE REGOLE VERE
// ------------------------------------------------------------
// Non basta che questo elenco sia bello: deve corrispondere alle
// cartelle dichiarate in storage.rules. Se domani se ne aggiunge una
// alle regole e ci si dimentica di questa schermata, quella cartella
// diventa spazio occupato che nessuno vede.
// ============================================================

describe('l\'elenco sta al passo con storage.rules', () => {
  const regole = fs.readFileSync(
    path.join(__dirname, '..', '..', '..', 'storage.rules'), 'utf8'
  );

  // ogni `match /qualcosa/...` di primo livello, escluso il jolly
  const dichiarate = [...regole.matchAll(/match\s+\/([A-Za-z][\w-]*)\//g)]
    .map((m) => m[1])
    .filter((n) => n !== 'b');

  it('storage.rules dichiara davvero delle cartelle (il test non gira a vuoto)', () => {
    expect(dichiarate.length).toBeGreaterThan(5);
  });

  it('ogni cartella delle regole è nell\'elenco della schermata', () => {
    const mancanti = [...new Set(dichiarate)].filter((n) => !PREFISSI.includes(n));
    expect(mancanti).toEqual([]);
  });

  it('e non ci sono cartelle inventate che le regole non conoscono', () => {
    const inventate = PREFISSI.filter((p) => !dichiarate.includes(p));
    expect(inventate).toEqual([]);
  });
});

// ============================================================
// «DI CHI SONO, NON MESSE COSÌ CHE IO DEVO INDOVINARE»
// ------------------------------------------------------------
// La schermata mostrava `front_1757606400000.jpg` dentro una cartella
// chiamata come un codice. Per sapere di chi fosse una foto serviva
// andarla a cercare altrove — quindi nessuno cancellava niente.
// ============================================================

describe('leggere un percorso dello Storage', () => {
  it('da una foto posturale ricava persona, vista e data', () => {
    const l = leggiPercorso('postural/abc123/side_left_1757606400000.jpg');
    expect(l.cartella).toBe('postural');
    expect(l.personaId).toBe('abc123');
    expect(l.vista).toBe('Laterale SX');
    expect(l.quando).toBeInstanceOf(Date);
  });

  it('riconosce tutte e quattro le viste', () => {
    const v = (n: string) => leggiPercorso(`postural/x/${n}_1757606400000.jpg`).vista;
    expect(v('front')).toBe('Frontale');
    expect(v('side_right')).toBe('Laterale DX');
    expect(v('back')).toBe('Posteriore');
  });

  it('un file senza vista nel nome non se la inventa', () => {
    const l = leggiPercorso('bia/abc123/referto.pdf');
    expect(l.personaId).toBe('abc123');
    expect(l.vista).toBeUndefined();
    expect(l.quando).toBeUndefined();
  });

  it('nelle cartelle che non sono per persona non cerca una persona', () => {
    expect(leggiPercorso('content/volantino.pdf').personaId).toBeUndefined();
    expect(leggiPercorso('exercise-videos/squat.mp4').personaId).toBeUndefined();
  });

  it('un numero che non è una data credibile viene scartato', () => {
    expect(leggiPercorso('postural/x/front_1234567890.jpg').quando).toBeUndefined();
  });

  it('un percorso storto non fa esplodere niente', () => {
    expect(leggiPercorso('').cartella).toBe('');
    expect(leggiPercorso('postural').personaId).toBeUndefined();
  });
});

describe('la riga che si legge sotto il file', () => {
  it('mette il nome della persona, non il suo codice', () => {
    const r = descriviFile('postural/abc123/front_1757606400000.jpg', 'Marco Rossi');
    expect(r).toContain('Marco Rossi');
    expect(r).not.toContain('abc123');
    expect(r).toContain('Frontale');
  });

  // Un allievo cancellato lascia i file: il codice non aiuta nessuno.
  it('se la persona non è più in elenco lo dice, invece del codice', () => {
    const r = descriviFile('postural/abc123/front_1757606400000.jpg', null);
    expect(r).toContain('Persona non più in elenco');
    expect(r).not.toContain('abc123');
  });

  it('per un file senza persona non scrive una riga vuota con i puntini', () => {
    expect(descriviFile('content/volantino.pdf')).toBe('');
  });
});

// ============================================================
// UNA CARTELLA NEGATA NON UCCIDE LA SCHERMATA
// ------------------------------------------------------------
// Prima bastava un permesso mancante per far fallire tutto e
// mostrare un codice di errore. Adesso si legge quello che si può e
// si dice, in italiano, che cosa manca.
// ============================================================

describe('quando una cartella non si apre', () => {
  const vuoto = (): EsitoScansione<string> => ({ file: [], negate: [], fallite: [] });

  it('riconosce il permesso negato dal codice di Firebase', () => {
    expect(eNegato({ code: 'storage/unauthorized' })).toBe(true);
  });

  it('lo riconosce anche dal testo, se il codice non c\'è', () => {
    expect(eNegato(new Error('User does not have permission to access \'\''))).toBe(true);
  });

  it('un errore di rete non è un permesso negato', () => {
    expect(eNegato(new Error('network request failed'))).toBe(false);
    expect(eNegato(null)).toBe(false);
  });

  it('se è andato tutto bene non dice niente', () => {
    expect(spiegaScansione(vuoto())).toBe('');
  });

  it('con una cartella negata usa il nome vero, non il prefisso tecnico', () => {
    const frase = spiegaScansione({ ...vuoto(), negate: ['postural'] });
    expect(frase).toContain('Foto posturali');
    expect(frase).not.toContain('storage/unauthorized');
    expect(frase).toContain('Il totale qui sotto è calcolato sul resto.');
  });

  it('distingue il permesso negato dalla cartella che non ha risposto', () => {
    const frase = spiegaScansione({ ...vuoto(), negate: ['bia'], fallite: ['academy'] });
    expect(frase).toContain('non è leggibile');
    expect(frase).toContain('non ha risposto');
  });

  it('al plurale non scrive «la cartella» davanti a tre nomi', () => {
    const frase = spiegaScansione({ ...vuoto(), negate: ['bia', 'postural', 'avatars'] });
    expect(frase).toContain('Queste cartelle');
  });
});
