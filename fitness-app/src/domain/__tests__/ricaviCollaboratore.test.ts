// ============================================================
// LA CIFRA INVENTATA NON DEVE TORNARE
// ------------------------------------------------------------
// Per mesi i grafici hanno mostrato «allievi × 150 €» al posto dei
// ricavi mancanti. Una stima plausibile messa dove mancava un dato è
// il modo più efficace di nascondere che il dato manca: chi non
// registrava niente aveva la stessa barra di chi lavorava.
//
// Questi test tengono separate le due cose che erano state confuse —
// «zero euro» e «nessun movimento» — e vanno a guardare dentro le
// schermate che quella riga non ci sia più.
// ============================================================

import fs from 'fs';
import path from 'path';
import {
  ricavoRegistrato, etichettaRicavo, ricaviPerPersona,
  chiNonRegistra, ricavoSquadra,
} from '../ricaviCollaboratore';

const t = (collaboratorId: string, amount: number, type = 'income') =>
  ({ type, amount, collaboratorId });

// `allievi` lo conta chi chiama, dalle schede degli allievi: vedi la
// nota del 31 ottobre in ricaviCollaboratore.ts.
const persone = [
  { id: 'g', name: 'Giuseppe', surname: 'Esposito', allievi: 3 },
  { id: 'a', name: 'Antonio', surname: 'Russo', allievi: 1 },
  { id: 'n', name: 'Nuovo', surname: 'Arrivato', allievi: 0 },
];

describe('si somma quello che è stato registrato, e basta', () => {
  it('somma solo le entrate di quella persona', () => {
    const m = [t('a', 100), t('a', 50), t('g', 999), t('a', 70, 'expense')];
    expect(ricavoRegistrato(m, 'a')).toEqual({ importo: 150, movimenti: 2 });
  });

  it('e chi non ha registrato niente risulta a zero, non a una stima', () => {
    expect(ricavoRegistrato([t('a', 100)], 'g')).toEqual({ importo: 0, movimenti: 0 });
  });

  it('un elenco vuoto non fa saltare niente', () => {
    expect(ricavoRegistrato([], 'g')).toEqual({ importo: 0, movimenti: 0 });
  });
});

describe('«zero euro» e «nessun movimento» sono due fatti diversi', () => {
  // È L'ERRORE CHE QUESTO FILE ESISTE PER NON RIPETERE.
  it('niente registrato si dice con le parole, non con uno zero', () => {
    expect(etichettaRicavo({ importo: 0, movimenti: 0 })).toBe('nessun movimento');
  });

  it('e uno zero registrato resta uno zero', () => {
    expect(etichettaRicavo({ importo: 0, movimenti: 2 })).toBe('0 €');
  });

  it('un importo vero si legge in euro', () => {
    expect(etichettaRicavo({ importo: 150.4, movimenti: 1 })).toBe('150 €');
  });
});

describe('chi ha allievi e non registra niente', () => {
  const movimenti = [t('a', 200)];

  it('lo tira fuori senza doverlo cercare', () => {
    const r = chiNonRegistra(persone, movimenti);
    expect(r.map((x) => x.id)).toEqual(['g']);
    expect(r[0].allievi).toBe(3);
  });

  it('chi registra non compare', () => {
    expect(chiNonRegistra(persone, movimenti).map((x) => x.id)).not.toContain('a');
  });

  // Un collaboratore appena arrivato, senza allievi, che non ha
  // registrato niente non sta facendo niente di strano: metterlo in
  // questo elenco sarebbe un'accusa gratuita.
  it('chi non ha allievi resta fuori', () => {
    expect(chiNonRegistra(persone, []).map((x) => x.id)).not.toContain('n');
  });

  it("dal più grave: chi ha più allievi fermi viene per primo", () => {
    const r = chiNonRegistra(persone, []);
    expect(r.map((x) => x.id)).toEqual(['g', 'a']);
  });
});

describe('il numero di allievi non viene dalla copia', () => {
  // 31 ottobre 2026. Prima si leggeva `assignedStudents` sulla scheda
  // del collaboratore: una copia che fino a ieri poteva riscrivere
  // chiunque. Chi aveva la copia vuota e allievi veri spariva da
  // questo elenco — e un'assenza qui si legge come un'assoluzione.
  it('chi ha la copia vuota ma allievi veri compare lo stesso', () => {
    const conCopiaVuota = [
      { id: 'g', name: 'Giuseppe', surname: 'E.', allievi: 3, assignedStudents: [] },
    ];
    expect(chiNonRegistra(conCopiaVuota, []).map((x) => x.id)).toEqual(['g']);
  });

  it('e il campo della copia non viene nemmeno guardato', () => {
    const conCopiaPiena = [
      { id: 'x', name: 'X', surname: 'Y', allievi: 0, assignedStudents: ['a', 'b', 'c'] },
    ];
    expect(chiNonRegistra(conCopiaPiena, [])).toEqual([]);
  });
});

describe('i totali non si tappano', () => {
  it('la somma di squadra riflette i buchi invece di nasconderli', () => {
    const r = ricavoSquadra(persone, [t('a', 200)]);
    expect(r.importo).toBe(200);
    expect(r.movimenti).toBe(1);
  });

  it('e le righe portano il nome come si legge', () => {
    const r = ricaviPerPersona(persone, []);
    expect(r[0].nome).toBe('Giuseppe E.');
  });
});

// ============================================================
// E ADESSO LE SCHERMATE
// ------------------------------------------------------------
// Il calcolo giusto in un file che nessuna schermata usa non serve
// a niente. Cinque punti contenevano la cifra inventata — compreso
// il cruscotto del manager, cioè proprio chi avrebbe dovuto
// accorgersene.
// ============================================================

describe('la cifra inventata non è più da nessuna parte', () => {
  const schermate = [
    'screens/owner/DashboardScreen.tsx',
    'screens/owner/AnalyticsScreen.tsx',
    'screens/manager/ManagerDashboardScreen.tsx',
  ];

  const leggi = (r: string): string =>
    fs.readFileSync(path.join(__dirname, '..', '..', r), 'utf8');

  // Si guarda il CODICE, non i commenti: in due di queste schermate
  // la riga vecchia è citata apposta nella spiegazione del perché è
  // stata tolta, e quella citazione deve restare.
  const soloCodice = (r: string): string => leggi(r)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  schermate.forEach((s) => {
    it(`${s.split('/').pop()} non inventa più niente`, () => {
      const testo = soloCodice(s);
      expect(testo).not.toMatch(/assignedStudents\.length \* 150/);
      expect(testo).not.toMatch(/coachIncome > 0 \? coachIncome :/);
    });

    it(`${s.split('/').pop()} usa il calcolo condiviso`, () => {
      expect(leggi(s)).toMatch(/from '.*domain\/ricaviCollaboratore'/);
    });
  });
});

// ============================================================
// 2 novembre 2026 — I MANAGER MANCAVANO
// ------------------------------------------------------------
// Il titolare apre il pannello e non vede Giuseppe, che ha ventuno
// allievi assegnati e nessun movimento registrato. Vede solo Antonio,
// che ne ha otto.
//
// Il motivo non era nei dati: la schermata leggeva solo
// `getCollaborators()`, che filtra su `role == 'collaborator'`.
// Giuseppe è un MANAGER. Era invisibile per costruzione.
//
// E non comparire in quell'elenco si legge come «su di lui non c'è
// niente da dire»: la terza volta in questa storia che uno strumento
// esiste e non arriva dove serve.
// ============================================================

describe('chi segue allievi si guarda, qualunque etichetta abbia', () => {
  const leggiSchermata = (): string =>
    fs.readFileSync(
      path.join(__dirname, '..', '..', 'screens', 'owner', 'RegistroScreen.tsx'),
      'utf8'
    );

  it('la schermata legge anche i manager, non solo i collaboratori', () => {
    const s = leggiSchermata();
    expect(s).toMatch(/getManagers/);
    expect(s).toMatch(/\[\.\.\.collaboratori, \.\.\.manager\]/);
  });

  it('e un manager con allievi e zero movimenti compare', () => {
    const manager = [{ id: 'g', name: 'Giuseppe', surname: 'Calabrese', allievi: 21 }];
    const r = chiNonRegistra(manager, []);
    expect(r).toHaveLength(1);
    expect(r[0].allievi).toBe(21);
  });

  it('ordinati dal più grave: ventuno allievi fermi vengono prima di otto', () => {
    const tutti = [
      { id: 'a', name: 'Antonio', surname: 'C', allievi: 8 },
      { id: 'g', name: 'Giuseppe', surname: 'Calabrese', allievi: 21 },
    ];
    expect(chiNonRegistra(tutti, []).map((x) => x.id)).toEqual(['g', 'a']);
  });
});
