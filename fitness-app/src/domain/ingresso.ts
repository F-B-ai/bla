// ============================================================
// L'INGRESSO SI REGISTRA PRIMA DI TUTTO IL RESTO
// ------------------------------------------------------------
// Deciso il 12 ottobre 2026, dopo aver guardato il registro: in un
// anno, 109 ingressi. Non perché la gente non entri — perché nessuno
// glielo chiede. Il check-in era una voce in un menu, e una voce in
// un menu la trova solo chi la sta cercando.
//
// Da oggi è la prima cosa che l'app chiede quando si apre: non un
// avviso che scorre via, una domanda a cui si risponde. Vale per gli
// allievi e vale per chi lavora qui — collaboratori, manager,
// nutrizionista. Chi entra in studio lo registra, senza eccezioni di
// grado: un registro delle presenze con dentro solo gli allievi
// racconta metà giornata.
//
// TRE REGOLE PERCHÉ NON DIVENTI UNA SECCATURA, che è il modo in cui
// una cosa così muore:
//
//   1. Una volta sola al giorno. Registrato l'ingresso, per oggi
//      l'app non chiede più niente.
//   2. Si può dire di no. «Non sono in studio» è una risposta vera e
//      legittima — chi apre l'app dal divano non deve mentire né
//      restare bloccato. Si richiede dopo qualche ora, non subito.
//   3. Solo negli orari dello studio. Alle sette di mattina o a
//      mezzanotte la domanda non ha senso, e una domanda senza senso
//      insegna a ignorare tutte le altre.
//
// IL TITOLARE NON LA RICEVE: il QR lo espone lui. Chiedergli di
// inquadrare il proprio codice sarebbe una cerimonia a vuoto.
// ============================================================

import { GRIGLIA_DA, GRIGLIA_A } from './orariStudio';

export const INGRESSO_VERSION = 1;

/**
 * Chi deve registrare l'ingresso.
 *
 * Il titolare manca apposta. Gli altri ci sono tutti — e il fatto che
 * ci siano anche i collaboratori non è un controllo nascosto: è la
 * stessa cosa che si chiede agli allievi, e lo studio sa chi c'era.
 */
export const RUOLI_CON_INGRESSO = [
  'student',
  'collaborator',
  'manager',
  'nutritionist',
] as const;

export type RuoloIngresso = typeof RUOLI_CON_INGRESSO[number];

export const chiedeIngresso = (ruolo?: string | null): boolean =>
  !!ruolo && (RUOLI_CON_INGRESSO as readonly string[]).includes(ruolo);

/** Quante ore passano prima di richiederlo a chi ha detto «non ci sono». */
export const ORE_RINVIO = 3;

const inMinuti = (ora: string): number => {
  const [h, m] = ora.split(':').map(Number);
  return h * 60 + (m || 0);
};

/** Siamo dentro gli orari in cui lo studio è aperto? */
export const inOrarioStudio = (adesso: Date): boolean => {
  const m = adesso.getHours() * 60 + adesso.getMinutes();
  return m >= inMinuti(GRIGLIA_DA) && m <= inMinuti(GRIGLIA_A);
};

const stessoGiorno = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear()
  && a.getMonth() === b.getMonth()
  && a.getDate() === b.getDate();

export interface StatoIngresso {
  /** quando l'ultimo ingresso è stato registrato, se c'è */
  ultimoIngresso?: Date | null;
  /** quando ha risposto «non sono in studio», se l'ha fatto */
  rinviatoIl?: Date | null;
  ruolo?: string | null;
}

export type MotivoNoIngresso =
  | 'ruolo'
  | 'fuori_orario'
  | 'gia_registrato'
  | 'rinviato';

export interface EsitoIngresso {
  chiedere: boolean;
  motivo?: MotivoNoIngresso;
}

/**
 * Si chiede l'ingresso adesso?
 *
 * Risponde con il motivo anche quando dice di no: serve a chi
 * sviluppa, perché «non compare» senza motivo è il guasto che in
 * questo progetto è tornato più volte.
 */
export const deveChiedereIngresso = (
  s: StatoIngresso,
  adesso: Date = new Date()
): EsitoIngresso => {
  if (!chiedeIngresso(s.ruolo)) return { chiedere: false, motivo: 'ruolo' };
  if (!inOrarioStudio(adesso)) return { chiedere: false, motivo: 'fuori_orario' };

  if (s.ultimoIngresso && stessoGiorno(s.ultimoIngresso, adesso)) {
    return { chiedere: false, motivo: 'gia_registrato' };
  }

  if (s.rinviatoIl) {
    const ore = (adesso.getTime() - s.rinviatoIl.getTime()) / (60 * 60 * 1000);
    // Un rinvio di ieri non vale oggi: la giornata è un'altra.
    if (ore >= 0 && ore < ORE_RINVIO && stessoGiorno(s.rinviatoIl, adesso)) {
      return { chiedere: false, motivo: 'rinviato' };
    }
  }

  return { chiedere: true };
};

// ------------------------------------------------------------
// LE PAROLE
// ------------------------------------------------------------
//
// A un allievo si chiede una cosa; a chi lavora qui se ne chiede
// un'altra, e fingere che siano la stessa fa sentire il collaboratore
// un cliente — o l'allievo un dipendente.

export interface TestoIngresso {
  titolo: string;
  sottotitolo: string;
  /** il pulsante che porta alla fotocamera */
  azione: string;
  /** la risposta onesta di chi non è in studio */
  rinvio: string;
}

export const testoIngresso = (ruolo?: string | null): TestoIngresso => {
  if (ruolo === 'student') {
    return {
      titolo: 'Sei arrivato?',
      sottotitolo: 'Inquadra il QR all\'ingresso: il tuo allenamento di oggi '
        + 'resta scritto, e lo studio sa che ci sei.',
      azione: 'Registra il mio ingresso',
      rinvio: 'Non sono in studio',
    };
  }
  return {
    titolo: 'Registra il tuo ingresso',
    sottotitolo: 'Inquadra il QR all\'ingresso. Vale per tutti quelli che '
      + 'lavorano qui: il registro delle presenze dello studio è uno solo.',
    azione: 'Registra il mio ingresso',
    rinvio: 'Non sono in studio',
  };
};
