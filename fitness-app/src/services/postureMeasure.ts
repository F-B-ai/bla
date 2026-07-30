// ============================================================
// POSTURE MEASURE — ponte foto → misure oggettive
// ------------------------------------------------------------
// Per ogni foto disponibile: estrae i landmark scheletrici
// on-device (MediaPipe, IMAGE mode) e calcola gli angoli reali
// (posture.ts). Solo web (PWA). Se una vista non è leggibile,
// la salta con una nota di qualità invece di far fallire tutto.
// La foto NON lascia mai il dispositivo.
// ============================================================

import { Platform } from 'react-native';
import { extractLandmarksFromImage } from './gaitService';
import { computePostureMetrics, PostureMetrics, PostureView } from '../domain/posture';

export interface PosturePhotoSet {
  frontale?: string | null;
  laterale?: string | null;
  posteriore?: string | null;
}

/**
 * Misura la postura da tutte le foto disponibili. Ritorna un array
 * di metriche per vista (vuoto su native, o se nessuna foto è
 * leggibile). Non lancia: gli errori per singola vista diventano
 * una metrica "insufficiente" con nota, così l'AI sa cosa fidarsi.
 */
export const measurePostureFromPhotos = async (
  photos: PosturePhotoSet
): Promise<PostureMetrics[]> => {
  if (Platform.OS !== 'web') return []; // pose estimation solo in PWA

  const views: Array<[PostureView, string | null | undefined]> = [
    ['frontale', photos.frontale],
    ['laterale', photos.laterale],
    ['posteriore', photos.posteriore],
  ];

  const out: PostureMetrics[] = [];
  for (const [view, uri] of views) {
    if (!uri) continue;
    try {
      const lm = await extractLandmarksFromImage(uri);
      if (!lm) {
        out.push({
          version: 0,
          view,
          findings: [],
          notable: [],
          quality: 'insufficiente',
          quality_notes: ['Persona non riconosciuta nella foto: corpo intero, buona luce, indumenti aderenti.'],
        });
        continue;
      }
      out.push(computePostureMetrics(lm, view));
    } catch (e) {
      out.push({
        version: 0,
        view,
        findings: [],
        notable: [],
        quality: 'insufficiente',
        quality_notes: [e instanceof Error ? e.message : 'Foto non elaborabile.'],
      });
    }
  }
  return out;
};
