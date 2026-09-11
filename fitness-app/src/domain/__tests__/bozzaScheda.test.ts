import {
  BOZZA_VERSION, BozzaScheda, contaEsercizi, vuota, scaduta, daProporre,
  quantoFa, etichettaSalvataggio, descriviBozza, GIORNI_VALIDITA,
} from '../bozzaScheda';

// ============================================================
// «SE PER SBAGLIO DOVESSI USCIRE, TUTTO IL LAVORO È PERSO»
// ------------------------------------------------------------
// Titolo, allievo e sette giorni di esercizi vivevano solo nella
// memoria della schermata. Una telefonata che manda l'App in secondo
// piano bastava a cancellare mezz'ora di lavoro, senza un avviso.
// ============================================================

const MINUTO = 60 * 1000;
const ORA = 60 * MINUTO;
const GIORNO = 24 * ORA;
const ADESSO = new Date('2026-09-11T20:14:00').getTime();

const bozza = (p: Partial<BozzaScheda> = {}): BozzaScheda => ({
  v: BOZZA_VERSION,
  allievoId: 'a1',
  titolo: 'Forza 4 settimane',
  giornoScelto: 0,
  eserciziPerGiorno: { 0: [{}, {}], 2: [{}] },
  salvataAlle: ADESSO - 5 * MINUTO,
  ...p,
});

describe('contare quello che c\'è dentro', () => {
  it('somma gli esercizi di tutti i giorni', () => {
    expect(contaEsercizi({ 0: [{}, {}], 2: [{}] })).toBe(3);
  });

  it('un giorno vuoto o assente non rompe il conto', () => {
    expect(contaEsercizi({ 0: [], 1: undefined as never })).toBe(0);
    expect(contaEsercizi(null)).toBe(0);
  });
});

describe('che cosa vale la pena salvare', () => {
  // Il titolo si scrive per primo e non è lavoro: da solo non basta.
  it('il titolo da solo non è una bozza', () => {
    expect(vuota(bozza({ titolo: 'Qualcosa', eserciziPerGiorno: {} }))).toBe(true);
  });

  it('un esercizio invece sì', () => {
    expect(vuota(bozza({ eserciziPerGiorno: { 3: [{}] } }))).toBe(false);
  });

  it('niente non è una bozza', () => {
    expect(vuota(null)).toBe(true);
    expect(vuota(undefined)).toBe(true);
  });
});

describe('quando NON si propone di riprendere', () => {
  it('una bozza vuota non si propone', () => {
    expect(daProporre(bozza({ eserciziPerGiorno: {} }), ADESSO)).toBe(false);
  });

  it('una bozza di due settimane fa è roba di un\'altra vita', () => {
    const vecchia = bozza({ salvataAlle: ADESSO - 14 * GIORNO });
    expect(scaduta(vecchia, ADESSO)).toBe(true);
    expect(daProporre(vecchia, ADESSO)).toBe(false);
  });

  it('al limite dei sette giorni è ancora buona', () => {
    const limite = bozza({ salvataAlle: ADESSO - (GIORNI_VALIDITA * GIORNO) + MINUTO });
    expect(daProporre(limite, ADESSO)).toBe(true);
  });

  // Se domani cambio il formato, una bozza vecchia non si prova a leggere.
  it('una bozza scritta con un formato diverso si ignora', () => {
    expect(daProporre(bozza({ v: 0 }), ADESSO)).toBe(false);
  });

  it('e una bozza fresca con del lavoro dentro sì', () => {
    expect(daProporre(bozza(), ADESSO)).toBe(true);
  });
});

describe('il tempo, detto come lo direbbe una persona', () => {
  it('appena salvato si dice «adesso», non «0 minuti fa»', () => {
    expect(quantoFa(ADESSO - 10 * 1000, ADESSO)).toBe('adesso');
  });

  it('il singolare non diventa «1 minuti»', () => {
    expect(quantoFa(ADESSO - 70 * 1000, ADESSO)).toBe('di un minuto fa');
    expect(quantoFa(ADESSO - ORA, ADESSO)).toBe('di un\'ora fa');
    expect(quantoFa(ADESSO - GIORNO, ADESSO)).toBe('di ieri');
  });

  it('il plurale funziona a ogni scala', () => {
    expect(quantoFa(ADESSO - 12 * MINUTO, ADESSO)).toBe('di 12 minuti fa');
    expect(quantoFa(ADESSO - 5 * ORA, ADESSO)).toBe('di 5 ore fa');
    expect(quantoFa(ADESSO - 3 * GIORNO, ADESSO)).toBe('di 3 giorni fa');
  });

  it('un orologio che va indietro non produce tempi negativi', () => {
    expect(quantoFa(ADESSO + 5 * MINUTO, ADESSO)).toBe('adesso');
  });
});

describe('la riga che conferma che la rete c\'è', () => {
  it('dice l\'ora con due cifre', () => {
    const alle9e05 = new Date('2026-09-11T09:05:00').getTime();
    expect(etichettaSalvataggio(alle9e05)).toBe('Bozza salvata alle 09:05');
  });

  it('se non si è ancora salvato niente non scrive niente', () => {
    expect(etichettaSalvataggio(null)).toBe('');
  });
});

describe('che cosa si legge quando si rientra', () => {
  it('dice titolo, allievo, quanto lavoro e quando', () => {
    const r = descriviBozza(bozza(), 'Marco Rossi', ADESSO);
    expect(r).toContain('«Forza 4 settimane»');
    expect(r).toContain('Marco Rossi');
    expect(r).toContain('3 esercizi');
    expect(r).toContain('di 5 minuti fa');
  });

  it('senza titolo lo dice, invece di mostrare le virgolette vuote', () => {
    expect(descriviBozza(bozza({ titolo: '   ' }), 'Marco', ADESSO))
      .toContain('senza titolo');
  });

  it('senza il nome dell\'allievo non lascia un «per» appeso', () => {
    const r = descriviBozza(bozza(), null, ADESSO);
    expect(r).not.toContain(' per ·');
    expect(r).not.toContain('per undefined');
  });

  it('il singolare non diventa «1 esercizi»', () => {
    expect(descriviBozza(bozza({ eserciziPerGiorno: { 0: [{}] } }), 'Marco', ADESSO))
      .toContain('1 esercizio ');
  });
});
