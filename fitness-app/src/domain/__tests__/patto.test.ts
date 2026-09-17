import {
  valutaDisdetta, momentoDi, messaggioPromemoria, articoli, testoPatto,
  REGOLE, PATTO_VERSION,
} from '../patto';

// ============================================================
// IL PATTO — regole e promemoria.
// Ciò che i test difendono: le regole vivono in UN posto solo
// (se cambia la soglia, cambia ovunque), e i messaggi parlano
// del vantaggio di chi paga, mai minacciando.
// ============================================================

const ora = (h: number) => new Date(2026, 8, 10, h, 0, 0);

describe('disdetta', () => {
  it('oltre la soglia: la seduta si recupera', () => {
    const d = valutaDisdetta(ora(20), ora(8)); // 12 ore prima
    expect(d.esito).toBe('in_tempo');
    expect(d.sedutaConsumata).toBe(false);
    expect(d.oreDiPreavviso).toBe(12);
  });

  it('esattamente alla soglia: ancora in tempo', () => {
    const d = valutaDisdetta(ora(20), ora(10)); // 10 ore precise
    expect(d.esito).toBe('in_tempo');
  });

  it('sotto la soglia: la seduta è consumata', () => {
    const d = valutaDisdetta(ora(20), ora(14)); // 6 ore prima
    expect(d.esito).toBe('tardiva');
    expect(d.sedutaConsumata).toBe(true);
  });

  it('la spiegazione non parla di penale, ma di tempo riservato', () => {
    const d = valutaDisdetta(ora(20), ora(18));
    expect(d.spiegazione).toContain('riservata');
    expect(d.spiegazione.toLowerCase()).not.toContain('penale');
    expect(d.spiegazione.toLowerCase()).not.toContain('multa');
  });

  it('disdetta dopo l\'orario non produce ore negative', () => {
    const d = valutaDisdetta(ora(8), ora(12));
    expect(d.oreDiPreavviso).toBe(0);
    expect(d.sedutaConsumata).toBe(true);
  });
});

describe('quando parte il promemoria', () => {
  it('rispetta la cadenza 15 · 7 · 1', () => {
    expect(momentoDi(20)).toBe('nessuno');
    expect(momentoDi(15)).toBe('quindici');
    expect(momentoDi(9)).toBe('quindici');
    expect(momentoDi(7)).toBe('sette');
    expect(momentoDi(2)).toBe('sette');
    expect(momentoDi(1)).toBe('domani');
    expect(momentoDi(0)).toBe('domani');
    expect(momentoDi(-3)).toBe('scaduta');
  });

  it('la cadenza dichiarata nelle regole è quella usata', () => {
    expect(REGOLE.promemoriaGiorni).toEqual([15, 7, 1]);
  });
});

describe('i messaggi', () => {
  const base = { nome: 'Giuseppe Verdi', importo: 150, scadenza: new Date(2026, 8, 25) };

  it('non si scrive nulla se manca troppo tempo', () => {
    expect(messaggioPromemoria({ ...base, giorniAllaScadenza: 40 })).toBeNull();
  });

  it('usa il nome di battesimo, non il cognome', () => {
    const m = messaggioPromemoria({ ...base, giorniAllaScadenza: 15 })!;
    expect(m).toContain('Giuseppe');
    expect(m).not.toContain('Verdi');
  });

  it('a quindici giorni parla di anticipo e di posto riservato', () => {
    const m = messaggioPromemoria({ ...base, giorniAllaScadenza: 15 })!;
    expect(m).toContain('quindici giorni di anticipo');
    expect(m.toLowerCase()).toContain('posto');
  });

  it('a sette giorni parla di costanza e di risultati misurati', () => {
    const m = messaggioPromemoria({ ...base, giorniAllaScadenza: 5 })!;
    expect(m.toLowerCase()).toContain('costanza');
    expect(m.toLowerCase()).toContain('misure');
  });

  it('il giorno prima è l\'ultimo, e lo dice', () => {
    const m = messaggioPromemoria({ ...base, giorniAllaScadenza: 1 })!;
    expect(m.toLowerCase()).toContain('ultimo promemoria');
  });

  it('nessun messaggio prima della scadenza nomina la sospensione', () => {
    [15, 7, 3, 1].forEach((g) => {
      const m = messaggioPromemoria({ ...base, giorniAllaScadenza: g })!;
      expect(m.toLowerCase()).not.toContain('sospen');
      expect(m.toLowerCase()).not.toContain('pausa');
    });
  });

  it('a scadenza superata la pausa si nomina, con i giorni che restano', () => {
    const m = messaggioPromemoria({ ...base, giorniAllaScadenza: -2 })!;
    expect(m.toLowerCase()).toContain('pausa');
    expect(m).toContain('5'); // 7 previsti - 2 trascorsi
    expect(m.toLowerCase()).toContain('riprende');
  });

  it('oltre la soglia il percorso è in pausa, ma si riattiva lo stesso giorno', () => {
    const m = messaggioPromemoria({ ...base, giorniAllaScadenza: -10 })!;
    expect(m.toLowerCase()).toContain('in pausa');
    expect(m.toLowerCase()).toContain('stesso giorno');
  });

  it('nessun messaggio è mai minaccioso', () => {
    [15, 7, 1, -2, -10].forEach((g) => {
      const m = messaggioPromemoria({ ...base, giorniAllaScadenza: g })!;
      ['penale', 'mora', 'diffida', 'legale', 'obbligo di pagare']
        .forEach((v) => expect(m.toLowerCase()).not.toContain(v));
    });
  });

  it('ogni messaggio lascia una porta aperta a chi ha difficoltà', () => {
    [1, -2, -10].forEach((g) => {
      const m = messaggioPromemoria({ ...base, giorniAllaScadenza: g })!;
      expect(m.toLowerCase()).toMatch(/difficolt|problema|soluzione/);
    });
  });
});

describe('il testo del patto', () => {
  const d = {
    allievo: 'Maria Bianchi', percorso: 'Ricomposizione e postura',
    coach: 'Francesco Busanca', numeroRate: 6, importoRata: 150, importoTotale: 900,
    primaScadenza: '15 ottobre 2026',
  };

  it('ha sei articoli numerati in ordine', () => {
    const a = articoli(d);
    expect(a).toHaveLength(6);
    a.forEach((x, i) => expect(x.n).toBe(i + 1));
  });

  it('riporta i numeri del piano concordato', () => {
    const t = articoli(d).find((x) => x.n === 3)!.testo;
    expect(t).toContain('6 rate');
    expect(t).toContain('150');
    expect(t).toContain('900');
    expect(t).toContain('15 ottobre 2026');
  });

  it('senza piano non inventa importi', () => {
    const t = articoli({ allievo: 'X', percorso: 'Y', coach: 'Z' })
      .find((x) => x.n === 3)!.testo;
    expect(t).toContain('concordati');
    expect(t).not.toMatch(/\d+ rate/);
  });

  it('la soglia di disdetta nel testo è quella delle regole', () => {
    const t = articoli(d).find((x) => x.n === 2)!.testo;
    expect(t).toContain(`${REGOLE.disdettaOre} ore`);
  });

  it('dichiara il perimetro: screening, mai diagnosi', () => {
    const t = articoli(d).find((x) => x.n === 5)!.testo;
    expect(t).toContain('screening');
    expect(t.toLowerCase()).toContain('non costituiscono atto diagnostico');
    expect(t).toContain('professionista sanitario');
  });

  it('dichiara cosa succede ai dati di salute', () => {
    const t = articoli(d).find((x) => x.n === 6)!.testo;
    expect(t).toContain('salute');
    expect(t).toContain('non vengono ceduti a terzi');
    expect(t).toContain('cancellazione');
  });

  it('versione tracciata', () => {
    expect(PATTO_VERSION).toBe(1);
  });
});

// ============================================================
// IL TESTO CONGELATO
// ------------------------------------------------------------
// Gli articoli si generano dalle REGOLE correnti. Se cambiano le
// dieci ore di disdetta, la schermata mostrerebbe la regola nuova
// sopra una firma vecchia. testoPatto() è quello che si salva
// accanto alla foto, perché fra un anno si sappia CHE COSA è
// stato firmato.
// ============================================================

describe('il testo che si congela con la firma', () => {
  const dati = {
    allievo: 'Rosa Cesarano',
    percorso: 'Armonia Posturale',
    coach: 'Francesco Busanca',
    studio: 'A.S.D. Evolution Sport — Mind Movement Lab',
    numeroRate: 3,
    importoRata: 150,
    importoTotale: 450,
    primaScadenza: '15 ottobre 2026',
  };

  it('porta dentro chi, che percorso e con chi', () => {
    const t = testoPatto(dati);
    expect(t).toContain('Rosa Cesarano');
    expect(t).toContain('Armonia Posturale');
    expect(t).toContain('Francesco Busanca');
  });

  it('porta dentro i soldi concordati', () => {
    const t = testoPatto(dati);
    expect(t).toContain('3 da 150');
    expect(t).toContain('450');
    expect(t).toContain('15 ottobre 2026');
  });

  // Il motivo per cui la foto da sola non basterebbe.
  it('contiene tutti gli articoli, per intero', () => {
    const t = testoPatto(dati);
    articoli(dati).forEach((a) => {
      expect(t).toContain(a.testo);
    });
  });

  it('contiene i due impegni e la versione', () => {
    const t = testoPatto(dati);
    expect(t).toContain('LO STUDIO SI IMPEGNA');
    expect(t).toContain('L\'ALLIEVO SI IMPEGNA');
    expect(t).toContain(`v${PATTO_VERSION}`);
  });

  // Il perimetro non può sparire dalla copia conservata.
  it('conserva il perimetro: screening, mai diagnosi', () => {
    const t = testoPatto(dati);
    expect(t).toContain('screening');
    expect(t.toLowerCase()).toContain('non costituiscono atto diagnostico');
  });

  it('regge anche un patto senza rate', () => {
    const t = testoPatto({ allievo: 'A', percorso: 'B', coach: 'C' });
    expect(t).toContain('A');
    expect(t).not.toContain('undefined');
    expect(t).not.toContain('NaN');
  });
});
