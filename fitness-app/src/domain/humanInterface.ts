// ============================================================
// HUMAN INTERFACE — il quadro che si forma da solo
// ------------------------------------------------------------
// Fino a qui ogni valutazione era UN PUNTO: postura a marzo,
// cammino ad aprile, composizione a maggio. Nessuno le metteva
// in fila. Questo modulo legge gli eventi del gemello e ne fa
// una TRAIETTORIA: dov'eri, dove sei, cosa è cambiato.
//
// REGOLE FERREE
//  · Solo campi realmente emessi dai servizi. Nessuna invenzione.
//  · Con UN solo punto non esiste tendenza: si dice "prima volta".
//    Una freccia su due misure a caso è una bugia con la grafica.
//  · Il verso conta: in alcune misure salire è meglio, in altre
//    è peggio. Ogni traccia lo dichiara.
//  · Nessuna diagnosi: si riportano misure e differenze.
// ============================================================

export const HUMAN_INTERFACE_VERSION = 1;

export type Verso = 'alto_meglio' | 'basso_meglio';
export type Direzione = 'migliora' | 'peggiora' | 'stabile' | 'prima_volta';

/** Un evento del gemello, ridotto a ciò che serve qui. */
export interface EventoQuadro {
  type: string;
  ts: Date;
  payload: Record<string, any>;
}

export interface Punto {
  valore: number;
  data: Date;
}

export interface Traccia {
  chiave: string;
  etichetta: string;
  unita: string;
  verso: Verso;
  /** area del corpo/metodo a cui appartiene */
  area: 'postura' | 'cammino' | 'squat' | 'corpo' | 'stellato';
  punti: Punto[];
  primo: Punto;
  ultimo: Punto;
  /** ultimo − primo, arrotondato */
  delta: number;
  direzione: Direzione;
  /** giorni fra la prima e l'ultima misura */
  giorniCoperti: number;
}

export interface ValutazioneFatta {
  tipo: string;
  etichetta: string;
  ultima: Date | null;
  quante: number;
}

export interface Quadro {
  version: number;
  /** le misure che hanno almeno un valore */
  tracce: Traccia[];
  /** quali valutazioni sono state fatte, e quando l'ultima volta */
  valutazioni: ValutazioneFatta[];
  /** quante delle cinque aree hanno almeno una misura */
  areeCoperte: number;
  areeTotali: number;
  /** la prima e l'ultima valutazione in assoluto */
  inizio: Date | null;
  fine: Date | null;
  /** true quando c'è abbastanza storia da leggere una traiettoria */
  haTraiettoria: boolean;
}

// ------------------------------------------------------------
// La mappa: da campo dell'evento a misura leggibile.
// Ogni riga qui esiste perché QUEL campo viene davvero emesso.
// ------------------------------------------------------------

interface Estrattore {
  chiave: string;
  etichetta: string;
  unita: string;
  verso: Verso;
  area: Traccia['area'];
  /** da quale tipo di evento arriva */
  evento: string;
  /** come si tira fuori il numero dal payload */
  leggi: (p: Record<string, any>) => number | null;
}

const num = (v: any): number | null =>
  typeof v === 'number' && isFinite(v) ? v : null;

export const ESTRATTORI: Estrattore[] = [
  // --- corpo ---
  {
    chiave: 'body_fat', etichetta: 'Massa grassa stimata', unita: '%',
    verso: 'basso_meglio', area: 'corpo', evento: 'body.composition_estimated',
    leggi: (p) => num(p.estimated_body_fat),
  },
  {
    chiave: 'muscle_mass', etichetta: 'Massa muscolare stimata', unita: '%',
    verso: 'alto_meglio', area: 'corpo', evento: 'body.composition_estimated',
    leggi: (p) => num(p.estimated_muscle_mass),
  },
  // --- cammino ---
  {
    chiave: 'cadenza', etichetta: 'Cadenza del passo', unita: 'passi/min',
    verso: 'alto_meglio', area: 'cammino', evento: 'movement.gait_assessed',
    leggi: (p) => num(p.cadence_spm),
  },
  {
    chiave: 'simmetria_passo', etichetta: 'Simmetria del passo', unita: '%',
    verso: 'alto_meglio', area: 'cammino', evento: 'movement.gait_assessed',
    leggi: (p) => num(p.step_symmetry_pct),
  },
  {
    chiave: 'tronco_cammino', etichetta: 'Inclinazione del tronco', unita: '°',
    verso: 'basso_meglio', area: 'cammino', evento: 'movement.gait_assessed',
    leggi: (p) => num(p.trunk_lean_deg),
  },
  // --- squat ---
  {
    chiave: 'ginocchio_fondo', etichetta: 'Angolo del ginocchio al fondo', unita: '°',
    verso: 'basso_meglio', area: 'squat', evento: 'movement.squat_assessed',
    leggi: (p) => num(p.bottom_knee_angle_deg),
  },
  {
    chiave: 'tronco_squat', etichetta: 'Inclinazione del tronco nello squat', unita: '°',
    verso: 'basso_meglio', area: 'squat', evento: 'movement.squat_assessed',
    leggi: (p) => num(p.trunk_lean_bottom_deg),
  },
  // --- postura: quanti distretti risultano da lavorare ---
  {
    chiave: 'rilievi_postura', etichetta: 'Distretti da lavorare', unita: '',
    verso: 'basso_meglio', area: 'postura', evento: 'posture.assessed',
    leggi: (p) => {
      const f = Array.isArray(p.findings) ? p.findings : null;
      if (!f) return null;
      return f.filter((x: any) => x?.severity && x.severity !== 'normal').length;
    },
  },
];

/** Le catene del Sistema Stellato, estratte dinamicamente. */
const CATENE: Array<{ key: string; sigla: string }> = [
  { key: 'IE', sigla: 'I-E' }, { key: 'A', sigla: 'A' },
  { key: 'F', sigla: 'F' }, { key: 'C', sigla: 'C' }, { key: 'E', sigla: 'E' },
];

const ETICHETTE_VALUTAZIONE: Record<string, string> = {
  'posture.assessed': 'Valutazione posturale',
  'body.composition_estimated': 'Composizione corporea',
  'movement.gait_assessed': 'Analisi del cammino',
  'movement.squat_assessed': 'Analisi dello squat',
  'mindmovement.assessed': 'Mind Movement™',
};

// ------------------------------------------------------------

const round1 = (x: number) => Math.round(x * 10) / 10;
const giorniFra = (a: Date, b: Date) =>
  Math.max(0, Math.round((b.getTime() - a.getTime()) / 86400000));

/**
 * Una differenza conta come cambiamento solo se supera il rumore.
 * Sotto questa soglia si dice "stabile": meglio tacere che
 * annunciare un miglioramento che è solo imprecisione di misura.
 */
const SOGLIA_RUMORE: Record<string, number> = {
  body_fat: 1, muscle_mass: 1,
  cadenza: 3, simmetria_passo: 3, tronco_cammino: 1.5,
  ginocchio_fondo: 4, tronco_squat: 3,
  rilievi_postura: 1,
};
const sogliaDi = (chiave: string): number =>
  SOGLIA_RUMORE[chiave] ?? (chiave.startsWith('catena_') ? 6 : 1);

const direzioneDi = (
  chiave: string, primo: number, ultimo: number, verso: Verso, punti: number
): Direzione => {
  if (punti < 2) return 'prima_volta';
  const d = ultimo - primo;
  if (Math.abs(d) < sogliaDi(chiave)) return 'stabile';
  const salito = d > 0;
  const bene = verso === 'alto_meglio' ? salito : !salito;
  return bene ? 'migliora' : 'peggiora';
};

const costruisciTraccia = (
  base: Omit<Estrattore, 'leggi' | 'evento'>,
  punti: Punto[]
): Traccia | null => {
  if (punti.length === 0) return null;
  const ordinati = [...punti].sort((a, b) => a.data.getTime() - b.data.getTime());
  const primo = ordinati[0];
  const ultimo = ordinati[ordinati.length - 1];
  return {
    chiave: base.chiave,
    etichetta: base.etichetta,
    unita: base.unita,
    verso: base.verso,
    area: base.area,
    punti: ordinati,
    primo,
    ultimo,
    delta: round1(ultimo.valore - primo.valore),
    direzione: direzioneDi(base.chiave, primo.valore, ultimo.valore, base.verso, ordinati.length),
    giorniCoperti: giorniFra(primo.data, ultimo.data),
  };
};

// ------------------------------------------------------------
// API
// ------------------------------------------------------------

export const costruisciQuadro = (eventi: EventoQuadro[]): Quadro => {
  const validi = (eventi || []).filter((e) => e && e.ts instanceof Date && e.payload);

  // --- tracce dalle misure dichiarate ---
  const tracce: Traccia[] = [];
  for (const est of ESTRATTORI) {
    const punti: Punto[] = [];
    for (const e of validi) {
      if (e.type !== est.evento) continue;
      const v = est.leggi(e.payload);
      if (v === null) continue;
      punti.push({ valore: v, data: e.ts });
    }
    const t = costruisciTraccia(est, punti);
    if (t) tracce.push(t);
  }

  // --- tracce delle cinque catene (Sistema Stellato) ---
  for (const c of CATENE) {
    const punti: Punto[] = [];
    for (const e of validi) {
      if (e.type !== 'mindmovement.assessed') continue;
      const catene = e.payload.catene;
      if (!Array.isArray(catene)) continue;
      const trovata = catene.find((x: any) => x?.catena === c.key);
      const v = num(trovata?.score);
      if (v === null) continue;
      punti.push({ valore: v, data: e.ts });
    }
    const t = costruisciTraccia({
      chiave: `catena_${c.key}`,
      etichetta: `Catena ${c.sigla}`,
      unita: '',
      verso: 'alto_meglio',
      area: 'stellato',
    }, punti);
    if (t) tracce.push(t);
  }

  // --- quali valutazioni sono state fatte ---
  const valutazioni: ValutazioneFatta[] = Object.entries(ETICHETTE_VALUTAZIONE)
    .map(([tipo, etichetta]) => {
      const suoi = validi.filter((e) => e.type === tipo);
      const ultima = suoi.length
        ? suoi.reduce((m, e) => (e.ts > m ? e.ts : m), suoi[0].ts)
        : null;
      return { tipo, etichetta, ultima, quante: suoi.length };
    });

  const aree = new Set(tracce.map((t) => t.area));
  const tutteLeDate = tracce.flatMap((t) => t.punti.map((p) => p.data));
  const inizio = tutteLeDate.length
    ? new Date(Math.min(...tutteLeDate.map((d) => d.getTime()))) : null;
  const fine = tutteLeDate.length
    ? new Date(Math.max(...tutteLeDate.map((d) => d.getTime()))) : null;

  return {
    version: HUMAN_INTERFACE_VERSION,
    // prima le tracce che hanno una storia, poi le prime volte
    tracce: tracce.sort((a, b) => b.punti.length - a.punti.length),
    valutazioni,
    areeCoperte: aree.size,
    areeTotali: 5,
    inizio,
    fine,
    haTraiettoria: tracce.some((t) => t.punti.length >= 2),
  };
};
