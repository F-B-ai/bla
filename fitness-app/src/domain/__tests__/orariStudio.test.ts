import {
  APERTURA, ULTIMO_INIZIO, ULTIMO_INIZIO_ECCEZIONE, PASSO_MINUTI,
  DURATA_STANDARD, inMinuti, inOra, slotLiberi, descriviSlot,
  regolaDellaGiornata, AVVISO_SOLA_LETTURA, ORARI_STUDIO_VERSION,
} from '../orariStudio';

// ============================================================
// «APPUNTAMENTO AL MASSIMO 17:30 A PARTIRE DALLE NOVE, IN CASI
//  ECCEZIONALI FINO ALLE 19:30»
// ------------------------------------------------------------
// E soprattutto: chi legge NON prenota. Propone.
// ============================================================

describe('la forma della giornata', () => {
  it('si comincia alle nove', () => {
    expect(APERTURA).toBe('09:00');
  });

  it('l\'ultimo appuntamento si fissa alle 17:30', () => {
    expect(ULTIMO_INIZIO).toBe('17:30');
  });

  it('per eccezione fino alle 19:30, mai oltre', () => {
    expect(ULTIMO_INIZIO_ECCEZIONE).toBe('19:30');
  });
});

describe('ore e minuti', () => {
  it('avanti e indietro', () => {
    expect(inMinuti('09:00')).toBe(540);
    expect(inMinuti('17:30')).toBe(1050);
    expect(inOra(1050)).toBe('17:30');
    expect(inOra(540)).toBe('09:00');
  });

  it('un\'ora storta non diventa mezzanotte per sbaglio', () => {
    ['', 'boh', '25:00', '09:70', '9', '09-00'].forEach((x) =>
      expect(isNaN(inMinuti(x))).toBe(true));
  });
});

describe('una giornata vuota', () => {
  const liberi = slotLiberi({ impegni: [] });

  it('parte dalle nove', () => {
    expect(liberi[0].inizio).toBe('09:00');
  });

  // Il confine che conta: alle 17:30 si COMINCIA, quindi c'è.
  it('arriva fino alle 17:30 compreso', () => {
    expect(liberi[liberi.length - 1].inizio).toBe('17:30');
  });

  it('e non va oltre, senza chiederlo', () => {
    expect(liberi.some((s) => s.inizio > '17:30')).toBe(false);
    expect(liberi.some((s) => s.eccezione)).toBe(false);
  });

  it('sta sulle mezz\'ore', () => {
    liberi.forEach((s) => expect(inMinuti(s.inizio) % PASSO_MINUTI).toBe(0));
  });

  it('una seduta dura un\'ora, se non si dice altro', () => {
    expect(inMinuti(liberi[0].fine) - inMinuti(liberi[0].inizio))
      .toBe(DURATA_STANDARD);
  });

  it('l\'ultima finisce alle 18:30, ed è giusto così', () => {
    expect(liberi[liberi.length - 1].fine).toBe('18:30');
  });
});

describe('le eccezioni si chiedono, non capitano', () => {
  it('senza chiederle non compaiono', () => {
    expect(slotLiberi({ impegni: [] }).some((s) => s.eccezione)).toBe(false);
  });

  it('chiedendole si arriva alle 19:30 compreso', () => {
    const l = slotLiberi({ impegni: [], conEccezioni: true });
    expect(l[l.length - 1].inizio).toBe('19:30');
  });

  it('e MAI oltre le 19:30', () => {
    const l = slotLiberi({ impegni: [], conEccezioni: true });
    expect(l.every((s) => inMinuti(s.inizio) <= inMinuti('19:30'))).toBe(true);
  });

  it('quelle oltre le 17:30 si vedono che sono eccezioni', () => {
    const l = slotLiberi({ impegni: [], conEccezioni: true });
    expect(l.find((s) => s.inizio === '18:00')!.eccezione).toBe(true);
    expect(l.find((s) => s.inizio === '17:30')!.eccezione).toBe(false);
  });
});

describe('gli impegni tolgono spazio', () => {
  const impegni = [
    { inizio: '10:00', fine: '11:00' },
    { inizio: '15:00', fine: '16:30' },
  ];
  const liberi = slotLiberi({ impegni });
  const ore = liberi.map((s) => s.inizio);

  it('l\'ora occupata non si propone', () => {
    expect(ore).not.toContain('10:00');
    expect(ore).not.toContain('15:00');
    expect(ore).not.toContain('15:30');
    expect(ore).not.toContain('16:00');
  });

  // Una seduta di un'ora che parte alle 09:30 finisce alle 10:30:
  // si sovrappone. Proporla vorrebbe dire prenotare due persone
  // sopra la stessa mezz'ora.
  it('nemmeno quella che ci finirebbe sopra', () => {
    expect(ore).not.toContain('09:30');
    expect(ore).not.toContain('14:30');
  });

  it('ma quella che finisce quando l\'altra comincia, sì', () => {
    expect(ore).toContain('09:00');
    expect(ore).toContain('11:00');
    expect(ore).toContain('16:30');
  });
});

describe('una durata diversa cambia il conto', () => {
  it('mezz\'ora entra dove un\'ora non entrava', () => {
    const impegni = [{ inizio: '10:00', fine: '11:00' }];
    const ore = slotLiberi({ impegni, durata: 30 }).map((s) => s.inizio);
    expect(ore).toContain('09:30');
    expect(ore).not.toContain('10:00');
  });

  it('una durata assurda non svuota la giornata', () => {
    expect(slotLiberi({ impegni: [], durata: 0 }).length).toBeGreaterThan(0);
    expect(slotLiberi({ impegni: [], durata: -30 }).length).toBeGreaterThan(0);
  });
});

describe('oggi non si propone il passato', () => {
  it('le ore già passate spariscono', () => {
    const ore = slotLiberi({ impegni: [], daDopo: '14:00' }).map((s) => s.inizio);
    expect(ore).not.toContain('09:00');
    expect(ore[0]).toBe('14:00');
  });

  it('e per un altro giorno non si filtra niente', () => {
    expect(slotLiberi({ impegni: [] })[0].inizio).toBe('09:00');
  });
});

describe('un impegno con orari illeggibili', () => {
  // Nel dubbio si propone MENO, non di più: proporre sopra qualcuno
  // di cui non si sa niente è il peggiore dei due errori.
  it('blocca la giornata invece di essere ignorato', () => {
    expect(slotLiberi({ impegni: [{ inizio: 'boh', fine: '11:00' }] }))
      .toHaveLength(0);
    expect(slotLiberi({ impegni: [{ inizio: '12:00', fine: '11:00' }] }))
      .toHaveLength(0);
  });
});

describe('come si racconta', () => {
  it('la regola sta in una riga, con i tre orari', () => {
    const r = regolaDellaGiornata();
    ['09:00', '17:30', '19:30'].forEach((o) => expect(r).toContain(o));
  });

  it('gli spazi si elencano', () => {
    const t = descriviSlot(slotLiberi({ impegni: [] }), 'lunedì 15');
    expect(t).toContain('09:00');
    expect(t).toContain('lunedì 15');
  });

  // Se finissero mescolate, il bot proporrebbe le 19:00 come un
  // orario qualunque.
  it('le eccezioni stanno a parte e si chiamano eccezioni', () => {
    const t = descriviSlot(slotLiberi({ impegni: [], conEccezioni: true }));
    expect(t).toContain('Solo per eccezione');
    expect(t).toContain('19:30');
  });

  it('e quando non c\'è niente lo dice, con la regola', () => {
    const t = descriviSlot([]);
    expect(t).toContain('Nessuno spazio libero');
    expect(t).toContain('17:30');
  });
});

describe('chi legge NON prenota', () => {
  // È il limite che il titolare ha messo per primo. Sta nei dati,
  // non in un commento: chi legge la risposta lo trova lì dentro.
  it('l\'avviso dice che non è stato creato nessun appuntamento', () => {
    expect(AVVISO_SOLA_LETTURA).toContain('Nessun appuntamento');
    expect(AVVISO_SOLA_LETTURA).toContain('non prenotazioni');
  });

  it('e dice chi decide davvero', () => {
    expect(AVVISO_SOLA_LETTURA).toContain('conferma');
    expect(AVVISO_SOLA_LETTURA).toContain('titolare');
  });
});

describe('versione', () => {
  it('tracciata', () => {
    expect(ORARI_STUDIO_VERSION).toBe(1);
  });
});
