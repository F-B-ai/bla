import {
  computeStellato,
  computeChainScores,
  normalizeValue,
  effectiveWeight,
  TestResult,
  SCORING_VERSION,
} from '../stellato';
import {
  TEST_BY_ID,
  CATALOG_VERSION,
  STELLATO_TESTS,
  PRESCRIPTION_RULES,
  DEFAULT_THRESHOLDS,
  VALIDATION_WEIGHT,
} from '../../data/stellatoProtocol';

// ============================================================
// Sistema Stellato — test a VERITÀ NOTA.
// Costruisco profili di cui conosco l'esito atteso: se il
// motore lo ritrova, la logica del documento è implementata
// fedelmente (§4 scoring, §5 gerarchia decisionale).
// ============================================================

const r = (testId: string, value: number): TestResult => ({ testId, value });
const rLR = (testId: string, left: number, right: number): TestResult =>
  ({ testId, left, right });

describe('catalogo', () => {
  it('ogni test ha id univoco e catene valide', () => {
    const ids = STELLATO_TESTS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const t of STELLATO_TESTS) {
      for (const c of t.catene) expect(c.peso).toBeGreaterThanOrEqual(1);
    }
  });

  it('i test "number" dichiarano entrambe le ancore', () => {
    for (const t of STELLATO_TESTS) {
      if (t.input === 'number') {
        expect(t.peggiore).toBeDefined();
        expect(t.migliore).toBeDefined();
        expect(t.peggiore).not.toBe(t.migliore);
      }
      if (t.input === 'category') expect((t.opzioni || []).length).toBeGreaterThan(1);
    }
  });

  it('le regole di prescrizione puntano a test esistenti', () => {
    for (const rule of PRESCRIPTION_RULES) {
      if (rule.when.testPositivo) expect(TEST_BY_ID[rule.when.testPositivo]).toBeDefined();
      if (rule.when.testOpzione) {
        const t = TEST_BY_ID[rule.when.testOpzione.testId];
        expect(t).toBeDefined();
        expect((t.opzioni || []).some((o) => o.label === rule.when.testOpzione!.label)).toBe(true);
      }
    }
  });
});

describe('normalizzazione', () => {
  it('numerico crescente: peggiore→0, migliore→100', () => {
    const t = TEST_BY_ID['s1_dorsiflessione']; // 3cm → 0, 12cm → 100
    expect(normalizeValue(t, 3)).toBe(0);
    expect(normalizeValue(t, 12)).toBe(100);
    expect(normalizeValue(t, 7.5)).toBe(50);
  });

  it('numerico DECRESCENTE (meno è meglio): PPC 5cm→100, 20cm→0', () => {
    const t = TEST_BY_ID['s2_ppc'];
    expect(normalizeValue(t, 5)).toBe(100);
    expect(normalizeValue(t, 20)).toBe(0);
    expect(normalizeValue(t, 12.5)).toBe(50);
  });

  it('fuori scala viene tagliato, mai negativo o oltre 100', () => {
    const t = TEST_BY_ID['s1_dorsiflessione'];
    expect(normalizeValue(t, -5)).toBe(0);
    expect(normalizeValue(t, 99)).toBe(100);
  });

  it('scale03: 0 segni = 100, massimo = 0', () => {
    const t = TEST_BY_ID['s2_palpazione_masticatori'];
    expect(normalizeValue(t, 0)).toBe(100);
    expect(normalizeValue(t, 3)).toBe(0);
  });

  it('scale05: forza piena = 100', () => {
    const t = TEST_BY_ID['s1_tibiale_posteriore'];
    expect(normalizeValue(t, 5)).toBe(100);
    expect(normalizeValue(t, 0)).toBe(0);
  });

  it('category: usa il punteggio dichiarato dell\'opzione', () => {
    const t = TEST_BY_ID['s1_respiro_riposo'];
    expect(normalizeValue(t, 0)).toBe(100); // diaframmatico
    expect(normalizeValue(t, 2)).toBe(35);  // alto/toracico
  });
});

describe('peso efficace = peso catena × peso validazione (§4.1)', () => {
  it('un test ad alta validazione pesa 3× quello a bassa, a parità di peso catena', () => {
    const alta = TEST_BY_ID['s1_dorsiflessione'];   // alta (3) · peso E = 3
    const bassa = TEST_BY_ID['s2_ioide'];           // bassa (1) · peso IE = 1
    expect(effectiveWeight(alta, 'E')).toBe(3 * VALIDATION_WEIGHT.alta);
    expect(effectiveWeight(bassa, 'IE')).toBe(1 * VALIDATION_WEIGHT.bassa);
    expect(effectiveWeight(alta, 'A')).toBe(0); // non alimenta A
  });

  it('il test ad alta validazione domina la media della catena', () => {
    // E: dorsiflessione (alta, peso3 → 9) a 100 vs linea posteriore (media, peso3 → 6) a 25
    const chains = computeChainScores([
      rLR('s1_dorsiflessione', 12, 12),
      r('s1_linea_posteriore', 2),
    ]);
    const E = chains.find((c) => c.key === 'E')!;
    // (100*9 + 25*6) / 15 = 70
    expect(E.score).toBeCloseTo(70, 0);
  });
});

describe('punteggi di catena e asimmetria', () => {
  it('catena senza test compilati resta null — mai numeri inventati', () => {
    const chains = computeChainScores([r('s1_respiro_riposo', 0)]);
    expect(chains.find((c) => c.key === 'IE')!.score).not.toBeNull();
    expect(chains.find((c) => c.key === 'A')!.score).toBeNull();
    expect(chains.find((c) => c.key === 'A')!.asimmetria).toBeNull();
  });

  it('bilaterale: il punteggio è la media dei lati, l\'asimmetria la differenza', () => {
    // dorsiflessione 12cm (100) vs 3cm (0) → score 50, asimmetria 100
    const chains = computeChainScores([rLR('s1_dorsiflessione', 12, 3)]);
    const E = chains.find((c) => c.key === 'E')!;
    expect(E.score).toBeCloseTo(50, 0);
    expect(E.asimmetria).toBeCloseTo(100, 0);
  });

  it('lati uguali → asimmetria zero', () => {
    const chains = computeChainScores([rLR('s1_heel_raise', 20, 20)]);
    expect(chains.find((c) => c.key === 'E')!.asimmetria).toBe(0);
  });

  it('i test "da definire" (§3.4) sono esclusi dallo scoring', () => {
    const conNahmani = computeStellato({ results: [{ testId: 's2_nahmani', cambia: true }] });
    expect(conNahmani.scores.esclusiDaDefinire).toContain('Test di Nahmani');
    // rotatori è daDefinire: non deve alimentare A né C
    const chains = computeChainScores([rLR('s2_rotatori', 60, 60)]);
    expect(chains.find((c) => c.key === 'A')!.score).toBeNull();
  });
});

describe('LIVELLO 0 — red flag: blocco assoluto', () => {
  it('con red flag non esce alcuna prescrizione, ma un referto di invio', () => {
    const out = computeStellato({
      results: [r('s1_respiro_riposo', 3), rLR('s1_dorsiflessione', 3, 3)],
      redFlags: ['rf_dolore_notturno'],
    });
    expect(out.decision.bloccato).toBe(true);
    expect(out.decision.prescrizione).toHaveLength(0);
    expect(out.decision.priorita).toHaveLength(0);
    expect(out.decision.catenaPrioritaria).toBeNull();
    expect(out.decision.motivoBlocco).toContain('Dolore notturno');
  });

  it('il blocco precede tutto: anche con recettore causativo positivo', () => {
    const out = computeStellato({
      results: [{ testId: 's2_confronto_podalico', cambia: true }],
      redFlags: ['rf_deficit_neuro'],
    });
    expect(out.decision.bloccato).toBe(true);
    expect(out.decision.recettoreCausativo).toBeNull();
  });

  it('i punteggi restano calcolati anche a blocco attivo (servono al referto)', () => {
    const out = computeStellato({
      results: [rLR('s1_dorsiflessione', 4, 4)],
      redFlags: ['rf_trauma_recente'],
    });
    expect(out.scores.chains.find((c) => c.key === 'E')!.score).not.toBeNull();
  });
});

describe('LIVELLO 1 — recettore causativo', () => {
  it('confronto podalico che cambia il quadro → piede causativo, prima priorità', () => {
    const out = computeStellato({
      results: [
        { testId: 's2_confronto_podalico', cambia: true },
        r('s1_linea_posteriore', 2),
      ],
    });
    expect(out.decision.recettoreCausativo?.recettore).toBe('podalico');
    expect(out.decision.priorita[0].titolo).toContain('podalico');
  });

  it('confronto che NON cambia → adattivo, nessun recettore causativo', () => {
    const out = computeStellato({
      results: [{ testId: 's2_confronto_podalico', cambia: false }],
    });
    expect(out.decision.recettoreCausativo).toBeNull();
  });
});

describe('LIVELLO 2 — catena prioritaria', () => {
  it('senza asimmetrie: priorità alla catena col punteggio più basso', () => {
    const out = computeStellato({
      results: [
        r('s1_linea_posteriore', 2),   // E marcatamente accorciata → 25
        r('s1_linea_anteriore', 0),    // F disponibile → 100
      ],
    });
    expect(out.decision.catenaPrioritaria).toBe('E');
    expect(out.decision.prioritaPerAsimmetria).toBe(false);
    expect(out.scores.catenaPiuRestrittiva).toBe('E');
    expect(out.scores.catenaDominante).toBe('F');
  });

  it('asimmetria rilevante di un\'altra catena ha la precedenza sul valore assoluto', () => {
    // F è la più bassa in assoluto (25), ma E è marcatamente asimmetrica:
    // un sistema squilibrato si degrada più in fretta di uno uniformemente rigido.
    const out = computeStellato({
      results: [
        r('s1_linea_anteriore', 2),          // F marcatamente accorciata → 25 (la più bassa)
        rLR('s1_heel_raise', 25, 12),        // E: media alta ma asimmetria ~52
      ],
    });
    const E = out.scores.chains.find((c) => c.key === 'E')!;
    const F = out.scores.chains.find((c) => c.key === 'F')!;
    expect(F.score).toBeLessThan(E.score as number);            // F resta la più bassa
    expect(out.scores.catenaPiuRestrittiva).toBe('F');
    expect(E.asimmetria).toBeGreaterThanOrEqual(DEFAULT_THRESHOLDS.asymmetryRelevant);
    expect(out.decision.catenaPrioritaria).toBe('E');           // ma la priorità passa a E
    expect(out.decision.prioritaPerAsimmetria).toBe(true);
    expect(out.decision.priorita.some((p) => p.motivo.includes('Asimmetria'))).toBe(true);
  });
});

describe('LIVELLO 3 — prescrizione dalle regole dichiarative (§5)', () => {
  it('I-E basso con respiro alto → priorità assoluta al respiro', () => {
    const out = computeStellato({
      results: [
        r('s1_respiro_riposo', 3),      // alto con accessori → 15, positivo
        r('s1_mobilita_costale', 2),    // ridotta e asimmetrica → 30
      ],
    });
    expect(out.decision.regoleAttivate.map((x) => x.id)).toContain('r_ie_respiro');
    expect(out.decision.prescrizione.join(' ')).toContain('respiro');
  });

  it('E basso + Silfverskiöld gastrocnemio → protocollo gastrocnemio con ROM ridotto', () => {
    const out = computeStellato({
      results: [
        r('s1_silfverskiold', 1),        // positivo gastrocnemio → 40
        r('s1_linea_posteriore', 2),     // 25
        rLR('s1_dorsiflessione', 4, 4),  // ~11
      ],
    });
    const ids = out.decision.regoleAttivate.map((x) => x.id);
    expect(ids).toContain('r_e_gastro');
    expect(out.decision.prescrizione.join(' ')).toContain('gastrocnemio');
    expect(out.decision.prescrizione.join(' ')).toContain('ROM');
  });

  it('profilo omogeneo e alto senza red flag → si passa al programma di allenamento', () => {
    const out = computeStellato({
      results: [
        r('s1_respiro_riposo', 0), r('s1_mobilita_costale', 0),
        r('s1_linea_posteriore', 0), r('s1_linea_anteriore', 0),
        r('s1_pattern_estensione', 0), r('s1_pattern_flessione', 0),
        r('s1_pattern_rotazione', 0),
      ],
    });
    expect(out.decision.regoleAttivate.map((x) => x.id)).toContain('r_omogeneo');
    expect(out.decision.prescrizione.join(' ')).toContain('programma di allenamento');
  });

  it('mai più di maxPriorita priorità nel referto (§6.8)', () => {
    const out = computeStellato({
      results: [
        r('s1_respiro_riposo', 3), r('s1_mobilita_costale', 2),
        r('s1_silfverskiold', 1), r('s1_linea_posteriore', 2),
        r('s1_linea_anteriore', 2), rLR('s1_heel_raise', 20, 2),
        { testId: 's2_confronto_podalico', cambia: true },
      ],
    });
    expect(out.decision.priorita.length).toBeLessThanOrEqual(DEFAULT_THRESHOLDS.maxPriorita);
  });
});

describe('consulti automatici e misure oggettive', () => {
  it('cover test positivo → raccomandazione di consulto specialistico (§6.11)', () => {
    const out = computeStellato({ results: [r('s2_cover_test', 2)] }); // tropia
    expect(out.decision.consulti.join(' ')).toContain('optometric');
  });

  it('PPC alterato → consulto oculistico', () => {
    const out = computeStellato({ results: [r('s2_ppc', 18)] }); // 18cm → score basso
    expect(out.decision.consulti.length).toBeGreaterThan(0);
  });

  it('solo i test ad alta validazione con output numerico entrano nelle misure oggettive', () => {
    const out = computeStellato({
      results: [
        rLR('s1_dorsiflessione', 9, 8),   // alta + number + followUp → incluso
        r('s1_linea_posteriore', 1),      // category media → escluso
        r('s2_ioide', 1),                 // bassa → escluso
      ],
    });
    const ids = out.scores.misureOggettive.map((m) => m.testId);
    expect(ids).toContain('s1_dorsiflessione');
    expect(ids).not.toContain('s1_linea_posteriore');
    expect(ids).not.toContain('s2_ioide');
  });
});

describe('garanzie di sistema', () => {
  it('ogni esito richiede SEMPRE la firma dell\'operatore (§5 regola d\'oro)', () => {
    const conFlag = computeStellato({ results: [], redFlags: ['rf_dolore_notturno'] });
    const senza = computeStellato({ results: [r('s1_respiro_riposo', 0)] });
    expect(conFlag.decision.richiedeFirmaOperatore).toBe(true);
    expect(senza.decision.richiedeFirmaOperatore).toBe(true);
  });

  it('riproducibile: stessi input → stesso output (§7)', () => {
    const input = {
      results: [r('s1_respiro_riposo', 2), rLR('s1_dorsiflessione', 6, 9), r('s1_silfverskiold', 1)],
    };
    expect(JSON.stringify(computeStellato(input))).toBe(JSON.stringify(computeStellato(input)));
  });

  it('versioni tracciate nell\'esito: un referto resta interpretabile nel tempo', () => {
    const out = computeStellato({ results: [] });
    expect(out.scores.catalogVersion).toBe(CATALOG_VERSION);
    expect(out.scores.scoringVersion).toBe(SCORING_VERSION);
  });

  it('input vuoto non esplode e non inventa nulla', () => {
    const out = computeStellato({ results: [] });
    expect(out.scores.chains.every((c) => c.score === null)).toBe(true);
    expect(out.decision.catenaPrioritaria).toBeNull();
    expect(out.decision.prescrizione).toHaveLength(0);
  });

  it('relazioni della stella: differenziale A−C calcolato e marcato se rilevante', () => {
    const out = computeStellato({
      results: [
        r('s1_pattern_estensione', 0),  // A alta
        r('s1_pattern_flessione', 2),   // C bassa
      ],
    });
    const ac = out.scores.relazioni.find((x) => x.a === 'A' && x.b === 'C')!;
    expect(ac.differenziale).not.toBeNull();
    expect(ac.rilevante).toBe(true);
  });
});
