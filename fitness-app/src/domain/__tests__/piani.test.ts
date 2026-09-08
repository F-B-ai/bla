import {
  scegliPiano, giaScalata, PianoScalabile, PIANI_VERSION,
} from '../piani';

// ============================================================
// SCALARE UNA LEZIONE
// La regola che tutti i test difendono: non si fallisce MAI in
// silenzio. Ogni esito porta una frase che il coach legge —
// perché qui si parla di soldi, e chi lavora si fida.
// ============================================================

const OGGI = new Date(2026, 7, 31, 12, 0, 0);

const piano = (over: Partial<PianoScalabile> = {}): PianoScalabile => ({
  id: 'p1',
  inizio: new Date(2026, 7, 1),
  fine: new Date(2026, 9, 31),
  lezioniIncluse: 10,
  lezioniUsate: 0,
  consulenzeIncluse: 2,
  consulenzeUsate: 0,
  creatoIl: new Date(2026, 7, 1),
  ...over,
});

describe('il caso normale', () => {
  it('un percorso attivo con posti: si scala e si dice quante restano', () => {
    const s = scegliPiano([piano({ lezioniUsate: 2 })], 'lezione', OGGI);
    expect(s.esito).toBe('scalata');
    expect(s.piano!.id).toBe('p1');
    expect(s.restanti).toBe(7);
    expect(s.messaggio).toContain('3 di 10');
    expect(s.messaggio).toContain('restano 7');
  });

  it('l\'ultima lezione si annuncia al singolare', () => {
    const s = scegliPiano([piano({ lezioniUsate: 8 })], 'lezione', OGGI);
    expect(s.restanti).toBe(1);
    expect(s.messaggio).toContain('resta 1');
  });

  it('le consulenze si contano a parte dalle lezioni', () => {
    const s = scegliPiano([piano({ consulenzeUsate: 1 })], 'consulenza', OGGI);
    expect(s.esito).toBe('scalata');
    expect(s.messaggio).toContain('2 di 2');
    expect(s.restanti).toBe(0);
  });
});

describe('IL DIFETTO CHE HA TROVATO FRANCESCO', () => {
  it('percorso creato DOPO, che parte domani: si scala lo stesso e lo dice', () => {
    const dopo = piano({
      inizio: new Date(2026, 8, 1), // domani
      fine: new Date(2026, 11, 1),
      creatoIl: new Date(2026, 7, 31),
    });
    const s = scegliPiano([dopo], 'lezione', OGGI);
    expect(s.esito).toBe('scalata');
    expect(s.fuoriPeriodo).toBe(true);
    expect(s.messaggio).toContain('non comprende oggi');
    expect(s.messaggio).toContain('correggile');
  });

  it('percorso già chiuso ma con lezioni non usate: si scala, non si perde', () => {
    const chiuso = piano({
      inizio: new Date(2026, 4, 1), fine: new Date(2026, 6, 31), lezioniUsate: 6,
    });
    const s = scegliPiano([chiuso], 'lezione', OGGI);
    expect(s.esito).toBe('scalata');
    expect(s.fuoriPeriodo).toBe(true);
    expect(s.restanti).toBe(3);
  });

  it('NIENTE FALLISCE IN SILENZIO: senza percorso il messaggio lo dice', () => {
    const s = scegliPiano([], 'lezione', OGGI);
    expect(s.esito).toBe('nessun_piano');
    expect(s.piano).toBeNull();
    expect(s.messaggio).toContain('non è stata scalata');
    expect(s.messaggio.length).toBeGreaterThan(30);
  });

  it('percorso esaurito: si dice che la seduta è fuori pacchetto', () => {
    const s = scegliPiano([piano({ lezioniUsate: 10 })], 'lezione', OGGI);
    expect(s.esito).toBe('piano_esaurito');
    expect(s.messaggio).toContain('fuori pacchetto');
  });

  it('percorso senza lezioni incluse: non c\'è niente da scalare, e si spiega', () => {
    const s = scegliPiano([piano({ lezioniIncluse: 0 })], 'lezione', OGGI);
    expect(s.esito).toBe('piano_senza_lezioni');
    expect(s.messaggio).toContain('non prevede');
  });
});

describe('quale percorso, quando ce ne sono più di uno', () => {
  it('fra due attivi, vince il più recente', () => {
    const vecchio = piano({ id: 'vecchio', creatoIl: new Date(2026, 5, 1) });
    const nuovo = piano({ id: 'nuovo', creatoIl: new Date(2026, 7, 20) });
    const s = scegliPiano([vecchio, nuovo], 'lezione', OGGI);
    expect(s.piano!.id).toBe('nuovo');
  });

  it('un attivo pieno non blocca: si passa a quello con posti', () => {
    const pieno = piano({ id: 'pieno', lezioniUsate: 10 });
    const fuori = piano({
      id: 'fuori', inizio: new Date(2026, 8, 10), fine: new Date(2026, 10, 10),
    });
    const s = scegliPiano([pieno, fuori], 'lezione', OGGI);
    expect(s.esito).toBe('scalata');
    expect(s.piano!.id).toBe('fuori');
    expect(s.fuoriPeriodo).toBe(true);
  });

  it('l\'attivo con posti batte sempre quello fuori periodo', () => {
    const attivo = piano({ id: 'attivo' });
    const fuori = piano({
      id: 'fuori', inizio: new Date(2026, 8, 10), fine: new Date(2026, 10, 10),
      creatoIl: new Date(2026, 7, 30),
    });
    const s = scegliPiano([fuori, attivo], 'lezione', OGGI);
    expect(s.piano!.id).toBe('attivo');
    expect(s.fuoriPeriodo).toBe(false);
  });

  it('date corrotte non fanno esplodere niente', () => {
    const rotto = { ...piano({ id: 'rotto' }), inizio: new Date('x'), fine: new Date('x') };
    expect(() => scegliPiano([rotto as any], 'lezione', OGGI)).not.toThrow();
    const s = scegliPiano([rotto as any], 'lezione', OGGI);
    expect(s.esito).toBe('scalata'); // fuori periodo, ma i posti ci sono
    expect(s.fuoriPeriodo).toBe(true);
  });
});

describe('mai due volte la stessa lezione', () => {
  it('una seduta già scalata non toglie un secondo posto', () => {
    const s = giaScalata(true, 'lezione');
    expect(s).not.toBeNull();
    expect(s!.esito).toBe('gia_scalata');
    expect(s!.messaggio).toContain('già stata scalata');
  });

  it('una seduta non ancora scalata prosegue normalmente', () => {
    expect(giaScalata(false, 'lezione')).toBeNull();
  });
});

describe('versione', () => {
  it('tracciata', () => {
    expect(PIANI_VERSION).toBe(1);
  });
});
