// ============================================================
// IL PERSONAL DI GRUPPO E L'AFFIANCAMENTO — prezzi dell'8 ottobre 2026
// ------------------------------------------------------------
// Due voci nuove di listino. Quello che va dimostrato non è che le
// costanti esistano — quello si vede — ma due cose che non si vedono:
//
//   · che l'ora RENDE DI PIÙ al crescere del gruppo, mentre la quota
//     a testa scende. È il senso economico della voce: se si
//     invertisse, il gruppo sarebbe una perdita travestita da sconto.
//
//   · che il prezzo ARRIVA DOVE SI COMPILA. Un listino giusto in un
//     file che nessuna schermata legge non ha mai fatto incassare
//     niente: è il guasto che in questo progetto è già tornato più
//     volte, e qui si controlla leggendo il codice delle schermate.
// ============================================================

import fs from 'fs';
import path from 'path';
import {
  QUOTE_GRUPPO, quotaGruppoDi, incassoGruppoDi, rigaGruppo, eQuotaDiListino,
  euroIt, VOCI_LISTINO, PREZZO_TITOLARE,
  PREZZO_AFFIANCAMENTO, AFFIANCAMENTO_MIN_MESE, AFFIANCAMENTO_MAX_MESE,
  CONDUTTORI_AFFIANCAMENTO, controllaAffiancamento,
} from '../listino';
import { quotaProposta, listinoDelGruppo, MAX_PERSONE } from '../gruppo';

const leggi = (relativo: string): string =>
  fs.readFileSync(path.join(__dirname, '..', '..', relativo), 'utf8');

describe('le quote del personal di gruppo', () => {
  it('sono quelle decise: 20 in due, 15 in tre, 11,50 in quattro', () => {
    expect(quotaGruppoDi(2)).toBe(20);
    expect(quotaGruppoDi(3)).toBe(15);
    expect(quotaGruppoDi(4)).toBe(11.5);
  });

  it('l\'incasso dell\'ora è 40, 45, 46', () => {
    expect(incassoGruppoDi(2)).toBe(40);
    expect(incassoGruppoDi(3)).toBe(45);
    expect(incassoGruppoDi(4)).toBe(46);
  });

  it('la quota a testa scende quando il gruppo cresce', () => {
    const quote = [2, 3, 4].map((n) => quotaGruppoDi(n) as number);
    expect(quote[1]).toBeLessThan(quote[0]);
    expect(quote[2]).toBeLessThan(quote[1]);
  });

  it('e l\'incasso dell\'ora sale: è il motivo per cui il gruppo esiste', () => {
    const incassi = [2, 3, 4].map((n) => incassoGruppoDi(n) as number);
    expect(incassi[1]).toBeGreaterThan(incassi[0]);
    expect(incassi[2]).toBeGreaterThan(incassi[1]);
  });

  it('ogni gruppo rende almeno quanto una seduta del titolare', () => {
    // Se una di queste righe cadesse, quell\'ora di gruppo sarebbe
    // un\'ora regalata: stesso tempo, più persone da seguire, meno soldi.
    [2, 3, 4].forEach((n) => {
      expect(incassoGruppoDi(n) as number).toBeGreaterThanOrEqual(PREZZO_TITOLARE);
    });
  });
});

describe('la quota che il listino NON ha', () => {
  it('con cinque persone torna null, non zero e non un numero inventato', () => {
    expect(quotaGruppoDi(MAX_PERSONE)).toBeNull();
    expect(incassoGruppoDi(MAX_PERSONE)).toBeNull();
  });

  it('e lo dice a parole, invece di tacere', () => {
    expect(rigaGruppo(MAX_PERSONE)).toMatch(/decidi tu/i);
    expect(rigaGruppo(3)).toContain('15');
    expect(rigaGruppo(3)).toContain('45');
  });

  it('il selettore arriva a cinque: il buco è reale, non teorico', () => {
    expect(MAX_PERSONE).toBe(5);
    expect(QUOTE_GRUPPO[5]).toBeUndefined();
  });
});

describe('i prezzi si scrivono come si leggono', () => {
  it('11,50 e non 11.5', () => {
    expect(euroIt(11.5)).toBe('11,50');
    expect(euroIt(20)).toBe('20');
    expect(euroIt(46)).toBe('46');
  });
});

describe('una cifra scritta a mano non si sovrascrive', () => {
  it('riconosce le quote di listino, in tutte e due le scritture', () => {
    expect(eQuotaDiListino('20')).toBe(true);
    expect(eQuotaDiListino('11,50')).toBe(true);
    expect(eQuotaDiListino('11.5')).toBe(true);
    expect(eQuotaDiListino('15')).toBe(true);
  });

  it('e lascia stare tutto il resto', () => {
    expect(eQuotaDiListino('18')).toBe(false);
    expect(eQuotaDiListino('')).toBe(false);
    expect(eQuotaDiListino('ciao')).toBe(false);
  });
});

describe('l\'affiancamento', () => {
  it('costa 35 € la lezione, da 4 a 6 lezioni al mese', () => {
    expect(PREZZO_AFFIANCAMENTO).toBe(35);
    expect(AFFIANCAMENTO_MIN_MESE).toBe(4);
    expect(AFFIANCAMENTO_MAX_MESE).toBe(6);
  });

  it('lo conducono collaboratori, manager o il titolare', () => {
    expect(CONDUTTORI_AFFIANCAMENTO).toEqual(
      expect.arrayContaining(['collaboratore', 'manager', 'titolare'])
    );
  });

  it('quattro, cinque e sei lezioni vanno bene, e dicono il totale', () => {
    expect(controllaAffiancamento(4)).toMatchObject({ ok: true, totale: 140 });
    expect(controllaAffiancamento(5)).toMatchObject({ ok: true, totale: 175 });
    expect(controllaAffiancamento(6)).toMatchObject({ ok: true, totale: 210 });
  });

  it('sotto le quattro non è un affiancamento, e lo spiega', () => {
    const e = controllaAffiancamento(3);
    expect(e.ok).toBe(false);
    expect(e.motivo).toMatch(/ogni tanto/i);
  });

  it('sopra le sei si sta sostituendo l\'allenamento, non affiancandolo', () => {
    const e = controllaAffiancamento(7);
    expect(e.ok).toBe(false);
    expect(e.motivo).toMatch(/sostituisce/i);
  });

  it('zero e i valori non numerici non passano', () => {
    expect(controllaAffiancamento(0).ok).toBe(false);
    expect(controllaAffiancamento(NaN as unknown as number).ok).toBe(false);
    expect(controllaAffiancamento(undefined as unknown as number).ok).toBe(false);
  });
});

describe('le voci pronte per il preventivo', () => {
  it('ci sono i tre gruppi e i tre affiancamenti', () => {
    expect(VOCI_LISTINO.map((v) => v.chiave)).toEqual([
      'gruppo2', 'gruppo3', 'gruppo4',
      'affiancamento4', 'affiancamento5', 'affiancamento6',
    ]);
  });

  it('ogni voce ha un importo vero e una descrizione da consegnare', () => {
    VOCI_LISTINO.forEach((v) => {
      expect(v.importo).toBeGreaterThan(0);
      expect(v.descrizione.length).toBeGreaterThan(10);
    });
  });

  it('gli importi vengono dal listino, non da una seconda lista', () => {
    expect(VOCI_LISTINO.find((v) => v.chiave === 'gruppo4')!.importo)
      .toBe(QUOTE_GRUPPO[4]);
    expect(VOCI_LISTINO.find((v) => v.chiave === 'affiancamento6')!.importo)
      .toBe(AFFIANCAMENTO_MAX_MESE * PREZZO_AFFIANCAMENTO);
  });

  it('l\'importo si rilegge: quello che scrive il bottone, il preventivo lo capisce', () => {
    // La riga del preventivo fa parseFloat(importo.replace(',', '.')).
    VOCI_LISTINO.forEach((v) => {
      const riletto = parseFloat(euroIt(v.importo).replace(',', '.'));
      expect(riletto).toBe(v.importo);
    });
  });
});

describe('il gruppo legge il listino, non un secondo numero', () => {
  it('la proposta del dominio gruppo è la quota di listino', () => {
    [2, 3, 4, 5].forEach((n) => {
      expect(quotaProposta(n)).toBe(quotaGruppoDi(n));
    });
    expect(listinoDelGruppo(3)).toBe(rigaGruppo(3));
  });

  it('gruppo.ts importa il prezzo da listino.ts e non lo riscrive', () => {
    const src = leggi('domain/gruppo.ts');
    expect(src).toMatch(/from '\.\/listino'/);
    expect(src).not.toMatch(/\b11\.5\b/);
    expect(src).not.toMatch(/quotaPersona:\s*20\b/);
  });
});

// ------------------------------------------------------------
// CHE IL PREZZO ARRIVI DOVE SI COMPILA
// ------------------------------------------------------------

describe('l\'agenda propone la quota giusta', () => {
  const schermata = leggi('screens/shared/CalendarScreen.tsx');

  it('CalendarScreen chiede la proposta al dominio', () => {
    expect(schermata).toMatch(/quotaProposta/);
    expect(schermata).toMatch(/setFormQuota\(/);
  });

  it('la proposta segue il numero di persone', () => {
    const effetto = schermata.slice(
      schermata.indexOf('quotaProposta(formPersone)') - 700,
      schermata.indexOf('quotaProposta(formPersone)') + 300
    );
    expect(effetto).toMatch(/formPersone/);
  });

  it('non tocca una cifra scritta a mano', () => {
    expect(schermata).toMatch(/eQuotaDiListino\(formQuota\)/);
  });

  it('non riempie mai una quota in modifica: quel numero è già deciso', () => {
    const i = schermata.indexOf('quotaProposta(formPersone)');
    const prima = schermata.slice(i - 700, i);
    expect(prima).toMatch(/editingItem/);
  });

  it('il modale mostra la riga di listino accanto al selettore', () => {
    const modale = leggi('screens/shared/calendar/AppointmentModal.tsx');
    expect(modale).toMatch(/listinoDelGruppo\(formPersone\)/);
  });
});

describe('il preventivo ha le voci di listino a portata di mano', () => {
  const schermata = leggi('screens/staff/OnboardingScreen.tsx');

  it('i bottoni ci sono e vengono dal dominio', () => {
    expect(schermata).toMatch(/VOCI_LISTINO\.map/);
    expect(schermata).toMatch(/Voci di listino/);
  });

  it('nessun prezzo riscritto a mano nella schermata', () => {
    expect(schermata).not.toMatch(/Affiancamento ·/);
    expect(schermata).not.toMatch(/Personal di gruppo in/);
  });

  it('scrivono nella riga libera, non sopra una voce già compilata', () => {
    const i = schermata.indexOf('VOCI_LISTINO.map');
    const blocco = schermata.slice(i, i + 1200);
    expect(blocco).toMatch(/findIndex/);
    expect(blocco).toMatch(/libera === -1/);
  });
});
