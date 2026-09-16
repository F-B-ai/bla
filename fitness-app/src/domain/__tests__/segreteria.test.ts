import {
  leggiSegreteria, spiegaLettura, istruzioniSegreteria, SEGRETERIA_VERSION,
} from '../segreteria';

// ============================================================
// LA SEGRETERIA — «Grok bot mi gestiva WhatsApp»
// ------------------------------------------------------------
// La regola che tutti questi test difendono: LA DATA NON SI
// INVENTA. Un modello che «capisce» una data che non c'è scritta
// è il modo più veloce per mettere in agenda un appuntamento che
// nessuno ha chiesto.
// ============================================================

const risposta = (o: Record<string, unknown>) => JSON.stringify(o);

describe('un messaggio completo', () => {
  const l = leggiSegreteria(risposta({
    esito: 'richiesta',
    persona: 'Rosa Cesarano',
    telefono: '333 1234567',
    giorno: '2026-09-18',
    ora: '15:00',
    tipo: 'consulenza',
    note: 'prima volta',
    citazione: 'venerdì alle 3',
  }));

  it('diventa una richiesta', () => {
    expect(l.esito).toBe('richiesta');
    expect(l.persona).toBe('Rosa Cesarano');
    expect(l.giorno).toBe('2026-09-18');
    expect(l.ora).toBe('15:00');
  });

  it('e porta la citazione, per controllarla a occhio', () => {
    expect(l.citazione).toBe('venerdì alle 3');
    expect(spiegaLettura(l)).toContain('venerdì alle 3');
  });

  // Chi decide resta il titolare, anche quando il testo sembra chiaro.
  it('la riga dice che la decisione è sua', () => {
    expect(spiegaLettura(l)).toContain('la decidi tu');
  });
});

describe('LA DATA NON SI INVENTA', () => {
  // Il caso che il titolare ha scelto: si propongono gli orari liberi.
  it('senza data l\'esito è «senza_data», non una richiesta', () => {
    const l = leggiSegreteria(risposta({
      esito: 'senza_data', persona: 'Anna Verdi', giorno: '', ora: '',
    }));
    expect(l.esito).toBe('senza_data');
    expect(l.giorno).toBe('');
  });

  // IL TEST CHE CONTA: il modello dice «richiesta» ma la data manca.
  // Se ci si fidasse della sua parola, entrerebbe in coda un
  // appuntamento senza quando.
  it('un modello che si contraddice non passa', () => {
    const l = leggiSegreteria(risposta({
      esito: 'richiesta', persona: 'Anna', giorno: '', ora: '15:00',
    }));
    expect(l.esito).toBe('senza_data');
  });

  it('nemmeno senza ora', () => {
    expect(leggiSegreteria(risposta({
      esito: 'richiesta', persona: 'Anna', giorno: '2026-09-18', ora: '',
    })).esito).toBe('senza_data');
  });

  it('e senza nome non è una richiesta di nessuno', () => {
    expect(leggiSegreteria(risposta({
      esito: 'richiesta', persona: '', giorno: '2026-09-18', ora: '15:00',
    })).esito).toBe('non_capito');
  });
});

describe('date e ore storte si svuotano, non si accettano', () => {
  it('una data inventata male viene tolta e segnalata', () => {
    const l = leggiSegreteria(risposta({
      esito: 'richiesta', persona: 'Anna', giorno: 'giovedì', ora: '15:00',
    }));
    expect(l.giorno).toBe('');
    expect(l.esito).toBe('senza_data');
    expect(l.problemi.join(' ')).toContain('non è leggibile');
  });

  it('un\'ora impossibile pure', () => {
    const l = leggiSegreteria(risposta({
      esito: 'richiesta', persona: 'Anna', giorno: '2026-09-18', ora: '25:99',
    }));
    expect(l.ora).toBe('');
    expect(l.problemi.join(' ')).toContain('non è leggibile');
  });

  it('un tipo non previsto diventa «visita», non un tipo inventato', () => {
    expect(leggiSegreteria(risposta({
      esito: 'richiesta', persona: 'A', giorno: '2026-09-18',
      ora: '15:00', tipo: 'massaggio',
    })).tipo).toBe('visita');
  });
});

describe('quando il messaggio non c\'entra niente', () => {
  it('un saluto non diventa un appuntamento', () => {
    const l = leggiSegreteria(risposta({ esito: 'non_capito', persona: 'Anna' }));
    expect(l.esito).toBe('non_capito');
    expect(spiegaLettura(l)).toContain('non sembra una richiesta');
  });
});

describe('se la risposta non è nemmeno leggibile', () => {
  it('non esplode e lo dice', () => {
    ['', 'boh', '<html>errore</html>', null as unknown as string]
      .forEach((x) => {
        const l = leggiSegreteria(x);
        expect(l.esito).toBe('non_capito');
        expect(l.problemi.join(' ')).toContain('Non ho capito');
      });
  });

  // Alcuni modelli incorniciano il JSON con del testo intorno.
  it('ma un JSON incorniciato si legge lo stesso', () => {
    const l = leggiSegreteria(
      'Ecco il risultato:\n```json\n'
      + risposta({ esito: 'richiesta', persona: 'Anna', giorno: '2026-09-18', ora: '15:00' })
      + '\n```\nSpero vada bene!'
    );
    expect(l.esito).toBe('richiesta');
    expect(l.persona).toBe('Anna');
  });
});

describe('le istruzioni al modello', () => {
  const p = istruzioniSegreteria('2026-09-16');

  it('gli dicono che giorno è oggi, altrimenti «giovedì» non vuol dire niente', () => {
    expect(p).toContain('2026-09-16');
  });

  it('e gli vietano di inventare una data, per primo', () => {
    expect(p).toContain('NON inventare MAI una data');
  });

  it('con il perché, non solo il divieto', () => {
    // Il prompt va a capo: si confronta il testo, non l'impaginazione.
    const disteso = p.replace(/\s+/g, ' ');
    expect(disteso).toContain('peggio di un appuntamento mancato');
  });

  it('«pomeriggio» non è un\'ora, ed è scritto', () => {
    expect(p).toContain('NON è un\'ora');
  });
});

describe('versione', () => {
  it('tracciata', () => {
    expect(SEGRETERIA_VERSION).toBe(1);
  });
});
