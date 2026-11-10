// ============================================================
// IL MISURATORE DELL'INQUADRATURA — stessa foto, ogni volta
// ------------------------------------------------------------
// 10 novembre 2026. Il titolare: «devi metterti un misuratore di
// altezza e distanza da avere per riprodurre le stesse inquadrature».
//
// Ha ragione, ed è la condizione di tutto il resto. Una foto fatta da
// più vicino, o col telefono più in alto, cambia gli angoli che si
// leggono anche se la persona non è cambiata di un millimetro: è la
// prospettiva. Un «prima/dopo» fra due foto prese in modo diverso
// confronta due fotografi, non due posture.
//
// CHE COSA SI LEGGE, dalla foto stessa:
//  • DISTANZA — quanta parte dell'altezza della foto è occupata dal
//    corpo. Con lo stesso telefono, stessa frazione = stessa distanza.
//    È il dato esatto. I metri sono una stima, e lo diciamo.
//  • ALTEZZA DEL TELEFONO — a che quota del corpo cade il centro
//    della foto. Se il telefono è tenuto dritto, quella è l'altezza
//    dell'obiettivo.
//  • CENTRATURA — quanto il corpo è spostato a destra o a sinistra.
//
// Poi due giudizi: questa foto va bene per misurare? E: queste due
// foto sono abbastanza uguali da poter essere confrontate?
// ============================================================

import { Landmark } from './gait';
import { QUOTA_CAVIGLIA, QUOTA_SPALLA, VistaPosa } from './posture3d';

export const INQUADRATURA_VERSIONE = 1;

export interface Inquadratura {
  /** quanta parte dell'altezza della foto occupa il corpo (naso→piedi), 0..1 */
  riempimento: number;
  /** corpo spostato dal centro, in frazioni della larghezza: + = verso destra */
  fuoriCentro: number;
  /** a che quota del corpo cade il centro della foto, in frazioni della statura */
  quotaCentro: number;
  /** spazio libero sopra il naso e sotto i piedi, in frazioni dell'altezza */
  margineAlto: number;
  margineBasso: number;
  /** larghezza / altezza della foto */
  formato: number;
}

// Il bersaglio: dove deve cadere una foto fatta bene. Sono intervalli
// larghi apposta — conta di più RIFARLA UGUALE che centrarli al pelo.
export const BERSAGLIO = {
  riempimento: [0.6, 0.85] as [number, number],
  quotaCentro: [0.42, 0.62] as [number, number],
  fuoriCentro: 0.08,
  margineAlto: 0.07,
  margineBasso: 0.03,
};

// Quanto possono differire due foto per restare confrontabili.
export const SCARTO_AMMESSO = {
  riempimento: 0.08,
  quotaCentro: 0.08,
  fuoriCentro: 0.1,
  formato: 0.05,
};

const MIN_VIS = 0.5;
const vis = (p: Landmark | undefined): number => (p ? p.visibility ?? 1 : 0);
const r3 = (x: number): number => Math.round(x * 1000) / 1000;

/**
 * Legge l'inquadratura di una foto dai suoi punti. `null` se non si
 * vedono le caviglie, le spalle o il viso: senza quelli non c'è niente
 * da misurare, e un numero inventato qui farebbe più danno di un vuoto.
 */
export const leggiInquadratura = (vista: VistaPosa | null | undefined): Inquadratura | null => {
  if (!vista || !Array.isArray(vista.landmarks) || vista.landmarks.length < 33) return null;
  if (!(vista.larghezza > 0) || !(vista.altezza > 0)) return null;
  const lm = vista.landmarks; // y in frazioni dell'altezza: è già il righello giusto

  // Di profilo un lato è coperto: si prende quello che si vede.
  const meglio = (a: number, b: number): Landmark | null => {
    const p = vis(lm[a]) >= vis(lm[b]) ? lm[a] : lm[b];
    return vis(p) >= MIN_VIS ? p : null;
  };
  const spalla = meglio(11, 12);
  const caviglia = meglio(27, 28);
  if (!spalla || !caviglia) return null;
  const naso = vis(lm[0]) >= MIN_VIS ? lm[0] : meglio(7, 8);
  if (!naso) return null;

  const spY = vis(lm[11]) >= MIN_VIS && vis(lm[12]) >= MIN_VIS ? (lm[11].y + lm[12].y) / 2 : spalla.y;
  const cavY = vis(lm[27]) >= MIN_VIS && vis(lm[28]) >= MIN_VIS ? (lm[27].y + lm[28].y) / 2 : caviglia.y;
  const tratto = cavY - spY;
  if (!(tratto > 0.05)) return null;

  // Il punto più basso che si vede: talloni e punte, o le caviglie.
  const piedi = [29, 30, 31, 32, 27, 28]
    .filter((i) => vis(lm[i]) >= MIN_VIS)
    .map((i) => lm[i].y);
  const basso = Math.max(...piedi, cavY);
  const alto = naso.y;

  // Centro del corpo in orizzontale: a metà fra spalle e caviglie visibili.
  const xs = [11, 12, 27, 28].filter((i) => vis(lm[i]) >= MIN_VIS).map((i) => lm[i].x);
  const centroX = xs.reduce((s, x) => s + x, 0) / xs.length;

  return {
    riempimento: r3(basso - alto),
    fuoriCentro: r3(centroX - 0.5),
    quotaCentro: r3(QUOTA_CAVIGLIA + ((cavY - 0.5) / tratto) * (QUOTA_SPALLA - QUOTA_CAVIGLIA)),
    margineAlto: r3(alto),
    margineBasso: r3(1 - basso),
    formato: r3(vista.larghezza / vista.altezza),
  };
};

export interface GiudizioInquadratura {
  ok: boolean;
  /** che cosa cambiare, in parole da dire a chi tiene il telefono */
  consigli: string[];
}

const pct = (x: number): string => `${Math.round(x * 100)}%`;

/** Dove sul corpo cade una quota, in parole. */
export const parteDelCorpo = (quota: number): string =>
  quota < 0.2 ? 'alle gambe basse'
    : quota < 0.42 ? 'alle cosce'
      : quota < 0.52 ? 'al bacino'
        : quota < 0.62 ? 'all\'ombelico'
          : quota < 0.75 ? 'al petto'
            : 'alle spalle o più su';

/** Questa foto va bene per misurare? */
export const giudicaInquadratura = (i: Inquadratura | null): GiudizioInquadratura => {
  if (!i) {
    return {
      ok: false,
      consigli: ['Non si vede il corpo intero: servono viso, spalle e caviglie nella foto.'],
    };
  }
  const c: string[] = [];
  const [rMin, rMax] = BERSAGLIO.riempimento;
  if (i.riempimento < rMin) {
    c.push(`Avvicinati: il corpo occupa il ${pct(i.riempimento)} dell'altezza della foto (servono ${pct(rMin)}–${pct(rMax)}).`);
  } else if (i.riempimento > rMax) {
    c.push(`Allontanati: il corpo occupa il ${pct(i.riempimento)} dell'altezza della foto (servono ${pct(rMin)}–${pct(rMax)}).`);
  }
  const [qMin, qMax] = BERSAGLIO.quotaCentro;
  if (i.quotaCentro < qMin) {
    c.push(`Alza il telefono: il centro della foto cade ${parteDelCorpo(i.quotaCentro)}. Va tenuto dritto, all'altezza di bacino-ombelico.`);
  } else if (i.quotaCentro > qMax) {
    c.push(`Abbassa il telefono: il centro della foto cade ${parteDelCorpo(i.quotaCentro)}. Va tenuto dritto, all'altezza di bacino-ombelico.`);
  }
  if (Math.abs(i.fuoriCentro) > BERSAGLIO.fuoriCentro) {
    c.push(`Centra la persona: è spostata verso ${i.fuoriCentro > 0 ? 'destra' : 'sinistra'} del ${pct(Math.abs(i.fuoriCentro))} della larghezza.`);
  }
  if (i.margineAlto < BERSAGLIO.margineAlto) {
    c.push('La testa è troppo vicina al bordo: lascia spazio sopra, o si taglia.');
  }
  if (i.margineBasso < BERSAGLIO.margineBasso) {
    c.push('I piedi sono sul bordo: lascia un po\' di pavimento sotto.');
  }
  return { ok: c.length === 0, consigli: c };
};

export interface ConfrontoInquadrature {
  confrontabili: boolean;
  /** perché no, scritto come istruzione per rifarla uguale */
  motivi: string[];
}

/**
 * Due foto della stessa vista sono abbastanza uguali da confrontare
 * le misure? I motivi sono scritti come istruzioni per rifare la
 * SECONDA uguale alla PRIMA.
 */
export const confrontaInquadrature = (
  prima: Inquadratura | null | undefined,
  dopo: Inquadratura | null | undefined
): ConfrontoInquadrature => {
  if (!prima || !dopo) {
    return {
      confrontabili: false,
      motivi: ['Manca l\'inquadratura di una delle due foto: non si può dire se sono state prese allo stesso modo.'],
    };
  }
  const m: string[] = [];
  const dr = dopo.riempimento - prima.riempimento;
  if (Math.abs(dr) > SCARTO_AMMESSO.riempimento) {
    m.push(`Distanza diversa: il corpo occupava il ${pct(prima.riempimento)} della foto, adesso il ${pct(dopo.riempimento)}. ${dr > 0 ? 'Allontanati' : 'Avvicinati'} per rifarla uguale.`);
  }
  const dq = dopo.quotaCentro - prima.quotaCentro;
  if (Math.abs(dq) > SCARTO_AMMESSO.quotaCentro) {
    m.push(`Altezza del telefono diversa: il centro cadeva ${parteDelCorpo(prima.quotaCentro)}, adesso ${parteDelCorpo(dopo.quotaCentro)}. ${dq > 0 ? 'Abbassalo' : 'Alzalo'} per rifarla uguale.`);
  }
  if (Math.abs(dopo.fuoriCentro - prima.fuoriCentro) > SCARTO_AMMESSO.fuoriCentro) {
    m.push('Centratura diversa: la persona non è nello stesso punto della foto.');
  }
  if (Math.abs(dopo.formato - prima.formato) / prima.formato > SCARTO_AMMESSO.formato) {
    m.push('Formato diverso (una verticale e una orizzontale, o una ritagliata): rifalla con lo stesso formato.');
  }
  return { confrontabili: m.length === 0, motivi: m };
};

// ------------------------------------------------------------
// I METRI — una stima, dichiarata come tale
// ------------------------------------------------------------
// Dalla foto si sa quanti metri di mondo entrano nella sua altezza
// (lo dice il corpo, che ha una statura). Per passare alla distanza
// serve l'angolo dell'obiettivo, che dipende dal telefono. Qui si usa
// quello dell'obiettivo principale di un telefono tipico (26 mm
// equivalenti), senza zoom e senza ritaglio. Con un altro obiettivo,
// con lo zoom o con una foto ritagliata il numero è sbagliato: per
// questo si chiama «circa» e non entra in nessun confronto.
const MEZZO_ANGOLO_LATO_LUNGO = Math.atan(17.3 / 26);
const MEZZO_ANGOLO_LATO_CORTO = Math.atan(13 / 26);

/** Distanza stimata fra telefono e persona, in metri. `null` se non calcolabile. */
export const distanzaStimata = (
  vista: VistaPosa | null | undefined,
  staturaCm: number | null | undefined
): number | null => {
  if (!vista || !staturaCm || !(staturaCm >= 120 && staturaCm <= 230)) return null;
  const lm = vista.landmarks; // serve solo y, che è già in frazioni dell'altezza
  if (!Array.isArray(lm) || lm.length < 33) return null;
  const sp = vis(lm[11]) >= vis(lm[12]) ? lm[11] : lm[12];
  const cav = vis(lm[27]) >= vis(lm[28]) ? lm[27] : lm[28];
  if (vis(sp) < MIN_VIS || vis(cav) < MIN_VIS) return null;
  const tratto = cav.y - sp.y;
  if (!(tratto > 0.05)) return null;
  const metriNellaFoto = ((QUOTA_SPALLA - QUOTA_CAVIGLIA) * staturaCm) / 100 / tratto;
  const verticale = vista.altezza >= vista.larghezza;
  const mezzo = verticale ? MEZZO_ANGOLO_LATO_LUNGO : MEZZO_ANGOLO_LATO_CORTO;
  return Math.round((metriNellaFoto / (2 * Math.tan(mezzo))) * 10) / 10;
};

/** Altezza dell'obiettivo da terra in cm, SE il telefono era dritto. */
export const altezzaObiettivoCm = (
  i: Inquadratura | null | undefined,
  staturaCm: number | null | undefined
): number | null => {
  if (!i || !staturaCm || !(staturaCm >= 120 && staturaCm <= 230)) return null;
  return Math.round(i.quotaCentro * staturaCm);
};
