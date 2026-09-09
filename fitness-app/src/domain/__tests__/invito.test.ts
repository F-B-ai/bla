import {
  normalizzaCodice, invitoPubblico, valutaFreno, dopoFallimento, dopoSuccesso,
  messaggioValidazione, InvitoArchiviato, StatoTentativi,
  TENTATIVI_MAX, FINESTRA_MINUTI, LUNGHEZZA_CODICE,
} from '../invito';

// ============================================================
// L'INVITO NON DEVE POTER USCIRE IN BLOCCO
// ------------------------------------------------------------
// Questi test tengono chiuso il buco dell'8 settembre: la collezione
// degli inviti era leggibile da chiunque, senza autenticarsi.
// ============================================================

const archiviato = (): InvitoArchiviato => ({
  id: 'inv1',
  inviteCode: 'AB2CD3',
  email: 'maria@example.com',
  name: 'Maria',
  surname: 'Rossi',
  assignedCollaboratorId: 'coach7',
  assignedCollaboratorName: 'Giuseppe Calabrese',
  createdBy: 'owner1',
  createdByName: 'Francesco Busanca',
  isUsed: false,
});

describe('il codice come lo scrive una persona vera', () => {
  it('accetta minuscolo, spazi e trattini: si detta a voce', () => {
    ['ab2cd3', 'AB2 CD3', 'ab2-cd3', '  AB2CD3  '].forEach((s) => {
      expect(normalizzaCodice(s)).toBe('AB2CD3');
    });
  });

  it('un codice di lunghezza sbagliata non arriva nemmeno al database', () => {
    expect(normalizzaCodice('AB2CD')).toBeNull();
    expect(normalizzaCodice('AB2CD34')).toBeNull();
    expect(normalizzaCodice('')).toBeNull();
    expect(normalizzaCodice(null)).toBeNull();
    expect(normalizzaCodice(undefined)).toBeNull();
  });

  // I e O non esistono nell'alfabeto proprio perché si confondono
  // con 1 e 0: se arrivano, è un codice sbagliato, non da indovinare.
  it('le lettere fuori alfabeto sono un codice sbagliato, non da correggere', () => {
    expect(normalizzaCodice('ABICD3')).toBeNull();
    expect(normalizzaCodice('AB0CD3')).toBeNull();
    expect(normalizzaCodice('AB1CD3')).toBeNull();
  });

  it('la lunghezza dichiarata è quella che si controlla', () => {
    expect(normalizzaCodice('A'.repeat(LUNGHEZZA_CODICE))).toHaveLength(LUNGHEZZA_CODICE);
  });
});

describe('che cosa esce da un invito, e che cosa resta dentro', () => {
  it('escono solo i campi che servono a completare la registrazione', () => {
    const p = invitoPubblico(archiviato());
    expect(Object.keys(p).sort()).toEqual(
      ['cognome', 'collaboratoreId', 'collaboratoreNome', 'email', 'id', 'nome'].sort()
    );
  });

  // Il confine: esce ciò che riguarda l'invitato — compreso il coach
  // che gli è stato assegnato, che gli conferma che il codice è suo.
  // Non esce ciò che riguarda l'interno dello studio.
  it('il coach assegnato esce: è il suo', () => {
    expect(invitoPubblico(archiviato()).collaboratoreNome).toBe('Giuseppe Calabrese');
  });

  it('chi ha creato l\'invito non esce', () => {
    const s = JSON.stringify(invitoPubblico(archiviato()));
    expect(s).not.toContain('Francesco');
    expect(s).not.toContain('owner1');
  });

  it('non esce nemmeno il codice stesso', () => {
    expect(JSON.stringify(invitoPubblico(archiviato()))).not.toContain('AB2CD3');
  });

  it('un invito senza collaboratore non produce undefined', () => {
    const senza = {...archiviato(), assignedCollaboratorId: undefined};
    expect(invitoPubblico(senza).collaboratoreId).toBe('');
  });
});

describe('il freno sui tentativi', () => {
  const T0 = 1_757_000_000_000;
  const finestraMs = FINESTRA_MINUTI * 60 * 1000;

  it('il primo tentativo passa sempre, e apre la finestra', () => {
    const r = valutaFreno(null, T0);
    expect(r.consentito).toBe(true);
    expect(r.nuovoStato).toEqual({falliti: 0, inizioFinestra: T0});
  });

  it('sotto il tetto si passa', () => {
    const stato: StatoTentativi = {falliti: TENTATIVI_MAX - 1, inizioFinestra: T0};
    expect(valutaFreno(stato, T0 + 1000).consentito).toBe(true);
  });

  it('al tetto si blocca e dice fra quanto riprovare', () => {
    const stato: StatoTentativi = {falliti: TENTATIVI_MAX, inizioFinestra: T0};
    const r = valutaFreno(stato, T0 + 60_000);
    expect(r.consentito).toBe(false);
    expect(r.riprovaFra).toBe((finestraMs - 60_000) / 1000);
  });

  it('scaduta la finestra si riparte da zero', () => {
    const stato: StatoTentativi = {falliti: TENTATIVI_MAX + 50, inizioFinestra: T0};
    const r = valutaFreno(stato, T0 + finestraMs);
    expect(r.consentito).toBe(true);
    expect(r.nuovoStato.falliti).toBe(0);
  });

  it('un fallimento incrementa senza spostare la finestra', () => {
    const stato: StatoTentativi = {falliti: 3, inizioFinestra: T0};
    expect(dopoFallimento(stato)).toEqual({falliti: 4, inizioFinestra: T0});
  });

  // Chi ha davvero il suo invito non deve mai incontrare il freno,
  // nemmeno se ha sbagliato a digitare le prime volte.
  it('un successo azzera il conto', () => {
    expect(dopoSuccesso(T0 + 5000)).toEqual({falliti: 0, inizioFinestra: T0 + 5000});
  });

  it('il blocco non è eterno: dopo la finestra si rientra', () => {
    let stato: StatoTentativi = {falliti: 0, inizioFinestra: T0};
    for (let i = 0; i < TENTATIVI_MAX; i++) stato = dopoFallimento(stato);
    expect(valutaFreno(stato, T0 + 1000).consentito).toBe(false);
    expect(valutaFreno(stato, T0 + finestraMs + 1).consentito).toBe(true);
  });
});

describe('il messaggio non regala informazioni', () => {
  // Se «codice inesistente» e «codice già usato» dessero risposte
  // diverse, un estraneo saprebbe quando ha trovato un codice vero.
  it('codice sbagliato e codice già usato dicono la stessa cosa', () => {
    expect(messaggioValidazione('non_valido')).toContain('non valido o già utilizzato');
  });

  it('il blocco dice quanto aspettare, in minuti interi', () => {
    expect(messaggioValidazione('troppi_tentativi', 300)).toContain('5 minuti');
    expect(messaggioValidazione('troppi_tentativi', 30)).toContain('1 minuto');
  });

  it('il messaggio di blocco offre sempre una via d\'uscita', () => {
    expect(messaggioValidazione('troppi_tentativi', 600)).toContain('coach');
  });

  it('nessun messaggio nomina la collezione o un campo del database', () => {
    (['valido', 'non_valido', 'troppi_tentativi'] as const).forEach((e) => {
      const m = messaggioValidazione(e, 120).toLowerCase();
      expect(m).not.toContain('firestore');
      expect(m).not.toContain('studentinvites');
      expect(m).not.toContain('document');
    });
  });
});
