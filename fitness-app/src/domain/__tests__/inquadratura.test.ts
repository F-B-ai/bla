import { Landmark } from '../gait';
import { VistaPosa } from '../posture3d';
import {
  leggiInquadratura, giudicaInquadratura, confrontaInquadrature,
  distanzaStimata, altezzaObiettivoCm, parteDelCorpo, BERSAGLIO, Inquadratura,
} from '../inquadratura';

// ============================================================
// 10 novembre 2026 — IL MISURATORE DELL'INQUADRATURA
// ------------------------------------------------------------
// Costruisco una persona alta 1,75 m e la fotografo dove decido io:
// più vicino, più lontano, col telefono più in alto. Il misuratore
// deve accorgersene, e dire a parole che cosa cambiare.
// ============================================================

const H = 1.75;
/** quote da terra in metri */
const Q = { naso: 1.62, spalla: 0.818 * H, anca: 0.93, ginocchio: 0.5, caviglia: 0.039 * H, piede: 0.01 };

/**
 * Foto di fronte. `metriInFoto` = quanti metri di mondo entrano
 * nell'altezza della foto (più è grande, più si è lontani);
 * `quotaCentro` = a che altezza da terra guarda il centro della foto.
 */
const foto = (metriInFoto: number, quotaCentroM: number, spostaX = 0, W = 750, Hpx = 1000): VistaPosa => {
  const lm: Landmark[] = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 0.1 }));
  const y = (q: number): number => 0.5 - (q - quotaCentroM) / metriInFoto;
  const x = (m: number): number => 0.5 + spostaX + (m / metriInFoto) * (Hpx / W);
  const metti = (i: number, mx: number, q: number): void => { lm[i] = { x: x(mx), y: y(q), visibility: 0.95 }; };
  metti(0, 0, Q.naso);
  metti(7, 0.07, Q.naso + 0.02); metti(8, -0.07, Q.naso + 0.02);
  metti(11, 0.2, Q.spalla); metti(12, -0.2, Q.spalla);
  metti(23, 0.1, Q.anca); metti(24, -0.1, Q.anca);
  metti(25, 0.1, Q.ginocchio); metti(26, -0.1, Q.ginocchio);
  metti(27, 0.1, Q.caviglia); metti(28, -0.1, Q.caviglia);
  metti(29, 0.1, Q.piede + 0.01); metti(30, -0.1, Q.piede + 0.01);
  metti(31, 0.11, Q.piede); metti(32, -0.11, Q.piede);
  return { landmarks: lm, larghezza: W, altezza: Hpx };
};

// La foto fatta bene: 2,2 m di mondo nell'altezza, centro a 95 cm da terra.
const buona = (): VistaPosa => foto(2.2, 0.95);

describe('leggere l\'inquadratura', () => {
  it('quanta foto occupa il corpo: naso→piedi sui metri che entrano nella foto', () => {
    const i = leggiInquadratura(buona())!;
    expect(i.riempimento).toBeCloseTo((Q.naso - Q.piede) / 2.2, 2);
  });

  it('a che quota del corpo cade il centro: è l\'altezza del telefono', () => {
    const i = leggiInquadratura(buona())!;
    expect(i.quotaCentro).toBeCloseTo(0.95 / H, 2);
    expect(altezzaObiettivoCm(i, 175)).toBeGreaterThanOrEqual(93);
    expect(altezzaObiettivoCm(i, 175)).toBeLessThanOrEqual(97);
  });

  it('persona centrata: nessuno scostamento', () => {
    expect(leggiInquadratura(buona())!.fuoriCentro).toBeCloseTo(0, 3);
    expect(leggiInquadratura(foto(2.2, 0.95, 0.15))!.fuoriCentro).toBeCloseTo(0.15, 2);
  });

  it('il formato è quello della foto', () => {
    expect(leggiInquadratura(buona())!.formato).toBeCloseTo(0.75, 3);
  });

  it('senza caviglie o senza viso non inventa un numero', () => {
    const v = buona();
    v.landmarks[27] = { ...v.landmarks[27], visibility: 0.1 };
    v.landmarks[28] = { ...v.landmarks[28], visibility: 0.1 };
    expect(leggiInquadratura(v)).toBeNull();
    expect(leggiInquadratura(null)).toBeNull();
    expect(leggiInquadratura({ landmarks: [], larghezza: 100, altezza: 100 })).toBeNull();
  });

  it('funziona anche di profilo, con un lato coperto', () => {
    const v = buona();
    [8, 12, 24, 26, 28, 30, 32].forEach((k) => { v.landmarks[k] = { ...v.landmarks[k], visibility: 0.2 }; });
    const i = leggiInquadratura(v)!;
    expect(i).not.toBeNull();
    expect(i.quotaCentro).toBeCloseTo(0.95 / H, 2);
  });
});

describe('questa foto va bene per misurare?', () => {
  it('la foto fatta bene passa senza consigli', () => {
    const g = giudicaInquadratura(leggiInquadratura(buona()));
    expect(g.ok).toBe(true);
    expect(g.consigli).toHaveLength(0);
  });

  it('troppo lontano: dice di avvicinarsi, con le percentuali', () => {
    const g = giudicaInquadratura(leggiInquadratura(foto(4, 0.95)));
    expect(g.ok).toBe(false);
    expect(g.consigli.join(' ')).toMatch(/Avvicinati.*40%/);
  });

  it('troppo vicino: dice di allontanarsi', () => {
    const g = giudicaInquadratura(leggiInquadratura(foto(1.75, 0.82)));
    expect(g.consigli.join(' ')).toMatch(/Allontanati/);
  });

  it('telefono troppo in alto: dice di abbassarlo e dove sta guardando', () => {
    const g = giudicaInquadratura(leggiInquadratura(foto(2.6, 1.35)));
    expect(g.consigli.join(' ')).toMatch(/Abbassa il telefono.*(petto|spalle)/);
  });

  it('telefono troppo in basso: dice di alzarlo', () => {
    const g = giudicaInquadratura(leggiInquadratura(foto(2.6, 0.5)));
    expect(g.consigli.join(' ')).toMatch(/Alza il telefono/);
  });

  it('persona fuori centro: dice da che parte', () => {
    const g = giudicaInquadratura(leggiInquadratura(foto(2.2, 0.95, 0.15)));
    expect(g.consigli.join(' ')).toMatch(/Centra la persona.*destra/);
  });

  it('una foto che non si legge non è «ok»', () => {
    const g = giudicaInquadratura(null);
    expect(g.ok).toBe(false);
    expect(g.consigli[0]).toMatch(/corpo intero/);
  });

  it('le parti del corpo sono in ordine dal basso all\'alto', () => {
    expect(parteDelCorpo(0.3)).toMatch(/cosce/);
    expect(parteDelCorpo(0.48)).toMatch(/bacino/);
    expect(parteDelCorpo(0.58)).toMatch(/ombelico/);
    expect(parteDelCorpo(0.7)).toMatch(/petto/);
  });

  it('il bersaglio contiene la foto fatta bene, con margine', () => {
    const i = leggiInquadratura(buona())!;
    expect(i.riempimento).toBeGreaterThan(BERSAGLIO.riempimento[0] + 0.05);
    expect(i.riempimento).toBeLessThan(BERSAGLIO.riempimento[1] - 0.05);
  });
});

describe('queste due foto si possono confrontare?', () => {
  const i = (v: VistaPosa): Inquadratura => leggiInquadratura(v)!;

  it('due foto prese uguali: sì', () => {
    const c = confrontaInquadrature(i(buona()), i(foto(2.25, 0.97)));
    expect(c.confrontabili).toBe(true);
    expect(c.motivi).toHaveLength(0);
  });

  it('distanza diversa: no, e dice come rifarla uguale', () => {
    const c = confrontaInquadrature(i(buona()), i(foto(2.75, 0.95)));
    expect(c.confrontabili).toBe(false);
    expect(c.motivi.join(' ')).toMatch(/Distanza diversa.*Avvicinati/);
  });

  it('se adesso si è più vicini, dice di allontanarsi', () => {
    const c = confrontaInquadrature(i(foto(2.75, 0.95)), i(buona()));
    expect(c.motivi.join(' ')).toMatch(/Allontanati/);
  });

  it('telefono più alto: no, e dice di abbassarlo', () => {
    const c = confrontaInquadrature(i(buona()), i(foto(2.2, 1.15)));
    expect(c.confrontabili).toBe(false);
    expect(c.motivi.join(' ')).toMatch(/Altezza del telefono diversa.*Abbassalo/);
  });

  it('una verticale e una orizzontale: no', () => {
    const c = confrontaInquadrature(i(buona()), i(foto(2.2, 0.95, 0, 1000, 750)));
    expect(c.motivi.join(' ')).toMatch(/Formato diverso/);
  });

  it('se manca l\'inquadratura di una delle due non dice «confrontabili»', () => {
    expect(confrontaInquadrature(null, i(buona())).confrontabili).toBe(false);
    expect(confrontaInquadrature(i(buona()), undefined).confrontabili).toBe(false);
  });
});

describe('i metri: una stima, dichiarata', () => {
  it('più mondo entra nella foto, più si è lontani', () => {
    const vicino = distanzaStimata(foto(2.2, 0.95), 175)!;
    const lontano = distanzaStimata(foto(3.3, 0.95), 175)!;
    expect(lontano / vicino).toBeCloseTo(1.5, 1);
  });

  it('per una foto verticale a figura intera viene un valore plausibile', () => {
    const d = distanzaStimata(buona(), 175)!;
    expect(d).toBeGreaterThan(1.2);
    expect(d).toBeLessThan(2.2);
  });

  it('senza statura non stima niente', () => {
    expect(distanzaStimata(buona(), undefined)).toBeNull();
    expect(distanzaStimata(buona(), 17)).toBeNull();
    expect(altezzaObiettivoCm(leggiInquadratura(buona()), null)).toBeNull();
  });
});
