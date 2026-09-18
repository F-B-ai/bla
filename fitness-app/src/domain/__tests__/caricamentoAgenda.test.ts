import {
  descriviMancanze, titoloMancanze, mancanza,
  CARICAMENTO_AGENDA_VERSION,
} from '../caricamentoAgenda';

// ============================================================
// «HO PERSO TUTTI GLI APPUNTAMENTI DI CONSULENZA»
// ------------------------------------------------------------
// Non li aveva persi: la schermata non riusciva a leggerli e
// mostrava una lista vuota, identica a «non c'è niente».
// Terza volta questa settimana, terzo file. Il vuoto e il guasto
// devono avere due facce.
// ============================================================

describe('quando è andato tutto bene', () => {
  it('non compare nessun avviso', () => {
    expect(descriviMancanze([])).toBeNull();
    expect(descriviMancanze(undefined as never)).toBeNull();
  });
});

describe('quando manca un pezzo', () => {
  const t = descriviMancanze([{ pezzo: 'ospiti', motivo: 'permission-denied' }])!;

  it('dice QUALE pezzo, con parole che il titolare riconosce', () => {
    expect(t).toContain('consulenze con persone non ancora in anagrafica');
  });

  // La riga che conta: senza, il vuoto continua a sembrare la verità.
  it('dice a chiare lettere che non vuol dire che non ci siano', () => {
    expect(t).toContain('NON vuol dire che non ci siano');
    expect(t).toContain('la lettura non è riuscita');
  });

  it('e mostra il motivo tecnico, brutto ma vero', () => {
    expect(t).toContain('permission-denied');
  });
});

describe('quando ne mancano più di uno', () => {
  const t = descriviMancanze([
    { pezzo: 'ospiti', motivo: 'unavailable' },
    { pezzo: 'visite', motivo: 'unavailable' },
  ])!;

  it('li elenca in italiano, con la «e»', () => {
    expect(t).toContain(' e ');
    expect(t).toContain('visite col nutrizionista');
  });

  it('e non ripete due volte lo stesso motivo', () => {
    expect(t.match(/unavailable/g)).toHaveLength(1);
  });

  it('il titolo cambia quando sono più di uno', () => {
    expect(titoloMancanze([{ pezzo: 'ospiti' }])).toContain('un pezzo');
    expect(titoloMancanze([{ pezzo: 'ospiti' }, { pezzo: 'visite' }]))
      .toBe('Agenda incompleta');
  });
});

describe('un errore senza motivo leggibile non blocca l\'avviso', () => {
  it('l\'avviso compare lo stesso, senza la coda tecnica', () => {
    const t = descriviMancanze([{ pezzo: 'sedute' }])!;
    expect(t).toContain('le sedute');
    expect(t).not.toContain('Dettaglio tecnico');
  });
});

describe('da un errore qualunque a una mancanza', () => {
  it('prende il codice, se c\'è', () => {
    expect(mancanza('ospiti', { code: 'permission-denied' }).motivo)
      .toBe('permission-denied');
  });

  it('altrimenti il messaggio', () => {
    expect(mancanza('visite', new Error('client is offline')).motivo)
      .toContain('offline');
  });

  it('e con niente in mano non inventa un motivo', () => {
    expect(mancanza('sedute', null).motivo).toBeUndefined();
    expect(mancanza('sedute', undefined).motivo).toBeUndefined();
  });
});

describe('versione', () => {
  it('tracciata', () => {
    expect(CARICAMENTO_AGENDA_VERSION).toBe(1);
  });
});
