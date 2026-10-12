// ============================================================
// LA ROTELLA CHE NON FINIVA MAI
// ------------------------------------------------------------
// 12 ottobre 2026, fotografia dal telefono del titolare: rotella
// rossa e «Caricamento…», ferma.
//
// Il percorso: Firebase ricorda chi sei anche senza rete, quindi
// «autenticato» diventa vero subito. Poi l'app legge il profilo su
// Firestore; se quella lettura non riesce, il profilo resta vuoto — e
// la condizione «autenticato ma senza profilo» era scritta come «sto
// ancora caricando». Per sempre.
//
// E l'errore c'era già: chi legge il profilo lo prende e lo mette da
// parte. Nessuno lo mostrava. L'app sapeva che cosa non andava e
// girava la rotella.
//
// La rete di sicurezza della pagina non poteva aiutare: controlla se
// lo schermo è VUOTO, e una rotella non è vuoto.
// ============================================================

import fs from 'fs';
import path from 'path';
import {
  SECONDI_PAZIENZA, statoAvvio, spiegaBlocco, AZIONI_BLOCCO,
} from '../avvio';

const leggi = (relativo: string): string =>
  fs.readFileSync(path.join(__dirname, '..', '..', relativo), 'utf8');

describe('finché è questione di secondi, si aspetta', () => {
  it('appena aperta, con l\'autenticazione che risponde', () => {
    expect(statoAvvio({
      caricando: true, autenticato: false, profilo: false, secondiPassati: 1,
    })).toBe('attesa');
  });

  it('autenticato e profilo non ancora arrivato: si aspetta', () => {
    expect(statoAvvio({
      caricando: false, autenticato: true, profilo: false, secondiPassati: 5,
    })).toBe('attesa');
  });

  it('dodici secondi: abbastanza per una linea lenta, non tanto da sembrare rotto', () => {
    expect(SECONDI_PAZIENZA).toBe(12);
    expect(statoAvvio({
      caricando: false, autenticato: true, profilo: false,
      secondiPassati: SECONDI_PAZIENZA - 1,
    })).toBe('attesa');
  });
});

describe('passata la pazienza, si smette di girare', () => {
  it('il profilo che non arriva diventa una schermata, non una rotella', () => {
    expect(statoAvvio({
      caricando: false, autenticato: true, profilo: false,
      secondiPassati: SECONDI_PAZIENZA,
    })).toBe('bloccato');
  });

  it('vale anche se è l\'autenticazione a non rispondere', () => {
    expect(statoAvvio({
      caricando: true, autenticato: false, profilo: false,
      secondiPassati: 30,
    })).toBe('bloccato');
  });
});

describe('quando è tutto a posto non si blocca niente', () => {
  it('autenticato col suo profilo: si entra', () => {
    expect(statoAvvio({
      caricando: false, autenticato: true, profilo: true, secondiPassati: 999,
    })).toBe('pronto');
  });

  it('e chi non ha fatto l\'accesso vede la schermata di accesso, non un errore', () => {
    // È il caso di chiunque apra l'app per la prima volta: nessun
    // profilo, nessuna attesa, nessun blocco.
    expect(statoAvvio({
      caricando: false, autenticato: false, profilo: false, secondiPassati: 999,
    })).toBe('pronto');
  });
});

describe('che cosa legge chi è rimasto fuori', () => {
  it('non dà la colpa a chi guarda, e dice la prossima mossa', () => {
    const s = spiegaBlocco(null);
    expect(s.titolo).toMatch(/non riesco/i);
    expect(s.testo).toMatch(/connessione/i);
    expect(s.testo).toMatch(/ripara/i);
  });

  it('dice che i dati non si perdono: è la prima paura', () => {
    expect(spiegaBlocco(null).testo).toMatch(/non perdi niente/i);
  });

  it('un permesso negato ha una risposta sua: esci e rientra', () => {
    const s = spiegaBlocco('FirebaseError: Missing or insufficient permissions.');
    expect(s.titolo).toMatch(/profilo/i);
    expect(s.testo).toMatch(/esci e rientra/i);
  });

  it('il dettaglio tecnico resta, in coda, per chi deve aggiustare', () => {
    expect(spiegaBlocco('boom tecnico').dettaglio).toBe('boom tecnico');
    expect(spiegaBlocco(null).dettaglio).toBe('');
  });

  it('ci sono tre cose da toccare, dalla meno invasiva alla più', () => {
    expect(AZIONI_BLOCCO.map((a) => a.chiave)).toEqual(['riprova', 'ripara', 'esci']);
  });
});

// ------------------------------------------------------------
// CHE LA SCHERMATA ARRIVI DAVVERO
// ------------------------------------------------------------

describe('il navigatore non gira più all\'infinito', () => {
  const nav = leggi('navigation/AppNavigator.tsx');

  it('chiede al dominio a che punto è l\'apertura', () => {
    expect(nav).toMatch(/const avvio = statoAvvio\(\{/);
  });

  it('e passa il motivo che l\'autenticazione aveva già in mano', () => {
    expect(nav).toMatch(/error: erroreAuth/);
    expect(nav).toMatch(/errore=\{erroreAuth\}/);
  });

  it('non esiste più un ritorno alla rotella senza condizione di tempo', () => {
    expect(nav).not.toMatch(/if \(isAuthenticated && !user\) \{\s*return <LoadingScreen \/>;/);
  });

  it('il cronometro si azzera quando l\'app è pronta', () => {
    const i = nav.indexOf('if (!inAttesa)');
    expect(i).toBeGreaterThan(0);
    expect(nav.slice(i, i + 120)).toMatch(/setSecondiAttesa\(0\)/);
  });

  it('una memoria del telefono che risponde male non blocca più l\'avvio', () => {
    const i = nav.indexOf('loadLoginMode()');
    expect(nav.slice(i, i + 600)).toMatch(/\.catch\(\(\) => setLoginModeLoaded\(true\)\)/);
  });
});

describe('la schermata di blocco', () => {
  const comp = leggi('components/common/AvvioBloccato.tsx');

  it('ripara davvero: cancella le cache e toglie il service worker', () => {
    expect(comp).toMatch(/caches/);
    expect(comp).toMatch(/unregister\(\)/);
    expect(comp).toMatch(/location\.reload\(\)/);
  });

  it('e se la riparazione resta appesa, ricarica lo stesso', () => {
    expect(comp).toMatch(/setTimeout\(ricarica, 4000\)/);
  });

  it('i pulsanti sono alti 52: si toccano con una mano sola', () => {
    expect((comp.match(/height: 52/g) || []).length).toBeGreaterThanOrEqual(2);
  });

  it('dice sempre qualcosa: non esiste uno stato muto', () => {
    expect(comp).toMatch(/spiegaBlocco\(errore\)/);
  });
});
