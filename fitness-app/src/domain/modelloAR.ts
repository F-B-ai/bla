// ============================================================
// IL MODELLO IN REALTÀ AUMENTATA — il file che l'iPhone mette in piedi
// ------------------------------------------------------------
// Dal modello 3D (posture3d.ts) a un file .usdz: è il formato che
// iPhone e iPad aprono in realtà aumentata senza installare niente
// (AR Quick Look). Dentro c'è lo stesso scheletro schematico, in
// METRI: appoggiato sul pavimento è alto quanto la persona.
//
// Tutto si costruisce QUI, sul dispositivo: il file non viene
// caricato da nessuna parte e non contiene la foto — solo segmenti e
// sfere. Non c'è nessuna libreria esterna: un .usdz è un archivio zip
// non compresso con dentro un testo che descrive la geometria.
//
// Resta vero quello che è scritto in posture3d.ts: è uno schema per
// far vedere, non una scansione e non una misura clinica.
// ============================================================

import {
  Modello3D, Punto3, Tinte, OSSA, GIUNTI, puntoScena, RAGGIO_TESTA,
} from './posture3d';

type Materia = 'neutro' | 'lieve' | 'moderato' | 'piombo' | 'base';

/** Colori dei materiali, in rosso/verde/blu da 0 a 1. */
const COLORE: Record<Materia, [number, number, number]> = {
  neutro: [0.93, 0.93, 0.95],
  lieve: [1.0, 0.62, 0.04],
  moderato: [1.0, 0.27, 0.23],
  piombo: [0.39, 0.82, 1.0],
  base: [0.16, 0.16, 0.17],
};

const NOME_MATERIA: Record<Materia, string> = {
  neutro: 'Neutro',
  lieve: 'Lieve',
  moderato: 'Moderato',
  piombo: 'FiloAPiombo',
  base: 'Base',
};

// Spessori in metri: è un manichino, non un'anatomia.
const R_OSSO = 0.017;
const R_GIUNTO = 0.028;
const R_PIOMBO = 0.004;
const R_BASE = 0.3;

export interface Maglia {
  /** x,y,z per vertice */
  punti: number[];
  /** x,y,z per vertice, lunghezza 1 */
  normali: number[];
  /** tre indici per triangolo, in senso antiorario visti da fuori */
  facce: number[];
}

export const magliaVuota = (): Maglia => ({ punti: [], normali: [], facce: [] });

const sott = (a: Punto3, b: Punto3): Punto3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const vett = (a: Punto3, b: Punto3): Punto3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const norma = (a: Punto3): number => Math.hypot(a[0], a[1], a[2]);
const unita = (a: Punto3): Punto3 => {
  const n = norma(a) || 1;
  return [a[0] / n, a[1] / n, a[2] / n];
};

/** Aggiunge una sfera. */
export const aggiungiSfera = (
  m: Maglia, c: Punto3, r: number, paralleli = 8, meridiani = 12
): void => {
  const base = m.punti.length / 3;
  const metti = (nx: number, ny: number, nz: number): void => {
    m.punti.push(c[0] + nx * r, c[1] + ny * r, c[2] + nz * r);
    m.normali.push(nx, ny, nz);
  };
  metti(0, 1, 0); // polo in alto
  for (let j = 1; j < paralleli; j++) {
    const fi = (Math.PI * j) / paralleli;
    for (let i = 0; i < meridiani; i++) {
      const te = (2 * Math.PI * i) / meridiani;
      metti(Math.sin(fi) * Math.cos(te), Math.cos(fi), Math.sin(fi) * Math.sin(te));
    }
  }
  metti(0, -1, 0); // polo in basso
  const anello = (j: number, i: number): number =>
    base + 1 + (j - 1) * meridiani + (i % meridiani);
  const polo2 = base + 1 + (paralleli - 1) * meridiani;

  for (let i = 0; i < meridiani; i++) {
    m.facce.push(base, anello(1, i + 1), anello(1, i));
    m.facce.push(polo2, anello(paralleli - 1, i), anello(paralleli - 1, i + 1));
  }
  for (let j = 1; j < paralleli - 1; j++) {
    for (let i = 0; i < meridiani; i++) {
      m.facce.push(anello(j, i), anello(j, i + 1), anello(j + 1, i));
      m.facce.push(anello(j, i + 1), anello(j + 1, i + 1), anello(j + 1, i));
    }
  }
};

/** Aggiunge un cilindro aperto fra due punti (le sfere lo chiudono). */
export const aggiungiCilindro = (
  m: Maglia, a: Punto3, b: Punto3, r: number, lati = 10
): void => {
  const asse = sott(b, a);
  if (norma(asse) < 1e-6) return;
  const d = unita(asse);
  // un vettore qualunque non parallelo all'asse, per costruire la base
  const appoggio: Punto3 = Math.abs(d[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const u = unita(vett(appoggio, d));
  const v = vett(d, u); // u × v = d: giro antiorario visto dalla punta
  const base = m.punti.length / 3;
  for (let i = 0; i < lati; i++) {
    const te = (2 * Math.PI * i) / lati;
    const nx = Math.cos(te) * u[0] + Math.sin(te) * v[0];
    const ny = Math.cos(te) * u[1] + Math.sin(te) * v[1];
    const nz = Math.cos(te) * u[2] + Math.sin(te) * v[2];
    m.punti.push(a[0] + nx * r, a[1] + ny * r, a[2] + nz * r);
    m.normali.push(nx, ny, nz);
    m.punti.push(b[0] + nx * r, b[1] + ny * r, b[2] + nz * r);
    m.normali.push(nx, ny, nz);
  }
  for (let i = 0; i < lati; i++) {
    const a0 = base + 2 * i;
    const b0 = a0 + 1;
    const a1 = base + 2 * ((i + 1) % lati);
    const b1 = a1 + 1;
    m.facce.push(a0, a1, b1);
    m.facce.push(a0, b1, b0);
  }
};

/** Aggiunge un disco orizzontale che guarda in alto. */
export const aggiungiDisco = (m: Maglia, c: Punto3, r: number, lati = 28): void => {
  const base = m.punti.length / 3;
  m.punti.push(c[0], c[1], c[2]);
  m.normali.push(0, 1, 0);
  for (let i = 0; i < lati; i++) {
    const te = (2 * Math.PI * i) / lati;
    m.punti.push(c[0] + Math.cos(te) * r, c[1], c[2] + Math.sin(te) * r);
    m.normali.push(0, 1, 0);
  }
  for (let i = 0; i < lati; i++) {
    m.facce.push(base, base + 1 + ((i + 1) % lati), base + 1 + i);
  }
};

/**
 * La geometria del manichino, divisa per materiale: i segmenti che
 * le misure hanno segnato prendono il colore della loro gravità.
 */
export const maglieDelModello = (
  modello: Modello3D, tinte: Tinte = {}
): Record<Materia, Maglia> => {
  const out: Record<Materia, Maglia> = {
    neutro: magliaVuota(), lieve: magliaVuota(), moderato: magliaVuota(),
    piombo: magliaVuota(), base: magliaVuota(),
  };
  const materiaDi = (s: string | undefined): Materia =>
    s === 'moderato' ? 'moderato' : s === 'lieve' ? 'lieve' : 'neutro';

  // Niente sotto il pavimento: in AR il modello si appoggia sul punto
  // più basso, e un piede che sfonda di mezzo centimetro lo solleva.
  const sopra = (p: Punto3): Punto3 => [p[0], Math.max(p[1], R_OSSO + 0.002), p[2]];

  for (const o of OSSA) {
    const a = sopra(puntoScena(modello, o.da));
    const b = sopra(puntoScena(modello, o.a));
    const m = out[materiaDi(tinte[o.id])];
    aggiungiCilindro(m, a, b, R_OSSO);
    aggiungiSfera(m, a, R_OSSO, 4, 8);
    aggiungiSfera(m, b, R_OSSO, 4, 8);
  }
  for (const g of GIUNTI) {
    aggiungiSfera(out.neutro, puntoScena(modello, g), R_GIUNTO, 6, 10);
  }
  aggiungiSfera(
    out[materiaDi(tinte.collo)],
    puntoScena(modello, 'testa'),
    RAGGIO_TESTA * modello.statura_m,
    10, 16
  );

  // Il filo a piombo dal centro delle caviglie, e la base su cui sta.
  aggiungiCilindro(out.piombo, [0, 0.003, 0], [0, modello.statura_m * 1.03, 0], R_PIOMBO, 6);
  aggiungiDisco(out.base, [0, 0.002, 0], R_BASE);
  return out;
};

// ------------------------------------------------------------
// Il testo che descrive la scena (formato USD, variante leggibile)
// ------------------------------------------------------------

const n4 = (x: number): string => {
  const r = Math.round(x * 10000) / 10000;
  return Object.is(r, -0) ? '0' : String(r);
};

const terne = (a: number[]): string => {
  const out: string[] = [];
  for (let i = 0; i < a.length; i += 3) {
    out.push(`(${n4(a[i])}, ${n4(a[i + 1])}, ${n4(a[i + 2])})`);
  }
  return out.join(', ');
};

const estensione = (punti: number[]): string => {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < punti.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      if (punti[i + k] < min[k]) min[k] = punti[i + k];
      if (punti[i + k] > max[k]) max[k] = punti[i + k];
    }
  }
  return `[(${min.map(n4).join(', ')}), (${max.map(n4).join(', ')})]`;
};

const MATERIE: Materia[] = ['neutro', 'lieve', 'moderato', 'piombo', 'base'];

/** Il modello come testo USD. */
export const creaUsda = (modello: Modello3D, tinte: Tinte = {}): string => {
  const maglie = maglieDelModello(modello, tinte);
  const usate = MATERIE.filter((k) => maglie[k].facce.length > 0);

  const materiali = usate.map((k) => {
    const nome = NOME_MATERIA[k];
    const c = COLORE[k];
    return `        def Material "${nome}"
        {
            token outputs:surface.connect = </Root/Materiali/${nome}/Superficie.outputs:surface>

            def Shader "Superficie"
            {
                uniform token info:id = "UsdPreviewSurface"
                color3f inputs:diffuseColor = (${n4(c[0])}, ${n4(c[1])}, ${n4(c[2])})
                float inputs:metallic = 0
                float inputs:roughness = 0.55
                token outputs:surface
            }
        }`;
  }).join('\n\n');

  const geometrie = usate.map((k) => {
    const nome = NOME_MATERIA[k];
    const g = maglie[k];
    const conteggi = new Array(g.facce.length / 3).fill(3).join(', ');
    return `    def Mesh "${nome}" (
        prepend apiSchemas = ["MaterialBindingAPI"]
    )
    {
        float3[] extent = ${estensione(g.punti)}
        int[] faceVertexCounts = [${conteggi}]
        int[] faceVertexIndices = [${g.facce.join(', ')}]
        rel material:binding = </Root/Materiali/${nome}>
        normal3f[] normals = [${terne(g.normali)}] (
            interpolation = "vertex"
        )
        point3f[] points = [${terne(g.punti)}]
        uniform token subdivisionScheme = "none"
    }`;
  }).join('\n\n');

  return `#usda 1.0
(
    customLayerData = {
        string creator = "ESSERE - modello posturale schematico"
    }
    defaultPrim = "Root"
    metersPerUnit = 1
    upAxis = "Y"
)

def Xform "Root" (
    kind = "component"
)
{
    def Scope "Materiali"
    {
${materiali}
    }

${geometrie}
}
`;
};

// ------------------------------------------------------------
// L'archivio .usdz: uno zip NON compresso, con ogni file che comincia
// a un multiplo di 64 byte (lo chiede il formato, non lo zip).
// ------------------------------------------------------------

let tavolaCrc: number[] | null = null;
export const crc32 = (dati: Uint8Array): number => {
  if (!tavolaCrc) {
    tavolaCrc = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      tavolaCrc.push(c >>> 0);
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < dati.length; i++) {
    crc = tavolaCrc[(crc ^ dati[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
};

/** Il testo che scriviamo è solo ASCII: un byte per carattere. */
export const inByte = (testo: string): Uint8Array => {
  const out = new Uint8Array(testo.length);
  for (let i = 0; i < testo.length; i++) out[i] = testo.charCodeAt(i) & 0x7f;
  return out;
};

const ALLINEAMENTO = 64;
const ID_RIEMPITIVO = 0x1986; // campo extra senza significato: solo spazio
const DATA_DOS = ((2026 - 1980) << 9) | (11 << 5) | 10;

export const impacchettaUsdz = (
  file: Array<{ nome: string; dati: Uint8Array }>
): Uint8Array => {
  const pezzi: Uint8Array[] = [];
  const indice: Uint8Array[] = [];
  let posizione = 0;

  const u16 = (vista: DataView, o: number, x: number): void => vista.setUint16(o, x, true);
  const u32 = (vista: DataView, o: number, x: number): void => vista.setUint32(o, x >>> 0, true);

  for (const f of file) {
    const nome = inByte(f.nome);
    const crc = crc32(f.dati);
    // quanto riempitivo serve perché i dati partano a un multiplo di 64
    const fisso = 30 + nome.length + 4;
    const riemp = (ALLINEAMENTO - ((posizione + fisso) % ALLINEAMENTO)) % ALLINEAMENTO;
    const extra = 4 + riemp;

    const testa = new Uint8Array(30 + nome.length + extra);
    const tv = new DataView(testa.buffer);
    u32(tv, 0, 0x04034b50);
    u16(tv, 4, 20);
    u16(tv, 6, 0);
    u16(tv, 8, 0); // metodo 0: nessuna compressione
    u16(tv, 10, 0);
    u16(tv, 12, DATA_DOS);
    u32(tv, 14, crc);
    u32(tv, 18, f.dati.length);
    u32(tv, 22, f.dati.length);
    u16(tv, 26, nome.length);
    u16(tv, 28, extra);
    testa.set(nome, 30);
    u16(tv, 30 + nome.length, ID_RIEMPITIVO);
    u16(tv, 30 + nome.length + 2, riemp);

    const voce = new Uint8Array(46 + nome.length);
    const vv = new DataView(voce.buffer);
    u32(vv, 0, 0x02014b50);
    u16(vv, 4, 20);
    u16(vv, 6, 20);
    u16(vv, 8, 0);
    u16(vv, 10, 0);
    u16(vv, 12, 0);
    u16(vv, 14, DATA_DOS);
    u32(vv, 16, crc);
    u32(vv, 20, f.dati.length);
    u32(vv, 24, f.dati.length);
    u16(vv, 28, nome.length);
    u16(vv, 30, 0);
    u16(vv, 32, 0);
    u16(vv, 34, 0);
    u16(vv, 36, 0);
    u32(vv, 38, 0);
    u32(vv, 42, posizione);
    voce.set(nome, 46);

    pezzi.push(testa, f.dati);
    indice.push(voce);
    posizione += testa.length + f.dati.length;
  }

  const inizioIndice = posizione;
  const lungoIndice = indice.reduce((s, v) => s + v.length, 0);
  const coda = new Uint8Array(22);
  const cv = new DataView(coda.buffer);
  u32(cv, 0, 0x06054b50);
  u16(cv, 4, 0);
  u16(cv, 6, 0);
  u16(cv, 8, file.length);
  u16(cv, 10, file.length);
  u32(cv, 12, lungoIndice);
  u32(cv, 16, inizioIndice);
  u16(cv, 20, 0);

  const tutto = [...pezzi, ...indice, coda];
  const out = new Uint8Array(tutto.reduce((s, p) => s + p.length, 0));
  let o = 0;
  for (const p of tutto) { out.set(p, o); o += p.length; }
  return out;
};

/** Il file .usdz del modello, pronto da aprire in realtà aumentata. */
export const creaUsdz = (modello: Modello3D, tinte: Tinte = {}): Uint8Array =>
  impacchettaUsdz([{ nome: 'modello.usda', dati: inByte(creaUsda(modello, tinte)) }]);
