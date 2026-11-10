// ============================================================
// MODELLO 3D — ponte foto → scheletro nello spazio
// ------------------------------------------------------------
// Legge i punti del corpo da ogni foto disponibile (MediaPipe, sul
// dispositivo: le foto non partono per nessun server e qui non c'è
// nessuna intelligenza artificiale a pagamento) e li passa al dominio
// che li fonde (posture3d.ts).
//
// Dalle STESSE letture escono anche le misure 2D che colorano i
// segmenti: una foto si legge una volta sola.
// ============================================================

import { Platform } from 'react-native';
import { leggiPosa } from './gaitService';
import {
  costruisciModello3D, tinteDalleMisure, EsitoModello, Tinte, VistaPosa,
} from '../domain/posture3d';
import {
  computePostureMetrics, raddrizza, PostureMetrics, PostureView,
} from '../domain/posture';

export interface FotoPerModello {
  frontale?: string | null;
  laterale?: string | null;
  posteriore?: string | null;
}

export interface RisultatoModello {
  esito: EsitoModello;
  tinte: Tinte;
  misure: PostureMetrics[];
}

export const costruisciModelloDalleFoto = async (
  foto: FotoPerModello,
  staturaCm?: number | null
): Promise<RisultatoModello> => {
  if (Platform.OS !== 'web') {
    return {
      esito: { ok: false, motivo: 'Il modello 3D si costruisce dalla web app (PWA).' },
      tinte: {},
      misure: [],
    };
  }

  const leggi = async (uri: string | null | undefined): Promise<VistaPosa | null> => {
    if (!uri) return null;
    try {
      return await leggiPosa(uri);
    } catch {
      return null; // una foto illeggibile non ferma le altre
    }
  };

  // Una alla volta: il motore è uno solo e su telefono la memoria è poca.
  const frontale = await leggi(foto.frontale);
  const laterale = await leggi(foto.laterale);
  const posteriore = await leggi(foto.posteriore);

  const misure: PostureMetrics[] = [];
  const misura = (v: VistaPosa | null, vista: PostureView): void => {
    if (!v) return;
    misure.push(computePostureMetrics(raddrizza(v.landmarks, v.larghezza, v.altezza), vista));
  };
  misura(frontale, 'frontale');
  misura(laterale, 'laterale');
  misura(posteriore, 'posteriore');

  return {
    esito: costruisciModello3D({ frontale, laterale, posteriore, staturaCm }),
    tinte: tinteDalleMisure(misure),
    misure,
  };
};
