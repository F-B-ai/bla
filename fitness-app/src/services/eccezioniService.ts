// ============================================================
// QUANTE ECCEZIONI HA GIÀ AVUTO QUESTA PERSONA
// ------------------------------------------------------------
// Il conteggio non sta in un contatore a parte: si legge dalle
// sedute stesse, che portano il segno `eccezioneConcessa`.
//
// Un contatore separato sarebbe una seconda verità da tenere
// allineata, e prima o poi divergerebbe — con l'aggravante che qui
// divergere vuol dire negare una cortesia a chi non l'ha mai avuta,
// o regalarne una quarta a chi le ha finite.
//
// Si guardano sia le lezioni sia le visite: l'eccezione è una
// cortesia alla persona, non al tipo di appuntamento.
// ============================================================

import { getStudentSessions } from './sessionService';
import { getStudentAppointments } from './nutritionistService';
import { contaEccezioni } from '../domain/eccezioni';

export interface EsitoConteggio {
  quante: number;
  /** null quando è andata bene; altrimenti perché non si è potuto contare */
  errore: string | null;
}

/**
 * Le eccezioni già concesse a un allievo, in tutta la sua storia.
 *
 * Se la lettura non riesce NON si restituisce zero: zero vorrebbe
 * dire «non ne ha mai avute», ed è una bugia che regalerebbe una
 * cortesia a chi le ha già finite. Si dice che non si è potuto
 * contare, e chi chiama decide che farne.
 */
export const contaEccezioniAllievo = async (
  studentId: string
): Promise<EsitoConteggio> => {
  if (!studentId) return { quante: 0, errore: null };
  try {
    const [sedute, visite] = await Promise.all([
      getStudentSessions(studentId),
      getStudentAppointments(studentId).catch(() => []),
    ]);
    return {
      quante: contaEccezioni(sedute) + contaEccezioni(visite),
      errore: null,
    };
  } catch {
    return {
      quante: 0,
      errore: 'Non sono riuscito a contare le eccezioni già concesse a '
        + 'questa persona. Prima di decidere, controlla la sua scheda: '
        + 'non voglio farti concedere la terza credendo che sia la prima.',
    };
  }
};
