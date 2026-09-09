import {
  controllaAppuntamento, messaggioMancante, nomeOspiteValido, DatiAppuntamento,
} from '../appuntamento';

// ============================================================
// «SE È UNA CONSULENZA, CHE ALLIEVO SELEZIONO?»
// ------------------------------------------------------------
// La domanda del titolare, un'ora dopo la pubblicazione. Il controllo
// chiedeva un allievo per OGNI tipo di appuntamento, e una consulenza
// è quasi sempre il primo contatto: la persona in anagrafica non c'è
// ancora, ed è proprio per questo che viene.
// ============================================================

const dati = (p: Partial<DatiAppuntamento>): DatiAppuntamento =>
  ({ tipo: 'consulenza', data: '2026-09-15', ...p });

describe('la consulenza con chi non è ancora in anagrafica', () => {
  // Il caso che ha rotto: nessun allievo, ma la persona esiste.
  it('basta il nome di chi viene: diventa un ospite', () => {
    const r = controllaAppuntamento(dati({ nomeOspite: 'Pasqualone Schettino' }));
    expect(r.esito).toBe('ospite');
    expect(r.problemi).toEqual([]);
  });

  it('con l\'allievo selezionato resta una sessione normale', () => {
    expect(controllaAppuntamento(dati({ studentId: 'abc' })).esito).toBe('allievo');
  });

  it('senza né allievo né nome, dice esattamente che cosa fare', () => {
    const r = controllaAppuntamento(dati({}));
    expect(r.esito).toBe('incompleto');
    expect(r.problemi.join(' ')).toContain('scrivi il nome');
  });

  it('il messaggio non dice più «seleziona allievo» e basta', () => {
    const m = messaggioMancante(controllaAppuntamento(dati({})));
    expect(m).toContain('anagrafica');
    expect(m).toContain('nome');
  });
});

describe('gli altri tipi l\'allievo ce l\'hanno sempre', () => {
  // Allenamento, nutrizione e gruppo scalano dal percorso di una
  // persona precisa: senza quella persona non c'è niente da scalare.
  it('allenamento e nutrizione senza allievo non si salvano', () => {
    expect(controllaAppuntamento(dati({ tipo: 'training' })).esito).toBe('incompleto');
    expect(controllaAppuntamento(dati({ tipo: 'nutrition' })).esito).toBe('incompleto');
  });

  it('nemmeno con un nome scritto a mano', () => {
    const r = controllaAppuntamento(dati({ tipo: 'training', nomeOspite: 'Mario' }));
    expect(r.esito).toBe('incompleto');
  });

  it('il gruppo spiega perché serve l\'anagrafica', () => {
    const r = controllaAppuntamento(dati({ tipo: 'gruppo', nomeOspite: 'Mario' }));
    expect(r.esito).toBe('incompleto');
    expect(r.problemi.join(' ')).toContain('una persona per volta');
  });
});

describe('il giorno serve sempre', () => {
  it('senza data non si salva, nemmeno una consulenza col nome', () => {
    const r = controllaAppuntamento(dati({ nomeOspite: 'Anna', data: '' }));
    expect(r.esito).toBe('incompleto');
    expect(r.problemi.join(' ')).toContain('giorno');
  });

  it('senza data non si salva nemmeno con l\'allievo', () => {
    expect(controllaAppuntamento(dati({ studentId: 'abc', data: null })).esito)
      .toBe('incompleto');
  });
});

describe('un nome scritto a mano è un nome vero', () => {
  it('si ripulisce da spazi e doppi spazi', () => {
    expect(nomeOspiteValido('  Maria   Rossi ')).toBe('Maria Rossi');
  });

  it('due lettere bastano, una no', () => {
    expect(nomeOspiteValido('Bo')).toBe('Bo');
    expect(nomeOspiteValido('A')).toBeNull();
  });

  it('«???» e «  » non sono nomi', () => {
    expect(nomeOspiteValido('???')).toBeNull();
    expect(nomeOspiteValido('   ')).toBeNull();
    expect(nomeOspiteValido('123')).toBeNull();
    expect(nomeOspiteValido(null)).toBeNull();
  });

  it('gli accenti italiani non fanno scartare il nome', () => {
    expect(nomeOspiteValido('Niccolò Aversa')).toBe('Niccolò Aversa');
  });
});
