import {
  valutaOnboarding, sintesiPerTwin, avanzamentoChecklist, Risposte,
} from '../onboarding';
import { CAMPI_TUTTI, SEZIONI, CHECKLIST } from '../../data/onboardingForm';

// ============================================================
// ONBOARDING — il primo atto del percorso.
// Ciò che i test difendono: le controindicazioni non possono
// passare inosservate, e i dati di salute non escono dalla scheda.
// ============================================================

describe('la scheda', () => {
  it('ha sette sezioni numerate e campi con id unici', () => {
    expect(SEZIONI).toHaveLength(7);
    const ids = CAMPI_TUTTI.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    SEZIONI.forEach((s, i) => expect(s.numero).toBe(i + 1));
  });

  it('ogni campo a scelta dichiara le sue opzioni', () => {
    CAMPI_TUTTI.forEach((c) => {
      if (c.tipo === 'scelta' || c.tipo === 'multi') {
        expect((c.opzioni || []).length).toBeGreaterThan(1);
      }
    });
  });

  it('la checklist operativa copre i quattro passi', () => {
    expect(new Set(CHECKLIST.map((p) => p.step))).toEqual(new Set([1, 2, 3, 4]));
  });
});

describe('scheda vuota', () => {
  it('non esplode e non inventa nulla', () => {
    const e = valutaOnboarding({});
    expect(e.compilati).toBe(0);
    expect(e.attenzioni).toHaveLength(0);
    expect(e.haControindicazioni).toBe(false);
    expect(e.obiettivi).toEqual([]);
    expect(e.sezioniIncomplete.length).toBe(SEZIONI.length);
  });

  it('regge risposte malformate', () => {
    expect(() => valutaOnboarding({ obiettivi: 'non un array' } as Risposte)).not.toThrow();
    expect(() => valutaOnboarding({ stress: 'otto' } as any)).not.toThrow();
  });
});

describe('le controindicazioni si vedono, sempre', () => {
  it('infortunio dichiarato → attenzione e flag', () => {
    const e = valutaOnboarding({ infortuni: ['Sì — schiena/colonna'] });
    expect(e.haControindicazioni).toBe(true);
    expect(e.attenzioni.some((a) => a.campo === 'infortuni')).toBe(true);
  });

  it('"No — nessuno" NON è una controindicazione', () => {
    const e = valutaOnboarding({ infortuni: ['No — nessuno'] });
    expect(e.haControindicazioni).toBe(false);
    expect(e.attenzioni).toHaveLength(0);
  });

  it('terapie in corso → attenzione e flag', () => {
    const e = valutaOnboarding({ terapie: 'Sì — specifica sotto' });
    expect(e.haControindicazioni).toBe(true);
  });

  it('stress 8 o più → attenzione, sotto no', () => {
    expect(valutaOnboarding({ stress: 8 }).attenzioni.some((a) => a.campo === 'stress')).toBe(true);
    expect(valutaOnboarding({ stress: 7 }).attenzioni.some((a) => a.campo === 'stress')).toBe(false);
  });

  it('sonno pessimo → attenzione sul recupero', () => {
    const e = valutaOnboarding({ sonno_qualita: 'Pessima — mi sveglio stanco' });
    expect(e.attenzioni.some((a) => a.campo === 'sonno_qualita')).toBe(true);
    // il sonno non è una controindicazione clinica
    expect(e.haControindicazioni).toBe(false);
  });

  it('dolore cronico o riabilitazione → si dichiara il perimetro', () => {
    const e = valutaOnboarding({ obiettivi: ['Ridurre il dolore cronico'] });
    const a = e.attenzioni.find((x) => x.campo === 'obiettivi')!;
    expect(a.motivo).toContain('perimetro');
    expect(a.motivo).toContain('professionista sanitario');
  });

  it('più segnali insieme → più attenzioni, tutte visibili', () => {
    const e = valutaOnboarding({
      infortuni: ['Sì — ginocchio'], terapie: 'Sì — specifica sotto',
      stress: 9, sonno_qualita: 'Pessima — mi sveglio stanco',
    });
    expect(e.attenzioni.length).toBeGreaterThanOrEqual(4);
  });
});

describe('sul gemello va solo la sintesi', () => {
  const piena: Risposte = {
    nome: 'Mario', cognome: 'Rossi', telefono: '333', email: 'm@r.it',
    infortuni: ['Sì — schiena/colonna'],
    infortuni_note: 'ernia L5-S1 operata nel 2019',
    terapie: 'Sì — specifica sotto',
    terapie_note: 'antinfiammatorio quotidiano',
    blocchi: 'un lutto recente',
    obiettivi: ['Migliorare la postura', 'Gestire lo stress'],
    orizzonte: '6 mesi', stress: 7,
  };

  it('nessun dato anagrafico o clinico esce dalla scheda', () => {
    const s = JSON.stringify(sintesiPerTwin(valutaOnboarding(piena)));
    ['Mario', 'Rossi', '333', 'm@r.it', 'ernia', 'antinfiammatorio', 'lutto']
      .forEach((v) => expect(s).not.toContain(v));
  });

  it('il gemello sa che un limite esiste, non quale sia', () => {
    const s = sintesiPerTwin(valutaOnboarding(piena));
    expect(s.ha_controindicazioni).toBe(true);
    expect(s.attenzioni).toBeGreaterThan(0);
    expect(s.obiettivi).toEqual(['Migliorare la postura', 'Gestire lo stress']);
    expect(s.orizzonte).toBe('6 mesi');
  });

  it('la completezza è una percentuale onesta', () => {
    expect(sintesiPerTwin(valutaOnboarding({})).completezza_pct).toBe(0);
    const s = sintesiPerTwin(valutaOnboarding(piena));
    expect(s.completezza_pct).toBeGreaterThan(0);
    expect(s.completezza_pct).toBeLessThan(100);
  });
});

describe('checklist operativa', () => {
  it('conta i passi spuntati', () => {
    expect(avanzamentoChecklist([])).toEqual({ fatti: 0, totali: CHECKLIST.length });
    expect(avanzamentoChecklist(['c1', 'c2', 'inesistente']).fatti).toBe(2);
  });
});

describe('garanzie', () => {
  it('riproducibile: stesse risposte → stesso esito', () => {
    const r: Risposte = { obiettivi: ['Migliorare la postura'], stress: 6 };
    expect(JSON.stringify(valutaOnboarding(r))).toBe(JSON.stringify(valutaOnboarding(r)));
  });
});
