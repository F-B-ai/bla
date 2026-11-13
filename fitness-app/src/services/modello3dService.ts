// ============================================================
// MODELLO 3D — ponte foto → scheletro nello spazio
// ------------------------------------------------------------
// Legge i punti del corpo da ogni foto disponibile (MediaPipe, sul
// dispositivo: le foto non partono per nessun server e qui non c'è
// nessuna intelligenza artificiale a pagamento) e li passa al dominio.
//
// Ogni foto si legge PIÙ VOLTE (gaitService → leggiPosaRipetuta): il
// dominio tiene la mediana dei punti e scrive accanto a ogni misura
// di quanto ha oscillato. Dalle stesse letture escono il modello, le
// misure, l'inquadratura di ogni foto e le linee: una foto si apre
// una volta sola.
// ============================================================

import { Platform } from 'react-native';
import { leggiPosaRipetuta, MotoreFoto, LETTURE_PER_FOTO } from './gaitService';
import {
  costruisciModello3D, tinteDalleMisure, EsitoModello, Tinte, VistaPosa,
} from '../domain/posture3d';
import {
  misuraRipetuta, fondiLetture, raddrizza, PostureMetrics, PostureView,
} from '../domain/posture';
import { leggiInquadratura, distanzaStimata, Inquadratura } from '../domain/inquadratura';
import { leggiLinee, LetturaLinea } from '../domain/lineeMiofasciali';

export type ChiaveFoto = 'frontale' | 'posteriore' | 'lateraleSx' | 'lateraleDx';

export const NOME_FOTO: Record<ChiaveFoto, string> = {
  frontale: 'Frontale',
  posteriore: 'Posteriore',
  lateraleSx: 'Laterale SX',
  lateraleDx: 'Laterale DX',
};

export const CHIAVI_FOTO: ChiaveFoto[] = ['frontale', 'lateraleSx', 'lateraleDx', 'posteriore'];

export type FotoPerModello = Partial<Record<ChiaveFoto, string | null>>;

export interface RisultatoModello {
  esito: EsitoModello;
  tinte: Tinte;
  misure: PostureMetrics[];
  /** com'è stata presa ogni foto: distanza, altezza del telefono, centratura */
  inquadrature: Partial<Record<ChiaveFoto, Inquadratura>>;
  /** distanza stimata telefono-persona in metri, dove calcolabile */
  distanze: Partial<Record<ChiaveFoto, number>>;
  linee: LetturaLinea[];
  /** quale modello di lettura ha lavorato davvero */
  motore: MotoreFoto;
  letturePerFoto: number;
}

const VISTA_DI: Record<ChiaveFoto, PostureView> = {
  frontale: 'frontale',
  posteriore: 'posteriore',
  lateraleSx: 'laterale',
  lateraleDx: 'laterale',
};

export const costruisciModelloDalleFoto = async (
  foto: FotoPerModello,
  staturaCm?: number | null
): Promise<RisultatoModello> => {
  const vuoto = (motivo: string): RisultatoModello => ({
    esito: { ok: false, motivo },
    tinte: {}, misure: [], inquadrature: {}, distanze: {}, linee: [],
    motore: 'standard', letturePerFoto: 0,
  });
  if (Platform.OS !== 'web') return vuoto('Il modello 3D si costruisce dalla web app (PWA).');

  const viste: Partial<Record<ChiaveFoto, VistaPosa>> = {};
  const misure: PostureMetrics[] = [];
  const inquadrature: RisultatoModello['inquadrature'] = {};
  const distanze: RisultatoModello['distanze'] = {};
  let motore: MotoreFoto = 'accurato';
  let profiloMisurato = false;

  // Una alla volta: il motore è uno solo e su telefono la memoria è poca.
  for (const chiave of CHIAVI_FOTO) {
    const uri = foto[chiave];
    if (!uri) continue;
    let posa;
    try {
      posa = await leggiPosaRipetuta(uri);
    } catch {
      posa = null; // una foto illeggibile non ferma le altre
    }
    if (!posa) continue;
    if (posa.motore === 'standard') motore = 'standard';
    const fuso = fondiLetture(posa.letture);
    if (!fuso) continue;
    const vista: VistaPosa = { landmarks: fuso, larghezza: posa.larghezza, altezza: posa.altezza };
    viste[chiave] = vista;

    const inq = leggiInquadratura(vista);
    if (inq) inquadrature[chiave] = inq;
    const d = distanzaStimata(vista, staturaCm);
    if (d !== null) distanze[chiave] = d;

    // Le misure: una per piano. Dei due profili si misura il primo che
    // c'è (lo stesso criterio dell'analisi di sempre).
    const pianoVista = VISTA_DI[chiave];
    if (pianoVista === 'laterale') {
      if (profiloMisurato) continue;
      profiloMisurato = true;
    }
    misure.push(misuraRipetuta(
      posa.letture.map((l) => raddrizza(l, posa.larghezza, posa.altezza)),
      pianoVista
    ));
  }

  const esito = costruisciModello3D({ ...viste, staturaCm });
  return {
    esito,
    tinte: tinteDalleMisure(misure),
    misure,
    inquadrature,
    distanze,
    linee: esito.ok ? leggiLinee(esito.modello, misure) : [],
    motore,
    letturePerFoto: LETTURE_PER_FOTO,
  };
};
