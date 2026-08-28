import {
  computeOggi, dimensioneDelGiorno, maturitaDi, DIMENSIONI, OGGI_VERSION,
  TwinState, OggiInput,
} from '../oggi';

// ============================================================
// OGGI — il gemello parla. Test a verità nota.
// Il caso principale NON è la persona conosciuta: è quella che
// il gemello non conosce ancora. Si testa per prima.
// ============================================================

const base = (over: Partial<OggiInput> = {}): OggiInput => ({
  date: new Date('2026-08-24T08:00:00'), // lunedì
  twin: null,
  checkinOggi: false,
  haSchedaAttiva: false,
  allenatoOggi: false,
  ...over,
});

const twin = (over: Partial<TwinState> = {}): TwinState => ({
  readiness: { latest_v2: 70, latest_penalized: 70, slope_14d: 0, checkins_14d: 8, checkin_gap_days: 0 },
  load: { status: 'ok', acwr: 1.0, weekly_volume_kg: 4000 },
  adherence: { workouts_28d: 8, presences_14d: 5, consistency_weeks: 3 },
  ...over,
});

describe('il Metodo è visibile ogni giorno', () => {
  it('esistono sette dimensioni, una per giorno', () => {
    expect(DIMENSIONI).toHaveLength(7);
    const keys = DIMENSIONI.map((d) => d.key);
    expect(new Set(keys).size).toBe(7);
  });

  it('la dimensione del giorno è deterministica sulla data', () => {
    const d1 = dimensioneDelGiorno(new Date('2026-08-24T06:00:00'));
    const d2 = dimensioneDelGiorno(new Date('2026-08-24T23:00:00'));
    expect(d1.key).toBe(d2.key);
    const altroGiorno = dimensioneDelGiorno(new Date('2026-08-25T08:00:00'));
    expect(altroGiorno.key).not.toBe(d1.key);
  });

  it('c\'è SEMPRE una dimensione, anche a gemello vuoto', () => {
    const o = computeOggi(base());
    expect(o.dimensione).toBeDefined();
    expect(o.dimensione.domanda.length).toBeGreaterThan(0);
  });
});

describe('COLD START — il caso principale', () => {
  it('gemello assente: dichiara di non sapere, non finge', () => {
    const o = computeOggi(base());
    expect(o.maturita).toBe('sconosciuto');
    expect(o.stato).toBe('Non ti conosco ancora.');
    expect(o.tono).toBe('neutro');
    // nessun numero inventato nel perché
    expect(o.perche.join(' ')).not.toMatch(/\d+ ascolti/);
  });

  it('gemello assente: l\'azione è aprire il gemello, dentro il linguaggio del Metodo', () => {
    const o = computeOggi(base());
    expect(o.azione.apreIlGemello).toBe(true);
    expect(o.azione.route).toBe('Checkin');
    // il sottotitolo è la voce della dimensione, non un modulo da compilare
    expect(o.azione.sottotitolo).toBe(o.dimensione.osserva);
  });

  it('pochi ascolti: sta conoscendo, non emette ancora verdetti', () => {
    const o = computeOggi(base({ twin: twin({
      readiness: { latest_v2: 80, latest_penalized: 80, checkins_14d: 2, slope_14d: 0, checkin_gap_days: 0 },
    }) }));
    expect(o.maturita).toBe('in_ascolto');
    expect(o.stato).toBe('Ti sto conoscendo.');
    expect(o.stato).not.toContain('pronto');
  });

  it('maturità: 0 dati → sconosciuto · 2 ascolti → in ascolto · 3+ → noto', () => {
    expect(maturitaDi(null)).toBe('sconosciuto');
    expect(maturitaDi({ readiness: { checkins_14d: 0 }, adherence: { workouts_28d: 0 } })).toBe('sconosciuto');
    expect(maturitaDi({ readiness: { checkins_14d: 2 } })).toBe('in_ascolto');
    expect(maturitaDi({ readiness: { checkins_14d: 6 } })).toBe('noto');
  });
});

describe('LO STATO — linguaggio, mai un numero nudo', () => {
  const conScore = (s: number) => computeOggi(base({
    checkinOggi: true,
    twin: twin({ readiness: {
      latest_v2: s, latest_penalized: s, checkins_14d: 8, slope_14d: 0, checkin_gap_days: 0,
    } }),
  }));

  it('alto → pronto · medio → misura · basso → recupero', () => {
    expect(conScore(82).stato).toBe('Il corpo è pronto.');
    expect(conScore(65).stato).toBe('Il corpo risponde.');
    expect(conScore(50).stato).toBe('Il corpo chiede misura.');
    expect(conScore(30).stato).toBe('Il corpo chiede recupero.');
  });

  it('nessuna riga di stato contiene cifre', () => {
    [82, 65, 50, 30].forEach((s) => {
      expect(conScore(s).stato).not.toMatch(/\d/);
    });
  });

  it('usa il punteggio penalizzato dal carico quando c\'è', () => {
    const o = computeOggi(base({
      checkinOggi: true,
      twin: twin({ readiness: {
        latest_v2: 80, latest_penalized: 40, checkins_14d: 8, slope_14d: 0, checkin_gap_days: 0,
      } }),
    }));
    expect(o.stato).toBe('Il corpo chiede recupero.');
  });
});

describe('IL PERCHÉ — solo evidenze vere', () => {
  it('mostra gli ascolti reali e la costanza', () => {
    const o = computeOggi(base({
      checkinOggi: true,
      twin: twin({ adherence: { workouts_28d: 10, presences_14d: 6, consistency_weeks: 5 } }),
    }));
    expect(o.perche.join(' ')).toContain('8 ascolti');
    expect(o.perche.join(' ')).toContain('5 settimane');
  });

  it('carico in taratura: lo dice, non inventa una lettura', () => {
    const o = computeOggi(base({
      checkinOggi: true,
      twin: twin({ load: { status: 'calibrating', acwr: null, weekly_volume_kg: 0 } }),
    }));
    expect(o.perche.join(' ')).toContain('taratura');
  });

  it('carico oltre soglia: lo dice in linguaggio, non in numeri', () => {
    const o = computeOggi(base({
      checkinOggi: true,
      twin: twin({ load: { status: 'ok', acwr: 1.9, weekly_volume_kg: 9000 } }),
    }));
    expect(o.perche.join(' ')).toContain('più di quanto gli hai abituato');
  });

  it('mai più di tre righe: una schermata, una cosa', () => {
    const o = computeOggi(base({
      checkinOggi: true,
      twin: twin({
        readiness: { latest_v2: 50, latest_penalized: 50, checkins_14d: 9, slope_14d: -3, checkin_gap_days: 9 },
        load: { status: 'ok', acwr: 1.8, weekly_volume_kg: 9000 },
        adherence: { workouts_28d: 12, presences_14d: 7, consistency_weeks: 8 },
      }),
    }));
    expect(o.perche.length).toBeLessThanOrEqual(3);
  });

  it('gemello vuoto: nessuna evidenza fabbricata', () => {
    const o = computeOggi(base());
    expect(o.perche).toEqual(['Il gemello si apre con il primo ascolto.']);
  });
});

describe("L'AZIONE — una sola, con gerarchia", () => {
  it('senza check-in di oggi, l\'ascolto viene prima di tutto', () => {
    const o = computeOggi(base({
      checkinOggi: false, haSchedaAttiva: true,
      twin: twin(),
    }));
    expect(o.azione.route).toBe('Checkin');
  });

  it('corpo in recupero: l\'allenamento NON è l\'azione di oggi', () => {
    const o = computeOggi(base({
      checkinOggi: true, haSchedaAttiva: true, allenatoOggi: false,
      twin: twin({ readiness: {
        latest_v2: 30, latest_penalized: 30, checkins_14d: 8, slope_14d: 0, checkin_gap_days: 0,
      } }),
    }));
    expect(o.azione.route).not.toBe('Scheda');
    expect(o.azione.titolo).toContain('recupera');
  });

  it('corpo pronto con scheda: la seduta è la cosa di oggi', () => {
    const o = computeOggi(base({
      checkinOggi: true, haSchedaAttiva: true, allenatoOggi: false,
      twin: twin({ readiness: {
        latest_v2: 80, latest_penalized: 80, checkins_14d: 8, slope_14d: 0, checkin_gap_days: 0,
      } }),
    }));
    expect(o.azione.route).toBe('Scheda');
  });

  it('corpo a metà: allena, ma con misura dichiarata', () => {
    const o = computeOggi(base({
      checkinOggi: true, haSchedaAttiva: true, allenatoOggi: false,
      twin: twin({ readiness: {
        latest_v2: 50, latest_penalized: 50, checkins_14d: 8, slope_14d: 0, checkin_gap_days: 0,
      } }),
    }));
    expect(o.azione.titolo).toContain('misura');
  });

  it('già allenato e già ascoltato: resta il Metodo, non un menù', () => {
    const o = computeOggi(base({
      checkinOggi: true, haSchedaAttiva: true, allenatoOggi: true,
      twin: twin(),
    }));
    expect(o.azione.titolo).toBe(o.dimensione.domanda);
  });
});

describe('garanzie', () => {
  it('riproducibile: stessi input → stesso output', () => {
    const i = base({ checkinOggi: true, twin: twin() });
    expect(JSON.stringify(computeOggi(i))).toBe(JSON.stringify(computeOggi(i)));
  });

  it('versione tracciata', () => {
    expect(computeOggi(base()).version).toBe(OGGI_VERSION);
  });

  it('non esplode mai: gemello parziale o campi mancanti', () => {
    expect(() => computeOggi(base({ twin: {} }))).not.toThrow();
    expect(() => computeOggi(base({ twin: { readiness: {} } }))).not.toThrow();
    expect(() => computeOggi(base({ twin: { readiness: { latest_v2: null } } }))).not.toThrow();
  });

  it('c\'è sempre esattamente UNA azione', () => {
    [base(), base({ checkinOggi: true, twin: twin() })].forEach((i) => {
      const o = computeOggi(i);
      expect(o.azione.titolo.length).toBeGreaterThan(0);
      expect(o.azione.route.length).toBeGreaterThan(0);
    });
  });
});
