import {
  MAX_ECCEZIONI, valutaEccezione, riassuntoEccezioni, contaEccezioni,
  ECCEZIONI_VERSION,
} from '../eccezioni';

// ============================================================
// «UNA MASSIMO DUE VOLTE, LA TERZA SARÀ SEGNATA AUTOMATICAMENTE»
// ------------------------------------------------------------
// Una regola giusta e impossibile da ricordare: dopo sei mesi
// nessuno sa se a una persona l'eccezione è già stata fatta una
// volta o due, e finisce che gliela si fa sempre. Il software non
// decide al posto del titolare: gli mette il numero davanti nel
// momento in cui decide.
// ============================================================

describe('quante se ne concedono', () => {
  it('due', () => {
    expect(MAX_ECCEZIONI).toBe(2);
  });
});

describe('la prima', () => {
  const e = valutaEccezione(0, 'Mario Rossi');

  it('si concede, e la lezione NON si conta', () => {
    expect(e.graziata).toBe(true);
    expect(e.conteggiata).toBe(false);
    expect(e.numero).toBe(1);
  });

  it('lo dice chiaro: resta nel percorso', () => {
    expect(e.messaggio).toContain('NON conteggiata');
    expect(e.messaggio).toContain('resta nel suo percorso');
  });

  it('e avvisa quante ne restano', () => {
    expect(e.messaggio).toContain('gliene resta 1');
  });

  it('il titolo dice a che punto siamo', () => {
    expect(e.titolo).toBe('Eccezione 1 di 2');
  });
});

describe('la seconda', () => {
  const e = valutaEccezione(1, 'Mario Rossi');

  it('si concede ancora', () => {
    expect(e.graziata).toBe(true);
    expect(e.conteggiata).toBe(false);
  });

  it('ma avvisa che è l\'ultima', () => {
    expect(e.messaggio).toContain('È l\'ultima');
    expect(e.messaggio).toContain('verrà conteggiata');
  });

  it('e ricorda quella di prima, al singolare', () => {
    expect(e.messaggio).toContain('già avuto una volta');
    expect(e.messaggio).not.toContain('1 volte');
  });
});

describe('la terza — il cuore della regola', () => {
  const e = valutaEccezione(2, 'Mario Rossi');

  it('la lezione si conta, qualunque sia il motivo', () => {
    expect(e.graziata).toBe(false);
    expect(e.conteggiata).toBe(true);
  });

  // Il posto torna libero comunque: serve all'agenda, non è una punizione.
  it('ma la seduta si annulla lo stesso: il posto torna libero', () => {
    expect(e.messaggio).toContain('posto torna libero');
  });

  it('e spiega il perché, invece di limitarsi a negare', () => {
    expect(e.messaggio).toContain('il posto era riservato');
  });

  it('il pulsante dice quello che farà davvero', () => {
    expect(e.azione).toBe('Annulla e conteggia');
  });
});

describe('dalla quarta in poi non cambia niente', () => {
  [3, 5, 12].forEach((n) => {
    it(`con ${n} già concesse resta conteggiata`, () => {
      const e = valutaEccezione(n);
      expect(e.conteggiata).toBe(true);
      expect(e.numero).toBe(n + 1);
    });
  });
});

describe('numeri storti non regalano eccezioni', () => {
  it('un numero negativo vale zero', () => {
    expect(valutaEccezione(-3).numero).toBe(1);
  });

  it('un decimale non crea mezze eccezioni', () => {
    expect(valutaEccezione(2.7).conteggiata).toBe(true);
  });

  it('e un valore mancante non apre la porta', () => {
    expect(valutaEccezione(undefined as unknown as number).graziata).toBe(true);
    expect(valutaEccezione(undefined as unknown as number).numero).toBe(1);
  });
});

describe('senza il nome la frase non ha un buco', () => {
  it('si dice «questa persona»', () => {
    expect(valutaEccezione(2, '   ').messaggio).toContain('questa persona');
  });
});

describe('il riassunto che si legge PRIMA di decidere', () => {
  it('chi non ne ha mai avute', () => {
    expect(riassuntoEccezioni(0, 'Anna')).toContain('non ha mai avuto');
  });

  it('chi ne ha avuta una', () => {
    const r = riassuntoEccezioni(1, 'Anna');
    expect(r).toContain('una volta');
    expect(r).toContain('ne resta 1');
  });

  it('chi le ha finite', () => {
    expect(riassuntoEccezioni(2, 'Anna')).toContain('esaurito');
  });
});

describe('che cosa conta come eccezione già concessa', () => {
  it('solo le sedute che portano il segno', () => {
    expect(contaEccezioni([
      { eccezioneConcessa: true },
      { eccezioneConcessa: true },
      { eccezioneConcessa: false },
      {},
    ])).toBe(2);
  });

  // Annullare con TRE GIORNI di anticipo è un diritto, non una
  // cortesia: non deve consumare niente.
  it('un annullamento in tempo non consuma un\'eccezione', () => {
    expect(contaEccezioni([{}, {}, {}])).toBe(0);
  });

  it('una lista vuota o assente non esplode', () => {
    expect(contaEccezioni([])).toBe(0);
    expect(contaEccezioni(undefined as never)).toBe(0);
  });
});

describe('versione', () => {
  it('tracciata', () => {
    expect(ECCEZIONI_VERSION).toBe(1);
  });
});
