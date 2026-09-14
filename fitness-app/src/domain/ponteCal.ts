// ============================================================
// LE ISTRUZIONI DEL PONTE — quelle che si inoltrano a chi esegue
// ------------------------------------------------------------
// Il titolare, il 14 settembre 2026: «Cosa devo mandare a Grok bot?»
//
// La risposta giusta non è un testo che gli si detta a voce ogni
// volta: è il pulsante «Copia chiave e istruzioni» che già esiste in
// Richieste WhatsApp. Quel pulsante però conosceva solo metà del
// ponte — la porta che scrive — perché la porta che legge è nata
// dopo. Chi riceve istruzioni a metà usa metà del ponte.
//
// Il testo vive qui, nel dominio, e non nel servizio: è testo puro,
// non tocca Firebase, e così si può provare che dica tutto quello
// che deve dire. Il servizio ci mette solo l'indirizzo dell'App e
// la chiave.
//
// ------------------------------------------------------------
// PERCHÉ L'ORDINE È QUELLO
// ------------------------------------------------------------
// Prima guardare, poi proporre. È l'ordine del lavoro vero: chi
// propone un orario senza aver guardato propone sopra qualcuno.
// ============================================================

export const PONTE_CAL_VERSION = 1;

export const CAL_PERCORSO = '/v1/cal';
export const CAL_LIBERI_PERCORSO = '/v1/cal/liberi';

/** Massimo pacchetti in una sola chiamata (deve restare allineato a cal.ts). */
export const MAX_PACCHETTI = 20;
/** Massimo giorni in una sola lettura. */
export const MAX_GIORNI_LETTURA = 14;

/**
 * Le istruzioni complete, pronte da inoltrare.
 *
 * @param appUrl l'indirizzo dell'App, senza barra finale
 * @param chiave la chiave appena generata: si vede una volta sola
 */
export const istruzioniPonte = (appUrl: string, chiave: string): string => {
  const base = (appUrl || '').replace(/\/+$/, '');
  const scrivi = `${base}${CAL_PERCORSO}`;
  const leggi = `${base}${CAL_LIBERI_PERCORSO}`;

  return [
    'PONTE CAL — ESSĒRE. Due porte: una per GUARDARE, una per PROPORRE.',
    'Nessuna delle due crea appuntamenti. L\'agenda cambia solo quando',
    'il titolare conferma nell\'App.',
    '',
    'La chiave è la stessa per tutte e due:',
    `x-cal-key: ${chiave}`,
    '',
    '──────────────────────────────────────────',
    '1) GUARDARE GLI SPAZI LIBERI (sola lettura)',
    '──────────────────────────────────────────',
    `GET ${leggi}?giorno=AAAA-MM-GG`,
    '',
    'Parametri:',
    `  giorno    uno o più, separati da virgola (massimo ${MAX_GIORNI_LETTURA})`,
    '  durata    minuti, se diversa da 60 (facoltativo)',
    '  eccezioni 1 per guardare anche dopo le 17:30 (facoltativo)',
    '',
    'Esempio:',
    `curl "${leggi}?giorno=2026-09-15,2026-09-16" \\`,
    `  -H "x-cal-key: ${chiave}"`,
    '',
    'LA REGOLA DELLA GIORNATA — vale sempre, anche quando proponi:',
    '  · si comincia alle 09:00;',
    '  · l\'ultimo appuntamento si FISSA alle 17:30 (l\'ora è quella',
    '    d\'inizio: un\'ora di seduta finisce alle 18:30, ed è giusto);',
    '  · oltre le 17:30 è un\'ECCEZIONE, e mai dopo le 19:30. Proponila',
    '    come eccezione, dicendo che va concordata.',
    '',
    'Da qui escono SOLO ore: nessun nome, nessun telefono, nessuna nota.',
    'Non sai chi viene, e non ti serve saperlo.',
    '',
    '──────────────────────────────────────────',
    '2) PROPORRE UN APPUNTAMENTO (entra in coda)',
    '──────────────────────────────────────────',
    `POST ${scrivi}`,
    'Corpo (JSON): { "testo": "<uno o più pacchetti CAL>" }',
    '',
    'Esempio:',
    `curl -X POST ${scrivi} \\`,
    `  -H "x-cal-key: ${chiave}" \\`,
    '  -H "Content-Type: application/json" \\',
    '  -d \'{"testo":"CAL prenota\\npersona: Maria Rossi\\ntelefono: 333 1234567\\ngiorno: 2026-09-15\\nora: 15:00\\ntipo: visita\\nnote: prima volta"}\'',
    '',
    'Campi di «CAL prenota»: persona, giorno, ora sono obbligatori;',
    'telefono, whatsapp, tipo, note sono facoltativi.',
    'Tipo: visita | allenamento | consulenza | altro.',
    'Giorno AAAA-MM-GG, ora HH:MM.',
    `Massimo ${MAX_PACCHETTI} pacchetti per volta.`,
    'Entrano come RICHIESTE IN ATTESA: nessun appuntamento nasce da qui.',
    'Solo «CAL prenota» entra in coda; gli altri comandi si gestiscono',
    'nell\'App.',
    '',
    '──────────────────────────────────────────',
    'COME SI LAVORA',
    '──────────────────────────────────────────',
    '1. La persona chiede un appuntamento.',
    '2. Guardi gli spazi liberi (porta 1) nei giorni che le vanno bene.',
    '3. Le proponi un orario che esiste davvero. Se è dopo le 17:30,',
    '   dille che è un\'eccezione da confermare.',
    '4. Mandi la richiesta (porta 2) e le dici che il titolare conferma.',
    '5. NON dire mai che l\'appuntamento è preso: non lo è finché il',
    '   titolare non tocca Conferma nell\'App.',
    '',
    'Se perdi la chiave, il titolare ne genera un\'altra: la vecchia',
    'muore all\'istante.',
    '',
    `Chi non può fare chiamate HTTP usa la pagina: ${base}/cal.html`,
  ].join('\n');
};
