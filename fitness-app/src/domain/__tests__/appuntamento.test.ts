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

// ============================================================
// LE VENTITRÉ DOMANDE SBAGLIATE
// ------------------------------------------------------------
// Nel calendario c'erano 23 confronti «kind === 'training'», scritti
// quando i tipi erano due. Con consulenza e gruppo ognuno diventava
// una domanda sbagliata: una consulenza non è training, quindi finiva
// nel ramo della nutrizione e non si poteva più completare, annullare
// né cancellare. Questi test tengono chiuse quelle strade.
// ============================================================

import {
  eSessione, tipoPercorso, aspetto, ASPETTO, tipoDaSeduta, TipoAppuntamento,
} from '../appuntamento';

const TUTTI: TipoAppuntamento[] = ['training', 'nutrition', 'consulenza', 'gruppo'];

describe('che cosa è salvato come sessione', () => {
  // Il difetto vero: completare, annullare e cancellare passavano da
  // «è training?». Una consulenza è una sessione quanto un allenamento.
  it('allenamento, consulenza e gruppo sono sessioni', () => {
    expect(eSessione('training')).toBe(true);
    expect(eSessione('consulenza')).toBe(true);
    expect(eSessione('gruppo')).toBe(true);
  });

  it('solo la nutrizione non lo è: ha una collezione sua', () => {
    expect(eSessione('nutrition')).toBe(false);
  });
});

describe('da che percorso si scala', () => {
  it('la consulenza scala dalle consulenze', () => {
    expect(tipoPercorso('consulenza')).toBe('consulenza');
    expect(tipoPercorso('nutrition')).toBe('consulenza');
  });

  // Prima il gruppo finiva fra le consulenze per esclusione: era il
  // ramo «tutto ciò che non è training».
  it('il gruppo scala dalle lezioni, non dalle consulenze', () => {
    expect(tipoPercorso('gruppo')).toBe('lezione');
    expect(tipoPercorso('training')).toBe('lezione');
  });
});

describe('come si mostra', () => {
  it('ogni tipo ha etichetta, icona e tonalità: nessuno escluso', () => {
    TUTTI.forEach((t) => {
      const a = aspetto(t);
      expect(a.etichetta.length).toBeGreaterThan(2);
      expect(a.icona.length).toBeGreaterThan(2);
      expect(['accento', 'verde', 'ambra']).toContain(a.tonalita);
    });
  });

  it('nessun tipo si mostra col nome di un altro', () => {
    const etichette = TUTTI.map((t) => aspetto(t).etichetta);
    expect(new Set(etichette).size).toBe(TUTTI.length);
  });

  it('la tabella copre esattamente i tipi esistenti', () => {
    expect(Object.keys(ASPETTO).sort()).toEqual([...TUTTI].sort());
  });

  it('un tipo sconosciuto non fa esplodere niente', () => {
    expect(aspetto('boh' as TipoAppuntamento).etichetta).toBe('Training');
  });
});

describe('il tipo si rilegge da ciò che è salvato', () => {
  // Il primo difetto trovato: tipoSeduta si scriveva e non si rileggeva
  // mai, quindi una consulenza ricaricando l'agenda tornava «Training».
  it('consulenza e gruppo si ritrovano', () => {
    expect(tipoDaSeduta('consulenza')).toBe('consulenza');
    expect(tipoDaSeduta('gruppo')).toBe('gruppo');
  });

  it('le sedute di prima, senza marcatore, restano allenamenti', () => {
    expect(tipoDaSeduta('individuale')).toBe('training');
    expect(tipoDaSeduta(undefined)).toBe('training');
    expect(tipoDaSeduta(null)).toBe('training');
  });
});
