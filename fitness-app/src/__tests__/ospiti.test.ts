import fs from 'fs';
import path from 'path';

// ============================================================
// «NON VEDO TUTTI GLI APPUNTAMENTI OSPITI GIALLI» — 15 set 2026
// ------------------------------------------------------------
// La lettura chiedeva le prime 300 richieste `confermata` SENZA
// ORDINE, e solo dopo scartava quelle già diventate sedute. Ma ogni
// richiesta confermata di un allievo in anagrafica resta in archivio
// `confermata` e con `sessionId`: occupa posto nelle 300 e non
// comparirà mai nell'elenco.
//
// Superate le 300, gli ospiti veri cadevano fuori dalla finestra —
// a caso, uno alla volta, finché non ne restava nessuno. Nessun
// errore, nessun messaggio.
//
// Questi test guardano il CODICE, perché la query non si può
// provare senza Firebase — ed è proprio la query il punto.
// ============================================================

const radice = path.join(__dirname, '..', '..');
const servizio = fs.readFileSync(
  path.join(radice, 'src', 'services', 'agendaRequestService.ts'), 'utf8'
);
const agenda = fs.readFileSync(
  path.join(radice, 'src', 'screens', 'shared', 'CalendarScreen.tsx'), 'utf8'
);

const lettura = servizio.slice(
  servizio.indexOf('export const getOspitiConfermati'),
  servizio.indexOf('export const getOspitiConfermati') + 900
);

describe('la lettura chiede solo quello che serve', () => {
  // Il cuore della correzione: senza questo filtro, le sedute
  // riempiono la finestra e gli ospiti cadono fuori.
  it('filtra sugli ospiti, non su tutte le richieste confermate', () => {
    expect(lettura).toContain("where('ospite', '==', true)");
    expect(lettura).toContain("where('stato', '==', 'confermata')");
  });

  it('tiene la cintura: un ospite con una seduta non è più un ospite', () => {
    expect(lettura).toContain('!r.sessionId');
  });
});

describe('il tetto non si tocca mai in silenzio', () => {
  // È esattamente così che erano spariti: una finestra piena, e
  // nessuno che lo dicesse.
  it('la lettura dice se ha toccato il tetto', () => {
    expect(lettura).toContain('troncato');
    expect(lettura).toContain('snap.size >= TETTO_OSPITI');
  });

  it('e l\'agenda lo riporta invece di mostrare una lista corta', () => {
    expect(agenda).toContain('osp.troncato');
    expect(agenda).toContain('elenco troncato');
  });
});

describe('ogni strada che crea un ospite lo marca', () => {
  // Il filtro nuovo si fida del campo `ospite`: se una strada
  // dimenticasse di scriverlo, quegli ospiti sparirebbero.
  it('creaOspite scrive ospite: true', () => {
    const crea = servizio.slice(
      servizio.indexOf('export const creaOspite'),
      servizio.indexOf('export const creaOspite') + 800
    );
    expect(crea).toContain('ospite: true');
  });

  it('e confermare una richiesta senza allievo pure', () => {
    const conferma = servizio.slice(servizio.indexOf('if (studentId) {'));
    expect(conferma).toContain('ospite: true');
    // Quando invece diventa una seduta, smette di essere un ospite.
    expect(conferma).toContain('ospite: false');
  });
});
