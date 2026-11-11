import * as fs from 'fs';
import * as path from 'path';
import {
  costruisciRapporto, giornoRoma, spostaGiorno, rataPagata, sedutaSvolta,
  DatiRapporto, PianoIn, MovimentoIn, SedutaIn, PersonaIn, RapportoMattino,
  NOTA_INCASSI, NOTA_LEZIONI, GIORNI_LEZIONI,
} from '../rapportoMattino';

// ============================================================
// 11 novembre 2026 — IL RAPPORTO DEL MATTINO
// ------------------------------------------------------------
// Uno studio finto di cui conosco ogni euro. Il rapporto gira alle
// 04:00 italiane dell'11 novembre 2026 (le 03:00 in UTC): «ieri» è
// il 10, il mese va dal 1° all'11, il mese scorso è ottobre.
// ============================================================

const ADESSO = new Date('2026-11-11T03:00:00Z');
/** mezzogiorno italiano di un giorno */
const g = (giorno: string): Date => new Date(`${giorno}T11:00:00Z`);

const persone = (): PersonaIn[] => [
  { id: 'tit', role: 'owner', name: 'Francesco', surname: 'Titolare' },
  { id: 'gius', role: 'manager', name: 'Giuseppe', surname: 'Manager', commissionPercentage: 50 },
  { id: 'anto', role: 'collaborator', name: 'Antonio', surname: 'Coach', commissionPercentage: 60 },
  { id: 'ferr', role: 'collaborator', name: 'Ferruccio', surname: 'Nuovo' }, // nessuna percentuale
  { id: 'exco', role: 'collaborator', name: 'Ex', surname: 'Coach', isActive: false, commissionPercentage: 40 },
  { id: 's1', role: 'student', name: 'Anna', surname: 'Uno', assignedCollaboratorIds: ['gius'] },
  { id: 's2', role: 'student', name: 'Bruno', surname: 'Due', assignedCollaboratorIds: ['gius'], coachCommissionPercentage: 70 },
  { id: 's3', role: 'student', name: 'Carla', surname: 'Tre', assignedCollaboratorId: 'anto' }, // campo vecchio
  { id: 's4', role: 'student', name: 'Dario', surname: 'Quattro', assignedCollaboratorIds: ['anto'] },
  { id: 's5', role: 'student', name: 'Elena', surname: 'Cinque', assignedCollaboratorIds: ['ferr'] },
  { id: 's6', role: 'student', name: 'Fabio', surname: 'Sei', assignedCollaboratorIds: ['gius'], isActive: false },
];

const piani = (): PianoIn[] => [
  { id: 'p1', studentId: 's1', collaboratorId: 'gius', installments: [
    { id: 'a', amount: 200, dueDate: g('2026-10-05'), status: 'paid', paidDate: g('2026-10-06') }, // ottobre
    { id: 'b', amount: 200, dueDate: g('2026-11-05'), status: 'paid', paidDate: g('2026-11-10') }, // ieri
    { id: 'c', amount: 200, dueDate: g('2026-12-05'), status: 'pending' },                          // lontana
  ] },
  { id: 'p2', studentId: 's2', collaboratorId: 'gius', installments: [
    { id: 'a', amount: 300, dueDate: g('2026-11-01'), status: 'paid', paidDate: g('2026-11-03') }, // mese
    { id: 'b', amount: 300, dueDate: g('2026-11-14'), status: 'pending' },                          // fra 3 giorni
  ] },
  { id: 'p3', studentId: 's3', collaboratorId: 'anto', installments: [
    { id: 'a', amount: 150, dueDate: g('2026-10-20'), status: 'pending' },                          // scaduta da 22
    { id: 'b', amount: 150, dueDate: g('2026-11-08'), status: 'overdue' },                          // scaduta da 3
  ] },
  { id: 'p4', studentId: 's4', collaboratorId: 'anto', installments: [
    { id: 'a', amount: 120, dueDate: g('2026-11-02'), status: 'pending', transferPending: true },   // bonifico dichiarato
  ] },
  { id: 'p5', studentId: 's5', collaboratorId: 'ferr', installments: [
    { id: 'a', amount: 90, dueDate: g('2026-11-04'), status: 'paid', paidDate: g('2026-11-04') },   // senza percentuale
  ] },
];

const movimenti = (): MovimentoIn[] => [
  { type: 'income', amount: 200, date: g('2026-11-10'), collaboratorId: 'gius', studentId: 's1' },
  { type: 'income', amount: 80, date: g('2026-11-02'), collaboratorId: 'anto' },
  { type: 'income', amount: 500, date: g('2026-10-15'), collaboratorId: 'gius' },
  { type: 'income', amount: 60, date: g('2026-11-05') },                 // senza collaboratore
  { type: 'expense', amount: 700, date: g('2026-11-01') },               // affitto
  { type: 'expense', amount: 650, date: g('2026-10-01') },
];

let n = 0;
const seduta = (studentId: string, collaboratorId: string, giorno: string, extra: Partial<SedutaIn> = {}): SedutaIn =>
  ({ id: `x${n++}`, studentId, collaboratorId, date: g(giorno), status: 'completed', isCountedAsCompleted: true, ...extra });

const sedute = (): SedutaIn[] => [
  seduta('s1', 'gius', '2026-11-03'), seduta('s1', 'gius', '2026-11-09'),     // ha pagato: non compare
  seduta('s2', 'gius', '2026-11-04', { scaloDaFare: true }),                  // pagato, ma seduta da scalare
  seduta('s3', 'anto', '2026-11-06'), seduta('s3', 'anto', '2026-10-25'),     // rata scaduta
  seduta('s4', 'anto', '2026-11-07'),                                         // bonifico da confermare
  seduta('s6', 'gius', '2026-11-08'), seduta('s6', 'gius', '2026-11-02'), seduta('s6', 'gius', '2026-10-30'), // nessun percorso
  seduta('s5', 'ferr', '2026-09-20'),                                         // troppo vecchia
  seduta('s5', 'ferr', '2026-11-05', { status: 'scheduled', isCountedAsCompleted: false }), // non svolta
  seduta('s4', 'anto', '2026-11-10', { status: 'cancelled_late', isCountedAsCompleted: true }), // conta
  seduta('s4', 'anto', '2026-11-09', { status: 'cancelled_by_student', isCountedAsCompleted: false }), // non conta
];

const dati = (extra: Partial<DatiRapporto> = {}): DatiRapporto => ({
  adesso: ADESSO, piani: piani(), movimenti: movimenti(), sedute: sedute(), persone: persone(), ...extra,
});
const rapporto = (extra: Partial<DatiRapporto> = {}): RapportoMattino => costruisciRapporto(dati(extra));

describe('le date sono sempre quelle italiane', () => {
  it('alle 04:00 italiane dell\'11 il giorno è l\'11', () => {
    expect(rapporto().giorno).toBe('2026-11-11');
  });

  it('mezzanotte e mezza in Italia è già il giorno dopo, anche se in UTC è ancora ieri', () => {
    expect(giornoRoma(new Date('2026-11-09T23:30:00Z'))).toBe('2026-11-10');
    expect(giornoRoma(new Date('2026-07-09T22:30:00Z'))).toBe('2026-07-10'); // ora legale
  });

  it('un incasso segnato a mezzanotte e mezza del 10 è di ieri, non dell\'altro ieri', () => {
    const p: PianoIn[] = [{ id: 'p', studentId: 's1', collaboratorId: 'gius', installments: [
      { amount: 100, status: 'paid', dueDate: g('2026-11-01'), paidDate: new Date('2026-11-09T23:30:00Z') },
    ] }];
    expect(rapporto({ piani: p }).incassi.rate.ieri).toEqual({ importo: 100, numero: 1 });
  });

  it('spostare i giorni attraversa mesi e anni', () => {
    expect(spostaGiorno('2026-11-01', -1)).toBe('2026-10-31');
    expect(spostaGiorno('2026-12-28', 7)).toBe('2027-01-04');
  });
});

describe('1 — incassi registrati', () => {
  it('rate segnate pagate: ieri, mese in corso e mese scorso', () => {
    const r = rapporto().incassi.rate;
    expect(r.ieri).toEqual({ importo: 200, numero: 1 });
    expect(r.mese).toEqual({ importo: 590, numero: 3 });          // 200 + 300 + 90
    expect(r.mesePrecedente).toEqual({ importo: 200, numero: 1 });
  });

  it('movimenti in entrata: contati a parte, mai sommati alle rate', () => {
    const r = rapporto().incassi;
    expect(r.movimenti.ieri).toEqual({ importo: 200, numero: 1 });
    expect(r.movimenti.mese).toEqual({ importo: 340, numero: 3 }); // 200 + 80 + 60
    expect(r.movimenti.mesePrecedente).toEqual({ importo: 500, numero: 1 });
    // nessun campo del rapporto contiene la somma delle due fonti
    expect(JSON.stringify(r)).not.toMatch(/930/);                  // 590 + 340
    expect(r.nota).toBe(NOTA_INCASSI);
    expect(r.nota).toMatch(/non si sommano/);
  });

  it('le uscite vengono dai movimenti, per mese', () => {
    const r = rapporto().incassi.uscite;
    expect(r.mese).toEqual({ importo: 700, numero: 1 });
    expect(r.mesePrecedente).toEqual({ importo: 650, numero: 1 });
  });

  it('ogni numero dice periodo e fonte', () => {
    const r = rapporto().incassi;
    expect(r.periodi.ieri).toBe('10/11/2026');
    expect(r.periodi.mese).toBe('dal 01/11/2026 al 11/11/2026');
    expect(r.periodi.mesePrecedente).toBe('dal 01/10/2026 al 31/10/2026');
    expect(r.rate.fonte).toMatch(/Piani di pagamento/);
    expect(r.movimenti.fonte).toMatch(/Sezione economica/);
    expect(r.uscite.fonte).toMatch(/uscita/);
  });

  it('gli importi restano al centesimo, senza code di virgola mobile', () => {
    const p: PianoIn[] = [{ id: 'p', studentId: 's1', installments: [
      { amount: 0.1, status: 'paid', paidDate: g('2026-11-10') },
      { amount: 0.2, status: 'paid', paidDate: g('2026-11-10') },
    ] }];
    expect(rapporto({ piani: p }).incassi.rate.ieri.importo).toBe(0.3);
  });
});

describe('2 — rate scadute e in scadenza', () => {
  it('le scadute sono in ordine di ritardo, con i giorni', () => {
    const r = rapporto().rate;
    expect(r.scadute.map((x) => [x.allievo, x.importo, x.giorni])).toEqual([
      ['Carla Tre', 150, 22],
      ['Carla Tre', 150, 3],
    ]);
    expect(r.totaleScaduto).toBe(300);
    expect(r.scadute[0].collaboratore).toBe('Antonio Coach');
  });

  // È IL DIFETTO che c'era nel motore notturno: leggeva `isPaid`, un
  // campo che l'applicazione non scrive mai. Ogni rata passata di
  // data risultava scaduta, anche se pagata.
  it('una rata PAGATA non è mai scaduta, anche se la sua data è passata', () => {
    const r = rapporto().rate;
    expect(r.scadute.some((x) => x.allievo === 'Anna Uno')).toBe(false);
    expect(rataPagata({ status: 'paid' })).toBe(true);
    expect(rataPagata({ status: 'pending' })).toBe(false);
    expect(rataPagata({ status: 'overdue' })).toBe(false);
    expect(rataPagata(undefined)).toBe(false);
  });

  it('un bonifico dichiarato non è una rata scaduta: aspetta la conferma', () => {
    const r = rapporto().rate;
    expect(r.daConfermare.map((x) => x.allievo)).toEqual(['Dario Quattro']);
    expect(r.scadute.some((x) => x.allievo === 'Dario Quattro')).toBe(false);
  });

  it('in scadenza: solo i prossimi sette giorni', () => {
    const r = rapporto().rate;
    expect(r.inScadenza.map((x) => [x.allievo, x.importo, x.giorni])).toEqual([['Bruno Due', 300, -3]]);
    expect(r.totaleInScadenza).toBe(300);
  });

  it('una rata che scade OGGI è in scadenza, non scaduta', () => {
    const p: PianoIn[] = [{ id: 'p', studentId: 's1', installments: [
      { amount: 50, status: 'pending', dueDate: g('2026-11-11') },
    ] }];
    const r = rapporto({ piani: p }).rate;
    expect(r.scadute).toHaveLength(0);
    expect(r.inScadenza[0].giorni).toBe(0);
  });

  it('periodo e fonte ci sono', () => {
    const r = rapporto().rate;
    expect(r.periodo).toMatch(/scadute fino al 10\/11\/2026/);
    expect(r.periodo).toMatch(/dal 11\/11\/2026 al 18\/11\/2026/);
    expect(r.fonte).toMatch(/Piani di pagamento/);
  });
});

describe('3 — lezioni svolte senza un pagamento registrato', () => {
  const stato = (nome: string): string | undefined =>
    rapporto().lezioni.righe.find((x) => x.allievo === nome)?.stato;

  it('chi ha pagato e ha le sedute scalate non compare', () => {
    expect(stato('Anna Uno')).toBeUndefined();
  });

  it('nessun percorso e nessun movimento: da verificare, in cima', () => {
    const r = rapporto().lezioni.righe;
    expect(r[0].allievo).toBe('Fabio Sei');
    expect(r[0].stato).toBe('nessun percorso');
    expect(r[0].sedute).toBe(3);
    expect(r[0].ultima).toBe('2026-11-08');
    expect(r[0].collaboratore).toBe('Giuseppe Manager');
  });

  it('percorso con rate scadute e nessuna pagata', () => {
    expect(stato('Carla Tre')).toBe('rata scaduta');
  });

  it('bonifico dichiarato: è uno stato a sé, non un mancato pagamento', () => {
    expect(stato('Dario Quattro')).toBe('bonifico da confermare');
  });

  it('ha pagato, ma una seduta non è stata scalata dal percorso', () => {
    expect(stato('Bruno Due')).toBe('sedute da scalare');
  });

  it('percorso appena aperto, prima rata non ancora scaduta: «non ancora dovuto», in fondo', () => {
    const p = piani().concat([{ id: 'p9', studentId: 's6', collaboratorId: 'gius', installments: [
      { amount: 100, status: 'pending', dueDate: g('2026-11-20') },
    ] }]);
    const r = rapporto({ piani: p }).lezioni.righe;
    const fabio = r.find((x) => x.allievo === 'Fabio Sei')!;
    expect(fabio.stato).toBe('non ancora dovuto');
    expect(r[r.length - 1].allievo).toBe('Fabio Sei');
  });

  it('un movimento in entrata a nome dell\'allievo vale come pagamento registrato', () => {
    const m = movimenti().concat([{ type: 'income', amount: 50, date: g('2026-10-01'), studentId: 's6' }]);
    expect(rapporto({ movimenti: m }).lezioni.righe.some((x) => x.allievo === 'Fabio Sei')).toBe(false);
  });

  it('contano le sedute svolte e quelle conteggiate; non le prenotate né le annullate in tempo', () => {
    const dario = rapporto().lezioni.righe.find((x) => x.allievo === 'Dario Quattro')!;
    expect(dario.sedute).toBe(2); // quella svolta + l'annullata tardi
    expect(sedutaSvolta({ id: 'a', status: 'scheduled' })).toBe(false);
    expect(sedutaSvolta({ id: 'a', status: 'cancelled_late', isCountedAsCompleted: true })).toBe(true);
  });

  it(`si guardano solo gli ultimi ${GIORNI_LEZIONI} giorni`, () => {
    expect(stato('Elena Cinque')).toBeUndefined(); // la sua seduta è di settembre
    expect(rapporto().lezioni.periodo).toBe('sedute svolte dal 12/10/2026 al 11/11/2026');
  });

  // «Non considerare automaticamente un pagamento mancante come un
  // debito.» Lo garantisce un test, non la buona volontà.
  it('nessuna riga dice che qualcuno deve qualcosa', () => {
    const l = rapporto().lezioni;
    expect(JSON.stringify(l.righe)).not.toMatch(/\bdeve\b|debit|moros|insolven|non ha pagato/i);
    expect(l.nota).toBe(NOTA_LEZIONI);
    expect(l.nota).toMatch(/non che la persona debba/);
    expect(l.fonte).toMatch(/Sedute/);
  });

  it('sedute per un allievo che non è in anagrafica: compaiono, e c\'è un avviso', () => {
    const s = sedute().concat([seduta('fantasma', 'gius', '2026-11-09')]);
    const r = rapporto({ sedute: s });
    expect(r.lezioni.righe.some((x) => x.allievo === 'Allievo non in anagrafica')).toBe(true);
    expect(r.avvisi.join(' ')).toMatch(/non è in anagrafica/);
  });
});

describe('4 — riepilogo per collaboratore', () => {
  const riga = (nome: string) => rapporto().collaboratori.righe.find((x) => x.nome === nome)!;

  it('allievi contati dalle schede degli allievi, attivi, anche col campo vecchio', () => {
    expect(riga('Giuseppe Manager').allievi).toBe(2); // s1, s2 — s6 non è attivo
    expect(riga('Antonio Coach').allievi).toBe(2);    // s3 (campo vecchio) e s4
    expect(riga('Ferruccio Nuovo').allievi).toBe(1);
  });

  it('sedute svolte nel mese', () => {
    expect(riga('Giuseppe Manager').sedute).toBe(5); // s1×2, s2×1, s6×2 di novembre
    expect(riga('Antonio Coach').sedute).toBe(3);
    expect(riga('Ferruccio Nuovo').sedute).toBe(0);
  });

  it('rate e movimenti del mese, separati', () => {
    const gi = riga('Giuseppe Manager');
    expect(gi.rate).toEqual({ importo: 500, numero: 2 });
    expect(gi.movimenti).toEqual({ importo: 200, numero: 1 });
    expect(riga('Antonio Coach').rate).toEqual({ importo: 0, numero: 0 });
    expect(riga('Antonio Coach').movimenti).toEqual({ importo: 80, numero: 1 });
  });

  it('la quota usa la percentuale dell\'allievo se c\'è, altrimenti quella del collaboratore', () => {
    const gi = riga('Giuseppe Manager');
    // 200 al 50% (s1) + 300 al 70% (s2, percentuale sua) = 100 + 210
    expect(gi.quotaCollaboratore).toBe(310);
    expect(gi.quotaStudio).toBe(190);
    expect(gi.notaQuota).toBe('Percentuale applicata: 50%, 70%.');
  });

  it('senza percentuale la quota NON si inventa: resta vuota e dice perché', () => {
    const f = riga('Ferruccio Nuovo');
    expect(f.rate).toEqual({ importo: 90, numero: 1 });
    expect(f.quotaCollaboratore).toBeNull();
    expect(f.quotaStudio).toBeNull();
    expect(f.notaQuota).toMatch(/Percentuale non impostata/);
  });

  it('nessuna rata nel mese: nessuna quota, detto in chiaro', () => {
    expect(riga('Antonio Coach').quotaCollaboratore).toBeNull();
    expect(riga('Antonio Coach').notaQuota).toMatch(/Nessuna rata segnata pagata/);
  });

  it('chi non è più attivo non compare fra i collaboratori', () => {
    expect(rapporto().collaboratori.righe.some((x) => x.nome === 'Ex Coach')).toBe(false);
  });

  it('gli incassi senza collaboratore non spariscono: stanno in una riga a parte', () => {
    const n = riga('Non attribuito');
    expect(n.ruolo).toBe('non attribuito');
    expect(n.movimenti).toEqual({ importo: 60, numero: 1 });
  });

  it('la somma delle righe è il totale del mese: niente si perde per strada', () => {
    const r = rapporto();
    const rate = r.collaboratori.righe.reduce((s, x) => s + x.rate.importo, 0);
    const mov = r.collaboratori.righe.reduce((s, x) => s + x.movimenti.importo, 0);
    expect(rate).toBe(r.incassi.rate.mese.importo);
    expect(mov).toBe(r.incassi.movimenti.mese.importo);
  });

  it('periodo, fonte e limiti sono scritti', () => {
    const c = rapporto().collaboratori;
    expect(c.periodo).toBe('dal 01/11/2026 al 11/11/2026');
    expect(c.fonte).toMatch(/Anagrafica/);
    expect(c.nota).toMatch(/base di calcolo, non un conteggio da pagare/);
  });
});

describe('i dati che mancano si dicono, non si nascondono', () => {
  it('rata pagata senza data di pagamento', () => {
    const p: PianoIn[] = [{ id: 'p', studentId: 's1', installments: [{ amount: 100, status: 'paid' }] }];
    const r = rapporto({ piani: p });
    expect(r.incassi.rate.mese.numero).toBe(0);
    expect(r.avvisi.join(' ')).toMatch(/segnata pagata ma non ha la data di pagamento/);
  });

  it('rata non pagata senza scadenza', () => {
    const p: PianoIn[] = [{ id: 'p', studentId: 's1', installments: [{ amount: 100, status: 'pending' }] }];
    expect(rapporto({ piani: p }).avvisi.join(' ')).toMatch(/non ha la data di scadenza/);
  });

  it('movimento senza data', () => {
    const m: MovimentoIn[] = [{ type: 'income', amount: 10 }];
    expect(rapporto({ movimenti: m }).avvisi.join(' ')).toMatch(/movimento non ha la data/);
  });

  it('con i dati in ordine non c\'è nessun avviso', () => {
    expect(rapporto().avvisi).toEqual([]);
  });

  it('dichiara quanti documenti sono entrati nel conto', () => {
    expect(rapporto().letti).toEqual({ piani: 5, rate: 9, movimenti: 6, sedute: 13, persone: 11 });
  });
});

describe('robustezza', () => {
  it('studio vuoto: tutto a zero, niente errori', () => {
    const r = rapporto({ piani: [], movimenti: [], sedute: [], persone: [] });
    expect(r.incassi.rate.mese).toEqual({ importo: 0, numero: 0 });
    expect(r.rate.scadute).toEqual([]);
    expect(r.lezioni.righe).toEqual([]);
    expect(r.collaboratori.righe).toEqual([]);
  });

  it('documenti rotti (campi mancanti, null) non fanno cadere il rapporto', () => {
    const r = costruisciRapporto({
      adesso: ADESSO,
      piani: [{ id: 'p' }, null as any, { id: 'q', installments: [null as any, {}] }],
      movimenti: [null as any, {}],
      sedute: [null as any, { id: 's' }],
      persone: [null as any, { id: 'x' }],
    });
    expect(r.versione).toBe(1);
  });

  it('gli stessi dati danno sempre lo stesso rapporto', () => {
    expect(rapporto()).toEqual(rapporto());
  });

  it('si può salvare e rileggere come JSON senza perdere niente', () => {
    const r = rapporto();
    expect(JSON.parse(JSON.stringify(r))).toEqual(r);
    expect(r.generatoIl).toBe('2026-11-11T03:00:00.000Z');
  });
});

// ============================================================
// IL CABLAGGIO E I CONFINI
// ------------------------------------------------------------
// Che cosa il rapporto PUÒ fare, e soprattutto che cosa non può.
// Questi test leggono i sorgenti: se domani qualcuno apre una porta
// che doveva restare chiusa, cadono.
// ============================================================

const radice = path.join(__dirname, '..', '..', '..');
const leggi = (...p: string[]): string => fs.readFileSync(path.join(radice, ...p), 'utf8');

describe('il rapporto gira dentro il motore notturno che c\'è già', () => {
  const brain = leggi('functions', 'src', 'brain.ts');
  const tutte = fs.readdirSync(path.join(radice, 'functions', 'src'))
    .filter((f) => f.endsWith('.ts'))
    .map((f) => leggi('functions', 'src', f)).join('\n');

  it('lo lancia la funzione delle 04:00, non una seconda pianificazione', () => {
    const i = brain.indexOf('export const nightlyBrain = onSchedule(');
    const blocco = brain.slice(i, brain.indexOf('// Trigger manuale'));
    expect(blocco).toMatch(/schedule: "0 4 \* \* \*"/);
    expect(blocco).toMatch(/generaRapportoMattino\(/);
    expect((tutte.match(/onSchedule\(/g) || []).length).toBe(1);
  });

  it('se il motore cade il rapporto si fa lo stesso, e viceversa', () => {
    const i = brain.indexOf('export const nightlyBrain = onSchedule(');
    const blocco = brain.slice(i, brain.indexOf('// Trigger manuale'));
    expect((blocco.match(/try \{/g) || []).length).toBe(2);
    expect(blocco).toMatch(/if \(errore\) throw errore;/);
    // il rapporto va prima del motore: è veloce e non dipende dall'AI
    expect(blocco.indexOf('generaRapportoMattino(')).toBeLessThan(blocco.indexOf('runBrain('));
    expect(blocco).toMatch(/timeoutSeconds: 540/);
  });

  it('la logica è quella del dominio, copiata nelle funzioni a ogni build', () => {
    expect(leggi('functions', 'copy-domain.js')).toMatch(/'rapportoMattino\.ts'/);
    expect(leggi('functions', 'src', 'rapporto.ts')).toMatch(/costruisciRapporto\(\{adesso, \.\.\.dati\}\)/);
  });
});

describe('il rapporto è del titolare e di nessun altro', () => {
  const funzione = leggi('functions', 'src', 'rapporto.ts');

  it('la funzione controlla sul server che chi chiama sia il titolare', () => {
    const i = funzione.indexOf('export const rapportoMattino = onCall(');
    const blocco = funzione.slice(i);
    expect(blocco).toMatch(/await soloTitolareTracciato\(\s*request\.auth\.uid, "leggere il rapporto del mattino"/);
    // il controllo viene PRIMA di qualunque lettura o calcolo
    expect(blocco.indexOf('soloTitolareTracciato(')).toBeLessThan(blocco.indexOf('generaRapportoMattino('));
    expect(blocco.indexOf('soloTitolareTracciato(')).toBeLessThan(blocco.indexOf('.collection('));
    expect(funzione).not.toMatch(/"manager"|"collaborator"/);
  });

  it('nessuna regola del database apre la collezione: senza regola, Firestore nega tutto', () => {
    const regole = leggi('firestore.rules');
    expect(regole).not.toMatch(/rapportiMattino/);
    expect(regole).not.toMatch(/match \/\{document=\*\*\}/); // nessuna regola jolly
  });

  it('l\'applicazione non legge mai la collezione direttamente', () => {
    const servizio = leggi('src', 'services', 'rapportoMattinoService.ts');
    expect(servizio).toMatch(/httpsCallable\(functions, 'rapportoMattino'\)/);
    expect(servizio).not.toMatch(/firebase\/firestore/);
  });

  it('la schermata sta solo nel blocco del titolare', () => {
    const nav = leggi('src', 'navigation', 'StaffTabsV2.tsx');
    const da = nav.indexOf("role === 'owner' && (");
    const a = nav.indexOf("role === 'manager' && (");
    expect(nav.slice(da, a)).toMatch(/StudioStack\.Screen name="RapportoMattino" component=\{RapportoMattinoScreen\}/);
    expect(nav.slice(a)).not.toMatch(/RapportoMattino/);
    // e nel menu compare una volta sola: in quello del titolare
    expect((nav.match(/route: 'RapportoMattino'/g) || []).length).toBe(1);
    const menuTitolare = nav.slice(nav.indexOf('owner: ['), nav.indexOf('manager: ['));
    expect(menuTitolare).toMatch(/route: 'RapportoMattino'/);
  });
});

describe('il rapporto legge e scrive un foglio: nient\'altro', () => {
  const funzione = leggi('functions', 'src', 'rapporto.ts');

  it('scrive in una sola collezione, la sua', () => {
    const scritture = funzione.match(/\.(set|update|delete|add|create)\(/g) || [];
    expect(scritture).toEqual(['.set(']);
    expect(funzione).toMatch(/collection\(COLLEZIONE_RAPPORTI\)\.doc\(rapporto\.giorno\)\.set\(/);
  });

  it('non modifica piani, movimenti, sedute o anagrafica', () => {
    for (const c of ['paymentPlans', 'financialTransactions', 'sessions', 'users']) {
      const usi = funzione.split(`collection("${c}")`).slice(1);
      expect(usi.length).toBeGreaterThan(0);
      for (const u of usi) expect(u.slice(0, 120)).toMatch(/^\s*(\.get\(\)|\.doc\(uid\)\.get\(\)|\s*\.where\()/);
    }
  });

  it('non chiama intelligenze artificiali e non manda messaggi', () => {
    expect(funzione).not.toMatch(/anthropic|api\.openai|fetch\(|wa\.me|sendMessage|messaging\(\)/i);
    expect(leggi('src', 'domain', 'rapportoMattino.ts')).not.toMatch(/fetch\(|firebase/);
  });
});

// ============================================================
// I DUE DIFETTI TROVATI MAPPANDO L'ESISTENTE
// ============================================================

describe('una rata pagata non risulta più scaduta', () => {
  it('il motore notturno legge lo stato vero della rata', () => {
    const brain = leggi('functions', 'src', 'brain.ts');
    expect(brain).toMatch(/if \(rataPagata\(/);
    expect(brain).not.toMatch(/if \(i\.isPaid\)/);
  });

  it('anche la coda di «Oggi» nell\'applicazione', () => {
    const oggi = leggi('src', 'screens', 'staff', 'OperationsTodayScreen.tsx');
    expect(oggi).toMatch(/isInstallmentOverdue\(due, inst\.status === 'paid'\)/);
    expect(oggi).not.toMatch(/!!inst\.isPaid/);
  });

  it('e il campo vero è quello che l\'applicazione scrive', () => {
    expect(leggi('src', 'services', 'paymentService.ts')).toMatch(/status: 'paid' as PaymentStatus/);
  });
});

// ============================================================
// 11 novembre 2026 — LE PERCENTUALI, DOPO LA REVISIONE
// ============================================================

describe('la percentuale dell\'allievo vale solo quando è davvero sua', () => {
  const conPiano = (studente: Partial<PersonaIn>, collaboratorId: string) => {
    const p = persone().filter((x) => x.id !== 's9').concat([{ id: 's9', role: 'student', name: 'Zeno', surname: 'Prova', ...studente }]);
    const pi: PianoIn[] = [{ id: 'pz', studentId: 's9', collaboratorId, installments: [
      { amount: 100, status: 'paid', paidDate: g('2026-11-09') } ] }];
    return rapporto({ persone: p, piani: pi, movimenti: [], sedute: [] }).collaboratori.righe.find((x) => x.id === collaboratorId)!;
  };

  it('zero sull\'allievo vuol dire «non impostata»: si usa quella del collaboratore', () => {
    // l'app scrive 0 quando il campo è lasciato vuoto
    const r = conPiano({ assignedCollaboratorIds: ['gius'], coachCommissionPercentage: 0 }, 'gius');
    expect(r.quotaCollaboratore).toBe(50);
    expect(r.notaQuota).toBe('Percentuale applicata: 50%.');
  });

  it('la percentuale dell\'allievo non si applica al piano di un altro collaboratore', () => {
    const r = conPiano({ assignedCollaboratorIds: ['gius'], coachCommissionPercentage: 80 }, 'anto');
    expect(r.quotaCollaboratore).toBe(60); // quella di Antonio, non l'80% deciso per Giuseppe
  });

  it('se è sua e maggiore di zero, si usa la sua', () => {
    expect(conPiano({ assignedCollaboratorIds: ['anto'], coachCommissionPercentage: 80 }, 'anto').quotaCollaboratore).toBe(80);
  });

  it('le fonti dicono il vero: data in cui la rata è stata segnata, sedute anche annullate tardi', () => {
    const r = rapporto();
    expect(r.incassi.rate.fonte).toMatch(/per il giorno in cui sono state segnate/);
    expect(r.lezioni.fonte).toMatch(/annullate tardi/);
  });
});
