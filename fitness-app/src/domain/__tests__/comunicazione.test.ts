import {
  controllaAllegato, controllaComunicazione, confermaInvio, tipoDaMime,
  pesoLeggibile, descriviComunicazione, LIMITI, Allegato,
} from '../comunicazione';

// ============================================================
// «UN MESSAGGIO A TUTTI GLI ALLIEVI CONTEMPORANEAMENTE»
// ------------------------------------------------------------
// Fino a oggi l'unico modo di dire una cosa a tutti era scriverla a
// ognuno. Con dieci allievi si fa; con cento non si fa più — e
// infatti non si dice.
//
// Una comunicazione parte una volta sola e non si richiama indietro.
// Per questo i controlli qui sono severi: l'errore si paga davanti a
// tutti.
// ============================================================

const MB = 1024 * 1024;
const foto = (): Allegato => ({ tipo: 'foto', url: 'u', nome: 'f.jpg', peso: 2 * MB });

describe('che cosa si può allegare', () => {
  it('una foto normale passa', () => {
    expect(controllaAllegato('foto', 2 * MB)).toEqual({ ok: true });
  });

  // Il limite non è un capriccio: lo spazio è quello di Firebase.
  it('un video enorme viene fermato PRIMA di caricarlo', () => {
    const e = controllaAllegato('video', 200 * MB);
    expect(e.ok).toBe(false);
    if (!e.ok) {
      expect(e.motivo).toContain('200 MB');
      expect(e.motivo).toContain('50 MB');
      expect(e.motivo).toContain('comprimilo');
    }
  });

  it('ogni tipo ha il suo limite, e l\'audio può pesare più di una foto', () => {
    expect(LIMITI.audio).toBeGreaterThan(LIMITI.foto);
    expect(LIMITI.video).toBeGreaterThan(LIMITI.audio);
  });

  it('un file vuoto non si carica', () => {
    expect(controllaAllegato('foto', 0).ok).toBe(false);
  });

  it('il peso si legge in megabyte, non in byte', () => {
    expect(pesoLeggibile(3.5 * MB)).toBe('3.5 MB');
    expect(pesoLeggibile(42 * MB)).toBe('42 MB');
    expect(pesoLeggibile(0)).toBe('');
    expect(pesoLeggibile(undefined)).toBe('');
  });
});

describe('riconoscere il tipo di file', () => {
  it('immagine, video e audio si riconoscono dal MIME', () => {
    expect(tipoDaMime('image/jpeg')).toBe('foto');
    expect(tipoDaMime('video/mp4')).toBe('video');
    expect(tipoDaMime('audio/mpeg')).toBe('audio');
  });

  it('quello che non riconosciamo è un documento, non un errore', () => {
    expect(tipoDaMime('application/pdf')).toBe('documento');
    expect(tipoDaMime(null)).toBe('documento');
    expect(tipoDaMime('')).toBe('documento');
  });
});

describe('quando si può premere Invia', () => {
  it('titolo e messaggio: si parte', () => {
    expect(controllaComunicazione({ titolo: 'Chiusura estiva', testo: 'Chiudiamo dal 10 al 20.' }).ok)
      .toBe(true);
  });

  it('un titolo con un allegato basta: la foto è il messaggio', () => {
    expect(controllaComunicazione({ titolo: 'Nuovi orari', allegato: foto() }).ok).toBe(true);
  });

  // Il difetto più facile: premere Invia su una cosa vuota, a tutti.
  it('senza testo e senza allegato NON si manda niente', () => {
    const e = controllaComunicazione({ titolo: 'Ciao a tutti' });
    expect(e.ok).toBe(false);
    expect(e.problemi.join(' ')).toContain('non dice niente');
  });

  it('senza titolo non si manda', () => {
    expect(controllaComunicazione({ titolo: '', testo: 'qualcosa' }).ok).toBe(false);
    expect(controllaComunicazione({ titolo: '  a ', testo: 'qualcosa' }).ok).toBe(false);
  });

  it('un titolo chilometrico si taglia prima, non dopo', () => {
    const e = controllaComunicazione({ titolo: 'x'.repeat(200), testo: 'ok' });
    expect(e.ok).toBe(false);
    expect(e.problemi.join(' ')).toContain('troppo lungo');
  });

  it('i problemi si elencano tutti insieme, non uno per volta', () => {
    const e = controllaComunicazione({ titolo: '', testo: '' });
    expect(e.problemi.length).toBeGreaterThan(1);
  });
});

describe('la conferma prima di premere', () => {
  // Il numero è l'unica cosa che fa fermare chi sta per sbagliare.
  it('dice QUANTE persone la riceveranno, non «sei sicuro?»', () => {
    const c = confermaInvio(47, 'avviso', false);
    expect(c).toContain('47 allievi');
    expect(c).not.toMatch(/sei sicuro/i);
  });

  it('dice che non si torna indietro', () => {
    expect(confermaInvio(10, 'annuncio', false)).toContain('non si richiama indietro');
  });

  it('l\'urgente si vede già nella conferma', () => {
    expect(confermaInvio(10, 'urgente', false)).toContain('URGENTE');
  });

  it('l\'allegato è nominato: si sta mandando anche quello', () => {
    expect(confermaInvio(10, 'avviso', true)).toContain('allegato');
  });

  it('il singolare non diventa «1 allievi»', () => {
    const c = confermaInvio(1, 'avviso', false);
    expect(c).toContain('a 1 allievo');
    expect(c).not.toContain('1 allievi');
  });

  it('senza nessuno a cui mandarla, lo dice invece di far premere', () => {
    expect(confermaInvio(0, 'avviso', false)).toContain('nessun allievo attivo');
  });
});

describe('come si legge nell\'elenco di chi la riceve', () => {
  it('tipo, autore, allegato e data', () => {
    const r = descriviComunicazione({
      tipo: 'annuncio',
      autoreNome: 'Francesco Busanca',
      allegato: foto(),
      createdAt: new Date('2026-09-12T10:00:00'),
    });
    expect(r).toContain('Annuncio');
    expect(r).toContain('Francesco Busanca');
    expect(r).toContain('Foto');
    expect(r).toContain('12/09/2026');
  });

  it('senza allegato non lascia un separatore vuoto', () => {
    const r = descriviComunicazione({
      tipo: 'avviso', autoreNome: 'Francesco', createdAt: new Date('2026-09-12T10:00:00'),
    });
    expect(r).not.toContain('··');
    expect(r).not.toContain('undefined');
  });

  it('una data non valida non produce «Invalid Date»', () => {
    const r = descriviComunicazione({
      tipo: 'avviso', autoreNome: 'F', createdAt: new Date('boh'),
    });
    expect(r).not.toContain('Invalid');
  });
});
