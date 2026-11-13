// ============================================================
// LA PROCEDURA DI LAVORO — A DISTANZA
// ------------------------------------------------------------
// La procedura in studio esiste da settembre e sta in protocollo.ts.
// Questa è la sua sorella per ESSĒRE Premium, e ha la stessa forma:
// che cosa fare, con che strumento, che cosa fare quando lo strumento
// non basta, e che cosa deve essere vero per passare al passo dopo.
//
// NON È LA STESSA PROCEDURA CON MENO COSE. A distanza cambiano tre
// fatti, e ognuno cambia il lavoro:
//
//  1. MANCA LA MEZZ'ORA DI OSSERVAZIONE. In studio nessuno comincia
//     senza essere stato visto muovere dal vivo. Da lontano quella
//     mezz'ora non si può fare, e fingere che le foto la sostituiscano
//     sarebbe la bugia più grave di tutto il percorso. Quello che si
//     può fare è chiedere di più, guardare più a lungo, e fermarsi
//     prima quando qualcosa non torna.
//
//  2. IL TEMPO È SCANDITO DAL PACCHETTO. Tre appuntamenti al mese —
//     due in diretta, uno registrato — e tre mesi. Non ci si vede
//     quando capita: ogni incontro ha un compito, e se salta non si
//     recupera «più avanti», si recupera prima del passo successivo.
//
//  3. NESSUNO CORREGGE L'ESECUZIONE MENTRE AVVIENE. In sala una mano
//     si sposta con una mano. Qui no: l'esercizio dev'essere spiegato
//     in modo che regga da solo, e quello che torna indietro è un
//     video, non una sensazione.
//
// LA REGOLA CHE STA SOPRA TUTTE: a distanza, il dubbio pesa il
// doppio. In studio un dubbio si scioglie guardando meglio; qui no.
// Quando non si vede abbastanza non si tira a indovinare: si chiede
// altro, si riduce quello che si propone, oppure si dice che questo
// percorso non è la forma giusta per quella persona.
// ============================================================

import { PassoProcedura } from './protocollo';

export const PROTOCOLLO_ONLINE_VERSION = 1;

/** Quanto dura un percorso Premium, in mesi. */
export const MESI = 3;
/** Incontri al mese: due in diretta, uno registrato. */
export const INCONTRI_MESE = 3;
/** Ogni quante settimane si rifà il punto sulle misure. */
export const SETTIMANE_CHECK = 4;

export const PROCEDURA_ONLINE: PassoProcedura[] = [
  {
    n: 1, fase: 'Prima del percorso — si accetta',
    cosaFare: 'Patto di percorso letto e firmato, prima rata versata. Si spiega che '
      + 'cosa comprende il percorso e che cosa non comprende, e si dice fin da '
      + 'subito che il percorso non è un atto diagnostico.',
    strumento: 'PDF «ESSĒRE Premium», firma dell\'allievo, app ESSĒRE — accesso creato.',
    alternativa: 'Se la persona vuole pensarci, il documento resta valido e si fissa '
      + 'la data in cui si risente. Non si comincia a lavorare prima della firma: '
      + 'un percorso iniziato per cortesia finisce male per tutti e due.',
    siPassaOltreQuando: 'Patto firmato, prima rata incassata, accesso all\'app attivo.',
  },
  {
    n: 2, fase: 'Prima del percorso — si raccoglie',
    cosaFare: 'Scheda onboarding compilata dall\'allievo: obiettivi, orizzonte, '
      + 'dichiarazione di dolore, infortuni e terapie in corso. Foto posturali '
      + 'nelle quattro viste, caricate da lui.',
    strumento: 'App ESSĒRE — Scheda onboarding, Valutazione posturale. Le foto si '
      + 'ridimensionano da sole: si caricano quelle originali, senza ritagliarle.',
    alternativa: 'Foto sbagliate — luce, sfondo, abbigliamento, corpo tagliato — si '
      + 'rifanno PRIMA di andare avanti. Da lontano una foto è tutto quello che '
      + 'c\'è: una posturale letta su una foto sbagliata è peggio di una non letta.',
    siPassaOltreQuando: 'Onboarding salvato, quattro viste utilizzabili, con la persona '
      + 'intera dalla pianta del piede alla testa.',
  },
  {
    n: 3, fase: 'Prima del percorso — si guarda il perimetro',
    cosaFare: 'Si verifica se c\'è qualcosa che richiede il parere di un professionista '
      + 'sanitario, e si decide se questo percorso è la forma giusta per questa '
      + 'persona. La mezz\'ora di osservazione dal vivo qui non c\'è: si guarda '
      + 'più a lungo e si chiede di più.',
    strumento: 'App ESSĒRE — Protocollo, sezione perimetro. Video brevi richiesti '
      + 'all\'allievo per ciò che le foto non mostrano.',
    alternativa: 'Se il dubbio riguarda la salute, non si parte: si indirizza al '
      + 'professionista competente e si aspetta il suo parere. Se il dubbio '
      + 'riguarda ciò che non si riesce a vedere, si propone lo studio invece '
      + 'della distanza — e si restituisce la rata se la persona non può venire.',
    siPassaOltreQuando: 'Perimetro dichiarato per iscritto: o non serve nessun parere, '
      + 'o il parere è arrivato.',
  },
  {
    n: 4, fase: 'Mese 1 — si capisce (incontro in diretta)',
    cosaFare: 'Si apre il Quadro e si leggono le misure INSIEME, in videochiamata. '
      + 'Non si dice che cosa fare: si mostra perché. Quale priorità viene prima '
      + 'delle altre, e su quale numero si giudicherà fra sei settimane.',
    strumento: 'App ESSĒRE — Quadro (Human Interface). Videochiamata.',
    alternativa: 'Se le misure sono poche o si contraddicono, non si forza una '
      + 'conclusione: si ripete il test più debole e si sposta l\'incontro. Meglio '
      + 'una settimana in più che un protocollo costruito su un dato che non tiene.',
    siPassaOltreQuando: 'Le priorità sono confermate o corrette a mano, con il motivo '
      + 'scritto, e l\'allievo sa dire quale viene prima.',
  },
  {
    n: 5, fase: 'Mese 1 — si consegna (incontro in diretta)',
    cosaFare: 'Si consegna il protocollo scritto e la scheda, e si spiega ogni '
      + 'esercizio: che cosa cerca, come si sente quando è fatto bene, che cosa '
      + 'si deve fermare se compare. Nessuno sposterà una mano al posto suo.',
    strumento: 'App ESSĒRE — Protocollo di lavoro, scheda con le spiegazioni.',
    alternativa: 'Un esercizio che non si riesce a spiegare in modo che regga da solo '
      + 'NON va nella scheda a distanza: si sostituisce con uno più semplice che '
      + 'cerca la stessa cosa. La complessità che serve una mano è roba da studio.',
    siPassaOltreQuando: 'Protocollo consegnato in app, e l\'allievo ha ripetuto con '
      + 'parole sue che cosa fa nella prima settimana.',
  },
  {
    n: 6, fase: 'Ogni settimana — si lavora',
    cosaFare: 'L\'allievo registra le sedute mentre le fa. Si guardano le sedute '
      + 'registrate e si risponde in chat: non un controllo, un accompagnamento.',
    strumento: 'App ESSĒRE — seduta dal vivo, storico, chat diretta.',
    alternativa: 'Se le sedute non compaiono per due settimane, si scrive prima che '
      + 'diventi un mese: chi sparisce quasi sempre non ha capito una cosa e si '
      + 'vergogna di chiederla. Si chiede noi.',
    siPassaOltreQuando: 'Le sedute della settimana sono registrate, o si sa perché no.',
  },
  {
    n: 7, fase: `Ogni ${SETTIMANE_CHECK} settimane — il check (registrato)`,
    cosaFare: 'Si rifanno le misure previste e si confrontano con quelle di partenza. '
      + 'Si registra un referto parlato: che cosa è cambiato, che cosa non si è '
      + 'mosso, dove si corregge la rotta per il mese dopo.',
    strumento: 'App ESSĒRE — Quadro, confronto fra valutazioni. Video o vocale '
      + 'caricato nella chat dell\'allievo.',
    alternativa: 'Se le misure nuove non arrivano, il check non si fa a vuoto: si '
      + 'sposta di qualche giorno e si chiedono le foto. Un referto costruito su '
      + 'niente è peggio di un referto in ritardo.',
    siPassaOltreQuando: 'Misure nuove registrate, referto inviato, e la rotta del mese '
      + 'successivo è scritta.',
  },
  {
    n: 8, fase: `Fine del terzo mese — si chiude o si rinnova`,
    cosaFare: 'Valutazione completa e confronto con il punto di partenza. Si dice '
      + 'con onestà che cosa ha funzionato e che cosa no, e si decide insieme se '
      + 'si prosegue, se si passa allo studio, o se il percorso finisce qui.',
    strumento: 'App ESSĒRE — valutazione completa, confronto fra protocolli.',
    alternativa: 'Se il percorso non ha funzionato, si dice. Rinnovare per inerzia una '
      + 'cosa che non sta portando risultati è il modo più veloce di perdere una '
      + 'persona per sempre, invece che per tre mesi.',
    siPassaOltreQuando: 'Confronto consegnato, e la decisione sul proseguimento è presa '
      + 'e scritta — anche quando la decisione è no.',
  },
];

/**
 * Le domande che si fanno PRIMA di ogni check.
 * A distanza non si può guardare meglio: si può solo chiedere meglio.
 */
export const DOMANDE_A_DISTANZA: string[] = [
  'Che cosa ho visto davvero, e che cosa sto deducendo da una foto?',
  'Questa persona sta facendo gli esercizi come li ho pensati, o come li ha capiti?',
  'C\'è qualcosa che mi sta raccontando a parole e che dovrei vedere?',
  'Se avessi questa persona davanti, che cosa le chiederei di fare adesso?',
  'C\'è qualcosa qui che non è mio da decidere?',
];

/** Che cosa non si fa a distanza, mai. */
export const FUORI_PORTATA: string[] = [
  'Valutare un dolore in corso: il dolore si guarda di persona, o si manda da chi di dovere.',
  'Correggere un\'esecuzione complessa che richiede una mano addosso.',
  'Dare indicazioni alimentari: quelle le dà chi ha il titolo per farlo.',
  'Proseguire quando le foto non sono utilizzabili e la persona non le rifà.',
];
