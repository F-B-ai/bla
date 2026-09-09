import {
  controllaGruppo, incassoSeduta, costoPerAllievo, confrontaConIndividuale,
  quotaMinima, etichettaGruppo, PERSONE_POSSIBILI,
  MIN_PERSONE, MAX_PERSONE, SedutaGruppo,
} from '../gruppo';

// ============================================================
// DUE CONTI DIVERSI, MAI LO STESSO NUMERO
// ------------------------------------------------------------
// L'incasso dello studio e la quota dell'allievo si assomigliano
// abbastanza da essere scambiati, e scambiarli costa soldi veri in
// tutte e due le direzioni. Questi test tengono separate le due cose.
// ============================================================

const g = (persone: number, quotaPersona: number): SedutaGruppo =>
  ({ persone, quotaPersona });

describe('che cos\'è un gruppo, e che cosa non lo è', () => {
  it('da due a cinque persone è un gruppo', () => {
    for (let n = MIN_PERSONE; n <= MAX_PERSONE; n++) {
      expect(controllaGruppo(g(n, 25)).valido).toBe(true);
    }
  });

  it('una persona sola non è un gruppo, e il messaggio lo dice', () => {
    const r = controllaGruppo(g(1, 25));
    expect(r.valido).toBe(false);
    expect(r.problemi.join(' ')).toContain('seduta individuale');
  });

  it('sopra cinque è un corso, non un personal', () => {
    const r = controllaGruppo(g(6, 25));
    expect(r.valido).toBe(false);
    expect(r.problemi.join(' ')).toContain('corso');
  });

  it('senza quota non si può registrare', () => {
    expect(controllaGruppo(g(3, 0)).valido).toBe(false);
    expect(controllaGruppo(g(3, -10)).valido).toBe(false);
    expect(controllaGruppo(g(3, NaN)).valido).toBe(false);
    expect(controllaGruppo({ persone: 3 } as SedutaGruppo).valido).toBe(false);
  });

  it('mezze persone non esistono', () => {
    expect(controllaGruppo(g(2.5, 25)).valido).toBe(false);
  });

  it('il selettore offre esattamente 2, 3, 4, 5', () => {
    expect(PERSONE_POSSIBILI).toEqual([2, 3, 4, 5]);
  });
});

describe('i due conti non si toccano', () => {
  // È il test che conta più di tutti in questo file.
  it('l\'incasso dello studio non è quello che paga l\'allievo', () => {
    const s = g(4, 25);
    expect(incassoSeduta(s)).toBe(100);
    expect(costoPerAllievo(s)).toBe(25);
    expect(incassoSeduta(s)).not.toBe(costoPerAllievo(s));
  });

  it('la quota dell\'allievo non cresce se il gruppo cresce', () => {
    expect(costoPerAllievo(g(2, 30))).toBe(30);
    expect(costoPerAllievo(g(5, 30))).toBe(30);
  });

  it('l\'incasso invece cresce con le persone', () => {
    expect(incassoSeduta(g(2, 30))).toBe(60);
    expect(incassoSeduta(g(5, 30))).toBe(150);
  });

  it('i centesimi non si perdono per strada', () => {
    expect(incassoSeduta(g(3, 16.665))).toBe(50);
    expect(costoPerAllievo(g(3, 16.665))).toBe(16.67);
  });

  it('un gruppo non valido non produce un numero, produce zero', () => {
    expect(incassoSeduta(g(1, 25))).toBe(0);
    expect(costoPerAllievo(g(9, 25))).toBe(0);
  });
});

describe('l\'ora di gruppo contro l\'ora individuale', () => {
  // Il caso che fa perdere soldi senza accorgersene: due persone a
  // quota bassa rendono meno di una seduta singola dello stesso coach.
  it('due persone a quindici euro rendono meno di una individuale da quaranta', () => {
    const r = confrontaConIndividuale(g(2, 15), 40);
    expect(r.esito).toBe('non_conviene');
    expect(r.incassoGruppo).toBe(30);
    expect(r.differenza).toBe(-10);
  });

  it('quando non conviene, dice da quanto dovrebbe partire la quota', () => {
    const r = confrontaConIndividuale(g(2, 15), 40);
    expect(r.spiegazione).toContain('20');
  });

  it('tre persone a venticinque battono l\'individuale da quaranta', () => {
    const r = confrontaConIndividuale(g(3, 25), 40);
    expect(r.esito).toBe('conviene');
    expect(r.differenza).toBe(35);
  });

  it('quando è pari lo dice, e lascia decidere a chi conduce', () => {
    const r = confrontaConIndividuale(g(2, 20), 40);
    expect(r.esito).toBe('pari');
    expect(r.spiegazione).toContain('valutala tu');
  });

  it('senza prezzo individuale non si finge un confronto', () => {
    expect(confrontaConIndividuale(g(3, 25), 0).spiegazione).toContain('Manca un dato');
  });

  it('la quota minima si arrotonda per eccesso: 40 su 3 fa 14, non 13', () => {
    expect(quotaMinima(3, 40)).toBe(14);
    expect(quotaMinima(2, 40)).toBe(20);
    expect(quotaMinima(1, 40)).toBe(0);
  });
});

describe('come si legge in agenda', () => {
  it('l\'etichetta porta tutti e tre i numeri', () => {
    const e = etichettaGruppo(g(3, 25));
    expect(e).toContain('Gruppo di 3');
    expect(e).toContain('25 €');
    expect(e).toContain('75 €');
  });

  it('un gruppo incompleto non mostra numeri finti', () => {
    expect(etichettaGruppo(g(1, 25))).toBe('Gruppo da completare');
  });
});

// ============================================================
// I GRUPPI DENTRO IL PROGRAMMA ECONOMICO
// ------------------------------------------------------------
// Qui si verifica che nel piano di un allievo finisca la SUA quota
// e non l'incasso del gruppo. È lo stesso errore di prima, visto
// dal lato del documento che la persona si porta a casa.
// ============================================================

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { componiPiano } = require('../protocollo');

describe('il piano economico con le sedute di gruppo', () => {
  it('nel totale dell\'allievo entra la quota, non l\'incasso', () => {
    const p = componiPiano({
      voci: [],
      gruppi: [{ conduttore: 'giuseppe', quante: 10, persone: 4, quotaPersona: 20 }],
      valutazioneGiaPagata: true,
    });
    // 10 sedute × 20 € = 200 €, non 10 × 4 × 20 = 800 €
    expect(p.totaleEuro).toBe(200);
    expect(p.incassoStudioGruppi).toBe(800);
  });

  it('la riga dice quante persone sono, così il cliente lo legge', () => {
    const p = componiPiano({
      voci: [],
      gruppi: [{ conduttore: 'francesco', quante: 8, persone: 3, quotaPersona: 25 }],
      valutazioneGiaPagata: true,
    });
    expect(p.righe[0].descrizione).toContain('3 persone');
    expect(p.righe[0].prezzoUnitario).toBe(25);
    expect(p.righe[0].totale).toBe(200);
  });

  it('individuali e gruppo convivono nello stesso piano', () => {
    const p = componiPiano({
      voci: [{ conduttore: 'francesco', quante: 4 }],
      gruppi: [{ conduttore: 'giuseppe', quante: 8, persone: 2, quotaPersona: 25 }],
      valutazioneGiaPagata: true,
    });
    expect(p.righe).toHaveLength(2);
    expect(p.totaleSedute).toBe(12);
    expect(p.totaleEuro).toBe(4 * 40 + 8 * 25);
  });

  it('un gruppo fuori dai limiti non entra nel piano', () => {
    const p = componiPiano({
      voci: [],
      gruppi: [{ conduttore: 'giuseppe', quante: 5, persone: 9, quotaPersona: 20 }],
      valutazioneGiaPagata: true,
    });
    expect(p.righe).toHaveLength(0);
    expect(p.totaleEuro).toBe(0);
    expect(p.incassoStudioGruppi).toBeUndefined();
  });

  it('senza gruppi il campo non compare: niente zeri finti', () => {
    const p = componiPiano({ voci: [{ conduttore: 'francesco', quante: 4 }] });
    expect(p.incassoStudioGruppi).toBeUndefined();
  });

  it('le rate si calcolano su ciò che paga l\'allievo', () => {
    const p = componiPiano({
      voci: [],
      gruppi: [{ conduttore: 'giuseppe', quante: 10, persone: 5, quotaPersona: 20 }],
      valutazioneGiaPagata: true,
      numeroRate: 2,
    });
    expect(p.importoRata).toBe(100);
  });
});
