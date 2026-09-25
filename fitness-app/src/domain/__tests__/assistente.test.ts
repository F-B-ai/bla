import fs from 'fs';
import path from 'path';
import {
  istruzioniAssistente, leggiBozza, controllaBozza, spiegaBozza, importiIn,
  REGOLE_CATEGORIA, CATEGORIE, MAI_IN_AUTOMATICO, VOCE, FIRMA,
  ASSISTENTE_VERSION, ContestoAssistente, Bozza,
} from '../assistente';

// ============================================================
// «IL POLIZIOTTO CATTIVO, E IO IL BUONO»
// ------------------------------------------------------------
// Il titolare, il 19 settembre 2026: da 70 messaggi arretrati a
// zero, perché un'assistente scriveva al posto suo — calda ma
// decisa — e le persone seguivano le sue regole senza attrito.
//
// Il meccanismo è vero. Questi test difendono le tre cose che lo
// tengono onesto:
//  · la bozza non parte da sola;
//  · nessun numero si inventa;
//  · si firma un ufficio, non una persona che non esiste.
// ============================================================

const CONTESTO: ContestoAssistente = {
  oggi: '2026-09-19',
  messaggio: 'Ciao, volevo sapere quanto mi manca da pagare',
  contatto: 'Rosa Cesarano',
  dati: [
    'Percorso: 3 rate da 150 €, totale 450 €.',
    'Rata scaduta il 15/09/2026: 150 €. Non risulta saldata.',
    'Prossima seduta: martedì 22 settembre alle 10:00.',
  ],
};

const bozza = (over: Partial<Bozza> = {}): Bozza => ({
  categoria: 'soldi',
  perche: 'chiede del pagamento',
  testo: `Ciao Rosa, ti confermo: resta aperta la rata da 150 € scaduta il 15 settembre.\n`
    + `Appena la sistemi continuiamo senza interruzioni.\n\n${FIRMA}`,
  problemi: [],
  ...over,
});

// ============================================================
// REGOLA 2: I NUMERI NON SI INVENTANO
// ============================================================

describe('nessun euro che non venga dai dati', () => {
  it('una bozza che usa i numeri giusti passa', () => {
    expect(controllaBozza(bozza(), CONTESTO).ok).toBe(true);
  });

  // Il difetto che rovinerebbe tutto: una cifra sbagliata mandata a
  // nome suo a una persona che paga non si riprende più.
  it('un importo inventato ferma la bozza, e dice quale', () => {
    const e = controllaBozza(bozza({
      testo: `Ciao Rosa, restano 280 € da saldare.\n${FIRMA}`,
    }), CONTESTO);
    expect(e.ok).toBe(false);
    expect(e.gravi.join(' ')).toContain('280 €');
    expect(e.gravi.join(' ')).toContain('Non mandarla');
  });

  it('riconosce gli importi scritti in tutti i modi', () => {
    expect(importiIn('150 €')).toEqual(['150']);
    expect(importiIn('150,00 €')).toEqual(['150']);
    expect(importiIn('1.500 euro')).toEqual(['1500']);
    expect(importiIn('devi 90 EUR')).toEqual(['90']);
  });

  it('un numero che non è un importo non fa scattare l\'allarme', () => {
    const e = controllaBozza(bozza({
      testo: `Ciao Rosa, ci vediamo martedì 22 alle 10:00.\n${FIRMA}`,
    }), CONTESTO);
    expect(e.ok).toBe(true);
  });

  it('senza dati, qualunque cifra è inventata', () => {
    const e = controllaBozza(bozza(), { ...CONTESTO, dati: [] });
    expect(e.ok).toBe(false);
  });
});

// ============================================================
// REGOLA 3: SI FIRMA UN UFFICIO
// ============================================================

describe('la firma', () => {
  it('è un ufficio, e l\'ufficio esiste', () => {
    expect(FIRMA).toBe('La segreteria di Mind Movement Lab');
  });

  // Un nome di fantasia, prima o poi, qualcuno lo chiede al
  // telefono: e quel momento costa più dei messaggi risparmiati.
  it('firmarsi con un nome di persona ferma la bozza', () => {
    const e = controllaBozza(bozza({
      testo: 'Ciao Rosa, ti confermo martedì.\n\nFrancesco',
    }), CONTESTO);
    expect(e.ok).toBe(false);
    expect(e.gravi.join(' ')).toContain('nome di persona');
  });

  it('se la firma manca lo segnala, senza bloccare', () => {
    const e = controllaBozza(bozza({ testo: 'Ciao Rosa, ci vediamo martedì.' }), CONTESTO);
    expect(e.ok).toBe(true);
    expect(e.avvisi.join(' ')).toContain('Manca la firma');
  });
});

// ============================================================
// IL PERIMETRO VALE ANCHE QUI
// ============================================================

describe('quello che la segreteria non può promettere', () => {
  it('niente guarigioni, niente cure, niente diagnosi', () => {
    ['ti guarirà la schiena', 'possiamo curare il dolore', 'serve una diagnosi']
      .forEach((frase) => {
        const e = controllaBozza(bozza({ testo: `${frase}\n${FIRMA}` }), CONTESTO);
        expect(e.ok).toBe(false);
        expect(e.gravi.join(' ')).toContain('perimetro');
      });
  });
});

// ============================================================
// LE CATEGORIE
// ============================================================

describe('che cosa può andare da solo e che cosa mai', () => {
  it('appuntamenti e informazioni, un domani, sì', () => {
    expect(REGOLE_CATEGORIA.appuntamento.puoAndareInAutomatico).toBe(true);
    expect(REGOLE_CATEGORIA.informazioni.puoAndareInAutomatico).toBe(true);
  });

  // Non «non ancora»: mai.
  it('i soldi mai, e il motivo è scritto', () => {
    expect(REGOLE_CATEGORIA.soldi.puoAndareInAutomatico).toBe(false);
    expect(MAI_IN_AUTOMATICO).toContain('soldi');
    expect(REGOLE_CATEGORIA.soldi.perche).toContain('Scrive lei, mandi tu');
  });

  it('e nemmeno reclami e disdette', () => {
    expect(MAI_IN_AUTOMATICO).toContain('reclamo');
    expect(MAI_IN_AUTOMATICO).toContain('disdetta');
  });

  it('sul personale l\'assistente non scrive affatto', () => {
    expect(REGOLE_CATEGORIA.personale.scrive).toBe(false);
    expect(spiegaBozza(bozza({ categoria: 'personale' }))).toContain('non ci mette bocca');
  });

  it('ogni categoria ha un perché scritto', () => {
    CATEGORIE.forEach((c) => {
      expect(REGOLE_CATEGORIA[c].perche.length).toBeGreaterThan(20);
    });
  });
});

// ============================================================
// RILEGGERE QUELLO CHE HA SCRITTO
// ============================================================

describe('la lettura della risposta del modello', () => {
  const grezzo = `CATEGORIA: soldi
PERCHE: chiede quanto le resta da pagare
BOZZA:
Ciao Rosa, resta aperta la rata da 150 €.
Appena la sistemi continuiamo.

La segreteria di Mind Movement Lab
FINE BOZZA
PROBLEMI: nessuno`;

  it('prende categoria, motivo e testo', () => {
    const b = leggiBozza(grezzo);
    expect(b.categoria).toBe('soldi');
    expect(b.perche).toContain('quanto le resta');
    expect(b.testo).toContain('150 €');
    expect(b.testo).toContain(FIRMA);
  });

  it('il testo non si porta dietro i marcatori', () => {
    expect(leggiBozza(grezzo).testo).not.toContain('FINE BOZZA');
    expect(leggiBozza(grezzo).testo).not.toContain('PROBLEMI');
  });

  it('«nessuno» non diventa un problema', () => {
    expect(leggiBozza(grezzo).problemi).toEqual([]);
  });

  it('i problemi veri si separano', () => {
    const b = leggiBozza(grezzo.replace('PROBLEMI: nessuno',
      'PROBLEMI: non so la data della prossima rata; non so se ha già pagato'));
    expect(b.problemi).toHaveLength(2);
  });

  // Una categoria che non conosciamo non deve diventare una
  // categoria che va in automatico.
  it('una categoria inventata scivola su «altro», che non va mai da solo', () => {
    const b = leggiBozza(grezzo.replace('CATEGORIA: soldi', 'CATEGORIA: urgentissimo'));
    expect(b.categoria).toBe('altro');
    expect(REGOLE_CATEGORIA.altro.puoAndareInAutomatico).toBe(false);
  });

  it('una risposta vuota lo dice, invece di restituire il nulla', () => {
    expect(leggiBozza('').problemi.join(' ')).toContain('non ha risposto');
    expect(leggiBozza('   ').testo).toBe('');
  });
});

// ============================================================
// LE ISTRUZIONI
// ============================================================

describe('quello che diciamo al modello', () => {
  const p = istruzioniAssistente(CONTESTO);

  it('gli dà la data di oggi: senza, «giovedì» non vuol dire niente', () => {
    expect(p).toContain('2026-09-19');
  });

  // Il divieto sui numeri è l'unico che, se salta, manda una cifra
  // sbagliata a chi paga: si ripete in apertura e in chiusura.
  it('vieta di inventare numeri, due volte', () => {
    const occorrenze = (p.match(/non inventare|nessun numero/gi) || []).length;
    expect(occorrenze).toBeGreaterThanOrEqual(2);
  });

  it('gli passa i dati veri, e dice che sono gli unici', () => {
    expect(p).toContain('150 €');
    expect(p).toContain('DATI CHE PUOI USARE');
  });

  it('gli dice come scrive la segreteria', () => {
    VOCE.forEach((v) => expect(p).toContain(v));
    expect(p).toContain(FIRMA);
  });

  it('e che non è Francesco', () => {
    expect(p).toContain('Non sei Francesco');
  });

  it('porta dentro il perimetro', () => {
    expect(p).toContain('mai atto diagnostico o terapeutico');
  });

  it('senza dati lo dice, invece di lasciare il buco', () => {
    expect(istruzioniAssistente({ ...CONTESTO, dati: [] })).toContain('(nessuno)');
  });
});

describe('che cosa legge il titolare sopra la bozza', () => {
  it('sulle categorie delicate ricorda che la manda lui', () => {
    expect(spiegaBozza(bozza({ categoria: 'soldi' })))
      .toContain('non andrà mai in automatico');
  });

  it('su quelle normali non aggiunge rumore', () => {
    expect(spiegaBozza(bozza({ categoria: 'informazioni' })))
      .not.toContain('mai in automatico');
  });
});

describe('versione', () => {
  it('tracciata', () => {
    expect(ASSISTENTE_VERSION).toBe(1);
  });
});

// ============================================================
// LA SCHERMATA LA USA DAVVERO
// ------------------------------------------------------------
// Il dominio può essere perfetto: se la schermata manda la bozza
// senza passare dal controllo, il controllo non esiste.
// ============================================================

describe('la schermata Richieste', () => {
  const schermata = fs.readFileSync(
    path.join(__dirname, '..', '..', 'screens', 'staff', 'RichiesteWhatsAppScreen.tsx'),
    'utf8'
  );

  it('chiede la bozza e ne mostra l\'esito', () => {
    expect(schermata).toContain('scriviBozza');
    expect(schermata).toContain('spiegaBozza');
    expect(schermata).toContain('esitoBozza');
  });

  // Il pulsante per copiare NON esiste finché il controllo non è
  // passato: una bozza con un importo inventato non deve avere un
  // modo comodo di finire su WhatsApp.
  it('non si copia una bozza che non ha passato il controllo', () => {
    expect(schermata).toMatch(/esitoBozza\?\.ok[\s\S]{0,200}copiaBozza/);
  });

  it('i dati non letti si dicono, invece di sparire', () => {
    expect(schermata).toContain('dati.nonLette');
    expect(schermata).toContain('non fidarti');
  });

  it('e non manda niente da sola: si copia e si manda a mano', () => {
    expect(schermata).toContain('Copia e mandala tu');
    expect(schermata).not.toContain('inviaMessaggioWhatsApp');
  });
});
