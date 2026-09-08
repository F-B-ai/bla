// ============================================================
// L'INVITO ALLIEVO — che cosa esce, e quanto spesso si può chiedere
// ------------------------------------------------------------
// Nasce da un buco vero, trovato l'8 settembre 2026: la regola
// Firestore sulla collezione degli inviti diceva
//
//     allow read: if true;
//
// Chiunque, senza autenticarsi, poteva scaricare l'elenco completo
// degli invitati — nome, cognome, email — e i codici con cui ci si
// registra. Verificato in produzione: HTTP 200 senza credenziali.
//
// La regola non si poteva chiudere e basta: il codice va validato
// PRIMA che la persona esista come utente, quindi la lettura serviva
// davvero. La risposta è spostare la validazione dietro una Cloud
// Function che risponde solo su un codice per volta, e mai in blocco.
//
// Qui vive la parte che si può provare senza rete: che cosa la
// funzione restituisce, e quando si rifiuta di rispondere.
// ============================================================

export const INVITO_VERSION = 1;

/** Tentativi falliti tollerati da uno stesso chiamante, per finestra. */
export const TENTATIVI_MAX = 8;

/** Ampiezza della finestra, in minuti. */
export const FINESTRA_MINUTI = 15;

/** L'alfabeto dei codici: niente I, O, 0, 1 — si confondono a voce. */
export const ALFABETO_CODICE = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const LUNGHEZZA_CODICE = 6;

// ------------------------------------------------------------
// 1. IL CODICE, COME LO SCRIVE UNA PERSONA
// ------------------------------------------------------------

/**
 * Normalizza il codice come arriva davvero: minuscolo, con spazi,
 * con un trattino in mezzo perché qualcuno lo detta a voce.
 * Restituisce null se non può essere un codice — così non si va
 * nemmeno a interrogare il database.
 */
export const normalizzaCodice = (input?: string | null): string | null => {
  const pulito = (input || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (pulito.length !== LUNGHEZZA_CODICE) return null;
  for (const c of pulito) {
    if (!ALFABETO_CODICE.includes(c)) return null;
  }
  return pulito;
};

// ------------------------------------------------------------
// 2. CHE COSA ESCE DA UN INVITO VALIDO
// ------------------------------------------------------------

/** L'invito come sta scritto nel database. Ha campi che non escono. */
export interface InvitoArchiviato {
  id: string;
  inviteCode: string;
  email: string;
  name: string;
  surname: string;
  assignedCollaboratorId?: string;
  assignedCollaboratorName?: string;
  createdBy?: string;
  createdByName?: string;
  isUsed?: boolean;
}

/** Quello che il telefono di chi si registra può vedere. */
export interface InvitoPubblico {
  id: string;
  email: string;
  nome: string;
  cognome: string;
  collaboratoreId: string;
  /** il coach assegnato: l'invitato lo vede, ed è giusto — è il suo */
  collaboratoreNome: string;
}

/**
 * Riduce l'invito a ciò che serve per completare la registrazione.
 *
 * Il confine passa qui: esce ciò che riguarda la persona invitata —
 * il suo nome, la sua email, il coach che le è stato assegnato, che
 * serve anche a confermarle che quel codice è davvero suo.
 *
 * Non esce ciò che riguarda l'interno dello studio: chi ha creato
 * l'invito, quando, e il codice stesso.
 */
export const invitoPubblico = (invito: InvitoArchiviato): InvitoPubblico => ({
  id: invito.id,
  email: invito.email,
  nome: invito.name,
  cognome: invito.surname,
  collaboratoreId: invito.assignedCollaboratorId || '',
  collaboratoreNome: invito.assignedCollaboratorName || '',
});

// ------------------------------------------------------------
// 3. QUANDO NON SI RISPONDE PIÙ
// ------------------------------------------------------------
//
// Un codice è di sei caratteri su trentadue simboli: circa un
// miliardo di combinazioni. Provarle a raffica non è realistico, ma
// senza freno chiunque può tentare all'infinito e senza lasciare
// traccia. Il freno serve a rendere il tentativo visibile e lento,
// non a renderlo impossibile.

export interface StatoTentativi {
  /** quanti tentativi falliti risultano per questo chiamante */
  falliti: number;
  /** quando è cominciata la finestra corrente, in millisecondi */
  inizioFinestra: number;
}

export interface EsitoFreno {
  /** se si può procedere a interrogare il database */
  consentito: boolean;
  /** lo stato da riscrivere: la finestra può essere ricominciata */
  nuovoStato: StatoTentativi;
  /** fra quanti secondi si potrà riprovare, se bloccato */
  riprovaFra: number;
}

/**
 * Decide se un tentativo può passare.
 *
 * La finestra è scorrevole a blocchi: scaduta, riparte da zero. Un
 * tentativo riuscito azzera il conto — chi ha davvero l'invito non
 * deve mai incontrare il freno.
 */
export const valutaFreno = (
  stato: StatoTentativi | null,
  adesso: number
): EsitoFreno => {
  const finestraMs = FINESTRA_MINUTI * 60 * 1000;
  const scaduta = !stato || adesso - stato.inizioFinestra >= finestraMs;

  if (scaduta) {
    return {
      consentito: true,
      nuovoStato: {falliti: 0, inizioFinestra: adesso},
      riprovaFra: 0,
    };
  }

  if (stato!.falliti >= TENTATIVI_MAX) {
    const restano = finestraMs - (adesso - stato!.inizioFinestra);
    return {
      consentito: false,
      nuovoStato: stato!,
      riprovaFra: Math.ceil(restano / 1000),
    };
  }

  return {consentito: true, nuovoStato: stato!, riprovaFra: 0};
};

/** Il conto dopo un tentativo andato a vuoto. */
export const dopoFallimento = (stato: StatoTentativi): StatoTentativi => ({
  falliti: stato.falliti + 1,
  inizioFinestra: stato.inizioFinestra,
});

/** Il conto dopo un tentativo riuscito: si azzera. */
export const dopoSuccesso = (adesso: number): StatoTentativi => ({
  falliti: 0,
  inizioFinestra: adesso,
});

// ------------------------------------------------------------
// 4. IL MESSAGGIO A CHI STA DAVANTI ALLO SCHERMO
// ------------------------------------------------------------
//
// Regola: un codice sbagliato e un codice già usato danno la STESSA
// risposta. Distinguerli direbbe a un estraneo «questo codice esiste,
// continua a provare da qui» — che è esattamente l'informazione da
// non regalare.

export type EsitoValidazione = 'valido' | 'non_valido' | 'troppi_tentativi';

export const messaggioValidazione = (esito: EsitoValidazione, riprovaFra = 0): string => {
  switch (esito) {
    case 'valido':
      return 'Invito riconosciuto.';
    case 'troppi_tentativi': {
      const minuti = Math.max(1, Math.ceil(riprovaFra / 60));
      return `Troppi tentativi. Riprova fra ${minuti} ${minuti === 1 ? 'minuto' : 'minuti'}, `
        + 'oppure chiedi un invito nuovo al tuo coach.';
    }
    default:
      return 'Codice non valido o già utilizzato. Controlla con il tuo coach.';
  }
};
