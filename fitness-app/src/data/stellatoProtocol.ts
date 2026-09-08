// ============================================================
// SISTEMA STELLATO — Valutazione in due sessioni
// Metodo Mind Movement™ · A.S.D. Evolution Sport
// Specifica: "Valutazione in due sessioni e Sistema Stellato"
// (F. Busanca, documento riservato) — §2, §3, §4, §5, §7.
// ------------------------------------------------------------
// QUESTO FILE È IL CUORE DEL SISTEMA (§7): il catalogo dei test.
// È VERSIONATO: un test modificato NON deve invalidare gli
// storici — si incrementa CATALOG_VERSION e si lascia il vecchio
// record leggibile.
//
// SCELTA METODOLOGICA (§8, strada B): ogni test dichiara il
// proprio LIVELLO DI VALIDAZIONE. I test solidi guidano le
// misure e il follow-up; quelli tradizionali orientano la
// lettura clinica. Dichiararlo è ciò che rende il metodo
// difendibile davanti a un professionista sanitario.
//
// PERIMETRO: screening e orientamento educativo-motorio.
// MAI atto diagnostico (doc 06 + nota metodologica §12).
// ============================================================

export const CATALOG_VERSION = 1;

// ------------------------------------------------------------
// 1. LE CINQUE CATENE (§4)
// ------------------------------------------------------------

export type ChainKey = 'IE' | 'A' | 'F' | 'C' | 'E';

export interface Chain {
  key: ChainKey;
  sigla: string;
  nome: string;
  contenuto: string;
}

export const CHAINS: Chain[] = [
  {
    key: 'IE',
    sigla: 'I-E',
    nome: 'Catena respiratoria e statica posteriore',
    contenuto: 'Diaframma, statica posteriore profonda, organizzazione del respiro.',
  },
  {
    key: 'A',
    sigla: 'A',
    nome: 'Catena di funzione extrarotatoria',
    contenuto: 'Extrarotazione, apertura, estensione (profonda + estensione).',
  },
  {
    key: 'F',
    sigla: 'F',
    nome: 'Catena anteriore superficiale',
    contenuto: 'Chiusura anteriore, flessori, retto addominale, SCM.',
  },
  {
    key: 'C',
    sigla: 'C',
    nome: 'Catena di funzione intrarotatoria',
    contenuto: 'Intrarotazione, chiusura, flessione (profonda + flessione).',
  },
  {
    key: 'E',
    sigla: 'E',
    nome: 'Catena posteriore superficiale',
    contenuto: 'Fascia plantare, tricipite, ischiocrurali, erettori.',
  },
];

// ------------------------------------------------------------
// 2. LE RELAZIONI DELLA STELLA (§4.2)
// Ogni punta è collegata alle due NON adiacenti: è lì che
// viaggia il compenso.
// ------------------------------------------------------------

export interface StarLink {
  a: ChainKey;
  b: ChainKey;
  lettura: string;
  conseguenza: string;
}

export const STAR_LINKS: StarLink[] = [
  {
    a: 'IE', b: 'C',
    lettura: 'Il pattern respiratorio si lega alla catena di flessione e intrarotazione.',
    conseguenza: 'Se I-E è basso, lavorare su C in isolamento produce risultati instabili.',
  },
  {
    a: 'IE', b: 'E',
    lettura: 'Statica posteriore profonda e catena posteriore superficiale.',
    conseguenza: 'Distinguere se la restrizione posteriore è superficiale o profonda cambia il trattamento.',
  },
  {
    a: 'A', b: 'C',
    lettura: "Extrarotazione contro intrarotazione: l'asse rotazionale del sistema.",
    conseguenza: 'Il differenziale A–C definisce il pattern rotatorio dominante del soggetto.',
  },
  {
    a: 'A', b: 'E',
    lettura: 'Estensione e catena posteriore.',
    conseguenza: 'Una A alta con E bassa indica estensione ottenuta per compenso lombare.',
  },
  {
    a: 'F', b: 'E',
    lettura: "Anteriore contro posteriore: l'asse sagittale.",
    conseguenza: "Il differenziale F–E definisce l'orientamento sagittale e la strategia posturale.",
  },
];

// ------------------------------------------------------------
// 3. LIVELLI DI VALIDAZIONE (§8) → peso nel motore (§4.1)
// "I test con validazione bassa entrano con peso 1, quelli con
//  validazione alta con peso 3."
// ------------------------------------------------------------

export type Validazione = 'alta' | 'media_alta' | 'media' | 'bassa_media' | 'bassa';

export const VALIDATION_WEIGHT: Record<Validazione, number> = {
  alta: 3,
  media_alta: 2.5,
  media: 2,
  bassa_media: 1.5,
  bassa: 1,
};

export const VALIDATION_LABEL: Record<Validazione, string> = {
  alta: 'Alta',
  media_alta: 'Media-alta',
  media: 'Media',
  bassa_media: 'Bassa-media',
  bassa: 'Bassa',
};

// ------------------------------------------------------------
// 4. CATALOGO TEST (§2, §3, §7)
// ------------------------------------------------------------

export type Sessione = 1 | 2;

export type TestInput =
  /** valore numerico con ancore di normalizzazione */
  | 'number'
  /** 0-3 (palpazione: 0 = nessun segno, 3 = massimo) */
  | 'scale03'
  /** 0-5 (forza: 5 = piena) */
  | 'scale05'
  /** scelta fra opzioni con punteggio dichiarato */
  | 'category'
  /** test di confronto causativo/adattivo: il quadro cambia? */
  | 'confronto'
  /** presenza/assenza (red flag) */
  | 'flag';

export type Blocco =
  | 'anamnesi' | 'pattern' | 'articolarita' | 'forza'
  | 'podalico' | 'oculare' | 'atm' | 'vestibolare' | 'viscerale';

export interface ChainContribution {
  chain: ChainKey;
  /** peso dichiarato del test su quella catena (1-3, §4.1) */
  peso: 1 | 2 | 3;
}

export interface CategoryOption {
  label: string;
  /** punteggio normalizzato 0-100 (100 = piena disponibilità) */
  score: number;
  /** se true, marca il test come "positivo" per le regole */
  positivo?: boolean;
}

export interface StellatoTest {
  id: string;
  nome: string;
  sessione: Sessione;
  blocco: Blocco;
  cosaMisura: string;
  comeSiEsegue?: string;
  input: TestInput;
  /** unità mostrata accanto al campo (cm, mm, gradi, kg, rip, s) */
  unita?: string;
  /** ancore per 'number': valore che vale 0 e valore che vale 100 */
  peggiore?: number;
  migliore?: number;
  /** opzioni per 'category' */
  opzioni?: CategoryOption[];
  /** il test si esegue per lato → alimenta l'indice di asimmetria */
  bilaterale?: boolean;
  catene: ChainContribution[];
  validazione: Validazione;
  /** misura oggettiva numerica ad alta validazione: guida il follow-up (§2.3) */
  followUp?: boolean;
  /** recettore candidato causativo (§3, §5 L1) */
  recettore?: 'podalico' | 'oculare' | 'occlusale';
  /** genera raccomandazione di consulto specialistico se alterato (§3.2, §3.3) */
  consulto?: string;
  /** §3.4: voce da chiarire col founder — NON entra nello scoring */
  daDefinire?: string;
  note?: string;
}

// --- Red flag (§2.1 · Livello 0 della decisione) ---
export const RED_FLAGS: Array<{ id: string; label: string }> = [
  { id: 'rf_dolore_notturno', label: 'Dolore notturno' },
  { id: 'rf_perdita_peso', label: 'Perdita di peso non spiegata' },
  { id: 'rf_deficit_neuro', label: 'Deficit neurologici' },
  { id: 'rf_sintomi_sistemici', label: 'Sintomi sistemici' },
  { id: 'rf_trauma_recente', label: 'Trauma recente' },
];

export const STELLATO_TESTS: StellatoTest[] = [
  // ======================= SESSIONE 1 =======================
  // --- Respiro e statica (alimenta I-E) ---
  {
    id: 's1_respiro_riposo',
    nome: 'Respiro a riposo',
    sessione: 1, blocco: 'anamnesi',
    cosaMisura: 'Sede, ritmo, apnea, uso dei muscoli accessori.',
    input: 'category',
    opzioni: [
      { label: 'Diaframmatico, ritmico', score: 100 },
      { label: 'Misto', score: 65 },
      { label: 'Alto/toracico', score: 35, positivo: true },
      { label: 'Alto con accessori o apnee', score: 15, positivo: true },
    ],
    catene: [{ chain: 'IE', peso: 3 }, { chain: 'F', peso: 1 }],
    validazione: 'media',
  },
  {
    id: 's1_mobilita_costale',
    nome: 'Mobilità costale',
    sessione: 1, blocco: 'articolarita',
    cosaMisura: 'Espansione e disponibilità della gabbia toracica.',
    input: 'category',
    opzioni: [
      { label: 'Ampia e simmetrica', score: 100 },
      { label: 'Ridotta', score: 55 },
      { label: 'Ridotta e asimmetrica', score: 30 },
    ],
    catene: [{ chain: 'IE', peso: 3 }],
    validazione: 'media',
  },

  // --- Pattern fondamentali (§2.2) ---
  {
    id: 's1_pattern_squat',
    nome: 'Squat profondo',
    sessione: 1, blocco: 'pattern',
    cosaMisura: 'Disponibilità del pattern e compensi.',
    input: 'category',
    opzioni: [
      { label: 'Disponibile e pulito', score: 100 },
      { label: 'Disponibile con compensi', score: 60 },
      { label: 'Limitato', score: 30 },
    ],
    catene: [{ chain: 'E', peso: 1 }, { chain: 'C', peso: 1 }],
    validazione: 'media',
  },
  {
    id: 's1_pattern_hinge',
    nome: 'Hinge (cerniera d\'anca)',
    sessione: 1, blocco: 'pattern',
    cosaMisura: 'Dissociazione anca-lombare.',
    input: 'category',
    opzioni: [
      { label: 'Disponibile e pulito', score: 100 },
      { label: 'Disponibile con compensi', score: 60 },
      { label: 'Limitato', score: 30 },
    ],
    catene: [{ chain: 'E', peso: 2 }, { chain: 'A', peso: 1 }],
    validazione: 'media',
  },
  {
    id: 's1_pattern_estensione',
    nome: 'Pattern di estensione',
    sessione: 1, blocco: 'pattern',
    cosaMisura: 'Disponibilità di apertura ed estensione.',
    input: 'category',
    opzioni: [
      { label: 'Ampia e organizzata', score: 100 },
      { label: 'Presente con compenso lombare', score: 50 },
      { label: 'Ridotta', score: 25 },
    ],
    catene: [{ chain: 'A', peso: 2 }, { chain: 'F', peso: 2 }],
    validazione: 'media',
  },
  {
    id: 's1_pattern_flessione',
    nome: 'Pattern di flessione',
    sessione: 1, blocco: 'pattern',
    cosaMisura: 'Disponibilità di chiusura e flessione.',
    input: 'category',
    opzioni: [
      { label: 'Ampia e organizzata', score: 100 },
      { label: 'Presente con compensi', score: 55 },
      { label: 'Ridotta', score: 25 },
    ],
    catene: [{ chain: 'C', peso: 2 }],
    validazione: 'media',
  },
  {
    id: 's1_pattern_rotazione',
    nome: 'Rotazione',
    sessione: 1, blocco: 'pattern',
    cosaMisura: 'Disponibilità rotazionale e dissociazione dei cingoli.',
    input: 'category',
    opzioni: [
      { label: 'Simmetrica e ampia', score: 100 },
      { label: 'Asimmetrica', score: 55 },
      { label: 'Limitata', score: 30 },
    ],
    catene: [{ chain: 'A', peso: 1 }, { chain: 'C', peso: 1 }],
    validazione: 'media',
  },
  {
    id: 's1_rolling',
    nome: 'Rolling test (0–12)',
    sessione: 1, blocco: 'pattern',
    cosaMisura: 'Integrazione tra cinture e sequenza di sviluppo.',
    input: 'number', unita: 'punti', peggiore: 0, migliore: 12,
    catene: [{ chain: 'A', peso: 2 }, { chain: 'C', peso: 2 }],
    validazione: 'media',
  },

  // --- Linee miofasciali ---
  {
    id: 's1_linea_posteriore',
    nome: 'Test linea posteriore superficiale',
    sessione: 1, blocco: 'articolarita',
    cosaMisura: 'Accorciamento e disponibilità della catena posteriore.',
    input: 'category',
    opzioni: [
      { label: 'Disponibile', score: 100 },
      { label: 'Moderatamente accorciata', score: 55 },
      { label: 'Marcatamente accorciata', score: 25 },
    ],
    catene: [{ chain: 'E', peso: 3 }],
    validazione: 'media',
  },
  {
    id: 's1_linea_anteriore',
    nome: 'Test linea anteriore superficiale',
    sessione: 1, blocco: 'articolarita',
    cosaMisura: 'Chiusura anteriore e disponibilità dei flessori.',
    input: 'category',
    opzioni: [
      { label: 'Disponibile', score: 100 },
      { label: 'Moderatamente accorciata', score: 55 },
      { label: 'Marcatamente accorciata', score: 25 },
    ],
    catene: [{ chain: 'F', peso: 3 }],
    validazione: 'media',
  },
  {
    id: 's1_estensione_anca',
    nome: "Estensione d'anca (Thomas)",
    sessione: 1, blocco: 'articolarita',
    cosaMisura: 'Disponibilità in estensione di psoas e retto femorale.',
    input: 'number', unita: '°', peggiore: -20, migliore: 10,
    bilaterale: true,
    catene: [{ chain: 'F', peso: 3 }, { chain: 'A', peso: 1 }],
    validazione: 'media',
  },

  // --- Caviglia: le due misure ad alta validazione ---
  {
    id: 's1_silfverskiold',
    nome: 'Test di Silfverskiöld',
    sessione: 1, blocco: 'articolarita',
    cosaMisura:
      'Distingue la limitazione del gastrocnemio (dorsiflessione ridotta a ginocchio esteso) da quella del soleo (ridotta anche a ginocchio flesso).',
    input: 'category',
    opzioni: [
      { label: 'Negativo', score: 100 },
      { label: 'Positivo — gastrocnemio', score: 40, positivo: true },
      { label: 'Positivo — soleo (o entrambi)', score: 25, positivo: true },
    ],
    catene: [{ chain: 'E', peso: 3 }, { chain: 'IE', peso: 1 }],
    validazione: 'alta',
  },
  {
    id: 's1_dorsiflessione',
    nome: 'Dorsiflessione al muro (lunge test)',
    sessione: 1, blocco: 'articolarita',
    cosaMisura: 'Escursione di caviglia — misura ripetibile e confrontabile nel tempo.',
    comeSiEsegue: 'Distanza alluce-muro con ginocchio che tocca mantenendo il tallone a terra.',
    input: 'number', unita: 'cm', peggiore: 3, migliore: 12,
    bilaterale: true,
    catene: [{ chain: 'E', peso: 3 }, { chain: 'IE', peso: 1 }],
    validazione: 'alta', followUp: true,
  },

  // --- Forza e attivazione (§2.3) ---
  {
    id: 's1_heel_raise',
    nome: 'Heel raise monopodalico',
    sessione: 1, blocco: 'forza',
    cosaMisura: 'Tibiale posteriore e tricipite surale: numero di sollevamenti completi.',
    input: 'number', unita: 'rip', peggiore: 0, migliore: 25,
    bilaterale: true,
    catene: [{ chain: 'E', peso: 3 }],
    validazione: 'alta', followUp: true,
  },
  {
    id: 's1_tibiale_posteriore',
    nome: 'Forza isometrica del tibiale posteriore',
    sessione: 1, blocco: 'forza',
    cosaMisura: 'Inversione contro resistenza in flessione plantare.',
    input: 'scale05', bilaterale: true,
    catene: [{ chain: 'E', peso: 2 }, { chain: 'IE', peso: 1 }],
    validazione: 'media_alta',
  },
  {
    id: 's1_attivazione_glutea',
    nome: 'Attivazione glutea e core',
    sessione: 1, blocco: 'forza',
    cosaMisura: 'Sequenza di attivazione e dominanza compensatoria.',
    input: 'category',
    opzioni: [
      { label: 'Presente', score: 100 },
      { label: 'Ritardata', score: 55 },
      { label: 'Assente', score: 20 },
    ],
    bilaterale: true,
    catene: [{ chain: 'A', peso: 2 }, { chain: 'IE', peso: 1 }],
    validazione: 'media',
  },
  {
    id: 's1_grip',
    nome: 'Grip strength (opzionale)',
    sessione: 1, blocco: 'forza',
    cosaMisura: 'Indicatore generale di stato neuromuscolare — ottimo per il follow-up.',
    input: 'number', unita: 'kg', peggiore: 10, migliore: 55,
    bilaterale: true,
    catene: [], // non alimenta catene: è una misura di stato
    validazione: 'alta', followUp: true,
  },

  // ======================= SESSIONE 2 =======================
  // --- Recettore podalico (§3.1) ---
  {
    id: 's2_retropiede',
    nome: 'Morfologia del retropiede',
    sessione: 2, blocco: 'podalico',
    cosaMisura: 'Normo / valgo / varo, in carico e scarico.',
    input: 'category',
    opzioni: [
      { label: 'Normo', score: 100 },
      { label: 'Valgo lieve', score: 65 },
      { label: 'Valgo marcato', score: 35 },
      { label: 'Varo', score: 50 },
    ],
    bilaterale: true,
    catene: [{ chain: 'C', peso: 2 }, { chain: 'A', peso: 1 }],
    validazione: 'media',
  },
  {
    id: 's2_monopodalico',
    nome: 'Test monopodalico',
    sessione: 2, blocco: 'podalico',
    cosaMisura: "Stabilità, strategia di compenso, comportamento dell'arco sotto carico monolaterale.",
    input: 'number', unita: 's', peggiore: 0, migliore: 30,
    bilaterale: true,
    catene: [{ chain: 'A', peso: 2 }, { chain: 'E', peso: 1 }],
    validazione: 'media',
  },
  {
    id: 's2_confronto_podalico',
    nome: 'Confronto causativo/adattivo — piede',
    sessione: 2, blocco: 'podalico',
    cosaMisura:
      'Si riosserva un test di riferimento modificando l\'appoggio. Cambia il quadro? Piede causativo. Non cambia? Piede adattivo.',
    input: 'confronto',
    catene: [],
    validazione: 'bassa_media',
    recettore: 'podalico',
    note: 'È il cuore del ragionamento posturologico, ma la ripetibilità è discussa.',
  },
  {
    id: 's2_appoggio_dinamico',
    nome: 'Appoggio dinamico e propulsione',
    sessione: 2, blocco: 'podalico',
    cosaMisura: 'Comportamento durante il ciclo del passo.',
    input: 'category',
    opzioni: [
      { label: 'Fisiologico', score: 100 },
      { label: 'Alterato lieve', score: 60 },
      { label: 'Alterato marcato', score: 30 },
    ],
    catene: [{ chain: 'E', peso: 2 }],
    validazione: 'media',
    note: 'Integrabile con l\'analisi del cammino già presente in ESSĒRE.',
  },

  // --- Recettore oculare (§3.2) — screening, non correzione ---
  {
    id: 's2_ppc',
    nome: 'Punto prossimo di convergenza (PPC)',
    sessione: 2, blocco: 'oculare',
    cosaMisura: 'Distanza alla quale si perde la fusione binoculare.',
    input: 'number', unita: 'cm', peggiore: 20, migliore: 5,
    catene: [],
    validazione: 'alta', followUp: true,
    recettore: 'oculare',
    consulto: 'Valore alterato (indicativamente oltre ~10 cm): consulto optometrico/oculistico.',
  },
  {
    id: 's2_cover_test',
    nome: 'Cover test',
    sessione: 2, blocco: 'oculare',
    cosaMisura: 'Presenza di forie o tropie.',
    input: 'category',
    opzioni: [
      { label: 'Negativo', score: 100 },
      { label: 'Foria', score: 50, positivo: true },
      { label: 'Tropia', score: 20, positivo: true },
    ],
    catene: [],
    validazione: 'alta',
    recettore: 'oculare',
    consulto: 'Forie e tropie sono di competenza optometrica/oculistica: si esegue screening e si invia.',
    note: 'Test optometrico: l\'operatore Mind Movement esegue screening e invia, non prescrive né corregge.',
  },
  {
    id: 's2_occlusione_monoculare',
    nome: 'Occlusione monoculare',
    sessione: 2, blocco: 'oculare',
    cosaMisura: 'Modifica del quadro posturale con un occhio coperto.',
    input: 'confronto',
    catene: [],
    validazione: 'bassa_media',
    recettore: 'oculare',
  },

  // --- ATM e sistema stomatognatico (§3.3) ---
  {
    id: 's2_palpazione_masticatori',
    nome: 'Palpazione masticatori (temporali, masseteri, pterigoidei)',
    sessione: 2, blocco: 'atm',
    cosaMisura: 'Ipertono, dolorabilità, asimmetria destra/sinistra.',
    input: 'scale03', bilaterale: true,
    catene: [{ chain: 'IE', peso: 1 }, { chain: 'F', peso: 1 }],
    validazione: 'media',
  },
  {
    id: 's2_apertura_bocca',
    nome: 'Apertura della bocca e traiettoria',
    sessione: 2, blocco: 'atm',
    cosaMisura: 'Escursione in mm, deviazione o deflessione del percorso.',
    input: 'number', unita: 'mm', peggiore: 25, migliore: 50,
    catene: [{ chain: 'IE', peso: 2 }],
    validazione: 'alta', followUp: true,
  },
  {
    id: 's2_ioide',
    nome: 'Posizione e mobilità dell\'osso ioide',
    sessione: 2, blocco: 'atm',
    cosaMisura: 'Simmetria e libertà di scorrimento.',
    input: 'category',
    opzioni: [
      { label: 'Simmetrico e libero', score: 100 },
      { label: 'Asimmetrico', score: 55 },
      { label: 'Ridotto scorrimento', score: 35 },
    ],
    catene: [{ chain: 'IE', peso: 1 }],
    validazione: 'bassa',
  },
  {
    id: 's2_classe_dentaria',
    nome: 'Classe dentaria (Angle I, II, III)',
    sessione: 2, blocco: 'atm',
    cosaMisura: 'Rapporto occlusale — osservazione di screening.',
    input: 'category',
    opzioni: [
      { label: 'Classe I', score: 100 },
      { label: 'Classe II', score: 55, positivo: true },
      { label: 'Classe III', score: 55, positivo: true },
    ],
    catene: [],
    validazione: 'alta',
    recettore: 'occlusale',
    consulto: 'Classe II/III: osservazione di screening, di competenza odontoiatrica.',
    note: 'La classe dentaria si osserva e si segnala, non si tratta.',
  },
  {
    id: 's2_confronto_occlusale',
    nome: 'Confronto occlusale (rullo salivare)',
    sessione: 2, blocco: 'atm',
    cosaMisura: 'Se modificando l\'appoggio dentale cambia il quadro posturale.',
    input: 'confronto',
    catene: [],
    validazione: 'bassa_media',
    recettore: 'occlusale',
    note: 'Il collegamento occlusione-postura è ipotesi di lavoro, non legge.',
  },

  // --- Vestibolare e neuromuscolare (§3.4) ---
  {
    id: 's2_fukuda',
    nome: 'Test di Fukuda-Unterberger',
    sessione: 2, blocco: 'vestibolare',
    cosaMisura: 'Marcia sul posto a occhi chiusi: rotazione del soggetto.',
    input: 'number', unita: '° rotazione', peggiore: 60, migliore: 0,
    catene: [],
    validazione: 'media',
    note: 'Bassa specificità se usato da solo.',
  },
  {
    id: 's2_romberg',
    nome: 'Romberg modificato',
    sessione: 2, blocco: 'vestibolare',
    cosaMisura:
      'Stabilità in appoggio ridotto. Il rapporto occhi chiusi / occhi aperti indica il peso del canale visivo.',
    input: 'number', unita: 's (occhi chiusi)', peggiore: 0, migliore: 30,
    catene: [{ chain: 'IE', peso: 1 }, { chain: 'A', peso: 1 }],
    validazione: 'alta', followUp: true,
  },
  {
    id: 's2_rotatori',
    nome: 'Test dei rotatori',
    sessione: 2, blocco: 'vestibolare',
    cosaMisura: 'Simmetria di rotazione attiva e passiva.',
    input: 'number', unita: '°', peggiore: 20, migliore: 60,
    bilaterale: true,
    catene: [{ chain: 'A', peso: 2 }, { chain: 'C', peso: 2 }],
    validazione: 'media',
    daDefinire: 'Cervicali, d\'anca o entrambi? Cambia la catena alimentata (§3.4).',
  },
  {
    id: 's2_pollici_ascendenti',
    nome: 'Test dei pollici ascendenti',
    sessione: 2, blocco: 'vestibolare',
    cosaMisura: 'Mobilità sacro-iliaca in carico, per lato.',
    input: 'category',
    opzioni: [
      { label: 'Simmetrico', score: 100 },
      { label: 'Asimmetrico', score: 45 },
    ],
    catene: [{ chain: 'A', peso: 1 }, { chain: 'C', peso: 1 }],
    validazione: 'bassa',
    note: 'Concordanza tra operatori notoriamente scarsa.',
  },
  {
    id: 's2_de_cyon',
    nome: 'Test di De Cyon',
    sessione: 2, blocco: 'vestibolare',
    cosaMisura: 'Risposta posturale a stimolazione oculo-vestibolare.',
    input: 'confronto',
    catene: [],
    validazione: 'bassa',
    daDefinire: 'Da documentare con la fonte utilizzata (§3.4).',
  },
  {
    id: 's2_nahmani',
    nome: 'Test di Nahmani',
    sessione: 2, blocco: 'vestibolare',
    cosaMisura: '— da definire con il Direttore Tecnico.',
    input: 'confronto',
    catene: [],
    validazione: 'bassa',
    daDefinire: 'Nome non identificato con certezza: da quale scuola o autore proviene? (§3.4)',
  },

  // --- Viscerale (§3.4) ---
  {
    id: 's2_barral',
    nome: 'Test di Barral (ascolto e inibizione viscerale)',
    sessione: 2, blocco: 'viscerale',
    cosaMisura: 'Tensioni viscerali e loro influenza sul quadro.',
    input: 'confronto',
    catene: [],
    validazione: 'bassa',
    note: 'Impianto teorico non validato dalla ricerca.',
  },
];

// ------------------------------------------------------------
// 5. REGOLE DECISIONALI DICHIARATIVE (§5 Livello 3, §7)
// "Regole dichiarative in configurazione, non codificate a mano
//  nel codice: devi poterle modificare tu senza uno sviluppatore."
// ------------------------------------------------------------

export interface RuleCondition {
  /** catena con punteggio sotto la soglia di "basso" */
  chainLow?: ChainKey;
  /** catena con punteggio sopra la soglia di "alto" */
  chainHigh?: ChainKey;
  /** id del test la cui opzione scelta è marcata positivo */
  testPositivo?: string;
  /** opzione esatta scelta (label) per un test */
  testOpzione?: { testId: string; label: string };
  /** |differenziale| fra due catene sopra soglia */
  differenzialeSopra?: { a: ChainKey; b: ChainKey; valore: number };
  /** tutte le catene valutate sopra soglia */
  tutteSopra?: number;
}

export interface PrescriptionRule {
  id: string;
  /** profilo stellato rilevato (colonna sinistra della tabella §5) */
  profilo: string;
  when: RuleCondition;
  /** trattamento prescritto dal sistema (colonna destra) */
  prescrizione: string[];
  /** priorità: più basso = più urgente */
  ordine: number;
}

export const PRESCRIPTION_RULES: PrescriptionRule[] = [
  {
    id: 'r_ie_respiro',
    profilo: 'I-E basso con respiro alto',
    when: { chainLow: 'IE', testPositivo: 's1_respiro_riposo' },
    prescrizione: [
      'Priorità assoluta al respiro (C·12)',
      'Lavoro sul diaframma e sulle coste',
      'Rinvio del carico pesante fino al recupero del pattern respiratorio',
    ],
    ordine: 1,
  },
  {
    id: 'r_e_gastro',
    profilo: 'E basso, Silfverskiöld positivo per gastrocnemio',
    when: {
      chainLow: 'E',
      testOpzione: { testId: 's1_silfverskiold', label: 'Positivo — gastrocnemio' },
    },
    prescrizione: [
      'Rilascio linea posteriore superficiale',
      'Mobilizzazione specifica del gastrocnemio',
      'Heel raise progressivi',
      'ROM prescritto ridotto sui pattern di squat fino a rivalutazione',
    ],
    ordine: 2,
  },
  {
    id: 'r_f_chiusura',
    profilo: 'F basso, E alto (chiusura anteriore)',
    when: { chainLow: 'F', chainHigh: 'E' },
    prescrizione: [
      'Rilascio linea anteriore superficiale',
      "Estensione d'anca",
      'Lavoro sul psoas e sul diaframma',
      'Riduzione del volume di pattern in flessione',
    ],
    ordine: 3,
  },
  {
    id: 'r_ac_rotatorio',
    profilo: 'Differenziale A–C elevato (pattern rotatorio)',
    when: { differenzialeSopra: { a: 'A', b: 'C', valore: 20 } },
    prescrizione: [
      'Lavoro sulla linea spirale',
      'Esercizi antirotatori',
      'Correzione dell\'appoggio se il piede risulta causativo',
    ],
    ordine: 4,
  },
  {
    id: 'r_omogeneo',
    profilo: 'Punteggi omogenei e alti, nessuna red flag',
    when: { tutteSopra: 70 },
    prescrizione: [
      'Nessuna correzione prioritaria',
      'Si passa direttamente al programma di allenamento sull\'obiettivo (moduli C·23 e C·24)',
    ],
    ordine: 9,
  },
];

// ------------------------------------------------------------
// 6. SOGLIE (§9.4 — da tarare sul campo col founder)
// ------------------------------------------------------------

export interface StellatoThresholds {
  /** sotto questo valore una catena è "bassa" */
  chainLow: number;
  /** sopra questo valore una catena è "alta" */
  chainHigh: number;
  /** asimmetria oltre la quale ha precedenza sul valore assoluto (§5 L2) */
  asymmetryRelevant: number;
  /** differenziale oltre il quale il pattern è dichiarato dominante */
  differentialRelevant: number;
  /** numero massimo di priorità nel referto (§6.8) */
  maxPriorita: number;
}

export const DEFAULT_THRESHOLDS: StellatoThresholds = {
  chainLow: 55,
  chainHigh: 70,
  asymmetryRelevant: 15,
  differentialRelevant: 20,
  maxPriorita: 3,
};

// Indici di comodo
export const TEST_BY_ID: Record<string, StellatoTest> = STELLATO_TESTS.reduce(
  (acc, t) => { acc[t.id] = t; return acc; },
  {} as Record<string, StellatoTest>
);

export const testsForSession = (s: Sessione): StellatoTest[] =>
  STELLATO_TESTS.filter((t) => t.sessione === s);
