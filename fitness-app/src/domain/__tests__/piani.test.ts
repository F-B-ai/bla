import {
  scegliPiano, giaScalata, PianoScalabile, PIANI_VERSION,
  registrazionePassata, restaDaScalare, giorno,
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

// ============================================================
// «QUANDO METTO UN APPUNTAMENTO PASSATO, QUESTO NON VIENE
//  SCALATO DAL PIANO» — 12 settembre 2026
// ------------------------------------------------------------
// La seconda copia. Registrare una seduta già avvenuta passava
// per un'altra funzione, che cercava un percorso attivo OGGI e
// usciva zitta se non lo trovava. Questi test difendono la
// strada unica.
// ============================================================

describe('una seduta passata la paga il percorso di QUEL giorno', () => {
  const AGOSTO = new Date(2026, 7, 10, 18, 0, 0); // la seduta
  const SETTEMBRE = new Date(2026, 8, 12, 12, 0, 0); // il giorno in cui la registro

  const pacchettoAgosto = piano({
    id: 'agosto', inizio: new Date(2026, 7, 1), fine: new Date(2026, 7, 31),
  });
  const pacchettoSettembre = piano({
    id: 'settembre', inizio: new Date(2026, 8, 1), fine: new Date(2026, 8, 30),
    creatoIl: new Date(2026, 8, 1),
  });

  it('scala dal pacchetto di agosto, non da quello in corso', () => {
    const s = scegliPiano(
      [pacchettoAgosto, pacchettoSettembre], 'lezione', AGOSTO, SETTEMBRE
    );
    expect(s.esito).toBe('scalata');
    expect(s.piano!.id).toBe('agosto');
    expect(s.fuoriPeriodo).toBe(false);
  });

  // IL DIFETTO: prima qui non succedeva niente, in silenzio. Il
  // percorso di agosto era chiuso, quello attivo oggi non c'era.
  it('se il pacchetto di quel giorno non esiste più, scala lo stesso e lo dice', () => {
    const s = scegliPiano([pacchettoSettembre], 'lezione', AGOSTO, SETTEMBRE);
    expect(s.esito).toBe('scalata');
    expect(s.fuoriPeriodo).toBe(true);
    expect(s.messaggio).toContain('10 agosto');
  });

  it('senza nessun percorso non resta zitto', () => {
    const s = scegliPiano([], 'lezione', AGOSTO, SETTEMBRE);
    expect(s.esito).toBe('nessun_piano');
    expect(s.messaggio).toContain('non è stata scalata');
  });

  it('per una seduta di oggi le parole restano quelle di prima', () => {
    const fuori = piano({ inizio: new Date(2026, 8, 20), fine: new Date(2026, 9, 20) });
    const s = scegliPiano([fuori], 'lezione', SETTEMBRE, SETTEMBRE);
    expect(s.messaggio).toContain('non comprende oggi');
  });
});

describe('la frase che legge il coach dopo aver registrato una seduta passata', () => {
  const QUANDO = new Date(2026, 7, 10);

  it('quando ha scalato, dice che cosa ha scalato', () => {
    const s = scegliPiano([piano()], 'lezione', QUANDO, QUANDO);
    const a = registrazionePassata(s, QUANDO);
    expect(a.titolo).toBe('Seduta registrata');
    expect(a.testo).toContain('10 agosto');
    expect(a.testo).toContain('1 di 10');
  });

  // Prima diceva «Appuntamento passato registrato!» anche quando il
  // percorso non era stato toccato.
  it('quando NON ha scalato, il titolo stesso lo dice', () => {
    const s = scegliPiano([], 'lezione', QUANDO, QUANDO);
    const a = registrazionePassata(s, QUANDO);
    expect(a.titolo).toContain('NON scalata');
    expect(a.testo).toContain('non è stata scalata');
  });

  it('e spiega come si rimedia, invece di lasciarti lì', () => {
    const s = scegliPiano([piano({ lezioniUsate: 10 })], 'lezione', QUANDO, QUANDO);
    const a = registrazionePassata(s, QUANDO);
    expect(a.testo).toContain('Scala dal percorso');
    expect(a.testo).toContain('da scalare');
  });

  it('quando ha scalato non propone rimedi che non servono', () => {
    const s = scegliPiano([piano()], 'lezione', QUANDO, QUANDO);
    expect(registrazionePassata(s, QUANDO).testo).not.toContain('Scala dal percorso');
  });
});

describe('quali sedute mostrano il pulsante «Scala dal percorso»', () => {
  it('quella che ha provato e non ci è riuscita', () => {
    expect(restaDaScalare({ scaloDaFare: true })).toBe(true);
  });

  it('non quella che ha già scalato', () => {
    expect(restaDaScalare({ scaloDaFare: true, planDecremented: true })).toBe(false);
  });

  // Le sedute chiuse prima del 12 settembre 2026 non hanno nessuno dei
  // due campi: non si sa se abbiano scalato, e proporre il pulsante su
  // tutte vorrebbe dire invitare a scalare due volte.
  it('e MAI una seduta vecchia, di cui non sappiamo niente', () => {
    expect(restaDaScalare({})).toBe(false);
    expect(restaDaScalare({ planDecremented: false })).toBe(false);
  });
});

describe('le date si scrivono in italiano, senza dipendere dal telefono', () => {
  it('giorno e mese per esteso', () => {
    expect(giorno(new Date(2026, 8, 5))).toBe('5 settembre');
    expect(giorno(new Date(2026, 0, 31))).toBe('31 gennaio');
  });

  it('una data storta non lascia un buco nella frase', () => {
    expect(giorno(new Date('boh'))).toBe('quel giorno');
  });
});

describe('versione', () => {
  it('tracciata', () => {
    expect(PIANI_VERSION).toBe(2);
  });
});
