// ============================================================
// CHI PUÒ FARE CHE COSA IN AGENDA
// ------------------------------------------------------------
// Il titolare, il 14 settembre 2026:
//
//   «Solamente io posso gestire le lezioni, in particolare
//    l'annullamento. I manager, collaboratori, nutrizionisti non
//    possono decidere l'annullamento: devono chiedere a me e sarò io
//    eventualmente a decidere. Possono solo fissare l'appuntamento,
//    spostarlo, quindi modificarlo, ma non hanno la possibilità di
//    annullarlo o cancellarlo. Anche se sbagliano a prendere
//    appuntamento riferiranno a me e sarò io a cancellarlo. Questo è
//    un controllo che doveva avere solamente io.»
//
// Non è una restrizione tecnica: è una scelta di governo dello
// studio. Annullare una lezione tocca il percorso di una persona e
// il conto dei soldi, e chi risponde di quel conto è uno solo.
//
// ------------------------------------------------------------
// COSA RESTA A CHI COLLABORA
// ------------------------------------------------------------
// Tutto il lavoro vero: fissare, spostare, segnare completata,
// mandare il promemoria. Quello che sparisce è solo il potere di
// far scomparire una seduta.
//
// E se serve annullare? Lo dicono al titolare. All'allievo dicono la
// verità semplice: «l'annullamento lo fai tu dalla tua schermata,
// fino a dieci ore prima». Vedi domain/annullamento.ts.
// ============================================================

export const PERMESSI_AGENDA_VERSION = 1;

export type RuoloAgenda =
  | 'owner' | 'manager' | 'collaborator' | 'student' | 'academy_student';

export interface PermessiAgenda {
  /** mettere una seduta nuova in agenda */
  fissare: boolean;
  /** cambiarne data, ora, note, costo */
  spostare: boolean;
  /** segnarla completata (e scalarla dal percorso) */
  completare: boolean;
  /** annullarla */
  annullare: boolean;
  /** farla sparire dall'archivio */
  eliminare: boolean;
}

const NESSUNO: PermessiAgenda = {
  fissare: false, spostare: false, completare: false,
  annullare: false, eliminare: false,
};

/**
 * I permessi di un ruolo sull'agenda.
 *
 * L'allievo non compare come «annullare: true» perché il suo
 * annullamento è un'altra cosa: riguarda solo la propria seduta ed è
 * governato dalle dieci ore. Quello vive in domain/annullamento.ts.
 */
export const permessiAgenda = (ruolo: string | undefined): PermessiAgenda => {
  if (ruolo === 'owner') {
    return {
      fissare: true, spostare: true, completare: true,
      annullare: true, eliminare: true,
    };
  }
  if (ruolo === 'manager' || ruolo === 'collaborator') {
    return {
      fissare: true, spostare: true, completare: true,
      // Le due righe che il titolare ha chiesto di chiudere.
      annullare: false, eliminare: false,
    };
  }
  return NESSUNO;
};

/** Scorciatoia leggibile: questo ruolo è lo staff che lavora in agenda? */
export const eStaffAgenda = (ruolo: string | undefined): boolean =>
  ruolo === 'owner' || ruolo === 'manager' || ruolo === 'collaborator';

/**
 * Che cosa legge un collaboratore che tocca «Annulla».
 *
 * Non «non hai i permessi», che suona come un guasto e non dice cosa
 * fare: gli si dice a chi rivolgersi e che cosa dire all'allievo,
 * perché è quello che gli serve nel momento in cui ha la persona
 * davanti o al telefono.
 */
export const spiegaNienteAnnullo = (): string =>
  'Gli annullamenti li decide il titolare: scrivigli e ci pensa lui.\n\n'
  + 'All\'allievo puoi dire che l\'annullamento lo fa lui dalla sua '
  + 'schermata, fino a 10 ore prima della lezione. Dopo, la lezione '
  + 'resta in programma e viene conteggiata.\n\n'
  + 'Se c\'è stato un contrattempo vero, riferiscilo al titolare: '
  + 'l\'eccezione la valuta lui.';

/** Stessa cosa per il pulsante che cancella una seduta dall'archivio. */
export const spiegaNienteEliminazione = (): string =>
  'Eliminare una seduta lo può fare solo il titolare.\n\n'
  + 'Se hai sbagliato a fissare l\'appuntamento, puoi spostarlo o '
  + 'correggerlo da «Modifica». Se va proprio tolto, scrivi al '
  + 'titolare: lo cancella lui.';
