import {
  ARGOMENTI, PROBLEMI, ROTTE_ALLIEVO, TAB_ALLIEVO,
  PERIMETRO, INTRO, bloccoCoach, perId,
} from '../assistenza';

// ============================================================
// L'ASSISTENZA NON PUÒ MENTIRE
// ------------------------------------------------------------
// Una sezione d'aiuto sbagliata è peggio di una sezione d'aiuto
// assente: l'allievo la usa una volta, non trova quello che gli
// è stato promesso, e non ci torna più. Questi test tengono i
// testi ancorati all'app che esiste davvero.
// ============================================================

const TUTTI = [...ARGOMENTI, ...PROBLEMI];

describe('ogni voce porta da qualche parte, o dichiara di non portare', () => {
  it('ogni destinazione è una rotta vera della navigazione allievo', () => {
    TUTTI.forEach((a) => {
      if (!a.vaiA) return;
      expect(ROTTE_ALLIEVO).toContain(a.vaiA.route);
      if (a.vaiA.tab) expect(TAB_ALLIEVO).toContain(a.vaiA.tab);
    });
  });

  it('nessuna destinazione ha un\'etichetta vuota', () => {
    TUTTI.forEach((a) => {
      if (a.vaiA) expect(a.vaiA.etichetta.trim().length).toBeGreaterThan(0);
    });
  });
});

describe('nessun articolo è un guscio vuoto', () => {
  it('ogni voce ha titolo, sommario e almeno due sezioni con testo', () => {
    TUTTI.forEach((a) => {
      expect(a.titolo.trim().length).toBeGreaterThan(0);
      expect(a.sommario.trim().length).toBeGreaterThan(0);
      expect(a.sezioni.length).toBeGreaterThanOrEqual(2);
      a.sezioni.forEach((s) => {
        expect(s.testo.trim().length).toBeGreaterThan(30);
      });
    });
  });

  it('gli id sono unici: due voci non possono rispondersi allo stesso indirizzo', () => {
    const ids = TUTTI.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('perId trova quello che c\'è e non inventa quello che non c\'è', () => {
    expect(perId('checkin')?.titolo).toBe('Check-in in studio');
    expect(perId('non-accedo')?.titolo).toBe('Non riesco ad accedere');
    expect(perId('indice-di-risveglio')).toBeUndefined();
  });
});

describe('le funzioni nominate esistono davvero nell\'app', () => {
  // Il difetto trovato nel mockup: un argomento intitolato
  // «Indice di Risveglio», funzione che nell'app non esiste.
  // Esiste lo Stato ESSĒRE. Un allievo che cerca la prima cosa
  // non la trova, e smette di fidarsi della sezione.
  it('«Indice di Risveglio» non compare da nessuna parte', () => {
    const tutto = JSON.stringify(TUTTI).toLowerCase();
    expect(tutto).not.toContain('indice di risveglio');
  });

  it('lo Stato ESSĒRE è spiegato, e porta alla sua schermata', () => {
    const a = perId('stato-essere')!;
    expect(a.titolo).toContain('Stato ESSĒRE');
    expect(a.vaiA?.route).toBe('StatoEssere');
  });
});

describe('il perimetro sanitario regge anche qui', () => {
  it('la riga di perimetro rimanda al coach o al medico', () => {
    expect(PERIMETRO.toLowerCase()).toContain('salute');
    expect(PERIMETRO.toLowerCase()).toContain('medico');
  });

  it('nessun articolo promette una diagnosi o una cura', () => {
    const tutto = JSON.stringify(TUTTI).toLowerCase();
    ['diagnosi', 'diagnostic', 'terapia', 'cura il ', 'guarigione'].forEach((parola) => {
      expect(tutto).not.toContain(parola);
    });
  });

  it('l\'articolo sui dati del corpo dice anche che cosa NON misura', () => {
    const a = perId('stato-essere')!;
    const testo = a.sezioni.map((s) => `${s.titolo || ''} ${s.testo}`).join(' ');
    expect(testo).toContain('NON misura');
    expect(testo.toLowerCase()).toContain('non è un esame');
  });
});

describe('il blocco del coach non promette quello che non sa', () => {
  // Il difetto del mockup: «Ti risponde negli orari dello studio»
  // stampato sempre, anche con gli orari non configurati. Una
  // fascia oraria promessa e non rispettata è una bugia che
  // l'allievo verifica di persona.
  it('senza orari configurati non promette nessuna fascia oraria', () => {
    const b = bloccoCoach('Giuseppe', undefined);
    expect(b.quandoRisponde).toBeNull();
  });

  it('con gli orari configurati li dice', () => {
    const b = bloccoCoach('Giuseppe', 'dal lunedì al venerdì, 9–20');
    expect(b.quandoRisponde).toBe('Ti risponde dal lunedì al venerdì, 9–20');
  });

  it('orari fatti di soli spazi valgono come non configurati', () => {
    expect(bloccoCoach('Giuseppe', '   ').quandoRisponde).toBeNull();
  });

  it('senza coach assegnato si parla dello studio, non di un nome vuoto', () => {
    const b = bloccoCoach(null, null);
    expect(b.nome).toBe('lo studio');
    expect(b.invito).toBe('Scrivi allo studio');
    expect(b.iniziale).toBe('·');
  });

  it('con il coach assegnato l\'invito lo chiama per nome', () => {
    const b = bloccoCoach('Francesco');
    expect(b.invito).toBe('Scrivi a Francesco');
    expect(b.iniziale).toBe('F');
  });

  // Il terzo difetto del mockup: «Scrivi al tuo coach» che apre
  // l'Assistente (l'AI) farebbe di «c'è sempre una persona
  // dall'altra parte» una frase falsa al primo tocco. E TeamChat
  // è riservata allo staff: un allievo non ci arriva.
  it('il bottone porta alla chat dell\'allievo, non all\'AI né alla chat del team', () => {
    const d = bloccoCoach('Francesco').destinazione;
    expect(d.tab).toBe('Chat');
    expect(d.route).toBe('ChatHome');
    expect(d.route).not.toBe('Assistente');
    expect(d.route).not.toBe('TeamChat');
  });
});

describe('la promessa dell\'introduzione', () => {
  it('dichiara che dall\'altra parte c\'è una persona', () => {
    expect(INTRO.toLowerCase()).toContain('persona');
  });

  it('gli otto argomenti e i cinque problemi ci sono tutti', () => {
    expect(ARGOMENTI).toHaveLength(8);
    expect(PROBLEMI).toHaveLength(5);
  });
});
