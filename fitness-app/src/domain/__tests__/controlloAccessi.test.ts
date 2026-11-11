import { analizzaAccessi, AccountIn, SchedaIn } from '../controlloAccessi';

// ============================================================
// 11 novembre 2026 — IL CONTROLLO ACCESSI
// ============================================================

const ADESSO = new Date('2026-11-11T20:00:00Z');
const giorniFa = (n: number): string => new Date(ADESSO.getTime() - n * 86400000).toISOString();

const schede = (): SchedaIn[] => [
  { id: 'tit', role: 'owner', name: 'Francesco', surname: 'Titolare', email: 'f@studio.it' },
  { id: 'gius', role: 'manager', name: 'Giuseppe', surname: 'Manager', email: 'g@studio.it' },
  { id: 'anto', role: 'collaborator', name: 'Antonio', surname: 'Coach', email: 'a@studio.it' },
  { id: 'ferr', role: 'collaborator', name: 'Ferruccio', surname: 'Nuovo', email: 'fe@studio.it' },
  { id: 's1', role: 'student', name: 'Anna', surname: 'Uno', email: 'anna@mail.it' },
];

const accounts = (): AccountIn[] => [
  { uid: 'tit', email: 'f@studio.it', creato: giorniFa(300), ultimoIngresso: giorniFa(1), sessioniValideDal: giorniFa(300) },
  { uid: 'gius', email: 'g@studio.it', creato: giorniFa(200), ultimoIngresso: giorniFa(2), sessioniValideDal: giorniFa(200) },
  { uid: 'anto', email: 'a@studio.it', creato: giorniFa(100), ultimoIngresso: giorniFa(3), sessioniValideDal: giorniFa(100) },
  { uid: 's1', email: 'anna@mail.it', creato: giorniFa(50), ultimoIngresso: giorniFa(5), sessioniValideDal: giorniFa(50) },
];

const analizza = (a = accounts(), s = schede()) => analizzaAccessi(a, s, ADESSO);
const riga = (uid: string, a = accounts(), s = schede()) => analizza(a, s).righe.find((r) => r.uid === uid)!;

describe('uno studio in ordine', () => {
  it('nessuna segnalazione grave', () => {
    const c = analizza();
    expect(c.generali).toEqual([]);
    expect(c.conteggi).toEqual({ accessi: 4, staff: 3, titolari: 1, conSegnalazioni: 0 });
  });

  it('dice chi dello staff non ha un accesso', () => {
    expect(analizza().staffSenzaAccesso).toEqual([{ id: 'ferr', nome: 'Ferruccio Nuovo', ruolo: 'collaboratore' }]);
  });

  it('ogni riga porta nome, ruolo, email e le date', () => {
    const r = riga('gius');
    expect(r.nome).toBe('Giuseppe Manager');
    expect(r.ruolo).toBe('manager');
    expect(r.emailAccesso).toBe('g@studio.it');
    expect(r.ultimoIngresso).toBe(giorniFa(2));
    expect(r.staff).toBe(true);
  });

  it('in testa il titolare, poi manager, collaboratori e allievi', () => {
    expect(analizza().righe.map((r) => r.uid)).toEqual(['tit', 'gius', 'anto', 's1']);
  });
});

describe('quello che non torna', () => {
  it('a parità di gravità, l\'accesso sconosciuto viene prima di un manager con un problema', () => {
    const a = accounts().concat([{ uid: 'ignoto', email: 'x@altro.it', creato: giorniFa(4) }]);
    a[1] = { ...a[1], email: 'privata@mail.it' };
    expect(analizza(a).righe.slice(0, 2).map((r) => r.uid)).toEqual(['ignoto', 'gius']);
  });

  it('un accesso senza scheda in anagrafica: grave, e va in cima', () => {
    const a = accounts().concat([{ uid: 'ignoto', email: 'x@altro.it', creato: giorniFa(4) }]);
    const c = analizza(a);
    expect(c.righe[0].uid).toBe('ignoto');
    expect(c.righe[0].nome).toBe('Non in anagrafica');
    expect(c.righe[0].segnalazioni[0]).toEqual(expect.objectContaining({ gravita: 'alta' }));
    expect(c.righe[0].segnalazioni[0].testo).toMatch(/non corrisponde a nessuna persona/);
  });

  // È il segno lasciato da un cambio d'email fatto senza aggiornare la
  // scheda: l'accesso è passato a un indirizzo che lo studio non conosce.
  it('l\'email con cui entra non è quella della scheda: grave se è staff', () => {
    const a = accounts();
    a[0] = { ...a[0], email: 'intruso@mail.it' };
    const r = riga('tit', a);
    expect(r.segnalazioni[0].gravita).toBe('alta');
    expect(r.segnalazioni[0].testo).toMatch(/«intruso@mail\.it».*«f@studio\.it»/);
  });

  it('maiuscole e spazi non contano come email diverse', () => {
    const a = accounts();
    a[1] = { ...a[1], email: ' G@Studio.IT ' };
    expect(riga('gius', a).segnalazioni).toEqual([]);
  });

  it('sessioni chiuse negli ultimi 30 giorni: lo segnala, con la data', () => {
    const a = accounts();
    a[0] = { ...a[0], sessioniValideDal: '2026-11-01T10:00:00Z' };
    const r = riga('tit', a);
    expect(r.segnalazioni[0].gravita).toBe('media');
    expect(r.segnalazioni[0].testo).toMatch(/chiuse il 01\/11\/2026.*password viene cambiata/);
  });

  it('sessioni chiuse al momento della creazione non sono un segnale', () => {
    const a = accounts();
    a[2] = { ...a[2], creato: giorniFa(3), sessioniValideDal: giorniFa(3) };
    expect(riga('anto', a).segnalazioni).toEqual([]);
  });

  it('scheda disattivata ma accesso abilitato', () => {
    const s = schede();
    s[1] = { ...s[1], isActive: false };
    const r = riga('gius', accounts(), s);
    expect(r.schedaDisattivata).toBe(true);
    expect(r.segnalazioni[0].testo).toMatch(/disattivata ma l'accesso è ancora abilitato/);
  });

  it('scheda disattivata e accesso disabilitato: tutto coerente', () => {
    const s = schede();
    s[1] = { ...s[1], isActive: false };
    const a = accounts();
    a[1] = { ...a[1], disabilitato: true };
    expect(riga('gius', a, s).segnalazioni).toEqual([]);
  });

  it('più di un titolare: segnalazione generale, con i nomi', () => {
    const s = schede();
    s[1] = { ...s[1], role: 'owner' };
    const c = analizza(accounts(), s);
    expect(c.conteggi.titolari).toBe(2);
    expect(c.generali[0].gravita).toBe('alta');
    expect(c.generali[0].testo).toMatch(/2 accessi con ruolo di titolare: .*Giuseppe Manager \(g@studio\.it\)/);
  });

  it('nessun titolare: segnalazione generale', () => {
    const s = schede();
    s[0] = { ...s[0], role: 'manager' };
    expect(analizza(accounts(), s).generali[0].testo).toMatch(/Nessun accesso ha il ruolo di titolare/);
  });

  it('staff che non entra da più di 30 giorni o mai: informazione, non allarme', () => {
    const a = accounts();
    a[2] = { ...a[2], ultimoIngresso: giorniFa(45) };
    a.push({ uid: 'ferr', email: 'fe@studio.it', creato: giorniFa(10) });
    const c = analizza(a);
    expect(riga('anto', a).segnalazioni).toEqual([{ gravita: 'bassa', testo: 'Non entra da 45 giorni.' }]);
    expect(riga('ferr', a).segnalazioni).toEqual([{ gravita: 'bassa', testo: 'Non è mai entrato.' }]);
    expect(c.conteggi.conSegnalazioni).toBe(0);
  });
});

describe('robustezza', () => {
  it('elenchi vuoti o rotti non fanno cadere niente', () => {
    expect(analizzaAccessi([], [], ADESSO).righe).toEqual([]);
    expect(analizzaAccessi([null as any, { uid: '' }], [null as any], ADESSO).righe).toEqual([]);
  });

  it('date illeggibili restano vuote, non inventate', () => {
    const r = riga('tit', [{ uid: 'tit', email: 'f@studio.it', creato: 'boh', sessioniValideDal: 'boh' }]);
    expect(r.segnalazioni.some((s) => /chiuse/.test(s.testo))).toBe(false);
  });

  it('il risultato è JSON puro', () => {
    const c = analizza();
    expect(JSON.parse(JSON.stringify(c))).toEqual(c);
  });
});

describe('il ruolo scritto nell\'accesso', () => {
  it('se nell\'accesso c\'è un ruolo di staff diverso dalla scheda: grave', () => {
    const a = accounts();
    a[3] = { ...a[3], ruoloToken: 'manager' }; // allieva con il token da manager
    const r = riga('s1', a);
    expect(r.segnalazioni[0].gravita).toBe('alta');
    expect(r.segnalazioni[0].testo).toMatch(/«manager».*«allievo».*Allinea i ruoli/);
  });

  it('declassato ma con il token da titolare: grave', () => {
    const a = accounts();
    a[1] = { ...a[1], ruoloToken: 'owner' };
    expect(riga('gius', a).segnalazioni[0]).toEqual(expect.objectContaining({ gravita: 'alta' }));
  });

  it('token uguale alla scheda, o assente: niente da dire', () => {
    const a = accounts();
    a[1] = { ...a[1], ruoloToken: 'manager' };
    expect(riga('gius', a).segnalazioni).toEqual([]);
    expect(riga('anto').segnalazioni).toEqual([]);
  });
});
