// ============================================================
// IL REGISTRO DEVE REGGERE IL GIORNO IN CUI SERVE
// ------------------------------------------------------------
// E il giorno in cui serve è il peggiore: qualcuno se n'è andato,
// qualcosa non c'è più, e bisogna ricostruire che cosa è successo
// con quello che è rimasto scritto.
//
// Questi test difendono le due cose da cui dipende tutto: che una
// riga si legga anche quando la persona e l'oggetto non esistono
// più, e che nessuno — titolare compreso — possa riscriverla.
// ============================================================

import fs from 'fs';
import path from 'path';
import {
  VoceRegistro, descriviVoce, pesoVoce, filtraRegistro, daGuardare,
  riepilogoPersona, riepilogoTutti, giorniDaUltimaVolta,
} from '../registro';

const v = (x: Partial<VoceRegistro> = {}): VoceRegistro => ({
  chi: 'u1', chiNome: 'Giuseppe Esposito', ruolo: 'collaborator',
  azione: 'creato', oggetto: 'allievo', oggettoId: 'a1',
  oggettoNome: 'Maria Rossi', quando: new Date('2026-10-30T10:00:00'),
  ...x,
});

describe('una riga si legge senza il manuale', () => {
  it('dice chi, che cosa e su cosa, in italiano', () => {
    expect(descriviVoce(v({ azione: 'eliminato' })))
      .toBe('Giuseppe Esposito ha eliminato allievo Maria Rossi');
  });

  it("l'ingresso non si porta dietro un oggetto che non c'è", () => {
    expect(descriviVoce(v({ azione: 'entrato', oggetto: 'applicazione', oggettoNome: '' })))
      .toBe('Giuseppe Esposito è entrato');
  });

  // È IL CASO PER CUI IL REGISTRO ESISTE: la persona è stata
  // rimossa, l'allievo cancellato, e la riga deve ancora dire
  // qualcosa. Se il nome lo andassimo a cercare adesso nel database,
  // qui resterebbero due codici e nessun significato.
  it('regge quando la persona e la cosa non esistono più', () => {
    const riga = descriviVoce(v({ azione: 'eliminato' }));
    expect(riga).toContain('Giuseppe Esposito');
    expect(riga).toContain('Maria Rossi');
    expect(riga).not.toContain('u1');
    expect(riga).not.toContain('a1');
  });

  it('e se perfino il nome manca non stampa una riga rotta', () => {
    expect(descriviVoce(v({ chiNome: '', oggettoNome: '' })))
      .toBe('Qualcuno ha creato allievo');
  });
});

describe('non urla a ogni riga', () => {
  it('le eliminazioni si guardano sempre', () => {
    expect(pesoVoce(v({ azione: 'eliminato' }))).toBe('alta');
  });

  it('i soldi si guardano sempre, in qualunque verso', () => {
    expect(pesoVoce(v({ oggetto: 'pagamento', azione: 'creato' }))).toBe('alta');
    expect(pesoVoce(v({ oggetto: 'pagamento', azione: 'modificato' }))).toBe('alta');
  });

  // Un registro che segnala tutto non viene più letto dopo una
  // settimana, e allora tanto vale non averlo.
  it("ma entrare e lavorare non sono fatti da segnalare", () => {
    expect(pesoVoce(v({ azione: 'entrato' }))).toBe('bassa');
    expect(pesoVoce(v({ azione: 'creato', oggetto: 'lezione' }))).toBe('media');
  });

  it('e «da guardare» tiene solo quelle', () => {
    const tutte = [
      v({ azione: 'entrato' }),
      v({ azione: 'eliminato' }),
      v({ oggetto: 'pagamento' }),
      v({ azione: 'creato', oggetto: 'scheda' }),
    ];
    expect(daGuardare(tutte)).toHaveLength(2);
  });
});

describe('leggere il registro', () => {
  const tante = [
    v({ chi: 'u1', quando: new Date('2026-10-28T09:00:00') }),
    v({ chi: 'u2', chiNome: 'Antonio Russo', quando: new Date('2026-10-30T09:00:00') }),
    v({ chi: 'u1', azione: 'eliminato', quando: new Date('2026-10-29T09:00:00') }),
  ];

  it('viene sempre fuori dal più recente', () => {
    const r = filtraRegistro(tante);
    expect(r.map((x) => x.quando.getDate())).toEqual([30, 29, 28]);
  });

  it('un filtro vuoto non nasconde niente', () => {
    expect(filtraRegistro(tante)).toHaveLength(3);
  });

  it('si può guardare una persona sola', () => {
    expect(filtraRegistro(tante, { chi: 'u1' })).toHaveLength(2);
  });

  it('e un periodo', () => {
    const r = filtraRegistro(tante, { da: new Date('2026-10-29T00:00:00') });
    expect(r).toHaveLength(2);
  });

  it('e non modifica l\'elenco che riceve', () => {
    const copia = [...tante];
    filtraRegistro(tante);
    expect(tante).toEqual(copia);
  });
});

describe('che cosa ha fatto una persona', () => {
  const voci = [
    v({ chi: 'u1', azione: 'entrato', quando: new Date('2026-10-20T09:00:00') }),
    v({ chi: 'u1', azione: 'creato', quando: new Date('2026-10-25T09:00:00') }),
    v({ chi: 'u1', azione: 'eliminato', quando: new Date('2026-10-28T09:00:00') }),
    v({ chi: 'u2', chiNome: 'Antonio Russo', azione: 'entrato' }),
  ];

  it('conta per tipo di azione', () => {
    const r = riepilogoPersona(voci, 'u1');
    expect(r.totale).toBe(3);
    expect(r.perAzione.eliminato).toBe(1);
    expect(r.perAzione.modificato).toBe(0);
  });

  // È IL DATO PIÙ UTILE DI TUTTI, e prima del 30 ottobre 2026 non
  // era ricavabile in nessun modo: dice se chi prende una
  // percentuale sta ancora lavorando.
  it("tiene l'ultima volta che si è vista", () => {
    const r = riepilogoPersona(voci, 'u1');
    expect(r.ultimaVolta?.getDate()).toBe(28);
    expect(giorniDaUltimaVolta(r, new Date('2026-10-30T09:00:00'))).toBe(2);
  });

  it('e «mai vista» non diventa «zero giorni fa»', () => {
    const r = riepilogoPersona(voci, 'nessuno');
    expect(r.ultimaVolta).toBeNull();
    expect(giorniDaUltimaVolta(r)).toBeNull();
  });

  it('tutti insieme, dal più attivo', () => {
    const r = riepilogoTutti(voci);
    expect(r[0].chi).toBe('u1');
    expect(r[0].nome).toBe('Giuseppe Esposito');
    expect(r).toHaveLength(2);
  });
});

// ============================================================
// LA PARTE CHE PROTEGGE IL TITOLARE DA SÉ STESSO
// ------------------------------------------------------------
// Un registro che il proprietario può correggere non dimostra
// niente davanti a nessuno — né a un collaboratore, né a un
// commercialista, né a un giudice. Il suo valore viene per intero
// dal fatto che non lo tocca neanche lui.
// ============================================================

describe('nessuno riscrive il passato', () => {
  const sorgente = fs.readFileSync(
    path.join(__dirname, '..', 'registro.ts'), 'utf8'
  );
  const regole = fs.readFileSync(
    path.join(__dirname, '..', '..', '..', 'firestore.rules'), 'utf8'
  );

  it('qui dentro non esiste nessuna funzione che modifichi una voce', () => {
    expect(sorgente).not.toMatch(/export const (modifica|aggiorna|correggi|rimuovi|cancella)/);
  });

  it('e nelle regole il registro si scrive una volta sola', () => {
    const i = regole.indexOf('match /registro/{voceId}');
    expect(i).toBeGreaterThan(-1);
    const blocco = regole.slice(i, regole.indexOf('\n    }', i));
    expect(blocco).toMatch(/allow update, delete: if false;/);
  });

  it('lo legge solo il titolare', () => {
    const i = regole.indexOf('match /registro/{voceId}');
    const blocco = regole.slice(i, regole.indexOf('\n    }', i));
    expect(blocco).toMatch(/allow read: if isOwner\(\);/);
  });

  // Se solo lo staff potesse scrivere, le azioni degli allievi non
  // finirebbero mai nel registro — e nemmeno quelle di un account
  // che qualcuno ha appena declassato.
  it('ma chiunque sia dentro può lasciare una riga', () => {
    const i = regole.indexOf('match /registro/{voceId}');
    const blocco = regole.slice(i, regole.indexOf('\n    }', i));
    expect(blocco).toMatch(/allow create: if isAuthenticated\(\)/);
  });
});

// ============================================================
// 31 ottobre 2026, 01:15 — «SENZA NOME»
// ------------------------------------------------------------
// Il titolare apre il Registro per la prima volta e legge una riga
// firmata «Senza nome». Era lui.
//
// L'autore lo impostava solo `signIn`. Ma chi ha già la sessione
// aperta non passa mai di lì: riapre l'app e basta. Quindi ogni riga
// di chi non si era appena autenticato nasceva senza nome — cioè
// senza la cosa per cui il registro esiste.
// ============================================================

describe('il registro sa chi è anche a sessione già aperta', () => {
  const auth = fs.readFileSync(
    path.join(__dirname, '..', '..', 'hooks', 'useAuth.ts'), 'utf8'
  );

  it("l'autore si imposta quando il profilo arriva, non solo al login", () => {
    expect(auth).toMatch(/impostaAutoreRegistro\(/);
    const i = auth.indexOf('impostaAutoreRegistro(');
    // deve stare dentro il ramo che ha un profilo, non altrove
    expect(auth.slice(i - 200, i)).toMatch(/if \(profile\)/);
  });

  it('e si dimentica quando la sessione cade', () => {
    expect(auth).toMatch(/dimenticaAutoreRegistro\(\);/);
  });

  it('col nome e il cognome, non col solo identificativo', () => {
    const i = auth.indexOf('impostaAutoreRegistro(');
    expect(auth.slice(i, i + 220)).toMatch(/profile\.name.*profile\.surname/s);
  });
});

// ============================================================
// 2 novembre 2026 — «DAMMI LA SICUREZZA CHE SCRIVE TUTTO»
// ------------------------------------------------------------
// La persona, l'allievo, quando e a che ora. Sono andato a provarlo
// invece di rispondere a memoria, e l'ora c'era ma l'ANNO no: la
// riga diceva «2 nov, 14:37».
//
// Fra otto mesi, o davanti a qualcuno che chiede quando, quella riga
// non vale niente — non si distingue dal 2 novembre dell'anno prima.
// Un registro senza anno non è una prova: è un appunto.
// ============================================================

describe('la riga dice la persona, l\'allievo, il giorno e l\'ora', () => {
  const schermata = fs.readFileSync(
    path.join(__dirname, '..', '..', 'screens', 'owner', 'RegistroScreen.tsx'), 'utf8'
  );

  it('la data porta anche l\'anno', () => {
    const i = schermata.indexOf('const quando =');
    const blocco = schermata.slice(i, i + 300);
    expect(blocco).toMatch(/year: 'numeric'/);
    expect(blocco).toMatch(/hour: '2-digit'/);
    expect(blocco).toMatch(/minute: '2-digit'/);
  });

  it('e si formatta con toLocaleString, non con la sola data', () => {
    const i = schermata.indexOf('const quando =');
    expect(schermata.slice(i, i + 200)).toMatch(/toLocaleString\('it-IT'/);
  });

  it('la riga mostra anche il ruolo di chi ha agito', () => {
    expect(schermata).toMatch(/v\.ruolo \? ` · \$\{v\.ruolo\}`/);
  });

  it('e il testo porta persona e allievo dentro la stessa frase', () => {
    const v: VoceRegistro = {
      chi: 'g', chiNome: 'Giuseppe Calabrese', ruolo: 'manager',
      azione: 'modificato', oggetto: 'lezione',
      oggettoId: 's1', oggettoNome: 'Mario Milo',
      quando: new Date('2026-11-02T14:37:00'),
      dettaglio: 'segnata come svolta',
    };
    const riga = descriviVoce(v);
    expect(riga).toContain('Giuseppe Calabrese');
    expect(riga).toContain('Mario Milo');
    expect(riga).toContain('lezione');
  });
});

// ============================================================
// 9 novembre 2026 — «VOGLIO VEDERE SOLO I MIEI COLLABORATORI»
// ------------------------------------------------------------
// «Le persone» chiamava `riepilogoTutti(voci)`: elencava CHIUNQUE
// avesse lasciato una riga nel registro. Il titolare compreso, ogni
// allievo che fa login (una riga «entrato»), e i conti di prova.
// Il titolare non vuole monitorare sé stesso né i suoi allievi: vuole
// vedere chi lavora per lui — i collaboratori e i manager.
//
// Il filtro è per RUOLO, non per nome: inchiodare tre nomi nel codice
// si rompe al primo collaboratore nuovo o al primo che se ne va.
// ============================================================

describe('«Le persone» mostra solo i collaboratori e i manager', () => {
  const schermata = fs.readFileSync(
    path.join(__dirname, '..', '..', 'screens', 'owner', 'RegistroScreen.tsx'), 'utf8'
  );

  it('non elenca più chiunque compaia nel registro', () => {
    // `riepilogoTutti` tirava dentro il titolare e ogni allievo: non
    // deve più reggere la lista delle persone.
    expect(schermata).not.toMatch(/riepilogoTutti/);
  });

  it('costruisce la lista dai collaboratori e dai manager', () => {
    expect(schermata).toMatch(/getCollaborators/);
    expect(schermata).toMatch(/getManagers/);
    expect(schermata).toMatch(/\[\s*\.\.\.collaboratori,\s*\.\.\.manager\s*\]/);
  });

  it('e per ciascuno legge il suo riepilogo, anche a zero attività', () => {
    expect(schermata).toMatch(/staff\s*\n?\s*\.map/);
    expect(schermata).toMatch(/riepilogoPersona\(voci/);
  });
});

// ============================================================
// 11 novembre 2026 — TENTATIVI E ACCESSI: FRASI INTERE
// ============================================================

describe('le righe degli accessi si leggono senza buchi', () => {
  const base = { chi: 'g', chiNome: 'Giuseppe Manager', ruolo: 'manager', oggettoId: '', quando: new Date() };

  it('un tentativo dice che cosa si provava a fare, e su chi', () => {
    expect(descriviVoce({ ...base, azione: 'tentato', oggetto: 'accesso', oggettoNome: 'Francesco Titolare', tentativo: 'cambiare la password' }))
      .toBe('Giuseppe Manager ha tentato di cambiare la password: Francesco Titolare');
  });

  it('un tentativo senza bersaglio non lascia la frase a metà', () => {
    expect(descriviVoce({ ...base, azione: 'tentato', oggetto: 'pagamento', oggettoNome: '', tentativo: 'leggere il rapporto del mattino' }))
      .toBe('Giuseppe Manager ha tentato di leggere il rapporto del mattino');
  });

  it('un tentativo senza descrizione dice comunque una cosa vera', () => {
    expect(descriviVoce({ ...base, azione: 'tentato', oggetto: 'accesso', oggettoNome: '' }))
      .toBe("Giuseppe Manager ha tentato di fare un'operazione riservata al titolare");
  });

  it('una modifica di accesso senza nome dice «un accesso»', () => {
    expect(descriviVoce({ ...base, chiNome: 'Francesco Titolare', azione: 'modificato', oggetto: 'accesso', oggettoNome: '' }))
      .toBe('Francesco Titolare ha modificato un accesso');
  });

  it('con il nome, la frase è quella di sempre', () => {
    expect(descriviVoce({ ...base, chiNome: 'Francesco Titolare', azione: 'creato', oggetto: 'accesso', oggettoNome: 'Maria Bianchi' }))
      .toBe("Francesco Titolare ha creato l'accesso di Maria Bianchi");
  });

  it('nessuna frase degli accessi finisce con una parola sospesa', () => {
    for (const azione of ['creato', 'modificato', 'eliminato', 'tentato'] as const) {
      const f = descriviVoce({ ...base, azione, oggetto: 'accesso', oggettoNome: '' });
      expect(f).not.toMatch(/\b(di|il|la|l'accesso di)$/);
    }
  });

  it('tentativi e accessi si guardano per primi', () => {
    expect(pesoVoce({ ...base, azione: 'tentato', oggetto: 'pagamento', oggettoNome: '' })).toBe('alta');
    expect(pesoVoce({ ...base, azione: 'modificato', oggetto: 'accesso', oggettoNome: '' })).toBe('alta');
  });
});
