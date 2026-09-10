import {
  GRUPPI, ZONE, gruppo, nomeGruppo, ordineGruppo,
  perSesso, dividiPerMuscolo, conteggioPerMuscolo, gruppiScoperti,
  GruppoMuscolare, EsercizioDaDividere,
} from '../muscoli';
import { allDefaultExercises } from '../../data/defaultExercises';

// ============================================================
// «LE CATEGORIE SONO I MUSCOLI CHE VOGLIO ALLENARE»
// ------------------------------------------------------------
// La libreria era ordinata per tipo — forza, cardio, mobilità — che
// è corretto e inutile nel momento in cui serve: nessun coach pensa
// «mi serve un esercizio di forza», pensa «mi servono i glutei».
// ============================================================

const e = (
  name: string, muscolo: GruppoMuscolare, gender: 'male' | 'female' | 'unisex'
): EsercizioDaDividere => ({ name, muscolo, gender });

describe('i gruppi, e il loro ordine', () => {
  it('l\'ordine non è alfabetico: è quello con cui si compone una scheda', () => {
    expect(ordineGruppo('pettorali')).toBeLessThan(ordineGruppo('glutei'));
    expect(ordineGruppo('glutei')).toBeLessThan(ordineGruppo('addome'));
    expect(ordineGruppo('addome')).toBeLessThan(ordineGruppo('cardio'));
  });

  it('ogni gruppo ha nome, zona, icona e una riga che spiega che cosa allena', () => {
    GRUPPI.forEach((g) => {
      expect(g.nome.length).toBeGreaterThan(3);
      expect(ZONE).toContain(g.zona);
      expect(g.icona.length).toBeGreaterThan(3);
      expect(g.cosaAllena.length).toBeGreaterThan(20);
    });
  });

  it('nessun gruppo si chiama come un altro', () => {
    expect(new Set(GRUPPI.map((g) => g.nome)).size).toBe(GRUPPI.length);
    expect(new Set(GRUPPI.map((g) => g.id)).size).toBe(GRUPPI.length);
  });

  it('un gruppo sconosciuto non fa esplodere niente', () => {
    expect(gruppo('boh' as GruppoMuscolare)).toBeDefined();
    expect(nomeGruppo(null).length).toBeGreaterThan(0);
  });
});

describe('uomo e donna', () => {
  const lista = [
    e('Panca', 'pettorali', 'unisex'),
    e('Hip thrust', 'glutei', 'female'),
    e('Stacco', 'totalBody', 'male'),
  ];

  // L'errore facile: filtrare via l'unisex e svuotare metà libreria.
  it('l\'unisex compare in tutti e due: la panca non cambia perché la fa una donna', () => {
    expect(perSesso(lista, 'male').map((x) => x.name)).toEqual(['Panca', 'Stacco']);
    expect(perSesso(lista, 'female').map((x) => x.name)).toEqual(['Panca', 'Hip thrust']);
  });

  it('«tutti» non toglie niente', () => {
    expect(perSesso(lista, 'tutti')).toHaveLength(3);
  });

  it('un esercizio senza sesso dichiarato vale per entrambi', () => {
    const senza = [{ name: 'X', muscolo: 'addome' as GruppoMuscolare }];
    expect(perSesso(senza, 'male')).toHaveLength(1);
    expect(perSesso(senza, 'female')).toHaveLength(1);
  });
});

describe('la divisione per muscolo', () => {
  const lista = [
    e('Squat', 'quadricipiti', 'unisex'),
    e('Hip thrust', 'glutei', 'female'),
    e('Ponte glutei', 'glutei', 'unisex'),
    e('Panca', 'pettorali', 'male'),
  ];

  it('le sezioni escono nell\'ordine dei gruppi, non in quello dei dati', () => {
    const s = dividiPerMuscolo(lista, 'tutti');
    expect(s.map((x) => x.gruppo.id)).toEqual(['pettorali', 'glutei', 'quadricipiti']);
  });

  it('dentro una sezione gli esercizi sono in ordine alfabetico italiano', () => {
    const s = dividiPerMuscolo(lista, 'female');
    const glutei = s.find((x) => x.gruppo.id === 'glutei')!;
    expect(glutei.esercizi.map((x) => x.name)).toEqual(['Hip thrust', 'Ponte glutei']);
  });

  // Una sezione vuota è rumore, non informazione.
  it('i gruppi senza esercizi non compaiono', () => {
    const s = dividiPerMuscolo(lista, 'male');
    expect(s.map((x) => x.gruppo.id)).not.toContain('cardio');
    expect(s.find((x) => x.gruppo.id === 'glutei')!.esercizi.map((x) => x.name))
      .toEqual(['Ponte glutei']);
  });

  it('una libreria vuota non produce sezioni finte', () => {
    expect(dividiPerMuscolo([], 'tutti')).toEqual([]);
  });

  it('il conteggio per gruppo torna con le sezioni', () => {
    const c = conteggioPerMuscolo(lista, 'tutti');
    expect(c.glutei).toBe(2);
    expect(c.pettorali).toBe(1);
    expect(c.cardio).toBeUndefined();
  });

  it('i gruppi scoperti si sanno: è la lista della spesa, non un errore', () => {
    const vuoti = gruppiScoperti(lista, 'tutti').map((g) => g.id);
    expect(vuoti).toContain('cardio');
    expect(vuoti).not.toContain('glutei');
  });
});

// ============================================================
// LA LIBRERIA VERA
// ------------------------------------------------------------
// Questi test guardano i dati veri, non un esempio. È il controllo
// che ieri mancava: non basta che la funzione sia giusta, deve
// essere giusto anche ciò su cui gira.
// ============================================================

describe('la libreria di ESSĒRE', () => {
  it('OGNI esercizio ha il suo gruppo muscolare: nessuno escluso', () => {
    const senza = allDefaultExercises.filter((x) => !x.muscolo);
    expect(senza.map((x) => x.name)).toEqual([]);
  });

  it('nessun esercizio ha un gruppo inventato', () => {
    const validi = new Set(GRUPPI.map((g) => g.id));
    const strani = allDefaultExercises.filter((x) => !validi.has(x.muscolo));
    expect(strani.map((x) => x.name)).toEqual([]);
  });

  it('nessun nome è ripetuto: due esercizi uguali si confondono nella scheda', () => {
    const nomi = allDefaultExercises.map((x) => x.name.toLowerCase().trim());
    const doppi = nomi.filter((n, i) => nomi.indexOf(n) !== i);
    expect([...new Set(doppi)]).toEqual([]);
  });

  it('ogni esercizio ha una descrizione vera, non un segnaposto', () => {
    const corte = allDefaultExercises.filter((x) => (x.description || '').length < 60);
    expect(corte.map((x) => x.name)).toEqual([]);
  });

  it('la libreria è divisibile sia per uomo sia per donna senza restare vuota', () => {
    expect(dividiPerMuscolo(allDefaultExercises, 'male').length).toBeGreaterThan(8);
    expect(dividiPerMuscolo(allDefaultExercises, 'female').length).toBeGreaterThan(8);
  });

  it('i gruppi che il titolare ha nominato hanno esercizi per entrambi', () => {
    const chiesti: GruppoMuscolare[] =
      ['glutei', 'quadricipiti', 'femorali', 'pettorali'];
    (['male', 'female'] as const).forEach((s) => {
      const c = conteggioPerMuscolo(allDefaultExercises, s);
      chiesti.forEach((g) => expect(c[g] || 0).toBeGreaterThan(0));
    });
  });
});
