import {
  applicaSconto, rateScontate, scontoSpettante, spiegaSconto, regolaDi,
  REGOLE_SCONTO, SCONTO_RINNOVO, SCONTO_STORICO,
  GIORNI_PER_RINNOVO, ANNI_PER_STORICO, ANNI_PER_FEDELE,
  SCONTO_FEDELE, PASSO_ARROTONDAMENTO, perEccesso,
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
  // I prezzi si arrotondano PER ECCESSO a multipli di cinque: 328,95
  // diventa 330. «Trenta è un prezzo, ventotto è il risultato di un
  // conto» — deciso il 28 settembre 2026.
  it('rinnovo 15%: 387 € diventano 330, non 328,95', () => {
    const c = applicaSconto(387, 'rinnovo');
    expect(c.percentuale).toBe(SCONTO_RINNOVO);
    expect(c.dovuto).toBe(330);
    expect(c.sconto).toBe(57);
  });

  it('storico 20%: 387 € diventano 310', () => {
    const c = applicaSconto(387, 'storico');
    expect(c.percentuale).toBe(SCONTO_STORICO);
    expect(c.dovuto).toBe(310);
    expect(c.sconto).toBe(77);
  });

  it('fedele 10%: 387 € diventano 350', () => {
    const c = applicaSconto(387, 'fedele');
    expect(c.percentuale).toBe(SCONTO_FEDELE);
    expect(c.dovuto).toBe(350);
  });

  it('ogni prezzo scontato è un multiplo di cinque', () => {
    [30, 35, 40, 150, 387, 500, 1234].forEach((p) => {
      (['fedele', 'rinnovo', 'storico'] as const).forEach((t) => {
        expect(applicaSconto(p, t).dovuto % PASSO_ARROTONDAMENTO).toBe(0);
      });
    });
  });

  // L'arrotondamento per eccesso su importi piccoli può riportare al
  // prezzo pieno: 35 meno il 10% fa 31,50, che sale a 35. Uno sconto
  // che non sconta è peggio di nessuno sconto.
  it('uno sconto resta sempre uno sconto', () => {
    [30, 35, 40, 45, 33, 21].forEach((p) => {
      (['fedele', 'rinnovo', 'storico'] as const).forEach((t) => {
        const c = applicaSconto(p, t);
        expect(c.dovuto).toBeLessThan(p);
        expect(c.sconto).toBeGreaterThan(0);
      });
    });
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

  it('dopo il primo anno: fedele', () => {
    expect(scontoSpettante({ anniDiFrequenza: ANNI_PER_FEDELE })).toBe('fedele');
  });

  it('chi non ha nessuna delle condizioni non ha sconto', () => {
    expect(scontoSpettante({})).toBe('nessuno');
    expect(scontoSpettante({ anniDiFrequenza: 0, giorniDallaFinePrecedente: 200 })).toBe('nessuno');
  });

  it('si arrotonda per eccesso, mai per difetto', () => {
    expect(perEccesso(28)).toBe(30);
    expect(perEccesso(30)).toBe(30);
    expect(perEccesso(30.01)).toBe(35);
    expect(perEccesso(309.6)).toBe(310);
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
  it('387 € scontati del 20% fanno 310: due rate da 155', () => {
    const c = applicaSconto(387, 'storico');
    expect(rateScontate(c, 2)).toBe(155);
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
    expect(c.riga).toContain('77.00');
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
    expect(REGOLE_SCONTO.length).toBe(3);
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

// ------------------------------------------------------------
// QUANTO VA AL COLLABORATORE, CALCOLATO DALL'APP
// ------------------------------------------------------------

import { ripartizioneIncasso } from '../listino';

describe('la ripartizione si fa sul totale scontato', () => {
  const dopo = new Date('2026-10-05');   // 50%
  const prima = new Date('2026-09-15');  // 60%

  it('500 € scontati del 20% fanno 400: 200 e 200', () => {
    const c = applicaSconto(500, 'storico');
    const r = ripartizioneIncasso(c.dovuto, dopo);
    expect(r.incassato).toBe(400);
    expect(r.collaboratore).toBe(200);
    expect(r.studio).toBe(200);
  });

  // La sostanza di «lo sconto lo pagano in due».
  it('lo sconto toglie la stessa cifra a tutti e due', () => {
    const pieno = ripartizioneIncasso(500, dopo);
    const scontato = ripartizioneIncasso(applicaSconto(500, 'storico').dovuto, dopo);
    expect(pieno.collaboratore - scontato.collaboratore)
      .toBeCloseTo(pieno.studio - scontato.studio, 2);
  });

  it('i conti tornano sempre: collaboratore + studio = incassato', () => {
    [100, 310, 387, 400, 1234.56].forEach((t) => {
      const r = ripartizioneIncasso(t, dopo);
      expect(r.collaboratore + r.studio).toBeCloseTo(r.incassato, 2);
    });
  });

  // La percentuale viene dalla data, non si passa a mano: così non
  // può succedere che una schermata usi il 60% e un'altra il 50%.
  it('la percentuale la decide la data, non chi chiama', () => {
    expect(ripartizioneIncasso(100, prima).collaboratore).toBe(60);
    expect(ripartizioneIncasso(100, dopo).collaboratore).toBe(50);
  });

  it('il preventivo porta il conto già fatto', () => {
    const c = componiCarta({
      allievo: 'Prova', risposte: {}, esito: {} as any,
      voci: [{ descrizione: 'Percorso', importo: 500 }],
      sconto: 'storico', data: dopo,
    });
    expect(c.ripartizione.incassato).toBe(400);
    expect(c.ripartizione.collaboratore).toBe(200);
  });

  // Quanto prende chi lo allena non è affare dell'allievo, e vederlo
  // cambierebbe il modo in cui lo guarda.
  it('ma NON finisce sul foglio che si consegna', () => {
    const stampa = fs.readFileSync(
      path.join(__dirname, '..', '..', 'utils', 'printUtils.ts'), 'utf8'
    );
    expect(stampa).not.toContain('ripartizione');
    expect(stampa).not.toContain('collaboratore');
  });
});
