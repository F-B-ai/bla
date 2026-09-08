import {
  ASSI, CICLO, SOGLIE, PROGRESSIONE_VERSION,
  misuraSessione, massimaleEpley, seduteUtili, confronta,
  leggiAdattamento, leggiQualita, prossimoPasso, leggiCapacita,
  incrementoCarico, sintesiPerAI, asse,
  Sessione, AsseId,
} from '../progressione';

// ============================================================
// GERARCHIA DELLA PROGRESSIONE
// Ciò che questi test difendono, sopra ogni altra cosa:
//  · non si aumenta il carico sopra una qualità che peggiora;
//  · non si aumenta niente se il sistema non ha risposto;
//  · l'app non inventa numeri sugli assi che non misura;
//  · il carico non può essere la risposta ogni volta.
// ============================================================

const g = (giorniFa: number) => new Date(Date.UTC(2026, 7, 28) - giorniFa * 86400000);

const seduta = (
  giorniFa: number,
  serie: Array<[number, number] | [number, number, number]>,
  opts: { nome?: string; durataMin?: number; tecnica?: string } = {}
): Sessione => ({
  data: g(giorniFa),
  durataMin: opts.durataMin,
  esercizi: [{
    nome: opts.nome || 'Panca piana',
    tecnica: opts.tecnica,
    serie: serie.map(([reps, kg, rpe]) => ({ reps, kg, rpe })),
  }],
});

// ------------------------------------------------------------

describe('il catalogo degli assi', () => {
  it('sono undici, uno per ogni progressione dichiarata', () => {
    expect(ASSI).toHaveLength(11);
    expect(new Set(ASSI.map((a) => a.id)).size).toBe(11);
  });

  it('coprono tutti e quattro i livelli, e il ciclo ha cinque momenti', () => {
    const livelli = new Set(ASSI.map((a) => a.livello));
    expect(livelli).toEqual(new Set(['esposizione', 'domanda', 'adattamento', 'capacita']));
    expect(CICLO).toHaveLength(5);
    expect(CICLO[CICLO.length - 1].id).toBe('progressione');
  });

  it('il sovraccarico è UNO degli assi, non il livello sopra gli altri', () => {
    expect(asse('carico').livello).toBe('domanda');
    expect(ASSI.filter((a) => a.livello === 'domanda').length).toBeGreaterThan(1);
  });

  it('gli assi che l\'app non misura lo dichiarano, invece di stimare', () => {
    expect(asse('meccanica').fonte).toBe('occhio');
    expect(asse('esposizione').fonte).toBe('occhio');
    expect(asse('carico').fonte).toBe('dati');
    expect(asse('volume').fonte).toBe('dati');
  });

  it('versione tracciata', () => {
    expect(PROGRESSIONE_VERSION).toBe(1);
  });
});

// ------------------------------------------------------------

describe('misura di una seduta', () => {
  it('volume, carico migliore e ripetizioni escono dai numeri veri', () => {
    const m = misuraSessione(seduta(0, [[8, 60], [8, 60], [6, 70]]));
    expect(m.serie).toBe(3);
    expect(m.ripetizioni).toBe(22);
    expect(m.volumeKg).toBe(60 * 8 + 60 * 8 + 70 * 6); // 1380
    expect(m.caricoTop).toBe(70);
    expect(m.ripsAlTop).toBe(6);
  });

  it('le serie mai eseguite non contano', () => {
    const m = misuraSessione(seduta(0, [[8, 60], [0, 60], [0, 0]]));
    expect(m.serie).toBe(1);
  });

  it('senza RPE la riserva è NULL, mai zero', () => {
    const m = misuraSessione(seduta(0, [[8, 60], [8, 60]]));
    expect(m.rirMedio).toBeNull();
    expect(m.serieConRpe).toBe(0);
  });

  it('con RPE la riserva è 10 − RPE', () => {
    const m = misuraSessione(seduta(0, [[8, 60, 8], [8, 60, 9]]));
    expect(m.rirMedio).toBe(1.5);
  });

  it('la densità esiste solo per la seduta intera, mai per un esercizio solo', () => {
    const s = seduta(0, [[10, 50], [10, 50]], { durataMin: 50 });
    expect(misuraSessione(s).densitaKgMin).toBe(20);
    // filtrando un esercizio, la durata sarebbe quella di TUTTA la seduta:
    // un numero che sembra vero e non lo è.
    expect(misuraSessione(s, 'Panca piana').densitaKgMin).toBeNull();
  });

  it('senza durata registrata la densità non si inventa', () => {
    expect(misuraSessione(seduta(0, [[10, 50]])).densitaKgMin).toBeNull();
  });

  it('il massimale si stima solo dove Epley è onesto', () => {
    expect(massimaleEpley(100, 5)).toBe(116.7);
    expect(massimaleEpley(40, 20)).toBe(0); // oltre le 12 ripetizioni: si tace
    expect(massimaleEpley(0, 10)).toBe(0);
  });

  it('sedute vuote o corrotte non rompono niente', () => {
    expect(() => seduteUtili([
      { data: new Date('non-una-data'), esercizi: [] },
      { data: g(1), esercizi: [{ nome: 'X', serie: [] }] },
    ] as any)).not.toThrow();
    expect(seduteUtili([{ data: g(1), esercizi: [] }])).toHaveLength(0);
  });
});

// ------------------------------------------------------------

describe('adattamento: il protagonista è la risposta, non lo stimolo', () => {
  it('stesso carico con più riserva = adattamento', () => {
    const a = leggiAdattamento([
      seduta(14, [[10, 50, 9]]),
      seduta(7, [[10, 50, 7]]),
    ]);
    expect(a.visibile).toBe(true);
    expect(a.tipo).toBe('stesso_carico_piu_facile');
    expect(a.prova).toContain('50 kg × 10');
  });

  it('stesso carico con più ripetizioni = adattamento', () => {
    const a = leggiAdattamento([seduta(14, [[8, 50]]), seduta(7, [[10, 50]])]);
    expect(a.tipo).toBe('stesso_carico_piu_ripetizioni');
    expect(a.visibile).toBe(true);
  });

  it('carico salito CON fatica salita non è adattamento: è solo lavoro più duro', () => {
    const a = leggiAdattamento([
      seduta(14, [[8, 50, 7]]),
      seduta(7, [[8, 60, 10]]),
    ]);
    expect(a.visibile).toBe(false);
    expect(a.prova).toContain('non ancora adattamento');
  });

  it('carico salito a parità di fatica = adattamento', () => {
    const a = leggiAdattamento([
      seduta(14, [[8, 50, 8]]),
      seduta(7, [[8, 60, 8]]),
    ]);
    expect(a.tipo).toBe('carico_salito_stessa_fatica');
  });

  it('una sola seduta non produce nessuna lettura', () => {
    expect(leggiAdattamento([seduta(3, [[8, 50]])]).tipo).toBe('dati_insufficienti');
    expect(leggiAdattamento([]).tipo).toBe('dati_insufficienti');
  });
});

// ------------------------------------------------------------

describe('qualità: il cancello prima di ogni aumento', () => {
  it('senza due valutazioni non si giudica', () => {
    expect(leggiQualita({ valgo: 10 }).stato).toBe('non_misurata');
    expect(leggiQualita(undefined, { valgo: 10 }).stato).toBe('non_misurata');
  });

  it('un compenso che cresce oltre la soglia = peggiora, e lo dice coi numeri', () => {
    const q = leggiQualita({ valgo: 14 }, { valgo: 8 });
    expect(q.stato).toBe('peggiora');
    expect(q.segnale).toContain('valgo');
    expect(q.segnale).toContain('8');
    expect(q.segnale).toContain('14');
  });

  it('variazioni piccole restano stabilità, non tendenze', () => {
    expect(leggiQualita({ valgo: 9 }, { valgo: 8 }).stato).toBe('tiene');
  });

  it('il ROM parziale si riconosce anche con una sola misura', () => {
    expect(leggiQualita({ profonditaGrad: 115 }).romParziale).toBe(true);
    expect(leggiQualita({ profonditaGrad: 85 }).romParziale).toBe(false);
  });
});

// ------------------------------------------------------------

describe('la decisione: quale asse si aumenta adesso', () => {
  const risposto: Sessione[] = [
    seduta(21, [[8, 60, 9], [8, 60, 9]]),
    seduta(14, [[8, 60, 8], [8, 60, 8]]),
    seduta(7, [[8, 60, 7], [8, 60, 7]]),
  ];

  it('con una sola seduta non si aumenta niente: prima si espone', () => {
    const p = prossimoPasso({ storia: [seduta(3, [[8, 60]])] });
    expect(p.asse).toBe('esposizione');
    expect(p.azione).toContain('stessi numeri');
  });

  it('prontezza bassa: nessun aumento, e il motivo è il recupero', () => {
    const p = prossimoPasso({ storia: risposto, prontezza: 31 });
    expect(p.asse).toBe('adattamento');
    expect(p.perche).toContain('31');
    expect(p.azione).not.toMatch(/aument/i);
  });

  it('QUALITÀ CHE PEGGIORA: mai carico. Sale la qualità.', () => {
    const p = prossimoPasso({
      storia: risposto,
      qualita: { ultima: { valgo: 16 }, precedente: { valgo: 9 } },
    });
    expect(p.asse).toBe('tecnica');
    expect(p.azione).toContain('stesso peso');
    expect(p.richiedeOcchio).toBe(true);
  });

  it('ROM parziale: prima l\'ampiezza, poi i chili', () => {
    const p = prossimoPasso({
      storia: risposto,
      qualita: { ultima: { profonditaGrad: 118, valgo: 9 }, precedente: { valgo: 9 } },
    });
    expect(p.asse).toBe('esposizione');
    expect(p.titolo.toLowerCase()).toContain('rom');
  });

  it('sistema che NON ha risposto: si ripete lo stesso stimolo', () => {
    const fermo = [seduta(14, [[8, 60, 8]]), seduta(7, [[8, 60, 8]])];
    const p = prossimoPasso({ storia: fermo });
    expect(p.asse).toBe('adattamento');
    expect(p.azione).toContain('identico');
  });

  it('sistema che HA risposto: si aumenta, e per l\'ipertrofia si parte dal volume', () => {
    const p = prossimoPasso({ storia: risposto, obiettivo: 'ipertrofia' });
    expect(p.asse).toBe('volume');
    expect(p.azione).toContain('60 kg');
    expect(p.azione).toContain('9-10');
  });

  it('per la forza si parte dal carico, con un incremento onesto', () => {
    const p = prossimoPasso({ storia: risposto, obiettivo: 'forza' });
    expect(p.asse).toBe('carico');
    expect(p.azione).toContain('62,5 kg');
  });

  it('IL CARICO NON PUÒ ESSERE LA RISPOSTA OGNI VOLTA: l\'asse ruota', () => {
    const p = prossimoPasso({
      storia: risposto, obiettivo: 'forza',
      ultimiAssi: ['carico', 'carico'],
    });
    expect(p.asse).not.toBe('carico');
  });

  it('esaurita la rotazione recente, sceglie comunque un asse valido', () => {
    const p = prossimoPasso({
      storia: risposto, obiettivo: 'ipertrofia',
      ultimiAssi: ['volume', 'carico'],
    });
    expect(['cedimento', 'densita', 'complessita']).toContain(p.asse);
  });

  it('ogni passo porta con sé le prove misurate e cosa osservare', () => {
    const p = prossimoPasso({ storia: risposto });
    expect(p.prove.length).toBeGreaterThan(1);
    expect(p.prove.join(' ')).toContain('60 kg');
    expect(p.osserva.length).toBeGreaterThan(10);
  });

  it('senza RPE registrato lo dice, invece di far finta di leggere la fatica', () => {
    const senzaRpe = [seduta(14, [[8, 60]]), seduta(7, [[10, 60]])];
    const p = prossimoPasso({ storia: senzaRpe });
    expect(p.prove.join(' ')).toContain('Nessun RPE');
  });

  it('gli assi non misurati chiedono sempre l\'occhio del coach', () => {
    const p = prossimoPasso({
      storia: risposto, obiettivo: 'ipertrofia',
      ultimiAssi: ['volume', 'carico', 'cedimento'],
    });
    if (p.asse === 'complessita') expect(p.richiedeOcchio).toBe(true);
    // regola generale: se l'asse non è misurato dai dati, il passo lo dichiara
    expect(p.richiedeOcchio).toBe(asse(p.asse).fonte !== 'dati');
  });

  it('non esplode mai, nemmeno con storia vuota', () => {
    expect(() => prossimoPasso({ storia: [] })).not.toThrow();
    expect(prossimoPasso({ storia: [] }).asse).toBe('esposizione');
  });
});

describe('incremento del carico', () => {
  it('è piccolo sui pesi piccoli e non è mai una percentuale assurda', () => {
    expect(incrementoCarico(6)).toBe(0.5);
    expect(incrementoCarico(15)).toBe(1);
    expect(incrementoCarico(30)).toBe(2);
    expect(incrementoCarico(100)).toBe(2.5);
    expect(incrementoCarico(0)).toBe(0);
  });
});

// ------------------------------------------------------------

describe('confronto fra finestre', () => {
  const storia = [
    seduta(35, [[8, 50]], { durataMin: 60 }),
    seduta(28, [[8, 50]], { durataMin: 60 }),
    seduta(21, [[8, 50]], { durataMin: 60 }),
    seduta(14, [[8, 60]], { durataMin: 60 }),
    seduta(7, [[8, 60]], { durataMin: 60 }),
    seduta(1, [[8, 60]], { durataMin: 60 }),
  ];

  it('vede il carico salire e lo quantifica', () => {
    const c = confronta(storia).find((x) => x.asse === 'carico')!;
    expect(c.prima).toBe(50);
    expect(c.dopo).toBe(60);
    expect(c.deltaPct).toBe(20);
    expect(c.verso).toBe('su');
  });

  it('gli assi senza dati restano "non_misurato", senza freccia', () => {
    const c = confronta(storia).find((x) => x.asse === 'cedimento')!;
    expect(c.verso).toBe('non_misurato');
    expect(c.dopo).toBeNull();
  });

  it('senza finestra precedente non si disegna nessuna tendenza', () => {
    const c = confronta([seduta(2, [[8, 50]])]).find((x) => x.asse === 'carico')!;
    expect(c.verso).toBe('non_misurato');
  });
});

// ------------------------------------------------------------

describe('le capacità: la domanda finale', () => {
  const storia = [
    seduta(35, [[8, 50]]), seduta(28, [[8, 50]]), seduta(21, [[8, 50]]),
    seduta(14, [[8, 60]]), seduta(7, [[8, 60]]), seduta(1, [[8, 60]]),
  ];

  it('sono sei, come le capacità dichiarate', () => {
    expect(leggiCapacita(storia)).toHaveLength(6);
  });

  it('forza, lavoro e carico si leggono dai log', () => {
    const c = leggiCapacita(storia);
    const forza = c.find((x) => x.id === 'forza')!;
    expect(forza.stato).toBe('misurata');
    expect(forza.verso).toBe('su');
    expect(c.find((x) => x.id === 'carico')!.valore).toBe(60);
  });

  it('MOVIMENTO E CONTROLLO senza valutazione restano non misurati, senza numeri né frecce', () => {
    const c = leggiCapacita(storia);
    const mov = c.find((x) => x.id === 'movimento')!;
    const ctrl = c.find((x) => x.id === 'controllo')!;
    expect(mov.stato).toBe('non_misurata');
    expect(mov.valore).toBeUndefined();
    expect(mov.verso).toBeUndefined();
    expect(ctrl.stato).toBe('non_misurata');
    expect(ctrl.verso).toBeUndefined();
    expect(mov.nota).toContain('analisi dello squat');
  });

  it('con l\'analisi dello squat il movimento diventa misurato', () => {
    const c = leggiCapacita(storia, {
      qualita: { ultima: { profonditaGrad: 88, valgo: 8 }, precedente: { profonditaGrad: 108, valgo: 8 } },
    });
    const mov = c.find((x) => x.id === 'movimento')!;
    expect(mov.stato).toBe('misurata');
    expect(mov.valore).toBe(88);
    expect(mov.nota).toContain('piena');
  });

  it('il recupero senza prontezza e senza RPE non si inventa', () => {
    const rec = leggiCapacita(storia).find((x) => x.id === 'recupero')!;
    expect(rec.stato).toBe('non_misurata');
  });

  it('con la prontezza del gemello il recupero si legge', () => {
    const rec = leggiCapacita(storia, { prontezza: 72 }).find((x) => x.id === 'recupero')!;
    expect(rec.stato).toBe('misurata');
    expect(rec.valore).toBe(72);
  });

  it('storia vuota: sei capacità, tutte non misurate, nessun crollo', () => {
    const c = leggiCapacita([]);
    expect(c).toHaveLength(6);
    expect(c.every((x) => x.stato === 'non_misurata')).toBe(true);
  });
});

// ------------------------------------------------------------

describe('il riassunto che va all\'AI', () => {
  const storia = [
    seduta(21, [[8, 60, 9]]), seduta(14, [[8, 60, 8]]), seduta(7, [[8, 60, 7]]),
  ];

  it('consegna l\'asse deciso dal motore, non una richiesta generica', () => {
    const i = { storia, obiettivo: 'ipertrofia' as const };
    const p = prossimoPasso(i);
    const t = sintesiPerAI(i, p);
    expect(t).toContain('ASSE DI PROGRESSIONE DECISO DAL MOTORE');
    expect(t).toContain('Progressive Volume');
    expect(t).toContain('non aggiungere carico se l\'asse non è il carico');
  });

  it('quando l\'asse non è misurato, avvisa l\'AI di proporre e non affermare', () => {
    const i = { storia, obiettivo: 'ipertrofia' as const, ultimiAssi: ['volume', 'carico', 'cedimento', 'densita'] as AsseId[] };
    const p = prossimoPasso(i);
    const t = sintesiPerAI(i, p);
    if (p.richiedeOcchio) expect(t).toContain('Proponi, non affermare');
  });

  it('vieta esplicitamente di inventare numeri', () => {
    const i = { storia };
    expect(sintesiPerAI(i, prossimoPasso(i))).toContain('non inventare numeri');
  });
});

describe('le soglie stanno in un posto solo', () => {
  it('e sono quelle usate dal motore', () => {
    expect(SOGLIE.caricoUguale).toBe(0.025);
    expect(SOGLIE.profonditaParziale).toBe(100);
    expect(SOGLIE.prontezzaBassa).toBe(40);
  });
});
