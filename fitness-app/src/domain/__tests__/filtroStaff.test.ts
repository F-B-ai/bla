import { personaliVisibili, soloSePersonali, spiegaFiltro } from '../filtroStaff';

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
    expect(r).toContain('non compaiono qui');
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
