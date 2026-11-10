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

// v2: frontale+posteriore fuse, un profilo per lato, lati verificati
// dalla geometria.
export const MODELLO_3D_VERSIONE = 2;

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
  /** profilo senza lato dichiarato: lo si capisce dalla foto */
  laterale?: VistaPosa | null;
  /** la foto messa nel riquadro «Laterale SX» / «Laterale DX» */
  lateraleSx?: VistaPosa | null;
  lateraleDx?: VistaPosa | null;
  /** statura in centimetri, se in anagrafica */
  staturaCm?: number | null;
}

export interface Modello3D {
  versione: number;
  statura_m: number;
  /** false = statura non nota: scala calcolata su una statura media */
  staturaDichiarata: boolean;
  /** da dove viene la terza dimensione */
  profondita: 'due profili' | 'profilo' | 'assente';
  /** quali foto hanno dato larghezza e altezza */
  base: 'frontale' | 'posteriore' | 'frontale+posteriore';
  punti: Record<NomePunto, Punto3>;
  /**
   * Quando ci sono sia la frontale sia la posteriore: di quanto, in
   * centimetri, le due foto mettono lo stesso punto in posti diversi
   * (mediana sui punti cardine). È un numero ONESTO sulla precisione:
   * dentro c'è l'errore di lettura e il fatto che la persona, fra una
   * foto e l'altra, non si rimette mai identica.
   */
  scartoViste_cm?: number;
  /** limiti di QUESTO modello, da mostrare a chi lo guarda */
  note: string[];
}

export type EsitoModello =
  | { ok: true; modello: Modello3D }
  | { ok: false; motivo: string };

const completa = (v: VistaPosa | null | undefined): v is VistaPosa =>
  !!v && Array.isArray(v.landmarks) && v.landmarks.length >= 33;

const latoDi = (nome: NomePunto): 'Sx' | 'Dx' | null =>
  nome.endsWith('Sx') ? 'Sx' : nome.endsWith('Dx') ? 'Dx' : null;

/** Lo stesso punto, su un lato dato. */
const sulLato = (nome: NomePunto, lato: 'Sx' | 'Dx'): NomePunto =>
  (latoDi(nome) ? nome.slice(0, -2) + lato : nome) as NomePunto;

/** Scambia destra e sinistra in tutti i 33 punti. */
const scambiaLati = (lm: Landmark[]): Landmark[] => {
  const out = lm.slice();
  const coppie: Array<[number, number]> = [[1, 4], [2, 5], [3, 6], [7, 8], [9, 10]];
  for (let i = 11; i < 33; i += 2) coppie.push([i, i + 1]);
  for (const [a, b] of coppie) { out[a] = lm[b]; out[b] = lm[a]; }
  return out;
};

// ------------------------------------------------------------
// LARGHEZZA E ALTEZZA — dalla frontale, dalla posteriore, o da tutte e due
// ------------------------------------------------------------

type Piano =
  | { ok: true; xy: Record<NomePunto, [number, number]>; bacinoSu: number; scambiati: boolean }
  | { ok: false; motivo: string };

/**
 * Una foto di fronte o di spalle → x (verso la sinistra del soggetto)
 * e y (in alto) di ogni punto, in metri, ancorati alle caviglie.
 */
const piano = (vista: VistaPosa, tipo: 'frontale' | 'posteriore', H: number): Piano => {
  let f = raddrizza(vista.landmarks, vista.larghezza, vista.altezza);

  const cardini = [f[11], f[12], f[23], f[24], f[27], f[28]];
  if (!cardini.every((p) => vis(p) >= MIN_VIS)) {
    return {
      ok: false,
      motivo: 'non si leggono bene spalle, bacino e caviglie: corpo intero, in piedi, buona luce, indumenti aderenti.',
    };
  }

  // Di fronte la sinistra del soggetto è a DESTRA nella foto; di
  // spalle è a sinistra. Il motore a volte, soprattutto di spalle,
  // etichetta i lati al contrario: lo si vede dalla geometria, e si
  // rimettono a posto. Senza questo controllo, fondere frontale e
  // posteriore farebbe la media fra una persona e il suo specchio.
  const sinistraADestra = f[11].x > f[12].x;
  const scambiati = tipo === 'frontale' ? !sinistraADestra : sinistraADestra;
  if (scambiati) f = scambiaLati(f);

  const cavX = (f[27].x + f[28].x) / 2;
  const cavY = (f[27].y + f[28].y) / 2;
  const spY = (f[11].y + f[12].y) / 2;
  const tratto = cavY - spY;
  if (!(tratto > 0.05)) {
    return { ok: false, motivo: 'la persona non risulta in piedi e intera: non si può mettere in scala.' };
  }
  // In piedi, il bacino sta a circa due terzi della salita fra caviglie
  // e spalle. Seduti o accovacciati no: e mettere in scala una persona
  // seduta come se fosse in piedi darebbe un modello che sembra vero e
  // non lo è.
  const bacinoSu = (cavY - (f[23].y + f[24].y) / 2) / tratto;
  if (bacinoSu < 0.45 || bacinoSu > 0.8) {
    return { ok: false, motivo: 'la persona non risulta in piedi: il modello si costruisce solo da in piedi, corpo intero.' };
  }

  const k = ((QUOTA_SPALLA - QUOTA_CAVIGLIA) * H) / tratto;
  const segno = tipo === 'frontale' ? 1 : -1;
  const xy = {} as Record<NomePunto, [number, number]>;
  for (const nome of NOMI_PUNTI) {
    const p = f[INDICE[nome]];
    xy[nome] = [segno * (p.x - cavX) * k, (cavY - p.y) * k + QUOTA_CAVIGLIA * H];
  }
  return { ok: true, xy, bacinoSu, scambiati };
};

// ------------------------------------------------------------
// PROFONDITÀ — da uno o due profili
// ------------------------------------------------------------

/**
 * Da che parte guarda la persona nel profilo: +1 se il davanti è
 * verso destra nell'immagine, -1 se verso sinistra, 0 se non si
 * capisce. Il naso sta davanti all'orecchio; in mancanza, la punta
 * del piede sta davanti al tallone.
 */
const versoDelProfilo = (lm: Landmark[]): number => {
  const naso = lm[0];
  const orecchio = vis(lm[7]) >= vis(lm[8]) ? lm[7] : lm[8];
  if (vis(naso) >= MIN_VIS && vis(orecchio) >= MIN_VIS) {
    const d = naso.x - orecchio.x;
    if (Math.abs(d) > 1e-4) return Math.sign(d);
  }
  const sx = vis(lm[31]) + vis(lm[29]) >= vis(lm[32]) + vis(lm[30]);
  const punta = lm[sx ? 31 : 32];
  const tallone = lm[sx ? 29 : 30];
  if (vis(punta) >= MIN_VIS && vis(tallone) >= MIN_VIS) {
    const d = punta.x - tallone.x;
    if (Math.abs(d) > 1e-4) return Math.sign(d);
  }
  return 0;
};

type Profilo =
  | { ok: true; lato: 'Sx' | 'Dx'; z: (nome: NomePunto) => number; bacinoSu: number }
  | { ok: false; motivo: string };

/**
 * Una foto di profilo → la profondità (z, in avanti) di ogni punto.
 *
 * QUALE LATO SI VEDE lo dice la geometria, non un'etichetta: chi è
 * fotografato dal suo lato SINISTRO guarda verso la sinistra
 * dell'immagine, chi dal destro verso destra.
 */
const profilo = (vista: VistaPosa, H: number): Profilo => {
  const s = raddrizza(vista.landmarks, vista.larghezza, vista.altezza);
  const verso = versoDelProfilo(s);
  if (verso === 0) return { ok: false, motivo: 'non si capisce da che parte guarda la persona' };
  const lato: 'Sx' | 'Dx' = verso < 0 ? 'Sx' : 'Dx';

  // I punti si leggono dal lato che il motore vede meglio (di profilo
  // i due lati si sovrappongono, e uno è coperto).
  const vSx = vis(s[11]) + vis(s[23]) + vis(s[27]);
  const vDx = vis(s[12]) + vis(s[24]) + vis(s[28]);
  const letto: 'Sx' | 'Dx' = vSx === vDx ? lato : vSx > vDx ? 'Sx' : 'Dx';
  const sp = s[INDICE[sulLato('spallaSx', letto)]];
  const an = s[INDICE[sulLato('ancaSx', letto)]];
  const cav = s[INDICE[sulLato('cavigliaSx', letto)]];
  const tratto = cav.y - sp.y;
  if (![sp, an, cav].every((p) => vis(p) >= MIN_VIS) || !(tratto > 0.05)) {
    return { ok: false, motivo: 'non si leggono bene spalla, anca e caviglia' };
  }
  const k = ((QUOTA_SPALLA - QUOTA_CAVIGLIA) * H) / tratto;
  return {
    ok: true,
    lato,
    z: (nome) => verso * (s[INDICE[sulLato(nome, letto)]].x - cav.x) * k,
    bacinoSu: (cav.y - an.y) / tratto,
  };
};

const NOME_LATO = { Sx: 'sinistro', Dx: 'destro' } as const;

/**
 * Fonde le foto in un modello nello spazio.
 *
 * Larghezza e altezza vengono dalla frontale e dalla posteriore (se
 * ci sono tutte e due se ne fa la media, e lo scarto fra le due dice
 * quanto fidarsi). La profondità viene dai profili: con due, ogni
 * lato ha la sua. Le foto non sono scattate dalla stessa distanza,
 * quindi ognuna si porta in metri con la STESSA misura del corpo — la
 * quota caviglia→spalla — e si ancora nello stesso punto: le caviglie.
 */
export const costruisciModello3D = (ingresso: IngressoModello): EsitoModello => {
  if (!completa(ingresso.frontale) && !completa(ingresso.posteriore)) {
    return {
      ok: false,
      motivo: 'Serve la foto frontale (o la posteriore): è quella che dà larghezza e altezza.',
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

  // --- larghezza e altezza ---
  const pf = completa(ingresso.frontale) ? piano(ingresso.frontale, 'frontale', H) : null;
  const pp = completa(ingresso.posteriore) ? piano(ingresso.posteriore, 'posteriore', H) : null;
  const buoni = [pf, pp].filter((p): p is Extract<Piano, { ok: true }> => !!p && p.ok);
  if (!buoni.length) {
    const primo = (pf || pp) as Extract<Piano, { ok: false }>;
    return { ok: false, motivo: `Nella foto ${primo.motivo}` };
  }
  let base: Modello3D['base'];
  if (pf && pf.ok && pp && pp.ok) base = 'frontale+posteriore';
  else if (pf && pf.ok) base = 'frontale';
  else base = 'posteriore';

  if (pf && !pf.ok && pp && pp.ok) note.push(`La frontale non è stata usata: ${pf.motivo}`);
  if (pp && !pp.ok && pf && pf.ok) note.push(`La posteriore non è stata usata: ${pp.motivo}`);
  if (pf && pf.ok && pf.scambiati) {
    note.push('Nella frontale destra e sinistra risultavano scambiate e sono state rimesse a posto: controlla che nel riquadro «Frontale» ci sia davvero la foto di fronte.');
  }
  if (pp && pp.ok && pp.scambiati) {
    note.push('Nella posteriore il motore aveva scambiato destra e sinistra: rimesse a posto dalla geometria.');
  }

  const xy = {} as Record<NomePunto, [number, number]>;
  for (const nome of NOMI_PUNTI) {
    xy[nome] = [
      buoni.reduce((s, b) => s + b.xy[nome][0], 0) / buoni.length,
      buoni.reduce((s, b) => s + b.xy[nome][1], 0) / buoni.length,
    ];
  }

  let scartoViste_cm: number | undefined;
  if (buoni.length === 2) {
    const cardini: NomePunto[] = [
      'spallaSx', 'spallaDx', 'ancaSx', 'ancaDx', 'ginocchioSx', 'ginocchioDx',
    ];
    const scarti = cardini
      .map((n) => Math.hypot(buoni[0].xy[n][0] - buoni[1].xy[n][0], buoni[0].xy[n][1] - buoni[1].xy[n][1]))
      .sort((a, b) => a - b);
    scartoViste_cm = Math.round(((scarti[2] + scarti[3]) / 2) * 1000) / 10;
    note.push(`Frontale e posteriore mettono gli stessi punti a ${String(scartoViste_cm).replace('.', ',')} cm di distanza (mediana): è il margine di questo modello su larghezze e altezze.`);
  }

  // --- profondità ---
  const candidati: Array<{ vista: VistaPosa; riquadro: 'Sx' | 'Dx' | null }> = [];
  if (completa(ingresso.lateraleSx)) candidati.push({ vista: ingresso.lateraleSx, riquadro: 'Sx' });
  if (completa(ingresso.lateraleDx)) candidati.push({ vista: ingresso.lateraleDx, riquadro: 'Dx' });
  if (completa(ingresso.laterale)) candidati.push({ vista: ingresso.laterale, riquadro: null });

  const riferimento = buoni.reduce((s, b) => s + b.bacinoSu, 0) / buoni.length;
  const perLato: Record<'Sx' | 'Dx', Array<(n: NomePunto) => number>> = { Sx: [], Dx: [] };
  for (const c of candidati) {
    const pr = profilo(c.vista, H);
    const quale = c.riquadro ? `nel riquadro «Laterale ${c.riquadro.toUpperCase()}»` : 'di profilo';
    if (!pr.ok) {
      note.push(`La foto ${quale} non è stata usata: ${pr.motivo}.`);
      continue;
    }
    if (c.riquadro && c.riquadro !== pr.lato) {
      note.push(`La foto ${quale} mostra il lato ${NOME_LATO[pr.lato]}: è stata usata come lato ${NOME_LATO[pr.lato]}.`);
    }
    // Le foto raccontano la stessa persona? Il bacino deve stare alla
    // stessa frazione fra caviglia e spalla in tutte.
    if (Math.abs(riferimento - pr.bacinoSu) > 0.08) {
      note.push(`La foto ${quale} non combacia bene con la frontale (distanza o altezza del telefono diverse): la profondità è solo indicativa.`);
    }
    perLato[pr.lato].push(pr.z);
  }

  const media = (fz: Array<(n: NomePunto) => number>, n: NomePunto): number =>
    fz.reduce((s, z) => s + z(n), 0) / fz.length;
  const tutti = [...perLato.Sx, ...perLato.Dx];

  let profondita: Modello3D['profondita'] = 'assente';
  let zDi: (nome: NomePunto) => number = () => 0;
  if (perLato.Sx.length && perLato.Dx.length) {
    profondita = 'due profili';
    zDi = (nome) => {
      const l = latoDi(nome);
      return l ? media(perLato[l], nome) : media(tutti, nome);
    };
    note.push('Ogni lato ha la sua profondità, dal suo profilo. Fra una foto e l\'altra la persona si rigira: differenze di 1–2 cm fra i due lati sono normali e non vanno lette come rotazioni.');
  } else if (tutti.length) {
    profondita = 'profilo';
    zDi = (nome) => media(tutti, nome);
    note.push('La profondità viene da un solo profilo: è uguale per i due lati. Le rotazioni (una spalla o un\'anca più avanti dell\'altra) qui non si vedono.');
  } else if (!candidati.length) {
    note.push('Manca la foto di profilo: il modello è piatto. Con frontale + profilo diventa tridimensionale.');
  } else {
    note.push('Nessuna foto di profilo era leggibile: il modello è piatto, senza profondità.');
  }

  const punti = {} as Record<NomePunto, Punto3>;
  for (const nome of NOMI_PUNTI) {
    punti[nome] = [mm(xy[nome][0]), mm(Math.max(0, xy[nome][1])), mm(zDi(nome))];
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
      ...(scartoViste_cm !== undefined ? { scartoViste_cm } : {}),
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

/** Una linea da disegnare sopra il modello (i rami sono già nello spazio). */
export interface LineaScena {
  id: string;
  rami: Punto3[][];
  daOsservare: boolean;
}

/** Quello che si può aggiungere alla scena oltre al modello. */
export interface ExtraScena {
  /** il modello di una valutazione precedente, disegnato in ombra */
  prima?: Modello3D | null;
  /** linee tracciate sul modello (lineeMiofasciali.ts) */
  linee?: LineaScena[];
}

export interface TrattoScena {
  /** 'ombra' = un segmento (o la testa) del modello di PRIMA */
  tipo: 'osso' | 'giunto' | 'testa' | 'piombo' | 'ombra' | 'linea';
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
export const scena = (
  m: Modello3D, v: Vista3D, tinte: Tinte = {}, extra: ExtraScena = {}
): TrattoScena[] => {
  const out: TrattoScena[] = [];

  // Il «prima» sta sempre dietro: è il termine di paragone, non deve
  // coprire quello che si guarda adesso.
  if (extra.prima) {
    const p0 = extra.prima;
    for (const o of OSSA) {
      const a = proietta(puntoScena(p0, o.da), v);
      const b = proietta(puntoScena(p0, o.a), v);
      out.push({
        tipo: 'ombra', id: `prima-${o.id}`,
        x1: a.x, y1: a.y, x2: b.x, y2: b.y,
        z: (a.z + b.z) / 2 - 100, severita: 'normale',
      });
    }
    const t0 = proietta(puntoScena(p0, 'testa'), v);
    out.push({
      tipo: 'ombra', id: 'prima-testa',
      x1: t0.x, y1: t0.y, raggio: RAGGIO_TESTA * p0.statura_m,
      z: t0.z - 100, severita: 'normale',
    });
  }

  for (const l of extra.linee || []) {
    l.rami.forEach((ramo, r) => {
      for (let i = 1; i < ramo.length; i++) {
        const a = proietta(ramo[i - 1], v);
        const b = proietta(ramo[i], v);
        out.push({
          tipo: 'linea', id: `${l.id}-${r}-${i}`,
          x1: a.x, y1: a.y, x2: b.x, y2: b.y,
          z: (a.z + b.z) / 2 + 0.002, severita: l.daOsservare ? 'lieve' : 'normale',
        });
      }
    });
  }

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
