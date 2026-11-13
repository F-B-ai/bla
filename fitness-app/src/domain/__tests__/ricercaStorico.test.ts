// ============================================================
// CERCARE UNA PERSONA, E VEDERE TUTTO
// ------------------------------------------------------------
// 21 ottobre 2026. La ricerca nell'agenda c'era già, ma cercava solo
// fra gli allievi in anagrafica. Una consulenza fissata a chi allievo
// non è ancora — cioè quasi tutte le prime volte, cioè le persone che
// si stanno decidendo — è intestata a un nome scritto a mano, e quel
// nome per la ricerca non esisteva.
//
// Due cose questi test tengono ferme:
//
//   · che un nome su una consulenza si ritrovi. Chi chiama dopo due
//     settimane per chiedere «quando ero venuto?» deve poter essere
//     ritrovato, altrimenti la risposta è «non lo so» a una persona
//     che stava decidendo se restare.
//   · che «passata e mai segnata» resti una categoria SUA. È una
//     seduta che forse si è svolta e nessuno ha registrato, o che non
//     si è svolta e nessuno l'ha detto: dentro un totale sparisce, ed
//     è esattamente il buco che a settembre non si vedeva.
// ============================================================

import fs from 'fs';
import path from 'path';
import {
  normalizza, corrisponde, statoVoce, riepilogoStorico, descriviRiepilogo,
  trovaPersone, ETICHETTA_STATO, MAX_SUGGERIMENTI, VoceStorico,
} from '../ricercaStorico';

const OGGI = '2026-10-21';

describe('due grafie dello stesso nome sono la stessa persona', () => {
  it('maiuscole e spazi non contano', () => {
    expect(normalizza('  Tony   ROSSETTI ')).toBe('tony rossetti');
  });

  it('e nemmeno gli accenti: chi cerca non li scrive', () => {
    expect(normalizza('Niccolò')).toBe('niccolo');
    expect(corrisponde('Niccolò Esposito', 'niccolo')).toBe(true);
  });
});

describe('si cerca per parole, in qualunque ordine', () => {
  it('il cognome da solo basta', () => {
    expect(corrisponde('Tony Rossetti', 'rossetti')).toBe(true);
  });

  it('e l\'ordine non conta: nessuno ricorda come l\'aveva scritto', () => {
    expect(corrisponde('Tony Rossetti', 'rossetti tony')).toBe(true);
  });

  it('un pezzo di parola basta, una parola sbagliata no', () => {
    expect(corrisponde('Guglielmo Di Capua', 'capu')).toBe(true);
    expect(corrisponde('Guglielmo Di Capua', 'capua marco')).toBe(false);
  });

  it('una ricerca vuota non trova tutti: non trova niente', () => {
    expect(corrisponde('Tony Rossetti', '')).toBe(false);
    expect(corrisponde('Tony Rossetti', '   ')).toBe(false);
  });
});

describe('«non effettuata» non è una cosa sola', () => {
  const v = (dateStr: string, status: string, fatta = false): VoceStorico =>
    ({ dateStr, status, isCountedAsCompleted: fatta });

  it('nel futuro e in programma: va bene così', () => {
    expect(statoVoce(v('2026-11-01', 'scheduled'), OGGI)).toBe('in_programma');
  });

  it('disdetta: qualcuno l\'ha detto, e c\'è scritto', () => {
    expect(statoVoce(v('2026-10-01', 'cancelled'), OGGI)).toBe('disdetta');
    expect(statoVoce(v('2026-10-01', 'cancelled_by_student'), OGGI)).toBe('disdetta');
  });

  it('svolta: segnata, e resta svolta anche se la data è avanti', () => {
    expect(statoVoce(v('2026-10-01', 'completed'), OGGI)).toBe('svolta');
    expect(statoVoce(v('2026-11-01', 'scheduled', true), OGGI)).toBe('svolta');
  });

  // Questa è la categoria per cui esiste tutto il resto.
  it('passata e rimasta «in programma»: nessuno l\'ha toccata', () => {
    expect(statoVoce(v('2026-10-01', 'scheduled'), OGGI)).toBe('mai_segnata');
  });

  it('e una disdetta resta disdetta anche se è passata', () => {
    expect(statoVoce(v('2025-01-01', 'cancelled'), OGGI)).toBe('disdetta');
  });

  it('ogni stato ha una parola che si legge', () => {
    expect(ETICHETTA_STATO.mai_segnata).toMatch(/mai segnata/i);
    expect(Object.keys(ETICHETTA_STATO)).toHaveLength(4);
  });
});

describe('il conto per stato', () => {
  const voci: VoceStorico[] = [
    { dateStr: '2026-09-01', status: 'completed' },
    { dateStr: '2026-09-08', status: 'scheduled', isCountedAsCompleted: true },
    { dateStr: '2026-09-15', status: 'scheduled' },          // mai segnata
    { dateStr: '2026-09-22', status: 'cancelled_by_student' },
    { dateStr: '2026-11-03', status: 'scheduled' },          // in programma
  ];

  it('separa le quattro cose', () => {
    expect(riepilogoStorico(voci, OGGI)).toEqual({
      totale: 5, svolte: 2, inProgramma: 1, disdette: 1, maiSegnate: 1,
    });
  });

  it('senza niente non inventa righe', () => {
    expect(descriviRiepilogo(riepilogoStorico([], OGGI)))
      .toMatch(/nessun appuntamento/i);
  });

  it('la riga nomina le mai segnate quando ce ne sono', () => {
    expect(descriviRiepilogo(riepilogoStorico(voci, OGGI)))
      .toMatch(/1 passate e mai segnate/);
  });

  // Un allarme che suona a vuoto smette di essere ascoltato anche
  // quando ha ragione.
  it('e NON le nomina quando sono zero', () => {
    const pulito = riepilogoStorico(
      [{ dateStr: '2026-09-01', status: 'completed' }], OGGI
    );
    expect(descriviRiepilogo(pulito)).not.toMatch(/mai segnate/);
  });
});

describe('chi si trova cercando', () => {
  const allievi = [
    { id: 'a1', nome: 'Tony Rossetti' },
    { id: 'a2', nome: 'Carmine Longobardi' },
  ];
  const ospiti = [
    { persona: 'Anna Perrone' },
    { persona: 'Anna Perrone' },   // tre consulenze della stessa persona
    { persona: 'Anna Perrone' },
    { persona: 'Tony Rossetti' },  // poi è diventato allievo
  ];

  it('trova gli allievi in anagrafica', () => {
    expect(trovaPersone(allievi, ospiti, 'rossetti'))
      .toEqual([{ chiave: 'a1', nome: 'Tony Rossetti', ospite: false }]);
  });

  it('e trova anche un nome che esiste SOLO su una consulenza', () => {
    const t = trovaPersone(allievi, ospiti, 'perrone');
    expect(t).toEqual([{ chiave: 'Anna Perrone', nome: 'Anna Perrone', ospite: true }]);
  });

  it('la stessa persona non compare tre volte per tre consulenze', () => {
    expect(trovaPersone(allievi, ospiti, 'anna')).toHaveLength(1);
  });

  it('se è già in anagrafica vince l\'allievo: è la scheda vera', () => {
    const t = trovaPersone(allievi, ospiti, 'tony');
    expect(t).toHaveLength(1);
    expect(t[0].ospite).toBe(false);
  });

  it('non si riempie lo schermo: oltre otto nomi non si legge più', () => {
    const tanti = Array.from({ length: 30 }, (_, i) => ({ persona: `Mario Rossi ${i}` }));
    expect(trovaPersone([], tanti, 'mario')).toHaveLength(MAX_SUGGERIMENTI);
  });

  it('a ricerca vuota non si propone nessuno', () => {
    expect(trovaPersone(allievi, ospiti, '')).toEqual([]);
  });

  it('e un ospite senza nome non diventa una riga vuota da toccare', () => {
    expect(trovaPersone([], [{ persona: '  ' }], 'a')).toEqual([]);
  });
});

// ------------------------------------------------------------
// CHE LA SCHERMATA LO USI DAVVERO
// ------------------------------------------------------------

describe('l\'agenda è collegata', () => {
  const leggi = (r: string): string =>
    fs.readFileSync(path.join(__dirname, '..', '..', r), 'utf8');
  const agenda = leggi('screens/shared/CalendarScreen.tsx');
  const modale = leggi('screens/shared/calendar/StudentDetailModal.tsx');

  it('la ricerca guarda allievi E ospiti, non solo gli allievi', () => {
    expect(agenda).toMatch(/trovaPersone\(/);
    expect(agenda).toMatch(/ospiti\.map\(\(o\) => \(\{ persona: o\.persona \}\)\)/);
    expect(agenda).not.toMatch(/const matchingStudents =/);
  });

  it('toccando un ospite si apre la sua storia, non quella di un allievo', () => {
    expect(agenda).toMatch(/openOspiteHistory\(p\.chiave\)/);
    expect(agenda).toMatch(/openStudentHistory\(p\.chiave, p\.nome\)/);
  });

  it('il riepilogo arriva fino allo schermo', () => {
    expect(agenda).toMatch(/riepilogo=\{searchDetail \? descriviRiepilogo/);
    expect(modale).toMatch(/maiSegnate > 0/);
  });

  it('e l\'avviso dice che cosa può essere successo, non solo che c\'è', () => {
    expect(modale).toMatch(/non è stato segnato/);
    expect(modale).toMatch(/nessuno l\\'ha detto/);
  });
});
