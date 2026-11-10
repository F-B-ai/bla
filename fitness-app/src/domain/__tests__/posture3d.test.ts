import * as fs from 'fs';
import * as path from 'path';
import { Landmark } from '../gait';
import {
  costruisciModello3D, proietta, scena, tinteDalleMisure, puntoScena, modelloValido,
  NOMI_PUNTI, NomePunto, Punto3, VistaPosa, VISTE, OSSA, GIUNTI,
  QUOTA_CAVIGLIA, QUOTA_SPALLA, STATURA_PREDEFINITA_CM, Modello3D,
} from '../posture3d';
import {
  creaUsda, creaUsdz, impacchettaUsdz, crc32, inByte,
  magliaVuota, aggiungiSfera, aggiungiCilindro, maglieDelModello, Maglia,
} from '../modelloAR';
import { computePostureMetrics, raddrizza, PostureMetrics } from '../posture';

// ============================================================
// 10 novembre 2026 — IL MODELLO 3D
// ------------------------------------------------------------
// Stesso metodo dei test della postura: costruisco io una persona
// nello spazio, con misure che DECIDO io, la «fotografo» di fronte e
// di profilo con due foto diverse per formato e distanza, e chiedo
// al motore di ricostruirla. Se ritrova i miei metri, funziona.
// ============================================================

const INDICE: Record<NomePunto, number> = {
  naso: 0, orecchioSx: 7, orecchioDx: 8, spallaSx: 11, spallaDx: 12,
  gomitoSx: 13, gomitoDx: 14, polsoSx: 15, polsoDx: 16, ancaSx: 23, ancaDx: 24,
  ginocchioSx: 25, ginocchioDx: 26, cavigliaSx: 27, cavigliaDx: 28,
  talloneSx: 29, talloneDx: 30, puntaSx: 31, puntaDx: 32,
};

const H = 1.8;
const CAV = QUOTA_CAVIGLIA * H;
const SP = QUOTA_SPALLA * H;

/** Una persona vera, in metri. Testa 6 cm in avanti, spalla sx 2 cm più alta. */
const persona = (): Record<NomePunto, Punto3> => ({
  naso: [0, 1.66, 0.16],
  orecchioSx: [0.075, 1.67, 0.06], orecchioDx: [-0.075, 1.67, 0.06],
  spallaSx: [0.2, SP + 0.01, 0], spallaDx: [-0.2, SP - 0.01, 0],
  gomitoSx: [0.24, 1.15, 0.01], gomitoDx: [-0.24, 1.15, 0.01],
  polsoSx: [0.25, 0.9, 0.04], polsoDx: [-0.25, 0.9, 0.04],
  ancaSx: [0.1, 0.95, 0.01], ancaDx: [-0.1, 0.95, 0.01],
  ginocchioSx: [0.1, 0.5, 0.02], ginocchioDx: [-0.1, 0.5, 0.02],
  cavigliaSx: [0.1, CAV, 0], cavigliaDx: [-0.1, CAV, 0],
  talloneSx: [0.1, 0.02, -0.05], talloneDx: [-0.1, 0.02, -0.05],
  puntaSx: [0.11, 0.01, 0.17], puntaDx: [-0.11, 0.01, 0.17],
});

const vuoti = (): Landmark[] =>
  Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 0.1 }));

/** Fotografa di fronte: la sinistra del soggetto finisce a destra. */
const fotoFrontale = (
  p: Record<NomePunto, Punto3>, largo: number, alto: number, pxPerMetro: number, specchio = 1
): VistaPosa => {
  const lm = vuoti();
  for (const n of NOMI_PUNTI) {
    lm[INDICE[n]] = {
      x: (largo / 2 + specchio * p[n][0] * pxPerMetro) / largo,
      y: (alto * 0.95 - p[n][1] * pxPerMetro) / alto,
      visibility: 0.95,
    };
  }
  return { landmarks: lm, larghezza: largo, altezza: alto };
};

/** Fotografa di profilo. verso=+1: guarda verso destra nell'immagine. */
const fotoProfilo = (
  p: Record<NomePunto, Punto3>, largo: number, alto: number, pxPerMetro: number,
  verso: 1 | -1, latoVisibile: 'Sx' | 'Dx' = 'Sx'
): VistaPosa => {
  const lm = vuoti();
  for (const n of NOMI_PUNTI) {
    const coperto = (n.endsWith('Sx') || n.endsWith('Dx')) && !n.endsWith(latoVisibile);
    lm[INDICE[n]] = {
      x: (largo / 2 + verso * p[n][2] * pxPerMetro) / largo,
      y: (alto * 0.9 - p[n][1] * pxPerMetro) / alto,
      visibility: coperto ? 0.2 : 0.95,
    };
  }
  return { landmarks: lm, larghezza: largo, altezza: alto };
};

const costruisci = (extra: Partial<Parameters<typeof costruisciModello3D>[0]> = {}): Modello3D => {
  const p = persona();
  const r = costruisciModello3D({
    frontale: fotoFrontale(p, 750, 1000, 480),   // 3:4
    laterale: fotoProfilo(p, 1080, 1920, 900, 1), // 9:16, altra distanza
    staturaCm: 180,
    ...extra,
  });
  if (!r.ok) throw new Error(r.motivo);
  return r.modello;
};

describe('fusione di frontale e profilo', () => {
  it('ritrova ogni punto entro 2 mm, con foto di formato e distanza diversi', () => {
    const m = costruisci();
    const vero = persona();
    for (const n of NOMI_PUNTI) {
      expect(Math.abs(m.punti[n][0] - vero[n][0])).toBeLessThan(0.002);
      expect(Math.abs(m.punti[n][1] - vero[n][1])).toBeLessThan(0.002);
      expect(Math.abs(m.punti[n][2] - vero[n][2])).toBeLessThan(0.002);
    }
    expect(m.profondita).toBe('profilo');
    expect(m.staturaDichiarata).toBe(true);
  });

  it('il davanti resta davanti anche se nel profilo guarda a sinistra', () => {
    const p = persona();
    const m = costruisci({ laterale: fotoProfilo(p, 1080, 1920, 900, -1) });
    expect(m.punti.naso[2]).toBeGreaterThan(0.1);      // il naso è avanti
    expect(m.punti.talloneSx[2]).toBeLessThan(0);       // il tallone dietro
  });

  it('funziona uguale col profilo destro', () => {
    const p = persona();
    const m = costruisci({ laterale: fotoProfilo(p, 1080, 1920, 900, 1, 'Dx') });
    expect(m.punti.naso[2]).toBeCloseTo(0.16, 2);
    expect(m.profondita).toBe('profilo');
  });

  it('la sinistra del soggetto resta a sinistra anche dalla foto di spalle', () => {
    const p = persona();
    const m = costruisci({
      frontale: null,
      posteriore: fotoFrontale(p, 750, 1000, 480, -1),
    });
    expect(m.base).toBe('posteriore');
    expect(m.punti.spallaSx[0]).toBeGreaterThan(0.15);
    expect(m.punti.spallaDx[0]).toBeLessThan(-0.15);
    // e l'asimmetria non si ribalta: la spalla sinistra era la più alta
    expect(m.punti.spallaSx[1]).toBeGreaterThan(m.punti.spallaDx[1]);
  });

  it('è in metri: caviglia e spalla alla quota attesa per quella statura', () => {
    const m = costruisci();
    expect(puntoScena(m, 'collo')[1]).toBeCloseTo(SP, 2);
    expect((m.punti.cavigliaSx[1] + m.punti.cavigliaDx[1]) / 2).toBeCloseTo(CAV, 2);
  });

  it('niente finisce sotto il pavimento', () => {
    const m = costruisci();
    for (const n of NOMI_PUNTI) expect(m.punti[n][1]).toBeGreaterThanOrEqual(0);
  });
});

describe('i limiti, detti e non nascosti', () => {
  it('senza profilo il modello è PIATTO e lo dichiara', () => {
    const m = costruisci({ laterale: null });
    expect(m.profondita).toBe('assente');
    for (const n of NOMI_PUNTI) expect(m.punti[n][2]).toBe(0);
    expect(m.note.join(' ')).toMatch(/Manca la foto di profilo/);
  });

  it('un profilo illeggibile non inventa la profondità', () => {
    const p = persona();
    const profilo = fotoProfilo(p, 1080, 1920, 900, 1);
    profilo.landmarks = profilo.landmarks.map((l) => ({ ...l, visibility: 0.1 }));
    const m = costruisci({ laterale: profilo });
    expect(m.profondita).toBe('assente');
    expect(m.note.join(' ')).toMatch(/non si legge bene/);
  });

  it('con il profilo dice che i due lati hanno la stessa profondità', () => {
    expect(costruisci().note.join(' ')).toMatch(/uguale per i due lati/);
  });

  it('senza statura usa una media e avvisa che i centimetri non sono suoi', () => {
    const m = costruisci({ staturaCm: undefined });
    expect(m.staturaDichiarata).toBe(false);
    expect(m.statura_m).toBe(STATURA_PREDEFINITA_CM / 100);
    expect(m.note.join(' ')).toMatch(/Statura non in anagrafica/);
  });

  it('una statura assurda non viene presa per buona', () => {
    expect(costruisci({ staturaCm: 17 }).staturaDichiarata).toBe(false);
    expect(costruisci({ staturaCm: 1800 }).staturaDichiarata).toBe(false);
  });

  it('senza frontale né posteriore non costruisce niente, e dice perché', () => {
    const r = costruisciModello3D({ laterale: fotoProfilo(persona(), 1080, 1920, 900, 1) });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motivo).toMatch(/frontale/);
  });

  it('se spalle, bacino o caviglie non si leggono si ferma', () => {
    const f = fotoFrontale(persona(), 750, 1000, 480);
    f.landmarks[27] = { ...f.landmarks[27], visibility: 0.1 };
    const r = costruisciModello3D({ frontale: f });
    expect(r.ok).toBe(false);
  });

  it('una persona seduta non viene messa in scala come se fosse in piedi', () => {
    const seduta = persona();
    seduta.ancaSx = [0.1, 0.25, 0.01]; // bacino quasi a terra
    seduta.ancaDx = [-0.1, 0.25, 0.01];
    const r = costruisciModello3D({ frontale: fotoFrontale(seduta, 750, 1000, 480) });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motivo).toMatch(/non risulta in piedi/);
  });

  it('due foto che non combaciano vengono segnalate', () => {
    const p = persona();
    const storta = persona();
    storta.ancaSx = [0.1, 1.2, 0.01]; // bacino 25 cm più su: non è la stessa posa
    storta.ancaDx = [-0.1, 1.2, 0.01];
    const m = costruisci({ laterale: fotoProfilo(storta, 1080, 1920, 900, 1) });
    expect(m.note.join(' ')).toMatch(/non combaciano/);
    expect(costruisci({ laterale: fotoProfilo(p, 1080, 1920, 900, 1) }).note.join(' '))
      .not.toMatch(/non combaciano/);
  });
});

describe('guardarlo: la proiezione', () => {
  const p: Punto3 = [0.2, 1.5, 0.1]; // spalla sinistra, un po' avanti

  it('di fronte la sinistra del soggetto è a destra dello schermo', () => {
    const s = proietta(p, VISTE.fronte);
    expect(s.x).toBeCloseTo(0.2, 6);
    expect(s.y).toBeCloseTo(1.5, 6);
  });

  it('di profilo l\'asse orizzontale diventa la profondità', () => {
    expect(proietta(p, VISTE.profiloDx).x).toBeCloseTo(0.1, 6);
    expect(proietta(p, VISTE.profiloSx).x).toBeCloseTo(-0.1, 6);
  });

  it('da dietro si specchia', () => {
    expect(proietta(p, VISTE.dietro).x).toBeCloseTo(-0.2, 6);
  });

  it('girare non cambia le altezze né le lunghezze', () => {
    const a: Punto3 = [0.2, 1.5, 0.1];
    const b: Punto3 = [-0.1, 0.4, -0.05];
    const lungo = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
    for (const imbardata of [0, 37, 90, 201]) {
      const pa = proietta(a, { imbardata, beccheggio: 0 });
      const pb = proietta(b, { imbardata, beccheggio: 0 });
      expect(pa.y).toBeCloseTo(1.5, 6);
      expect(Math.hypot(pa.x - pb.x, pa.y - pb.y, pa.z - pb.z)).toBeCloseTo(lungo, 6);
    }
  });

  it('la scena esce ordinata dal più lontano al più vicino', () => {
    const s = scena(costruisci(), { imbardata: 30, beccheggio: 10 });
    for (let i = 1; i < s.length; i++) expect(s[i].z).toBeGreaterThanOrEqual(s[i - 1].z);
    expect(s.filter((t) => t.tipo === 'osso')).toHaveLength(OSSA.length);
    expect(s.filter((t) => t.tipo === 'giunto')).toHaveLength(GIUNTI.length);
    expect(s.filter((t) => t.tipo === 'piombo')).toHaveLength(1);
    expect(s.filter((t) => t.tipo === 'testa')).toHaveLength(1);
  });

  it('il filo a piombo è verticale e parte dal centro delle caviglie', () => {
    const filo = scena(costruisci(), VISTE.profiloDx).find((t) => t.tipo === 'piombo')!;
    expect(filo.x1).toBeCloseTo(0, 6);
    expect(filo.x2).toBeCloseTo(0, 6);
  });
});

describe('i colori vengono dalle misure, non da un\'opinione', () => {
  const vista = (findings: PostureMetrics['findings'], quality: 'ok' | 'insufficiente' = 'ok'): PostureMetrics => ({
    version: 4, view: 'laterale', findings, notable: [], quality, quality_notes: [],
  });

  it('ogni misura colora il suo segmento', () => {
    const t = tinteDalleMisure([vista([
      { key: 'forward_head', label: '', severity: 'moderato' },
      { key: 'shoulder_tilt', label: '', severity: 'lieve' },
      { key: 'pelvic_obliquity', label: '', severity: 'normale' },
    ])]);
    expect(t.collo).toBe('moderato');
    expect(t.spalle).toBe('lieve');
    expect(t.bacino).toBeUndefined();
  });

  it('se due misure toccano lo stesso segmento vince la più marcata', () => {
    const t = tinteDalleMisure([
      vista([{ key: 'head_shift', label: '', severity: 'lieve' }]),
      vista([{ key: 'forward_head', label: '', severity: 'moderato' }]),
      vista([{ key: 'head_shift', label: '', severity: 'normale' }]),
    ]);
    expect(t.collo).toBe('moderato');
  });

  it('una vista non leggibile non colora niente', () => {
    expect(tinteDalleMisure([vista(
      [{ key: 'forward_head', label: '', severity: 'moderato' }], 'insufficiente'
    )])).toEqual({});
  });

  it('nessuna misura, nessun colore — e nessun errore', () => {
    expect(tinteDalleMisure(undefined)).toEqual({});
    expect(tinteDalleMisure([])).toEqual({});
  });

  it('il colore arriva fino alla scena', () => {
    const s = scena(costruisci(), VISTE.fronte, { spalle: 'lieve' });
    expect(s.find((t) => t.id === 'spalle')!.severita).toBe('lieve');
    expect(s.find((t) => t.id === 'colonna')!.severita).toBe('normale');
  });
});

describe('il modello salvato si riconosce', () => {
  it('uno buono passa', () => {
    expect(modelloValido(JSON.parse(JSON.stringify(costruisci())))).toBe(true);
  });
  it('uno rotto no', () => {
    const m = JSON.parse(JSON.stringify(costruisci()));
    delete m.punti.naso;
    expect(modelloValido(m)).toBe(false);
    expect(modelloValido(null)).toBe(false);
    expect(modelloValido({})).toBe(false);
  });
});

// ============================================================
// MODELLO 3D E MISURE 2D DEVONO DIRE LA STESSA COSA
// ------------------------------------------------------------
// La testa in avanti misurata sulla foto di profilo e quella che si
// legge sul modello ricostruito sono lo stesso angolo. Se divergono,
// uno dei due mente.
// ============================================================

describe('il modello concorda con le misure', () => {
  it('testa in avanti: stesso angolo dalla foto e dal modello', () => {
    const p = persona();
    const profilo = fotoProfilo(p, 1080, 1920, 900, 1);
    const misura = computePostureMetrics(
      raddrizza(profilo.landmarks, profilo.larghezza, profilo.altezza), 'laterale'
    ).findings.find((f) => f.key === 'forward_head')!;

    const m = costruisci();
    const or = m.punti.orecchioSx;
    const sp = m.punti.spallaSx;
    const dalModello = (Math.atan2(Math.abs(or[2] - sp[2]), or[1] - sp[1]) * 180) / Math.PI;
    expect(misura.value_deg!).toBeCloseTo(dalModello, 0);
  });
});

// ============================================================
// IL FILE PER LA REALTÀ AUMENTATA
// ============================================================

const volume = (g: Maglia): number => {
  let v = 0;
  for (let i = 0; i < g.facce.length; i += 3) {
    const a = g.facce[i] * 3, b = g.facce[i + 1] * 3, c = g.facce[i + 2] * 3;
    const [ax, ay, az] = [g.punti[a], g.punti[a + 1], g.punti[a + 2]];
    const [bx, by, bz] = [g.punti[b], g.punti[b + 1], g.punti[b + 2]];
    const [cx, cy, cz] = [g.punti[c], g.punti[c + 1], g.punti[c + 2]];
    v += (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6;
  }
  return v;
};

describe('la geometria è girata dal verso giusto', () => {
  // Una faccia girata al contrario in AR è invisibile: il volume con
  // segno lo scopre, perché una sfera rovesciata ha volume negativo.
  it('la sfera ha il volume di una sfera, positivo', () => {
    const g = magliaVuota();
    aggiungiSfera(g, [1, 2, 3], 0.5, 24, 48);
    expect(volume(g)).toBeGreaterThan(0);
    expect(volume(g)).toBeCloseTo((4 / 3) * Math.PI * 0.125, 2);
  });

  it('le normali della sfera puntano in fuori e sono lunghe 1', () => {
    const g = magliaVuota();
    aggiungiSfera(g, [1, 2, 3], 0.5);
    for (let i = 0; i < g.punti.length; i += 3) {
      const fuori = [g.punti[i] - 1, g.punti[i + 1] - 2, g.punti[i + 2] - 3];
      const dot = fuori[0] * g.normali[i] + fuori[1] * g.normali[i + 1] + fuori[2] * g.normali[i + 2];
      expect(dot).toBeCloseTo(0.5, 5);
    }
  });

  it('il cilindro guarda in fuori in qualunque direzione sia messo', () => {
    for (const b of [[0, 1, 0], [1, 0, 0], [0, 0, 1], [0.3, -0.8, 0.5], [0, -1, 0]] as Punto3[]) {
      const g = magliaVuota();
      aggiungiCilindro(g, [0, 0, 0], b, 0.1, 16);
      for (let i = 0; i < g.facce.length; i += 3) {
        const ia = g.facce[i] * 3, ib = g.facce[i + 1] * 3, ic = g.facce[i + 2] * 3;
        const e1 = [g.punti[ib] - g.punti[ia], g.punti[ib + 1] - g.punti[ia + 1], g.punti[ib + 2] - g.punti[ia + 2]];
        const e2 = [g.punti[ic] - g.punti[ia], g.punti[ic + 1] - g.punti[ia + 1], g.punti[ic + 2] - g.punti[ia + 2]];
        const n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
        const dot = n[0] * g.normali[ia] + n[1] * g.normali[ia + 1] + n[2] * g.normali[ia + 2];
        expect(dot).toBeGreaterThan(0);
      }
    }
  });

  it('un segmento lungo zero non rompe niente', () => {
    const g = magliaVuota();
    aggiungiCilindro(g, [1, 1, 1], [1, 1, 1], 0.1);
    expect(g.facce).toHaveLength(0);
  });

  it('ogni indice punta a un vertice che esiste', () => {
    const maglie = maglieDelModello(costruisci(), { collo: 'moderato', spalle: 'lieve' });
    for (const g of Object.values(maglie)) {
      const n = g.punti.length / 3;
      expect(g.normali.length).toBe(g.punti.length);
      expect(g.facce.length % 3).toBe(0);
      for (const i of g.facce) { expect(i).toBeGreaterThanOrEqual(0); expect(i).toBeLessThan(n); }
      for (const x of g.punti) expect(Number.isFinite(x)).toBe(true);
    }
    expect(maglie.moderato.facce.length).toBeGreaterThan(0);
    expect(maglie.lieve.facce.length).toBeGreaterThan(0);
  });
});

describe('il file .usdz', () => {
  it('il CRC è quello dello standard', () => {
    expect(crc32(inByte('123456789'))).toBe(0xcbf43926);
  });

  it('il testo dichiara metri, asse Y in alto e il prim di partenza', () => {
    const t = creaUsda(costruisci());
    expect(t.startsWith('#usda 1.0')).toBe(true);
    expect(t).toMatch(/metersPerUnit = 1/);
    expect(t).toMatch(/upAxis = "Y"/);
    expect(t).toMatch(/defaultPrim = "Root"/);
    expect(t).toMatch(/UsdPreviewSurface/);
    expect(t).not.toMatch(/NaN|Infinity|undefined/);
  });

  it('i segmenti segnati finiscono nel materiale del loro colore', () => {
    const senza = creaUsda(costruisci());
    expect(senza).not.toMatch(/def Mesh "Moderato"/);
    const con = creaUsda(costruisci(), { collo: 'moderato' });
    expect(con).toMatch(/def Mesh "Moderato"/);
    expect(con).toMatch(/material:binding = <\/Root\/Materiali\/Moderato>/);
  });

  it('è alto quanto la persona: in AR sta in piedi a grandezza naturale', () => {
    const maglie = maglieDelModello(costruisci());
    let alto = -Infinity, basso = Infinity;
    for (const g of Object.values(maglie)) {
      for (let i = 1; i < g.punti.length; i += 3) {
        alto = Math.max(alto, g.punti[i]); basso = Math.min(basso, g.punti[i]);
      }
    }
    expect(basso).toBeGreaterThanOrEqual(0);
    expect(alto).toBeGreaterThan(1.7);
    expect(alto).toBeLessThan(1.95);
  });

  it('è uno zip non compresso, coi dati che partono a un multiplo di 64', () => {
    const z = creaUsdz(costruisci());
    const v = new DataView(z.buffer, z.byteOffset, z.byteLength);
    expect(v.getUint32(0, true)).toBe(0x04034b50);
    expect(v.getUint16(8, true)).toBe(0); // metodo: nessuna compressione
    const nome = v.getUint16(26, true);
    const extra = v.getUint16(28, true);
    expect((30 + nome + extra) % 64).toBe(0);
    expect(String.fromCharCode(...Array.from(z.slice(30, 30 + nome)))).toBe('modello.usda');
    // il contenuto è il testo, in chiaro
    const inizio = 30 + nome + extra;
    expect(String.fromCharCode(...Array.from(z.slice(inizio, inizio + 9)))).toBe('#usda 1.0');
    // e in fondo c'è la chiusura dell'archivio
    expect(v.getUint32(z.length - 22, true)).toBe(0x06054b50);
  });

  it('l\'allineamento regge anche con più file e nomi di lunghezze diverse', () => {
    const z = impacchettaUsdz([
      { nome: 'a.usda', dati: inByte('x'.repeat(7)) },
      { nome: 'cartella/secondo-file.usda', dati: inByte('y'.repeat(131)) },
      { nome: 'b', dati: inByte('z') },
    ]);
    const v = new DataView(z.buffer, z.byteOffset, z.byteLength);
    let o = 0;
    let visti = 0;
    while (v.getUint32(o, true) === 0x04034b50) {
      const nome = v.getUint16(26 + o, true);
      const extra = v.getUint16(28 + o, true);
      const lungo = v.getUint32(18 + o, true);
      expect((o + 30 + nome + extra) % 64).toBe(0);
      o += 30 + nome + extra + lungo;
      visti++;
    }
    expect(visti).toBe(3);
    expect(v.getUint32(o, true)).toBe(0x02014b50);
  });
});

// ============================================================
// IL CABLAGGIO — una funzione che esiste e non si raggiunge non esiste
// ============================================================

describe('il modello 3D è collegato allo schermo', () => {
  const leggi = (...p: string[]): string =>
    fs.readFileSync(path.join(__dirname, '..', '..', ...p), 'utf8');

  it('la schermata della valutazione posturale lo costruisce e lo mostra', () => {
    const s = leggi('screens', 'shared', 'PosturalAssessmentScreen.tsx');
    expect(s).toMatch(/costruisciModelloDalleFoto\(/);
    expect(s).toMatch(/<Modello3DView/);
  });

  it('e lo salva insieme alla valutazione', () => {
    const s = leggi('screens', 'shared', 'PosturalAssessmentScreen.tsx');
    const i = s.indexOf('await createAssessment({');
    expect(s.slice(i, i + 1200)).toMatch(/modello3d/);
  });

  it('il servizio raddrizza le foto prima di fonderle: lo fa il dominio', () => {
    const d = leggi('domain', 'posture3d.ts');
    expect(d).toMatch(/raddrizza\(vistaBase\.landmarks, vistaBase\.larghezza, vistaBase\.altezza\)/);
  });

  it('chi guarda il modello legge sempre i suoi limiti', () => {
    const c = leggi('components', 'postura', 'Modello3DView.tsx');
    expect(c).toMatch(/modello\.note\.map/);
    expect(c).toMatch(/non è una scansione/i);
  });

  it('le foto si misurano raddrizzate, non sui numeri grezzi', () => {
    const s = leggi('services', 'postureMeasure.ts');
    expect(s).toMatch(/raddrizza\(posa\.landmarks, posa\.larghezza, posa\.altezza\)/);
  });
});
