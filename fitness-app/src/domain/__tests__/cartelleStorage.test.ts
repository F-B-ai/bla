import fs from 'fs';
import path from 'path';
import {
  CARTELLE, PREFISSI, cartella, nomeCartella, sensibile,
  eNegato, spiegaScansione, EsitoScansione,
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
