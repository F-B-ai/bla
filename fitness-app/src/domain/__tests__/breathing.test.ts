import {
  PRATICHE, PRATICA_BY_ID, statoAl, durataCiclo, respiriTotali, BREATHING_VERSION,
} from '../breathing';

// ============================================================
// RESPIRO — il motore delle fasi è una funzione del tempo.
// Nessun timer, nessuno schermo: gli passo l'istante e verifico
// che dica la fase giusta. Se sbaglia qui, sbaglia sul telefono.
// ============================================================

const coerenza = PRATICA_BY_ID['coerenza'];        // 5 + 5 = 10s
const quadrato = PRATICA_BY_ID['quadrato'];        // 4+4+4+4 = 16s
const espLunga = PRATICA_BY_ID['espirazione_lunga']; // 4 + 8 = 12s

describe('le pratiche', () => {
  it('hanno id unici, ciclo non vuoto e durata di default valida', () => {
    const ids = PRATICHE.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const p of PRATICHE) {
      expect(p.ciclo.length).toBeGreaterThan(0);
      expect(durataCiclo(p)).toBeGreaterThan(0);
      expect(p.durate).toContain(p.durataDefault);
      p.ciclo.forEach((f) => expect(f.secondi).toBeGreaterThan(0));
    }
  });

  it('ogni pratica dichiara un intento, non una promessa clinica', () => {
    for (const p of PRATICHE) {
      expect(p.intento.length).toBeGreaterThan(10);
      expect(p.intento.toLowerCase()).not.toMatch(/cura|guarisc|terapi|patolog/);
    }
  });
});

describe('il motore delle fasi', () => {
  it('a inizio sessione sei nella prima fase', () => {
    const s = statoAl(coerenza, 0, 3);
    expect(s.fase.key).toBe('inspira');
    expect(s.secondiRimanenti).toBe(5);
    expect(s.cicliCompletati).toBe(0);
    expect(s.finita).toBe(false);
  });

  it('coerenza 5-5: passa a espira dopo 5 secondi', () => {
    expect(statoAl(coerenza, 4.9, 3).fase.key).toBe('inspira');
    expect(statoAl(coerenza, 5.0, 3).fase.key).toBe('espira');
    expect(statoAl(coerenza, 9.9, 3).fase.key).toBe('espira');
  });

  it('a fine ciclo riparte, e conta il ciclo completato', () => {
    const s = statoAl(coerenza, 10, 3);
    expect(s.fase.key).toBe('inspira');
    expect(s.cicliCompletati).toBe(1);
  });

  it('quadrato: le quattro fasi nell\'ordine giusto', () => {
    expect(statoAl(quadrato, 1, 3).fase.key).toBe('inspira');
    expect(statoAl(quadrato, 5, 3).fase.key).toBe('trattieni');
    expect(statoAl(quadrato, 9, 3).fase.key).toBe('espira');
    expect(statoAl(quadrato, 13, 3).fase.key).toBe('pausa');
    expect(statoAl(quadrato, 17, 3).fase.key).toBe('inspira');
  });

  it('espirazione lunga: l\'uscita dura il doppio dell\'entrata', () => {
    expect(statoAl(espLunga, 3, 3).fase.key).toBe('inspira');
    expect(statoAl(espLunga, 5, 3).fase.key).toBe('espira');
    expect(statoAl(espLunga, 11, 3).fase.key).toBe('espira');
    expect(statoAl(espLunga, 12, 3).fase.key).toBe('inspira');
  });

  it('il conto alla rovescia della fase è 5,4,3,2,1 — mai 0', () => {
    const visti = [0, 1, 2, 3, 4].map((t) => statoAl(coerenza, t, 3).secondiRimanenti);
    expect(visti).toEqual([5, 4, 3, 2, 1]);
    expect(Math.min(...visti)).toBeGreaterThan(0);
  });

  it('avanzamento della sessione: 0 all\'inizio, 1 alla fine, mai oltre', () => {
    expect(statoAl(coerenza, 0, 3).avanzamentoSessione).toBe(0);
    expect(statoAl(coerenza, 90, 3).avanzamentoSessione).toBeCloseTo(0.5, 2);
    expect(statoAl(coerenza, 180, 3).avanzamentoSessione).toBe(1);
    expect(statoAl(coerenza, 9999, 3).avanzamentoSessione).toBe(1);
  });

  it('la sessione finisce al minuto dichiarato', () => {
    expect(statoAl(coerenza, 179, 3).finita).toBe(false);
    expect(statoAl(coerenza, 180, 3).finita).toBe(true);
  });

  it('non esplode con tempi assurdi', () => {
    expect(() => statoAl(coerenza, -50, 3)).not.toThrow();
    expect(statoAl(coerenza, -50, 3).fase.key).toBe('inspira');
    expect(() => statoAl(coerenza, 0, 0)).not.toThrow();
  });

  it('riproducibile: stesso istante → stessa fase', () => {
    expect(JSON.stringify(statoAl(quadrato, 7.3, 5)))
      .toBe(JSON.stringify(statoAl(quadrato, 7.3, 5)));
  });
});

describe('riepilogo della sessione', () => {
  it('conta i respiri completi', () => {
    expect(respiriTotali(coerenza, 1)).toBe(6);    // 60 / 10
    expect(respiriTotali(coerenza, 3)).toBe(18);
    expect(respiriTotali(quadrato, 1)).toBe(3);    // 60 / 16 → 3
  });

  it('versione tracciata', () => {
    expect(BREATHING_VERSION).toBe(1);
  });
});
