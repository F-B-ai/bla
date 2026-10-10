// ============================================================
// CHE COSA SERVE PER SALVARE UN APPUNTAMENTO
// ------------------------------------------------------------
// Il 9 settembre 2026, un'ora dopo la pubblicazione, il titolare ha
// provato a fissare una consulenza e l'app ha risposto:
//
//     «Seleziona allievo e data»
//
// La sua obiezione, testuale: «se è una Consulenza che allievo
// seleziono?». Ed è giusta. Una consulenza è quasi sempre il PRIMO
// contatto: la persona in anagrafica non c'è ancora, ed è proprio
// quella la ragione per cui viene.
//
// Il controllo chiedeva un allievo per ogni tipo di appuntamento,
// perché fino a ieri gli unici tipi erano allenamento e nutrizione —
// e quelli un allievo ce l'hanno sempre. Aggiunta la consulenza, la
// regola vecchia è diventata una porta chiusa.
//
// LA REGOLA ADESSO: una consulenza si salva anche con il solo nome
// di chi viene. Diventa un OSPITE — occupa il posto in agenda, e
// quando la persona si iscrive la si collega. È lo stesso meccanismo
// che il ponte WhatsApp usa da sempre.
// ============================================================

export const APPUNTAMENTO_VERSION = 1;

export type TipoAppuntamento = 'training' | 'nutrition' | 'consulenza' | 'gruppo';

export interface DatiAppuntamento {
  tipo: TipoAppuntamento;
  /** id dell'allievo in anagrafica, se c'è */
  studentId?: string | null;
  /** nome scritto a mano, per chi in anagrafica non c'è ancora */
  nomeOspite?: string | null;
  data?: string | null;
}

export type Esito =
  /** si salva come sessione di un allievo */
  | 'allievo'
  /** si salva come ospite: occupa il posto, si collega dopo */
  | 'ospite'
  /** manca qualcosa */
  | 'incompleto';

export interface Controllo {
  esito: Esito;
  /** che cosa manca, in parole da mostrare a chi sta compilando */
  problemi: string[];
}

const pulito = (s?: string | null): string => (s || '').trim();

/**
 * Decide se l'appuntamento si può salvare, e come.
 *
 * L'unica differenza fra i tipi sta qui: la consulenza accetta un
 * nome al posto dell'allievo, gli altri no. Allenamento, nutrizione e
 * gruppo scalano dal percorso di una persona precisa, e senza quella
 * persona non c'è niente da scalare.
 */
export const controllaAppuntamento = (d: DatiAppuntamento): Controllo => {
  const problemi: string[] = [];
  const allievo = pulito(d.studentId);
  const nome = pulito(d.nomeOspite);

  if (!pulito(d.data)) problemi.push('Scegli il giorno.');

  if (allievo) {
    return { esito: problemi.length ? 'incompleto' : 'allievo', problemi };
  }

  if (d.tipo === 'consulenza') {
    if (!nome) {
      problemi.push(
        'Scegli chi viene: se è già in anagrafica selezionalo, '
        + 'altrimenti scrivi il nome della persona.'
      );
      return { esito: 'incompleto', problemi };
    }
    return { esito: problemi.length ? 'incompleto' : 'ospite', problemi };
  }

  problemi.push(
    d.tipo === 'gruppo'
      ? 'Scegli l\'allievo: un personal di gruppo si registra una persona per volta, '
        + 'e ognuna deve essere in anagrafica.'
      : 'Scegli l\'allievo.'
  );
  return { esito: 'incompleto', problemi };
};

/** Il messaggio unico da mostrare, o stringa vuota se si può salvare. */
export const messaggioMancante = (c: Controllo): string =>
  c.esito === 'incompleto' ? c.problemi.join('\n') : '';

/**
 * Un nome di persona scritto a mano, ripulito.
 * Serve a non salvare ospiti chiamati «  » o «???».
 */
export const nomeOspiteValido = (input?: string | null): string | null => {
  const n = pulito(input).replace(/\s+/g, ' ');
  if (n.length < 2) return null;
  if (!/[a-zA-ZÀ-ÿ]/.test(n)) return null;
  return n;
};

// ------------------------------------------------------------
// IL COSTO DELLA SEDUTA
// ------------------------------------------------------------
//
// Il campo si chiama «Costo sessione (€)» e il suo segnaposto è uno
// zero — cioè il caso normale: la seduta sta dentro un pacchetto già
// pagato, e a parte non costa niente. Lasciarlo vuoto è la cosa
// giusta da fare, non una dimenticanza.
//
// Fino al 23 settembre 2026 lasciarlo vuoto faceva fallire l'intero
// salvataggio: «vuoto» diventava `undefined`, e Firestore rifiuta i
// campi senza valore. Adesso vuoto vuol dire zero, ed è scritto una
// volta sola, qui, invece che in ognuna delle schermate che salvano
// un appuntamento.

/** Quanto può costare al massimo una seduta. Oltre è un dito scappato. */
export const COSTO_MASSIMO = 10000;

export type LetturaCosto =
  | { ok: true; valore: number }
  | { ok: false; motivo: string };

/**
 * Il costo scritto a mano, letto come numero.
 *
 * Accetta la virgola: su una tastiera italiana «12,50» è quello che
 * esce, e rifiutarlo sarebbe una porta chiusa per niente.
 *
 * Un testo che non è un numero NON diventa zero di nascosto: diventa
 * un errore detto. `parseFloat('abc')` vale NaN, e un NaN Firestore
 * lo accetta — finirebbe nel documento e da lì in ogni somma.
 */
export const leggiCosto = (raw?: string | null): LetturaCosto => {
  const testo = pulito(raw).replace(',', '.');
  if (!testo) return { ok: true, valore: 0 };

  if (!/^\d*\.?\d+$/.test(testo)) {
    return {
      ok: false,
      motivo: 'Il costo della sessione dev\'essere un numero: «'
        + pulito(raw) + '» non lo è. Lascia il campo vuoto se la seduta '
        + 'è dentro un pacchetto già pagato.',
    };
  }

  const n = parseFloat(testo);
  if (!Number.isFinite(n)) {
    return { ok: false, motivo: 'Il costo della sessione non è un numero valido.' };
  }
  if (n > COSTO_MASSIMO) {
    return {
      ok: false,
      motivo: `Il costo della sessione è ${n} €: controlla, sembra un dito `
        + `scappato sulla tastiera. Il massimo ammesso è ${COSTO_MASSIMO} €.`,
    };
  }
  // I centesimi si tengono, il resto no: 12,509 non è un prezzo.
  return { ok: true, valore: Math.round(n * 100) / 100 };
};

// ------------------------------------------------------------
// COME SI LEGGE UN APPUNTAMENTO, IN UN POSTO SOLO
// ------------------------------------------------------------
//
// Prima di questo blocco c'erano VENTITRÉ confronti sparsi del tipo
// `kind === 'training'`, scritti quando i tipi erano due soltanto.
// Aggiunti consulenza e gruppo, ognuno di quei confronti diventava
// una domanda sbagliata: una consulenza non è «training», quindi
// finiva nel ramo della nutrizione — e non si poteva più completare,
// annullare né cancellare.
//
// La duplicazione era il difetto. Qui vivono le uniche tre domande
// che quei ventitré punti facevano davvero.

/**
 * È salvato come sessione di allenamento?
 *
 * Vero per allenamento, consulenza e gruppo: sono tutti TrainingSession
 * con un marcatore diverso. Falso solo per la nutrizione, che ha una
 * collezione sua. È la domanda che serviva a completare, annullare e
 * cancellare — e che veniva posta come «è training?».
 */
export const eSessione = (tipo: TipoAppuntamento): boolean => tipo !== 'nutrition';

/**
 * Da che percorso si scala.
 * La consulenza scala dalle consulenze; allenamento e gruppo dalle
 * lezioni. Prima il gruppo finiva fra le consulenze per esclusione.
 */
export const tipoPercorso = (tipo: TipoAppuntamento): 'lezione' | 'consulenza' =>
  tipo === 'consulenza' || tipo === 'nutrition' ? 'consulenza' : 'lezione';

export type Tonalita = 'accento' | 'verde' | 'ambra';

export interface Aspetto {
  etichetta: string;
  icona: string;
  tonalita: Tonalita;
}

/** Come si mostra, ovunque. Una voce per tipo, nessuna esclusa. */
export const ASPETTO: Record<TipoAppuntamento, Aspetto> = {
  training: { etichetta: 'Training', icona: 'barbell', tonalita: 'accento' },
  nutrition: { etichetta: 'Nutrizione', icona: 'nutrition', tonalita: 'verde' },
  consulenza: { etichetta: 'Consulenza', icona: 'chatbubbles', tonalita: 'ambra' },
  gruppo: { etichetta: 'Gruppo', icona: 'people', tonalita: 'ambra' },
};

export const aspetto = (tipo: TipoAppuntamento): Aspetto =>
  ASPETTO[tipo] || ASPETTO.training;

/** Il tipo salvato su una sessione, riletto. Assente = allenamento. */
export const tipoDaSeduta = (
  tipoSeduta?: 'individuale' | 'consulenza' | 'gruppo' | null
): TipoAppuntamento => {
  if (tipoSeduta === 'consulenza') return 'consulenza';
  if (tipoSeduta === 'gruppo') return 'gruppo';
  return 'training';
};
