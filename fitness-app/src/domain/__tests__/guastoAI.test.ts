import fs from 'fs';
import path from 'path';
import {
  leggiGuastoGateway, guastoDiRete, spiegaGuasto, messaggioGuasto,
  messaggioDopoGateway,
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

// ============================================================
// «MI HA RICHIESTO CHIAVE SCADUTA» — e non era vero
// ------------------------------------------------------------
// 23 settembre 2026, dentro la composizione corporea. Il gateway
// fallisce sulle quattro foto, il codice scivola sul vecchio ramo
// diretto, la chiave client d'archivio viene rifiutata, e l'utente
// legge «aggiorna la chiave in Impostazioni AI».
//
// Gli si chiedeva di aggiustare una cosa che non era rotta, per
// risolvere un problema che stava altrove.
// ============================================================

describe('quando fallisce il gateway E POI anche il tentativo diretto', () => {
  it('NON dice mai che la chiave è scaduta: la chiave sta sul server', () => {
    const m = messaggioDopoGateway({ stato: 500 }, true);
    expect(m.toLowerCase()).not.toContain('aggiornala');
    expect(m).toContain('non si tocca');
  });

  it('dice il numero dell\'errore, che è l\'unica cosa utile per capire', () => {
    expect(messaggioDopoGateway({ stato: 413 }, true)).toContain('413');
  });

  // Il caso vero: quattro foto sono un carico grosso.
  it('e suggerisce la cosa che di solito funziona', () => {
    expect(messaggioDopoGateway({ stato: 500 }, true)).toContain('foto più leggere');
  });

  it('se il gateway aveva un guasto che sappiamo leggere, quello resta la causa', () => {
    const m = messaggioDopoGateway({ stato: 503, dettaglio: 'billing account disabled' }, true);
    expect(m).toContain(messaggioGuasto('servizio_sospeso'));
  });

  // Senza il numero non si capisce mai che cosa è successo, e il
  // numero costa niente.
  it('il numero c\'è anche quando la chiave non c\'entra', () => {
    expect(messaggioDopoGateway({ stato: 500 }, false)).toContain('500');
  });

  // L'unico caso in cui «chiave scaduta» è la verità: il gateway
  // non è stato nemmeno provato.
  it('senza gateway provato, allora sì, è la chiave', () => {
    expect(messaggioDopoGateway(null, true)).toContain('Impostazioni AI');
  });

  it('e senza gateway e senza 401, non si inventa una causa', () => {
    const m = messaggioDopoGateway(null, false);
    expect(m).toContain('non ha risposto');
    expect(m.toLowerCase()).not.toContain('chiave');
  });
});

// ============================================================
// LE DUE PORTE MURATE, CHIUSE NEL CODICE
// ============================================================

describe('il servizio AI e la composizione corporea', () => {
  const leggi = (f: string) => fs.readFileSync(
    path.join(__dirname, '..', '..', f), 'utf8'
  );

  it('il ramo vecchio non racconta più la storia della chiave', () => {
    const ai = leggi('services/aiService.ts');
    expect(ai).toContain('messaggioDopoGateway(motivoGateway, true)');
    expect(ai).toContain('motivoGateway = {');
  });

  // Se il gateway cade e nessuno se ne accorge, il messaggio dopo
  // è per forza sbagliato.
  it('e il motivo del guasto del gateway non si perde', () => {
    const ai = leggi('services/aiService.ts');
    expect(ai).toMatch(/stato:\s*gwRes\.status/);
    expect(ai).toMatch(/stato:\s*0/);
  });

  // La funzione passa dal gateway, che la chiave ce l'ha sul
  // server: chiedere una chiave locale bloccava una cosa che
  // avrebbe funzionato.
  it('la composizione corporea non chiede più una chiave che non serve', () => {
    const schermata = leggi('screens/shared/BodyCompositionScreen.tsx');
    expect(schermata).not.toContain('ensureAIApiKey');
    expect(schermata).not.toContain('API Key mancante');
  });
});
