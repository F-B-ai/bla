import fs from 'fs';
import path from 'path';
import {
  personaliVisibili, soloSePersonali, spiegaFiltro,
  ETICHETTA_TOGLI_FILTRO, FILTRO_STAFF_VERSION,
} from '../filtroStaff';

// ============================================================
// «SIGNIFICA CHE LORO STANNO VEDENDO QUESTO?»
// ------------------------------------------------------------
// No: i dati non uscivano. Ma la schermata mentiva. Con il filtro su
// un manager, gli appuntamenti si filtravano (0) mentre i task e gli
// ospiti del TITOLARE restavano in pagina. Intestazione di una
// persona, contenuto di un'altra.
//
// Il contatore lo diceva già — «0 appuntamenti» e sotto due
// appuntamenti prossimi — e nessuno lo aveva letto.
// ============================================================

const IO = 'francesco';
const ALTRO = 'giuseppe';

describe('che cosa si vede filtrando per persona', () => {
  it('senza filtro si vede tutto: è la vista normale', () => {
    expect(personaliVisibili(null, IO)).toBe(true);
    expect(personaliVisibili(undefined, IO)).toBe(true);
  });

  it('filtrando su me stesso, le mie cose ci sono', () => {
    expect(personaliVisibili(IO, IO)).toBe(true);
  });

  // Il difetto vero, in una riga.
  it('filtrando su un ALTRO, i miei task e i miei ospiti spariscono', () => {
    expect(personaliVisibili(ALTRO, IO)).toBe(false);
  });

  it('senza sapere chi sono, non si mostra niente di personale', () => {
    expect(personaliVisibili(ALTRO, null)).toBe(false);
    expect(personaliVisibili(ALTRO, undefined)).toBe(false);
  });
});

describe('applicare la regola a un elenco', () => {
  const task = [{ id: 't1' }, { id: 't2' }];

  it('senza filtro l\'elenco resta intero', () => {
    expect(soloSePersonali(task, null, IO)).toHaveLength(2);
  });

  it('sulla giornata di un altro l\'elenco è vuoto', () => {
    expect(soloSePersonali(task, ALTRO, IO)).toEqual([]);
  });

  it('un elenco assente non fa esplodere niente', () => {
    expect(soloSePersonali(null as never, null, IO)).toEqual([]);
  });
});

describe('la riga che dice che cosa stai guardando', () => {
  // Una schermata filtrata deve dirlo: senza, chi guarda crede di
  // vedere tutto — ed è esattamente l'equivoco dell'11 settembre.
  it('guardando un altro, lo dice col suo nome', () => {
    const r = spiegaFiltro(ALTRO, 'Giuseppe Calabrese', IO);
    expect(r).toContain('Giuseppe Calabrese');
    // Il «NON» è maiuscolo apposta: è la parola che la persona
    // sta cercando quando non trova le proprie cose.
    expect(r).toMatch(/non compaiono qui/i);
  });

  it('senza filtro non dice niente: non c\'è niente da spiegare', () => {
    expect(spiegaFiltro(null, null, IO)).toBe('');
  });

  it('su me stesso non dice niente', () => {
    expect(spiegaFiltro(IO, 'Francesco Busanca', IO)).toBe('');
  });

  it('senza il nome non lascia un buco nella frase', () => {
    expect(spiegaFiltro(ALTRO, null, IO)).toContain('questa persona');
  });
});

// ============================================================
// «NON VEDO TUTTI GLI APPUNTAMENTI OSPITI GIALLI» — 15 set 2026
// ------------------------------------------------------------
// Il filtro funzionava. L'avviso che lo spiega compariva in una
// vista sola su tre: in due viste sparivano i suoi appuntamenti e
// tutti i suoi ospiti senza una parola, e da una non si poteva
// nemmeno togliere il filtro.
// ============================================================

describe('l\'avviso dice che cosa MANCA, non solo di chi è la giornata', () => {
  const t = spiegaFiltro('altro', 'Giuseppe', 'io');

  it('nomina gli appuntamenti, i task e gli ospiti', () => {
    expect(t).toContain('appuntamenti');
    expect(t).toContain('task');
    expect(t).toContain('ospiti');
  });

  it('e dice a chiare lettere che NON ci sono qui', () => {
    expect(t).toContain('NON compaiono qui');
  });

  it('dice «solo», perché è una vista parziale', () => {
    expect(t).toContain('solo la giornata');
  });
});

describe('dirlo senza dare l\'uscita è mezzo servizio', () => {
  it('c\'è un\'etichetta per togliere il filtro', () => {
    expect(ETICHETTA_TOGLI_FILTRO.length).toBeGreaterThan(5);
    expect(ETICHETTA_TOGLI_FILTRO.toLowerCase()).toContain('agenda');
  });
});

describe('la schermata mostra l\'avviso in TUTTE le viste', () => {
  const schermata = fs.readFileSync(
    path.join(__dirname, '..', '..', 'screens', 'shared', 'CalendarScreen.tsx'),
    'utf8'
  );

  // Agenda, Timeline, Calendario: il filtro agisce in tutte e tre,
  // quindi in tutte e tre va detto.
  it('il banner compare tre volte, una per vista', () => {
    expect(schermata.split('{bannerFiltro}').length - 1).toBe(3);
  });

  it('e porta con sé il modo di toglierlo', () => {
    expect(schermata).toContain('ETICHETTA_TOGLI_FILTRO');
    expect(schermata).toContain('setSelectedStaffId(null)');
  });

  it('il vecchio avviso da una vista sola non c\'è più', () => {
    expect(schermata).not.toContain("avvisoFiltro !== ''");
  });
});

describe('versione', () => {
  it('tracciata', () => {
    expect(FILTRO_STAFF_VERSION).toBe(2);
  });
});
