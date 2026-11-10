// ============================================================
// IL MODELLO 3D DELLA POSTURA — due foto, uno spazio
// ------------------------------------------------------------
// 10 novembre 2026. Il titolare: «Crea analisi posturale 3D dalle
// foto, con modello AR».
//
// CHE COS'È. Una foto frontale dice dove sta ogni articolazione in
// LARGHEZZA e in ALTEZZA. Una foto di profilo dice dove sta in
// PROFONDITÀ (avanti/indietro) e in altezza. Messe insieme danno tre
// coordinate per punto: uno scheletro schematico che si può girare,
// e mettere in piedi in una stanza a grandezza naturale.
//
// CHE COSA NON È — e va detto a chi lo guarda, ogni volta:
//  • non è una scansione del corpo: sono 19 punti e i segmenti che
//    li uniscono;
//  • la profondità viene da UN profilo: i due lati hanno la stessa,
//    quindi le rotazioni (una spalla più avanti dell'altra) qui NON
//    si vedono, e non vanno lette;
//  • senza la foto di profilo il modello è piatto, e lo dichiara;
//  • la scala in metri viene dalla statura scritta in anagrafica e da
//    proporzioni medie del corpo: è indicativa.
//
// È uno strumento per FAR VEDERE e orientare il lavoro in sala.
// Screening e orientamento educativo-motorio: mai diagnosi.
//
// STESSA DOTTRINA del resto: le formule calcolano. Qui non c'è
// nessuna intelligenza artificiale e nessun numero stimato a occhio.
// ============================================================

import { Landmark } from './gait';
import { raddrizza, PostureMetrics, PostureSeverity } from './posture';

export const MODELLO_3D_VERSIONE = 1;

/** Metri. X verso la SINISTRA del soggetto, Y in alto, Z in AVANTI. */
export type Punto3 = [number, number, number];

export type NomePunto =
  | 'naso'
  | 'orecchioSx' | 'orecchioDx'
  | 'spallaSx' | 'spallaDx'
  | 'gomitoSx' | 'gomitoDx'
  | 'polsoSx' | 'polsoDx'
  | 'ancaSx' | 'ancaDx'
  | 'ginocchioSx' | 'ginocchioDx'
  | 'cavigliaSx' | 'cavigliaDx'
  | 'talloneSx' | 'talloneDx'
  | 'puntaSx' | 'puntaDx';

/** Indice MediaPipe di ogni punto, e il suo gemello dell'altro lato. */
const INDICE: Record<NomePunto, number> = {
  naso: 0,
  orecchioSx: 7, orecchioDx: 8,
  spallaSx: 11, spallaDx: 12,
  gomitoSx: 13, gomitoDx: 14,
  polsoSx: 15, polsoDx: 16,
  ancaSx: 23, ancaDx: 24,
  ginocchioSx: 25, ginocchioDx: 26,
  cavigliaSx: 27, cavigliaDx: 28,
  talloneSx: 29, talloneDx: 30,
  puntaSx: 31, puntaDx: 32,
};

export const NOMI_PUNTI = Object.keys(INDICE) as NomePunto[];

// Proporzioni medie del corpo in frazioni della statura (Drillis e
// Contini, riprese da Winter): altezza da terra della caviglia e
// della spalla. Servono solo a dare una scala in metri.
export const QUOTA_CAVIGLIA = 0.039;
export const QUOTA_SPALLA = 0.818;
/** Raggio della testa, in frazioni della statura: è un segnaposto. */
export const RAGGIO_TESTA = 0.055;

export const STATURA_PREDEFINITA_CM = 170;

const MIN_VIS = 0.5;
const vis = (p: Landmark | undefined): number => (p ? p.visibility ?? 1 : 0);
const mm = (x: number): number => Math.round(x * 1000) / 1000;

/** Una foto già letta: i 33 punti e le dimensioni della foto. */
export interface VistaPosa {
  landmarks: Landmark[];
  larghezza: number;
  altezza: number;
}

export interface IngressoModello {
  frontale?: VistaPosa | null;
  posteriore?: VistaPosa | null;
  laterale?: VistaPosa | null;
  /** statura in centimetri, se in anagrafica */
  staturaCm?: number | null;
}

export interface Modello3D {
  versione: number;
  statura_m: number;
  /** false = statura non nota: scala calcolata su una statura media */
  staturaDichiarata: boolean;
  /** da dove viene la terza dimensione */
  profondita: 'profilo' | 'assente';
  /** quale foto ha dato larghezza e altezza */
  base: 'frontale' | 'posteriore';
  punti: Record<NomePunto, Punto3>;
  /** limiti di QUESTO modello, da mostrare a chi lo guarda */
  note: string[];
}

export type EsitoModello =
  | { ok: true; modello: Modello3D }
  | { ok: false; motivo: string };

const completa = (v: VistaPosa | null | undefined): v is VistaPosa =>
  !!v && Array.isArray(v.landmarks) && v.landmarks.length >= 33;

/** Quale lato si vede nella foto di profilo: l'altro è coperto. */
const latoVisibile = (lm: Landmark[]): 'Sx' | 'Dx' => {
  const sx = vis(lm[7]) + vis(lm[11]) + vis(lm[23]) + vis(lm[27]);
  const dx = vis(lm[8]) + vis(lm[12]) + vis(lm[24]) + vis(lm[28]);
  return sx >= dx ? 'Sx' : 'Dx';
};

const latoDi = (nome: NomePunto): 'Sx' | 'Dx' | null =>
  nome.endsWith('Sx') ? 'Sx' : nome.endsWith('Dx') ? 'Dx' : null;

/** Lo stesso punto, sul lato che nel profilo si vede. */
const sulLato = (nome: NomePunto, lato: 'Sx' | 'Dx'): NomePunto =>
  (latoDi(nome) ? nome.slice(0, -2) + lato : nome) as NomePunto;

/**
 * Da che parte guarda la persona nella foto di profilo: +1 se il
 * davanti è verso destra nell'immagine, -1 se verso sinistra, 0 se
 * non si capisce. Il naso sta davanti all'orecchio; in mancanza, la
 * punta del piede sta davanti al tallone.
 */
const versoDelProfilo = (lm: Landmark[], lato: 'Sx' | 'Dx'): number => {
  const naso = lm[0];
  const orecchio = lm[lato === 'Sx' ? 7 : 8];
  if (vis(naso) >= MIN_VIS && vis(orecchio) >= MIN_VIS) {
    const d = naso.x - orecchio.x;
    if (Math.abs(d) > 1e-4) return Math.sign(d);
  }
  const punta = lm[lato === 'Sx' ? 31 : 32];
  const tallone = lm[lato === 'Sx' ? 29 : 30];
  if (vis(punta) >= MIN_VIS && vis(tallone) >= MIN_VIS) {
    const d = punta.x - tallone.x;
    if (Math.abs(d) > 1e-4) return Math.sign(d);
  }
  return 0;
};

/**
 * Fonde le foto in un modello nello spazio.
 *
 * Larghezza e altezza vengono dalla frontale (o dalla posteriore,
 * specchiata). La profondità viene dal profilo. Le due foto non sono
 * scattate dalla stessa distanza, quindi ognuna si porta in metri
 * con la STESSA misura del corpo — la quota caviglia→spalla — e si
 * ancora nello stesso punto: le caviglie.
 */
export const costruisciModello3D = (ingresso: IngressoModello): EsitoModello => {
  const base: 'frontale' | 'posteriore' | null =
    completa(ingresso.frontale) ? 'frontale'
      : completa(ingresso.posteriore) ? 'posteriore' : null;
  if (!base) {
    return {
      ok: false,
      motivo: 'Serve la foto frontale (o la posteriore): è quella che dà larghezza e altezza.',
    };
  }
  const vistaBase = (base === 'frontale' ? ingresso.frontale : ingresso.posteriore) as VistaPosa;
  const f = raddrizza(vistaBase.landmarks, vistaBase.larghezza, vistaBase.altezza);

  const cardini = [f[11], f[12], f[23], f[24], f[27], f[28]];
  if (!cardini.every((p) => vis(p) >= MIN_VIS)) {
    return {
      ok: false,
      motivo: 'Nella foto non si leggono bene spalle, bacino e caviglie: corpo intero, in piedi, buona luce, indumenti aderenti.',
    };
  }

  const note: string[] = [];

  const staturaValida = typeof ingresso.staturaCm === 'number'
    && ingresso.staturaCm >= 120 && ingresso.staturaCm <= 230;
  const staturaCm = staturaValida ? (ingresso.staturaCm as number) : STATURA_PREDEFINITA_CM;
  const H = staturaCm / 100;
  if (!staturaValida) {
    note.push(
      `Statura non in anagrafica: il modello è in scala su ${STATURA_PREDEFINITA_CM} cm. Le proporzioni sono quelle della foto, i centimetri no.`
    );
  }
  const quota = (QUOTA_SPALLA - QUOTA_CAVIGLIA) * H; // metri fra caviglia e spalla

  // --- larghezza e altezza: dalla foto di base ---
  const cavX = (f[27].x + f[28].x) / 2;
  const cavY = (f[27].y + f[28].y) / 2;
  const spY = (f[11].y + f[12].y) / 2;
  const trattoF = cavY - spY;
  if (!(trattoF > 0.05)) {
    return {
      ok: false,
      motivo: 'La persona non risulta in piedi e intera nella foto: non si può mettere in scala.',
    };
  }
  // In piedi, il bacino sta a circa due terzi della salita fra caviglie
  // e spalle. Seduti o accovacciati no: e mettere in scala una persona
  // seduta come se fosse in piedi darebbe un modello che sembra vero e
  // non lo è.
  const bacinoSu = (cavY - (f[23].y + f[24].y) / 2) / trattoF;
  if (bacinoSu < 0.45 || bacinoSu > 0.8) {
    return {
      ok: false,
      motivo: 'La persona non risulta in piedi nella foto: il modello si costruisce solo da in piedi, corpo intero.',
    };
  }
  const kF = quota / trattoF;
  // Di fronte, la sinistra del soggetto è a destra nella foto; di
  // spalle è il contrario.
  const segno = base === 'frontale' ? 1 : -1;

  // --- profondità: dal profilo, se c'è e si legge ---
  let profondita: Modello3D['profondita'] = 'assente';
  let zDi: (nome: NomePunto) => number = () => 0;

  if (completa(ingresso.laterale)) {
    const s = raddrizza(
      ingresso.laterale.landmarks, ingresso.laterale.larghezza, ingresso.laterale.altezza
    );
    const lato = latoVisibile(s);
    const sp = s[INDICE[sulLato('spallaSx', lato)]];
    const an = s[INDICE[sulLato('ancaSx', lato)]];
    const cav = s[INDICE[sulLato('cavigliaSx', lato)]];
    const verso = versoDelProfilo(s, lato);
    const trattoS = cav.y - sp.y;

    if (![sp, an, cav].every((p) => vis(p) >= MIN_VIS) || !(trattoS > 0.05)) {
      note.push('La foto di profilo non si legge bene (spalla, anca, caviglia): il modello è piatto, senza profondità.');
    } else if (verso === 0) {
      note.push('Dal profilo non si capisce da che parte guarda la persona: il modello è piatto, senza profondità.');
    } else {
      const kS = quota / trattoS;
      profondita = 'profilo';
      zDi = (nome) => {
        const p = s[INDICE[sulLato(nome, lato)]];
        return verso * (p.x - cav.x) * kS;
      };
      note.push('La profondità viene da un solo profilo: è uguale per i due lati. Le rotazioni (una spalla o un\'anca più avanti dell\'altra) qui non si vedono.');

      // Le due foto raccontano la stessa persona? Il bacino deve stare
      // alla stessa frazione fra caviglia e spalla in entrambe.
      const ancaF = (cavY - (f[23].y + f[24].y) / 2) / trattoF;
      const ancaS = (cav.y - an.y) / trattoS;
      if (Math.abs(ancaF - ancaS) > 0.08) {
        note.push('Frontale e profilo non combaciano bene (distanza o altezza del telefono diverse): la profondità è solo indicativa.');
      }
    }
  } else {
    note.push('Manca la foto di profilo: il modello è piatto. Con frontale + profilo diventa tridimensionale.');
  }

  const punti = {} as Record<NomePunto, Punto3>;
  for (const nome of NOMI_PUNTI) {
    const p = f[INDICE[nome]];
    const x = segno * (p.x - cavX) * kF;
    const y = Math.max(0, (cavY - p.y) * kF + QUOTA_CAVIGLIA * H);
    punti[nome] = [mm(x), mm(y), mm(zDi(nome))];
  }

  return {
    ok: true,
    modello: {
      versione: MODELLO_3D_VERSIONE,
      statura_m: mm(H),
      staturaDichiarata: staturaValida,
      profondita,
      base,
      punti,
      note,
    },
  };
};

// ============================================================
// SCHELETRO — i segmenti, e i punti che si ricavano
// ============================================================

export type PuntoScena = NomePunto | 'testa' | 'collo' | 'bacino';

const medio = (a: Punto3, b: Punto3): Punto3 =>
  [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];

/** Un punto del modello, compresi i tre ricavati (testa, collo, bacino). */
export const puntoScena = (m: Modello3D, nome: PuntoScena): Punto3 => {
  if (nome === 'testa') return medio(m.punti.orecchioSx, m.punti.orecchioDx);
  if (nome === 'collo') return medio(m.punti.spallaSx, m.punti.spallaDx);
  if (nome === 'bacino') return medio(m.punti.ancaSx, m.punti.ancaDx);
  return m.punti[nome];
};

export type IdOsso =
  | 'collo' | 'spalle' | 'colonna' | 'bacino'
  | 'braccioSx' | 'avambraccioSx' | 'braccioDx' | 'avambraccioDx'
  | 'cosciaSx' | 'gambaSx' | 'piedeSx'
  | 'cosciaDx' | 'gambaDx' | 'piedeDx';

export const OSSA: Array<{ id: IdOsso; da: PuntoScena; a: PuntoScena }> = [
  { id: 'collo', da: 'testa', a: 'collo' },
  { id: 'spalle', da: 'spallaSx', a: 'spallaDx' },
  { id: 'colonna', da: 'collo', a: 'bacino' },
  { id: 'bacino', da: 'ancaSx', a: 'ancaDx' },
  { id: 'braccioSx', da: 'spallaSx', a: 'gomitoSx' },
  { id: 'avambraccioSx', da: 'gomitoSx', a: 'polsoSx' },
  { id: 'braccioDx', da: 'spallaDx', a: 'gomitoDx' },
  { id: 'avambraccioDx', da: 'gomitoDx', a: 'polsoDx' },
  { id: 'cosciaSx', da: 'ancaSx', a: 'ginocchioSx' },
  { id: 'gambaSx', da: 'ginocchioSx', a: 'cavigliaSx' },
  { id: 'piedeSx', da: 'talloneSx', a: 'puntaSx' },
  { id: 'cosciaDx', da: 'ancaDx', a: 'ginocchioDx' },
  { id: 'gambaDx', da: 'ginocchioDx', a: 'cavigliaDx' },
  { id: 'piedeDx', da: 'talloneDx', a: 'puntaDx' },
];

/** Le articolazioni che si disegnano come giunti. */
export const GIUNTI: PuntoScena[] = [
  'collo', 'bacino',
  'spallaSx', 'spallaDx', 'gomitoSx', 'gomitoDx', 'polsoSx', 'polsoDx',
  'ancaSx', 'ancaDx', 'ginocchioSx', 'ginocchioDx', 'cavigliaSx', 'cavigliaDx',
];

export type Tinte = Partial<Record<IdOsso, PostureSeverity>>;

// Quale segmento racconta quale misura. Il filo a piombo non colora
// un segmento: riguarda tutto il corpo, e nel modello è la linea.
const SEGMENTO_DELLA_MISURA: Record<string, IdOsso> = {
  shoulder_tilt: 'spalle',
  pelvic_obliquity: 'bacino',
  head_shift: 'collo',
  forward_head: 'collo',
  trunk_inclination: 'colonna',
  coronal_sway: 'colonna',
};

const peso = (s: PostureSeverity | undefined): number =>
  s === 'moderato' ? 2 : s === 'lieve' ? 1 : 0;

/**
 * Colora i segmenti con le misure GIÀ calcolate (posture.ts). Qui non
 * si decide niente di nuovo: se due misure toccano lo stesso segmento
 * vince la più marcata.
 */
export const tinteDalleMisure = (misure: PostureMetrics[] | null | undefined): Tinte => {
  const out: Tinte = {};
  for (const vista of misure || []) {
    if (!vista || vista.quality !== 'ok') continue;
    for (const r of vista.findings || []) {
      const osso = SEGMENTO_DELLA_MISURA[r.key];
      if (!osso) continue;
      if (peso(r.severity) > peso(out[osso])) out[osso] = r.severity;
    }
  }
  return out;
};

// ============================================================
// VEDERLO — la proiezione sullo schermo
// ============================================================

export interface Vista3D {
  /** giro attorno all'asse verticale, in gradi. 0 = di fronte */
  imbardata: number;
  /** quanto si guarda dall'alto, in gradi. 0 = ad altezza d'uomo */
  beccheggio: number;
}

export const VISTE: Record<'fronte' | 'profiloDx' | 'dietro' | 'profiloSx', Vista3D> = {
  fronte: { imbardata: 0, beccheggio: 0 },
  profiloDx: { imbardata: 90, beccheggio: 0 },
  dietro: { imbardata: 180, beccheggio: 0 },
  profiloSx: { imbardata: -90, beccheggio: 0 },
};

/**
 * Proiezione ORTOGRAFICA: nessuna prospettiva, perché la prospettiva
 * accorcia quello che è lontano e qui le lunghezze devono restare
 * confrontabili. x verso destra dello schermo, y in alto, z verso chi
 * guarda (serve solo a decidere cosa sta davanti).
 */
export const proietta = (p: Punto3, v: Vista3D): { x: number; y: number; z: number } => {
  const a = (v.imbardata * Math.PI) / 180;
  const b = (v.beccheggio * Math.PI) / 180;
  const x1 = p[0] * Math.cos(a) + p[2] * Math.sin(a);
  const z1 = -p[0] * Math.sin(a) + p[2] * Math.cos(a);
  const y2 = p[1] * Math.cos(b) - z1 * Math.sin(b);
  const z2 = z1 * Math.cos(b) + p[1] * Math.sin(b);
  return { x: x1, y: y2, z: z2 };
};

export interface TrattoScena {
  tipo: 'osso' | 'giunto' | 'testa' | 'piombo';
  id: string;
  x1: number; y1: number;
  /** solo per ossa e filo a piombo */
  x2?: number; y2?: number;
  /** solo per la testa: raggio in metri */
  raggio?: number;
  /** profondità media: i più piccoli si disegnano per primi */
  z: number;
  severita: PostureSeverity;
}

/**
 * Tutto quello che va disegnato, già proiettato (in metri) e già in
 * ordine: dal più lontano al più vicino. Chi disegna deve solo
 * trasformare i metri in pixel.
 */
export const scena = (m: Modello3D, v: Vista3D, tinte: Tinte = {}): TrattoScena[] => {
  const out: TrattoScena[] = [];

  // Il filo a piombo: la verticale che sale dal centro delle caviglie.
  const giu = proietta([0, 0, 0], v);
  const su = proietta([0, m.statura_m * 1.03, 0], v);
  out.push({
    tipo: 'piombo', id: 'piombo',
    x1: giu.x, y1: giu.y, x2: su.x, y2: su.y,
    z: (giu.z + su.z) / 2, severita: 'normale',
  });

  for (const o of OSSA) {
    const a = proietta(puntoScena(m, o.da), v);
    const b = proietta(puntoScena(m, o.a), v);
    out.push({
      tipo: 'osso', id: o.id,
      x1: a.x, y1: a.y, x2: b.x, y2: b.y,
      z: (a.z + b.z) / 2, severita: tinte[o.id] || 'normale',
    });
  }

  for (const g of GIUNTI) {
    const p = proietta(puntoScena(m, g), v);
    out.push({ tipo: 'giunto', id: g, x1: p.x, y1: p.y, z: p.z + 0.001, severita: 'normale' });
  }

  const t = proietta(puntoScena(m, 'testa'), v);
  out.push({
    tipo: 'testa', id: 'testa',
    x1: t.x, y1: t.y, raggio: RAGGIO_TESTA * m.statura_m,
    z: t.z, severita: tinte.collo || 'normale',
  });

  return out.sort((p, q) => p.z - q.z);
};

/** Riconosce un modello salvato leggibile da questa versione. */
export const modelloValido = (x: unknown): x is Modello3D => {
  const m = x as Modello3D | null | undefined;
  if (!m || typeof m !== 'object' || !m.punti || typeof m.statura_m !== 'number') return false;
  return NOMI_PUNTI.every((n) => {
    const p = m.punti[n];
    return Array.isArray(p) && p.length === 3 && p.every((c) => typeof c === 'number' && isFinite(c));
  });
};
