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
  servizio.indexOf('export const getOspitiConfermati') + 2600
);

describe('la lettura non può più cadere fuori dalla finestra', () => {
  // Il cuore della correzione: ordinando per giorno DECRESCENTE,
  // oggi e il futuro stanno sempre in cima. Anche con anni di
  // archivio sotto, quello che serve all'agenda resta dentro.
  it('ordina per giorno, dal più avanti al più indietro', () => {
    expect(lettura).toContain("orderBy('giorno', 'desc')");
  });

  // Un solo orderBy = indice automatico. Con un filtro accanto
  // servirebbe un indice composito, che quando manca fa fallire
  // tutta la query — e allora sparirebbero di nuovo.
  it('senza filtri accanto, così non serve nessun indice nuovo', () => {
    expect(lettura).not.toContain('where(');
  });

  // Il rimedio precedente si fidava del campo `ospite`: un documento
  // che non ce l'ha spariva e non tornava più.
  it('non si fida di nessun campo facoltativo: smista qui', () => {
    expect(lettura).toContain("r.stato === 'confermata'");
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
  // La lettura non dipende più da questo campo, ma la schermata
  // Richieste lo usa ancora: resta difeso.
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
