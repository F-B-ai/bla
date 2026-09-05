import {
  trovaFilm, fondiConCanone, normalizzaNome, riproducibile, daAprireFuori,
  VoceLibreria, FILM_VERSION,
} from '../filmEsercizio';
import { canonExercises } from '../../data/canonExercises';

// ============================================================
// IL FILM DELL'ESERCIZIO
// Ciò che questi test difendono:
//  · il film si trova anche quando il programma non lo porta;
//  · un esercizio risalvato senza film non copre quello buono;
//  · non si mostra mai un tasto che non porta da nessuna parte.
// ============================================================

const LIBRERIA: VoceLibreria[] = canonExercises.map((e) => ({
  name: e.name,
  videoUrl: e.videoUrl,
  videoLabel: e.videoLabel,
  videoUrlAlt: e.videoUrlAlt,
  videoAltLabel: e.videoAltLabel,
}));

describe('trovare il film', () => {
  it('IL CASO ROTTO: programma senza link, film preso dalla libreria', () => {
    const f = trovaFilm({
      nome: 'Affondo bulgaro',
      videoUrlProgramma: '',
      libreria: LIBRERIA,
    });
    expect(f.fonte).toBe('libreria');
    expect(f.url).toContain('affondo-bulgaro-40.mp4');
  });

  it('anche la panca inclinata 30° si trova senza link sul programma', () => {
    const f = trovaFilm({
      nome: 'Distensioni su panca inclinata 30°',
      libreria: LIBRERIA,
    });
    expect(f.fonte).toBe('libreria');
    expect(f.url).toContain('panca-inclinata-30.mp4');
    expect(f.alternativo).toContain('panca-inclinata-30-uomo.mp4');
  });

  it('il link del coach vince su quello della libreria', () => {
    const f = trovaFilm({
      nome: 'Affondo bulgaro',
      videoUrlProgramma: 'https://esempio.it/mio-filmato.mp4',
      libreria: LIBRERIA,
    });
    expect(f.fonte).toBe('programma');
    expect(f.url).toBe('https://esempio.it/mio-filmato.mp4');
  });

  it('il nome si riconosce anche scritto diverso', () => {
    ['distensioni su panca inclinata 30', 'Distensioni  su  Panca  Inclinata  30°',
      'DISTENSIONI SU PANCA INCLINATA 30°']
      .forEach((nome) => {
        expect(trovaFilm({ nome, libreria: LIBRERIA }).url)
          .toContain('panca-inclinata-30.mp4');
      });
  });

  it('un esercizio che non esiste in libreria non inventa un film', () => {
    const f = trovaFilm({ nome: 'Esercizio mai visto', libreria: LIBRERIA });
    expect(f.url).toBeNull();
    expect(f.fonte).toBe('nessuna');
  });

  it('senza libreria e senza link: niente film, e nessun tasto', () => {
    const f = trovaFilm({ nome: 'Affondo bulgaro' });
    expect(f.url).toBeNull();
  });

  it('spazi e stringhe vuote non passano per link', () => {
    const f = trovaFilm({ nome: 'Sconosciuto', videoUrlProgramma: '   ' });
    expect(f.url).toBeNull();
  });

  it('non esplode con nomi vuoti o strani', () => {
    expect(() => trovaFilm({ nome: '', libreria: LIBRERIA })).not.toThrow();
    expect(() => trovaFilm({ nome: undefined as any, libreria: LIBRERIA })).not.toThrow();
    expect(trovaFilm({ nome: '   ', libreria: LIBRERIA }).url).toBeNull();
  });

  it('tutti e tre gli esercizi del canone hanno il loro film', () => {
    ['Affondo bulgaro', 'Distensioni su panca inclinata 30°', 'Lat machine impugnatura prona']
      .forEach((nome) => {
        const f = trovaFilm({ nome, libreria: LIBRERIA });
        expect(f.url).toMatch(/^https:\/\/.+\.mp4$/);
      });
  });
});

describe('un documento senza film non copre quello buono', () => {
  const canone: VoceLibreria = {
    name: 'Affondo bulgaro',
    videoUrl: 'https://essere-3fe6f.web.app/video/affondo-bulgaro-40.mp4',
    videoLabel: 'Film donna',
  };

  it('la voce salvata senza film eredita quello del canone', () => {
    const salvata = { name: 'Affondo bulgaro', videoUrl: undefined };
    expect(fondiConCanone(salvata, canone).videoUrl).toContain('affondo-bulgaro-40.mp4');
  });

  it('una stringa vuota conta come vuoto, non come scelta', () => {
    const salvata = { name: 'Affondo bulgaro', videoUrl: '   ' };
    expect(fondiConCanone(salvata, canone).videoUrl).toContain('affondo-bulgaro-40.mp4');
  });

  it('ma un film scelto dal coach NON viene sovrascritto', () => {
    const salvata = { name: 'Affondo bulgaro', videoUrl: 'https://esempio.it/suo.mp4' };
    expect(fondiConCanone(salvata, canone).videoUrl).toBe('https://esempio.it/suo.mp4');
  });

  it('senza canone la voce resta com\'è', () => {
    const salvata = { name: 'X', videoUrl: undefined };
    expect(fondiConCanone(salvata, undefined).videoUrl).toBeUndefined();
  });
});

describe('che cosa si può montare nel lettore', () => {
  it('i file video sì', () => {
    expect(riproducibile('https://essere-3fe6f.web.app/video/affondo-bulgaro-40.mp4')).toBe(true);
    expect(riproducibile('https://x.it/a.MOV')).toBe(true);
    expect(riproducibile('/video/lat-machine-prona.mp4')).toBe(true);
  });

  it('le pagine no: quelle si aprono fuori', () => {
    expect(riproducibile('https://youtube.com/watch?v=abc')).toBe(false);
    expect(daAprireFuori('https://youtube.com/watch?v=abc')).toBe(true);
    expect(daAprireFuori('https://x.it/a.mp4')).toBe(false);
  });

  it('il vuoto non è né l\'uno né l\'altro', () => {
    expect(riproducibile('')).toBe(false);
    expect(daAprireFuori('')).toBe(false);
    expect(daAprireFuori(null)).toBe(false);
  });
});

describe('normalizzazione dei nomi', () => {
  it('toglie accenti, gradi e spazi doppi', () => {
    expect(normalizzaNome('Distensioni  su  panca inclinata 30°'))
      .toBe('distensioni su panca inclinata 30');
    expect(normalizzaNome('Affondo  bulgaro ')).toBe('affondo bulgaro');
  });

  it('versione tracciata', () => {
    expect(FILM_VERSION).toBe(1);
  });
});
