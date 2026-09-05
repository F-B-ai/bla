// ============================================================
// LE DOMANDE — l'ascolto quotidiano
// ------------------------------------------------------------
// Vivono QUI e in nessun altro posto. Le usano sia Oggi (dove
// si risponde) sia Stato ESSĒRE (dove si vede lo storico).
// Una sola verità: se un giorno cambia una domanda, cambia
// ovunque nello stesso istante.
// ============================================================

export type WellnessKey = 'sleep' | 'energy' | 'mood' | 'soreness';

export interface WellnessQuestion {
  key: WellnessKey;
  icon: string;
  label: string;
  /** estremo basso della scala 1-5 */
  low: string;
  /** estremo alto */
  high: string;
}

export const WELLNESS_QUESTIONS: WellnessQuestion[] = [
  { key: 'sleep', icon: 'moon', label: 'Come hai dormito?', low: 'Male', high: 'Benissimo' },
  { key: 'energy', icon: 'flash', label: 'Quanta energia hai?', low: 'Scarico', high: 'Carico' },
  { key: 'mood', icon: 'happy', label: 'Come ti senti?', low: 'Giù', high: 'Alla grande' },
  { key: 'soreness', icon: 'bandage', label: 'Dolori muscolari?', low: 'Nessuno', high: 'Molti' },
];
