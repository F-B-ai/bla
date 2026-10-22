// ============================================================
// IL TELEFONO È RAGGIUNGIBILE? E SE NO, PERCHÉ?
// ------------------------------------------------------------
// 22 ottobre 2026, sera. La notifica sul telefono è stata pubblicata
// e non è arrivata: «la richiesta è arrivata, ma non la notifica».
//
// Le cause possibili erano quattro, tutte plausibili. Il problema non
// era sceglierne una: era che NON SE NE VEDEVA NESSUNA. Dal telefono
// non si leggeva niente, dai registri del server neanche, e si
// finiva a provare rimedi a caso.
//
// Un guasto invisibile si ripara una volta sola: facendolo vedere.
// Questi test tengono fermo che si veda, e soprattutto che non dica
// «tutto a posto» quando non lo è — che sarebbe peggio del silenzio.
// ============================================================

import fs from 'fs';
import path from 'path';
import {
  statoAvvisi, spiegaAvvisi, rigaAvvisi, CondizioniAvvisi,
} from '../avvisoTelefono';

const c = (x: Partial<CondizioniAvvisi> = {}): CondizioniAvvisi => ({
  supportato: true, permesso: 'granted', iOS: false,
  installata: true, indirizzo: true, ...x,
});

describe('quando tutto è a posto', () => {
  it('lo dice, e si vede che è verde senza leggere', () => {
    expect(statoAvvisi(c())).toBe('attivi');
    expect(spiegaAvvisi('attivi').buono).toBe(true);
  });

  it('e offre una prova, invece di chiedere di crederci', () => {
    expect(spiegaAvvisi('attivi').azione).toMatch(/prova/i);
  });
});

describe('l\'ordine dei controlli è l\'ordine in cui le cose si rompono', () => {
  // Su iPhone dal browser il permesso non si può nemmeno dare: dire
  // «dai il permesso» manderebbe la persona a sbattere contro un muro.
  it('su iPhone dal browser viene prima l\'installazione, non il permesso', () => {
    expect(statoAvvisi(c({ iOS: true, installata: false, permesso: 'default' })))
      .toBe('da_installare');
  });

  it('il permesso negato non si confonde col permesso mai chiesto', () => {
    expect(statoAvvisi(c({ permesso: 'denied' }))).toBe('permesso_negato');
    expect(statoAvvisi(c({ permesso: 'default' }))).toBe('permesso_mancante');
  });

  it('permesso dato ma senza indirizzo è uno stato SUO, non «tutto a posto»', () => {
    // è il caso più insidioso: la persona ha detto sì, crede che
    // funzioni, e il server non sa dove bussare
    expect(statoAvvisi(c({ indirizzo: false }))).toBe('senza_indirizzo');
    expect(spiegaAvvisi('senza_indirizzo').buono).toBe(false);
  });

  it('un browser che non le sa fare lo dice e non promette niente', () => {
    expect(statoAvvisi(c({ supportato: false }))).toBe('non_supportato');
    expect(spiegaAvvisi('non_supportato').azione).toBeNull();
  });
});

describe('che cosa legge chi non funziona', () => {
  it('su iPhone dal browser: si spiega che non è aggirabile, e come si fa', () => {
    const s = spiegaAvvisi('da_installare');
    expect(s.testo).toMatch(/Aggiungi a Home/i);
    expect(s.testo).toMatch(/non è una cosa che possiamo aggirare/i);
    // nessun pulsante: da qui dentro non si può fare niente, e un
    // pulsante che non risolve è peggio di nessun pulsante
    expect(s.azione).toBeNull();
  });

  it('permesso negato: si manda alle impostazioni del telefono', () => {
    const s = spiegaAvvisi('permesso_negato');
    expect(s.testo).toMatch(/Impostazioni del telefono/i);
    expect(s.azione).toMatch(/riprova/i);
  });

  it('senza indirizzo: si dice il gesto che di solito lo risolve', () => {
    expect(spiegaAvvisi('senza_indirizzo').testo)
      .toMatch(/non basta tornare alla home/i);
  });

  it('e in nessun caso si dà la colpa a chi legge', () => {
    (['da_installare', 'permesso_negato', 'permesso_mancante',
      'senza_indirizzo', 'non_supportato'] as const).forEach((s) => {
      const testo = spiegaAvvisi(s).testo.toLowerCase();
      expect(testo).not.toMatch(/devi aver|hai sbagliato|colpa/);
      expect(spiegaAvvisi(s).titolo.length).toBeGreaterThan(5);
    });
  });

  it('la riga corta non finge che vada tutto bene', () => {
    expect(rigaAvvisi('attivi')).toMatch(/attive/i);
    expect(rigaAvvisi('senza_indirizzo')).not.toMatch(/attive/i);
  });
});

describe('il pannello esiste e si raggiunge', () => {
  const leggi = (r: string): string =>
    fs.readFileSync(path.join(__dirname, '..', '..', r), 'utf8');

  it('sta nel profilo, in alto: è la prima cosa da guardare', () => {
    const profilo = leggi('screens/shared/ProfileScreen.tsx');
    expect(profilo).toMatch(/<StatoNotifiche userId=\{profileUser\.id\} \/>/);
    expect(profilo.indexOf('StatoNotifiche userId'))
      .toBeLessThan(profilo.indexOf('{/* Info utente */}'));
  });

  it('e non compare sulla scheda di un\'altra persona', () => {
    // lo stato è di QUESTO telefono: mostrarlo altrove direbbe una
    // cosa falsa su qualcun altro
    const profilo = leggi('screens/shared/ProfileScreen.tsx');
    const i = profilo.indexOf('<StatoNotifiche');
    expect(profilo.slice(i - 120, i)).toMatch(/!isEditingOther/);
  });

  it('le condizioni si rileggono dal telefono, non da uno stato salvato', () => {
    const push = leggi('services/pushNotificationService.ts');
    expect(push).toMatch(/export const condizioniAvvisi/);
    expect(push).toMatch(/permesso: getNotificationStatus\(\)/);
  });

  it('e il pannello mostra anche i tre dati grezzi, per quando serviranno', () => {
    const comp = leggi('components/common/StatoNotifiche.tsx');
    expect(comp).toMatch(/permesso \{condizioni\?\.permesso/);
    expect(comp).toMatch(/indirizzo \{condizioni\?\.indirizzo/);
  });
});

// ============================================================
// 22 ottobre 2026, seconda diagnosi — IL MOTIVO VERO
// ------------------------------------------------------------
// Il pannello ha funzionato: «permesso granted · app installata ·
// indirizzo assente». Permesso dato, app installata dalla schermata
// home, e l'iscrizione che non riesce.
//
// Vero e insufficiente. Il perché lo stavo inghiottendo dentro un
// `catch`, e senza quello restavano quattro ipotesi e nessun modo di
// sceglierne una. Un messaggio tecnico in piccolo è brutto; un
// guasto che non si può nominare è peggio.
// ============================================================

// ============================================================
// 22 ottobre 2026, terza diagnosi — «Requiring unknown module 1192»
// ------------------------------------------------------------
// Il pannello ha finito il lavoro e ha detto il motivo vero. Non era
// Firebase, non era iOS, non era il permesso: era il costruttore del
// pacchetto.
//
// `firebase/messaging` veniva caricato con un `await import(...)`
// dentro una funzione, e non era importato in modo statico da
// NESSUNA parte del programma — quindi Metro non lo metteva nel
// pacchetto, e al momento di usarlo quel modulo non c'era.
//
// Un import dinamico non è una promessa che il modulo esista: è una
// richiesta di qualcosa che qualcun altro deve aver messo lì.
//
// Verificato sul pacchetto costruito: `applicationServerKey` — il
// cuore dell'iscrizione — compariva ZERO volte in quello pubblicato,
// e compare in quello nuovo.
// ============================================================

describe('il modulo delle notifiche finisce nel pacchetto', () => {
  const leggi = (r: string): string =>
    fs.readFileSync(path.join(__dirname, '..', '..', r), 'utf8');

  it('l\'import è statico e in cima, dove il costruttore lo vede', () => {
    const web = leggi('services/indirizzoPush.web.ts');
    expect(web.split('\n')[0]).toMatch(/^import \{ getMessaging, getToken, isSupported \} from 'firebase\/messaging';/);
  });

  it('e non resta nessun import dinamico di firebase/messaging', () => {
    const push = leggi('services/pushNotificationService.ts');
    expect(push).not.toMatch(/import\('firebase\/messaging'\)/);
    // si guarda il CODICE, non i commenti: qui sopra la parola
    // «await import» compare proprio nella spiegazione del guasto
    const web = leggi('services/indirizzoPush.web.ts')
      .replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(web).not.toMatch(/import\(/);
  });

  // La libreria è fatta per i browser: dentro un pacchetto nativo
  // all'avvio esploderebbe. Metro sceglie il file per piattaforma.
  it('la versione nativa esiste e non tocca firebase/messaging', () => {
    const nativo = leggi('services/indirizzoPush.ts');
    expect(nativo).not.toMatch(/firebase\/messaging/);
    expect(nativo).toMatch(/prendiIndirizzoPush/);
  });

  it('le due versioni hanno la stessa forma: chi le usa non deve sapere quale', () => {
    const nativo = leggi('services/indirizzoPush.ts');
    const web = leggi('services/indirizzoPush.web.ts');
    expect(nativo).toMatch(/export const prendiIndirizzoPush = async \(\): Promise<EsitoIndirizzo>/);
    expect(web).toMatch(/export const prendiIndirizzoPush = async \(\): Promise<EsitoIndirizzo>/);
  });

  it('e l\'iscrizione e la diagnosi passano dallo stesso pezzo', () => {
    // due copie dello stesso lavoro divergono sempre, e a divergere
    // sarebbe quella che dice se funziona
    const push = leggi('services/pushNotificationService.ts');
    expect((push.match(/prendiIndirizzoPush\(\)/g) || []).length).toBe(2);
  });
});

describe('quando l\'iscrizione fallisce si dice PERCHÉ', () => {
  const leggi = (r: string): string =>
    fs.readFileSync(path.join(__dirname, '..', '..', r), 'utf8');
  const web = leggi('services/indirizzoPush.web.ts');
  const pannello = leggi('components/common/StatoNotifiche.tsx');

  it('ogni strada che non porta a un indirizzo lascia scritto il motivo', () => {
    expect(web).toMatch(/motivo: 'questo browser non supporta/);
    expect(web).toMatch(/motivo: 'manca la chiave/);
    expect(web).toMatch(/motivo: 'service worker non disponibile'/);
    expect(web).toMatch(/motivo: 'il sistema non ha restituito/);
  });

  it('e l\'errore del sistema non si perde dentro il catch', () => {
    expect(web).toMatch(/e\?\.code \|\| e\?\.message/);
  });

  it('il motivo arriva fino allo schermo, e si può copiare', () => {
    expect(pannello).toMatch(/condizioni\.motivo/);
    expect(pannello).toMatch(/selectable/);
  });
});
