import fs from 'fs';
import path from 'path';
import {
  confronta, raccontaDifferenza, riassumiDifferenza,
  ProtocolloDaConfrontare, CONFRONTO_VERSION,
} from '../confrontoProtocolli';
import { PrioritaScelta, SCELTE_VUOTE } from '../protocolloScelte';

// ============================================================
// SETTEMBRE ACCANTO A GENNAIO
// ------------------------------------------------------------
// L'archivio da solo è una pila di fogli. Il valore sta nella
// differenza fra due protocolli: quella differenza è il percorso
// della persona.
//
// Il difetto che questi test impediscono è uno solo, e sarebbe
// grave in tutte e due le direzioni: confondere una priorità che
// le misure non accendono più con una che il direttore tecnico ha
// messo da parte. Farebbe passare per miglioramento una scelta di
// lavoro, o per scelta un miglioramento vero.
// ============================================================

const p = (titolo: string, origine: 'misurata' | 'riferita' = 'misurata'): PrioritaScelta => ({
  area: 'postura', titolo,
  perche: 'perché sì', comeSiLavora: 'così', misure: [], forza: 'alta',
  origine,
});

const settembre = new Date(2026, 8, 18);
const gennaio = new Date(2027, 0, 18);

const proto = (
  data: Date, priorita: PrioritaScelta[], extra: Partial<ProtocolloDaConfrontare> = {}
): ProtocolloDaConfrontare => ({
  data, priorita, scelte: SCELTE_VUOTE,
  piano: { totaleSedute: 8, settimane: 4, totaleEuro: 470, seduteASettimana: 2 },
  ...extra,
});

describe('che cosa è cambiato', () => {
  it('quello che resta aperto si riconosce', () => {
    const d = confronta(
      proto(settembre, [p('Prima la postura'), p('Riequilibrare il passo')]),
      proto(gennaio, [p('Prima la postura')])
    );
    expect(d.rimaste).toEqual(['Prima la postura']);
  });

  it('quello che entra si riconosce', () => {
    const d = confronta(
      proto(settembre, [p('Prima la postura')]),
      proto(gennaio, [p('Prima la postura'), p('Spinta')])
    );
    expect(d.entrate.map((x) => x.titolo)).toEqual(['Spinta']);
  });

  it('conta i mesi passati', () => {
    const d = confronta(proto(settembre, []), proto(gennaio, []));
    expect(d.giorni).toBe(122);
  });

  // Se arrivano al contrario, il confronto direbbe il rovescio
  // della verità: entrate al posto di uscite.
  it('due protocolli passati al contrario dicono comunque il vero', () => {
    const prima = proto(settembre, [p('Prima la postura')]);
    const dopo = proto(gennaio, [p('Spinta')]);
    const dritto = confronta(prima, dopo);
    const rovescio = confronta(dopo, prima);
    expect(rovescio.entrate.map((x) => x.titolo)).toEqual(dritto.entrate.map((x) => x.titolo));
    expect(rovescio.uscite.map((x) => x.titolo)).toEqual(dritto.uscite.map((x) => x.titolo));
  });
});

describe('LA DISTINZIONE: chi l\'ha tolta, la misura o lui', () => {
  const prima = proto(settembre, [p('Prima la postura'), p('Riequilibrare il passo')]);

  it('una che le misure non accendono più è un fatto', () => {
    const d = confronta(prima, proto(gennaio, [p('Riequilibrare il passo')]));
    expect(d.uscite).toEqual([
      { titolo: 'Prima la postura', motivoUscita: 'non_si_accende_piu' },
    ]);
  });

  it('una messa da parte da lui porta il suo motivo', () => {
    const d = confronta(prima, proto(gennaio, [p('Riequilibrare il passo')], {
      scelte: {
        ...SCELTE_VUOTE,
        messeDaParte: [{ titolo: 'Prima la postura', motivo: 'ha un intervento a febbraio' }],
      },
    }));
    expect(d.uscite[0].motivoUscita).toBe('messa_da_parte');
    expect(d.uscite[0].motivo).toBe('ha un intervento a febbraio');
  });

  // Il cuore della cosa, in una riga.
  it('le due uscite non si confondono mai', () => {
    const d = confronta(prima, proto(gennaio, [], {
      scelte: {
        ...SCELTE_VUOTE,
        messeDaParte: [{ titolo: 'Prima la postura', motivo: 'ha un intervento a febbraio' }],
      },
    }));
    const tipi = Object.fromEntries(d.uscite.map((u) => [u.titolo, u.motivoUscita]));
    expect(tipi['Prima la postura']).toBe('messa_da_parte');
    expect(tipi['Riequilibrare il passo']).toBe('non_si_accende_piu');
  });
});

describe('il confronto a parole', () => {
  it('dice quanto tempo è passato', () => {
    const r = raccontaDifferenza(confronta(proto(settembre, []), proto(gennaio, [])));
    expect(r[0]).toContain('4 mesi');
  });

  // «Migliorato» lo dice chi guarda la persona, non il software.
  it('non dice mai che la persona è migliorata', () => {
    const r = raccontaDifferenza(confronta(
      proto(settembre, [p('Prima la postura')]),
      proto(gennaio, [])
    )).join(' ');
    expect(r).toContain('non compare più fra le priorità');
    expect(r.toLowerCase()).not.toContain('miglior');
    expect(r.toLowerCase()).not.toContain('risolt');
    expect(r.toLowerCase()).not.toContain('guarit');
  });

  it('una messa da parte si legge come una tua decisione', () => {
    const r = raccontaDifferenza(confronta(
      proto(settembre, [p('Prima la postura')]),
      proto(gennaio, [], {
        scelte: {
          ...SCELTE_VUOTE,
          messeDaParte: [{ titolo: 'Prima la postura', motivo: 'ha un intervento a febbraio' }],
        },
      })
    )).join(' ');
    expect(r).toContain('l\'hai messa da parte');
    expect(r).toContain('ha un intervento a febbraio');
  });

  it('una entrata aggiunta da lui si distingue da una accesa dalle misure', () => {
    const r = raccontaDifferenza(confronta(
      proto(settembre, []),
      proto(gennaio, [p('Spalla al lavoro', 'riferita'), p('Spinta')])
    )).join(' ');
    expect(r).toContain('«Spalla al lavoro» è entrata: l\'hai aggiunta tu');
    expect(r).toContain('«Spinta» è entrata: l\'hanno accesa le misure nuove');
  });

  it('il cambio di sedute si vede', () => {
    const r = raccontaDifferenza(confronta(
      proto(settembre, []),
      proto(gennaio, [], { piano: { totaleSedute: 12, settimane: 6, totaleEuro: 600 } })
    )).join(' ');
    expect(r).toContain('da 8 a 12');
  });

  // Il caso che si dimentica sempre: quando non è cambiato niente,
  // una lista vuota sembra un guasto.
  it('se non è cambiato niente lo dice, invece di restare muto', () => {
    const r = raccontaDifferenza(confronta(
      proto(settembre, [p('Prima la postura')]),
      proto(gennaio, [p('Prima la postura')])
    ));
    expect(r.join(' ')).toContain('non è cambiato');
  });
});

describe('la riga corta per la lista', () => {
  it('distingue le due uscite anche in una riga sola', () => {
    const r = riassumiDifferenza(confronta(
      proto(settembre, [p('A'), p('B')]),
      proto(gennaio, [p('C')], {
        scelte: { ...SCELTE_VUOTE, messeDaParte: [{ titolo: 'A', motivo: 'un motivo vero' }] },
      })
    ));
    expect(r).toContain('1 in più');
    expect(r).toContain('1 non si accende più');
    expect(r).toContain('1 da parte');
  });

  it('e dice anche quando non cambia niente', () => {
    expect(riassumiDifferenza(confronta(
      proto(settembre, [p('A')]), proto(gennaio, [p('A')])
    ))).toContain('Nessun cambiamento');
  });
});

describe('quando manca qualcosa', () => {
  it('senza piano non inventa numeri', () => {
    const d = confronta(
      { data: settembre, priorita: [], piano: null },
      { data: gennaio, priorita: [] }
    );
    expect(d.sedutePrima).toBe(0);
    expect(d.seduteDopo).toBe(0);
    expect(raccontaDifferenza(d).join(' ')).not.toContain('da 0 a 0');
  });

  it('una data storta non produce un numero assurdo', () => {
    const d = confronta(
      { data: new Date('boh'), priorita: [] },
      { data: gennaio, priorita: [] }
    );
    expect(d.giorni).toBe(0);
  });
});

describe('versione', () => {
  it('tracciata', () => {
    expect(CONFRONTO_VERSION).toBe(1);
  });
});

// ============================================================
// LA SCHERMATA APRE DAVVERO L'ARCHIVIO
// ------------------------------------------------------------
// Un confronto che esiste solo nel dominio non serve a niente:
// quello che conta è che lui lo veda toccando una riga.
// ============================================================

describe('la schermata Protocollo mostra il confronto', () => {
  const schermata = fs.readFileSync(
    path.join(__dirname, '..', '..', 'screens', 'staff', 'ProtocolloScreen.tsx'),
    'utf8'
  );

  it('un protocollo archiviato si apre per intero', () => {
    expect(schermata).toContain('setAperto');
    expect(schermata).toContain('righeScelte(x.scelte)');
  });

  it('e si confronta con il precedente', () => {
    expect(schermata).toContain('confronta(precedente, x)');
    expect(schermata).toContain('raccontaDifferenza');
    expect(schermata).toContain('riassumiDifferenza');
  });

  // L'archivio arriva dal più recente: il precedente è quello DOPO
  // nella lista. Invertirlo direbbe il rovescio della verità.
  it('il precedente è quello dopo nella lista, non quello prima', () => {
    expect(schermata).toContain('archivio[i + 1]');
  });

  it('col primo protocollo non finge un confronto', () => {
    expect(schermata).toContain('È il primo protocollo di questa persona');
  });
});
