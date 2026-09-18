import fs from 'fs';
import path from 'path';
import {
  componiSchedaSemplice, controllaSchedaSemplice, dicitureDi, serveAvvisoRespiro,
  contaEsercizi, riepilogaScheda, GIORNI, PIE_DI_PAGINA, SCHEDA_SEMPLICE_VERSION,
  GiornoSemplice, senzaPrescrizione, obiettivoDi, puoAggiungereSerie,
  esercizioCompleto,
} from '../schedaSemplice';
import { PERIMETRO, AVVISO_RESPIRO, VOCI_AVVISO_RESPIRO } from '../perimetro';

// ============================================================
// «HANNO BISOGNO DI AVERE LA SCHEDA STAMPATA»
// ------------------------------------------------------------
// Il titolare, il 18 settembre 2026: ci sono allieve che per età e
// abitudine vogliono il foglio in mano, non l'app. Non servono
// progressioni: servono gli esercizi e la spiegazione.
//
// Non è una scheda povera: è una scheda per un pubblico diverso.
// Chi tiene il foglio piegato nella borsa non ha bisogno di 4×12
// al 70%, ha bisogno di sapere CHE COSA fa e COME si fa.
// ============================================================

const giornoConEsercizi = (nomi: string[]) => ({
  exercises: nomi.map((n) => ({
    name: n, description: `Come si fa ${n}`, notes: '',
    sets: 4, reps: '12', restSeconds: 90,
  })),
  notes: '',
});

describe('dal programma al foglio', () => {
  it('passano nome e spiegazione', () => {
    const s = componiSchedaSemplice([giornoConEsercizi(['Leg press'])]);
    expect(s[0].esercizi[0].nome).toBe('Leg press');
    expect(s[0].esercizi[0].spiegazione).toBe('Come si fa Leg press');
  });

  it('i giorni prendono il loro nome', () => {
    const s = componiSchedaSemplice([
      giornoConEsercizi(['A']), undefined, giornoConEsercizi(['B']),
    ]);
    expect(s.map((g) => g.nome)).toEqual(['Lunedì', 'Mercoledì']);
    expect(GIORNI[0]).toBe('Lunedì');
  });

  // Su un foglio stampato, cinque righe «Giorno di riposo» sono
  // carta sprecata e confusione per chi legge.
  it('i giorni vuoti non finiscono sulla carta', () => {
    const s = componiSchedaSemplice([
      giornoConEsercizi(['A']), { exercises: [] }, undefined,
    ]);
    expect(s).toHaveLength(1);
  });

  it('un esercizio senza nome non è un esercizio', () => {
    const s = componiSchedaSemplice([{ exercises: [{ name: '  ', description: 'x' }] }]);
    expect(s).toHaveLength(0);
  });

  it('una settimana vuota non rompe niente', () => {
    expect(componiSchedaSemplice([])).toEqual([]);
    expect(componiSchedaSemplice(undefined as any)).toEqual([]);
  });

  it('le note dell\'esercizio passano, se ci sono', () => {
    const s = componiSchedaSemplice([{
      exercises: [{ name: 'Squat', description: 'x', notes: 'piano nella discesa' }],
    }]);
    expect(s[0].esercizi[0].note).toBe('piano nella discesa');
  });
});

// ============================================================
// LA REGOLA DEL FOGLIO: NIENTE CARICHI
// ------------------------------------------------------------
// Non «non sono obbligatori»: non ci sono proprio. Se un domani
// qualcuno li rimette, ha fatto un'altra cosa e deve chiamarla in
// un altro modo.
// ============================================================

describe('sul foglio non ci sono carichi né serie', () => {
  const s = componiSchedaSemplice([giornoConEsercizi(['Leg press', 'Squat'])]);

  it('serie, ripetizioni e recuperi non passano', () => {
    const tutto = JSON.stringify(s);
    expect(tutto).not.toContain('sets');
    expect(tutto).not.toContain('reps');
    expect(tutto).not.toContain('restSeconds');
    expect(tutto).not.toContain('90');
  });

  it('un esercizio ha tre campi e basta', () => {
    expect(Object.keys(s[0].esercizi[0]).sort()).toEqual(['nome', 'spiegazione']);
  });
});

describe('è pronta da stampare?', () => {
  it('senza esercizi non si stampa, e dice che fare', () => {
    const e = controllaSchedaSemplice([]);
    expect(e.pronta).toBe(false);
    expect(e.avvisi.join(' ')).toContain('aggiungine almeno uno');
  });

  // Chi ha in mano il foglio è lui, e sa se quella signora
  // quell'esercizio lo conosce già. Ma deve saperlo prima di
  // stampare, non dalla faccia di chi legge.
  it('un esercizio senza spiegazione avvisa, non blocca', () => {
    const s = componiSchedaSemplice([{
      exercises: [{ name: 'Leg press', description: '' }],
    }]);
    const e = controllaSchedaSemplice(s);
    expect(e.pronta).toBe(true);
    expect(e.avvisi.join(' ')).toContain('Leg press');
    expect(e.avvisi.join(' ')).toContain('solo il nome');
  });

  it('con più esercizi muti li nomina tutti', () => {
    const s = componiSchedaSemplice([{
      exercises: [{ name: 'A', description: '' }, { name: 'B', description: '' }],
    }]);
    const t = controllaSchedaSemplice(s).avvisi.join(' ');
    expect(t).toContain('2 esercizi');
    expect(t).toContain('A, B');
  });

  it('tutto a posto: nessun avviso', () => {
    expect(controllaSchedaSemplice(componiSchedaSemplice([giornoConEsercizi(['A'])])).avvisi)
      .toEqual([]);
  });
});

// ============================================================
// LA DICITURA
// ------------------------------------------------------------
// Una scheda stampata è l'adattamento che gira più lontano da noi:
// finisce in una borsa, su un frigorifero, in mano a un figlio che
// chiede «ma chi te l'ha data questa?». Il perimetro ci va sempre.
// ============================================================

describe('quello che c\'è sempre in fondo al foglio', () => {
  const s = componiSchedaSemplice([giornoConEsercizi(['Leg press'])]);

  it('il perimetro, per intero, parola per parola', () => {
    expect(PIE_DI_PAGINA).toBe(PERIMETRO);
    expect(dicitureDi(s)).toContain(PERIMETRO);
  });

  it('dice che non è un atto diagnostico né terapeutico', () => {
    expect(dicitureDi(s).join(' ')).toContain('mai atto diagnostico o terapeutico');
  });

  it('c\'è anche su una scheda vuota', () => {
    expect(dicitureDi([])).toContain(PERIMETRO);
  });
});

describe('l\'avviso sul respiro compare da sé', () => {
  const con = (nome: string, spiegazione = '', note = '') =>
    componiSchedaSemplice([{ exercises: [{ name: nome, description: spiegazione, notes: note }] }]);

  it('quando l\'esercizio è di respiro', () => {
    expect(serveAvvisoRespiro(con('Respirazione diaframmatica'))).toBe(true);
  });

  // Il respiro entra spesso dalla nota, non dal titolo.
  it('anche quando sta solo nella spiegazione o nella nota', () => {
    expect(serveAvvisoRespiro(con('Mobilità', 'espira mentre scendi'))).toBe(true);
    expect(serveAvvisoRespiro(con('Squat', 'x', 'inspira prima di partire'))).toBe(true);
  });

  it('e allora la scheda lo porta, per intero', () => {
    const righe = dicitureDi(con('Respirazione diaframmatica'));
    expect(righe).toContain(AVVISO_RESPIRO);
    VOCI_AVVISO_RESPIRO.forEach((v) => {
      expect(righe.join(' ')).toContain(v);
    });
  });

  it('su una scheda senza respiro non si mette', () => {
    expect(serveAvvisoRespiro(con('Leg press', 'spingi coi talloni'))).toBe(false);
    expect(dicitureDi(con('Leg press', 'spingi coi talloni'))).not.toContain(AVVISO_RESPIRO);
  });
});

describe('che cosa si legge prima di stampare', () => {
  it('quanti esercizi, su quanti giorni', () => {
    const s = componiSchedaSemplice([giornoConEsercizi(['A', 'B']), giornoConEsercizi(['C'])]);
    expect(contaEsercizi(s)).toBe(3);
    const r = riepilogaScheda(s);
    expect(r).toContain('3 esercizi');
    expect(r).toContain('2 giorni');
    expect(r).toContain('senza carichi');
  });

  it('e con un esercizio solo parla al singolare', () => {
    const r = riepilogaScheda(componiSchedaSemplice([giornoConEsercizi(['A'])]));
    expect(r).toContain('1 esercizio ');
    expect(r).toContain('1 giorno');
  });

  it('vuota lo dice', () => {
    expect(riepilogaScheda([])).toContain('niente da stampare');
  });
});

// ============================================================
// IL FOGLIO STAMPATO
// ------------------------------------------------------------
// Un dominio che non arriva alla carta non serve a niente: la
// carta è tutto il punto di questa funzione.
// ============================================================

describe('la stampa', () => {
  const stampa = fs.readFileSync(
    path.join(__dirname, '..', '..', 'utils', 'printUtils.ts'),
    'utf8'
  );

  it('esiste e usa il dominio, non ricopia le regole', () => {
    expect(stampa).toContain('printSchedaSemplice');
    expect(stampa).toContain('componiSchedaSemplice');
    expect(stampa).toContain('dicitureDi');
  });

  // Il carattere piccolo su un foglio destinato a chi ha
  // settant'anni è un difetto, non una scelta grafica.
  it('è scritta grande, per chi la deve leggere', () => {
    const blocco = stampa.slice(stampa.indexOf('SCHEDA_SEMPLICE_CSS'));
    expect(blocco).toMatch(/font-size:\s*(1[6-9]|[2-9]\d)px/);
  });

  it('non stampa serie, carichi né recuperi', () => {
    const i = stampa.indexOf('export function printSchedaSemplice');
    const blocco = stampa.slice(i, stampa.indexOf('\n}', i));
    expect(blocco).not.toContain('.sets');
    expect(blocco).not.toContain('.reps');
    expect(blocco).not.toContain('restSeconds');
  });
});

describe('versione', () => {
  it('tracciata', () => {
    expect(SCHEDA_SEMPLICE_VERSION).toBe(1);
  });
});

// ============================================================
// E SE POI UNO APRE LO STESSO LA SEDUTA DAL VIVO?
// ------------------------------------------------------------
// Quelle allieve non la aprono — usano l'app per prenotare e per
// vedere l'abbonamento. Ma «non lo fanno» non è una protezione: è
// una speranza. Senza queste regole vedevano «Obiettivo: 0 x » e
// il pulsante per aggiungere una serie sparito: fermi davanti a una
// cosa che non si può né fare né chiudere.
// ============================================================

describe('un esercizio senza serie prescritte', () => {
  it('si riconosce', () => {
    expect(senzaPrescrizione(0)).toBe(true);
    expect(senzaPrescrizione(undefined)).toBe(true);
    expect(senzaPrescrizione(NaN)).toBe(true);
    expect(senzaPrescrizione(3)).toBe(false);
  });

  it('non scrive «Obiettivo: 0 x »', () => {
    const t = obiettivoDi(0, '');
    expect(t).not.toContain('0 x');
    expect(t).toContain('non prescritte');
  });

  it('con la prescrizione la scrive come sempre', () => {
    expect(obiettivoDi(4, '12')).toBe('Obiettivo: 4 x 12');
  });

  // Il difetto vero, in una riga.
  it('si può comunque registrare una serie, senza restare bloccati', () => {
    expect(puoAggiungereSerie(0, 0)).toBe(true);
    expect(puoAggiungereSerie(7, 0)).toBe(true);
  });

  it('mentre col numero prescritto il tetto resta quello', () => {
    expect(puoAggiungereSerie(2, 3)).toBe(true);
    expect(puoAggiungereSerie(3, 3)).toBe(false);
  });

  it('ed è fatto appena si registra qualcosa', () => {
    expect(esercizioCompleto(0, 0)).toBe(false);
    expect(esercizioCompleto(1, 0)).toBe(true);
    expect(esercizioCompleto(2, 3)).toBe(false);
    expect(esercizioCompleto(3, 3)).toBe(true);
  });
});
