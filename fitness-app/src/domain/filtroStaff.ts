// ============================================================
// IL FILTRO PER PERSONA — che cosa vuol dire «vedi Giuseppe»
// ------------------------------------------------------------
// Il titolare, l'11 settembre 2026, guardando l'Agenda con il filtro
// su un suo manager:
//
//   «Nei calendari degli altri miei manager, collaboratori e
//    nutrizionisti esce questo. Significa che loro stanno vedendo
//    questo? Non devono vedere niente: sono io a vedere quello che
//    fanno loro.»
//
// **No, non lo vedevano.** I dati non uscivano da nessuna parte: i
// task si caricano solo per il titolare e solo i suoi, gli ospiti
// pure, e le pillole con i nomi esistono solo nella sua schermata.
//
// Ma la schermata gli stava mentendo, e aveva ragione a sospettare.
// Selezionando «Giuseppe Calabrese» gli appuntamenti si filtravano
// davvero (0), mentre il SUO task «Girare Reel» e i SUOI ospiti
// restavano in pagina. Intestazione di una persona, contenuto di
// un'altra. Il contatore lo urlava — «0 appuntamenti» e sotto due
// appuntamenti prossimi — e nessuno lo aveva letto.
//
// Un filtro che filtra metà schermo è peggio di un filtro assente:
// quello assente lo sai, questo ti fa credere una cosa falsa.
//
// LA REGOLA, scritta una volta sola:
// task e ospiti **appartengono al titolare**. Le richieste da
// WhatsApp arrivano solo a lui — è una sua decisione dichiarata — e i
// task sono la sua lista personale. Quindi quando si guarda la
// giornata di QUALCUN ALTRO, quelle voci non ci sono.
// ============================================================

export const FILTRO_STAFF_VERSION = 1;

/**
 * Le voci personali del titolare (task, ospiti) si vedono solo quando
 * non si sta guardando la giornata di un'altra persona.
 *
 * - nessun filtro attivo → sì, è la vista di tutti
 * - filtro su me stesso → sì, sono le mie
 * - filtro su un altro → no, non sono sue
 */
export const personaliVisibili = (
  staffScelto: string | null | undefined,
  mioId: string | null | undefined
): boolean => {
  if (!staffScelto) return true;
  return !!mioId && staffScelto === mioId;
};

/** Applica la regola a un elenco: comodo e impossibile da dimenticare. */
export const soloSePersonali = <T>(
  elenco: T[],
  staffScelto: string | null | undefined,
  mioId: string | null | undefined
): T[] => (personaliVisibili(staffScelto, mioId) ? (elenco || []) : []);

/**
 * La riga che spiega che cosa si sta guardando.
 * Serve perché una schermata filtrata deve dirlo: senza, chi la
 * guarda crede di vedere tutto.
 */
export const spiegaFiltro = (
  staffScelto: string | null | undefined,
  nomeScelto: string | null | undefined,
  mioId: string | null | undefined
): string => {
  if (!staffScelto) return '';
  if (mioId && staffScelto === mioId) return '';
  const chi = nomeScelto?.trim() || 'questa persona';
  return `Stai guardando la giornata di ${chi}. `
    + 'I tuoi task e i tuoi ospiti non compaiono qui.';
};
