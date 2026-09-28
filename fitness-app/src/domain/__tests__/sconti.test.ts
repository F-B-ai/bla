import {
  applicaSconto, rateScontate, scontoSpettante, spiegaSconto, regolaDi,
  REGOLE_SCONTO, SCONTO_RINNOVO, SCONTO_STORICO,
  GIORNI_PER_RINNOVO, ANNI_PER_STORICO,
} from '../sconti';

// ============================================================
// «UGUALE PER TUTTI» E «DECIDO IO»
// ------------------------------------------------------------
// Le due cose stanno insieme solo se il criterio è scritto. Senza,
// alla domanda «perché lui sì e io no?» l'unica risposta disponibile
// è «perché ho deciso così» — che è la risposta che fa perdere le
// persone.
// ============================================================

describe('quanto si toglie', () => {
  it('rinnovo: 15%', () => {
    const c = applicaSconto(387, 'rinnovo');
    expect(c.percentuale).toBe(SCONTO_RINNOVO);
    expect(c.sconto).toBe(58.05);
    expect(c.dovuto).toBe(328.95);
  });

  it('storico: 20%', () => {
    const c = applicaSconto(387, 'storico');
    expect(c.percentuale).toBe(SCONTO_STORICO);
    expect(c.sconto).toBe(77.4);
    expect(c.dovuto).toBe(309.6);
  });

  it('nessuno: il prezzo resta quello', () => {
    const c = applicaSconto(387);
    expect(c.dovuto).toBe(387);
    expect(c.sconto).toBe(0);
    expect(c.riga).toBe('');
  });

  it('sul preventivo dello studio funziona uguale', () => {
    // 150 di valutazione + 10 sedute da 35
    const c = applicaSconto(500, 'storico');
    expect(c.dovuto).toBe(400);
  });

  it('i centesimi tornano sempre: sconto + dovuto = pieno', () => {
    [387, 500, 150, 1234.56, 99.99].forEach((p) => {
      (['rinnovo', 'storico'] as const).forEach((t) => {
        const c = applicaSconto(p, t);
        expect(Math.abs(c.sconto + c.dovuto - c.pieno)).toBeLessThan(0.011);
      });
    });
  });
});

describe('chi ne ha diritto — il criterio, non l\'umore', () => {
  it('due anni di frequenza: storico', () => {
    expect(scontoSpettante({ anniDiFrequenza: ANNI_PER_STORICO })).toBe('storico');
    expect(scontoSpettante({ anniDiFrequenza: 5 })).toBe('storico');
  });

  it('rinnova entro trenta giorni: rinnovo', () => {
    expect(scontoSpettante({ giorniDallaFinePrecedente: 0 })).toBe('rinnovo');
    expect(scontoSpettante({ giorniDallaFinePrecedente: GIORNI_PER_RINNOVO })).toBe('rinnovo');
  });

  // Dopo trenta giorni è una persona che torna: benvenuta, ma il
  // percorso ricomincia da capo e il prezzo è quello pieno.
  it('oltre i trenta giorni, prezzo pieno', () => {
    expect(scontoSpettante({ giorniDallaFinePrecedente: 31 })).toBe('nessuno');
  });

  it('chi non ha nessuna delle due condizioni non ha sconto', () => {
    expect(scontoSpettante({})).toBe('nessuno');
    expect(scontoSpettante({ anniDiFrequenza: 0, giorniDallaFinePrecedente: 200 })).toBe('nessuno');
  });

  // Uno sconto che si somma da solo diventa un regalo che nessuno
  // aveva deciso.
  it('chi rientra in tutte e due prende il più alto, non la somma', () => {
    const t = scontoSpettante({ anniDiFrequenza: 4, giorniDallaFinePrecedente: 5 });
    expect(t).toBe('storico');
    expect(applicaSconto(100, t).sconto).toBe(20);
    expect(applicaSconto(100, t).sconto).not.toBe(35);
  });

  it('dati assurdi non regalano niente', () => {
    expect(scontoSpettante({ anniDiFrequenza: -3 })).toBe('nessuno');
    expect(scontoSpettante({ giorniDallaFinePrecedente: -10 })).toBe('nessuno');
  });
});

describe('le rate si dividono sul dovuto, non sul pieno', () => {
  // L'errore che fa arrivare un allievo a fine percorso avendo pagato
  // il prezzo intero a rate, con lo sconto scritto sul foglio e mai
  // tolto da nessuna parte.
  it('387 € scontati del 20%, in due rate', () => {
    const c = applicaSconto(387, 'storico');
    expect(rateScontate(c, 2)).toBe(154.8);
    expect(rateScontate(c, 2) * 2).toBeCloseTo(c.dovuto, 1);
  });

  it('senza sconto le rate restano quelle di prima', () => {
    expect(rateScontate(applicaSconto(387), 2)).toBe(193.5);
  });

  it('una rata sola è il totale', () => {
    const c = applicaSconto(200, 'rinnovo');
    expect(rateScontate(c, 1)).toBe(c.dovuto);
    expect(rateScontate(c, 0)).toBe(c.dovuto);
  });
});

describe('che cosa si legge sul foglio', () => {
  it('la riga dice percentuale e importo tolto', () => {
    const c = applicaSconto(387, 'storico');
    expect(c.riga).toContain('20%');
    expect(c.riga).toContain('77.40');
  });

  // Chi riceve uno sconto una volta, l'anno dopo lo dà per scontato.
  it('la spiegazione dice il criterio, e che non è automatico', () => {
    const s = spiegaSconto(applicaSconto(387, 'rinnovo'));
    expect(s).toContain(String(GIORNI_PER_RINNOVO));
    expect(s).toContain('non è automatico');
    expect(s).toContain('non si somma');
  });

  it('senza sconto non si stampa niente', () => {
    expect(spiegaSconto(applicaSconto(387))).toBe('');
  });

  it('ogni regola ha un criterio dicibile a voce', () => {
    expect(REGOLE_SCONTO.length).toBe(2);
    REGOLE_SCONTO.forEach((r) => {
      expect(r.criterio.length).toBeGreaterThan(25);
      expect(r.etichetta.length).toBeGreaterThan(5);
    });
    expect(regolaDi('nessuno')).toBeNull();
  });
});

// ------------------------------------------------------------
// CHE SIA DAVVERO SUI DUE PREVENTIVI
// ------------------------------------------------------------

import fs from 'fs';
import path from 'path';
import { componiCarta } from '../cartaIntestata';

describe('il preventivo dello studio', () => {
  const carta = (sconto?: 'rinnovo' | 'storico') => componiCarta({
    allievo: 'Prova',
    risposte: {},
    esito: {} as any,
    voci: [
      { descrizione: 'Valutazione completa', importo: 150 },
      { descrizione: '10 sedute', importo: 350 },
    ],
    rate: 2,
    sconto,
  });

  it('senza sconto resta com\'era', () => {
    const c = carta();
    expect(c.totale).toBe(500);
    expect(c.sconto.dovuto).toBe(500);
    expect(c.importoRata).toBe(250);
  });

  it('con lo sconto storico il totale pieno resta visibile', () => {
    const c = carta('storico');
    expect(c.totale).toBe(500);          // il pieno non sparisce
    expect(c.sconto.sconto).toBe(100);
    expect(c.sconto.dovuto).toBe(400);
  });

  // L'errore che fa pagare a rate il prezzo intero con lo sconto
  // scritto sul foglio e mai tolto davvero.
  it('le rate si calcolano sul dovuto', () => {
    expect(carta('storico').importoRata).toBe(200);
    expect(carta('rinnovo').importoRata).toBe(212.5);
  });
});

describe('la stampa mostra lo sconto, non solo il risultato', () => {
  const stampa = fs.readFileSync(
    path.join(__dirname, '..', '..', 'utils', 'printUtils.ts'), 'utf8'
  );

  // Un totale già scontato senza la riga che lo dice fa sembrare il
  // prezzo pieno una cosa che non è mai esistita, e toglie a chi lo
  // riceve la percezione di aver avuto qualcosa.
  it('il pieno si vede barrato, poi quanto si toglie, poi il dovuto', () => {
    expect(stampa).toContain('<s>${euro(c.sconto.pieno)} €</s>');
    expect(stampa).toContain('− ${euro(c.sconto.sconto)} €');
    expect(stampa).toContain('Da pagare');
  });

  it('e sotto c\'è il criterio, che è la risposta a «perché lui sì»', () => {
    expect(stampa).toContain('spiegaSconto(c.sconto)');
  });
});
