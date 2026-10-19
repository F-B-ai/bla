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
  FASCE, MAX_NOTA, MAX_ORARIO, controllaRichiesta, controllaProposta,
  richiestaAperta, puoChiedere, descriviFasce, spiegaStato, rigaPerTitolare,
  RichiestaNutrizione, GIORNI_CONTROLLO, TESTO_CONTROLLO, prossimoControllo,
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

  it('mostra l\'elenco al titolare E al nutrizionista', () => {
    // Il nutrizionista deve vederle: senza, non potrebbe proporre
    // niente e la richiesta resterebbe ferma ad aspettare lui.
    expect(schermata).toMatch(/\(isOwner \|\| isNutritionist\) && renderRichiesteTitolare\(\)/);
  });

  it('e all\'allievo dice del controllo gratuito ogni quindici giorni', () => {
    expect(schermata).toMatch(/isStudent && renderControlloQuindicinale\(\)/);
    expect(schermata).toMatch(/TESTO_CONTROLLO/);
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

  it('la leggono titolare e nutrizionista, e l\'allievo solo la propria', () => {
    expect(blocco).toMatch(/allow read: if isOwner\(\)/);
    expect(blocco).toMatch(/isNutritionist\(\)/);
    expect(blocco).toMatch(/resource\.data\.studentId == request\.auth\.uid/);
  });

  it('il titolare può tutto; il nutrizionista solo proporre', () => {
    expect(blocco).toMatch(/allow update: if isOwner\(\)/);
    // il permesso del nutrizionista è ritagliato sui campi, non
    // lasciato al buon senso di chi lo usa
    expect(blocco).toMatch(/affectedKeys\(\)/);
    expect(blocco).toMatch(/hasOnly\(\['stato', 'orarioProposto', 'propostoDa', 'propostoIl'\]\)/);
  });

  it('e non può proporre su una richiesta già evasa', () => {
    expect(blocco).toMatch(/resource\.data\.stato == 'in_attesa'/);
    expect(blocco).toMatch(/request\.resource\.data\.stato == 'proposta'/);
  });

  it('e non si cancella: una richiesta sparita è una persona senza risposta', () => {
    expect(blocco).toMatch(/allow delete: if false/);
  });
});

// ============================================================
// 19 ottobre 2026 — L'ORARIO LO DÀ IL NUTRIZIONISTA
// ------------------------------------------------------------
// Prima la richiesta aspettava che il titolare trovasse un buco
// nell'agenda di un'altra persona. Adesso lo propone chi quell'agenda
// ce l'ha. Il titolare resta in mezzo per confermare: un tocco, ma è
// il tocco che tiene il controllo dello studio dove deve stare.
// ============================================================

const base = (s: Partial<RichiestaNutrizione> = {}): RichiestaNutrizione => ({
  studentId: 'a1', allievo: 'Maria', fasce: ['sera'], nota: '',
  stato: 'in_attesa', creataIl: new Date('2026-10-19T09:00:00'), ...s,
});

describe('il nutrizionista propone un orario', () => {
  it('serve scrivere quando, e un orario vuoto non passa', () => {
    expect(controllaProposta('').valido).toBe(false);
    expect(controllaProposta('   ').valido).toBe(false);
    expect(controllaProposta('mar').valido).toBe(false);
  });

  it('«martedì 21, alle 18:30» va benissimo', () => {
    expect(controllaProposta('martedì 21, alle 18:30').valido).toBe(true);
  });

  it('e non diventa il posto dove si racconta la visita', () => {
    const lungo = 'a'.repeat(MAX_ORARIO + 1);
    const e = controllaProposta(lungo);
    expect(e.valido).toBe(false);
    expect(e.problemi.join(' ')).toMatch(/solo quando/i);
  });
});

describe('che cosa legge l\'allievo quando l\'orario arriva', () => {
  const r = base({
    stato: 'proposta',
    orarioProposto: 'martedì 21, alle 18:30',
    propostoDa: 'Alessia',
  });

  it('vede chi lo aspetta e quando', () => {
    const s = spiegaStato(r);
    expect(s?.testo).toContain('Alessia');
    expect(s?.testo).toContain('martedì 21, alle 18:30');
  });

  it('e sa che non è ancora definitiva: nessuno si presenta per sbaglio', () => {
    expect(spiegaStato(r)?.testo).toMatch(/conferma/i);
  });

  it('una richiesta con l\'orario proposto è ancora aperta: non se ne fa una seconda', () => {
    expect(richiestaAperta([r])).toBe(r);
    expect(puoChiedere([r])).toBe(false);
  });

  it('e il titolare, nell\'elenco, legge la proposta invece delle fasce', () => {
    expect(rigaPerTitolare(r)).toContain('Alessia propone: martedì 21, alle 18:30');
    expect(rigaPerTitolare(base())).toContain('può sera');
  });
});

// ------------------------------------------------------------
// IL CONTROLLO GENERALE
// ------------------------------------------------------------
// Esisteva, ed esisteva solo a voce: lo sapeva chi per caso era in
// sala quando se ne parlava. Un servizio che nessuno sa che c'è è un
// servizio che non c'è.

describe('il controllo generale ogni quindici giorni', () => {
  it('è ogni quindici giorni, gratuito, in studio, e con Francesco', () => {
    expect(GIORNI_CONTROLLO).toBe(15);
    expect(TESTO_CONTROLLO).toMatch(/quindici giorni/i);
    expect(TESTO_CONTROLLO).toMatch(/gratuito/i);
    expect(TESTO_CONTROLLO).toMatch(/studio/i);
    expect(TESTO_CONTROLLO).toMatch(/Francesco/);
  });

  it('non si prenota: è una cosa che c\'è, non una da chiedere', () => {
    expect(TESTO_CONTROLLO).toMatch(/non devi prenotarlo/i);
  });

  it('il prossimo cade di quindici in quindici dal primo', () => {
    const primo = new Date('2026-10-01T18:00:00');
    expect(prossimoControllo(primo, new Date('2026-10-02T10:00:00')))
      .toEqual(new Date('2026-10-16T18:00:00'));
    expect(prossimoControllo(primo, new Date('2026-10-20T10:00:00')))
      .toEqual(new Date('2026-10-31T18:00:00'));
  });

  it('e se la data di partenza non c\'è non si inventa un giorno', () => {
    expect(prossimoControllo(null)).toBeNull();
    expect(prossimoControllo(new Date('non è una data'))).toBeNull();
  });
});
