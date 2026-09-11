import {
  classificaErrore, messaggioCaricamento, nomeVista, perIlRegistro, EsitoFoto,
} from '../caricamentoFoto';

// ============================================================
// IL MESSAGGIO CHE HA NASCOSTO DUE GIORNI DI GUASTO
// ------------------------------------------------------------
// Il vecchio codice diceva sempre «lo spazio di archiviazione è
// esaurito». Lo spazio era pieno allo 0,4 %: il motivo vero era un
// permesso negato. Un messaggio che indovina manda a cercare nel
// posto sbagliato — ed è esattamente quello che è successo.
// ============================================================

const ok = (vista: any): EsitoFoto => ({ vista, ok: true });
const ko = (vista: any, motivo: any, dettaglio = 'x'): EsitoFoto =>
  ({ vista, ok: false, motivo, dettaglio });

describe('riconoscere il motivo vero', () => {
  it('il permesso negato di Firebase si riconosce dal codice', () => {
    expect(classificaErrore({ code: 'storage/unauthorized' })).toBe('permesso');
  });

  // È il messaggio esatto che è comparso l'11 settembre.
  it('e anche dal testo: «User does not have permission to access»', () => {
    expect(classificaErrore(new Error('Firebase Storage: User does not have permission to access \'\'')))
      .toBe('permesso');
  });

  it('lo spazio esaurito è un\'altra cosa, e si riconosce', () => {
    expect(classificaErrore({ code: 'storage/quota-exceeded' })).toBe('spazio');
  });

  it('la rete caduta è un\'altra cosa ancora', () => {
    expect(classificaErrore(new Error('Failed to fetch'))).toBe('rete');
    expect(classificaErrore({ code: 'storage/retry-limit-exceeded' })).toBe('rete');
  });

  it('quello che non sappiamo si chiama «sconosciuto», non «spazio esaurito»', () => {
    expect(classificaErrore(new Error('qualcosa di strano'))).toBe('sconosciuto');
    expect(classificaErrore(null)).toBe('sconosciuto');
  });
});

describe('che cosa legge la persona', () => {
  it('tutto a posto: si dice, e il modulo si può svuotare', () => {
    const m = messaggioCaricamento([ok('front'), ok('back')]);
    expect(m.titolo).toBe('Valutazione salvata');
    expect(m.tieniLeFoto).toBe(false);
  });

  // La regola: se qualcosa non è riuscito, non si scrive «Successo».
  it('se una foto non sale, il titolo NON dice successo', () => {
    const m = messaggioCaricamento([ok('front'), ko('back', 'permesso')]);
    expect(m.titolo).not.toMatch(/success/i);
    expect(m.titolo).toContain('senza le foto');
  });

  it('dice QUALE foto, con il nome che si usa parlando', () => {
    const m = messaggioCaricamento([ko('side_left', 'permesso')]);
    expect(m.testo).toContain('laterale sinistra');
    expect(m.testo).not.toContain('side_left');
  });

  it('con più foto fallite le elenca tutte', () => {
    const m = messaggioCaricamento([ko('front', 'rete'), ko('back', 'rete')]);
    expect(m.testo).toContain('Frontale');
    expect(m.testo).toContain('Posteriore');
  });

  // Il difetto che ha reso il guasto invisibile.
  it('il permesso negato NON viene raccontato come spazio esaurito', () => {
    const m = messaggioCaricamento([ko('front', 'permesso')]);
    expect(m.testo).toContain('permesso');
    expect(m.testo).not.toMatch(/spazio di archiviazione è esaurito/);
  });

  it('e dice la manovra da fare: allinea i ruoli, esci e rientra', () => {
    const m = messaggioCaricamento([ko('front', 'permesso')]);
    expect(m.testo).toContain('Allinea i ruoli');
    expect(m.testo).toContain('esci e rientra');
  });

  it('lo spazio esaurito manda a Gestione Spazio, non dai ruoli', () => {
    const m = messaggioCaricamento([ko('front', 'spazio')]);
    expect(m.testo).toContain('Gestione Spazio');
    expect(m.testo).not.toContain('Allinea i ruoli');
  });

  // Chi ha appena fotografato una persona non deve rifotografarla.
  it('se qualcosa è fallito, le foto restano in schermata', () => {
    expect(messaggioCaricamento([ko('front', 'rete')]).tieniLeFoto).toBe(true);
    expect(messaggioCaricamento([ko('front', 'rete')]).testo)
      .toContain('non serve rifarle');
  });

  it('con motivi diversi nomina quello che richiede un\'azione', () => {
    const m = messaggioCaricamento([ko('front', 'rete'), ko('back', 'permesso')]);
    expect(m.testo).toContain('Allinea i ruoli');
  });

  it('nessuna foto da caricare non è un fallimento', () => {
    expect(messaggioCaricamento([]).titolo).toBe('Valutazione salvata');
  });
});

describe('il registro tecnico', () => {
  it('tiene il dettaglio vero, che alla persona non si mostra', () => {
    const riga = perIlRegistro([ko('front', 'permesso', 'storage/unauthorized')]);
    expect(riga).toContain('front');
    expect(riga).toContain('storage/unauthorized');
  });

  it('se è andato tutto bene non scrive niente', () => {
    expect(perIlRegistro([ok('front')])).toBe('');
  });
});

describe('i nomi delle viste', () => {
  it('sono quelli che si usano parlando', () => {
    expect(nomeVista('front')).toBe('Frontale');
    expect(nomeVista('side_right')).toBe('Laterale destra');
  });

  it('una vista sconosciuta tiene il suo nome invece di sparire', () => {
    expect(nomeVista('boh')).toBe('boh');
  });
});
