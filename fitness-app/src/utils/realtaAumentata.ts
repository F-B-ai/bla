// ============================================================
// APRIRE UN MODELLO IN REALTÀ AUMENTATA
// ------------------------------------------------------------
// iPhone e iPad aprono un file .usdz in realtà aumentata da soli (AR
// Quick Look), senza installare niente: basta un collegamento
// marcato rel="ar". Il browser dice lui se lo sa fare.
//
// Dove non lo sa fare (Android, computer) il file si può solo
// scaricare: lì NON promettiamo l'AR.
// ============================================================

import { Platform } from 'react-native';

export type SupportoAR = 'ar' | 'scarica' | 'nessuno';

export const supportoAR = (): SupportoAR => {
  if (Platform.OS !== 'web') return 'nessuno';
  const doc = (globalThis as any).document;
  if (!doc || typeof doc.createElement !== 'function') return 'nessuno';
  try {
    const a = doc.createElement('a');
    if (a.relList && typeof a.relList.supports === 'function' && a.relList.supports('ar')) {
      return 'ar';
    }
  } catch {
    /* browser senza relList: si scarica */
  }
  return 'scarica';
};

/**
 * Apre il modello in AR dove si può, altrimenti lo scarica.
 * Ritorna che cosa ha fatto davvero, così lo schermo non dice «aperto»
 * quando ha solo scaricato.
 */
export const apriUsdz = (dati: Uint8Array, nomeFile: string): SupportoAR => {
  const modo = supportoAR();
  if (modo === 'nessuno') return 'nessuno';

  const g = globalThis as any;
  const blob = new g.Blob([dati], { type: 'model/vnd.usdz+zip' });
  const url = g.URL.createObjectURL(blob);
  const a = g.document.createElement('a');
  a.setAttribute('href', url);
  a.setAttribute('download', nomeFile);
  if (modo === 'ar') {
    // Safari apre l'AR solo se il collegamento contiene un'immagine.
    a.setAttribute('rel', 'ar');
    a.appendChild(g.document.createElement('img'));
  }
  a.style.display = 'none';
  g.document.body.appendChild(a);
  a.click();
  // Il file serve finché l'AR è aperta: si libera dopo, non subito.
  g.setTimeout(() => {
    try {
      g.document.body.removeChild(a);
      g.URL.revokeObjectURL(url);
    } catch {
      /* già tolto */
    }
  }, 5 * 60 * 1000);
  return modo;
};
