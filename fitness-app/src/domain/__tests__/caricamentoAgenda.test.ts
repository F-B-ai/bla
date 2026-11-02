import {
  descriviMancanze, titoloMancanze, mancanza,
  CARICAMENTO_AGENDA_VERSION,
} from '../caricamentoAgenda';

// ============================================================
// «HO PERSO TUTTI GLI APPUNTAMENTI DI CONSULENZA»
// ------------------------------------------------------------
// Non li aveva persi: la schermata non riusciva a leggerli e
// mostrava una lista vuota, identica a «non c'è niente».
// Terza volta questa settimana, terzo file. Il vuoto e il guasto
// devono avere due facce.
// ============================================================

describe('quando è andato tutto bene', () => {
  it('non compare nessun avviso', () => {
    expect(descriviMancanze([])).toBeNull();
    expect(descriviMancanze(undefined as never)).toBeNull();
  });
});

describe('quando manca un pezzo', () => {
  const t = descriviMancanze([{ pezzo: 'ospiti', motivo: 'permission-denied' }])!;

  it('dice QUALE pezzo, con parole che il titolare riconosce', () => {
    expect(t).toContain('consulenze con persone non ancora in anagrafica');
  });

  // La riga che conta: senza, il vuoto continua a sembrare la verità.
  it('dice a chiare lettere che non vuol dire che non ci siano', () => {
    expect(t).toContain('NON vuol dire che non ci siano');
    expect(t).toContain('la lettura non è riuscita');
  });

  it('e mostra il motivo tecnico, brutto ma vero', () => {
    expect(t).toContain('permission-denied');
  });
});

describe('quando ne mancano più di uno', () => {
  const t = descriviMancanze([
    { pezzo: 'ospiti', motivo: 'unavailable' },
    { pezzo: 'visite', motivo: 'unavailable' },
  ])!;

  it('li elenca in italiano, con la «e»', () => {
    expect(t).toContain(' e ');
    expect(t).toContain('visite col nutrizionista');
  });

  it('e non ripete due volte lo stesso motivo', () => {
    expect(t.match(/unavailable/g)).toHaveLength(1);
  });

  it('il titolo cambia quando sono più di uno', () => {
    expect(titoloMancanze([{ pezzo: 'ospiti' }])).toContain('un pezzo');
    expect(titoloMancanze([{ pezzo: 'ospiti' }, { pezzo: 'visite' }]))
      .toBe('Agenda incompleta');
  });
});

describe('un errore senza motivo leggibile non blocca l\'avviso', () => {
  it('l\'avviso compare lo stesso, senza la coda tecnica', () => {
    const t = descriviMancanze([{ pezzo: 'sedute' }])!;
    expect(t).toContain('le sedute');
    expect(t).not.toContain('Dettaglio tecnico');
  });
});

describe('da un errore qualunque a una mancanza', () => {
  it('prende il codice, se c\'è', () => {
    expect(mancanza('ospiti', { code: 'permission-denied' }).motivo)
      .toBe('permission-denied');
  });

  it('altrimenti il messaggio', () => {
    expect(mancanza('visite', new Error('client is offline')).motivo)
      .toContain('offline');
  });

  it('e con niente in mano non inventa un motivo', () => {
    expect(mancanza('sedute', null).motivo).toBeUndefined();
    expect(mancanza('sedute', undefined).motivo).toBeUndefined();
  });
});

describe('versione', () => {
  it('tracciata', () => {
    expect(CARICAMENTO_AGENDA_VERSION).toBe(1);
  });
});

// ============================================================
// 9 novembre 2026 — L'ALLARME CHE SPAVENTAVA CHI NON DOVEVA
// ------------------------------------------------------------
// Un collaboratore (non Giuseppe, non Antonio) apre il calendario e
// vede un allarme rosso: «Non sono riuscito a leggere le consulenze
// con persone non ancora in anagrafica · permission-denied».
//
// Non era un guasto. Gli ospiti sono contatti del titolare, e un
// collaboratore non deve leggerli: il database fa il suo lavoro. Ma
// lo schermo chiedeva comunque e trasformava un «no» previsto in un
// allarme — su una cosa che funziona.
// ============================================================

import { vaSegnalataMancanzaOspiti, ERRORE_PERMESSO } from '../caricamentoAgenda';

describe('un permesso negato sugli ospiti non è sempre un guasto', () => {
  const permessoNegato = { code: ERRORE_PERMESSO, message: 'Missing or insufficient permissions.' };

  it('a un collaboratore il permesso negato NON si segnala: è lo stato normale', () => {
    expect(vaSegnalataMancanzaOspiti(permessoNegato, false)).toBe(false);
  });

  // È il caso per cui la lettura si tenta sempre: se il ruolo del
  // titolare non si legge bene, gli ospiti non devono sparire muti.
  it('al titolare il permesso negato SI segnala: per lui è un guasto vero', () => {
    expect(vaSegnalataMancanzaOspiti(permessoNegato, true)).toBe(true);
  });

  it('qualunque altro errore si segnala sempre, a chiunque', () => {
    const rete = { code: 'unavailable', message: 'network error' };
    expect(vaSegnalataMancanzaOspiti(rete, false)).toBe(true);
    expect(vaSegnalataMancanzaOspiti(rete, true)).toBe(true);
    expect(vaSegnalataMancanzaOspiti(new Error('boom'), false)).toBe(true);
  });
});

describe('la schermata applica la regola, non la reinventa', () => {
  const fs = require('fs');
  const path = require('path');
  const cal = fs.readFileSync(
    path.join(__dirname, '..', '..', 'screens', 'shared', 'CalendarScreen.tsx'), 'utf8'
  );

  it('il calendario filtra il fallimento ospiti con la funzione del dominio', () => {
    expect(cal).toMatch(/if \(vaSegnalataMancanzaOspiti\(e, isOwner\)\) mancanti\.push/);
  });

  // La lettura si TENTA ancora per tutti: è questo che protegge il
  // titolare dal guasto silenzioso. Si filtra l'avviso, non la domanda.
  it('la lettura degli ospiti si chiede comunque, non si salta per ruolo', () => {
    expect(cal).toMatch(/getOspitiConfermati\(\)\.catch/);
  });
});
