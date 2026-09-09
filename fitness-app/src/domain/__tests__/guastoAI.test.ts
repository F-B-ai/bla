import {
  leggiGuastoGateway, guastoDiRete, spiegaGuasto, messaggioGuasto,
} from '../guastoAI';

// ============================================================
// IL MESSAGGIO NON DEVE MAI ACCUSARE LA CONNESSIONE PER SBAGLIO
// ------------------------------------------------------------
// Il 9 settembre l'app ha detto «controlla la connessione internet»
// mentre il problema era la fatturazione Google sospesa. Il titolare
// ha cercato dalla parte sbagliata per ore, con un cliente davanti.
// Questi test impediscono che succeda di nuovo.
// ============================================================

describe('il caso vero: fatturazione sospesa', () => {
  // Il log del server diceva esattamente questa frase. Se il gateway
  // ce la ripassa, dev'essere riconosciuta a colpo sicuro.
  it('riconosce la firma di Google, qualunque sia il codice', () => {
    const corpo = 'The request failed because billing is disabled for this project.';
    expect(leggiGuastoGateway(500, corpo)).toBe('servizio_sospeso');
    expect(leggiGuastoGateway(503, corpo)).toBe('servizio_sospeso');
    expect(leggiGuastoGateway(403, corpo)).toBe('servizio_sospeso');
  });

  it('il 503 nudo è comunque servizio spento, non problema di rete', () => {
    expect(leggiGuastoGateway(503)).toBe('servizio_sospeso');
  });

  it('il messaggio dice DOVE guardare, e che non è la connessione', () => {
    const s = spiegaGuasto('servizio_sospeso');
    expect(s.testo).toContain('Non è la tua connessione');
    expect(s.testo.toLowerCase()).toContain('fatturazione');
    expect(s.ritentabile).toBe(false);
  });

  it('e rassicura su ciò che continua a funzionare', () => {
    const s = spiegaGuasto('servizio_sospeso');
    expect(s.testo).toMatch(/schede|agenda|misure/i);
  });
});

describe('ogni esito ha il suo, e nessuno si sovrappone', () => {
  it('200 non è un guasto', () => {
    expect(leggiGuastoGateway(200)).toBeNull();
    expect(leggiGuastoGateway(204)).toBeNull();
  });

  it('401 e 403 sono sessione scaduta', () => {
    expect(leggiGuastoGateway(401)).toBe('sessione_scaduta');
    expect(leggiGuastoGateway(403)).toBe('sessione_scaduta');
  });

  it('502 con parole di credito è credito esaurito', () => {
    expect(leggiGuastoGateway(502, '{"detail":"insufficient credit balance"}'))
      .toBe('credito_esaurito');
    expect(leggiGuastoGateway(502, '{"message":"quota exceeded"}'))
      .toBe('credito_esaurito');
  });

  it('502 senza quelle parole è un errore del server', () => {
    expect(leggiGuastoGateway(502, '{"detail":"upstream timeout"}'))
      .toBe('server_in_errore');
  });

  it('500 è errore del server', () => {
    expect(leggiGuastoGateway(500, 'internal error')).toBe('server_in_errore');
  });
});

describe('la distinzione che mancava: sono io o è il server?', () => {
  it('dispositivo dichiarato offline: allora sì, è la connessione', () => {
    expect(guastoDiRete(false)).toBe('dispositivo_offline');
    expect(spiegaGuasto('dispositivo_offline').testo).toMatch(/wi-fi|dati mobili/i);
  });

  // Questo è il test che vale il file: rete attiva + server muto
  // NON è colpa dell'utente, e il messaggio non deve dirglielo.
  it('dispositivo online ma server muto: NON si accusa la connessione', () => {
    expect(guastoDiRete(true)).toBe('server_irraggiungibile');
    const s = spiegaGuasto('server_irraggiungibile');
    expect(s.testo).toContain('non è un problema tuo');
  });

  it('se non si sa se c\'è rete, non si dà la colpa all\'utente', () => {
    expect(guastoDiRete(undefined)).toBe('server_irraggiungibile');
  });
});

describe('nessun messaggio accusa la rete quando la rete non c\'entra', () => {
  const nonDiRete = [
    'servizio_sospeso', 'server_in_errore', 'credito_esaurito',
    'sessione_scaduta', 'risposta_vuota', 'server_irraggiungibile',
  ] as const;

  it('«controlla la connessione» compare solo quando sei davvero offline', () => {
    nonDiRete.forEach((g) => {
      expect(spiegaGuasto(g).testo.toLowerCase()).not.toContain('controlla la connessione');
    });
    expect(spiegaGuasto('dispositivo_offline').testo.toLowerCase())
      .toContain('controlla wi-fi');
  });

  it('ogni messaggio dice che cosa fare, non solo che è andata male', () => {
    ([...nonDiRete, 'dispositivo_offline'] as const).forEach((g) => {
      const t = spiegaGuasto(g).testo;
      expect(t.length).toBeGreaterThan(40);
      expect(/riprova|controlla|esci|ricarica|guardat/i.test(t)).toBe(true);
    });
  });

  it('i guasti che richiedono un intervento non invitano a riprovare a vuoto', () => {
    (['servizio_sospeso', 'credito_esaurito', 'sessione_scaduta'] as const)
      .forEach((g) => expect(spiegaGuasto(g).ritentabile).toBe(false));
  });

  it('il testo unito porta titolo e spiegazione', () => {
    const m = messaggioGuasto('servizio_sospeso');
    expect(m).toContain('Il servizio è sospeso');
    expect(m).toContain('fatturazione');
  });
});
