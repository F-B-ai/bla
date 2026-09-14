import {
  permessiAgenda, eStaffAgenda, spiegaNienteAnnullo,
  spiegaNienteEliminazione, PERMESSI_AGENDA_VERSION,
} from '../permessiAgenda';

// ============================================================
// «QUESTO È UN CONTROLLO CHE DOVEVA AVERE SOLAMENTE IO»
// ------------------------------------------------------------
// Annullare una lezione tocca il percorso di una persona e il conto
// dei soldi. Chi risponde di quel conto è uno solo.
// ============================================================

describe('il titolare', () => {
  it('può tutto', () => {
    const p = permessiAgenda('owner');
    expect(p).toEqual({
      fissare: true, spostare: true, completare: true,
      annullare: true, eliminare: true,
    });
  });
});

describe('manager, collaboratori, nutrizionisti', () => {
  const staff = ['manager', 'collaborator'];

  it('fissano, spostano, segnano completata: il lavoro resta tutto', () => {
    staff.forEach((r) => {
      const p = permessiAgenda(r);
      expect(p.fissare).toBe(true);
      expect(p.spostare).toBe(true);
      expect(p.completare).toBe(true);
    });
  });

  // Le due righe che il titolare ha chiesto di chiudere.
  it('NON annullano', () => {
    staff.forEach((r) => expect(permessiAgenda(r).annullare).toBe(false));
  });

  it('NON eliminano, nemmeno un appuntamento sbagliato da loro', () => {
    staff.forEach((r) => expect(permessiAgenda(r).eliminare).toBe(false));
  });
});

describe('gli allievi non toccano l\'agenda degli altri', () => {
  it('un allievo non ha permessi di agenda', () => {
    expect(permessiAgenda('student')).toEqual({
      fissare: false, spostare: false, completare: false,
      annullare: false, eliminare: false,
    });
  });

  it('nemmeno un allievo dell\'Academy', () => {
    expect(permessiAgenda('academy_student').fissare).toBe(false);
  });

  it('e un ruolo sconosciuto non apre niente', () => {
    expect(permessiAgenda(undefined).spostare).toBe(false);
    expect(permessiAgenda('inventato').annullare).toBe(false);
  });
});

describe('chi lavora in agenda', () => {
  it('sono i tre ruoli dello staff', () => {
    ['owner', 'manager', 'collaborator'].forEach((r) =>
      expect(eStaffAgenda(r)).toBe(true));
    ['student', 'academy_student', undefined, 'boh'].forEach((r) =>
      expect(eStaffAgenda(r as string)).toBe(false));
  });
});

describe('che cosa legge un collaboratore che tocca «Annulla»', () => {
  const t = spiegaNienteAnnullo();

  // «Non hai i permessi» suona come un guasto e non dice cosa fare.
  it('non dice «non hai i permessi»', () => {
    expect(t.toLowerCase()).not.toContain('permess');
  });

  it('dice a chi rivolgersi', () => {
    expect(t).toContain('titolare');
  });

  it('e gli mette in bocca la frase da dire all\'allievo', () => {
    expect(t).toContain('dalla sua');
    expect(t).toContain('10 ore');
  });

  it('e ricorda che il contrattempo vero si riferisce, non si decide', () => {
    expect(t).toContain('eccezione');
  });
});

describe('che cosa legge chi prova a eliminare', () => {
  const t = spiegaNienteEliminazione();

  it('dice che si può correggere invece che cancellare', () => {
    expect(t).toContain('Modifica');
    expect(t).toMatch(/spostarlo|correggerlo/);
  });

  it('e chi lo cancella davvero', () => {
    expect(t).toContain('titolare');
  });
});

describe('versione', () => {
  it('tracciata', () => {
    expect(PERMESSI_AGENDA_VERSION).toBe(1);
  });
});
