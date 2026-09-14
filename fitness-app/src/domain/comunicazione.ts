// ============================================================
// LE COMUNICAZIONI — un messaggio a tutti, in una volta sola
// ------------------------------------------------------------
// Il titolare, il 12 settembre 2026:
//
//   «Creami una sezione in cui io posso inviare in broadcast un
//    avviso, un annuncio, un video, una foto, un audio — insomma un
//    messaggio che possa comprendere tutte queste cose, a tutti gli
//    allievi contemporaneamente.»
//
// Fino a oggi l'unico modo di dire una cosa a tutti era scriverla a
// ognuno. Con dieci allievi si fa; con cento non si fa più, e infatti
// non si dice.
//
// Qui vivono le regole di che cos'è una comunicazione valida, che
// cosa si può allegare, e come si racconta a chi la riceve.
// ============================================================

export const COMUNICAZIONE_VERSION = 1;

export type TipoComunicazione = 'avviso' | 'annuncio' | 'urgente';

export type TipoAllegato = 'foto' | 'video' | 'audio' | 'documento';

export interface Allegato {
  tipo: TipoAllegato;
  url: string;
  nome: string;
  /** byte, per dire quanto pesa prima di farlo scaricare */
  peso?: number;
  /** secondi, per audio e video */
  durata?: number;
}

export interface Comunicazione {
  id: string;
  tipo: TipoComunicazione;
  titolo: string;
  testo: string;
  allegato?: Allegato;
  autoreId: string;
  autoreNome: string;
  /** a chi è andata: per ora sempre gli allievi, ma il campo c'è */
  destinatari: 'allievi' | 'staff' | 'tutti';
  /** quante persone l'hanno ricevuta nel momento dell'invio */
  quanti: number;
  /** una prova mandata solo a sé stessi: si riconosce e si butta */
  prova?: boolean;
  createdAt: Date;
}

// ------------------------------------------------------------
// Che cosa si può allegare
// ------------------------------------------------------------
//
// Il limite non è un capriccio: lo spazio è quello di Firebase, e un
// video da cinquanta megabyte moltiplicato per venti comunicazioni
// riempie il piano gratuito da solo. Meglio dirlo prima di caricare
// che dopo.

export const LIMITI: Record<TipoAllegato, number> = {
  foto: 10 * 1024 * 1024,
  audio: 25 * 1024 * 1024,
  video: 50 * 1024 * 1024,
  documento: 20 * 1024 * 1024,
};

export const NOMI_ALLEGATO: Record<TipoAllegato, string> = {
  foto: 'Foto',
  video: 'Video',
  audio: 'Audio',
  documento: 'Documento',
};

export const ICONE_ALLEGATO: Record<TipoAllegato, string> = {
  foto: 'image',
  video: 'videocam',
  audio: 'mic',
  documento: 'document-text',
};

const MB = (byte: number): string => {
  const mb = byte / (1024 * 1024);
  return mb >= 10 ? `${Math.round(mb)} MB` : `${mb.toFixed(1)} MB`;
};

export const pesoLeggibile = (byte?: number): string =>
  !byte || byte <= 0 ? '' : MB(byte);

/** Il file è accettabile? Se no, si dice perché e con quale limite. */
export const controllaAllegato = (
  tipo: TipoAllegato,
  peso: number
): { ok: true } | { ok: false; motivo: string } => {
  const limite = LIMITI[tipo];
  if (!limite) return { ok: false, motivo: 'Tipo di file non riconosciuto.' };
  if (peso <= 0) return { ok: false, motivo: 'Il file sembra vuoto.' };
  if (peso > limite) {
    return {
      ok: false,
      motivo: `${NOMI_ALLEGATO[tipo]} troppo pesante: ${MB(peso)}. `
        + `Il limite è ${MB(limite)} — comprimilo o accorcialo.`,
    };
  }
  return { ok: true };
};

/** Dal tipo MIME al nostro tipo. Quello che non riconosciamo è documento. */
export const tipoDaMime = (mime?: string | null): TipoAllegato => {
  const m = (mime || '').toLowerCase();
  if (m.startsWith('image/')) return 'foto';
  if (m.startsWith('video/')) return 'video';
  if (m.startsWith('audio/')) return 'audio';
  return 'documento';
};

// ------------------------------------------------------------
// Quando si può premere «Invia»
// ------------------------------------------------------------

export interface EsitoControllo {
  ok: boolean;
  problemi: string[];
}

export const LUNGHEZZA_TITOLO = 80;
export const LUNGHEZZA_TESTO = 2000;

/**
 * Una comunicazione va a tutti in una volta e non si richiama
 * indietro. Per questo i controlli sono severi: il titolo ci vuole,
 * e serve qualcosa da dire — testo o allegato.
 */
export const controllaComunicazione = (bozza: {
  titolo?: string;
  testo?: string;
  allegato?: Allegato | null;
}): EsitoControllo => {
  const problemi: string[] = [];
  const titolo = (bozza.titolo || '').trim();
  const testo = (bozza.testo || '').trim();

  if (titolo.length < 3) problemi.push('Serve un titolo di almeno 3 caratteri.');
  if (titolo.length > LUNGHEZZA_TITOLO) {
    problemi.push(`Il titolo è troppo lungo: massimo ${LUNGHEZZA_TITOLO} caratteri.`);
  }
  if (!testo && !bozza.allegato) {
    problemi.push('Scrivi un messaggio, oppure allega qualcosa: così com\'è non dice niente.');
  }
  if (testo.length > LUNGHEZZA_TESTO) {
    problemi.push(`Il messaggio è troppo lungo: massimo ${LUNGHEZZA_TESTO} caratteri.`);
  }

  return { ok: problemi.length === 0, problemi };
};

// ------------------------------------------------------------
// Che cosa si legge prima di premere Invia
// ------------------------------------------------------------
//
// Un invio a tutti non si annulla. La conferma deve dire il numero,
// non «sei sicuro?» — il numero è l'unica cosa che fa fermare a
// pensare chi sta per sbagliare destinatario.

export const confermaInvio = (
  quanti: number,
  tipo: TipoComunicazione,
  conAllegato: boolean,
  prova = false
): string => {
  const che = tipo === 'urgente' ? 'un avviso URGENTE' : `un ${tipo}`;
  const con = conAllegato ? ' con l\'allegato' : '';

  // La prova non è un invio più piccolo: è un'altra cosa, e il testo
  // deve dirlo senza ambiguità. Chi sta provando non deve leggere
  // «non si richiama indietro» e spaventarsi, e chi sta per mandare a
  // tutti non deve leggere un testo rassicurante.
  if (prova) {
    return `Arriva solo a te: ${che}${con}.\n\n`
      + 'Serve a vedere com\'è fatta prima di mandarla davvero. '
      + 'Resta in bacheca segnata come PROVA, e puoi toglierla quando vuoi.';
  }

  if (quanti === 0) {
    return 'Non c\'è nessun allievo attivo a cui mandarla.';
  }
  const persone = quanti === 1 ? '1 allievo' : `${quanti} allievi`;
  return `Stai per mandare ${che}${con} a ${persone}.\n\n`
    + 'Una volta partita, la comunicazione non si richiama indietro.';
};

export const ETICHETTE_TIPO: Record<TipoComunicazione, string> = {
  avviso: 'Avviso',
  annuncio: 'Annuncio',
  urgente: 'Urgente',
};

/** La riga sotto il titolo, nell'elenco di chi la riceve. */
export const descriviComunicazione = (
  c: Pick<Comunicazione, 'tipo' | 'autoreNome' | 'createdAt' | 'allegato'>
): string => {
  const pezzi: string[] = [ETICHETTE_TIPO[c.tipo] || 'Avviso'];
  if (c.autoreNome?.trim()) pezzi.push(c.autoreNome.trim());
  if (c.allegato) pezzi.push(NOMI_ALLEGATO[c.allegato.tipo]);
  if (c.createdAt instanceof Date && !isNaN(c.createdAt.getTime())) {
    pezzi.push(c.createdAt.toLocaleDateString('it-IT', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    }));
  }
  return pezzi.join(' · ');
};
