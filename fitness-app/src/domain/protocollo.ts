import { Quadro, Traccia } from './humanInterface';

// ============================================================
// IL PROTOCOLLO DI LAVORO
// A.S.D. Evolution Sport · Mind Movement Lab
// ------------------------------------------------------------
// Fino a qui ogni valutazione era un'isola: postura, composizione,
// cammino, squat, Stellato. Ognuna col suo esito, nessuna che
// parlasse con le altre. Il cliente pagava una valutazione e
// riceveva dei numeri.
//
// Qui i numeri diventano una decisione: da dove si parte, con
// quante sedute, con chi, in quanto tempo, a quanto — e su un
// foglio che si firma in due.
//
// REGOLE FERREE
//  · Solo misure realmente raccolte. Un'area senza misura resta
//    dichiarata «non misurata»: non si riempie con un'ipotesi.
//  · Screening, mai diagnosi. Dove i segnali toccano il confine
//    sanitario, il protocollo si ferma e chiede il parere di un
//    professionista: c'è una riga per la sua firma.
//  · Le soglie qui sotto sono OPERATIVE, non norme cliniche:
//    servono a ordinare le priorità di lavoro, e le decide il
//    direttore tecnico. Sono in un posto solo, e si cambiano lì.
//  · I prezzi non si inventano al momento: stanno qui, e il
//    documento del cliente li riporta uno per uno.
// ============================================================

export const PROTOCOLLO_VERSION = 1;

// ------------------------------------------------------------
// Quanto costa, e chi conduce
// ------------------------------------------------------------

export type Conduttore = 'francesco' | 'giuseppe';

export interface Listino {
  id: Conduttore;
  nome: string;
  ruolo: string;
  prezzo: number;
}

export const CONDUTTORI: Listino[] = [
  { id: 'francesco', nome: 'Francesco', ruolo: 'Direttore tecnico', prezzo: 40 },
  { id: 'giuseppe', nome: 'Giuseppe', ruolo: 'Istruttore', prezzo: 35 },
];

/** La valutazione completa: test, lettura integrata, protocollo scritto. */
export const PREZZO_VALUTAZIONE = 150;

export const conduttore = (id: Conduttore): Listino =>
  CONDUTTORI.find((c) => c.id === id)!;

// ------------------------------------------------------------
// Le soglie operative — in un posto solo
// ------------------------------------------------------------

export const SOGLIE_PROTOCOLLO = {
  /** simmetria del passo sotto la quale l'asimmetria diventa il primo tema */
  simmetriaPasso: 90,
  /** inclinazione del tronco nel cammino oltre la quale si guarda il carico assiale */
  troncoCammino: 10,
  /** angolo del ginocchio al fondo oltre il quale lo squat è parziale */
  profonditaSquat: 100,
  /** inclinazione del tronco nello squat oltre la quale la spinta si sposta dietro */
  troncoSquat: 45,
  /** distretti posturali rilevati oltre i quali la postura apre il lavoro */
  rilieviPostura: 3,
  /** massa grassa stimata oltre la quale la ricomposizione entra fra le priorità */
  massaGrassa: 30,
  /** cadenza sotto la quale il passo è lento e vale come segnale di lavoro */
  cadenza: 100,
};

// ------------------------------------------------------------
// La lettura integrata: che cosa dicono i test MESSI INSIEME
// ------------------------------------------------------------

export type AreaLavoro =
  | 'postura' | 'movimento' | 'carico' | 'composizione' | 'respiro' | 'capacita';

export interface Priorita {
  area: AreaLavoro;
  titolo: string;
  /** perché, coi numeri veri della persona */
  perche: string;
  /** che cosa si fa, in pratica */
  comeSiLavora: string;
  /** le misure che l'hanno accesa */
  misure: string[];
  forza: 'alta' | 'media';
}

interface Regola {
  chiave: string;
  area: AreaLavoro;
  titolo: string;
  /** true = questa misura accende la priorità */
  accende: (valore: number) => boolean;
  soglia: number;
  frase: (v: number, unita: string) => string;
  comeSiLavora: string;
  forza: 'alta' | 'media';
}

const REGOLE: Regola[] = [
  {
    chiave: 'rilievi_postura', area: 'postura', titolo: 'Prima la postura',
    accende: (v) => v >= SOGLIE_PROTOCOLLO.rilieviPostura,
    soglia: SOGLIE_PROTOCOLLO.rilieviPostura,
    frase: (v) => `La valutazione posturale ha rilevato ${v} distretti da lavorare.`,
    comeSiLavora: 'Si parte dai distretti rilevati: mobilità dove manca, controllo dove '
      + 'manca, e solo dopo il carico. Il carico su uno schema che compensa aumenta il compenso.',
    forza: 'alta',
  },
  {
    chiave: 'simmetria_passo', area: 'movimento', titolo: 'Riequilibrare il passo',
    accende: (v) => v < SOGLIE_PROTOCOLLO.simmetriaPasso,
    soglia: SOGLIE_PROTOCOLLO.simmetriaPasso,
    frase: (v, u) => `La simmetria del passo è al ${v}${u}: i due lati non lavorano allo stesso modo.`,
    comeSiLavora: 'Lavoro monolaterale con carichi bassi e controllo alto, per riportare '
      + 'i due lati sullo stesso compito prima di aumentare qualsiasi peso.',
    forza: 'alta',
  },
  {
    chiave: 'ginocchio_fondo', area: 'movimento', titolo: 'Recuperare l\'ampiezza',
    accende: (v) => v > SOGLIE_PROTOCOLLO.profonditaSquat,
    soglia: SOGLIE_PROTOCOLLO.profonditaSquat,
    frase: (v, u) => `Nello squat l'angolo al fondo resta a ${v}${u}: il movimento è ancora parziale.`,
    comeSiLavora: 'Ampiezza prima dei chili: si scende il carico quanto serve per arrivare '
      + 'in fondo senza compensare, e si risale quando l\'ampiezza tiene.',
    forza: 'alta',
  },
  {
    chiave: 'tronco_squat', area: 'carico', titolo: 'Riportare la spinta al centro',
    accende: (v) => v > SOGLIE_PROTOCOLLO.troncoSquat,
    soglia: SOGLIE_PROTOCOLLO.troncoSquat,
    frase: (v, u) => `Il tronco si inclina di ${v}${u} nello squat: la spinta si sposta indietro.`,
    comeSiLavora: 'Varianti che tengono il busto più eretto, lavoro sulla catena anteriore '
      + 'e sul controllo del bacino, poi ritorno graduale allo schema pieno.',
    forza: 'media',
  },
  {
    chiave: 'tronco_cammino', area: 'postura', titolo: 'Il tronco nel cammino',
    accende: (v) => v > SOGLIE_PROTOCOLLO.troncoCammino,
    soglia: SOGLIE_PROTOCOLLO.troncoCammino,
    frase: (v, u) => `Nel cammino il tronco resta inclinato di ${v}${u}.`,
    comeSiLavora: 'Estensione toracica e attivazione posteriore, con richiami frequenti '
      + 'e brevi: il cammino si corregge con la ripetizione, non con la fatica.',
    forza: 'media',
  },
  {
    chiave: 'cadenza', area: 'capacita', titolo: 'Alzare il ritmo del passo',
    accende: (v) => v > 0 && v < SOGLIE_PROTOCOLLO.cadenza,
    soglia: SOGLIE_PROTOCOLLO.cadenza,
    frase: (v, u) => `La cadenza è di ${v} ${u}: il passo è lento rispetto alla soglia di lavoro.`,
    comeSiLavora: 'Cammino a ritmo guidato, progressione di durata prima che di velocità, '
      + 'e verifica alla rivalutazione.',
    forza: 'media',
  },
  {
    chiave: 'body_fat', area: 'composizione', titolo: 'Ricomposizione',
    accende: (v) => v > SOGLIE_PROTOCOLLO.massaGrassa,
    soglia: SOGLIE_PROTOCOLLO.massaGrassa,
    frase: (v, u) => `La massa grassa stimata è al ${v}${u}.`,
    comeSiLavora: 'Densità di lavoro e costanza settimanale, con la composizione rimisurata '
      + 'ogni quattro settimane: è la misura che cambia più lentamente e va guardata nel tempo.',
    forza: 'media',
  },
];

const valoreUltimo = (t: Traccia): number => t.ultimo.valore;

/**
 * Le priorità nascono dalle misure MESSE INSIEME, in ordine:
 * prima ciò che cambia lo schema (postura, ampiezza, simmetria),
 * poi ciò che cambia i numeri (composizione, capacità).
 */
export const leggiPriorita = (quadro: Quadro): Priorita[] => {
  const out: Priorita[] = [];
  for (const r of REGOLE) {
    const t = quadro.tracce.find((x) => x.chiave === r.chiave);
    if (!t) continue;
    const v = valoreUltimo(t);
    if (!r.accende(v)) continue;
    out.push({
      area: r.area,
      titolo: r.titolo,
      perche: r.frase(v, t.unita),
      comeSiLavora: r.comeSiLavora,
      misure: [`${t.etichetta}: ${v}${t.unita ? ' ' + t.unita : ''}`],
      forza: r.forza,
    });
  }
  // alta prima di media, mantenendo l'ordine delle regole
  return [
    ...out.filter((p) => p.forza === 'alta'),
    ...out.filter((p) => p.forza === 'media'),
  ];
};

// ------------------------------------------------------------
// Il confine sanitario
// ------------------------------------------------------------

export interface Perimetro {
  serveParere: boolean;
  motivi: string[];
  frase: string;
}

/**
 * Dove i segnali toccano il confine sanitario, il protocollo non
 * decide: chiede. Non è prudenza formale — è che oltre quel confine
 * non abbiamo gli strumenti per vedere, e fingere di averli è il
 * modo più veloce di fare male a qualcuno.
 */
export const valutaPerimetro = (input: {
  quadro: Quadro;
  /** dalla scheda onboarding: l'allievo ha dichiarato dolore, infortuni o terapie */
  haControindicazioni?: boolean;
  /** note del coach che richiedono un occhio sanitario */
  segnalazioniCoach?: string[];
}): Perimetro => {
  const motivi: string[] = [];

  if (input.haControindicazioni) {
    motivi.push('Nella scheda iniziale sono stati dichiarati dolore, infortuni o terapie in corso.');
  }
  (input.segnalazioniCoach || []).forEach((s) => motivi.push(s));

  const sim = input.quadro.tracce.find((t) => t.chiave === 'simmetria_passo');
  if (sim && sim.ultimo.valore < 80) {
    motivi.push(`La simmetria del passo è al ${sim.ultimo.valore}%: un'asimmetria di questa `
      + 'entità va guardata da un professionista sanitario prima di caricarla.');
  }

  return {
    serveParere: motivi.length > 0,
    motivi,
    frase: motivi.length > 0
      ? 'Prima di iniziare il percorso è richiesto il parere di un professionista sanitario '
        + '(ortopedico, fisiatra o fisioterapista). Il protocollo resta valido: si attiva '
        + 'quando il parere è acquisito, e il documento ne porta la firma.'
      : 'Nessun segnale che richieda un parere sanitario preventivo. Resta fermo che le '
        + 'valutazioni sono di screening e non sostituiscono alcun atto medico.',
  };
};

// ------------------------------------------------------------
// Il piano: quante sedute, con chi, in quanto tempo, a quanto
// ------------------------------------------------------------

export interface VoceSedute {
  conduttore: Conduttore;
  quante: number;
}

export interface RigaPiano {
  descrizione: string;
  quante: number;
  prezzoUnitario: number;
  totale: number;
}

export interface PianoLavoro {
  righe: RigaPiano[];
  totaleSedute: number;
  totaleSeduteEuro: number;
  valutazioneEuro: number;
  totaleEuro: number;
  seduteASettimana: number;
  settimane: number;
  /** rate concordate, se il pagamento è dilazionato */
  numeroRate?: number;
  importoRata?: number;
}

const arrotonda2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * Il piano si compone: tante sedute con chi le conduce, e il conto
 * si fa da sé. La valutazione (150 €) è una voce a parte, perché è
 * un lavoro a sé: test, lettura integrata e protocollo scritto.
 */
export const componiPiano = (input: {
  voci: VoceSedute[];
  seduteASettimana?: number;
  /** true = la valutazione è già stata pagata e non rientra nel totale */
  valutazioneGiaPagata?: boolean;
  numeroRate?: number;
}): PianoLavoro => {
  const voci = (input.voci || []).filter((v) => v.quante > 0);
  const righe: RigaPiano[] = voci.map((v) => {
    const c = conduttore(v.conduttore);
    return {
      descrizione: `Sedute con ${c.nome} — ${c.ruolo}`,
      quante: v.quante,
      prezzoUnitario: c.prezzo,
      totale: arrotonda2(v.quante * c.prezzo),
    };
  });

  const totaleSedute = voci.reduce((s, v) => s + v.quante, 0);
  const totaleSeduteEuro = arrotonda2(righe.reduce((s, r) => s + r.totale, 0));
  const valutazioneEuro = input.valutazioneGiaPagata ? 0 : PREZZO_VALUTAZIONE;
  const totaleEuro = arrotonda2(totaleSeduteEuro + valutazioneEuro);

  const aSettimana = Math.max(1, input.seduteASettimana || 2);
  const settimane = totaleSedute > 0 ? Math.ceil(totaleSedute / aSettimana) : 0;

  const rate = input.numeroRate && input.numeroRate > 1 ? input.numeroRate : undefined;

  return {
    righe,
    totaleSedute,
    totaleSeduteEuro,
    valutazioneEuro,
    totaleEuro,
    seduteASettimana: aSettimana,
    settimane,
    numeroRate: rate,
    importoRata: rate ? arrotonda2(totaleEuro / rate) : undefined,
  };
};

// ------------------------------------------------------------
// Quando si rifanno i test
// ------------------------------------------------------------

export interface RitmoTest {
  tipo: string;
  etichetta: string;
  ogniSettimane: number;
  perche: string;
}

export const RITMO_TEST: RitmoTest[] = [
  {
    tipo: 'posture.assessed', etichetta: 'Valutazione posturale', ogniSettimane: 12,
    perche: 'La postura è un adattamento: sotto le dodici settimane si misura il rumore, non il cambiamento.',
  },
  {
    tipo: 'movement.squat_assessed', etichetta: 'Analisi dello squat', ogniSettimane: 6,
    perche: 'Ampiezza e compensi rispondono prima di tutto il resto: sei settimane bastano a vederlo.',
  },
  {
    tipo: 'movement.gait_assessed', etichetta: 'Analisi del cammino', ogniSettimane: 12,
    perche: 'Il passo cambia lentamente, ed è la misura più onesta sul trasferimento nella vita di tutti i giorni.',
  },
  {
    tipo: 'body.composition_estimated', etichetta: 'Composizione corporea', ogniSettimane: 4,
    perche: 'È la misura che le persone guardano di più: va ripresa spesso, e letta con calma.',
  },
  {
    tipo: 'mindmovement.assessed', etichetta: 'Valutazione Mind Movement™', ogniSettimane: 12,
    perche: 'La lettura completa dei quattro domini chiude il ciclo e apre il successivo.',
  },
];

export interface Scadenza {
  tipo: string;
  etichetta: string;
  ultimaIl: Date | null;
  giorniDaAllora: number | null;
  scaduto: boolean;
  /** mai fatto */
  mancante: boolean;
  perche: string;
}

export const prossimeRipetizioni = (quadro: Quadro, oggi = new Date()): Scadenza[] =>
  RITMO_TEST.map((r) => {
    const fatta = quadro.valutazioni.find((v) => v.tipo === r.tipo);
    const ultima = fatta?.ultima || null;
    const giorni = ultima
      ? Math.floor((oggi.getTime() - ultima.getTime()) / 86400000)
      : null;
    return {
      tipo: r.tipo,
      etichetta: r.etichetta,
      ultimaIl: ultima,
      giorniDaAllora: giorni,
      scaduto: giorni !== null && giorni >= r.ogniSettimane * 7,
      mancante: !ultima,
      perche: r.perche,
    };
  });

// ------------------------------------------------------------
// Il documento del cliente
// ------------------------------------------------------------

export interface DatiProtocollo {
  allievo: string;
  data: Date;
  quadro: Quadro;
  priorita: Priorita[];
  perimetro: Perimetro;
  piano: PianoLavoro;
  obiettivo?: string;
  coach: string;
  studio?: string;
}

export interface SezioneDocumento {
  n: number;
  titolo: string;
  testo?: string;
  /** righe misurate: etichetta, valore, quando */
  misure?: Array<{ etichetta: string; valore: string; quando: string }>;
  elenco?: string[];
}

const dataIt = (d: Date): string =>
  d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });

const euro = (n: number): string =>
  new Intl.NumberFormat('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);

/**
 * Il foglio che il cliente si porta a casa: che cosa è stato
 * misurato, che cosa dicono le misure messe insieme, che cosa
 * faremo, in quanto tempo e a quanto. Niente diagnosi, niente
 * promesse: misure, lavoro, numeri.
 */
export const documentoCliente = (d: DatiProtocollo): SezioneDocumento[] => {
  const sezioni: SezioneDocumento[] = [];

  sezioni.push({
    n: 1,
    titolo: 'Che cosa è stato fatto',
    testo: 'La valutazione completa comprende i test del Metodo Mind Movement™ '
      + '— posturale, del movimento, del cammino, dello squat e della composizione corporea — '
      + 'la loro lettura integrata e la stesura di questo protocollo di lavoro. '
      + `Le valutazioni svolte sono ${d.quadro.valutazioni.length}, `
      + `su ${d.quadro.areeCoperte} aree del corpo su ${d.quadro.areeTotali}.`,
    elenco: d.quadro.valutazioni.map((v) =>
      `${v.etichetta} — ${v.quante > 1 ? `${v.quante} volte, l'ultima ` : ''}${v.ultima ? dataIt(v.ultima) : 'in programma'}`),
  });

  sezioni.push({
    n: 2,
    titolo: 'Le misure',
    testo: d.quadro.tracce.length
      ? 'Questi sono i numeri raccolti. Sono misure, non giudizi: servono a sapere da dove '
        + 'partiamo e a riconoscere il cambiamento quando arriva.'
      : 'Non ci sono ancora misure registrate.',
    misure: d.quadro.tracce.map((t) => ({
      etichetta: t.etichetta,
      valore: `${t.ultimo.valore}${t.unita ? ' ' + t.unita : ''}`
        + (t.punti.length > 1 ? ` (prima: ${t.primo.valore})` : ''),
      quando: dataIt(t.ultimo.data),
    })),
  });

  sezioni.push({
    n: 3,
    titolo: 'Che cosa dicono, messe insieme',
    testo: d.priorita.length
      ? 'Le valutazioni non si leggono una per una: si leggono insieme. Da questa lettura '
        + 'esce l\'ordine del lavoro — prima ciò che cambia lo schema, poi ciò che cambia i numeri.'
      : 'Dalle misure raccolte non emergono priorità che cambino l\'ordine del lavoro: '
        + 'si procede con il programma generale e si rivaluta alle scadenze previste.',
    elenco: d.priorita.map((p, i) => `${i + 1}. ${p.titolo} — ${p.perche} ${p.comeSiLavora}`),
  });

  sezioni.push({
    n: 4,
    titolo: 'Il percorso',
    testo: [
      d.obiettivo ? `Obiettivo concordato: ${d.obiettivo}.` : '',
      d.piano.totaleSedute > 0
        ? `Il percorso prevede ${d.piano.totaleSedute} sedute, `
          + `${d.piano.seduteASettimana} a settimana, per circa ${d.piano.settimane} settimane.`
        : 'Il numero di sedute viene concordato insieme.',
      'Le sedute possono essere condotte da persone diverse dello staff: il metodo è lo stesso '
        + 'e il programma resta unico, seguito dal direttore tecnico.',
    ].filter(Boolean).join(' '),
    elenco: d.piano.righe.map((r) =>
      `${r.descrizione}: ${r.quante} × ${euro(r.prezzoUnitario)} € = ${euro(r.totale)} €`),
  });

  const costi: string[] = [];
  if (d.piano.valutazioneEuro > 0) {
    costi.push(`Valutazione completa e protocollo di lavoro: ${euro(d.piano.valutazioneEuro)} €`);
  } else {
    costi.push('Valutazione completa e protocollo di lavoro: già corrisposta');
  }
  d.piano.righe.forEach((r) => costi.push(`${r.descrizione}: ${euro(r.totale)} €`));
  costi.push(`Totale: ${euro(d.piano.totaleEuro)} €`);
  if (d.piano.numeroRate && d.piano.importoRata) {
    costi.push(`Pagamento in ${d.piano.numeroRate} rate da ${euro(d.piano.importoRata)} € ciascuna`);
  }

  sezioni.push({ n: 5, titolo: 'I costi', elenco: costi });

  sezioni.push({
    n: 6,
    titolo: 'Quando si rimisura',
    testo: 'Il protocollo non è un foglio da mettere in un cassetto: si verifica. '
      + 'I test si ripetono a scadenze fisse, e i numeri nuovi si confrontano con questi.',
    elenco: RITMO_TEST.map((r) => `${r.etichetta}: ogni ${r.ogniSettimane} settimane — ${r.perche}`),
  });

  sezioni.push({
    n: 7,
    titolo: 'Che cosa questo protocollo è, e che cosa non è',
    testo: 'Le valutazioni del Metodo Mind Movement™ hanno finalità di screening e di '
      + 'orientamento del lavoro educativo-motorio. Non costituiscono atto diagnostico e non '
      + 'sostituiscono alcuna valutazione o terapia sanitaria. '
      + d.perimetro.frase,
    elenco: d.perimetro.motivi,
  });

  return sezioni;
};

// ------------------------------------------------------------
// La procedura interna — il programma nel programma
// ------------------------------------------------------------

export interface PassoProcedura {
  n: number;
  fase: string;
  cosaFare: string;
  strumento: string;
  /** che cosa fare quando lo strumento non c'è o non basta */
  alternativa: string;
  /** che cosa deve essere vero per passare al prossimo */
  siPassaOltreQuando: string;
}

/**
 * Il foglio che resta a Francesco. Non è il documento del cliente
 * scritto meglio: è la procedura operativa — con che cosa si misura,
 * che cosa si guarda, che cosa si fa quando lo strumento manca, e
 * quando si può passare al passo dopo.
 *
 * I contenuti del metodo sono suoi: qui vive la STRUTTURA, e ogni
 * passo dichiara che cosa serve perché sia considerato chiuso.
 */
export const PROCEDURA: PassoProcedura[] = [
  {
    n: 1, fase: 'Prima sessione — raccolta',
    cosaFare: 'Scheda onboarding completa, obiettivi e orizzonte, dichiarazione di dolore, '
      + 'infortuni e terapie. Foto posturali nelle quattro viste.',
    strumento: 'App ESSĒRE — Scheda onboarding, Valutazione posturale.',
    alternativa: 'Se le foto non riescono (spazio, luce, abbigliamento), si annota e si '
      + 'ripete alla seduta successiva: una postura misurata male è peggio di una non misurata.',
    siPassaOltreQuando: 'Onboarding salvato e almeno le viste frontale e laterale acquisite.',
  },
  {
    n: 2, fase: 'Prima sessione — movimento',
    cosaFare: 'Analisi dello squat e del cammino. Si guardano ampiezza al fondo, valgo, '
      + 'shift dell\'anca, inclinazione del tronco, cadenza e simmetria.',
    strumento: 'App ESSĒRE — Analisi dello squat, Analisi del cammino.',
    alternativa: 'Se la persona non può eseguire lo squat completo, si registra la variante '
      + 'eseguita e si annota il limite: il confronto futuro sarà su quella variante.',
    siPassaOltreQuando: 'Almeno una prova utile per ciascuna analisi, con i numeri salvati.',
  },
  {
    n: 3, fase: 'Prima sessione — composizione',
    cosaFare: 'Composizione corporea e misure di base.',
    strumento: 'App ESSĒRE — Composizione corporea.',
    alternativa: 'In assenza di strumentazione, si registrano le circonferenze: meno preciso, '
      + 'ma confrontabile nel tempo, che è ciò che serve.',
    siPassaOltreQuando: 'Una stima registrata, con la data.',
  },
  {
    n: 4, fase: 'Fra le due sessioni — lettura',
    cosaFare: 'Si apre il Quadro (Human Interface) e si leggono le misure INSIEME. '
      + 'Si guardano le priorità proposte dal software e si decide se confermarle.',
    strumento: 'App ESSĒRE — Quadro, Protocollo di lavoro.',
    alternativa: 'Se le misure sono poche o contraddittorie, non si forza una conclusione: '
      + 'si ripete il test più debole prima di scrivere il protocollo.',
    siPassaOltreQuando: 'Le priorità sono confermate o corrette a mano, con il motivo scritto.',
  },
  {
    n: 5, fase: 'Fra le due sessioni — perimetro',
    cosaFare: 'Si verifica se qualcosa richiede il parere di un professionista sanitario. '
      + 'Nel dubbio, si chiede: il dubbio è già la risposta.',
    strumento: 'App ESSĒRE — Protocollo, sezione perimetro.',
    alternativa: 'Se il parere serve e non è ancora disponibile, il percorso parte comunque '
      + 'con la parte non interessata dal dubbio, e il resto attende il parere.',
    siPassaOltreQuando: 'Perimetro dichiarato: nessun parere necessario, oppure parere richiesto '
      + 'e riga della firma predisposta.',
  },
  {
    n: 6, fase: 'Seconda sessione — consegna',
    cosaFare: 'Si consegna il protocollo stampato, si legge insieme, si concordano sedute, '
      + 'conduttori, ritmo settimanale e pagamento. Si firma in due copie.',
    strumento: 'App ESSĒRE — Protocollo di lavoro, stampa.',
    alternativa: 'Se la persona vuole pensarci, il protocollo resta valido: si fissa la data '
      + 'in cui si risente, e non si insiste.',
    siPassaOltreQuando: 'Documento firmato da entrambi, copia consegnata, percorso creato in app.',
  },
  {
    n: 7, fase: 'Durante — verifica',
    cosaFare: 'Alle scadenze si ripetono i test previsti e si confrontano i numeri nuovi '
      + 'con quelli del protocollo. Il confronto si mostra alla persona.',
    strumento: 'App ESSĒRE — Quadro, Gerarchia della progressione.',
    alternativa: 'Se un test non è ripetibile (tempo, condizioni), si ripete quello che pesa '
      + 'di più sulla priorità principale, e si annota il perché.',
    siPassaOltreQuando: 'Le misure nuove sono registrate e la priorità è confermata o cambiata.',
  },
  {
    n: 8, fase: 'Chiusura del ciclo',
    cosaFare: 'Si rifà la valutazione completa e si scrive il protocollo successivo. '
      + 'Il vecchio non si cancella: resta come il punto da cui si è partiti.',
    strumento: 'App ESSĒRE — Protocollo di lavoro, nuovo documento.',
    alternativa: 'Se il ciclo si interrompe prima, si scrive comunque il quadro di uscita: '
      + 'serve a chi torna, e serve a te per sapere che cosa è successo.',
    siPassaOltreQuando: 'Nuovo protocollo firmato, o quadro di uscita registrato.',
  },
];

/** Le domande che il coach si fa davanti al quadro, in ordine. */
export const DOMANDE_GUIDA: string[] = [
  'Che cosa ho misurato davvero, e che cosa sto solo supponendo?',
  'Quale misura, se cambiasse, cambierebbe tutte le altre?',
  'Sto per aggiungere carico a uno schema che compensa?',
  'Se questa persona torna fra sei settimane, che numero mi dirà se ho avuto ragione?',
  'C\'è qualcosa qui che non è mio da decidere?',
];
