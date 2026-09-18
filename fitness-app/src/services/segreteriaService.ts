// ============================================================
// LA SEGRETERIA — il servizio
// ------------------------------------------------------------
// Traduce un messaggio WhatsApp in una richiesta, usando il gateway
// AI che ESSĒRE ha già: chiave sul server, nessun terzo in mezzo,
// nessuna quota settimanale che si esaurisce.
//
// Qui non c'è nessuna regola: le istruzioni al modello e la lettura
// diffidente della sua risposta vivono in src/domain/segreteria.ts,
// dove si provano senza rete.
// ============================================================

import { callClaude } from './aiService';
import {
  istruzioniSegreteria, leggiSegreteria, LetturaSegreteria,
} from '../domain/segreteria';

const oggiISO = (d: Date = new Date()): string => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/**
 * Da un messaggio WhatsApp a una richiesta di appuntamento.
 *
 * Non scrive niente e non conferma niente: restituisce una lettura
 * che il titolare guarda, corregge e registra. Come il ponte CAL, e
 * per la stessa ragione — chi traduce non prenota.
 */
export const leggiMessaggioWhatsApp = async (
  messaggio: string,
  oggi: Date = new Date()
): Promise<LetturaSegreteria> => {
  const testo = (messaggio || '').trim();
  if (!testo) {
    return leggiSegreteria('');
  }
  try {
    const risposta = await callClaude(
      [{ role: 'user', content: testo }],
      istruzioniSegreteria(oggiISO(oggi)),
      600,
      // Il prefill «{» tiene il modello dentro il JSON: senza, a volte
      // premette una frase di cortesia che poi va ritagliata.
      '{',
      'claude-sonnet-4-5',
      'segreteria'
    );
    // Il prefill non torna nella risposta: si rimette davanti.
    return leggiSegreteria(risposta.trim().startsWith('{') ? risposta : `{${risposta}`);
  } catch (e) {
    const motivo = String((e as { message?: string })?.message || e || '');
    return {
      ...leggiSegreteria(''),
      problemi: [
        'Non sono riuscito a leggere il messaggio con l\'assistente'
        + (motivo ? ` (${motivo.slice(0, 120)})` : '') + '. '
        + 'Scrivi la richiesta a mano qui sotto: si fa in cinque righe.',
      ],
    };
  }
};
