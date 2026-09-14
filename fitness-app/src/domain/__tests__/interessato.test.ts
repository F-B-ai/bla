import {
  controllaSoggetto, vaSulGemello, giorniRimasti, scaduta,
  descriviScadenza, confermaCancellazione, confermaCollegamento,
  GIORNI_CONSERVAZIONE, eInteressato, ordinaPerData, spiegaElencoFallito,
} from '../interessato';

// ============================================================
// «LA POSSO FARE ANCHE A UN ALLIEVO NON REGISTRATO?»
// ------------------------------------------------------------
// Il difetto era di modello: la scheda pretendeva un account. Ma
// l'onboarding si fa DURANTE la consulenza, prima che la persona
// decida. Costringere a registrarla per farle le domande significa
// creare allievi che non lo diventeranno mai.
// ============================================================

const GIORNO = 24 * 60 * 60 * 1000;
const OGGI = new Date('2026-09-12T10:00:00');
const giorniFa = (n: number) => new Date(OGGI.getTime() - n * GIORNO);

describe('di chi è la scheda', () => {
  it('un allievo ha bisogno del suo id', () => {
    expect(controllaSoggetto({ tipo: 'allievo', studentId: 'a1', nome: 'Marco' }).ok).toBe(true);
    expect(controllaSoggetto({ tipo: 'allievo', nome: 'Marco' }).ok).toBe(false);
  });

  // Il punto di tutta la richiesta: basta un nome.
  it('un interessato ha bisogno solo di un nome', () => {
    expect(controllaSoggetto({ tipo: 'interessato', nome: 'Anna Verdi' }).ok).toBe(true);
  });

  it('senza nome non si salva niente', () => {
    const e = controllaSoggetto({ tipo: 'interessato', nome: 'A' });
    expect(e.ok).toBe(false);
    expect(e.problemi.join(' ')).toContain('nome');
  });

  it('il telefono è facoltativo, ma se c\'è dev\'essere un numero', () => {
    expect(controllaSoggetto({ tipo: 'interessato', nome: 'Anna' }).ok).toBe(true);
    expect(controllaSoggetto({ tipo: 'interessato', nome: 'Anna', telefono: '333 1234567' }).ok)
      .toBe(true);
    expect(controllaSoggetto({ tipo: 'interessato', nome: 'Anna', telefono: '33' }).ok)
      .toBe(false);
  });

  it('senza scegliere il tipo non si va avanti', () => {
    expect(controllaSoggetto({ nome: 'Anna' }).ok).toBe(false);
  });
});

describe('il gemello', () => {
  // Un interessato non ha un account, non ha una storia, e potrebbe
  // non averla mai. Scriverci sopra creerebbe metà persona nel sistema.
  it('la scheda di un interessato NON tocca il gemello', () => {
    expect(vaSulGemello('interessato')).toBe(false);
  });

  it('quella di un allievo sì', () => {
    expect(vaSulGemello('allievo')).toBe(true);
  });
});

describe('la scadenza — perché i dati di chi non è entrato non restano per sempre', () => {
  it('una scheda di oggi ha tutti i giorni davanti', () => {
    expect(giorniRimasti(OGGI, OGGI)).toBe(GIORNI_CONSERVAZIONE);
  });

  it('dopo tre mesi è scaduta', () => {
    expect(scaduta(giorniFa(GIORNI_CONSERVAZIONE + 1), OGGI)).toBe(true);
  });

  it('il giorno prima non lo è ancora', () => {
    expect(scaduta(giorniFa(GIORNI_CONSERVAZIONE - 1), OGGI)).toBe(false);
  });

  it('una data storta non fa sparire una scheda per sbaglio', () => {
    expect(scaduta(new Date('boh'), OGGI)).toBe(false);
  });
});

describe('come si dice la scadenza', () => {
  it('appena fatta, ricorda solo che non è collegata', () => {
    const r = descriviScadenza(OGGI, OGGI);
    expect(r).toMatch(/non è collegata/i);
    expect(r).not.toContain('giorni');
  });

  it('sotto le due settimane conta i giorni', () => {
    expect(descriviScadenza(giorniFa(GIORNI_CONSERVAZIONE - 10), OGGI))
      .toContain('10 giorni');
  });

  it('il singolare non diventa «1 giorni»', () => {
    const r = descriviScadenza(giorniFa(GIORNI_CONSERVAZIONE - 1), OGGI);
    expect(r).toContain('Ancora un giorno');
    expect(r).not.toContain('1 giorni');
  });

  it('scaduta, lo dice senza girarci intorno', () => {
    expect(descriviScadenza(giorniFa(200), OGGI)).toContain('va cancellata');
  });
});

describe('le due conferme', () => {
  // Non «sei sicuro?»: che cosa sparisce, e che non torna.
  it('cancellare dice che cosa si perde e che la consulenza va rifatta', () => {
    const c = confermaCancellazione('Anna Verdi');
    expect(c).toContain('Anna Verdi');
    expect(c).toContain('Non si recupera');
    expect(c).toContain('rifatta');
    expect(c).not.toMatch(/sei sicuro/i);
  });

  it('senza nome non lascia un buco nella frase', () => {
    expect(confermaCancellazione('  ')).toContain('questa persona');
  });

  // Collegare è il passaggio che rende la scheda definitiva.
  it('collegare dice che da lì in poi non si cancella più', () => {
    const c = confermaCollegamento('Anna Verdi', 'Anna Verdi');
    expect(c).toContain('non si cancella più');
    expect(c).toContain('primo atto');
  });
});

// ============================================================
// «NON VEDO NESSUN CAMBIAMENTO» — 13 settembre 2026
// ------------------------------------------------------------
// L'elenco delle consulenze in sospeso era vuoto perché la lettura
// falliva (indice mancante) e un catch la trasformava in zero righe.
// Sullo schermo, «non c'è nessuno» e «è rotto» erano identici.
// ============================================================

describe('chi finisce nell\'elenco delle consulenze in sospeso', () => {
  it('chi è marcato interessato', () => {
    expect(eInteressato({ tipoSoggetto: 'interessato', studentId: '' })).toBe(true);
  });

  it('non un allievo vero', () => {
    expect(eInteressato({ tipoSoggetto: 'allievo', studentId: 'a1' })).toBe(false);
  });

  // Una scheda senza allievo non può essere di nessuno: o è nata prima
  // che il tipo esistesse, o è stata salvata da un telefono con la
  // versione vecchia. È lavoro fatto da qualcuno: non si perde.
  it('e chi non ha nessun allievo, comunque sia finito lì', () => {
    expect(eInteressato({ studentId: '' })).toBe(true);
    expect(eInteressato({})).toBe(true);
    expect(eInteressato({ tipoSoggetto: 'allievo', studentId: '   ' })).toBe(true);
  });
});

describe('l\'ordine: la più recente in cima', () => {
  it('mette davanti la più nuova', () => {
    const r = ordinaPerData([
      { id: 'vecchia', date: new Date(2026, 0, 1) },
      { id: 'nuova', date: new Date(2026, 8, 12) },
      { id: 'mezzo', date: new Date(2026, 4, 1) },
    ]);
    expect(r.map((x) => x.id)).toEqual(['nuova', 'mezzo', 'vecchia']);
  });

  it('una data mancante o storta non fa sparire la scheda', () => {
    const r = ordinaPerData([
      { id: 'senza' },
      { id: 'buona', date: new Date(2026, 8, 12) },
      { id: 'storta', date: new Date('boh') },
    ]);
    expect(r).toHaveLength(3);
    expect(r[0].id).toBe('buona');
  });

  it('non modifica la lista di partenza', () => {
    const partenza = [
      { id: 'a', date: new Date(2026, 0, 1) },
      { id: 'b', date: new Date(2026, 8, 1) },
    ];
    ordinaPerData(partenza);
    expect(partenza.map((x) => x.id)).toEqual(['a', 'b']);
  });
});

describe('quando la lettura non riesce, si dice che cosa è successo', () => {
  // La regola sopra ogni altra: mai far passare un guasto per un vuoto.
  it('nessuna frase fa credere che le consulenze siano perse', () => {
    ['permission-denied', 'failed-precondition: index', 'unavailable', 'boh']
      .forEach((e) => {
        const f = spiegaElencoFallito(e);
        expect(f.length).toBeGreaterThan(30);
        expect(f).toMatch(/non sono perse|NON sono perse|non riesco/i);
      });
  });

  it('i permessi si riconoscono e si spiegano', () => {
    expect(spiegaElencoFallito({ code: 'permission-denied' }))
      .toContain('permessi');
  });

  it('l\'indice mancante dice che è la lettura a non riuscire', () => {
    const f = spiegaElencoFallito({ code: 'failed-precondition' });
    expect(f).toContain('indice');
    expect(f).toContain('NON sono perse');
  });

  it('la rete assente non si confonde con un database vuoto', () => {
    expect(spiegaElencoFallito(new Error('client is offline')))
      .toContain('connessione');
  });

  it('un errore che non conosco non diventa silenzio', () => {
    expect(spiegaElencoFallito(null)).toContain('Non riesco a leggere');
  });
});
