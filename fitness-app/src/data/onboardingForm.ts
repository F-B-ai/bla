// ============================================================
// SCHEDA ONBOARDING — nuovo allievo
// A.S.D. Evolution Sport · Mind Movement Lab
// Fedele al documento del Direttore Tecnico.
// ------------------------------------------------------------
// È il PRIMO atto del percorso: da qui nasce il gemello di una
// persona. Contiene dati di salute (infortuni, terapie): si
// tratta come categoria particolare — resta nell'istanza della
// palestra, visibile allo staff e all'interessato, mai altrove.
// ============================================================

export const ONBOARDING_VERSION = 1;

export type CampoTipo =
  | 'testo'        // riga singola
  | 'lungo'        // testo libero su più righe
  | 'numero'
  | 'scelta'       // una sola opzione
  | 'multi'        // più opzioni insieme
  | 'scala10';     // 1-10

export interface Campo {
  id: string;
  etichetta: string;
  tipo: CampoTipo;
  opzioni?: string[];
  unita?: string;
  /** testo sotto il campo, per guidare chi compila */
  aiuto?: string;
  /** una risposta qui può nascondere un limite: la si porta in evidenza */
  sensibile?: boolean;
}

export interface Sezione {
  id: string;
  numero: number;
  titolo: string;
  intro?: string;
  campi: Campo[];
}

export const INTRO_SCHEDA =
  'Questo documento è il primo passo del tuo percorso Mind Movement. ' +
  'Compilalo con cura e onestà: ogni informazione ci permette di costruire ' +
  'un programma realmente su misura per te — non un piano generico, ma una ' +
  'strategia calibrata sul tuo corpo, la tua mente e i tuoi obiettivi.';

export const SEZIONI: Sezione[] = [
  {
    id: 'anagrafica', numero: 1, titolo: 'Dati anagrafici',
    campi: [
      { id: 'nome', etichetta: 'Nome', tipo: 'testo' },
      { id: 'cognome', etichetta: 'Cognome', tipo: 'testo' },
      { id: 'nascita', etichetta: 'Data di nascita', tipo: 'testo', aiuto: 'gg/mm/aaaa' },
      { id: 'telefono', etichetta: 'Telefono', tipo: 'testo' },
      { id: 'email', etichetta: 'Email', tipo: 'testo' },
      { id: 'comune', etichetta: 'Comune di residenza', tipo: 'testo' },
      { id: 'professione', etichetta: 'Professione', tipo: 'testo' },
      { id: 'provenienza', etichetta: 'Come ci hai conosciuto?', tipo: 'testo' },
    ],
  },
  {
    id: 'obiettivi', numero: 2, titolo: 'Obiettivi — cosa vuoi ottenere?',
    intro: 'Seleziona tutti gli obiettivi che ti appartengono.',
    campi: [
      { id: 'obiettivi', etichetta: 'Obiettivi', tipo: 'multi', opzioni: [
        'Perdita di peso / ricomposizione', 'Aumento massa muscolare',
        'Migliorare la postura', 'Ridurre il dolore cronico',
        'Aumentare energia e vitalità', 'Gestire lo stress',
        'Migliorare la flessibilità', 'Kickboxing / arti marziali',
        'Performance sportiva', 'Percorso di coscienza e crescita',
        'Riabilitazione / post-infortunio', 'Altro',
      ] },
      { id: 'obiettivo_principale', etichetta: 'Il tuo obiettivo principale, in una frase', tipo: 'lungo' },
      { id: 'orizzonte', etichetta: 'Entro quando vorresti un risultato tangibile?', tipo: 'scelta',
        opzioni: ['1 mese', '3 mesi', '6 mesi', '12 mesi', 'Non ho fretta — lavoro sul lungo termine'] },
    ],
  },
  {
    id: 'storia', numero: 3, titolo: 'Storia fisica e sportiva',
    campi: [
      { id: 'altezza', etichetta: 'Altezza', tipo: 'numero', unita: 'cm' },
      { id: 'peso', etichetta: 'Peso', tipo: 'numero', unita: 'kg' },
      { id: 'anni_attivita', etichetta: 'Anni di attività fisica', tipo: 'numero' },
      { id: 'frequenza', etichetta: 'Frequenza attuale', tipo: 'numero', unita: 'gg/sett.' },
      { id: 'sport', etichetta: 'Sport praticati, passati o attuali (e livello)', tipo: 'lungo' },
      { id: 'infortuni', etichetta: 'Infortuni, interventi o patologie rilevanti', tipo: 'multi',
        sensibile: true,
        opzioni: ['No — nessuno', 'Sì — schiena/colonna', 'Sì — ginocchio', 'Sì — spalla', 'Sì — altro'] },
      { id: 'infortuni_note', etichetta: 'Se sì, descrivi brevemente', tipo: 'lungo', sensibile: true },
      { id: 'terapie', etichetta: 'Terapie in corso, farmaci o indicazioni mediche', tipo: 'scelta',
        sensibile: true, opzioni: ['No', 'Sì — specifica sotto'] },
      { id: 'terapie_note', etichetta: 'Specifica', tipo: 'lungo', sensibile: true },
    ],
  },
  {
    id: 'stile', numero: 4, titolo: 'Stile di vita — il corpo è un sistema',
    campi: [
      { id: 'sonno_qualita', etichetta: 'Qualità del sonno', tipo: 'scelta', opzioni: [
        'Pessima — mi sveglio stanco', 'Sufficiente — ma non mi riposo',
        'Buona — dormo bene', 'Ottima — dormire è il mio superpotere',
      ] },
      { id: 'sonno_ore', etichetta: 'Ore di sonno medie per notte', tipo: 'scelta',
        opzioni: ['Meno di 5h', '5–6h', '6–7h', '7–8h', 'Più di 8h'] },
      { id: 'stress', etichetta: 'Livello di stress quotidiano', tipo: 'scala10',
        aiuto: '1 = sono in pace · 10 = sono al limite' },
      { id: 'giornata', etichetta: 'La tua giornata tipo (lavoro, ritmi, orari)', tipo: 'lungo' },
    ],
  },
  {
    id: 'nutrizione', numero: 5, titolo: 'Abitudini nutrizionali',
    campi: [
      { id: 'alimentazione', etichetta: 'Come descriveresti la tua alimentazione attuale?', tipo: 'scelta',
        opzioni: ['Molto disorganizzata', 'Vado per istinto', 'Abbastanza equilibrata', 'Seguo un piano preciso'] },
      { id: 'intolleranze', etichetta: 'Intolleranze, allergie o esclusioni', tipo: 'multi',
        sensibile: true, opzioni: ['No', 'Lattosio', 'Glutine', 'Vegano/Vegetariano', 'Altro'] },
      { id: 'nutrizione_interesse', etichetta: 'Ti interessa un percorso nutrizionale integrato?', tipo: 'scelta',
        opzioni: ['Sì — assolutamente', 'Forse — dimmi di più', 'No — per ora mi concentro sull\'allenamento'] },
    ],
  },
  {
    id: 'mente', numero: 6, titolo: 'Mente e coscienza — la dimensione profonda',
    intro: 'Il Metodo Mind Movement non lavora solo sul corpo. Questa sezione ci aiuta a capire dove sei nel tuo percorso interiore.',
    campi: [
      { id: 'pratiche', etichetta: 'Esperienze di meditazione, mindfulness o pratiche di coscienza', tipo: 'scelta',
        opzioni: ['No — sono nuovo a tutto questo', 'Ho provato qualche volta',
                  'Pratico regolarmente', 'È parte centrale della mia vita'] },
      { id: 'rapporto_corpo', etichetta: 'Come senti il rapporto con il tuo corpo?', tipo: 'scelta',
        opzioni: ['Distante — non lo ascolto', 'Conflittuale — spesso mi tradisce',
                  'Neutro — strumento da usare', 'Connesso — collaboriamo bene',
                  'Profondamente integrato'] },
      { id: 'blocchi', etichetta: 'C\'è qualcosa — emotivamente, mentalmente — che senti blocchi i tuoi progressi?', tipo: 'lungo' },
      { id: 'perche_noi', etichetta: 'Perché hai scelto Mind Movement Lab e non un altro studio?', tipo: 'lungo' },
    ],
  },
  {
    id: 'logistica', numero: 7, titolo: 'Logistica e preferenze',
    campi: [
      { id: 'sessioni', etichetta: 'Sessioni a settimana', tipo: 'scelta',
        opzioni: ['1 volta', '2 volte', '3 volte', '4+ volte', 'Da definire con il coach'] },
      { id: 'fascia', etichetta: 'Fascia oraria preferita', tipo: 'scelta',
        opzioni: ['Mattina presto (7–9)', 'Mattina (9–12)', 'Pranzo (12–14)',
                  'Pomeriggio (14–17)', 'Sera (17–20)', 'Sera tardi (20+)'] },
      { id: 'comunicazione', etichetta: 'Come preferisci che il coach comunichi con te?', tipo: 'scelta',
        opzioni: ['Diretto e tecnico', 'Motivazionale e intenso', 'Empatico e graduale',
                  'Lascia che io guidi — intervieni se necessario'] },
    ],
  },
];

// ------------------------------------------------------------
// Checklist operativa (sezione 8) — a cura del coach
// ------------------------------------------------------------

export interface PassoOperativo {
  id: string;
  step: number;
  gruppo: string;
  voce: string;
}

export const CHECKLIST: PassoOperativo[] = [
  { id: 'c1', step: 1, gruppo: 'Colloquio conoscitivo', voce: 'Colloquio completato' },
  { id: 'c2', step: 1, gruppo: 'Colloquio conoscitivo', voce: 'Scheda compilata e raccolta' },
  { id: 'c3', step: 1, gruppo: 'Colloquio conoscitivo', voce: 'Obiettivi chiariti verbalmente' },
  { id: 'c4', step: 1, gruppo: 'Colloquio conoscitivo', voce: 'Eventuali controindicazioni verificate' },
  { id: 'c5', step: 2, gruppo: 'Setup ESSĒRE', voce: 'Profilo allievo creato sull\'app' },
  { id: 'c6', step: 2, gruppo: 'Setup ESSĒRE', voce: 'Accesso inviato all\'allievo' },
  { id: 'c7', step: 2, gruppo: 'Setup ESSĒRE', voce: 'Scheda iniziale caricata' },
  { id: 'c8', step: 3, gruppo: 'Contratto e documenti', voce: 'Contratto di iscrizione firmato' },
  { id: 'c9', step: 3, gruppo: 'Contratto e documenti', voce: 'Consenso dati GDPR acquisito' },
  { id: 'c10', step: 3, gruppo: 'Contratto e documenti', voce: 'Pagamento prima quota registrato' },
  { id: 'c11', step: 4, gruppo: 'Prima sessione', voce: 'Valutazione posturale/funzionale eseguita' },
  { id: 'c12', step: 4, gruppo: 'Prima sessione', voce: 'Programma iniziale consegnato' },
  { id: 'c13', step: 4, gruppo: 'Prima sessione', voce: 'Follow-up a 7 giorni calendarizzato' },
];

export const CAMPI_TUTTI: Campo[] = SEZIONI.flatMap((s) => s.campi);
export const CAMPO_BY_ID: Record<string, Campo> =
  CAMPI_TUTTI.reduce((a, c) => { a[c.id] = c; return a; }, {} as Record<string, Campo>);
