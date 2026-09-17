import fs from 'fs';
import path from 'path';
import {
  controllaAllegato, descriviPattoFirmato, confermaAllegato,
  confermaCancellazione, MAX_MB, TIPI_AMMESSI, PattoFirmato,
  PATTO_FIRMATO_VERSION, scriviGiorno, leggiGiorno,
} from '../pattoFirmato';

// ============================================================
// «COME FACCIO AD ALLEGARE LA FIRMA SUL PATTO?»
// ------------------------------------------------------------
// La schermata gli diceva già «fotografa la copia firmata e
// allegala al profilo». Quel punto di aggancio non esisteva.
//
// E la foto da sola non basta: il patto si genera dalle regole
// correnti, quindi senza congelare il testo nessuno può più
// ricostruire CHE COSA è stato firmato.
// ============================================================

const MB = 1024 * 1024;

describe('che cosa si può allegare', () => {
  it('la foto di una pagina firmata', () => {
    expect(controllaAllegato({ tipo: 'image/jpeg', byte: 2 * MB }).ok).toBe(true);
  });

  it('o una scansione in PDF', () => {
    expect(controllaAllegato({ tipo: 'application/pdf', byte: 1 * MB }).ok).toBe(true);
  });

  it('le foto degli iPhone comprese', () => {
    expect(controllaAllegato({ tipo: 'image/heic', byte: 3 * MB }).ok).toBe(true);
  });

  it('non un file qualunque', () => {
    const e = controllaAllegato({ tipo: 'application/zip', byte: MB });
    expect(e.ok).toBe(false);
    expect(e.problemi.join(' ')).toContain('foto della pagina firmata');
  });

  it('e non un file vuoto', () => {
    expect(controllaAllegato({ tipo: 'image/jpeg', byte: 0 }).ok).toBe(false);
  });
});

describe('il peso', () => {
  it('sotto il limite passa', () => {
    expect(controllaAllegato({ tipo: 'image/jpeg', byte: (MAX_MB - 1) * MB }).ok).toBe(true);
  });

  // Non basta rifiutare: va detto che fare, altrimenti la persona
  // resta ferma con la foto in mano.
  it('sopra il limite dice quanto pesa E come rimediare', () => {
    const e = controllaAllegato({ tipo: 'image/jpeg', byte: (MAX_MB + 8) * MB });
    expect(e.ok).toBe(false);
    const t = e.problemi.join(' ');
    expect(t).toContain(String(MAX_MB));
    expect(t).toMatch(/meno risoluzione|PDF/);
  });
});

describe('la riga sul profilo', () => {
  const patto = (over: Partial<PattoFirmato> = {}): PattoFirmato => ({
    id: 'p1',
    studentId: 'a1',
    studentName: 'Rosa Cesarano',
    firmatoIl: new Date(2026, 8, 17),
    allegatoIl: new Date(2026, 8, 17),
    allegatoDa: 'owner1',
    fileUrl: 'https://esempio/patto.jpg',
    fileTipo: 'image/jpeg',
    snapshot: {
      versioneTesto: 1, testo: 'Articolo 1…', percorso: 'Armonia Posturale',
      rate: 3, importoRata: 150, disdettaOre: 10,
    },
    ...over,
  });

  it('quando c\'è, dice quando e quale percorso', () => {
    const r = descriviPattoFirmato(patto());
    expect(r).toContain('17 settembre 2026');
    expect(r).toContain('Armonia Posturale');
  });

  // Quando manca, non basta dire che manca: si dice che fare.
  it('quando manca, spiega i tre passi', () => {
    const r = descriviPattoFirmato(null);
    expect(r).toContain('Nessun patto firmato');
    expect(r).toContain('due copie');
    expect(r).toContain('fotografa');
  });

  it('una data storta non lascia un buco nella frase', () => {
    expect(descriviPattoFirmato(patto({ firmatoIl: new Date('boh') })))
      .toContain('data non nota');
  });
});

describe('che cosa si legge prima di allegare', () => {
  const c = confermaAllegato('Rosa Cesarano', new Date(2026, 8, 17));

  it('il nome e la data, non un «sei sicuro?»', () => {
    expect(c).toContain('Rosa Cesarano');
    expect(c).toContain('17 settembre 2026');
    expect(c).not.toMatch(/sei sicuro/i);
  });

  // Il motivo per cui questa cosa esiste.
  it('spiega che resta scritto anche il TESTO, e perché', () => {
    expect(c).toContain('TESTO esatto');
    expect(c).toContain('le regole cambiano');
  });

  // La carta resta la firma valida: non si deve credere il contrario.
  it('e ricorda che la firma valida è quella di carta', () => {
    expect(c).toContain('carta resta la firma valida');
  });

  it('senza nome non lascia un buco', () => {
    expect(confermaAllegato('  ', new Date(2026, 8, 17))).toContain('questa persona');
  });
});

describe('togliere la copia digitale', () => {
  const c = confermaCancellazione('Rosa Cesarano');

  it('dice che cosa resta dopo', () => {
    expect(c).toContain('copia di carta');
  });

  it('e che non si recupera', () => {
    expect(c).toContain('Non si');
    expect(c).toContain('rifotografata');
  });
});

describe('i tipi ammessi', () => {
  it('coprono le foto del telefono e il PDF', () => {
    ['image/jpeg', 'image/png', 'image/heic', 'application/pdf']
      .forEach((t) => expect(TIPI_AMMESSI).toContain(t));
  });
});

describe('versione', () => {
  it('tracciata', () => {
    expect(PATTO_FIRMATO_VERSION).toBe(1);
  });
});

// ============================================================
// LA DATA DELLA FIRMA
// ------------------------------------------------------------
// Non è il giorno della foto: si firma di persona, e la copia può
// essere fotografata il giorno dopo.
// ============================================================

describe('la data scritta a mano', () => {
  it('si scrive come la si scrive su carta', () => {
    expect(scriviGiorno(new Date(2026, 8, 17))).toBe('17/09/2026');
  });

  it('e si rilegge', () => {
    const d = leggiGiorno('17/09/2026')!;
    expect(d.getDate()).toBe(17);
    expect(d.getMonth()).toBe(8);
    expect(d.getFullYear()).toBe(2026);
  });

  it('accetta anche i trattini e i punti', () => {
    expect(leggiGiorno('1-9-2026')).not.toBeNull();
    expect(leggiGiorno('1.9.2026')).not.toBeNull();
  });

  // Un contratto datato a un giorno che non esiste è peggio di un
  // contratto senza data.
  it('rifiuta un giorno che non esiste', () => {
    expect(leggiGiorno('31/02/2026')).toBeNull();
    expect(leggiGiorno('32/01/2026')).toBeNull();
    expect(leggiGiorno('01/13/2026')).toBeNull();
  });

  it('rifiuta quello che non è una data', () => {
    ['', 'ieri', '17/09/26', '2026-09-17'].forEach((t) => {
      expect(leggiGiorno(t)).toBeNull();
    });
  });

  it('andata e ritorno', () => {
    const d = new Date(2026, 0, 5);
    expect(leggiGiorno(scriviGiorno(d))!.getTime()).toBe(d.getTime());
  });
});

// ============================================================
// IL CARTELLO DAVANTI ALLA PORTA MURATA
// ------------------------------------------------------------
// La schermata del Patto diceva già, prima che questa cosa
// esistesse: «fotografa la copia firmata e allegala al profilo».
// Il punto di aggancio non c'era.
//
// Questo test non verifica una regola: verifica che la porta
// esista davvero dietro il cartello. Un difetto identico — testo
// che promette una funzione assente — si è già ripetuto tre volte
// in questo programma.
// ============================================================

describe('la schermata del Patto aggancia davvero l\'allegato', () => {
  const schermata = fs.readFileSync(
    path.join(__dirname, '..', '..', 'screens', 'staff', 'PattoScreen.tsx'),
    'utf8'
  );

  it('chiama il servizio che carica il file', () => {
    expect(schermata).toContain('allegaPattoFirmato');
  });

  it('legge se una copia c\'è già, e la mostra', () => {
    expect(schermata).toContain('leggiPattoFirmato');
    expect(schermata).toContain('descriviPattoFirmato');
  });

  // Il difetto ricorrente: un catch che trasforma un guasto in
  // «non c'è niente». Qui l'errore si deve vedere.
  it('se la lettura fallisce lo dice, invece di far finta che non ci sia', () => {
    expect(schermata).toContain('erroreLettura');
    expect(schermata).toContain('Non vuol dire che non ci sia');
  });

  it('congela il testo del patto insieme alla foto', () => {
    expect(schermata).toContain('testoPatto(dati)');
    expect(schermata).toContain('versioneTesto');
  });

  it('cancellare la copia resta solo al titolare', () => {
    expect(schermata).toContain('cancellaPattoFirmato');
    expect(schermata).toMatch(/user\?\.role === 'owner'[\s\S]{0,400}togli/);
  });

  // La decisione di fondo, che non deve tornare indietro.
  it('non memorizza nessuna firma disegnata', () => {
    expect(schermata).not.toMatch(/signature|firmaDigitale|canvas/i);
    expect(schermata).toContain('non è una firma valida');
  });
});
