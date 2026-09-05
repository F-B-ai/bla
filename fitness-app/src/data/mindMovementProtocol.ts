// ============================================================
// PROTOCOLLO DI VALUTAZIONE NEURO-RECETTORIALE INTEGRATA
// MIND MOVEMENT™ — batteria v1 (proprietà intellettuale founder)
// ------------------------------------------------------------
// La postura come OUTPUT del cervello: i test valutano
// l'integrazione di 4 domini, non la ricerca della "postura
// corretta". La batteria è una BOZZA DA VALIDARE COL FOUNDER:
// i nomi/procedure si raffinano sul campo, la struttura regge.
//
// PERIMETRO (doc 06): valutazione funzionale e di benessere,
// somministrata e interpretata dal professionista. MAI diagnosi.
// ============================================================

export const MM_PROTOCOL_VERSION = 1;

export type MMDomainKey =
  | 'neuro_recettoriale'
  | 'neurovegetativo'
  | 'neuromotorio'
  | 'somato_emozionale';

export interface MMDomain {
  key: MMDomainKey;
  nome: string;
  emoji: string;
  descrizione: string;
}

export const MM_DOMAINS: MMDomain[] = [
  {
    key: 'neuro_recettoriale',
    nome: 'Neuro-recettoriale',
    emoji: '👁',
    descrizione: 'Gli ingressi: occhi, apparato stomatognatico, piedi, vestibolo, propriocezione.',
  },
  {
    key: 'neurovegetativo',
    nome: 'Neurovegetativo',
    emoji: '🫁',
    descrizione: 'La regolazione: respiro, recupero, capacità di adattamento del sistema autonomo.',
  },
  {
    key: 'neuromotorio',
    nome: 'Neuromotorio',
    emoji: '🏃',
    descrizione: "L'output: controllo del movimento, equilibrio, coordinazione, strategie compensatorie.",
  },
  {
    key: 'somato_emozionale',
    nome: 'Somato-emozionale',
    emoji: '💭',
    descrizione: "L'influenza degli stati emotivi sull'organizzazione tonico-posturale e sul movimento.",
  },
];

/** Tipo di input che il test richiede al coach. */
export type MMInputType =
  | 'score5' // 1 = molto compromesso · 5 = ottimale
  | 'seconds' // durata misurata
  | 'choice' // scelta tra opzioni qualitative
  | 'leftright'; // esito per lato: normale / alterato sx / alterato dx / bilaterale

export interface MMTest {
  id: string;
  dominio: MMDomainKey;
  nome: string;
  procedura: string;
  osservare: string;
  input: MMInputType;
  /** per input 'choice': opzioni in ordine dal migliore al peggiore */
  opzioni?: string[];
  /** per input 'seconds': soglia sotto la quale segnalare */
  sogliaSecondi?: number;
}

export const MM_TESTS: MMTest[] = [
  // ---------- DOMINIO NEURO-RECETTORIALE ----------
  {
    id: 'convergenza_oculare',
    dominio: 'neuro_recettoriale',
    nome: 'Convergenza oculare',
    procedura: 'Penna a 40cm dal naso, avvicinala lentamente sulla linea mediana chiedendo di seguirla con lo sguardo. Osserva fino a che distanza i due occhi convergono insieme.',
    osservare: 'Un occhio che "molla" prima dei 8-10cm, affaticamento, diplopia riferita.',
    input: 'choice',
    opzioni: ['Convergenza completa e simmetrica', 'Affaticamento oltre i 10cm', 'Un occhio devia prima dei 10cm'],
  },
  {
    id: 'inseguimento_oculare',
    dominio: 'neuro_recettoriale',
    nome: 'Inseguimento oculare lento',
    procedura: 'Fai seguire con lo sguardo (capo fermo) la penna che disegna una H lenta nello spazio.',
    osservare: 'Scatti, perdite del bersaglio, movimenti del capo che "aiutano", fastidio.',
    input: 'score5',
  },
  {
    id: 'appoggio_podalico',
    dominio: 'neuro_recettoriale',
    nome: 'Appoggio podalico',
    procedura: 'In piedi a occhi aperti, osserva la distribuzione del carico: avampiede/retropiede, bordo interno/esterno, simmetria tra i due piedi. Chiedi dove sente il peso.',
    osservare: 'Carichi molto asimmetrici, dita in grip, arco crollato o rigido.',
    input: 'choice',
    opzioni: ['Appoggio simmetrico e distribuito', 'Asimmetria lieve', 'Asimmetria marcata o appoggio disfunzionale'],
  },
  {
    id: 'stomatognatico',
    dominio: 'neuro_recettoriale',
    nome: 'Apparato stomatognatico',
    procedura: 'Apertura/chiusura bocca lenta: osserva deviazioni della mandibola, click riferiti, serramento abituale (chiedi di digrignamento notturno).',
    osservare: 'Deviazioni a C o S, click, tensione massetere alla palpazione, bruxismo riferito.',
    input: 'choice',
    opzioni: ['Apertura fluida e centrata', 'Deviazione o click lieve', 'Deviazione marcata / serramento importante riferito'],
  },
  {
    id: 'romberg',
    dominio: 'neuro_recettoriale',
    nome: 'Stabilità a occhi chiusi (Romberg)',
    procedura: 'In piedi, piedi uniti, braccia lungo i fianchi: 30 secondi a occhi aperti, poi 30 a occhi chiusi. Resta vicino per sicurezza.',
    osservare: 'Oscillazioni che aumentano molto a occhi chiusi, correzioni continue, direzione prevalente di caduta.',
    input: 'choice',
    opzioni: ['Stabile anche a occhi chiusi', 'Oscillazioni aumentate ma gestite', 'Instabilità marcata a occhi chiusi'],
  },
  // ---------- DOMINIO NEUROVEGETATIVO ----------
  {
    id: 'pattern_respiratorio',
    dominio: 'neurovegetativo',
    nome: 'Pattern respiratorio a riposo',
    procedura: 'Persona supina, una tua mano sul torace e una sull\'addome (o le sue). Osserva 5-6 respiri spontanei senza istruzioni.',
    osservare: 'Respiro alto/toracico, addome bloccato, frequenza elevata a riposo, apnee inconsapevoli.',
    input: 'choice',
    opzioni: ['Diaframmatico fluido', 'Misto con prevalenza toracica', 'Toracico alto / bloccato'],
  },
  {
    id: 'espirazione_controllata',
    dominio: 'neurovegetativo',
    nome: 'Espirazione controllata massima',
    procedura: 'Dopo un inspiro normale, espirazione più lunga e regolare possibile da seduto. Cronometra i secondi.',
    osservare: 'Sotto i 15-20 secondi o espiro "a scatti": scarsa capacità di rilascio.',
    input: 'seconds',
    sogliaSecondi: 15,
  },
  {
    id: 'recupero_percepito',
    dominio: 'neurovegetativo',
    nome: 'Qualità del recupero (colloquio + twin)',
    procedura: 'Colloquio guidato: come dorme, come si sveglia, quanta energia nel pomeriggio. INCROCIA con i trend del check-in ESSĒRE (sonno ed energia degli ultimi 30 giorni, che l\'app ti mostra).',
    osservare: 'Racconto e dati che divergono; sonno riferito buono ma trend basso (o viceversa).',
    input: 'score5',
  },
  {
    id: 'reattivita_stress',
    dominio: 'neurovegetativo',
    nome: 'Adattamento allo sforzo',
    procedura: '20 squat a corpo libero a ritmo comodo, poi osserva il respiro nei 60 secondi successivi: quanto ci mette a tornare tranquillo e parlabile.',
    osservare: 'Fiato che resta corto oltre il minuto, respiro alto persistente, agitazione.',
    input: 'choice',
    opzioni: ['Ritorno rapido e completo', 'Ritorno lento ma regolare', 'Recupero faticoso / respiro disorganizzato'],
  },
  // ---------- DOMINIO NEUROMOTORIO ----------
  {
    id: 'monopodalico_chiusi',
    dominio: 'neuromotorio',
    nome: 'Equilibrio monopodalico occhi chiusi',
    procedura: 'In appoggio su una gamba, occhi chiusi, mani sui fianchi: cronometra fino alla perdita (max 30s). Entrambi i lati; registra il PEGGIORE.',
    osservare: 'Sotto i 10 secondi o forte differenza tra i lati.',
    input: 'seconds',
    sogliaSecondi: 10,
  },
  {
    id: 'fukuda',
    dominio: 'neuromotorio',
    nome: 'Marcia sul posto a occhi chiusi (Fukuda)',
    procedura: '50 passi sul posto a occhi chiusi, ginocchia alte, braccia avanti. Osserva rotazione e avanzamento rispetto alla posizione iniziale.',
    osservare: 'Rotazione oltre ~30-45° o avanzamento marcato: annotare il lato.',
    input: 'leftright',
  },
  {
    id: 'squat_overhead',
    dominio: 'neuromotorio',
    nome: 'Squat con braccia in alto (+ dati app)',
    procedura: '5 squat lenti con braccia tese sopra la testa, osserva da davanti e di lato. INCROCIA con l\'Analisi dello Squat AI se disponibile (valgismo, profondità, tronco).',
    osservare: 'Braccia che cadono avanti, talloni che si staccano, ginocchia in dentro, asimmetrie.',
    input: 'score5',
  },
  {
    id: 'coordinazione_crociata',
    dominio: 'neuromotorio',
    nome: 'Coordinazione crociata',
    procedura: 'In piedi: tocca il ginocchio sinistro con la mano destra e alterna, a ritmo crescente per 30 secondi. Poi a occhi chiusi.',
    osservare: 'Perdita di ritmo, confusione dei lati, blocco a occhi chiusi.',
    input: 'score5',
  },
  {
    id: 'cammino_osservato',
    dominio: 'neuromotorio',
    nome: 'Cammino osservato (+ Analisi AI)',
    procedura: 'Fai camminare avanti e indietro 3 volte. INCROCIA con l\'Analisi del Cammino AI (cadenza, simmetria, braccia, bacino) se disponibile.',
    osservare: 'Braccio che non oscilla, passo asimmetrico, testa avanti, rumore d\'appoggio diverso tra i lati.',
    input: 'score5',
  },
  // ---------- DOMINIO SOMATO-EMOZIONALE ----------
  {
    id: 'mappa_tensioni',
    dominio: 'somato_emozionale',
    nome: 'Mappa delle tensioni',
    procedura: 'Chiedi: "dove senti di accumulare la tensione quando sei sotto pressione?" e osserva/palpa le zone riferite (mascella, collo-spalle, diaframma, lombare).',
    osservare: 'Coerenza tra riferito e palpato; zone "mute" (tensione visibile ma non percepita).',
    input: 'choice',
    opzioni: ['Consapevolezza buona, tensioni gestibili', 'Tensioni localizzate ricorrenti', 'Tensioni diffuse o non percepite'],
  },
  {
    id: 'respiro_sotto_stress',
    dominio: 'somato_emozionale',
    nome: 'Respiro sotto richiesta',
    procedura: 'Durante un compito che richiede attenzione (es. equilibrio monopodalico), osserva se il respiro si blocca o va in apnea.',
    osservare: 'Apnea da concentrazione: il segno somatico più comune dello stress da prestazione.',
    input: 'choice',
    opzioni: ['Respiro libero anche sotto compito', 'Respiro trattenuto a tratti', 'Apnea sistematica sotto compito'],
  },
  {
    id: 'legame_umore_movimento',
    dominio: 'somato_emozionale',
    nome: 'Legame umore-movimento (dal twin)',
    procedura: 'Leggi con la persona il suo Ritratto ESSĒRE e il trend umore-presenze: si riconosce? Il movimento la ricarica o la spegne quando è stanca?',
    osservare: 'Distanza tra percezione e dati; il racconto che emerge dal confronto.',
    input: 'score5',
  },
];

/** Etichette per l'input leftright. */
export const LEFTRIGHT_OPTIONS = [
  'Nella norma',
  'Alterato — lato sinistro',
  'Alterato — lato destro',
  'Alterato — bilaterale',
] as const;
