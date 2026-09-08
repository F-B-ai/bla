// ============================================================
// IL PATTO — le regole del percorso, e i promemoria
// A.S.D. Evolution Sport · Mind Movement Lab
// ------------------------------------------------------------
// Un documento che si firma, non un regolamento appeso al muro.
// Le regole stanno qui, in un posto solo: le usa il testo
// stampabile, le usa il software, e non possono divergere.
//
// I promemoria sono scritti perché la persona capisca il PROPRIO
// vantaggio, non per sollecitare un debito. Chi paga in tempo non
// perde il posto, non perde il ritmo, non perde i risultati.
// ============================================================

export const PATTO_VERSION = 1;

// ------------------------------------------------------------
// Le regole. Cambiarle qui le cambia ovunque.
// ------------------------------------------------------------

export const REGOLE = {
  /** ore di preavviso per disdire senza perdere la seduta */
  disdettaOre: 10,
  /** giorni prima della scadenza in cui parte un promemoria */
  promemoriaGiorni: [15, 7, 1] as const,
  /** giorni di ritardo dopo i quali il servizio si sospende */
  sospensioneGiorni: 7,
  /** giorni entro cui si ripristina tutto, saldando */
  ripristinoImmediato: true,
};

// ------------------------------------------------------------
// Disdetta: la seduta è recuperabile o è consumata?
// ------------------------------------------------------------

export type EsitoDisdetta = 'in_tempo' | 'tardiva';

export interface Disdetta {
  esito: EsitoDisdetta;
  oreDiPreavviso: number;
  /** la seduta viene comunque scalata dal pacchetto? */
  sedutaConsumata: boolean;
  spiegazione: string;
}

/**
 * Funzione pura: quante ore prima è arrivata la disdetta.
 * Il confine non è una punizione — è che quell'ora era tenuta
 * libera per quella persona, e nessun altro ha potuto prenderla.
 */
export const valutaDisdetta = (
  appuntamento: Date,
  momentoDisdetta: Date
): Disdetta => {
  const ore = (appuntamento.getTime() - momentoDisdetta.getTime()) / 3600000;
  const oreDiPreavviso = Math.max(0, Math.round(ore * 10) / 10);
  const inTempo = ore >= REGOLE.disdettaOre;
  return {
    esito: inTempo ? 'in_tempo' : 'tardiva',
    oreDiPreavviso,
    sedutaConsumata: !inTempo,
    spiegazione: inTempo
      ? `Disdetta ricevuta con ${oreDiPreavviso} ore di preavviso: la seduta si recupera.`
      : `Disdetta ricevuta con ${oreDiPreavviso} ore di preavviso, sotto le ${REGOLE.disdettaOre} previste: ` +
        'quell\'ora era riservata e non è stato possibile assegnarla ad altri.',
  };
};

// ------------------------------------------------------------
// Promemoria: chi, quando, e con quali parole
// ------------------------------------------------------------

export type MomentoPromemoria = 'quindici' | 'sette' | 'domani' | 'scaduta' | 'nessuno';

export const momentoDi = (giorniAllaScadenza: number): MomentoPromemoria => {
  if (giorniAllaScadenza < 0) return 'scaduta';
  if (giorniAllaScadenza === 0 || giorniAllaScadenza === 1) return 'domani';
  if (giorniAllaScadenza <= 7) return 'sette';
  if (giorniAllaScadenza <= 15) return 'quindici';
  return 'nessuno';
};

const euro = (n: number): string =>
  new Intl.NumberFormat('it-IT', { minimumFractionDigits: 0 }).format(n);

const data = (d: Date): string =>
  d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' });

/**
 * Il messaggio. Parla del vantaggio di chi paga, mai del debito.
 * Nessun tono minaccioso: la sospensione si nomina una volta sola,
 * alla scadenza superata, e come conseguenza tecnica — non come
 * castigo.
 */
export const messaggioPromemoria = (input: {
  nome: string;
  importo: number;
  scadenza: Date;
  giorniAllaScadenza: number;
  nomeStudio?: string;
}): string | null => {
  const { nome, importo, scadenza, giorniAllaScadenza } = input;
  const studio = input.nomeStudio || 'Mind Movement Lab';
  const primo = (nome || '').trim().split(' ')[0] || 'ciao';

  switch (momentoDi(giorniAllaScadenza)) {
    case 'quindici':
      return `Ciao ${primo}, un promemoria con calma: il ${data(scadenza)} c'è la rata di ${euro(importo)} €. `
        + 'Te lo dico con quindici giorni di anticipo così non ti trovi a rincorrere: '
        + 'il tuo posto e i tuoi orari restano bloccati e il percorso non si interrompe. '
        + 'Se hai bisogno di spostare la data, dimmelo adesso che si fa senza problemi.';

    case 'sette':
      return `Ciao ${primo}, fra ${giorniAllaScadenza} giorni (${data(scadenza)}) c'è la rata di ${euro(importo)} €. `
        + 'Ti scrivo ora perché a questo punto del percorso la costanza è tutto: '
        + 'chi non si ferma è quello che poi vede i risultati nelle misure, non nelle sensazioni. '
        + 'Se la sistemi in questi giorni, non ci pensiamo più fino al mese prossimo.';

    case 'domani':
      return `Ciao ${primo}, domani (${data(scadenza)}) scade la rata di ${euro(importo)} €. `
        + 'È l\'ultimo promemoria: appena è a posto continuiamo esattamente come stiamo facendo, '
        + 'senza interruzioni e senza perdere gli orari che abbiamo tenuto per te. '
        + `Se c'è qualsiasi difficoltà, scrivimi oggi: si trova sempre una soluzione insieme.`;

    case 'scaduta': {
      const giorni = Math.abs(giorniAllaScadenza);
      const alla = REGOLE.sospensioneGiorni - giorni;
      return `Ciao ${primo}, la rata di ${euro(importo)} € è scaduta il ${data(scadenza)}. `
        + (alla > 0
          ? `Come previsto dal nostro patto, dopo ${REGOLE.sospensioneGiorni} giorni il percorso va in pausa: `
            + `hai ancora ${alla} ${alla === 1 ? 'giorno' : 'giorni'}, e appena saldi riprende tutto da dove eravamo. `
          : 'Come previsto dal nostro patto il percorso è in pausa: si riattiva subito, lo stesso giorno del saldo. ')
        + `Se c'è un problema dimmelo, ${studio} non ha mai lasciato indietro nessuno che abbia parlato.`;
    }

    default:
      return null;
  }
};

// ------------------------------------------------------------
// Il testo del patto — quello che si stampa e si firma
// ------------------------------------------------------------

export interface DatiPatto {
  allievo: string;
  natoIl?: string;
  residenza?: string;
  codiceFiscale?: string;
  percorso: string;
  importoTotale?: number;
  numeroRate?: number;
  importoRata?: number;
  primaScadenza?: string;
  coach: string;
  studio?: string;
}

export interface ArticoloPatto { n: number; titolo: string; testo: string }

export const articoli = (d: DatiPatto): ArticoloPatto[] => {
  const studio = d.studio || 'A.S.D. Evolution Sport — Mind Movement Lab';
  return [
    {
      n: 1, titolo: 'Cosa riceve l\'allievo',
      testo: `${studio} accompagna ${d.allievo} nel percorso «${d.percorso}». `
        + 'Il percorso comprende la valutazione iniziale, il programma personalizzato, '
        + 'le sedute concordate e l\'accesso all\'applicazione ESSĒRE, dove ogni misura e '
        + 'ogni progresso restano registrati e consultabili dall\'allievo in qualsiasi momento.',
    },
    {
      n: 2, titolo: 'Gli appuntamenti',
      testo: 'Gli orari concordati sono riservati esclusivamente all\'allievo: in quella fascia '
        + 'nessun altro viene inserito. Per questo una disdetta comunicata con almeno '
        + `${REGOLE.disdettaOre} ore di preavviso permette il recupero della seduta, mentre una `
        + 'disdetta successiva comporta che la seduta si consideri svolta. Non è una penale: '
        + 'è il riconoscimento di un tempo che è stato tenuto libero e non ha potuto essere assegnato ad altri.',
    },
    {
      n: 3, titolo: 'I pagamenti',
      testo: (d.numeroRate && d.importoRata
        ? `Il percorso prevede ${d.numeroRate} rate da ${euro(d.importoRata)} € ciascuna`
          + (d.importoTotale ? `, per un totale di ${euro(d.importoTotale)} €` : '')
          + (d.primaScadenza ? `, con prima scadenza il ${d.primaScadenza}.` : '.')
        : 'Gli importi e le scadenze sono quelli concordati e riportati nell\'applicazione ESSĒRE.')
        + ` L'allievo riceve un promemoria ${REGOLE.promemoriaGiorni.join(', ')} giorni prima di ogni scadenza. `
        + 'I promemoria sono un servizio, non una formalità: servono a non far perdere a nessuno '
        + 'il ritmo del proprio percorso.',
    },
    {
      n: 4, titolo: 'Se un pagamento si ferma',
      testo: `Trascorsi ${REGOLE.sospensioneGiorni} giorni dalla scadenza senza saldo, il percorso `
        + 'viene messo in pausa: le sedute si sospendono e gli orari riservati tornano disponibili. '
        + 'Il saldo riattiva tutto lo stesso giorno, senza costi aggiuntivi e senza perdere le sedute '
        + 'già maturate. Chi si trova in difficoltà è invitato a parlarne prima della scadenza: '
        + 'si concorda una soluzione, e non è mai un problema.',
    },
    {
      n: 5, titolo: 'Che cosa questo percorso è, e che cosa non è',
      testo: 'Le valutazioni del Metodo Mind Movement™ — posturale, del movimento, del respiro e '
        + 'delle catene — hanno finalità di screening e di orientamento del lavoro educativo-motorio. '
        + 'Non costituiscono atto diagnostico e non sostituiscono alcuna valutazione o terapia sanitaria. '
        + 'In presenza di dolore, patologie o terapie in corso, l\'allievo è tenuto a informare il coach '
        + 'e a rivolgersi al professionista sanitario competente.',
    },
    {
      n: 6, titolo: 'I dati',
      testo: 'I dati raccolti, compresi quelli relativi allo stato di salute che l\'allievo sceglie '
        + 'di comunicare, sono trattati esclusivamente per la conduzione del percorso, restano nei '
        + 'sistemi dello studio e non vengono ceduti a terzi. L\'allievo può consultarli, chiederne '
        + 'copia o chiederne la cancellazione in qualsiasi momento.',
    },
  ];
};

export const IMPEGNO_STUDIO =
  'Lo studio si impegna a rispettare gli orari concordati, a misurare i progressi con strumenti '
  + 'oggettivi e a dire con onestà quando qualcosa non sta funzionando.';

export const IMPEGNO_ALLIEVO =
  'L\'allievo si impegna a comunicare per tempo assenze e difficoltà, a rispettare le scadenze '
  + 'concordate e a segnalare ogni cambiamento nel proprio stato di salute.';
