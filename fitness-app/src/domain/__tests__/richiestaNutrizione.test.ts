// ============================================================
// L'ALLIEVO CHIEDE UNA CONSULENZA
// ------------------------------------------------------------
// Fino al 12 ottobre 2026, nella sua area, l'allievo vedeva le visite
// che qualcun altro gli aveva fissato e basta. Per chiederne una
// doveva dirlo a voce a chi incontrava — e quello che si dice a voce
// in sala, quasi sempre, non arriva.
//
// Due cose questi test tengono ferme più delle altre:
//
//   · che una richiesta NON diventi un questionario sanitario. È una
//     domanda di appuntamento: la salute si racconta in visita, a chi
//     la sa ascoltare e ne risponde.
//   · che chi ha chiesto sappia a che punto è. Una richiesta inviata
//     e poi silenzio è peggio di nessuna richiesta: la persona non
//     torna a chiedere, conclude che qui non si risponde.
// ============================================================

import fs from 'fs';
import path from 'path';
import {
  FASCE, MAX_NOTA, controllaRichiesta, richiestaAperta, puoChiedere,
  descriviFasce, spiegaStato, rigaPerTitolare, RichiestaNutrizione,
} from '../richiestaNutrizione';

const leggi = (relativo: string): string =>
  fs.readFileSync(path.join(__dirname, '..', '..', relativo), 'utf8');

const richiesta = (p: Partial<RichiestaNutrizione> = {}): RichiestaNutrizione => ({
  id: 'r1',
  studentId: 'a1',
  allievo: 'Arianna Russo',
  fasce: ['sera'],
  nota: '',
  stato: 'in_attesa',
  creataIl: new Date('2026-10-12T10:00:00'),
  ...p,
});

describe('che cosa si chiede, e che cosa no', () => {
  it('tre fasce orarie, non un\'agenda', () => {
    expect(FASCE.map((f) => f.valore)).toEqual(['mattina', 'pomeriggio', 'sera']);
    FASCE.forEach((f) => expect(f.quando).toMatch(/\d+:\d+ – \d+:\d+/));
  });

  it('serve almeno una fascia: senza, non si può fissare niente', () => {
    const e = controllaRichiesta({ fasce: [], nota: '' });
    expect(e.valido).toBe(false);
    expect(e.problemi[0]).toMatch(/quando puoi/i);
  });

  it('la nota NON è obbligatoria: chi è timido deve poter chiedere lo stesso', () => {
    expect(controllaRichiesta({ fasce: ['mattina'], nota: '' }).valido).toBe(true);
  });

  it('ma non è un tema: oltre il massimo si ferma, e dice dove si racconta', () => {
    const e = controllaRichiesta({ fasce: ['mattina'], nota: 'a'.repeat(MAX_NOTA + 1) });
    expect(e.valido).toBe(false);
    expect(e.problemi[0]).toMatch(/in visita/i);
    expect(MAX_NOTA).toBe(400);
  });

  it('nel dominio non esiste nessun campo di salute', () => {
    // senza i commenti, dove queste parole compaiono apposta per
    // dire che cosa NON si chiede
    const src = leggi('domain/richiestaNutrizione.ts')
      .replace(/\/\/.*$/gm, '')
      .toLowerCase();
    ['patologi', 'sintom', 'farmac', 'allerg', 'diagnos', 'peso:', 'intolleranz']
      .forEach((parola) => expect(src).not.toContain(parola));
  });
});

describe('una richiesta aperta alla volta', () => {
  it('finché aspetta risposta non se ne manda un\'altra', () => {
    expect(puoChiedere([richiesta()])).toBe(false);
    expect(richiestaAperta([richiesta()])?.id).toBe('r1');
  });

  it('chiusa quella, se ne può chiedere una nuova', () => {
    expect(puoChiedere([richiesta({ stato: 'chiusa' })])).toBe(true);
    expect(puoChiedere([richiesta({ stato: 'fissata' })])).toBe(true);
  });

  it('e senza richieste si può chiedere, ovviamente', () => {
    expect(puoChiedere([])).toBe(true);
    expect(richiestaAperta([])).toBeNull();
  });
});

describe('le fasce si leggono come si direbbero a voce', () => {
  it('una, due o tre', () => {
    expect(descriviFasce(['sera'])).toBe('sera');
    expect(descriviFasce(['mattina', 'sera'])).toBe('mattina o sera');
    expect(descriviFasce(['mattina', 'pomeriggio', 'sera']))
      .toBe('mattina, pomeriggio o sera');
  });

  it('e se mancano non si lascia un buco', () => {
    expect(descriviFasce([])).toBe('quando capita');
  });
});

describe('chi ha chiesto sa a che punto è', () => {
  it('in attesa: si dice CHI ce l\'ha in mano e che non va richiesta', () => {
    const s = spiegaStato(richiesta());
    expect(s?.titolo).toMatch(/inviata/i);
    expect(s?.testo).toMatch(/titolare/i);
    expect(s?.testo).toMatch(/non serve richiederla/i);
  });

  it('fissata: si dice dove trovarla', () => {
    const s = spiegaStato(richiesta({ stato: 'fissata' }));
    expect(s?.testo).toMatch(/visite/i);
  });

  it('chiusa: si riporta il motivo, se c\'è', () => {
    const s = spiegaStato(richiesta({ stato: 'chiusa', esito: 'Ne parliamo a novembre.' }));
    expect(s?.testo).toBe('Ne parliamo a novembre.');
  });

  it('chiusa senza motivo: non resta muta', () => {
    const s = spiegaStato(richiesta({ stato: 'chiusa' }));
    expect(s?.testo).toMatch(/puoi farne una nuova/i);
  });

  it('senza richieste non si inventa uno stato', () => {
    expect(spiegaStato(null)).toBeNull();
  });
});

describe('quello che legge il titolare', () => {
  it('nome e disponibilità in una riga', () => {
    expect(rigaPerTitolare(richiesta({ fasce: ['mattina', 'sera'] })))
      .toBe('Arianna Russo · può mattina o sera');
  });
});

// ------------------------------------------------------------
// CHE LA RICHIESTA ARRIVI DOVE DEVE
// ------------------------------------------------------------

describe('la schermata della nutrizione', () => {
  const schermata = leggi('screens/shared/NutritionistScreen.tsx');

  it('all\'allievo mostra il pulsante per chiedere', () => {
    expect(schermata).toMatch(/isStudent && renderRichiestaAllievo\(\)/);
    expect(schermata).toMatch(/Chiedi una consulenza/);
  });

  it('e se ha già chiesto gli mostra lo stato, non un secondo pulsante', () => {
    const i = schermata.indexOf('const renderRichiestaAllievo');
    const blocco = schermata.slice(i, i + 1800);
    expect(blocco).toMatch(/richiestaAperta\(mieRichieste\)/);
    expect(blocco).toMatch(/if \(aperta\)/);
  });

  it('al titolare mostra chi ha chiesto', () => {
    expect(schermata).toMatch(/isOwner && renderRichiesteTitolare\(\)/);
  });

  it('e «Fissa la visita» apre la prenotazione già sull\'allievo giusto', () => {
    const i = schermata.indexOf('Fissa la visita');
    const blocco = schermata.slice(i - 900, i);
    expect(blocco).toMatch(/setSelectedStudentId\(r\.studentId\)/);
    expect(blocco).toMatch(/setShowAppointmentModal\(true\)/);
  });

  // 12 ottobre 2026: le richieste si leggevano dentro `loadData`, che
  // comincia con «se non c'è un allievo selezionato esci». Al
  // titolare — che apre la schermata senza aver scelto nessuno — non
  // comparivano MAI. Una richiesta che esiste e non si vede è una
  // persona che ha chiesto e non riceve risposta: esattamente la cosa
  // che questa funzione doveva togliere di mezzo.
  it('le richieste si leggono senza aspettare che si scelga un allievo', () => {
    const i = schermata.indexOf('const loadRichieste');
    expect(i).toBeGreaterThan(0);
    // solo il corpo della funzione, fino alla sua lista di dipendenze
    const blocco = schermata.slice(i, schermata.indexOf('}, [', i) + 40);
    expect(blocco).not.toMatch(/selectedStudentId/);
    // e la lettura parte da sola all'apertura
    expect(schermata).toMatch(/useEffect\(\(\) => \{\s*loadRichieste\(\);/);
  });

  it('il titolare vede il pallino sulle Visite senza entrarci', () => {
    expect(schermata).toMatch(/tab\.key === 'visite' && isOwner && richiesteAperte\.length > 0/);
  });

  it('e tirando giù si ricaricano anche loro', () => {
    const i = schermata.indexOf('const onRefresh');
    expect(schermata.slice(i, i + 250)).toMatch(/loadRichieste\(\)/);
  });

  it('un errore sulle richieste non svuota misure e visite', () => {
    // Erano tutte in un Promise.all: una riga che fallisce lasciava
    // la schermata intera vuota.
    const i = schermata.indexOf('Errore caricamento richieste nutrizione');
    expect(i).toBeGreaterThan(0);
    const prima = schermata.slice(i - 700, i);
    expect(prima).toMatch(/try \{/);
    // e sta in una funzione sua, non nella stessa di misure e visite
    expect(schermata.indexOf('const loadRichieste'))
      .toBeLessThan(i);
  });
});

describe('le regole del server', () => {
  const regole = leggi('../firestore.rules');
  const i = regole.indexOf('match /richiesteNutrizione/');
  const blocco = regole.slice(i, regole.indexOf('}', regole.indexOf('allow delete', i)) + 1);

  it('la scrive l\'allievo, ma solo a nome proprio', () => {
    expect(blocco).toMatch(/allow create: if isAuthenticated\(\)/);
    expect(blocco).toMatch(/request\.resource\.data\.studentId == request\.auth\.uid/);
  });

  it('nasce sempre in attesa: lo stato non si sceglie da sé', () => {
    expect(blocco).toMatch(/request\.resource\.data\.stato == 'in_attesa'/);
  });

  it('la legge il titolare, e l\'allievo solo la propria', () => {
    expect(blocco).toMatch(/allow read: if isOwner\(\) \|\| resource\.data\.studentId == request\.auth\.uid/);
  });

  it('risponde solo il titolare', () => {
    expect(blocco).toMatch(/allow update: if isOwner\(\)/);
  });

  it('e non si cancella: una richiesta sparita è una persona senza risposta', () => {
    expect(blocco).toMatch(/allow delete: if false/);
  });
});
