import fs from 'fs';
import path from 'path';
import {
  componiCarta, rilieviCondivisibili, dicitureCarta, controllaCarta,
  riepilogaCarta, fuoriDallaCarta, CAMPI_SENSIBILI, CAMPI_INTERNI,
  VALIDO_GIORNI, RIGHE_VUOTE, CARTA_VERSION,
} from '../cartaIntestata';
import { valutaOnboarding, Risposte } from '../onboarding';
import { PERIMETRO } from '../perimetro';

// ============================================================
// LA CARTA CHE ESCE DALLO STUDIO
// ------------------------------------------------------------
// Il titolare, il 19 settembre 2026: «poche cose che possono
// interessare all'allievo, innanzitutto l'obiettivo, e alcune
// cose che abbiamo rilevato — ma NON tutte: ci sono cose che
// rimangono per noi».
//
// Questo foglio è diverso da tutti gli altri perché ESCE: finisce
// in una borsa, su un tavolo di cucina, in mano a un marito, o a
// un altro studio se la persona decide di non venire.
//
// Questi test difendono una cosa sola: che cosa non deve uscire.
// ============================================================

const PIENA: Risposte = {
  nome: 'Rosa', cognome: 'Cesarano',
  professione: 'Cassiera',
  provenienza: 'Me ne ha parlato mia cugina Antonietta al mercato',
  obiettivi: ['Ricomposizione corporea'],
  obiettivo_principale: 'Tornare a salire le scale senza fermarmi a metà',
  orizzonte: 'Entro 6 mesi',
  anni_attivita: 3,
  frequenza: 2,
  sport: 'Pallavolo da ragazza',
  infortuni: ['Sì — ernia lombare L4-L5'],
  infortuni_note: 'Ernia discale operata nel 2019, sciatalgia ricorrente a destra',
  terapie: 'Sì — specifica sotto',
  terapie_note: 'Antinfiammatori al bisogno, cortisone in fase acuta',
  sonno_qualita: 'Pessima',
  sonno_ore: '5-6',
  stress: 9,
  alimentazione: 'Irregolare',
  nutrizione_interesse: 'Sì',
  blocchi: 'Mi vergogno del mio corpo quando entro in palestra',
  perche_noi: 'Perche gli altri studi mi hanno delusa',
};

const esitoDi = (r: Risposte) => valutaOnboarding(r);

const cartaDi = (r: Risposte = PIENA, extra: any = {}) => componiCarta({
  allievo: 'Rosa Cesarano', risposte: r, esito: esitoDi(r),
  data: new Date(2026, 8, 19), ...extra,
});

// ============================================================
// QUELLO CHE NON ESCE
// ============================================================

describe('il dettaglio clinico non esce mai', () => {
  const carta = cartaDi();
  const tutto = JSON.stringify(carta).toLowerCase();

  it('la nota sugli infortuni resta nella scheda', () => {
    expect(tutto).not.toContain('ernia discale');
    expect(tutto).not.toContain('sciatalgia');
    expect(tutto).not.toContain('l4-l5');
  });

  it('e così le terapie e i farmaci', () => {
    expect(tutto).not.toContain('antinfiammatori');
    expect(tutto).not.toContain('cortisone');
  });

  // La lista si legge dal modulo, non da una copia scritta a mano:
  // una seconda lista diverge, e a divergere sarebbe quella che
  // protegge i dati di salute.
  it('la lista dei campi sensibili viene dalla scheda, non da qui', () => {
    expect(CAMPI_SENSIBILI).toContain('infortuni_note');
    expect(CAMPI_SENSIBILI).toContain('terapie_note');
    expect(CAMPI_SENSIBILI.length).toBeGreaterThan(2);
  });
});

describe('i giudizi sulla persona non escono', () => {
  const tutto = JSON.stringify(cartaDi()).toLowerCase();

  // Veri, utili a noi, e umilianti su un foglio consegnato con un
  // preventivo.
  it('niente punteggio di stress', () => {
    expect(tutto).not.toContain('stress');
    expect(tutto).not.toContain('9 su 10');
  });

  it('niente «sonno di pessima qualità»', () => {
    expect(tutto).not.toContain('pessima');
  });

  it('niente blocchi emotivi confidati al colloquio', () => {
    expect(tutto).not.toContain('vergogn');
  });

  it('e nemmeno perché ha lasciato gli altri studi', () => {
    expect(tutto).not.toContain('delusa');
    expect(fuoriDallaCarta('perche_noi')).toBe(true);
    expect(CAMPI_INTERNI).toContain('stress');
  });
});

// ============================================================
// LA REGOLA DEL LIMITE: CHE C'È, MAI QUALE
// ============================================================

describe('quando c\'è una condizione da rispettare', () => {
  const rilievi = rilieviCondivisibili(PIENA, esitoDi(PIENA)).join(' ');

  it('il foglio dice che c\'è', () => {
    expect(rilievi).toContain('condizione fisica da rispettare');
    expect(rilievi).toContain('tiene conto');
  });

  it('ma non dice quale', () => {
    expect(rilievi.toLowerCase()).not.toContain('ernia');
    expect(rilievi.toLowerCase()).not.toContain('lombare');
  });

  it('e dice dove resta il dettaglio', () => {
    expect(rilievi).toContain('resta nella tua scheda');
  });

  it('chi non ha condizioni non se la vede scritta', () => {
    const r: Risposte = { obiettivi: ['Ricomposizione corporea'], frequenza: 2 };
    expect(rilieviCondivisibili(r, esitoDi(r)).join(' '))
      .not.toContain('condizione fisica');
  });
});

// ============================================================
// QUELLO CHE ESCE
// ============================================================

describe('l\'obiettivo, che è la prima cosa che cerca', () => {
  it('con le parole sue, non con le nostre', () => {
    expect(cartaDi().obiettivoFrase)
      .toBe('Tornare a salire le scale senza fermarmi a metà');
  });

  it('con i tag scelti e l\'orizzonte', () => {
    const c = cartaDi();
    expect(c.obiettivi).toEqual(['Ricomposizione corporea']);
    expect(c.orizzonte).toBe('Entro 6 mesi');
  });
});

describe('i rilievi: fatti, non giudizi', () => {
  const rilievi = rilieviCondivisibili(PIENA, esitoDi(PIENA)).join(' ');

  it('quanto si è mossa e quanto si muove', () => {
    expect(rilievi).toContain('3 anni');
    expect(rilievi).toContain('2 giorni a settimana');
  });

  it('il lavoro, perché entra nella programmazione', () => {
    expect(rilievi).toContain('Cassiera');
    expect(rilievi).toContain('giornata tipo');
  });

  it('e l\'interesse per la nutrizione, che serve al preventivo', () => {
    expect(rilievi).toContain('percorso nutrizionale');
  });

  // Chi riparte da zero non deve leggere «frequenza: 0».
  it('chi riparte da fermo se lo sente dire bene', () => {
    const r: Risposte = { frequenza: 0 };
    expect(rilieviCondivisibili(r, esitoDi(r)).join(' '))
      .toContain('Si riparte da fermi');
  });

  it('una scheda vuota non produce righe inventate', () => {
    expect(rilieviCondivisibili({}, esitoDi({}))).toEqual([]);
  });
});

// ============================================================
// IL PREVENTIVO
// ============================================================

describe('il preventivo', () => {
  const voci = [
    { descrizione: 'Valutazione completa e protocollo', importo: 150 },
    { descrizione: '8 sedute con il direttore tecnico', importo: 320 },
  ];

  it('somma le voci', () => {
    expect(cartaDi(PIENA, { voci }).totale).toBe(470);
  });

  it('divide in rate quando gliele chiedi', () => {
    const c = cartaDi(PIENA, { voci, rate: 2 });
    expect(c.rate).toBe(2);
    expect(c.importoRata).toBe(235);
  });

  it('una rata sola non è una rateizzazione', () => {
    expect(cartaDi(PIENA, { voci, rate: 1 }).importoRata).toBe(0);
  });

  it('le voci senza importo o senza descrizione non entrano', () => {
    const c = cartaDi(PIENA, { voci: [
      { descrizione: 'Buona', importo: 100 },
      { descrizione: '', importo: 50 },
      { descrizione: 'Senza prezzo', importo: 0 },
    ] });
    expect(c.voci).toHaveLength(1);
    expect(c.totale).toBe(100);
  });

  // Un foglio che dice «Totale: 0 €» è peggio di uno con le righe
  // bianche da riempire davanti alla persona.
  it('senza voci escono le righe da riempire a penna, non uno zero', () => {
    const c = cartaDi();
    expect(c.voci).toEqual([]);
    expect(c.totale).toBe(0);
    expect(c.righeDaRiempire).toBe(RIGHE_VUOTE);
  });

  it('con le voci scritte le righe vuote spariscono', () => {
    expect(cartaDi(PIENA, { voci }).righeDaRiempire).toBe(0);
  });

  it('ha una validità dichiarata', () => {
    expect(cartaDi().validoGiorni).toBe(VALIDO_GIORNI);
    expect(dicitureCarta(esitoDi(PIENA)).join(' ')).toContain(`${VALIDO_GIORNI} giorni`);
  });
});

// ============================================================
// LE DICITURE
// ============================================================

describe('quello che c\'è sempre in fondo', () => {
  it('il perimetro, per intero', () => {
    expect(dicitureCarta(esitoDi(PIENA))).toContain(PERIMETRO);
  });

  // Un preventivo per un obiettivo sanitario, senza questa riga,
  // è una promessa che non possiamo fare.
  it('e se l\'obiettivo è sanitario, si dice che si affianca il medico', () => {
    const r: Risposte = { obiettivi: ['Ridurre il dolore cronico'] };
    const d = dicitureCarta(esitoDi(r)).join(' ');
    expect(d).toContain('affianca il professionista sanitario');
    expect(d).toContain('non lo sostituisce');
  });

  it('su un obiettivo normale quella riga non compare', () => {
    const r: Risposte = { obiettivi: ['Ricomposizione corporea'] };
    expect(dicitureCarta(esitoDi(r)).join(' '))
      .not.toContain('affianca il professionista');
  });
});

// ============================================================
// L'ULTIMA RETE
// ============================================================

describe('il controllo prima di consegnare', () => {
  it('una carta pulita passa', () => {
    expect(controllaCarta(cartaDi(), PIENA).ok).toBe(true);
  });

  // Una regola che vive solo nella funzione che compone si aggira
  // alla prima modifica distratta: qui si ricontrolla il risultato.
  it('se un testo sensibile è finito dentro, lo ferma e dice quale campo', () => {
    const sporca = { ...cartaDi(), rilievi: [String(PIENA.infortuni_note)] };
    const e = controllaCarta(sporca, PIENA);
    expect(e.ok).toBe(false);
    expect(e.problemi.join(' ')).toContain('infortuni_note');
    expect(e.problemi.join(' ')).toContain('resta a noi');
  });

  it('ferma anche una nota interna finita in una voce del preventivo', () => {
    const sporca = {
      ...cartaDi(),
      voci: [{ descrizione: String(PIENA.blocchi), importo: 100 }],
    };
    expect(controllaCarta(sporca, PIENA).ok).toBe(false);
  });

  // «No» e «Sì» coincidono con mezzo vocabolario italiano: un
  // controllo che li cercasse bloccherebbe ogni foglio.
  it('le risposte corte non fanno scattare falsi allarmi', () => {
    const r: Risposte = {
      obiettivo_principale: 'Non voglio più il mal di schiena',
      terapie: 'No', infortuni_note: 'No',
    };
    expect(controllaCarta(cartaDi(r), r).ok).toBe(true);
  });

  it('senza obiettivo avvisa, perché è la prima cosa che cerca', () => {
    const r: Risposte = { frequenza: 2 };
    const e = controllaCarta(cartaDi(r), r);
    expect(e.ok).toBe(false);
    expect(e.problemi.join(' ')).toContain('Manca l\'obiettivo');
  });
});

describe('che cosa si legge prima di stampare', () => {
  it('dice che cosa esce e che cosa no', () => {
    const t = riepilogaCarta(cartaDi(PIENA, {
      voci: [{ descrizione: 'x', importo: 470 }], rate: 2,
    }));
    expect(t).toContain('470');
    expect(t).toContain('2 rate');
    expect(t).toContain('non escono');
  });

  it('e senza preventivo lo dice', () => {
    expect(riepilogaCarta(cartaDi())).toContain('riempire a penna');
  });
});

// ============================================================
// IL FOGLIO STAMPATO
// ============================================================

describe('la stampa', () => {
  const stampa = fs.readFileSync(
    path.join(__dirname, '..', '..', 'utils', 'printUtils.ts'),
    'utf8'
  );

  it('esiste e usa il dominio, non ricopia le regole', () => {
    expect(stampa).toContain('printCartaIntestata');
    expect(stampa).toContain('componiCarta');
  });

  it('non pesca mai dalle risposte grezze', () => {
    const i = stampa.indexOf('export function printCartaIntestata');
    const blocco = stampa.slice(i, stampa.indexOf('\n}', i));
    expect(blocco).not.toContain('infortuni_note');
    expect(blocco).not.toContain('terapie_note');
    expect(blocco).not.toContain('.stress');
  });
});

describe('versione', () => {
  it('tracciata', () => {
    expect(CARTA_VERSION).toBe(1);
  });
});
