import {
  controllaEmail, controllaPassword, controllaNuovoAccesso,
  passwordDettabile, daConsegnare, descriviAccesso,
  MIN_PASSWORD, ACCESSO_VERSION,
} from '../accesso';

// ============================================================
// «NON TUTTI, SOPRATTUTTO LE PERSONE PIÙ ANZIANE, CAPISCONO
//  COME FARE»
// ------------------------------------------------------------
// Mandare l'invito e sperare non è una strada, per una signora di
// settant'anni. L'accesso lo crea il titolare e lo detta a voce.
// ============================================================

describe('l\'indirizzo', () => {
  it('uno valido passa', () => {
    expect(controllaEmail('anna.verdi@gmail.com').ok).toBe(true);
  });

  it('senza indirizzo non si crea niente', () => {
    const e = controllaEmail('   ');
    expect(e.ok).toBe(false);
    expect(e.problemi.join(' ')).toContain('Serve un indirizzo');
  });

  it('uno storto viene fermato prima di arrivare al server', () => {
    ['anna', 'anna@', '@gmail.com', 'anna@gmail', 'anna verdi@gmail.com']
      .forEach((x) => expect(controllaEmail(x).ok).toBe(false));
  });
});

describe('la password', () => {
  it('sei caratteri sono il minimo', () => {
    expect(controllaPassword('abc12').ok).toBe(false);
    expect(controllaPassword('abcd12').ok).toBe(true);
  });

  it('lo dice quanti ne servono, invece di limitarsi a rifiutare', () => {
    expect(controllaPassword('abc').problemi.join(' '))
      .toContain(String(MIN_PASSWORD));
  });

  // Uno spazio in fondo, preso copiando, e la persona resta fuori
  // senza capire perché.
  it('gli spazi non passano', () => {
    expect(controllaPassword('befu 274').ok).toBe(false);
  });
});

describe('i due controlli insieme', () => {
  it('raccolgono tutti i problemi, non solo il primo', () => {
    const e = controllaNuovoAccesso('anna', 'abc');
    expect(e.ok).toBe(false);
    expect(e.problemi.length).toBe(2);
  });

  it('e una coppia buona passa', () => {
    expect(controllaNuovoAccesso('anna@gmail.com', 'befu274').ok).toBe(true);
  });
});

describe('la password si detta al telefono', () => {
  // Il punto di tutta la funzione: una password che si detta male
  // viene digitata male, e la persona resta fuori lo stesso.
  // Le coppie che si confondono sono zero/O, uno/elle/i, cinque/esse.
  // La «o» e la «s» minuscole, dette a voce, non si confondono con
  // niente: il problema sono le cifre e le maiuscole.
  it('niente 0, 1, 5, né l/I: al telefono si confondono', () => {
    for (let i = 0; i < 200; i++) {
      expect(passwordDettabile()).not.toMatch(/[015lI]/);
    }
  });

  it('niente maiuscole da spiegare, niente simboli', () => {
    for (let i = 0; i < 200; i++) {
      expect(passwordDettabile()).toMatch(/^[a-z0-9]+$/);
    }
  });

  it('è abbastanza lunga da essere accettata', () => {
    for (let i = 0; i < 50; i++) {
      expect(passwordDettabile().length).toBeGreaterThanOrEqual(MIN_PASSWORD);
      expect(controllaPassword(passwordDettabile()).ok).toBe(true);
    }
  });

  it('si legge come si scrive: consonante-vocale, poi le cifre', () => {
    expect(passwordDettabile(() => 0)).toBe('baba222');
  });

  it('e non è sempre la stessa', () => {
    const viste = new Set(Array.from({ length: 50 }, () => passwordDettabile()));
    expect(viste.size).toBeGreaterThan(30);
  });
});

describe('le credenziali da consegnare', () => {
  const t = daConsegnare('Anna Verdi', 'anna@gmail.com', 'befu274');

  it('ci sono tutte e due, leggibili', () => {
    expect(t).toContain('anna@gmail.com');
    expect(t).toContain('befu274');
    expect(t).toContain('Anna Verdi');
  });

  // È l'unico momento in cui la password si vede.
  it('avvisa che dopo non si vede più', () => {
    expect(t).toContain('non è più');
    expect(t).toMatch(/Scrivila|foto/);
  });

  it('e dice che fare se la perde', () => {
    expect(t).toContain('reimpostarla');
  });

  it('senza nome la frase non ha un buco', () => {
    expect(daConsegnare('  ', 'a@b.it', 'befu274')).toContain('questa persona');
  });
});

describe('la riga che dice se può entrare', () => {
  it('chi non ha l\'accesso: si dice, e si dice che farne', () => {
    const r = descriviAccesso({ haAccesso: false });
    expect(r).toContain('non ha ancora un accesso');
    expect(r).toContain('Creaglielo');
  });

  it('chi ce l\'ha ma non è mai entrata', () => {
    const r = descriviAccesso({
      haAccesso: true, email: 'anna@gmail.com', maiEntrata: true,
    });
    expect(r).toContain('non è mai entrata');
    expect(r).toContain('reimpostarla');
  });

  it('chi entra normalmente', () => {
    expect(descriviAccesso({ haAccesso: true, email: 'anna@gmail.com' }))
      .toContain('anna@gmail.com');
  });
});

describe('versione', () => {
  it('tracciata', () => {
    expect(ACCESSO_VERSION).toBe(1);
  });
});
