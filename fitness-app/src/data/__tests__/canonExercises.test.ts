import * as fs from 'fs';
import * as path from 'path';
import { canonExercises } from '../canonExercises';
import { allDefaultExercises } from '../defaultExercises';

// ============================================================
// CANONE ALLIEVO — il testo di Francesco, intoccabile.
// ------------------------------------------------------------
// docs/schede-esercizi.md è la FONTE. Questi test confrontano la
// libreria con quel file: se qualcuno "migliora" una frase, cambia
// un angolo o sostituisce un termine del metodo, la suite si ferma.
//
// Anche le interruzioni di riga contano: dove Francesco è andato a
// capo dentro un paragrafo, si va a capo.
// ============================================================

const CANONE = path.join(__dirname, '..', '..', '..', 'docs', 'schede-esercizi.md');

/** Legge il file canone: titolo della sezione → testo esatto. */
const sezioniDelCanone = (): Record<string, string> => {
  const md = fs.readFileSync(CANONE, 'utf8').replace(/<!--[\s\S]*?-->/g, '');
  const sezioni: Record<string, string> = {};
  let corrente: string | null = null;
  let buffer: string[] = [];
  for (const riga of md.split('\n')) {
    if (riga.startsWith('# ')) {
      if (corrente) sezioni[corrente] = buffer.join('\n').replace(/^\n+|\n+$/g, '');
      corrente = riga.slice(2).trim();
      buffer = [];
    } else if (corrente !== null) {
      buffer.push(riga);
    }
  }
  if (corrente) sezioni[corrente] = buffer.join('\n').replace(/^\n+|\n+$/g, '');
  return sezioni;
};

const testo = (nome: string): string =>
  canonExercises.find((e) => e.name === nome)!.description;

const TITOLI = {
  affondo: 'Affondo bulgaro',
  panca: 'Distensioni su panca inclinata (30°, stesso schema per 15° e 45°)',
  lat: 'Lat machine, impugnatura prona (forma base, larghezza)',
};

describe('il file canone è la fonte', () => {
  it('contiene tutte e tre le schede dettate', () => {
    const s = sezioniDelCanone();
    Object.values(TITOLI).forEach((t) => expect(Object.keys(s)).toContain(t));
  });
});

describe('affondo bulgaro: parola per parola', () => {
  it('la descrizione in libreria è quella del canone, senza una virgola in più', () => {
    expect(testo('Affondo bulgaro')).toBe(sezioniDelCanone()[TITOLI.affondo]);
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
    const canone = sezioniDelCanone()[TITOLI.panca];
    for (const n of nomi) expect(testo(n)).toBe(canone);
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

describe('lat machine impugnatura prona: parola per parola', () => {
  const nome = 'Lat machine impugnatura prona';

  it('la descrizione in libreria è quella del canone, a capo compresi', () => {
    expect(testo(nome)).toBe(sezioniDelCanone()[TITOLI.lat]);
  });

  it('le cosce NON vanno sotto i rulli, e il perché resta scritto', () => {
    const d = testo(nome);
    expect(d).toContain('Le cosce non vanno sotto i rulli');
    expect(d).toContain('rimanere inchiodati sulla sede');
    expect(d).toContain('non favoriscono il giusto stimolo ai muscoli target');
  });

  it('prima la depressione delle scapole, poi la trazione — nell\'ordine dettato', () => {
    const d = testo(nome);
    const scapole = d.indexOf('Il primo movimento non è la trazione ma la depressione delle scapole');
    const trazione = d.indexOf('A questo punto inizia la trazione');
    expect(scapole).toBeGreaterThan(-1);
    expect(trazione).toBeGreaterThan(scapole);
    expect(d).toContain('infilandole nella loro «loggia»');
    expect(d).not.toContain('infiorare');
  });

  it('il gran dorsale CIFOTIZZA: niente ROM concentrico completo', () => {
    const d = testo(nome);
    expect(d).toContain('Niente ROM concentrico completo, il gran dorsale cifotizza');
    expect(d).not.toContain('non cifotizza');
  });

  it('gli angoli e i riferimenti anatomici restano quelli', () => {
    const d = testo(nome);
    expect(d).toContain('tuberosità ischiatiche');
    expect(d).toContain('teste femorali nell’acetabolo');
    expect(d).toContain('braccia a 30°');
    expect(d).toContain('Busto indietro di circa 15°');
    expect(d).toContain('fibre pennate');
    expect(d).toContain('grande rotondo');
    expect(d).toContain('cintura toraco-lombare');
    expect(d).toContain('cingolo omero-scapolare');
  });

  it('il rischio dichiarato da Francesco non si annacqua', () => {
    expect(testo(nome)).toContain(
      'Fondamentale: scapole prima della trazione, pena possibile infortunio nel tempo'
    );
  });
});

describe('ogni esercizio del canone entra completo', () => {
  it('nessuno senza descrizione', () => {
    for (const e of canonExercises) expect(e.description.length).toBeGreaterThan(200);
  });

  it('nessuno senza filmato, salvo l\'eccezione DICHIARATA con filmInArrivo', () => {
    for (const e of canonExercises) {
      if (e.filmInArrivo) {
        // eccezione visibile: descrizione canone in mano, film ancora no
        expect(e.videoUrl).toBeUndefined();
        continue;
      }
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
