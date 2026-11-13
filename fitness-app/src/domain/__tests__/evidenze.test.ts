import * as fs from 'fs';
import * as path from 'path';
import { costruisciRapporto, DatiRapporto, RapportoMattino } from '../rapportoMattino';
import { evidenzeDelGiorno, conEvidenze, Evidenza } from '../evidenze';

// ============================================================
// 11 novembre 2026 — L'EXECUTIVE: CHE COSA GUARDARE OGGI
// ------------------------------------------------------------
// Dal rapporto del mattino, le righe che meritano una decisione.
// Stesso studio finto dei test del rapporto, ridotto all'osso.
// ============================================================

const ADESSO = new Date('2026-11-11T03:00:00Z');
const g = (giorno: string): Date => new Date(`${giorno}T11:00:00Z`);
let n = 0;
const seduta = (studentId: string, collaboratorId: string, giorno: string, extra = {}) =>
  ({ id: `x${n++}`, studentId, collaboratorId, date: g(giorno), status: 'completed', isCountedAsCompleted: true, ...extra });

/** Uno studio dove c'è un po' di tutto da guardare. */
const disordinato = (): DatiRapporto => ({
  adesso: ADESSO,
  persone: [
    { id: 'gius', role: 'manager', name: 'Giuseppe', surname: 'Manager', commissionPercentage: 50 },
    { id: 'anto', role: 'collaborator', name: 'Antonio', surname: 'Coach', commissionPercentage: 60 },
    { id: 'ferr', role: 'collaborator', name: 'Ferruccio', surname: 'Nuovo' },
    { id: 's1', role: 'student', name: 'Anna', surname: 'Uno', assignedCollaboratorIds: ['gius'] },
    { id: 's2', role: 'student', name: 'Bruno', surname: 'Due', assignedCollaboratorIds: ['gius'] },
    { id: 's3', role: 'student', name: 'Carla', surname: 'Tre', assignedCollaboratorIds: ['anto'] },
    { id: 's4', role: 'student', name: 'Dario', surname: 'Quattro', assignedCollaboratorIds: ['anto'] },
    { id: 's5', role: 'student', name: 'Elena', surname: 'Cinque', assignedCollaboratorIds: ['ferr'] },
    { id: 's6', role: 'student', name: 'Fabio', surname: 'Sei', assignedCollaboratorIds: ['gius'] },
  ],
  piani: [
    { id: 'p1', studentId: 's1', collaboratorId: 'gius', installments: [
      { amount: 200, dueDate: g('2026-11-05'), status: 'paid', paidDate: g('2026-11-10') } ] },
    { id: 'p2', studentId: 's2', collaboratorId: 'gius', installments: [
      { amount: 300, dueDate: g('2026-11-01'), status: 'paid', paidDate: g('2026-11-03') } ] },
    { id: 'p3', studentId: 's3', collaboratorId: 'anto', installments: [
      { amount: 150, dueDate: g('2026-09-20'), status: 'pending' },   // scaduta da 52 giorni
      { amount: 150, dueDate: g('2026-11-08'), status: 'pending' } ] },
    { id: 'p4', studentId: 's4', collaboratorId: 'anto', installments: [
      { amount: 120, dueDate: g('2026-11-02'), status: 'pending', transferPending: true } ] },
    { id: 'p5', studentId: 's5', collaboratorId: 'ferr', installments: [
      { amount: 90, dueDate: g('2026-11-04'), status: 'paid', paidDate: g('2026-11-04') } ] },
  ],
  movimenti: [
    { type: 'income', amount: 200, date: g('2026-11-10'), collaboratorId: 'gius', studentId: 's1' },
  ],
  sedute: [
    seduta('s1', 'gius', '2026-11-03'),
    seduta('s2', 'gius', '2026-11-04', { scaloDaFare: true }),
    seduta('s6', 'gius', '2026-11-08'), seduta('s6', 'gius', '2026-11-02'),
  ],
});

/** Uno studio in ordine: tutto pagato, tutto registrato, tutto riconciliato. */
const ordinato = (): DatiRapporto => ({
  adesso: ADESSO,
  persone: [
    { id: 'gius', role: 'manager', name: 'Giuseppe', surname: 'Manager', commissionPercentage: 50 },
    { id: 's1', role: 'student', name: 'Anna', surname: 'Uno', assignedCollaboratorIds: ['gius'] },
  ],
  piani: [{ id: 'p1', studentId: 's1', collaboratorId: 'gius', installments: [
    { amount: 200, dueDate: g('2026-11-05'), status: 'paid', paidDate: g('2026-11-10') },
    { amount: 200, dueDate: g('2026-12-05'), status: 'pending' } ] }],
  movimenti: [{ type: 'income', amount: 200, date: g('2026-11-10'), collaboratorId: 'gius', studentId: 's1' }],
  sedute: [seduta('s1', 'gius', '2026-11-03')],
});

const rapporto = (d: DatiRapporto): RapportoMattino => costruisciRapporto(d);
const ev = (d: DatiRapporto = disordinato()): Evidenza[] => evidenzeDelGiorno(rapporto(d));
const una = (chiave: string): Evidenza => ev().find((e) => e.chiave === chiave)!;

describe('uno studio in ordine', () => {
  it('non ha niente in evidenza: lista vuota, non un errore', () => {
    expect(ev(ordinato())).toEqual([]);
  });
});

describe('uno studio dove c\'è da guardare', () => {
  it('prima le cose da fare, poi quelle da guardare, poi quelle da sapere', () => {
    expect(ev().map((e) => [e.livello, e.chiave])).toEqual([
      ['da fare', 'bonifici_da_confermare'],
      ['da fare', 'sedute_da_scalare'],
      ['da fare', 'percentuale_mancante'],
      ['da guardare', 'rate_scadute'],
      ['da guardare', 'lezioni_senza_percorso'],
      ['da guardare', 'nessuna_seduta_registrata'],
      ['da sapere', 'scarto_rate_movimenti'],
    ]);
  });

  it('bonifico dichiarato: chi è e quanto', () => {
    const e = una('bonifici_da_confermare');
    expect(e.titolo).toBe('1 bonifico dichiarato da confermare');
    expect(e.perche).toMatch(/Dario Quattro — 120,00 €/);
    expect(e.sezione).toBe('rate');
  });

  it('rate scadute: quante, quanto, e da quanto la più vecchia', () => {
    const e = una('rate_scadute');
    expect(e.titolo).toBe('2 rate scadute per 300,00 €');
    expect(e.perche).toMatch(/scaduta da 52 giorni; 1 da più di 30 giorni/);
  });

  it('lezioni senza percorso: nomi, sedute e con chi', () => {
    const e = una('lezioni_senza_percorso');
    expect(e.titolo).toMatch(/^1 allievo ha svolto lezioni/);
    expect(e.perche).toMatch(/2 sedute in tutto: Fabio Sei \(2, con Giuseppe Manager\)/);
  });

  it('sedute non scalate', () => {
    expect(una('sedute_da_scalare').perche).toMatch(/Bruno Due/);
  });

  it('percentuale mancante: chi e su quanto', () => {
    expect(una('percentuale_mancante').perche).toMatch(/Ferruccio Nuovo \(90,00 € di rate nel mese\)/);
  });

  it('allievi assegnati e nessuna seduta registrata: lo dice senza accusare', () => {
    const e = una('nessuna_seduta_registrata');
    expect(e.titolo).toMatch(/^2 collaboratori hanno allievi assegnati/);
    expect(e.perche).toMatch(/Antonio Coach \(2 allievi\)/);
    expect(e.perche).toMatch(/Ferruccio Nuovo \(1 allievo\)/);
    expect(e.perche).toMatch(/non che non abbiano lavorato/);
  });

  it('rate e movimenti che non tornano: i due numeri e la differenza', () => {
    const e = una('scarto_rate_movimenti');
    expect(e.titolo).toBe('Rate e movimenti del mese differiscono di 390,00 €');
    expect(e.perche).toMatch(/Rate segnate pagate: 590,00 €\. Movimenti in entrata: 200,00 €/);
    expect(e.proposta).toMatch(/rate segnate pagate che non hanno un movimento/);
  });

  it('se sono i movimenti a superare le rate, la proposta guarda dall\'altra parte', () => {
    const d = ordinato();
    d.movimenti.push({ type: 'income', amount: 500, date: g('2026-11-09'), collaboratorId: 'gius' });
    const e = ev(d).find((x) => x.chiave === 'scarto_rate_movimenti')!;
    expect(e.proposta).toMatch(/qualche rata è rimasta da segnare/);
  });

  it('i dati incompleti entrano fra le cose da sapere', () => {
    const d = ordinato();
    d.piani[0].installments!.push({ amount: 50, status: 'paid' }); // pagata senza data
    const e = ev(d).find((x) => x.chiave === 'dati_incompleti')!;
    expect(e.livello).toBe('da sapere');
    expect(e.perche).toMatch(/non ha la data di pagamento/);
  });
});

describe('l\'Executive propone, non decide e non accusa', () => {
  it('ogni evidenza ha un perché con i numeri e una proposta', () => {
    for (const e of ev()) {
      expect(e.titolo.length).toBeGreaterThan(10);
      expect(e.perche.length).toBeGreaterThan(10);
      expect(e.proposta.length).toBeGreaterThan(20);
      expect(['incassi', 'rate', 'lezioni', 'collaboratori', 'dati']).toContain(e.sezione);
    }
  });

  it('nessuna proposta dichiara un\'azione già fatta o automatica', () => {
    const tutto = JSON.stringify(ev());
    expect(tutto).not.toMatch(/ho inviato|è stato inviato|inviato automaticamente|ho segnato|ho registrato|sospes|bloccat/i);
  });

  it('nessuna riga dice che qualcuno deve dei soldi, né giudica una persona', () => {
    const tutto = JSON.stringify(ev());
    expect(tutto).not.toMatch(/\bdeve\b|debit|moros|insolven|non ha pagato|non lavora|inadempien|furb|trucc/i);
  });

  it('le stesse cifre del rapporto: non ne aggiunge di sue', () => {
    const r = rapporto(disordinato());
    const e = evidenzeDelGiorno(r).find((x) => x.chiave === 'rate_scadute')!;
    expect(e.titolo).toContain(String(r.rate.scadute.length));
    expect(r.rate.totaleScaduto).toBe(300);
  });

  it('lo stesso rapporto dà sempre le stesse evidenze', () => {
    expect(ev()).toEqual(ev());
  });

  it('il rapporto completo porta le sue evidenze e resta JSON puro', () => {
    const c = conEvidenze(rapporto(disordinato()));
    expect(c.evidenze).toHaveLength(7);
    expect(JSON.parse(JSON.stringify(c))).toEqual(c);
    expect(c.incassi.rate.mese.importo).toBe(590); // il rapporto sotto non cambia
  });
});

describe('cablaggio dell\'Executive', () => {
  const radice = path.join(__dirname, '..', '..', '..');
  const leggi = (...p: string[]): string => fs.readFileSync(path.join(radice, ...p), 'utf8');

  it('il server salva il rapporto insieme alle sue evidenze', () => {
    const f = leggi('functions', 'src', 'rapporto.ts');
    expect(f).toMatch(/conEvidenze\(costruisciRapporto\(\{adesso, \.\.\.dati\}\)\)/);
    expect(leggi('functions', 'copy-domain.js')).toMatch(/'evidenze\.ts'/);
  });

  it('non usa intelligenza artificiale e non fa partire niente', () => {
    const d = leggi('src', 'domain', 'evidenze.ts');
    expect(d).not.toMatch(/fetch\(|firebase|anthropic|wa\.me|httpsCallable/i);
  });

  it('lo schermo le mostra in cima, prima dei numeri, e dice che sono regole', () => {
    const s = leggi('src', 'screens', 'owner', 'RapportoMattinoScreen.tsx');
    expect(s.indexOf('In evidenza oggi')).toBeGreaterThan(-1);
    expect(s.indexOf('In evidenza oggi')).toBeLessThan(s.indexOf('1 · Incassi registrati'));
    expect(s).toMatch(/Le proposte non partono da sole: decidi tu/);
  });

  it('un foglio vecchio senza evidenze non rompe lo schermo: si ricavano', () => {
    const s = leggi('src', 'services', 'rapportoMattinoService.ts');
    expect(s).toMatch(/Array\.isArray\(dati\.evidenze\) \? \(dati as RapportoCompleto\) : conEvidenze\(dati\)/);
  });
});
