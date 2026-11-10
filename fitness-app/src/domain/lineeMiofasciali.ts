// ============================================================
// LE LINEE MIOFASCIALI SUL MODELLO
// ------------------------------------------------------------
// 10 novembre 2026. Il titolare: «…e linee fasciali alterate».
//
// CHE COSA SI PUÒ DIRE DA UNA FOTO, E CHE COSA NO.
// Una foto non vede la fascia. Vede dove stanno le articolazioni.
// Quindi qui non si «misura una linea alterata»: si fanno due cose
// oneste, e si tengono distinte.
//
//  1. SI MISURA una cosa sola: quanto è lungo il fianco destro e
//     quanto il sinistro SUL MODELLO, dalla caviglia alla spalla
//     (caviglia → ginocchio → anca → spalla). Se uno è più corto
//     dell'altro lo si dice in centimetri. È geometria.
//     (Il tratto spalla → orecchio si disegna ma NON si misura: una
//     spalla che scende lo allunga di quanto accorcia il fianco, e
//     la somma nasconderebbe proprio quello che si cerca.)
//
//  2. SI SEGNALA dove guardare: una linea passa per i segmenti che le
//     misure della postura hanno trovato fuori asse. La linea diventa
//     «da osservare» e porta scritto PERCHÉ (quale misura, quanto).
//     È un'indicazione per il lavoro in sala secondo il metodo — non
//     è una misura del tessuto e non è una diagnosi.
//
// Non compare mai «accorciata», «retratta», «in tensione»: quelle
// sono conclusioni che spettano a chi mette le mani, coi test del
// protocollo (linea posteriore, linea anteriore…), non a una foto.
//
// I nomi sono quelli già usati nel protocollo. Qui ci sono solo le
// linee su cui una foto in piedi ha qualcosa da dire.
// ============================================================

import { PostureMetrics, PostureFinding } from './posture';
import { Modello3D, Punto3, PuntoScena, puntoScena } from './posture3d';

export type IdLinea = 'posteriore' | 'anteriore' | 'lateraleSx' | 'lateraleDx';

export const NOME_LINEA: Record<IdLinea, string> = {
  posteriore: 'Linea posteriore superficiale',
  anteriore: 'Linea anteriore superficiale',
  lateraleSx: 'Linea laterale sinistra',
  lateraleDx: 'Linea laterale destra',
};

/** I punti per cui passa ogni linea. Posteriore e anteriore hanno un ramo per gamba. */
const PERCORSI: Record<IdLinea, PuntoScena[][]> = {
  posteriore: [
    ['talloneSx', 'cavigliaSx', 'ginocchioSx', 'ancaSx', 'bacino', 'collo', 'testa'],
    ['talloneDx', 'cavigliaDx', 'ginocchioDx', 'ancaDx', 'bacino'],
  ],
  anteriore: [
    ['puntaSx', 'cavigliaSx', 'ginocchioSx', 'ancaSx', 'bacino', 'collo', 'naso'],
    ['puntaDx', 'cavigliaDx', 'ginocchioDx', 'ancaDx', 'bacino'],
  ],
  lateraleSx: [['cavigliaSx', 'ginocchioSx', 'ancaSx', 'spallaSx', 'orecchioSx']],
  lateraleDx: [['cavigliaDx', 'ginocchioDx', 'ancaDx', 'spallaDx', 'orecchioDx']],
};

// Le linee si disegnano scostate dallo scheletro, altrimenti ci
// finiscono sopra: dietro la posteriore, davanti l'anteriore, in fuori
// le laterali. È un disegno: lo scostamento non è anatomia.
const SCOSTAMENTO: Record<IdLinea, Punto3> = {
  posteriore: [0, 0, -0.045],
  anteriore: [0, 0, 0.045],
  lateraleSx: [0.045, 0, 0],
  lateraleDx: [-0.045, 0, 0],
};

export const IDS_LINEE = Object.keys(PERCORSI) as IdLinea[];

const lungo = (p: Punto3[]): number => {
  let s = 0;
  for (let i = 1; i < p.length; i++) {
    s += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1], p[i][2] - p[i - 1][2]);
  }
  return s;
};

// Il tratto che si MISURA sulle laterali: dalla caviglia alla spalla.
const TRATTO_MISURATO: Partial<Record<IdLinea, PuntoScena[][]>> = {
  lateraleSx: [['cavigliaSx', 'ginocchioSx', 'ancaSx', 'spallaSx']],
  lateraleDx: [['cavigliaDx', 'ginocchioDx', 'ancaDx', 'spallaDx']],
};

/**
 * Lunghezza del percorso sul modello, in metri (senza scostamento).
 * Per le laterali è il tratto caviglia→spalla.
 */
export const lunghezzaLinea = (m: Modello3D, id: IdLinea): number =>
  (TRATTO_MISURATO[id] || PERCORSI[id])
    .reduce((s, ramo) => s + lungo(ramo.map((n) => puntoScena(m, n))), 0);

/** I rami della linea come punti nello spazio, già scostati per il disegno. */
export const tracciaLinea = (m: Modello3D, id: IdLinea): Punto3[][] => {
  const d = SCOSTAMENTO[id];
  return PERCORSI[id].map((ramo) =>
    ramo.map((n) => {
      const p = puntoScena(m, n);
      return [p[0] + d[0], p[1] + d[1], p[2] + d[2]] as Punto3;
    })
  );
};

export interface LetturaLinea {
  id: IdLinea;
  nome: string;
  stato: 'nella norma' | 'da osservare';
  /** perché è da osservare: ogni voce cita una misura o una lunghezza */
  perche: string[];
  /** lunghezza del percorso sul modello, in centimetri */
  lunghezza_cm: number;
}

// Sotto queste differenze i due lati si considerano uguali: è
// l'ordine di grandezza dell'errore di lettura dei punti.
export const DIFFERENZA_MINIMA_CM = 1;
export const DIFFERENZA_MINIMA_PCT = 1;

// Quali misure stanno sul percorso di quali linee.
const SAGITTALI = ['forward_head', 'trunk_inclination', 'sagittal_plumb'];
const FRONTALI = ['shoulder_tilt', 'pelvic_obliquity', 'head_shift', 'coronal_sway'];

const valore = (f: PostureFinding): string => {
  const v = f.value_deg != null ? `${String(f.value_deg).replace('.', ',')}°`
    : f.value_pct != null ? `${f.value_pct}%` : '';
  return `${f.label}${v ? `: ${v}` : ''}${f.direction ? ` (${f.direction})` : ''}`;
};

/**
 * Legge le linee sul modello: quali sono da osservare, e perché.
 * Con misure assenti restano solo le lunghezze dei due lati.
 */
export const leggiLinee = (
  m: Modello3D,
  misure: PostureMetrics[] | null | undefined
): LetturaLinea[] => {
  const fuoriAsse = (chiavi: string[]): string[] => {
    const visti = new Set<string>();
    const out: string[] = [];
    for (const vista of misure || []) {
      if (!vista || vista.quality !== 'ok') continue;
      for (const f of vista.findings || []) {
        if (!chiavi.includes(f.key) || f.severity === 'normale') continue;
        const riga = valore(f);
        if (!visti.has(f.key + riga)) { visti.add(f.key + riga); out.push(riga); }
      }
    }
    return out;
  };

  const sagittali = fuoriAsse(SAGITTALI);
  const frontali = fuoriAsse(FRONTALI);

  const sx = lunghezzaLinea(m, 'lateraleSx');
  const dx = lunghezzaLinea(m, 'lateraleDx');
  const diffCm = Math.abs(sx - dx) * 100;
  const diffPct = (Math.abs(sx - dx) / ((sx + dx) / 2 || 1)) * 100;
  const diversi = diffCm >= DIFFERENZA_MINIMA_CM && diffPct >= DIFFERENZA_MINIMA_PCT;
  const quanto = `${(Math.round(diffCm * 10) / 10).toString().replace('.', ',')} cm`;

  const perche: Record<IdLinea, string[]> = {
    posteriore: [...sagittali],
    anteriore: [...sagittali],
    lateraleSx: [...frontali],
    lateraleDx: [...frontali],
  };
  if (diversi) {
    const corta: IdLinea = sx < dx ? 'lateraleSx' : 'lateraleDx';
    const lunga: IdLinea = sx < dx ? 'lateraleDx' : 'lateraleSx';
    perche[corta].unshift(`Sul modello, dalla caviglia alla spalla è più corta dell'altra di ${quanto}`);
    perche[lunga].unshift(`Sul modello, dalla caviglia alla spalla è più lunga dell'altra di ${quanto}`);
  }

  return IDS_LINEE.map((id) => ({
    id,
    nome: NOME_LINEA[id],
    stato: perche[id].length ? 'da osservare' : 'nella norma',
    perche: perche[id],
    lunghezza_cm: Math.round(lunghezzaLinea(m, id) * 1000) / 10,
  }));
};

/** La frase che accompagna SEMPRE le linee, ovunque compaiano. */
export const AVVERTENZA_LINEE =
  'Le linee sono un modo di leggere il modello secondo il metodo: indicano dove guardare e da dove cominciare. Una foto non misura il tessuto: quello lo dicono i test in sala.';
