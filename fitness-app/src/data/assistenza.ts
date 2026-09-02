// ============================================================
// ASSISTENZA — i testi che l'allievo legge quando non capisce
// ------------------------------------------------------------
// Regola di questo file: si descrive l'app COM'È, non come
// vorremmo che fosse. Un articolo che nomina una funzione
// inesistente è peggio di un articolo mancante: manda l'allievo
// a cercare qualcosa che non troverà, e la volta dopo non
// chiederà più aiuto all'app — chiederà a Francesco.
//
// Per questo ogni destinazione dichiarata è verificata contro
// le rotte vere della navigazione allievo (ROTTE_ALLIEVO), e il
// test si rompe se una rotta sparisce o cambia nome.
//
// PERIMETRO: qui si spiega l'uso dell'app. Mai il corpo, mai la
// salute, mai un consiglio clinico. Quella riga sta in fondo a
// ogni schermata e non si toglie.
// ============================================================

export interface SezioneArticolo {
  titolo?: string;
  testo: string;
}

/** Dove porta un articolo, quando ha senso portare da qualche parte. */
export interface Destinazione {
  etichetta: string;
  /** il tab, quando la destinazione vive fuori da Profilo */
  tab?: string;
  route: string;
}

export interface Argomento {
  id: string;
  titolo: string;
  sommario: string;
  sezioni: SezioneArticolo[];
  vaiA?: Destinazione;
}

// ------------------------------------------------------------
// Le rotte vere della navigazione allievo (StudentTabsV2).
// Se una rotta viene rinominata e qui no, il test cade.
// ------------------------------------------------------------

export const ROTTE_ALLIEVO: readonly string[] = [
  // Oggi
  'OggiHome', 'StatoEssere', 'Respiro', 'CheckinPalestra', 'Agenda', 'Notifiche',
  // Allenati
  'AllenatiHome', 'Scheda', 'SedutaLive', 'Storico',
  // Progressi
  'ProgressiHome', 'Quadro', 'Storia', 'Traguardi', 'Diario', 'AICoach', 'StoricoProgressi',
  // Chat
  'ChatHome', 'Assistente',
  // Profilo
  'ProfiloHome', 'MieiDati', 'Pagamenti', 'NutrizionistaProfilo', 'Contenuti',
  // Assistenza (questa sezione)
  'Assistenza', 'ArticoloAssistenza',
];

export const TAB_ALLIEVO: readonly string[] = ['Oggi', 'Allenati', 'Progressi', 'Chat', 'Profilo'];

// ------------------------------------------------------------
// Il blocco «parla con il tuo coach»
// ------------------------------------------------------------
//
// Il difetto che questa funzione impedisce: il mockup prometteva
// «ti risponde negli orari dello studio» sempre, anche quando gli
// orari nella scheda Assistente non sono stati compilati. Una
// promessa di fascia oraria che il sistema non conosce è una
// promessa che l'allievo verifica, e che ci smentisce.

export interface BloccoCoach {
  nome: string;
  iniziale: string;
  /** null quando gli orari non sono configurati: allora non si promette nulla */
  quandoRisponde: string | null;
  invito: string;
  destinazione: Destinazione;
}

const iniziale = (nome: string): string => {
  const pulito = (nome || '').trim();
  return pulito ? pulito[0].toUpperCase() : '·';
};

/**
 * Il coach dell'allievo. Quando non è assegnato si parla dello
 * studio, non di una persona che non esiste.
 */
export const bloccoCoach = (
  nomeCoach?: string | null,
  orariStudio?: string | null
): BloccoCoach => {
  const nome = (nomeCoach || '').trim();
  const orari = (orariStudio || '').trim();
  const conNome = nome.length > 0;
  return {
    nome: conNome ? nome : 'lo studio',
    iniziale: conNome ? iniziale(nome) : '·',
    quandoRisponde: orari.length > 0 ? `Ti risponde ${orari}` : null,
    invito: conNome ? `Scrivi a ${nome}` : 'Scrivi allo studio',
    // L'allievo raggiunge le persone dal tab Chat: TeamChat è
    // riservata allo staff, e l'Assistente è l'AI — non una persona.
    destinazione: { etichetta: 'Vai alla chat', tab: 'Chat', route: 'ChatHome' },
  };
};

export const PERIMETRO =
  'Le informazioni in questa sezione riguardano l\'uso dell\'app. Per qualsiasi cosa '
  + 'riguardi la tua salute, parlane con il tuo coach o con un medico.';

export const INTRO =
  'Qui trovi le risposte alle domande più frequenti. Se non basta, c\'è sempre una '
  + 'persona dall\'altra parte.';

// ------------------------------------------------------------
// Gli argomenti
// ------------------------------------------------------------

export const ARGOMENTI: Argomento[] = [
  {
    id: 'iniziare',
    titolo: 'Iniziare con ESSĒRE',
    sommario: 'Come è fatta l\'app, che cosa trovi in ogni schermata e da dove conviene partire.',
    sezioni: [
      {
        testo: 'L\'app è divisa in cinque sezioni, che trovi nella barra in basso. Non devi '
          + 'impararle tutte subito: nei primi giorni ti servono le prime due.',
      },
      {
        titolo: 'Oggi',
        testo: 'È la schermata da cui parti ogni giorno: che cosa hai in programma, il tuo Stato '
          + 'ESSĒRE, il check-in quando entri in palestra e i tuoi appuntamenti.',
      },
      {
        titolo: 'Allenati',
        testo: 'La tua scheda, la seduta dal vivo da seguire mentre ti alleni, e lo storico di '
          + 'quello che hai già fatto.',
      },
      {
        titolo: 'Progressi',
        testo: 'Il tuo quadro, la tua storia nel tempo, i traguardi e il diario. È la sezione che '
          + 'diventa interessante dopo qualche settimana, quando c\'è qualcosa da confrontare.',
      },
      {
        titolo: 'Chat e Profilo',
        testo: 'In Chat parli con il tuo coach. In Profilo ci sono i tuoi dati, i pagamenti e '
          + 'questa sezione di assistenza.',
      },
      {
        titolo: 'Da dove partire',
        testo: 'Apri Oggi, guarda che cosa c\'è in programma, e quando entri in palestra fai il '
          + 'check-in. Il resto lo scopri strada facendo: nessuna schermata si rompe se la esplori.',
      },
    ],
    vaiA: { etichetta: 'Vai a Oggi', tab: 'Oggi', route: 'OggiHome' },
  },

  {
    id: 'programma',
    titolo: 'Il tuo programma',
    sommario: 'Come leggere gli esercizi assegnati, che cosa significano i parametri, come segnare una seduta svolta.',
    sezioni: [
      {
        testo: 'La tua scheda la trovi in Allenati. Non è un elenco fisso: cambia nel tempo, ed è '
          + 'il tuo coach a cambiarla — mai l\'app da sola.',
      },
      {
        titolo: 'Che cosa significano i numeri',
        testo: 'Accanto a ogni esercizio trovi le serie (quante volte lo ripeti), le ripetizioni '
          + '(quanti movimenti per serie) e il carico in chilogrammi. Dove c\'è un recupero, è il '
          + 'tempo di pausa fra una serie e l\'altra.',
      },
      {
        titolo: 'Seguire la seduta dal vivo',
        testo: 'Da Allenati puoi aprire la seduta dal vivo: ti porta un esercizio alla volta e '
          + 'registra quello che fai mentre lo fai. È il modo migliore, perché i dati restano '
          + 'esatti invece di essere ricostruiti a memoria la sera.',
      },
      {
        titolo: 'Segnare una seduta già fatta',
        testo: 'Se ti sei allenato senza aprire l\'app, puoi registrare la seduta dopo. I numeri '
          + 'saranno un po\' più approssimativi: vanno bene, ma la seduta dal vivo è più precisa.',
      },
      {
        titolo: 'Se un esercizio non ti torna',
        testo: 'Non cambiarlo di tua iniziativa e non saltarlo in silenzio: scrivilo al tuo coach. '
          + 'Un esercizio che non ti convince è un\'informazione utile, non un problema.',
      },
    ],
    vaiA: { etichetta: 'Apri la mia scheda', tab: 'Allenati', route: 'Scheda' },
  },

  {
    id: 'checkin',
    titolo: 'Check-in in studio',
    sommario: 'Come funziona il QR all\'ingresso e che cosa fare se non viene letto.',
    sezioni: [
      {
        testo: 'Quando entri in palestra, apri Oggi e tocca il check-in: si accende la fotocamera '
          + 'e inquadri il QR all\'ingresso. Serve a registrare che sei venuto — è così che la '
          + 'lezione viene scalata dal tuo pacchetto.',
      },
      {
        titolo: 'Se il codice non viene letto',
        testo: 'Quasi sempre è luce o distanza: allontanati di venti centimetri, evita i riflessi '
          + 'sullo schermo del QR, e pulisci l\'obiettivo del telefono. Se dopo qualche secondo non '
          + 'succede nulla, chiudi e riapri la schermata.',
      },
      {
        titolo: 'Se la fotocamera non si accende',
        testo: 'La prima volta il telefono chiede il permesso di usare la fotocamera: se hai '
          + 'risposto di no, il permesso va riattivato nelle impostazioni del telefono, alla voce '
          + 'ESSĒRE.',
      },
      {
        titolo: 'Se proprio non funziona',
        testo: 'Non restare all\'ingresso a insistere: allenati, e dillo al tuo coach. Il check-in '
          + 'si può registrare a mano — non perdi nulla.',
      },
    ],
    vaiA: { etichetta: 'Apri il check-in', tab: 'Oggi', route: 'CheckinPalestra' },
  },

  {
    id: 'valutazioni',
    titolo: 'Valutazioni e progressi',
    sommario: 'Dove ritrovi la tua valutazione Mind Movement e come leggere i cambiamenti nel tempo.',
    sezioni: [
      {
        testo: 'La valutazione Mind Movement è la lettura completa che si fa in due sessioni: test '
          + 'del movimento, respiro, composizione corporea. Da lì nasce il tuo programma.',
      },
      {
        titolo: 'Dove la ritrovi',
        testo: 'In Progressi trovi il tuo quadro — la fotografia di adesso — e la tua storia, che '
          + 'è la stessa cosa vista nel tempo.',
      },
      {
        titolo: 'Come si leggono i cambiamenti',
        testo: 'Guarda le settimane, non i giorni. Un valore che si muove da un giorno all\'altro '
          + 'dice poco: quello che conta è la direzione su tre o quattro settimane.',
      },
      {
        titolo: 'Se un numero ti preoccupa',
        testo: 'Questi valori servono a orientare l\'allenamento, non a dirti come stai di salute. '
          + 'Un numero che non ti torna si guarda insieme al tuo coach, che sa che cosa c\'era '
          + 'intorno a quel giorno.',
      },
    ],
    vaiA: { etichetta: 'Vai al mio quadro', tab: 'Progressi', route: 'Quadro' },
  },

  {
    id: 'stato-essere',
    titolo: 'Stato ESSĒRE e dati del corpo',
    sommario: 'Che cosa misurano questi valori, che cosa non misurano, e perché vanno letti insieme al coach.',
    sezioni: [
      {
        testo: 'Lo Stato ESSĒRE è la lettura del tuo momento: quanto sei pronto oggi, come stai '
          + 'recuperando, che cosa è cambiato di recente. Lo trovi in Oggi.',
      },
      {
        titolo: 'Che cosa misura',
        testo: 'Mette insieme quello che hai registrato — allenamenti, riposo, sensazioni — e ne '
          + 'ricava un quadro del momento. Più dati inserisci, più il quadro è tuo e meno è una media.',
      },
      {
        titolo: 'Che cosa NON misura',
        testo: 'Non è un esame e non dice niente sulla tua salute. Un valore basso non significa '
          + 'che c\'è qualcosa che non va: significa che oggi non è il giorno per spingere.',
      },
      {
        titolo: 'Perché si legge insieme al coach',
        testo: 'Il numero da solo non sa che hai traslocato, dormito male o avuto una settimana '
          + 'pesante. Il tuo coach sì — ed è per questo che la lettura la fate in due.',
      },
    ],
    vaiA: { etichetta: 'Apri Stato ESSĒRE', tab: 'Oggi', route: 'StatoEssere' },
  },

  {
    id: 'account',
    titolo: 'Account e accesso',
    sommario: 'Password, email, dispositivi collegati, notifiche.',
    sezioni: [
      {
        testo: 'Il tuo account è legato all\'email con cui sei stato registrato. I dati li trovi '
          + 'in Profilo, alla voce «I miei dati».',
      },
      {
        titolo: 'Se hai dimenticato la password',
        testo: 'Nella schermata di accesso c\'è il recupero password: arriva un\'email con il link '
          + 'per rifarla. Se non la vedi, controlla la posta indesiderata prima di riprovare.',
      },
      {
        titolo: 'Cambiare email',
        testo: 'L\'email è anche il tuo nome utente: per cambiarla scrivi al tuo coach, che la '
          + 'aggiorna dallo studio. Non si cambia da soli, per evitare di restare chiusi fuori.',
      },
      {
        titolo: 'Più dispositivi',
        testo: 'Puoi usare ESSĒRE su telefono e computer con lo stesso accesso: i dati sono gli '
          + 'stessi e si aggiornano da soli.',
      },
      {
        titolo: 'Notifiche',
        testo: 'Le notifiche si attivano dalle impostazioni del telefono, alla voce ESSĒRE. Se le '
          + 'hai rifiutate la prima volta, è lì che si riattivano.',
      },
    ],
    vaiA: { etichetta: 'Vai a I miei dati', route: 'MieiDati' },
  },

  {
    id: 'percorso',
    titolo: 'Il tuo percorso e i rinnovi',
    sommario: 'Quale formula hai attiva, fino a quando, e a chi rivolgerti per cambiarla.',
    sezioni: [
      {
        testo: 'In Profilo, alla voce Pagamenti, vedi il piano che hai attivo, le lezioni che ti '
          + 'restano e le scadenze.',
      },
      {
        titolo: 'Come si scalano le lezioni',
        testo: 'Ogni seduta registrata scala una lezione dal pacchetto attivo. Se un conteggio non '
          + 'ti torna, non rifarlo a mente: segnalalo, si controlla insieme sullo storico.',
      },
      {
        titolo: 'Rinnovi',
        testo: 'Il rinnovo si fa in studio con il tuo coach. L\'app ti mostra quando il piano sta '
          + 'per finire, ma non rinnova da sola: la scelta resta una conversazione.',
      },
      {
        titolo: 'Cambiare formula',
        testo: 'Si può, e si valuta insieme. Se hai sottoscritto un piano prima di un cambio di '
          + 'listino, resti alle condizioni pattuite fino alla scadenza.',
      },
    ],
    vaiA: { etichetta: 'Vai ai pagamenti', route: 'Pagamenti' },
  },

  {
    id: 'privacy',
    titolo: 'I tuoi dati e la privacy',
    sommario: 'Chi vede che cosa, come sono conservati i tuoi dati, come chiederne la cancellazione.',
    sezioni: [
      {
        testo: 'I dati che inserisci in ESSĒRE servono a costruire il tuo programma. Non sono in '
          + 'vendita e non escono dallo studio.',
      },
      {
        titolo: 'Chi vede che cosa',
        testo: 'Il tuo coach vede i tuoi dati di allenamento e valutazione, perché gli servono per '
          + 'lavorare. Gli altri allievi non vedono nulla di tuo. Le conversazioni in chat le '
          + 'vedono solo tu e chi vi partecipa.',
      },
      {
        titolo: 'Consensi',
        testo: 'I consensi che hai firmato li ritrovi in Profilo, alla voce «I miei dati». Puoi '
          + 'rivederli quando vuoi.',
      },
      {
        titolo: 'Cancellazione',
        testo: 'Puoi chiedere in qualsiasi momento che i tuoi dati siano cancellati: si fa per '
          + 'iscritto al tuo coach o allo studio, e ti viene confermato quando è fatto.',
      },
    ],
    vaiA: { etichetta: 'Vai a I miei dati', route: 'MieiDati' },
  },
];

// ------------------------------------------------------------
// Qualcosa non funziona
// ------------------------------------------------------------

export const PROBLEMI: Argomento[] = [
  {
    id: 'non-accedo',
    titolo: 'Non riesco ad accedere',
    sommario: 'Password, email, account disattivato.',
    sezioni: [
      {
        titolo: 'Prima cosa',
        testo: 'Controlla che l\'email sia quella con cui ti hanno registrato, senza spazi in '
          + 'coda: è l\'errore più frequente e il più invisibile.',
      },
      {
        titolo: 'Password dimenticata',
        testo: 'Usa il recupero password nella schermata di accesso. L\'email arriva in pochi '
          + 'minuti; se non la vedi, guarda nella posta indesiderata.',
      },
      {
        titolo: 'Se dice che l\'account non è attivo',
        testo: 'Non è un guasto: l\'accesso è stato sospeso dallo studio. Si risolve solo '
          + 'parlandone con il tuo coach.',
      },
    ],
  },
  {
    id: 'programma-fermo',
    titolo: 'Il programma non si aggiorna',
    sommario: 'Quando la scheda sembra vecchia.',
    sezioni: [
      {
        testo: 'La scheda si aggiorna quando il tuo coach la cambia: se è uguale a ieri, quasi '
          + 'sempre è perché non è stata ancora cambiata.',
      },
      {
        titolo: 'Prova prima questo',
        testo: 'Esci dalla schermata e rientra. Se sei su una rete lenta, aspetta qualche secondo: '
          + 'i dati arrivano da internet e ogni tanto ci mettono un attimo.',
      },
      {
        titolo: 'Se resta ferma',
        testo: 'Scrivi al tuo coach dicendo che cosa vedi e da quando. Con quella informazione si '
          + 'capisce subito se è l\'app o se la scheda non è stata aggiornata.',
      },
    ],
  },
  {
    id: 'checkin-mancato',
    titolo: 'Il check-in non ha registrato la sessione',
    sommario: 'Sei venuto ma non risulta.',
    sezioni: [
      {
        testo: 'Capita, e non perdi la lezione: le sedute si possono registrare anche dopo.',
      },
      {
        titolo: 'Che cosa fare',
        testo: 'Segnalalo al tuo coach dicendo il giorno e più o meno l\'ora. Viene registrata a '
          + 'mano e il conteggio del pacchetto torna giusto.',
      },
      {
        titolo: 'Perché succede',
        testo: 'Nella quasi totalità dei casi il QR non è stato letto del tutto e la schermata è '
          + 'stata chiusa prima della conferma. La prossima volta aspetta il messaggio verde.',
      },
    ],
  },
  {
    id: 'niente-notifiche',
    titolo: 'Non ricevo le notifiche',
    sommario: 'Permessi del telefono.',
    sezioni: [
      {
        testo: 'Le notifiche dipendono dal permesso che hai dato al telefono, non dall\'app.',
      },
      {
        titolo: 'Dove si riattivano',
        testo: 'Nelle impostazioni del telefono, cerca ESSĒRE nell\'elenco delle app e attiva le '
          + 'notifiche. Su iPhone c\'è anche il riepilogo programmato, che può ritardarle.',
      },
      {
        titolo: 'Se le hai attive e non arrivano',
        testo: 'Controlla di non avere il risparmio energetico o il «non disturbare» sempre '
          + 'acceso: sono le due cause più comuni.',
      },
    ],
  },
  {
    id: 'altro-problema',
    titolo: 'Segnala un altro problema',
    sommario: 'Scrivi allo studio: le segnalazioni vengono lette davvero.',
    sezioni: [
      {
        testo: 'Se quello che ti succede non è in questa lista, scrivilo in chat. Non c\'è un '
          + 'modulo da compilare: basta un messaggio.',
      },
      {
        titolo: 'Che cosa scrivere',
        testo: 'Tre cose e bastano: che cosa stavi facendo, che cosa ti aspettavi, che cosa è '
          + 'successo invece. Se puoi, allega uno screenshot — vale più di mezza pagina di '
          + 'spiegazione.',
      },
    ],
    vaiA: { etichetta: 'Scrivi in chat', tab: 'Chat', route: 'ChatHome' },
  },
];

/** Un argomento o un problema, per id. */
export const perId = (id: string): Argomento | undefined =>
  [...ARGOMENTI, ...PROBLEMI].find((a) => a.id === id);
