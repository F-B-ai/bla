import * as fs from 'fs';
import * as path from 'path';
import { canonExercises } from '../canonExercises';
import { allDefaultExercises } from '../defaultExercises';

// ============================================================
// CANONE ALLIEVO — il testo di Francesco, intoccabile.
// ------------------------------------------------------------
// docs/schede-esercizi.md è la FONTE. Questi test confrontano la
// libreria con quel file, paragrafo per paragrafo: se qualcuno
// "migliora" una frase, cambia un angolo o sostituisce un termine
// del metodo, la suite si ferma qui.
// ============================================================

const CANONE = path.join(__dirname, '..', '..', '..', 'docs', 'schede-esercizi.md');

/** Legge il file canone e ne ricava titolo → paragrafi. */
const sezioniDelCanone = (): Record<string, string[]> => {
  const md = fs.readFileSync(CANONE, 'utf8').replace(/<!--[\s\S]*?-->/g, '');
  const sezioni: Record<string, string[]> = {};
  let corrente: string | null = null;
  for (const riga of md.split('\n')) {
    if (riga.startsWith('# ')) {
      corrente = riga.slice(2).trim();
      sezioni[corrente] = [];
    } else if (corrente && riga.trim()) {
      sezioni[corrente].push(riga.trim());
    }
  }
  return sezioni;
};

const testo = (nome: string): string =>
  canonExercises.find((e) => e.name === nome)!.description;

describe('il file canone esiste ed è la fonte', () => {
  it('contiene le schede dettate', () => {
    const s = sezioniDelCanone();
    expect(Object.keys(s)).toContain('Affondo bulgaro');
    expect(Object.keys(s)).toContain(
      'Distensioni su panca inclinata (30°, stesso schema per 15° e 45°)'
    );
  });
});

describe('affondo bulgaro: parola per parola', () => {
  it('la descrizione in libreria è quella del canone, senza una virgola in più', () => {
    const paragrafi = sezioniDelCanone()['Affondo bulgaro'];
    expect(testo('Affondo bulgaro')).toBe(paragrafi.join('\n\n'));
  });

  it('i punti del metodo restano scritti così', () => {
    const d = testo('Affondo bulgaro');
    expect(d).toContain('metatarsi');
    expect(d).toContain('meccanocettori');
    expect(d).toContain('spingere in diagonale');
    expect(d).toContain('Ginocchio davanti non troppo avanti');
    expect(d).toContain('se non fletti l’anca non preallunghi gluteo e femorali');
  });
});

describe('panca inclinata: parola per parola', () => {
  const nomi = [
    'Distensioni su panca inclinata 15°',
    'Distensioni su panca inclinata 30°',
    'Distensioni su panca inclinata 45°',
  ];

  it('tutte e tre le inclinazioni portano lo stesso schema, identico al canone', () => {
    const paragrafi = sezioniDelCanone()[
      'Distensioni su panca inclinata (30°, stesso schema per 15° e 45°)'
    ];
    for (const n of nomi) expect(testo(n)).toBe(paragrafi.join('\n\n'));
  });

  it('gli angoli non si toccano: 30–40° sotto il livello della spalla', () => {
    const d = testo('Distensioni su panca inclinata 30°');
    expect(d).toContain('almeno 30–40° sotto il livello della spalla');
    expect(d).toContain('conflitto acromion-claveare');
  });

  it('i lock di forma restano quelli dettati', () => {
    const d = testo('Distensioni su panca inclinata 30°');
    expect(d).toContain('Non elevare le scapole: addurle');
    expect(d).toContain('Non inarcare eccessivamente la schiena');
    expect(d).toContain('avambracci restano perpendicolari al piano');
    expect(d).toContain('Non estremizzare la fase eccentrica');
  });
});

describe('ogni esercizio del canone entra GIÀ COMPLETO', () => {
  it('nessuno senza descrizione e nessuno senza filmato', () => {
    for (const e of canonExercises) {
      expect(e.description.length).toBeGreaterThan(200);
      expect(e.videoUrl).toBeTruthy();
      expect(e.videoUrl).toMatch(/^https:\/\/.+\.mp4$/);
    }
  });

  it('i filmati puntano a file che esistono davvero nel build web', () => {
    for (const e of canonExercises) {
      for (const url of [e.videoUrl, e.videoUrlAlt].filter(Boolean) as string[]) {
        const file = path.join(
          __dirname, '..', '..', '..', 'web', 'video', url.split('/').pop() as string
        );
        expect(fs.existsSync(file)).toBe(true);
      }
    }
  });

  it('dove ci sono due filmati, tutti e due hanno un\'etichetta leggibile', () => {
    for (const e of canonExercises) {
      if (!e.videoUrlAlt) continue;
      expect(e.videoLabel).toBeTruthy();
      expect(e.videoAltLabel).toBeTruthy();
    }
  });
});

describe('la libreria non si spacca', () => {
  it('il canone apre la libreria, e nessun nome è doppio', () => {
    const nomi = allDefaultExercises.map((e) => e.name);
    expect(nomi[0]).toBe('Affondo bulgaro');
    expect(new Set(nomi).size).toBe(nomi.length);
  });
});
