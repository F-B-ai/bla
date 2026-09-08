import { dataDelTask, dataScelta, daCampoGiorno } from '../task';

// ============================================================
// «Volevo segnare un task per giovedì e me l'ha segnato oggi»
// ------------------------------------------------------------
// Questi test descrivono quel difetto e lo tengono chiuso.
// ============================================================

const ADESSO = new Date(2026, 8, 2, 3, 15, 0); // 2 settembre 2026, notte

describe('il giorno scelto è il giorno scritto', () => {
  it('«giovedì» resta giovedì, non diventa oggi', () => {
    const d = dataDelTask('2026-09-03', ADESSO);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(8);
    expect(d.getDate()).toBe(3);
    expect(d.getDay()).toBe(4); // giovedì
  });

  it('una data già costruita passa intatta', () => {
    const scelto = new Date(2026, 11, 24, 9, 30);
    expect(dataDelTask(scelto, ADESSO)).toBe(scelto);
  });

  it('un giorno futuro lontano resta dov\'è', () => {
    const d = dataDelTask('2027-01-07', ADESSO);
    expect(d.getFullYear()).toBe(2027);
    expect(d.getMonth()).toBe(0);
    expect(d.getDate()).toBe(7);
  });

  it('anche un giorno passato resta dov\'è: non lo si sposta in avanti', () => {
    const d = dataDelTask('2026-08-20', ADESSO);
    expect(d.getDate()).toBe(20);
    expect(d.getMonth()).toBe(7);
  });
});

describe('il fuso orario non ruba un giorno', () => {
  // L'insidia: new Date('2026-09-03') è mezzanotte UTC. A ovest di
  // Greenwich diventa il 2 settembre, e il task compare il giorno
  // prima. Costruendolo dai pezzi, a mezzogiorno locale, nessun
  // fuso del pianeta può spostarlo.
  it('il giorno viene fissato a mezzogiorno locale', () => {
    const d = daCampoGiorno('2026-09-03')!;
    expect(d.getHours()).toBe(12);
  });

  it('mezzogiorno tiene con dodici ore di scarto in entrambe le direzioni', () => {
    const d = daCampoGiorno('2026-09-03')!;
    const indietro = new Date(d.getTime() - 11 * 3600 * 1000);
    const avanti = new Date(d.getTime() + 11 * 3600 * 1000);
    expect(indietro.getDate()).toBe(3);
    expect(avanti.getDate()).toBe(3);
  });
});

describe('quando non c\'è una scelta, si scrive adesso', () => {
  it('niente scelto: il task nasce oggi, come è giusto', () => {
    expect(dataDelTask(undefined, ADESSO)).toBe(ADESSO);
    expect(dataDelTask(null, ADESSO)).toBe(ADESSO);
    expect(dataDelTask('', ADESSO)).toBe(ADESSO);
  });
});

describe('una data illeggibile non entra mai nel database', () => {
  // Un Invalid Date salvato renderebbe il task invisibile in
  // qualunque agenda: sparirebbe senza un messaggio d'errore.
  it('una stringa senza senso ripiega su adesso', () => {
    expect(dataDelTask('giovedì prossimo', ADESSO)).toBe(ADESSO);
    expect(dataDelTask('boh', ADESSO)).toBe(ADESSO);
  });

  it('una Date non valida ripiega su adesso', () => {
    expect(dataDelTask(new Date('cosa'), ADESSO)).toBe(ADESSO);
  });

  it('un giorno che non esiste sul calendario non viene inventato', () => {
    // Senza controllo, il 31 febbraio scivolerebbe al 3 marzo.
    expect(daCampoGiorno('2026-02-31')).toBeNull();
    expect(daCampoGiorno('2026-13-01')).toBeNull();
    expect(daCampoGiorno('2026-09-00')).toBeNull();
    expect(dataDelTask('2026-02-31', ADESSO)).toBe(ADESSO);
  });

  it('il 29 febbraio esiste negli anni bisestili, e va accettato', () => {
    expect(daCampoGiorno('2028-02-29')?.getDate()).toBe(29);
    expect(daCampoGiorno('2027-02-29')).toBeNull();
  });
});

describe('modificare un task non ne sposta la data per sbaglio', () => {
  // In una MODIFICA il ripiego su «adesso» sarebbe il difetto
  // stesso: meglio non toccare la data che riportarla a oggi.
  it('un giorno leggibile viene applicato', () => {
    expect(dataScelta('2026-09-03')?.getDate()).toBe(3);
  });

  it('un giorno illeggibile dà null: chi aggiorna lascia la data com\'è', () => {
    expect(dataScelta('giovedì')).toBeNull();
    expect(dataScelta('2026-02-31')).toBeNull();
    expect(dataScelta(new Date('cosa'))).toBeNull();
    expect(dataScelta(undefined)).toBeNull();
  });
});

describe('forme accettate dal campo giorno', () => {
  it('la forma del campo data del browser è quella giusta', () => {
    expect(daCampoGiorno('2026-09-03')).not.toBeNull();
  });

  it('gli spazi attorno non fanno danno', () => {
    expect(daCampoGiorno('  2026-09-03 ')?.getDate()).toBe(3);
  });

  it('le forme abbreviate non passano: meglio ripiegare che indovinare', () => {
    expect(daCampoGiorno('2026-9-3')).toBeNull();
    expect(daCampoGiorno('03/09/2026')).toBeNull();
  });
});
