import {
  classificaErroreAdmin, spiegaErroreAdmin, ERRORE_ADMIN_VERSION,
} from '../erroreAdmin';

// ============================================================
// «IL CAMBIO PASSWORD PER GLI ALLIEVI NON FUNZIONA»
// ------------------------------------------------------------
// Il vecchio codice trattava `internal` come «Cloud Functions non
// attive». Ma `internal` è il codice che una Function restituisce
// quando il SUO codice fallisce, per qualunque motivo. Quindi ogni
// errore vero veniva raccontato come un problema di piano tariffario.
//
// Le Functions erano attive. Rispondevano. Quel messaggio non è mai
// stato vero.
// ============================================================

const err = (code: string, message = '') => ({ code, message });

describe('il difetto che ha nascosto la causa', () => {
  // La riga che conta.
  it('«internal» NON è «le Functions non sono attive»', () => {
    expect(classificaErroreAdmin(err('internal', 'qualcosa è esploso')))
      .not.toBe('nonRaggiungibile');
    expect(spiegaErroreAdmin(err('internal', 'qualcosa è esploso')))
      .not.toMatch(/Blaze|non ancora attive/);
  });

  it('e quello che non sappiamo lo diciamo, col dettaglio tecnico', () => {
    const m = spiegaErroreAdmin(err('internal', 'boom'));
    expect(m).toContain('non so dirti perché');
    expect(m).toContain('boom');
  });

  it('senza nemmeno un dettaglio, non lascia una frase monca', () => {
    expect(spiegaErroreAdmin(null)).toContain('segnalamelo');
  });
});

describe('l\'account che non esiste — il caso più frequente', () => {
  // Si prova a dare una password a chi non ha mai completato la
  // registrazione. Non è un guasto: è che non c'è niente da cambiare.
  it('si riconosce dal codice di Firebase Auth', () => {
    expect(classificaErroreAdmin(err('auth/user-not-found'))).toBe('accountAssente');
  });

  it('e anche dal testo dell\'SDK admin', () => {
    expect(classificaErroreAdmin(err('internal', 'There is no user record corresponding to this identifier')))
      .toBe('accountAssente');
  });

  it('lo spiega senza gergo, e dice che cosa fare', () => {
    const m = spiegaErroreAdmin(err('auth/user-not-found'));
    expect(m).toContain('non ha mai completato la registrazione');
    expect(m).toContain('invito');
    expect(m).not.toContain('auth/');
  });
});

describe('gli altri motivi', () => {
  it('il permesso mancante manda ad allineare i ruoli', () => {
    const m = spiegaErroreAdmin(err('functions/permission-denied'));
    expect(m).toContain('Allinea i ruoli');
  });

  it('la password corta lo dice, senza parlare di server', () => {
    const m = spiegaErroreAdmin(err('invalid-argument', 'La password deve avere almeno 6 caratteri.'));
    expect(m).toContain('almeno 6 caratteri');
    expect(m).not.toMatch(/server|Functions/);
  });

  it('l\'email già usata è un\'altra cosa ancora', () => {
    expect(classificaErroreAdmin(err('auth/email-already-exists'))).toBe('emailOccupata');
  });
});

describe('quando il server DAVVERO non si raggiunge', () => {
  // Questo è l'unico caso in cui si può parlare di server.
  it('la Function inesistente o non raggiungibile', () => {
    expect(classificaErroreAdmin(err('functions/not-found'))).toBe('nonRaggiungibile');
    expect(classificaErroreAdmin(err('functions/unavailable'))).toBe('nonRaggiungibile');
  });

  it('la rete caduta', () => {
    expect(classificaErroreAdmin(err('', 'Failed to fetch'))).toBe('nonRaggiungibile');
  });

  it('e allora il messaggio parla di connessione, non di piano tariffario', () => {
    const m = spiegaErroreAdmin(err('functions/unavailable'));
    expect(m).toContain('connessione');
    expect(m).not.toMatch(/Blaze/);
  });
});

// ============================================================
// «internal (functions/internal)» — 14 settembre 2026
// ------------------------------------------------------------
// La parola nuda è la firma di una Function crollata: il motivo
// resta nei log del server. Ma quando il server MANDA una frase,
// va mostrata quella — non preceduta da «non so dirti perché».
// ============================================================

describe('quando il server spiega, si mostra la sua frase', () => {
  it('un messaggio vero passa intero, senza premesse che lo smentiscono', () => {
    const t = spiegaErroreAdmin({
      code: 'functions/internal',
      message: 'L\'email dell\'accesso era cambiata ma la scheda no, quindi ho '
        + 'rimesso tutto com\'era: non è cambiato niente. Motivo: 5 NOT_FOUND',
    });
    expect(t).toContain('rimesso tutto com\'era');
    expect(t).not.toContain('non so dirti perché');
  });

  it('e l\'avviso grave arriva per intero', () => {
    const t = spiegaErroreAdmin({
      code: 'functions/internal',
      message: 'ATTENZIONE: l\'email di ACCESSO è stata cambiata ma la scheda no, '
        + 'e non sono riuscito a tornare indietro.',
    });
    expect(t).toContain('ATTENZIONE');
    expect(t).not.toContain('non so dirti');
  });
});

describe('quando il server NON spiega, si continua a dirlo', () => {
  // Esattamente ciò che il titolare ha letto sullo schermo.
  it('la parola nuda «internal» non viene spacciata per una spiegazione', () => {
    const t = spiegaErroreAdmin({ code: 'functions/internal', message: 'internal' });
    expect(t).toContain('non so dirti perché');
    expect(t).toContain('functions/internal');
  });

  it('nemmeno in maiuscolo', () => {
    expect(spiegaErroreAdmin({ code: 'functions/internal', message: 'INTERNAL' }))
      .toContain('non so dirti perché');
  });

  it('né il nome di un altro codice al posto di una frase', () => {
    ['unknown', 'not-found', 'unavailable'].forEach((m) => {
      expect(spiegaErroreAdmin({ code: 'functions/internal', message: m }))
        .toContain('non so dirti perché');
    });
  });

  it('e una frase troppo corta non conta come spiegazione', () => {
    expect(spiegaErroreAdmin({ code: 'functions/internal', message: 'ops qui' }))
      .toContain('non so dirti perché');
  });
});

describe('versione', () => {
  it('tracciata', () => {
    expect(ERRORE_ADMIN_VERSION).toBe(2);
  });
});
