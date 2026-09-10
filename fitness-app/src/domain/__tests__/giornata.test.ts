import {
  componiGiornata, ordinaGiornata, riepilogoGiornata, VoceGiornata,
} from '../giornata';

// ============================================================
// «AL COLPO D'OCCHIO NON RIESCO AD AVERE LA VISIONE DELLA GIORNATA»
// ------------------------------------------------------------
// La giornata era spezzata in blocchi: appuntamenti in una sezione,
// ospiti appiccicati in coda invece che al loro orario, task in una
// sezione tutta loro. Per sapere che cosa succede alle 15:00
// bisognava guardare in tre posti. Qui è una sequenza sola.
// ============================================================

describe('la giornata è una sequenza, non tre elenchi', () => {
  // Il test che riassume la richiesta: allenamento, consulenza,
  // task e ospite escono in ordine di orologio, mescolati.
  it('appuntamenti, ospiti e task si mescolano in ordine di orario', () => {
    const g = componiGiornata({
      appuntamenti: [
        { id: 'a1', kind: 'training', startTime: '10:00', nomeAllievo: 'Marco' },
        { id: 'a2', kind: 'consulenza', startTime: '16:00', nomeAllievo: 'Lucia' },
      ],
      ospiti: [{ id: 'o1', persona: 'Pasqualone', ora: '11:00' }],
      task: [{ id: 't1', title: 'Chiamare il commercialista', startTime: '15:00' }],
    });
    expect(g.map((v) => v.id)).toEqual(['a1', 'o1', 't1', 'a2']);
    expect(g.map((v) => v.ora)).toEqual(['10:00', '11:00', '15:00', '16:00']);
  });

  it('l\'ospite non finisce più in coda: sta al suo orario', () => {
    const g = componiGiornata({
      appuntamenti: [{ id: 'a1', kind: 'training', startTime: '18:00', nomeAllievo: 'Marco' }],
      ospiti: [{ id: 'o1', persona: 'Anna', ora: '09:00' }],
    });
    expect(g[0].id).toBe('o1');
  });

  it('un elenco vuoto o assente non rompe niente', () => {
    expect(componiGiornata({})).toEqual([]);
    expect(componiGiornata({ appuntamenti: [], ospiti: [], task: [] })).toEqual([]);
  });
});

describe('i task senza orario', () => {
  // «Da fare oggi, quando capita» non compete con le 10:00: se
  // finisse in cima nasconderebbe le cose che hanno un'ora.
  it('vanno in fondo, dopo tutto ciò che ha un orario', () => {
    const g = componiGiornata({
      appuntamenti: [{ id: 'a1', kind: 'training', startTime: '19:00', nomeAllievo: 'Marco' }],
      task: [
        { id: 't-libero', title: 'Ordinare i tappetini' },
        { id: 't-ora', title: 'Riunione', startTime: '08:00' },
      ],
    });
    expect(g.map((v) => v.id)).toEqual(['t-ora', 'a1', 't-libero']);
  });

  it('e lo dicono, invece di mostrare un orario vuoto', () => {
    const g = componiGiornata({ task: [{ id: 't1', title: 'Ordinare i tappetini' }] });
    expect(g[0].ora).toBe('');
    expect(g[0].sottotitolo).toContain('quando capita');
  });

  it('un orario scritto male vale come «senza orario», non rompe l\'ordine', () => {
    const g = componiGiornata({
      appuntamenti: [{ id: 'a1', kind: 'training', startTime: '10:00', nomeAllievo: 'M' }],
      task: [{ id: 't1', title: 'X', startTime: '25:99' }],
    });
    expect(g.map((v) => v.id)).toEqual(['a1', 't1']);
    expect(g[1].ora).toBe('');
  });
});

describe('a parità di orario', () => {
  // Alle 11:00 con una seduta e un promemoria, la seduta è quella
  // che non si sposta: viene prima.
  it('prima l\'impegno con una persona davanti, poi il task', () => {
    const g = componiGiornata({
      appuntamenti: [{ id: 'a1', kind: 'training', startTime: '11:00', nomeAllievo: 'Marco' }],
      ospiti: [{ id: 'o1', persona: 'Anna', ora: '11:00' }],
      task: [{ id: 't1', title: 'Promemoria', startTime: '11:00' }],
    });
    expect(g.map((v) => v.genere)).toEqual(['appuntamento', 'ospite', 'task']);
  });

  it('l\'ordinamento è stabile: a parità di tutto non si rimescola', () => {
    const voci: VoceGiornata[] = [
      { id: 'x', genere: 'task', ora: '', titolo: 'X', sottotitolo: '', fonte: null },
      { id: 'y', genere: 'task', ora: '', titolo: 'Y', sottotitolo: '', fonte: null },
      { id: 'z', genere: 'task', ora: '', titolo: 'Z', sottotitolo: '', fonte: null },
    ];
    expect(ordinaGiornata(voci).map((v) => v.id)).toEqual(['x', 'y', 'z']);
  });
});

describe('che cosa si legge su ogni riga', () => {
  it('l\'appuntamento porta il tipo e l\'orario, non solo il nome', () => {
    const g = componiGiornata({
      appuntamenti: [{
        id: 'a1', kind: 'consulenza', startTime: '10:00', endTime: '11:00',
        nomeAllievo: 'Lucia',
      }],
    });
    expect(g[0].titolo).toBe('Lucia');
    expect(g[0].sottotitolo).toContain('Consulenza');
    expect(g[0].sottotitolo).toContain('10:00–11:00');
  });

  it('il gruppo si riconosce dalla riga', () => {
    const g = componiGiornata({
      appuntamenti: [{ id: 'a1', kind: 'gruppo', startTime: '10:00', nomeAllievo: 'Marco' }],
    });
    expect(g[0].sottotitolo).toContain('Gruppo');
  });

  it('l\'ospite si distingue: non è ancora un allievo', () => {
    const g = componiGiornata({ ospiti: [{ id: 'o1', persona: 'Anna', ora: '09:00' }] });
    expect(g[0].sottotitolo).toContain('Ospite');
    expect(g[0].genere).toBe('ospite');
  });

  it('un task fatto resta visibile e si sa che è fatto', () => {
    const g = componiGiornata({
      task: [{ id: 't1', title: 'Fatto', startTime: '09:00', isCompleted: true }],
    });
    expect(g[0].completato).toBe(true);
  });
});

describe('il riepilogo in una riga', () => {
  it('conta le persone e i task aperti, non quelli già fatti', () => {
    const r = riepilogoGiornata(componiGiornata({
      appuntamenti: [{ id: 'a1', kind: 'training', startTime: '10:00', nomeAllievo: 'M' }],
      ospiti: [{ id: 'o1', persona: 'Anna', ora: '11:00' }],
      task: [
        { id: 't1', title: 'Aperto', startTime: '12:00' },
        { id: 't2', title: 'Fatto', startTime: '13:00', isCompleted: true },
      ],
    }));
    expect(r.frase).toBe('2 appuntamenti · 1 task');
    expect(r.taskAperti).toBe(1);
    expect(r.taskFatti).toBe(1);
  });

  it('il singolare non diventa «1 appuntamenti»', () => {
    const r = riepilogoGiornata(componiGiornata({
      appuntamenti: [{ id: 'a1', kind: 'training', startTime: '10:00', nomeAllievo: 'M' }],
    }));
    expect(r.frase).toBe('1 appuntamento');
  });

  it('una giornata vuota lo dice, invece di mostrare degli zeri', () => {
    expect(riepilogoGiornata([]).frase).toBe('Giornata libera');
  });

  it('la prossima cosa è la prima che ha un orario', () => {
    const r = riepilogoGiornata(componiGiornata({
      task: [{ id: 't-libero', title: 'Quando capita' }],
      appuntamenti: [{ id: 'a1', kind: 'training', startTime: '10:00', nomeAllievo: 'M' }],
    }));
    expect(r.prossima?.id).toBe('a1');
  });

  it('se nulla ha un orario, non si inventa una prossima cosa', () => {
    const r = riepilogoGiornata(componiGiornata({ task: [{ id: 't1', title: 'X' }] }));
    expect(r.prossima).toBeUndefined();
  });
});

describe('la durata, per chi disegna la giornata a blocchi', () => {
  it('l\'appuntamento porta anche l\'ora di fine', () => {
    const g = componiGiornata({
      appuntamenti: [{
        id: 'a1', kind: 'training', startTime: '10:00', endTime: '11:00',
        nomeAllievo: 'Marco',
      }],
    });
    expect(g[0].oraFine).toBe('11:00');
  });

  it('ospiti e task non hanno una fine dichiarata, e non se la inventano', () => {
    const g = componiGiornata({
      ospiti: [{ id: 'o1', persona: 'Anna', ora: '09:00' }],
      task: [{ id: 't1', title: 'X', startTime: '12:00' }],
    });
    expect(g[0].oraFine).toBe('');
    expect(g[1].oraFine).toBe('');
  });

  it('una fine scritta male non passa', () => {
    const g = componiGiornata({
      appuntamenti: [{
        id: 'a1', kind: 'training', startTime: '10:00', endTime: '99:99',
        nomeAllievo: 'M',
      }],
    });
    expect(g[0].oraFine).toBe('');
  });
});
