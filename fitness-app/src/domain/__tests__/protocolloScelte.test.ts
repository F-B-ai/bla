import fs from 'fs';
import path from 'path';
import {
  controllaMotivo, aggiungiPriorita, prioritaFinali, quanteScelte,
  righeScelte, riepilogaScelte, marcaOrigine, SCELTE_VUOTE,
  ETICHETTA_RIFERITA, MOTIVO_MINIMO, PROTOCOLLO_SCELTE_VERSION,
  Scelte, PrioritaScelta,
} from '../protocolloScelte';
import { Priorita, documentoCliente } from '../protocollo';

// ============================================================
// «VOGLIO AGGIUNGERE IO O MODIFICARE QUALCOSA»
// ------------------------------------------------------------
// Fino al 18 settembre 2026 il protocollo lo decideva il codice:
// le soglie accendevano le priorità, l'ordine era quello delle
// regole, e chi aveva davanti la persona poteva solo stampare.
//
// Questi test difendono due cose insieme, che tirano in direzioni
// opposte e devono stare tutte e due in piedi:
//  · lui decide, sopra il referto;
//  · il referto non si contamina — quello che aggiunge lui resta
//    riconoscibile come osservazione, non come misura.
// ============================================================

const misurata = (titolo: string, forza: 'alta' | 'media' = 'alta'): Priorita => ({
  area: 'postura', titolo,
  perche: 'La valutazione posturale ha rilevato 4 distretti da lavorare.',
  comeSiLavora: 'Mobilità dove manca, controllo dove manca, poi il carico.',
  misure: ['Distretti rilevati: 4'],
  forza,
});

describe('il motivo deve essere un motivo', () => {
  it('poche parole vere bastano', () => {
    expect(controllaMotivo('lavora in piedi otto ore').ok).toBe(true);
  });

  // Il campo che si compila per toglierselo di torno non serve a
  // nessuno, men che meno a lui fra sei mesi.
  it('un trattino no', () => {
    const e = controllaMotivo('-');
    expect(e.ok).toBe(false);
    expect(e.problema).toContain('a parole');
  });

  it('vuoto no, e dice a chi serve', () => {
    const e = controllaMotivo('   ');
    expect(e.ok).toBe(false);
    expect(e.problema).toContain('fra sei mesi');
  });

  it('due lettere no, e suggerisce come si scrive', () => {
    const e = controllaMotivo('ok');
    expect(e.ok).toBe(false);
    expect(e.problema).toContain('lavora in piedi');
  });

  it('la soglia è dichiarata', () => {
    expect(MOTIVO_MINIMO).toBe(8);
  });
});

describe('la priorità che aggiunge lui', () => {
  const buona = {
    titolo: 'Spalla destra al lavoro',
    area: 'movimento' as const,
    comeSiLavora: 'Mobilità scapolare e pause attive durante il turno.',
    motivo: 'Fa la cassiera, otto ore in piedi, dolore riferito a fine turno.',
  };

  it('entra nel protocollo', () => {
    const e = aggiungiPriorita(buona);
    expect(e.ok).toBe(true);
    expect(e.priorita!.titolo).toBe('Spalla destra al lavoro');
  });

  // LA REGOLA CHE NON SI ROMPE.
  it('nasce SEMPRE riferita, non misurata', () => {
    expect(aggiungiPriorita(buona).priorita!.origine).toBe('riferita');
  });

  // Non esiste un parametro che la faccia passare per misurata.
  it('non c\'è modo di farla passare per una misura', () => {
    const e = aggiungiPriorita({ ...buona, origine: 'misurata' } as any);
    expect(e.priorita!.origine).toBe('riferita');
  });

  it('e non porta misure finte', () => {
    expect(aggiungiPriorita(buona).priorita!.misure).toEqual([]);
  });

  it('senza titolo non entra', () => {
    const e = aggiungiPriorita({ ...buona, titolo: 'x' });
    expect(e.ok).toBe(false);
    expect(e.problemi.join(' ')).toContain('titolo');
  });

  // Senza il «come si lavora» l'allievo legge un problema e nessun
  // rimedio: è la parte che poi mette in atto.
  it('senza il come si lavora non entra, e dice perché', () => {
    const e = aggiungiPriorita({ ...buona, comeSiLavora: '' });
    expect(e.ok).toBe(false);
    expect(e.problemi.join(' ')).toContain('l\'allievo legge');
  });

  it('senza il su-che-cosa-la-basi non entra', () => {
    const e = aggiungiPriorita({ ...buona, motivo: '' });
    expect(e.ok).toBe(false);
    expect(e.problemi.join(' ')).toContain('Su che cosa la basi');
  });
});

describe('il protocollo finale: referto più scelte', () => {
  const lette = [misurata('Prima la postura'), misurata('Riequilibrare il passo', 'media')];

  it('senza scelte, è il referto tale e quale', () => {
    const f = prioritaFinali(lette);
    expect(f.map((p) => p.titolo)).toEqual(['Prima la postura', 'Riequilibrare il passo']);
    expect(f.every((p) => p.origine === 'misurata')).toBe(true);
  });

  it('una messa da parte esce', () => {
    const scelte: Scelte = {
      ...SCELTE_VUOTE,
      messeDaParte: [{ titolo: 'Prima la postura', motivo: 'ha due mesi e un obiettivo diverso' }],
    };
    expect(prioritaFinali(lette, scelte).map((p) => p.titolo))
      .toEqual(['Riequilibrare il passo']);
  });

  it('una aggiunta entra, e si vede che è sua', () => {
    const agg = aggiungiPriorita({
      titolo: 'Spalla destra al lavoro', area: 'movimento',
      comeSiLavora: 'Mobilità scapolare e pause attive.',
      motivo: 'dolore riferito a fine turno',
    }).priorita!;
    const f = prioritaFinali(lette, { ...SCELTE_VUOTE, aggiunte: [agg] });
    expect(f).toHaveLength(3);
    expect(f.find((p) => p.titolo === 'Spalla destra al lavoro')!.origine).toBe('riferita');
  });

  it('l\'ordine è quello che decide lui', () => {
    const scelte: Scelte = {
      ...SCELTE_VUOTE,
      ordine: ['Riequilibrare il passo', 'Prima la postura'],
    };
    expect(prioritaFinali(lette, scelte).map((p) => p.titolo))
      .toEqual(['Riequilibrare il passo', 'Prima la postura']);
  });

  // Il difetto che questo impedisce: un ordine scritto a metà che
  // fa sparire quello che non nomina. Una priorità si toglie solo
  // dicendo perché, mai per una dimenticanza.
  it('un ordine incompleto non fa sparire il resto', () => {
    const scelte: Scelte = { ...SCELTE_VUOTE, ordine: ['Riequilibrare il passo'] };
    const f = prioritaFinali(lette, scelte);
    expect(f).toHaveLength(2);
    expect(f[0].titolo).toBe('Riequilibrare il passo');
    expect(f[1].titolo).toBe('Prima la postura');
  });

  it('un ordine che nomina cose inesistenti non rompe niente', () => {
    const scelte: Scelte = { ...SCELTE_VUOTE, ordine: ['Roba che non c\'è'] };
    expect(prioritaFinali(lette, scelte)).toHaveLength(2);
  });

  it('nessuna priorità letta: nessun errore', () => {
    expect(prioritaFinali([], SCELTE_VUOTE)).toEqual([]);
    expect(prioritaFinali([])).toEqual([]);
  });
});

describe('che cosa legge l\'allievo sul foglio', () => {
  const agg: PrioritaScelta = aggiungiPriorita({
    titolo: 'Spalla destra al lavoro', area: 'movimento',
    comeSiLavora: 'Mobilità scapolare e pause attive.',
    motivo: 'fa la cassiera, dolore a fine turno',
  }).priorita!;

  const scelte: Scelte = {
    messeDaParte: [{ titolo: 'Prima la postura', motivo: 'ha due mesi prima di un intervento' }],
    aggiunte: [agg],
    ordine: [],
    nota: 'Andiamo per gradi, senza fretta.',
    motivoPiano: 'due sedute a settimana perché lavora su turni',
  };

  it('l\'aggiunta è dichiarata come osservazione, non come misura', () => {
    const r = righeScelte(scelte).join(' ');
    expect(r).toContain('Spalla destra al lavoro');
    expect(r).toContain(ETICHETTA_RIFERITA);
  });

  // Mettere da parte non vuol dire nascondere: la misura resta, e
  // si dice che si riprende.
  it('la messa da parte dice il perché e che si riprende', () => {
    const r = righeScelte(scelte).join(' ');
    expect(r).toContain('ha due mesi prima di un intervento');
    expect(r).toContain('resta scritta');
    expect(r).toContain('si riprende');
  });

  it('il motivo del piano finisce sul foglio', () => {
    expect(righeScelte(scelte).join(' ')).toContain('lavora su turni');
  });

  // Una sezione «Le scelte del direttore tecnico» vuota, su un
  // documento che si consegna a una persona, è peggio che non averla.
  it('senza scelte non c\'è niente da scrivere', () => {
    expect(righeScelte(SCELTE_VUOTE)).toEqual([]);
    expect(righeScelte()).toEqual([]);
    expect(quanteScelte(SCELTE_VUOTE)).toBe(0);
  });

  it('il cartellino si vede solo sulle riferite', () => {
    expect(marcaOrigine(agg)).toContain(ETICHETTA_RIFERITA);
    expect(marcaOrigine({ ...agg, origine: 'misurata' })).toBe('');
  });
});

describe('che cosa si legge prima di stampare', () => {
  it('senza modifiche lo dice chiaro', () => {
    expect(riepilogaScelte(SCELTE_VUOTE)).toContain('senza tue modifiche');
  });

  it('con modifiche elenca che cosa vedrà la persona', () => {
    const r = riepilogaScelte({
      messeDaParte: [{ titolo: 'x', motivo: 'perché sì e no' }],
      aggiunte: [aggiungiPriorita({
        titolo: 'Spalla', area: 'movimento',
        comeSiLavora: 'mobilità scapolare',
        motivo: 'dolore riferito',
      }).priorita!],
      ordine: [], nota: 'una riga', motivoPiano: 'lavora su turni',
    });
    expect(r).toContain('1 priorità aggiunta');
    expect(r).toContain('1 messa da parte');
    expect(r).toContain('la tua nota');
    expect(r).toContain('il motivo del piano');
    expect(r).toContain('non come misura');
  });
});

describe('versione', () => {
  it('tracciata', () => {
    expect(PROTOCOLLO_SCELTE_VERSION).toBe(1);
  });
});

// ============================================================
// IL FOGLIO CHE SI CONSEGNA
// ------------------------------------------------------------
// Le scelte devono arrivare fino alla carta. Un livello che
// esiste solo dentro l'app e non finisce sul documento è un
// livello che non serve a niente: l'allievo legge la carta.
// ============================================================

describe('il documento del cliente porta le scelte', () => {
  const quadro = {
    valutazioni: [], tracce: [], areeCoperte: 0, areeTotali: 6,
  } as any;
  const piano = {
    righe: [], totaleSedute: 0, totaleSeduteEuro: 0, valutazioneEuro: 150,
    totaleEuro: 150, seduteASettimana: 2, settimane: 0,
  } as any;
  const perimetro = { frase: 'x', motivi: [] } as any;

  const doc = (extra: any = {}) => documentoCliente({
    allievo: 'Rosa Cesarano', data: new Date(2026, 8, 18), quadro,
    priorita: [], perimetro, piano, coach: 'Francesco', ...extra,
  });

  it('senza scelte, il documento è quello di prima', () => {
    const titoli = doc().map((s) => s.titolo);
    expect(titoli).not.toContain('Le scelte del direttore tecnico');
    expect(titoli).not.toContain('Una nota per te');
  });

  it('con le scelte, c\'è una sezione che le raccoglie', () => {
    const sez = doc({ scelteRighe: ['Aggiunta: Spalla destra al lavoro'] })
      .find((s) => s.titolo === 'Le scelte del direttore tecnico')!;
    expect(sez).toBeDefined();
    expect(sez.elenco).toContain('Aggiunta: Spalla destra al lavoro');
    // Dice che questa parte NON esce dalle misure.
    expect(sez.testo).toContain('deciso io');
  });

  it('la nota del coach ha il suo posto', () => {
    const sez = doc({ nota: 'Andiamo per gradi.' })
      .find((s) => s.titolo === 'Una nota per te')!;
    expect(sez.testo).toBe('Andiamo per gradi.');
  });

  it('una nota di soli spazi non apre una sezione vuota', () => {
    expect(doc({ nota: '   ' }).map((s) => s.titolo)).not.toContain('Una nota per te');
  });

  // Con due sezioni che ci sono solo a volte, i numeri scritti a
  // mano prima o poi consegnano un foglio che salta dal 3 al 5.
  it('i numeri delle sezioni restano consecutivi, sempre', () => {
    const controlla = (sezioni: { n: number }[]) =>
      expect(sezioni.map((s) => s.n)).toEqual(sezioni.map((_, i) => i + 1));
    controlla(doc());
    controlla(doc({ nota: 'una riga' }));
    controlla(doc({ scelteRighe: ['una riga'] }));
    controlla(doc({ scelteRighe: ['una riga'], nota: 'un\'altra' }));
  });

  it('una priorità riferita si riconosce anche sulla carta', () => {
    const p = aggiungiPriorita({
      titolo: 'Spalla destra al lavoro', area: 'movimento',
      comeSiLavora: 'mobilità scapolare e pause attive',
      motivo: 'dolore riferito a fine turno',
    }).priorita!;
    const sez = doc({ priorita: [p] })
      .find((s) => s.titolo === 'Che cosa dicono, messe insieme')!;
    expect(sez.elenco!.join(' ')).toContain('riferita, non misurata');
  });

  it('e una misurata non porta nessun cartellino', () => {
    const sez = doc({ priorita: [{ ...misurata('Prima la postura'), origine: 'misurata' }] })
      .find((s) => s.titolo === 'Che cosa dicono, messe insieme')!;
    expect(sez.elenco!.join(' ')).not.toContain('riferita');
  });
});

// ============================================================
// LA SCHERMATA AGGANCIA DAVVERO LE SCELTE
// ------------------------------------------------------------
// Un livello che esiste nel dominio e non arriva allo schermo è un
// livello che non serve a niente. Lo stesso difetto del patto: la
// schermata diceva «allegala al profilo» e il punto di aggancio
// non c'era.
// ============================================================

describe('la schermata Protocollo', () => {
  const schermata = fs.readFileSync(
    path.join(__dirname, '..', '..', 'screens', 'staff', 'ProtocolloScreen.tsx'),
    'utf8'
  );

  it('mostra le priorità FINALI, non il referto grezzo', () => {
    expect(schermata).toContain('prioritaFinali(priorita, scelte)');
    expect(schermata).toContain('finali.map(');
  });

  it('si possono mettere da parte, rimettere, spostare e aggiungere', () => {
    ['mettiDaParte', 'rimetti', 'sposta', 'aggiungi'].forEach((f) => {
      expect(schermata).toContain(`const ${f}`);
    });
  });

  it('le scelte arrivano fino al foglio stampato', () => {
    expect(schermata).toContain('scelteRighe: righeScelte(scelte)');
    expect(schermata).toContain('nota: scelte.nota');
    expect(schermata).toContain('priorita: finali');
  });

  it('il protocollo si archivia, con chi l\'ha scritto', () => {
    expect(schermata).toContain('salvaProtocollo');
    expect(schermata).toContain('autoreNome');
    expect(schermata).toContain('leggiProtocolli');
  });

  // Il difetto ricorrente: un catch che trasforma un guasto in
  // «non c'è niente».
  it('se l\'archivio non si legge lo dice, invece di mostrarlo vuoto', () => {
    expect(schermata).toContain('erroreArchivio');
    expect(schermata).toContain('Non vuol dire che non ce ne siano');
  });

  // Cambiare allievo e ritrovarsi addosso le scelte del precedente
  // sarebbe il modo più veloce di consegnare a una persona il
  // protocollo di un'altra.
  it('cambiando allievo le scelte si azzerano', () => {
    expect(schermata).toMatch(/setScelte\(SCELTE_VUOTE\)[\s\S]{0,200}\[studentId\]/);
  });

  it('il cartellino «riferita» si vede anche a schermo', () => {
    expect(schermata).toContain('ETICHETTA_RIFERITA');
  });
});
