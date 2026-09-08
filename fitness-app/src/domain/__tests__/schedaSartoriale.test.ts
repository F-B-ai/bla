import {
  leggiRomPrescritto, confrontaRom, criteriDiStop, controllaScheda,
  CRITERI_STOP_BASE, ROM_PARZIALE_GRADI,
} from '../schedaSartoriale';
import { SOGLIE } from '../progressione';

// ============================================================
// I DUE LIVELLI DELLA SCHEDA SARTORIALE CHE MANCAVANO
// ------------------------------------------------------------
// Modulo C-23/C-24, §5: il livello 6 chiede il ROM prescritto per
// ogni esercizio, il livello 8 i criteri di stop. Questi test
// tengono i due campi onesti.
// ============================================================

describe('il ROM prescritto si legge come lo scrive un coach', () => {
  it('«completo» è una prescrizione, non una parola vuota', () => {
    ['completo', 'ROM completo', 'full rom', 'Full ROM', 'totale', 'pieno'].forEach((s) => {
      expect(leggiRomPrescritto(s)?.tipo).toBe('completo');
    });
  });

  it('un angolo si legge in tutte le forme in cui si scrive', () => {
    ['90', '90°', 'fino a 90°', '90 gradi'].forEach((s) => {
      const r = leggiRomPrescritto(s)!;
      expect(r.tipo).toBe('gradi');
      expect(r.gradi).toBe(90);
    });
  });

  it('una descrizione resta una descrizione, non diventa un numero', () => {
    const r = leggiRomPrescritto('fino a dove la schiena resta neutra')!;
    expect(r.tipo).toBe('descritto');
    expect(r.gradi).toBeUndefined();
  });

  it('un numero impossibile come angolo non viene preso per un angolo', () => {
    expect(leggiRomPrescritto('scendi per 250 secondi')?.tipo).toBe('descritto');
  });

  // Il difetto da evitare: trattare il campo vuoto come «completo».
  // Non prescritto e prescritto-completo sono due cose diverse, e
  // solo la prima è un lavoro non fatto.
  it('campo vuoto vuol dire NON prescritto, mai «completo»', () => {
    expect(leggiRomPrescritto('')).toBeNull();
    expect(leggiRomPrescritto('   ')).toBeNull();
    expect(leggiRomPrescritto(null)).toBeNull();
    expect(leggiRomPrescritto(undefined)).toBeNull();
  });
});

describe('il confronto col ROM misurato', () => {
  // Angolo PIÙ BASSO = più profondo.
  it('angolo dentro la prescrizione: rispettato', () => {
    const r = confrontaRom(leggiRomPrescritto('90°'), 86);
    expect(r.esito).toBe('rispettato');
    expect(r.spiegazione).toContain('86');
    expect(r.spiegazione).toContain('90');
  });

  it('angolo oltre la prescrizione: dice di quanto manca', () => {
    const r = confrontaRom(leggiRomPrescritto('90°'), 104);
    expect(r.esito).toBe('non_rispettato');
    expect(r.spiegazione).toContain('14');
  });

  it('«completo» si confronta con la soglia del ROM parziale', () => {
    expect(confrontaRom(leggiRomPrescritto('completo'), 95).esito).toBe('rispettato');
    expect(confrontaRom(leggiRomPrescritto('completo'), 112).esito).toBe('non_rispettato');
  });

  it('esattamente sulla soglia conta come rispettato', () => {
    expect(confrontaRom(leggiRomPrescritto('90°'), 90).esito).toBe('rispettato');
  });

  // Qui sta il punto: senza numeri non si finge una verifica.
  it('senza angolo misurato non si giudica', () => {
    expect(confrontaRom(leggiRomPrescritto('90°'), null).esito).toBe('non_confrontabile');
    expect(confrontaRom(leggiRomPrescritto('90°'), undefined).esito).toBe('non_confrontabile');
    expect(confrontaRom(leggiRomPrescritto('90°'), NaN).esito).toBe('non_confrontabile');
  });

  it('una prescrizione a parole non si trasforma in un numero', () => {
    const r = confrontaRom(leggiRomPrescritto('fin dove la schiena regge'), 104);
    expect(r.esito).toBe('non_confrontabile');
    expect(r.spiegazione).toContain('occhio');
  });

  it('senza prescrizione non c'  + 'è niente da confrontare', () => {
    expect(confrontaRom(null, 95).esito).toBe('non_confrontabile');
  });

  it('la soglia è la STESSA del motore di progressione', () => {
    expect(ROM_PARZIALE_GRADI).toBe(SOGLIE.profonditaParziale);
  });
});

describe('i criteri di stop non si possono dimenticare', () => {
  it('una scheda senza nulla di aggiunto ha comunque la base', () => {
    expect(criteriDiStop()).toEqual([...CRITERI_STOP_BASE]);
    expect(criteriDiStop(null)).toHaveLength(CRITERI_STOP_BASE.length);
    expect(criteriDiStop([])).toHaveLength(CRITERI_STOP_BASE.length);
  });

  it('i criteri del coach si aggiungono, non sostituiscono', () => {
    const c = criteriDiStop(['Se la spalla destra fa male in panca, fermati.']);
    expect(c).toHaveLength(CRITERI_STOP_BASE.length + 1);
    CRITERI_STOP_BASE.forEach((b) => expect(c).toContain(b));
  });

  it('righe vuote e spazi non entrano', () => {
    expect(criteriDiStop(['', '   ', 'vero'])).toHaveLength(CRITERI_STOP_BASE.length + 1);
  });

  it('un criterio ripetuto non compare due volte', () => {
    const doppio = CRITERI_STOP_BASE[0].toUpperCase();
    expect(criteriDiStop([doppio])).toHaveLength(CRITERI_STOP_BASE.length);
    expect(criteriDiStop(['x', 'X'])).toHaveLength(CRITERI_STOP_BASE.length + 1);
  });

  it('la base copre dolore acuto, irradiazione e sintomi da interruzione', () => {
    const tutto = CRITERI_STOP_BASE.join(' ').toLowerCase();
    expect(tutto).toContain('dolore acuto');
    expect(tutto).toContain('formicolio');
    expect(tutto).toContain('petto');
  });

  it('ogni criterio dice all\'allievo che cosa fare, non solo che cosa sentire', () => {
    CRITERI_STOP_BASE.forEach((c) => {
      expect(/fermati|interrompi|avvisami|non allenare|sentiamoci/i.test(c)).toBe(true);
    });
  });
});

describe('la scheda è conforme al metodo?', () => {
  it('con il ROM su ogni esercizio, è conforme', () => {
    const r = controllaScheda({ esercizi: [
      { name: 'Squat', romPrescritto: '90°' },
      { name: 'Panca', romPrescritto: 'completo' },
    ] });
    expect(r.conforme).toBe(true);
    expect(r.senzaRom).toEqual([]);
  });

  it('un solo esercizio senza ROM lo nomina', () => {
    const r = controllaScheda({ esercizi: [
      { name: 'Squat', romPrescritto: '90°' },
      { name: 'Affondo bulgaro' },
    ] });
    expect(r.conforme).toBe(false);
    expect(r.senzaRom).toEqual(['Affondo bulgaro']);
    expect(r.mancanti[0]).toContain('Affondo bulgaro');
  });

  it('più esercizi senza ROM li conta', () => {
    const r = controllaScheda({ esercizi: [
      { name: 'A' }, { name: 'B' }, { name: 'C', romPrescritto: 'completo' },
    ] });
    expect(r.senzaRom).toHaveLength(2);
    expect(r.mancanti[0]).toContain('2 esercizi');
  });

  it('una scheda vuota è vacuamente conforme, e va bene così', () => {
    expect(controllaScheda({ esercizi: [] }).conforme).toBe(true);
  });
});
