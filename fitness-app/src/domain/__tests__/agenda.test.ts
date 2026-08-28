import {
  leggiCAL, valutaRichiesta, rispostaWhatsApp, riepilogoDi,
  impegniDi, quantiIl, postiLiberi,
  TETTO_GIORNALIERO, AGENDA_VERSION, Impegno, RichiestaCAL,
} from '../agenda';

// ============================================================
// AGENDA — le richieste da WhatsApp.
// La regola che tutti i test difendono: MAI un quinto
// appuntamento. Non un avviso da ignorare: un rifiuto, con
// l'alternativa già pronta da rimandare alla persona.
// ============================================================

const imp = (giorno: string, ora: string, chi: string, attivo = true): Impegno =>
  ({ giorno, ora, chi, origine: 'sessione', attivo });

const GIORNO = '2026-09-02';

const pieno: Impegno[] = [
  imp(GIORNO, '09:00', 'Maria'),
  imp(GIORNO, '10:00', 'Luca'),
  imp(GIORNO, '17:00', 'Anna'),
  imp(GIORNO, '18:00', 'Paolo'),
];

const cal = (testo: string) => leggiCAL(testo);

// ------------------------------------------------------------

describe('leggere il pacchetto CAL', () => {
  it('legge una prenotazione completa', () => {
    const e = cal(`CAL prenota
persona: Maria Rossi
telefono: 333 1234567
giorno: 2026-09-02
ora: 17:00
tipo: visita
note: prima volta, arriva da Instagram
whatsapp: +39 333 1234567`);
    expect(e.ok).toBe(true);
    const r = e.richiesta!;
    expect(r.comando).toBe('prenota');
    expect(r.persona).toBe('Maria Rossi');
    expect(r.giorno).toBe('2026-09-02');
    expect(r.ora).toBe('17:00');
    expect(r.tipo).toBe('visita');
    expect(r.note).toContain('Instagram');
  });

  it('accetta le graffe e gli alias di chi scrive di fretta', () => {
    const e = cal(`CAL {prenota}
nome: Luca Bianchi
tel: 3339999999
data: 2026-09-03
orario: 10:00`);
    expect(e.ok).toBe(true);
    expect(e.richiesta!.persona).toBe('Luca Bianchi');
    expect(e.richiesta!.giorno).toBe('2026-09-03');
    expect(e.richiesta!.ora).toBe('10:00');
  });

  it('senza whatsapp usa il telefono', () => {
    const e = cal('CAL prenota\npersona: X\ntelefono: 333\ngiorno: 2026-09-03\nora: 10:00');
    expect(e.richiesta!.whatsapp).toBe('333');
  });

  it('dice che cosa manca, invece di indovinare', () => {
    const e = cal('CAL prenota\npersona: Maria');
    expect(e.ok).toBe(false);
    expect(e.richiesta).toBeNull();
    expect(e.problemi.join(' ')).toContain('Manca il giorno');
    expect(e.problemi.join(' ')).toContain('Manca l\'ora');
  });

  it('rifiuta date e orari inventati', () => {
    expect(cal('CAL prenota\npersona: X\ngiorno: 2026-02-30\nora: 10:00').ok).toBe(false);
    expect(cal('CAL prenota\npersona: X\ngiorno: 2026-09-02\nora: 25:00').ok).toBe(false);
    expect(cal('CAL prenota\npersona: X\ngiorno: 2/9/2026\nora: 10:00').problemi.join(' '))
      .toContain('AAAA-MM-GG');
  });

  it('un comando sconosciuto non passa', () => {
    const e = cal('CAL inventa\npersona: X\ngiorno: 2026-09-02\nora: 10:00');
    expect(e.ok).toBe(false);
    expect(e.problemi.join(' ')).toContain('sconosciuto');
  });

  it('testo vuoto o senza CAL non esplode', () => {
    expect(cal('').ok).toBe(false);
    expect(cal('ciao, mi prenoti Maria domani?').ok).toBe(false);
    expect(() => cal(undefined as any)).not.toThrow();
  });

  it('«sposta» vuole sapere dove si sposta', () => {
    const senza = cal('CAL sposta\npersona: Maria\ngiorno: 2026-09-02');
    expect(senza.ok).toBe(false);
    expect(senza.problemi.join(' ')).toContain('nuovo giorno');

    const con = cal(`CAL sposta
persona: Maria
giorno: 2026-09-02
nuovo giorno: 2026-09-04
nuova ora: 18:00`);
    expect(con.ok).toBe(true);
    expect(con.richiesta!.nuovoGiorno).toBe('2026-09-04');
    expect(con.richiesta!.nuovaOra).toBe('18:00');
  });

  it('«chiedi-liberi» chiede solo il giorno', () => {
    const e = cal('CAL chiedi-liberi\ngiorno: 2026-09-02');
    expect(e.ok).toBe(true);
    expect(e.richiesta!.comando).toBe('chiedi-liberi');
  });

  it('un tipo fuori elenco non viene inventato: diventa «altro» e lo dice', () => {
    const e = cal('CAL prenota\npersona: X\ngiorno: 2026-09-02\nora: 11:00\ntipo: massaggio');
    expect(e.ok).toBe(false);
    expect(e.problemi.join(' ')).toContain('altro');
  });
});

// ------------------------------------------------------------

describe('quanti impegni ha quel giorno', () => {
  it('conta solo quelli attivi: un annullato libera il posto', () => {
    const con = [...pieno, imp(GIORNO, '19:00', 'Disdetto', false)];
    expect(quantiIl(con, GIORNO)).toBe(4);
    expect(postiLiberi(con, GIORNO)).toBe(0);
  });

  it('mette in fila per ora', () => {
    const mescolati = [imp(GIORNO, '18:00', 'B'), imp(GIORNO, '09:00', 'A')];
    expect(impegniDi(mescolati, GIORNO).map((i) => i.chi)).toEqual(['A', 'B']);
  });

  it('il tetto è quattro', () => {
    expect(TETTO_GIORNALIERO).toBe(4);
    expect(AGENDA_VERSION).toBe(1);
  });
});

// ------------------------------------------------------------

describe('IL QUINTO NON SI SCRIVE', () => {
  it('giorno pieno: rifiuto, non avviso', () => {
    const v = valutaRichiesta({
      richiesta: { giorno: GIORNO, ora: '19:00', persona: 'Nuova' },
      impegni: pieno,
    });
    expect(v.esito).toBe('giorno_pieno');
    expect(v.confermabile).toBe(false);
    expect(v.postiLiberi).toBe(0);
    expect(v.motivo).toContain('Il quinto non si scrive');
  });

  it('e propone il primo giorno che ha ancora posto', () => {
    const v = valutaRichiesta({
      richiesta: { giorno: GIORNO, ora: '19:00', persona: 'Nuova' },
      impegni: pieno,
    });
    expect(v.alternative[0]).toBe('2026-09-03');
  });

  it('salta i giorni pieni quando cerca l\'alternativa', () => {
    const domaniPieno = [
      ...pieno,
      ...pieno.map((i) => ({ ...i, giorno: '2026-09-03' })),
    ];
    const v = valutaRichiesta({
      richiesta: { giorno: GIORNO, ora: '19:00', persona: 'Nuova' },
      impegni: domaniPieno,
    });
    expect(v.alternative[0]).toBe('2026-09-04');
  });

  it('con tre appuntamenti il quarto passa, ed è l\'ultimo posto', () => {
    const v = valutaRichiesta({
      richiesta: { giorno: GIORNO, ora: '19:00', persona: 'Nuova' },
      impegni: pieno.slice(0, 3),
    });
    expect(v.confermabile).toBe(true);
    expect(v.motivo).toContain('ultimo posto');
  });

  it('l\'ora già presa si dice, con il nome di chi ce l\'ha', () => {
    const v = valutaRichiesta({
      richiesta: { giorno: GIORNO, ora: '10:00', persona: 'Nuova' },
      impegni: pieno.slice(0, 2),
    });
    expect(v.esito).toBe('orario_occupato');
    expect(v.confermabile).toBe(false);
    expect(v.conflittoCon).toBe('Luca');
  });

  it('senza giorno o ora non si valuta niente', () => {
    const v = valutaRichiesta({
      richiesta: { giorno: '', ora: '', persona: 'X' }, impegni: [],
    });
    expect(v.esito).toBe('dati_mancanti');
    expect(v.confermabile).toBe(false);
  });

  it('giornata vuota: quattro posti', () => {
    const v = valutaRichiesta({
      richiesta: { giorno: GIORNO, ora: '09:00', persona: 'X' }, impegni: [],
    });
    expect(v.confermabile).toBe(true);
    expect(v.postiLiberi).toBe(4);
  });
});

// ------------------------------------------------------------

describe('la risposta che torna su WhatsApp', () => {
  const richiesta = (over: Partial<RichiestaCAL> = {}): RichiestaCAL => ({
    comando: 'prenota', persona: 'Maria Rossi', telefono: '333', giorno: GIORNO,
    ora: '19:00', tipo: 'visita', note: '', whatsapp: '333', ...over,
  });

  const rispondi = (r: RichiestaCAL, impegni: Impegno[]) =>
    rispostaWhatsApp({
      richiesta: r,
      valutazione: valutaRichiesta({ richiesta: r, impegni }),
      impegni,
    });

  it('usa il nome di battesimo, non il cognome', () => {
    const t = rispondi(richiesta({ ora: '11:00' }), []);
    expect(t).toContain('Maria');
    expect(t).not.toContain('Rossi');
  });

  it('quando è pieno non dice solo «no»: propone il primo giorno con posto', () => {
    const t = rispondi(richiesta(), pieno);
    expect(t.toLowerCase()).toContain('pieno');
    expect(t.toLowerCase()).toContain('giovedì 3 settembre');
    expect(t).toContain('?');
  });

  it('spiega il perché del tetto, senza scusarsi', () => {
    const t = rispondi(richiesta(), pieno);
    expect(t).toContain('quattro appuntamenti al giorno');
    expect(t.toLowerCase()).not.toContain('mi dispiace');
  });

  it('ora occupata: propone gli altri orari dello stesso giorno', () => {
    const t = rispondi(richiesta({ ora: '10:00' }), pieno.slice(0, 2));
    expect(t).toContain('10:00');
    expect(t).toMatch(/17:00|18:00/);
  });

  it('conferma: ricorda le dieci ore, come nel patto', () => {
    const t = rispondi(richiesta({ ora: '11:00' }), []);
    expect(t.toLowerCase()).toContain('confermato');
    expect(t).toContain('dieci ore');
  });

  it('chiedi-liberi elenca gli orari davvero liberi', () => {
    const t = rispondi(richiesta({ comando: 'chiedi-liberi' }), pieno.slice(0, 2));
    expect(t).toContain('17:00');
    expect(t).toContain('18:00');
    expect(t).not.toContain('09:00');
  });

  it('chiedi-liberi su un giorno pieno manda al giorno dopo', () => {
    const t = rispondi(richiesta({ comando: 'chiedi-liberi' }), pieno);
    expect(t.toLowerCase()).toContain('completo');
    expect(t.toLowerCase()).toContain('3 settembre');
  });

  it('lo spostamento conferma la nuova data', () => {
    const t = rispondi(
      richiesta({ comando: 'sposta', ora: '09:00', nuovoGiorno: '2026-09-04', nuovaOra: '18:00' }),
      []
    );
    expect(t).toContain('18:00');
    expect(t.toLowerCase()).toContain('venerdì 4 settembre');
  });

  it('la cancellazione lascia la porta aperta', () => {
    const t = rispondi(richiesta({ comando: 'cancella' }), []);
    expect(t.toLowerCase()).toContain('tolto');
    expect(t.toLowerCase()).toContain('rientrare');
  });

  it('nessuna risposta è mai scortese', () => {
    [richiesta(), richiesta({ ora: '10:00' }), richiesta({ comando: 'chiedi-liberi' })]
      .forEach((r) => {
        const t = rispondi(r, pieno).toLowerCase();
        ['impossibile', 'non possiamo', 'devi', 'purtroppo no']
          .forEach((v) => expect(t).not.toContain(v));
      });
  });
});

// ------------------------------------------------------------

describe('il riepilogo del giorno per il coach', () => {
  it('una riga sola, con chi e a che ora', () => {
    const r = riepilogoDi(pieno.slice(0, 2), GIORNO);
    expect(r.quanti).toBe(2);
    expect(r.liberi).toBe(2);
    expect(r.pieno).toBe(false);
    expect(r.riga).toContain('2 su 4');
    expect(r.riga).toContain('09:00 Maria');
  });

  it('quando è pieno lo dice in fondo alla riga', () => {
    expect(riepilogoDi(pieno, GIORNO).riga).toContain('pieno');
    expect(riepilogoDi(pieno, GIORNO).pieno).toBe(true);
  });

  it('giornata vuota', () => {
    expect(riepilogoDi([], GIORNO).riga).toBe('Giornata libera.');
  });
});
