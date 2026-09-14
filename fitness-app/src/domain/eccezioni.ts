// ============================================================
// LE ECCEZIONI ALLE DIECI ORE — due, e poi basta
// ------------------------------------------------------------
// Il titolare, il 14 settembre 2026:
//
//   «Ho solo io il controllo sull'annullamento. Nel caso in cui c'è
//    stato un vero contrattempo, una vera difficoltà, gliela
//    concederò una massimo due volte. La terza volta, qualsiasi
//    difficoltà ha avuto, quella lezione sarà segnata
//    automaticamente.»
//
// È una regola giusta e difficile da tenere a memoria: dopo sei mesi
// nessuno si ricorda se a una persona l'eccezione è già stata fatta
// una volta o due, e il risultato è che la si fa sempre. Il software
// serve esattamente a questo — non a decidere al posto suo, ma a
// mettergli il numero davanti nel momento in cui decide.
//
// ------------------------------------------------------------
// CHE COSA VUOL DIRE «SEGNATA»
// ------------------------------------------------------------
// Dalla terza in poi la seduta si annulla lo stesso — il posto in
// agenda torna libero, che è quello che serve — ma viene
// **conteggiata**: scalata dal percorso, come se si fosse svolta.
// Non è una punizione, è il patto: il posto era riservato e non si
// è potuto darlo a nessun altro.
//
// ------------------------------------------------------------
// DA QUANDO SI CONTA
// ------------------------------------------------------------
// Da sempre: tutte le eccezioni mai concesse a quella persona. Non
// si azzerano a gennaio né a ogni percorso nuovo, perché il titolare
// non ha detto che si azzerano. Se un giorno deciderà di farle
// ripartire (per anno, o per pacchetto), è una riga sola: cambia
// solo ciò che si passa a `valutaEccezione`.
// ============================================================

export const ECCEZIONI_VERSION = 1;

/** Quante se ne concedono prima che la lezione si conti da sola. */
export const MAX_ECCEZIONI = 2;

export interface EsitoEccezione {
  /** che numero è questa, contando da 1 */
  numero: number;
  /** quante ne aveva già avute */
  giaConcesse: number;
  /** true finché rientra nelle due: la lezione NON si conta */
  graziata: boolean;
  /** true dalla terza in poi: la lezione si conta comunque */
  conteggiata: boolean;
  titolo: string;
  messaggio: string;
  /** che cosa scrivere sul pulsante che conferma */
  azione: string;
}

const nome = (n: string): string => n.trim() || 'questa persona';

const volte = (n: number): string =>
  n === 1 ? 'una volta' : `${n} volte`;

/**
 * Che cosa succede se il titolare annulla ADESSO questa seduta
 * fuori tempo massimo, per questa persona.
 *
 * `giaConcesse` sono le eccezioni già fatte a lei in passato.
 */
export const valutaEccezione = (
  giaConcesse: number,
  nomeAllievo: string = ''
): EsitoEccezione => {
  const gia = Math.max(0, Math.floor(giaConcesse || 0));
  const numero = gia + 1;
  const chi = nome(nomeAllievo);

  if (numero <= MAX_ECCEZIONI) {
    const restano = MAX_ECCEZIONI - numero;
    return {
      numero, giaConcesse: gia, graziata: true, conteggiata: false,
      titolo: `Eccezione ${numero} di ${MAX_ECCEZIONI}`,
      messaggio:
        (gia === 0
          ? `È la prima eccezione per ${chi}.`
          : `${chi} ha già avuto ${volte(gia)} questa cortesia.`)
        + '\n\nLa lezione viene annullata e NON conteggiata: resta nel suo '
        + 'percorso e il posto torna libero.\n\n'
        + (restano === 0
          ? 'È l\'ultima: dalla prossima, qualunque sia il motivo, '
            + 'la lezione verrà conteggiata.'
          : `Dopo questa gliene resta ${restano}.`),
      azione: 'Concedi eccezione',
    };
  }

  return {
    numero, giaConcesse: gia, graziata: false, conteggiata: true,
    titolo: 'Eccezioni finite',
    messaggio: `${chi} ha già avuto ${volte(gia)} l'eccezione sulle 10 ore.\n\n`
      + 'Questa lezione viene annullata — il posto torna libero — ma '
      + 'CONTEGGIATA: si scala dal percorso come se si fosse svolta.\n\n'
      + 'È il patto: il posto era riservato e non si è potuto darlo a '
      + 'nessun altro.',
    azione: 'Annulla e conteggia',
  };
};

/**
 * La riga che il titolare legge accanto al nome, prima ancora di
 * decidere. Serve a non doversi ricordare niente.
 */
export const riassuntoEccezioni = (
  giaConcesse: number,
  nomeAllievo: string = ''
): string => {
  const gia = Math.max(0, Math.floor(giaConcesse || 0));
  const chi = nome(nomeAllievo);
  if (gia === 0) return `${chi} non ha mai avuto eccezioni sulle 10 ore.`;
  if (gia < MAX_ECCEZIONI) {
    return `${chi} ha avuto ${volte(gia)} l'eccezione: ne resta `
      + `${MAX_ECCEZIONI - gia}.`;
  }
  return `${chi} ha esaurito le eccezioni (${volte(gia)}): da qui in poi `
    + 'ogni annullamento fuori tempo viene conteggiato.';
};

/**
 * Le sedute che contano come eccezione già concessa.
 *
 * Si guarda il segno lasciato sul documento, non lo stato: una
 * seduta annullata in tempo (più di dieci ore prima) non è
 * un'eccezione, è un diritto, e non deve consumare niente.
 */
export const contaEccezioni = (
  sedute: Array<{ eccezioneConcessa?: boolean }>
): number => (sedute || []).filter((s) => s?.eccezioneConcessa === true).length;
