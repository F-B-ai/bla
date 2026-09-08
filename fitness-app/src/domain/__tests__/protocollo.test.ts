import {
  leggiPriorita, valutaPerimetro, componiPiano, prossimeRipetizioni,
  documentoCliente, CONDUTTORI, conduttore, PROCEDURA, RITMO_TEST,
  DOMANDE_GUIDA, SOGLIE_PROTOCOLLO, PREZZO_VALUTAZIONE, PROTOCOLLO_VERSION,
} from '../protocollo';
import { costruisciQuadro, EventoQuadro } from '../humanInterface';

// ============================================================
// IL PROTOCOLLO DI LAVORO
// Ciò che questi test difendono:
//  · nessuna priorità senza una misura vera sotto;
//  · i conti tornano, sempre, anche col mix di conduttori;
//  · dove serve un occhio sanitario il documento lo dice, e non
//    lo maschera da consiglio;
//  · nel foglio del cliente non compare mai una diagnosi.
// ============================================================

const g = (giorniFa: number) => new Date(Date.now() - giorniFa * 86400000);

const ev = (type: string, ts: Date, payload: Record<string, any>): EventoQuadro =>
  ({ type, ts, payload });

const quadroCon = (eventi: EventoQuadro[]) => costruisciQuadro(eventi);

const QUADRO_PIENO = quadroCon([
  // il payload vero della valutazione posturale: findings con severity
  ev('posture.assessed', g(20), {
    findings: [
      { area: 'cervicale', severity: 'moderate' },
      { area: 'spalla_dx', severity: 'mild' },
      { area: 'bacino', severity: 'moderate' },
      { area: 'ginocchio_sx', severity: 'mild' },
      { area: 'piede_dx', severity: 'mild' },
      { area: 'toracica', severity: 'normal' },
    ],
  }),
  ev('movement.gait_assessed', g(18), {
    cadence_spm: 92, step_symmetry_pct: 84, trunk_lean_deg: 14,
  }),
  ev('movement.squat_assessed', g(15), {
    bottom_knee_angle_deg: 112, trunk_lean_bottom_deg: 52,
  }),
  ev('body.composition_estimated', g(10), {
    estimated_body_fat: 34, estimated_muscle_mass: 31,
  }),
]);

// ------------------------------------------------------------

describe('le priorità nascono dalle misure, non dalle idee', () => {
  it('quadro vuoto: nessuna priorità inventata', () => {
    expect(leggiPriorita(quadroCon([]))).toHaveLength(0);
  });

  it('ogni priorità porta con sé il numero che l\'ha accesa', () => {
    const p = leggiPriorita(QUADRO_PIENO);
    expect(p.length).toBeGreaterThan(0);
    p.forEach((x) => {
      expect(x.misure.length).toBeGreaterThan(0);
      expect(x.perche).toMatch(/\d/);
      expect(x.comeSiLavora.length).toBeGreaterThan(20);
    });
  });

  it('ciò che cambia lo schema viene prima di ciò che cambia i numeri', () => {
    const p = leggiPriorita(QUADRO_PIENO);
    const aree = p.map((x) => x.area);
    const composizione = aree.indexOf('composizione');
    const primaAlta = p.findIndex((x) => x.forza === 'alta');
    expect(primaAlta).toBe(0);
    if (composizione >= 0) expect(composizione).toBeGreaterThan(primaAlta);
  });

  it('la simmetria bassa accende il riequilibrio del passo', () => {
    const p = leggiPriorita(QUADRO_PIENO);
    const sim = p.find((x) => x.titolo.includes('passo'));
    expect(sim).toBeDefined();
    expect(sim!.perche).toContain('84');
  });

  it('cinque distretti da lavorare aprono il lavoro dalla postura', () => {
    const p = leggiPriorita(QUADRO_PIENO);
    const post = p.find((x) => x.area === 'postura' && x.titolo.includes('postura'));
    expect(post).toBeDefined();
    expect(post!.perche).toContain('5');
    expect(post!.forza).toBe('alta');
  });

  it('una misura buona non accende niente', () => {
    const buono = quadroCon([
      ev('movement.gait_assessed', g(5), {
        cadence_spm: 118, step_symmetry_pct: 97, trunk_lean_deg: 3,
      }),
    ]);
    expect(leggiPriorita(buono)).toHaveLength(0);
  });

  it('le soglie stanno in un posto solo', () => {
    expect(SOGLIE_PROTOCOLLO.simmetriaPasso).toBe(90);
    expect(SOGLIE_PROTOCOLLO.profonditaSquat).toBe(100);
    expect(PROTOCOLLO_VERSION).toBe(1);
  });
});

// ------------------------------------------------------------

describe('il confine sanitario', () => {
  it('senza segnali, nessun parere richiesto — ma il perimetro si dichiara lo stesso', () => {
    const p = valutaPerimetro({ quadro: quadroCon([]) });
    expect(p.serveParere).toBe(false);
    expect(p.frase.toLowerCase()).toContain('screening');
  });

  it('dolore o terapie dichiarate: serve il parere', () => {
    const p = valutaPerimetro({ quadro: quadroCon([]), haControindicazioni: true });
    expect(p.serveParere).toBe(true);
    expect(p.motivi.join(' ')).toContain('terapie');
    expect(p.frase).toContain('professionista sanitario');
  });

  it('un\'asimmetria marcata non si carica: si fa guardare', () => {
    const p = valutaPerimetro({
      quadro: quadroCon([
        ev('movement.gait_assessed', g(3), { step_symmetry_pct: 74 }),
      ]),
    });
    expect(p.serveParere).toBe(true);
    expect(p.motivi.join(' ')).toContain('74');
  });

  it('le segnalazioni del coach entrano nel documento come sono', () => {
    const p = valutaPerimetro({
      quadro: quadroCon([]),
      segnalazioniCoach: ['Riferisce fitta al ginocchio destro in discesa.'],
    });
    expect(p.motivi[0]).toContain('fitta al ginocchio');
  });
});

// ------------------------------------------------------------

describe('il piano: i conti devono tornare', () => {
  it('un mix di conduttori si somma correttamente', () => {
    const p = componiPiano({
      voci: [
        { conduttore: 'francesco', quante: 10 },
        { conduttore: 'giuseppe', quante: 10 },
      ],
      seduteASettimana: 2,
    });
    expect(p.totaleSedute).toBe(20);
    expect(p.totaleSeduteEuro).toBe(10 * 40 + 10 * 35); // 750
    expect(p.valutazioneEuro).toBe(PREZZO_VALUTAZIONE);
    expect(p.totaleEuro).toBe(750 + 150);
    expect(p.settimane).toBe(10); // 20 sedute a 2 a settimana
  });

  it('la valutazione già pagata non si conta due volte', () => {
    const p = componiPiano({
      voci: [{ conduttore: 'francesco', quante: 10 }],
      valutazioneGiaPagata: true,
    });
    expect(p.valutazioneEuro).toBe(0);
    expect(p.totaleEuro).toBe(400);
  });

  it('le rate dividono il totale, non solo le sedute', () => {
    const p = componiPiano({
      voci: [{ conduttore: 'francesco', quante: 10 }],
      numeroRate: 5,
    });
    expect(p.totaleEuro).toBe(550);
    expect(p.importoRata).toBe(110);
  });

  it('le voci a zero non compaiono nel documento', () => {
    const p = componiPiano({
      voci: [
        { conduttore: 'francesco', quante: 4 },
        { conduttore: 'giuseppe', quante: 0 },
      ],
    });
    expect(p.righe).toHaveLength(1);
  });

  it('un piano vuoto non esplode e non inventa settimane', () => {
    const p = componiPiano({ voci: [] });
    expect(p.totaleSedute).toBe(0);
    expect(p.settimane).toBe(0);
    expect(p.totaleEuro).toBe(PREZZO_VALUTAZIONE);
  });

  it('i prezzi dello staff sono quelli decisi', () => {
    expect(conduttore('francesco').prezzo).toBe(40);
    expect(conduttore('giuseppe').prezzo).toBe(35);
    expect(CONDUTTORI).toHaveLength(2);
    expect(PREZZO_VALUTAZIONE).toBe(150);
  });

  it('chi non è più nello staff non compare fra i conduttori', () => {
    expect(CONDUTTORI.map((c) => c.id)).not.toContain('fabio');
    expect(JSON.stringify(CONDUTTORI).toLowerCase()).not.toContain('fabio');
  });
});

// ------------------------------------------------------------

describe('quando si rimisura', () => {
  it('un test mai fatto risulta mancante, non scaduto', () => {
    const s = prossimeRipetizioni(quadroCon([]));
    expect(s.every((x) => x.mancante)).toBe(true);
    expect(s.every((x) => !x.scaduto)).toBe(true);
  });

  it('la composizione fatta cinque settimane fa è scaduta', () => {
    const s = prossimeRipetizioni(quadroCon([
      ev('body.composition_estimated', g(35), { estimated_body_fat: 28 }),
    ]));
    const comp = s.find((x) => x.tipo === 'body.composition_estimated')!;
    expect(comp.mancante).toBe(false);
    expect(comp.scaduto).toBe(true);
    expect(comp.giorniDaAllora).toBe(35);
  });

  it('la postura fatta due settimane fa non è scaduta: sotto le dodici settimane si misura il rumore', () => {
    const s = prossimeRipetizioni(quadroCon([
      ev('posture.assessed', g(14), {
        findings: [{ area: 'bacino', severity: 'mild' }],
      }),
    ]));
    expect(s.find((x) => x.tipo === 'posture.assessed')!.scaduto).toBe(false);
  });

  it('ogni ritmo dichiara il proprio perché', () => {
    RITMO_TEST.forEach((r) => {
      expect(r.perche.length).toBeGreaterThan(20);
      expect(r.ogniSettimane).toBeGreaterThan(0);
    });
  });
});

// ------------------------------------------------------------

describe('il documento del cliente', () => {
  const doc = () => documentoCliente({
    allievo: 'Maria Rossi',
    data: new Date(2026, 8, 1),
    quadro: QUADRO_PIENO,
    priorita: leggiPriorita(QUADRO_PIENO),
    perimetro: valutaPerimetro({ quadro: QUADRO_PIENO }),
    piano: componiPiano({
      voci: [
        { conduttore: 'francesco', quante: 10 },
        { conduttore: 'giuseppe', quante: 10 },
      ],
      seduteASettimana: 2,
    }),
    obiettivo: 'Tornare a correre senza fastidio',
    coach: 'Francesco Busanca',
  });

  it('ha sette sezioni numerate in ordine', () => {
    const d = doc();
    expect(d).toHaveLength(7);
    d.forEach((s, i) => expect(s.n).toBe(i + 1));
  });

  it('riporta le misure con il loro valore e la loro data', () => {
    const misure = doc().find((s) => s.n === 2)!.misure!;
    expect(misure.length).toBeGreaterThan(3);
    misure.forEach((m) => {
      expect(m.valore).toMatch(/\d/);
      expect(m.quando.length).toBeGreaterThan(5);
    });
  });

  it('i costi arrivano fino al totale, valutazione compresa', () => {
    const costi = doc().find((s) => s.n === 5)!.elenco!.join(' ');
    expect(costi).toContain('150');
    expect(costi).toContain('400'); // 10 con Francesco
    expect(costi).toContain('350'); // 10 con Giuseppe
    expect(costi).toContain('Totale: 900');
  });

  it('dice che le sedute possono essere condotte da altri, col programma unico', () => {
    const t = doc().find((s) => s.n === 4)!.testo!;
    expect(t).toContain('persone diverse dello staff');
    expect(t).toContain('programma resta unico');
  });

  it('NON contiene mai una diagnosi', () => {
    const tutto = JSON.stringify(doc()).toLowerCase();
    ['diagnosi di', 'patologia', 'sindrome', 'lesione', 'malattia', 'terapia consigliata']
      .forEach((v) => expect(tutto).not.toContain(v));
    expect(tutto).toContain('non costituiscono atto diagnostico');
  });

  it('dichiara sempre il perimetro, anche quando non serve nessun parere', () => {
    const s = doc().find((x) => x.n === 7)!;
    expect(s.testo).toContain('screening');
    expect(s.testo).toContain('non sostituiscono');
  });

  it('con un dubbio sanitario, il documento lo scrive in chiaro', () => {
    const d = documentoCliente({
      allievo: 'X', data: new Date(), quadro: QUADRO_PIENO,
      priorita: [], coach: 'Y',
      perimetro: valutaPerimetro({ quadro: QUADRO_PIENO, haControindicazioni: true }),
      piano: componiPiano({ voci: [] }),
    });
    const s = d.find((x) => x.n === 7)!;
    expect(s.testo).toContain('parere di un professionista sanitario');
    expect(s.elenco!.length).toBeGreaterThan(0);
  });

  it('senza priorità non finge di averne: lo dice', () => {
    const d = documentoCliente({
      allievo: 'X', data: new Date(), quadro: quadroCon([]),
      priorita: [], coach: 'Y',
      perimetro: valutaPerimetro({ quadro: quadroCon([]) }),
      piano: componiPiano({ voci: [] }),
    });
    expect(d.find((x) => x.n === 3)!.testo).toContain('non emergono priorità');
  });
});

// ------------------------------------------------------------

describe('la procedura interna', () => {
  it('copre il ciclo dalle due sessioni alla chiusura', () => {
    expect(PROCEDURA.length).toBeGreaterThanOrEqual(8);
    PROCEDURA.forEach((p, i) => expect(p.n).toBe(i + 1));
  });

  it('ogni passo dice lo strumento, l\'alternativa e quando è chiuso', () => {
    PROCEDURA.forEach((p) => {
      expect(p.strumento.length).toBeGreaterThan(5);
      expect(p.alternativa.length).toBeGreaterThan(20);
      expect(p.siPassaOltreQuando.length).toBeGreaterThan(10);
    });
  });

  it('contiene il passo del perimetro sanitario, e non è l\'ultimo', () => {
    const i = PROCEDURA.findIndex((p) => p.fase.toLowerCase().includes('perimetro'));
    expect(i).toBeGreaterThan(-1);
    expect(i).toBeLessThan(PROCEDURA.length - 1);
  });

  it('le domande guida includono quella che ferma il carico sul compenso', () => {
    expect(DOMANDE_GUIDA.join(' ')).toContain('compensa');
    expect(DOMANDE_GUIDA.join(' ')).toContain('non è mio da decidere');
  });
});
