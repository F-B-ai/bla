import {
  ORE_LIMITE, oreMancanti, descriviAttesa, valutaAnnullamento,
  avvisoSullaScheda, ANNULLAMENTO_VERSION,
} from '../annullamento';

// ============================================================
// LA REGOLA DELLE DIECI ORE
// ------------------------------------------------------------
// Prima l'App avvisava e poi offriva «Annulla comunque», che
// annullava davvero: il limite si scavalcava da soli, sempre.
// Questi test difendono l'unica cosa che conta — dopo il limite
// NON si annulla, e la lezione resta valida.
// ============================================================

const ADESSO = new Date(2026, 8, 14, 12, 0, 0);
const fra = (ore: number) => new Date(ADESSO.getTime() + ore * 60 * 60 * 1000);

describe('il limite', () => {
  it('è dieci ore, e vive in un posto solo', () => {
    expect(ORE_LIMITE).toBe(10);
  });
});

describe('quando si può annullare', () => {
  it('molto prima: sì', () => {
    const v = valutaAnnullamento({ quando: fra(48), adesso: ADESSO });
    expect(v.puo).toBe(true);
    expect(v.esito).toBe('si_puo');
  });

  it('undici ore prima: ancora sì', () => {
    expect(valutaAnnullamento({ quando: fra(11), adesso: ADESSO }).puo).toBe(true);
  });

  // Il confine esatto: a dieci ore tonde si può ancora.
  it('esattamente dieci ore prima: sì', () => {
    const v = valutaAnnullamento({ quando: fra(10), adesso: ADESSO });
    expect(v.puo).toBe(true);
  });

  it('e la conferma dice che NON viene conteggiata', () => {
    const v = valutaAnnullamento({ quando: fra(24), adesso: ADESSO });
    expect(v.messaggio).toContain('non ti viene');
    expect(v.messaggio).toContain('conteggiata');
  });
});

describe('quando NON si può più — il cuore della richiesta', () => {
  it('nove ore e mezza prima: no', () => {
    const v = valutaAnnullamento({ quando: fra(9.5), adesso: ADESSO });
    expect(v.puo).toBe(false);
    expect(v.esito).toBe('troppo_tardi');
  });

  it('un\'ora prima: no', () => {
    expect(valutaAnnullamento({ quando: fra(1), adesso: ADESSO }).puo).toBe(false);
  });

  it('il messaggio spiega la regola, con il numero dentro', () => {
    const v = valutaAnnullamento({ quando: fra(3), adesso: ADESSO });
    expect(v.messaggio).toContain('10 ore');
    expect(v.messaggio).toContain('resta in programma');
  });

  // Un muro senza uscita è peggio del problema: chi ha un imprevisto
  // vero deve sapere che cosa fare.
  it('e non lascia la persona senza una strada: dice di avvisare lo studio', () => {
    const v = valutaAnnullamento({ quando: fra(3), adesso: ADESSO });
    expect(v.messaggio).toMatch(/avvisa subito lo studio/i);
  });

  // LA REGRESSIONE CHE CONTA: nessun messaggio deve più contenere
  // l'invito a scavalcare il limite.
  it('da nessuna parte si parla di «annulla comunque»', () => {
    [0.5, 1, 5, 9.9].forEach((h) => {
      const v = valutaAnnullamento({ quando: fra(h), adesso: ADESSO });
      expect(v.messaggio.toLowerCase()).not.toContain('comunque');
      expect(v.puo).toBe(false);
    });
  });
});

describe('i casi che un pulsante non dovrebbe nemmeno mostrare', () => {
  it('una seduta già passata non si annulla', () => {
    const v = valutaAnnullamento({ quando: fra(-2), adesso: ADESSO });
    expect(v.puo).toBe(false);
    expect(v.esito).toBe('gia_passata');
  });

  it('una già svolta lo dice, invece di fingere', () => {
    const v = valutaAnnullamento({ quando: fra(48), stato: 'completed', adesso: ADESSO });
    expect(v.puo).toBe(false);
    expect(v.messaggio).toContain('già svolta');
  });

  it('una già annullata pure', () => {
    const v = valutaAnnullamento({
      quando: fra(48), stato: 'cancelled_by_student', adesso: ADESSO,
    });
    expect(v.puo).toBe(false);
    expect(v.messaggio).toContain('già stata annullata');
  });

  it('una data storta non apre per sbaglio', () => {
    const v = valutaAnnullamento({ quando: new Date('boh'), adesso: ADESSO });
    expect(v.puo).toBe(false);
    expect(v.esito).toBe('data_non_valida');
  });
});

describe('quante ore mancano', () => {
  it('conta giusto', () => {
    expect(oreMancanti(fra(5), ADESSO)).toBeCloseTo(5);
    expect(oreMancanti(fra(-3), ADESSO)).toBeCloseTo(-3);
  });

  it('una data non valida non diventa zero per sbaglio', () => {
    expect(isNaN(oreMancanti(new Date('boh'), ADESSO))).toBe(true);
  });
});

describe('come si dice il tempo che manca', () => {
  it('sotto l\'ora non si inventano i minuti', () => {
    expect(descriviAttesa(0.4)).toBe('meno di un\'ora');
  });

  it('il singolare non diventa «1 ore»', () => {
    expect(descriviAttesa(1.2)).toBe('circa un\'ora');
  });

  it('e non si scrivono i decimali', () => {
    expect(descriviAttesa(2.7)).toBe('circa 2 ore');
    expect(descriviAttesa(2.7)).not.toContain('.');
  });
});

describe('il limite si legge PRIMA di toccare il pulsante', () => {
  it('dentro le dieci ore, la scheda lo dice', () => {
    const r = avvisoSullaScheda(fra(4), ADESSO);
    expect(r).toContain('10 ore');
    expect(r).toContain('Non è più annullabile');
  });

  it('fuori dalle dieci ore, nessun avviso inutile', () => {
    expect(avvisoSullaScheda(fra(30), ADESSO)).toBeNull();
  });

  it('per una seduta passata non c\'è niente da avvisare', () => {
    expect(avvisoSullaScheda(fra(-1), ADESSO)).toBeNull();
  });
});

describe('versione', () => {
  it('tracciata', () => {
    expect(ANNULLAMENTO_VERSION).toBe(1);
  });
});
