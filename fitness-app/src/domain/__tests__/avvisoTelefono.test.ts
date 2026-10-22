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
