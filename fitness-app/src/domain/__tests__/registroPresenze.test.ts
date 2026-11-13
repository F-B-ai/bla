// ============================================================
// IL CONFRONTO FRA I DUE REGISTRI
// ------------------------------------------------------------
// Questo documento esce dallo studio e finisce sul tavolo di un
// professionista. Un numero sbagliato qui non è un difetto
// dell'applicazione: è una cosa falsa detta a chi deve consigliare.
//
// Per questo i test guardano soprattutto i casi in cui il conto
// potrebbe sbagliare per ECCESSO — un ingresso segnalato come
// scoperto quando una seduta c'era. La prima riga sbagliata che
// qualcuno trova toglie credito a tutte le altre.
// ============================================================

import {
  aData, giornoDi, ritardoDiScrittura, rigaSeduta, ingressiSenzaSeduta,
  riepilogoPerConduttore, componiRegistro, AVVERTENZE,
  GIORNI_RITARDO_RILEVANTE, SedutaRegistro, IngressoRegistro,
} from '../registroPresenze';

const d = (s: string) => new Date(`${s}T10:00:00`);
const ts = (s: string) => ({ seconds: Math.floor(new Date(s).getTime() / 1000) });

const nomeAllievo = (id: string) => ({ a1: 'Arianna Russo', a2: 'Marco Bruno' }[id] || '');
const nomeConduttore = (id: string) => ({ c1: 'Giuseppe', c2: 'Francesco' }[id] || '');

const seduta = (p: Partial<SedutaRegistro> = {}): SedutaRegistro => ({
  id: 's1',
  studentId: 'a1',
  collaboratorId: 'c1',
  date: d('2026-10-05'),
  startTime: '10:00',
  status: 'completed',
  createdAt: d('2026-10-05'),
  ...p,
});

describe('le date arrivano in tre forme e una sola si può contare', () => {
  it('legge una Date, un Timestamp di Firestore e un testo', () => {
    expect(aData(new Date('2026-10-05T09:00:00'))?.getDate()).toBe(5);
    expect(aData(ts('2026-10-05T09:00:00'))?.getDate()).toBe(5);
    expect(aData('2026-10-05T09:00:00')?.getDate()).toBe(5);
    expect(aData({ toDate: () => new Date('2026-10-05T09:00:00') })?.getDate()).toBe(5);
  });

  it('e non inventa niente quando la data non c\'è o non si legge', () => {
    expect(aData(null)).toBeNull();
    expect(aData(undefined)).toBeNull();
    expect(aData('non è una data')).toBeNull();
    expect(aData(new Date('x'))).toBeNull();
    expect(aData({})).toBeNull();
  });
});

describe('quando è stata scritta una seduta', () => {
  it('scritta lo stesso giorno: zero, che è la normalità', () => {
    expect(ritardoDiScrittura(seduta())).toBe(0);
  });

  it('scritta sei giorni dopo: sei', () => {
    expect(ritardoDiScrittura(seduta({ createdAt: d('2026-10-11') }))).toBe(6);
  });

  it('fissata in anticipo: numero negativo, e non è un ritardo', () => {
    expect(ritardoDiScrittura(seduta({ createdAt: d('2026-10-01') }))).toBe(-4);
  });

  it('conta i giorni di calendario, non le ore: la sera tardi è lo stesso giorno', () => {
    const s = seduta({
      date: new Date('2026-10-05T08:00:00'),
      createdAt: new Date('2026-10-05T23:50:00'),
    });
    expect(ritardoDiScrittura(s)).toBe(0);
  });

  it('senza la data di scrittura torna null, non zero', () => {
    // Zero direbbe «scritta puntualmente», che è una cosa diversa da
    // «non lo sappiamo»: sulle sedute vecchie sarebbe una bugia.
    expect(ritardoDiScrittura(seduta({ createdAt: undefined }))).toBeNull();
    expect(rigaSeduta(seduta({ createdAt: null }))?.ritardo).toBeNull();
  });

  it('una seduta senza data non produce una riga', () => {
    expect(rigaSeduta(seduta({ date: null }))).toBeNull();
  });
});

describe('gli ingressi senza seduta', () => {
  // `ingressiSenzaSeduta` ora torna anche il conto di chi è stato
  // lasciato fuori: qui si guardano le righe.
  const ingresso = (p: Partial<IngressoRegistro> = {}): IngressoRegistro => ({
    id: 'i1',
    studentId: 'a1',
    studentName: 'Arianna Russo',
    timestamp: new Date('2026-10-06T18:30:00'),
    ...p,
  });

  it('un ingresso in un giorno senza sedute compare', () => {
    const { righe: r } = ingressiSenzaSeduta([ingresso()], [seduta()], nomeAllievo);
    expect(r).toHaveLength(1);
    expect(r[0].giorno).toBe('2026-10-06');
    expect(r[0].ora).toBe('18:30');
    expect(r[0].allievo).toBe('Arianna Russo');
  });

  it('se quel giorno una seduta c\'era, NON compare', () => {
    const { righe: r } = ingressiSenzaSeduta(
      [ingresso({ timestamp: new Date('2026-10-05T18:30:00') })],
      [seduta()],
      nomeAllievo
    );
    expect(r).toHaveLength(0);
  });

  it('basta una seduta ANNULLATA perché non compaia: si sbaglia per difetto', () => {
    const { righe: r } = ingressiSenzaSeduta(
      [ingresso({ timestamp: new Date('2026-10-05T18:30:00') })],
      [seduta({ status: 'cancelled_by_student' })],
      nomeAllievo
    );
    expect(r).toHaveLength(0);
  });

  it('la seduta di un ALTRO allievo quel giorno non copre questo ingresso', () => {
    const { righe: r } = ingressiSenzaSeduta(
      [ingresso({ timestamp: new Date('2026-10-05T18:30:00') })],
      // a2 si allena quel giorno; a1 ha una seduta in un altro giorno,
      // quindi è una persona che fa sedute e il suo ingresso conta
      [seduta({ studentId: 'a2' }), seduta({ id: 's9', studentId: 'a1', date: d('2026-10-01') })],
      nomeAllievo
    );
    expect(r).toHaveLength(1);
  });

  // ------------------------------------------------------------
  // CHI VIENE SOLO IN SALA NON È UN CASO DA SEGNALARE
  // ------------------------------------------------------------
  // 12 ottobre 2026, sui dati veri: 90 ingressi su 109 risultavano
  // «senza seduta», e quasi tutti erano iscritti che vengono ad
  // allenarsi da soli — non hanno mai fatto un personal in vita loro.
  // Un elenco così non dice niente, e trascina con sé anche le poche
  // righe che qualcosa direbbero.

  it('l\'ingresso di chi non ha MAI una seduta non finisce nell\'elenco', () => {
    const e = ingressiSenzaSeduta(
      [ingresso({ studentId: 'solo_sala', studentName: 'Chi viene in sala' })],
      [seduta()],
      nomeAllievo
    );
    expect(e.righe).toHaveLength(0);
    expect(e.esclusi).toBe(1);
    expect(e.personeEscluse).toBe(1);
  });

  it('ma viene contato, perché nascondere un numero è un\'altra bugia', () => {
    const e = ingressiSenzaSeduta(
      [
        ingresso({ id: 'x1', studentId: 'solo_sala' }),
        ingresso({ id: 'x2', studentId: 'solo_sala' }),
        ingresso({ id: 'x3', studentId: 'altro_sala' }),
      ],
      [seduta()],
      nomeAllievo
    );
    expect(e.esclusi).toBe(3);
    expect(e.personeEscluse).toBe(2);
  });

  it('un ingresso senza data o senza allievo si scarta invece di indovinare', () => {
    const { righe: r } = ingressiSenzaSeduta(
      [ingresso({ timestamp: null }), ingresso({ id: 'i2', studentId: '' })],
      [],
      nomeAllievo
    );
    expect(r).toHaveLength(0);
  });

  it('se il nome non è nell\'ingresso lo cerca, e non lascia mai vuoto', () => {
    const { righe: r } = ingressiSenzaSeduta(
      [ingresso({ studentName: '' })], [seduta()], nomeAllievo
    );
    expect(r[0].allievo).toBe('Arianna Russo');
    const { righe: s } = ingressiSenzaSeduta(
      [ingresso({ studentName: '', studentId: 'ignoto' })],
      [seduta({ studentId: 'ignoto', date: d('2026-10-01') })],
      nomeAllievo
    );
    expect(s[0].allievo).toBe('Allievo');
  });

  it('escono in ordine di giorno e di ora', () => {
    const { righe: r } = ingressiSenzaSeduta([
      ingresso({ id: 'b', timestamp: new Date('2026-10-07T09:00:00') }),
      ingresso({ id: 'a', timestamp: new Date('2026-10-06T19:00:00') }),
      ingresso({ id: 'c', timestamp: new Date('2026-10-06T08:00:00') }),
    ], [seduta({ date: d('2026-10-01') })], nomeAllievo);
    expect(r.map((x) => x.id)).toEqual(['c', 'a', 'b']);
  });
});

describe('il riepilogo per conduttore', () => {
  const sedute: SedutaRegistro[] = [
    seduta({ id: '1', createdAt: d('2026-10-05') }),                      // puntuale
    seduta({ id: '2', createdAt: d('2026-10-07') }),                      // 2 giorni
    seduta({ id: '3', createdAt: d('2026-10-20') }),                      // 15 giorni
    seduta({ id: '4', collaboratorId: 'c2', createdAt: d('2026-10-05') }),
  ];

  it('conta le sedute di ciascuno', () => {
    const r = riepilogoPerConduttore(sedute, nomeConduttore);
    expect(r[0].nome).toBe('Giuseppe');
    expect(r[0].sedute).toBe(3);
    expect(r[1].nome).toBe('Francesco');
  });

  it('separa «scritte dopo» da «scritte molto dopo»', () => {
    const g = riepilogoPerConduttore(sedute, nomeConduttore)[0];
    expect(g.scritteDopo).toBe(2);
    expect(g.scritteMoltoDopo).toBe(1);
    expect(GIORNI_RITARDO_RILEVANTE).toBe(7);
  });

  it('dice il ritardo massimo e quello medio delle sole sedute in ritardo', () => {
    const g = riepilogoPerConduttore(sedute, nomeConduttore)[0];
    expect(g.ritardoMassimo).toBe(15);
    expect(g.ritardoMedio).toBe(8.5);
  });

  it('chi ha scritto tutto puntualmente ha zero ovunque, non numeri strani', () => {
    const f = riepilogoPerConduttore(sedute, nomeConduttore)[1];
    expect(f.scritteDopo).toBe(0);
    expect(f.ritardoMassimo).toBe(0);
    expect(f.ritardoMedio).toBe(0);
  });

  it('una seduta senza conduttore non sparisce: finisce in «Non indicato»', () => {
    const r = riepilogoPerConduttore([seduta({ collaboratorId: '' })], nomeConduttore);
    expect(r[0].nome).toBe('Non indicato');
    expect(r[0].sedute).toBe(1);
  });
});

describe('il documento nel suo insieme', () => {
  const registro = componiRegistro({
    sedute: [
      seduta({ id: '1' }),
      seduta({ id: '2', createdAt: d('2026-10-12') }),
      seduta({ id: '3', createdAt: undefined }),
    ],
    ingressi: [
      { id: 'i1', studentId: 'a1', studentName: 'Arianna', timestamp: new Date('2026-10-06T18:00:00') },
      { id: 'i2', studentId: 'a1', studentName: 'Arianna', timestamp: new Date('2026-10-05T09:00:00') },
    ],
    nomeAllievo,
    nomeConduttore,
  });

  it('dice il periodo che copre', () => {
    expect(registro.dal).toBe('2026-10-05');
    expect(registro.al).toBe('2026-10-06');
  });

  it('conta tutto quello che ha contato', () => {
    expect(registro.totaleSedute).toBe(3);
    expect(registro.totaleIngressi).toBe(2);
  });

  it('tiene separate le sedute di cui NON si sa quando sono state scritte', () => {
    expect(registro.seduteSenzaScrittura).toBe(1);
    expect(registro.righeInRitardo.map((r) => r.id)).toEqual(['2']);
  });

  it('e le mette in ordine, dal ritardo più grande', () => {
    const r = componiRegistro({
      sedute: [
        seduta({ id: 'p', createdAt: d('2026-10-07') }),
        seduta({ id: 'g', createdAt: d('2026-10-25') }),
      ],
      ingressi: [], nomeAllievo, nomeConduttore,
    });
    expect(r.righeInRitardo.map((x) => x.id)).toEqual(['g', 'p']);
  });

  it('l\'ingresso del giorno con la seduta non compare fra gli scoperti', () => {
    expect(registro.spaiati.map((s) => s.giorno)).toEqual(['2026-10-06']);
  });

  it('su dati vuoti non si rompe e non inventa un periodo', () => {
    const v = componiRegistro({ sedute: [], ingressi: [], nomeAllievo, nomeConduttore });
    expect(v.totaleSedute).toBe(0);
    expect(v.dal).toBe('');
    expect(v.spaiati).toEqual([]);
    expect(v.conduttori).toEqual([]);
  });
});

describe('le avvertenze sono parte del documento', () => {
  it('dicono che la data di scrittura viene dal server', () => {
    expect(AVVERTENZE.join(' ')).toMatch(/server/i);
    expect(AVVERTENZE.join(' ')).toMatch(/non è modificabile|non modificabile/i);
  });

  it('dicono che un ingresso NON prova una seduta di personal', () => {
    const t = AVVERTENZE.join(' ');
    expect(t).toMatch(/NON dice/);
    expect(t).toMatch(/personal/i);
    expect(t).toMatch(/apre una domanda/i);
  });

  it('dicono che il conteggio è prudente', () => {
    expect(AVVERTENZE.join(' ')).toMatch(/prudente/i);
  });

  it('avvertono che i periodi senza il sistema non sono confrontabili', () => {
    const t = AVVERTENZE.join(' ');
    expect(t).toMatch(/non sono confrontabili/i);
    expect(t).toMatch(/non vanno letti come assenze/i);
  });

  it('e che prima dell\'applicazione non esiste alcun registro', () => {
    expect(AVVERTENZE.join(' ')).toMatch(/non esiste alcun registro/i);
  });

  it('sono cinque, e nessuna è una frase vuota', () => {
    expect(AVVERTENZE).toHaveLength(5);
    AVVERTENZE.forEach((a) => expect(a.length).toBeGreaterThan(60));
  });
});

describe('il giorno si scrive sempre allo stesso modo', () => {
  it('con lo zero davanti, altrimenti l\'ordinamento mente', () => {
    expect(giornoDi(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(giornoDi(new Date(2026, 11, 31))).toBe('2026-12-31');
  });
});

// ============================================================
// QUELLO CHE I DATI VERI HANNO INSEGNATO — 12 ottobre 2026
// ------------------------------------------------------------
// Il primo documento estratto sui dati reali ha mostrato tre difetti
// che sui dati finti non si vedevano. Nessuno dei tre era un errore
// di calcolo: erano tre modi di presentare numeri veri in maniera
// fuorviante — che per un foglio destinato a un professionista è
// peggio di un errore, perché non si nota.
// ============================================================

describe('le sedute non ancora svolte si contano a parte', () => {
  const oggi = new Date('2026-10-12T12:00:00');

  it('un appuntamento della settimana prossima non è lavoro fatto', () => {
    const r = componiRegistro({
      sedute: [
        seduta({ id: 'passata', date: d('2026-10-05') }),
        seduta({ id: 'futura', date: d('2026-10-20') }),
      ],
      ingressi: [], nomeAllievo, nomeConduttore,
    }, oggi);
    expect(r.totaleSedute).toBe(2);
    expect(r.seduteFuture).toBe(1);
  });

  it('il giorno stesso non è futuro', () => {
    const r = componiRegistro({
      sedute: [seduta({ date: d('2026-10-12') })],
      ingressi: [], nomeAllievo, nomeConduttore,
    }, oggi);
    expect(r.seduteFuture).toBe(0);
  });
});

describe('le sedute per mese', () => {
  const oggi = new Date('2026-10-12T12:00:00');
  const dati = {
    sedute: [
      seduta({ id: '1', date: d('2026-09-03') }),
      seduta({ id: '2', date: d('2026-09-10') }),
      seduta({ id: '3', date: d('2026-10-01'), collaboratorId: 'c2' }),
      seduta({ id: '4', date: d('2026-10-20') }), // futura
    ],
    ingressi: [], nomeAllievo, nomeConduttore,
  };

  it('dicono quante ne risultano a ciascuno, mese per mese', () => {
    const m = componiRegistro(dati, oggi).mensili;
    expect(m.map((x) => x.mese)).toEqual(['2026-09', '2026-10']);
    expect(m[0].perConduttore).toEqual([{ nome: 'Giuseppe', sedute: 2 }]);
    expect(m[1].perConduttore).toEqual([{ nome: 'Francesco', sedute: 1 }]);
  });

  it('e non contano quelle ancora da fare', () => {
    const m = componiRegistro(dati, oggi).mensili;
    const ottobre = m.find((x) => x.mese === '2026-10');
    expect(ottobre?.perConduttore.reduce((a, b) => a + b.sedute, 0)).toBe(1);
  });
});

describe('un solo «Non indicato», non uno per ogni id sconosciuto', () => {
  it('due conduttori senza nome fanno una riga sola', () => {
    const r = riepilogoPerConduttore([
      seduta({ id: '1', collaboratorId: 'sparito1' }),
      seduta({ id: '2', collaboratorId: 'sparito2' }),
      seduta({ id: '3', collaboratorId: '' }),
    ], nomeConduttore);
    expect(r).toHaveLength(1);
    expect(r[0].nome).toBe('Non indicato');
    expect(r[0].sedute).toBe(3);
  });
});
