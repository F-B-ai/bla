// ============================================================
// IL PERIMETRO — le due frasi che non si toccano
// ------------------------------------------------------------
// Stanno qui, in dominio, e non dentro un file di dati, per una
// ragione sola: sono regole, non contenuto. Un file di dati si
// copia, si duplica, si riscrive «meglio». Una costante importata
// da tutti cambia in un posto solo, o non cambia affatto.
//
// Se un giorno qualcuno accorcia l'avviso sul respiro perché «non
// ci sta nella grafica», deve venire a toglierlo da qui — e i test
// glielo impediranno.
// ============================================================

export const PERIMETRO_VERSION = 1;

/**
 * L'avviso sul respiro. Si scrive per intero, su ogni scheda e ogni
 * Reel che contengono una pratica di respiro. Non si abbrevia, non
 * si riassume, non si toglie mai.
 */
export const AVVISO_RESPIRO =
  'Non adatto in gravidanza, ipertensione non controllata, malattie '
  + 'cardiovascolari, epilessia, glaucoma, disturbi psichiatrici acuti. '
  + 'Mai in acqua o alla guida.';

/** Le voci dell'avviso, per i test: nessuna può sparire. */
export const VOCI_AVVISO_RESPIRO = [
  'gravidanza',
  'ipertensione non controllata',
  'malattie cardiovascolari',
  'epilessia',
  'glaucoma',
  'disturbi psichiatrici acuti',
  'Mai in acqua o alla guida',
];

/**
 * Che cosa siamo e che cosa non siamo. Va scritto sui protocolli,
 * che sono la parte del metodo che più assomiglia a un atto clinico
 * e non lo è, e non deve diventarlo.
 */
export const PERIMETRO =
  'Orientamento educativo-motorio, mai atto diagnostico o terapeutico. '
  + 'In presenza di condizioni accertate si procede solo su indicazione '
  + 'del medico curante.';
