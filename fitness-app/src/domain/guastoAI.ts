// ============================================================
// QUANDO L'AI NON RISPONDE — dire la verità, non la prima cosa
// ------------------------------------------------------------
// Il 9 settembre 2026 l'app ha detto per ore:
//
//     «Impossibile connettersi al server AI.
//      Controlla la connessione internet e riprova.»
//
// La connessione era perfetta. Era sospesa la fatturazione del
// progetto Google, e con lei tutte le Cloud Functions. Il titolare
// ha passato il pomeriggio a cercare dalla parte sbagliata, davanti
// a un cliente, mentre il log del server diceva esattamente:
// «The request failed because billing is disabled for this project».
//
// Il gateway quel messaggio lo restituiva. Era il client a buttarlo
// via in un catch generico e a sostituirlo con la propria ipotesi.
//
// LA REGOLA: un messaggio d'errore che indovina è peggio di un
// messaggio d'errore che ammette di non sapere. Qui ogni esito ha
// il suo messaggio, e nessuno di essi accusa la connessione se non
// è la connessione.
// ============================================================

export const GUASTO_AI_VERSION = 1;

export type Guasto =
  /** il servizio esiste ma è spento: fatturazione sospesa, deploy in corso */
  | 'servizio_sospeso'
  /** il server ha risposto con un errore suo */
  | 'server_in_errore'
  /** il dispositivo è davvero senza rete */
  | 'dispositivo_offline'
  /** la rete c'è ma il server non si raggiunge */
  | 'server_irraggiungibile'
  /** la sessione dell'utente è scaduta */
  | 'sessione_scaduta'
  /** il credito del fornitore AI è finito */
  | 'credito_esaurito'
  /** il servizio ha risposto, ma a vuoto */
  | 'risposta_vuota';

/**
 * Legge la risposta del gateway e dice che cosa è successo.
 *
 * `corpo` è il testo grezzo della risposta: ci si cerca la firma
 * della fatturazione sospesa, che Google scrive in chiaro. È
 * l'unica riga che avrebbe risparmiato un pomeriggio.
 */
export const leggiGuastoGateway = (stato: number, corpo = ''): Guasto | null => {
  if (stato >= 200 && stato < 300) return null;

  const testo = (corpo || '').toLowerCase();
  const parlaDiFatturazione =
    testo.includes('billing is disabled')
    || testo.includes('billing account')
    || testo.includes('fatturazione');

  if (parlaDiFatturazione) return 'servizio_sospeso';
  if (stato === 401 || stato === 403) return 'sessione_scaduta';

  if (stato === 502) {
    const parlaDiCredito = testo.includes('credit') || testo.includes('quota')
      || testo.includes('payment') || testo.includes('billing');
    return parlaDiCredito ? 'credito_esaurito' : 'server_in_errore';
  }

  // 503 è la risposta di Google quando il servizio non ha una
  // versione attiva: fatturazione sospesa, oppure deploy in corso.
  if (stato === 503) return 'servizio_sospeso';
  if (stato >= 500) return 'server_in_errore';

  return 'server_in_errore';
};

/**
 * Che cosa è successo quando la chiamata non è nemmeno partita.
 *
 * Qui sta la distinzione che mancava: se il dispositivo dichiara di
 * avere rete, il problema NON è la connessione dell'utente, e dirglielo
 * lo manda a cercare dalla parte sbagliata.
 */
export const guastoDiRete = (dispositivoOnline: boolean | undefined): Guasto =>
  dispositivoOnline === false ? 'dispositivo_offline' : 'server_irraggiungibile';

export interface Spiegazione {
  titolo: string;
  testo: string;
  /** true = riprovare fra poco ha senso; false = serve un intervento */
  ritentabile: boolean;
}

/**
 * Il messaggio che vede chi ha una persona davanti.
 *
 * Ogni testo dice tre cose: che cosa è successo, di chi è il
 * problema, e che cosa si può fare adesso. Nessuno dice «controlla
 * la connessione» a meno che non sia davvero la connessione.
 */
export const spiegaGuasto = (g: Guasto): Spiegazione => {
  switch (g) {
    case 'servizio_sospeso':
      return {
        titolo: 'Il servizio è sospeso',
        testo:
          'Non è la tua connessione: il servizio AI del sistema è spento. '
          + 'Quasi sempre è la fatturazione del progetto Google, che si '
          + 'disattiva se un addebito non passa. Controlla Fatturazione '
          + 'nella console Google Cloud.\n\n'
          + 'Nel frattempo l\'app funziona: misure, schede e agenda sono a posto. '
          + 'Manca solo il commento automatico.',
        ritentabile: false,
      };

    case 'credito_esaurito':
      return {
        titolo: 'Credito AI esaurito',
        testo:
          'Il credito del servizio AI è finito, oppure l\'ultimo pagamento non è '
          + 'andato a buon fine. Ricarica l\'account Anthropic: appena il credito '
          + 'rientra riparte tutto da solo. Non c\'è niente da cambiare nell\'app.',
        ritentabile: false,
      };

    case 'sessione_scaduta':
      return {
        titolo: 'Sessione scaduta',
        testo:
          'Il tuo accesso è scaduto. Esci e rientra (Profilo → Esci), poi riprova. '
          + 'Non c\'è nessuna chiave da cambiare.',
        ritentabile: false,
      };

    case 'dispositivo_offline':
      return {
        titolo: 'Sei senza rete',
        testo:
          'Il telefono risulta senza connessione. Controlla wi-fi o dati mobili '
          + 'e riprova.',
        ritentabile: true,
      };

    case 'server_irraggiungibile':
      return {
        titolo: 'Il server non risponde',
        testo:
          'La tua connessione risulta attiva, ma il server non risponde. '
          + 'Può essere un\'interruzione momentanea: riprova fra un minuto. '
          + 'Se continua, il servizio è giù — non è un problema tuo.',
        ritentabile: true,
      };

    case 'risposta_vuota':
      return {
        titolo: 'Risposta vuota',
        testo: 'Il servizio ha risposto senza contenuto. Riprova.',
        ritentabile: true,
      };

    case 'server_in_errore':
    default:
      return {
        titolo: 'Errore del servizio',
        testo:
          'Il server ha risposto con un errore. Non dipende dalla tua connessione. '
          + 'Riprova fra qualche minuto; se continua, va guardato il log del server.',
        ritentabile: true,
      };
  }
};

/** Il testo pronto per la finestrella dell'app: titolo e corpo insieme. */
export const messaggioGuasto = (g: Guasto): string => {
  const s = spiegaGuasto(g);
  return `${s.titolo}. ${s.testo}`;
};
