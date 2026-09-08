// ============================================================
// I CASI CLINICI — la forma, e chi li può leggere
// ------------------------------------------------------------
// Nascono da due posti che chiedono la stessa cosa:
//
//   · il libro, capitolo «Corpi che parlano», che dichiara
//     «i nomi sono stati cambiati, ma i dati sono autentici».
//     È quella frase a reggere il capitolo: senza misure vere
//     non è un caso clinico, è un aneddoto ben scritto.
//
//   · il Documento strategico 01/02, che destina i protocolli
//     riabilitativi standardizzati a «diventare casi clinici
//     d'esame» del Livello 1.
//
// Sono due usi diversi dello stesso materiale, e hanno due
// pubblici diversi. Qui vive la regola che li tiene separati.
//
// LA REGOLA, in una riga: un caso che contiene un protocollo
// NON si mostra a un allievo. Una storia ispira; un protocollo
// per una condizione clinica, letto da chi non è formato,
// diventa auto-trattamento. È lo stesso perimetro del resto del
// sistema, applicato ai contenuti invece che alle misure.
// ============================================================

export const CASO_VERSION = 1;

export type PubblicoCaso = 'allievo' | 'operatore';

/** Una misura del caso. Senza valore di partenza non è una misura. */
export interface MisuraCaso {
  etichetta: string;
  partenza: string;
  arrivo?: string;
  quando?: string;
}

export interface FaseCaso {
  titolo: string;
  settimane: string;
  cosaSiFa: string;
}

export interface CasoClinico {
  id: string;
  /** «Marco, 52 anni — L'imprenditore che non dormiva» */
  titolo: string;
  /**
   * I nomi si cambiano sempre. Il campo è obbligatorio e non ha
   * default: dichiararlo è ciò che impedisce a un nome vero di
   * finire in un libro o in un'aula per distrazione.
   */
  nomeDiFantasia: boolean;
  pubblico: PubblicoCaso;
  /** che cosa cercava, e che cosa aveva davvero */
  arrivo: string;
  /** il momento in cui la cosa gira, se c'è */
  svolta?: string;
  misure: MisuraCaso[];
  fasi: FaseCaso[];
  esito: string;
  /** che cosa insegna questo caso a chi lo legge */
  daRicordare: string;
  /**
   * Il protocollo dettagliato. Presente solo nei casi per
   * operatori: la sua presenza rende il caso non mostrabile a un
   * allievo, e controllaCaso() lo verifica.
   */
  protocollo?: string;
}

export interface EsitoControllo {
  valido: boolean;
  /** perché non è pubblicabile così com'è */
  problemi: string[];
}

/**
 * Un caso è pubblicabile quando è vero, anonimo e nel pubblico
 * giusto. I tre controlli, in quest'ordine di gravità.
 */
export const controllaCaso = (caso: CasoClinico): EsitoControllo => {
  const problemi: string[] = [];

  // 1. PERIMETRO — il controllo che conta più di tutti.
  if (caso.protocollo && caso.protocollo.trim().length > 0 && caso.pubblico === 'allievo') {
    problemi.push(
      'Questo caso contiene un protocollo: non può essere mostrato a un allievo. '
      + 'Togli il protocollo, oppure marcalo per gli operatori.'
    );
  }

  // 2. ANONIMATO — un nome vero non deve poter uscire per distrazione.
  if (caso.nomeDiFantasia !== true) {
    problemi.push('Il nome non è dichiarato di fantasia: nessun caso esce con un nome reale.');
  }

  // 3. VERITÀ — «i dati sono autentici» è la frase che regge il capitolo.
  const misureBuone = (caso.misure || []).filter(
    (m) => (m.etichetta || '').trim() && (m.partenza || '').trim()
  );
  if (misureBuone.length === 0) {
    problemi.push(
      'Nessuna misura con valore di partenza: senza numeri non è un caso clinico, è un aneddoto.'
    );
  }

  if (!(caso.arrivo || '').trim()) problemi.push('Manca la situazione di partenza.');
  if (!(caso.esito || '').trim()) problemi.push('Manca l\'esito.');
  if ((caso.fasi || []).length === 0) problemi.push('Nessuna fase: non si capisce che cosa è stato fatto.');

  return { valido: problemi.length === 0, problemi };
};

/** I casi che un dato pubblico può vedere. Filtro unico, in un posto solo. */
export const casiPer = (pubblico: PubblicoCaso, casi: CasoClinico[]): CasoClinico[] =>
  (casi || []).filter((c) => {
    if (!controllaCaso(c).valido) return false;
    if (pubblico === 'operatore') return true;
    return c.pubblico === 'allievo';
  });

/**
 * Le misure che hanno sia partenza sia arrivo: sono quelle che
 * raccontano un cambiamento e si possono mostrare accostate.
 */
export const misureConfrontabili = (caso: CasoClinico): MisuraCaso[] =>
  (caso.misure || []).filter(
    (m) => (m.partenza || '').trim() && (m.arrivo || '').trim()
  );
