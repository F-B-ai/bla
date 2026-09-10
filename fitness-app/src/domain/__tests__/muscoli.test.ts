import {
  GRUPPI, GRUPPI_RITIRATI, ZONE, gruppo, nomeGruppo, ordineGruppo,
  perSesso, dividiPerMuscolo, conteggioPerMuscolo, gruppiScoperti,
  GruppoMuscolare, EsercizioDaDividere,
} from '../muscoli';
import { allDefaultExercises } from '../../data/defaultExercises';
import { esercizi2026 } from '../../data/esercizi2026';
import { AVVISO_RESPIRO, VOCI_AVVISO_RESPIRO } from '../perimetro';

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

// ============================================================
// I DUE GRUPPI RITIRATI
// ------------------------------------------------------------
// «I lombari non vanno mai allenati, sono già di per sé dei muscoli
// che tendono ad arretrarsi.» E: «Per quanto riguarda i polpacci,
// li dobbiamo fare un discorso a parte, quindi me li puoi
// eliminare.» — 10 settembre 2026.
//
// Questi test esistono perché fra sei mesi qualcuno (io compreso)
// non li rimetta dentro «per completezza».
// ============================================================

describe('lombari e polpacci: fuori, per decisione di metodo', () => {
  it('non esistono più come gruppo', () => {
    const ids = GRUPPI.map((g) => g.id as string);
    expect(ids).not.toContain('lombari');
    expect(ids).not.toContain('polpacci');
  });

  it('e nessun esercizio della libreria li usa più', () => {
    const rimasti = allDefaultExercises.filter(
      (e) => (e.muscolo as string) === 'lombari' || (e.muscolo as string) === 'polpacci'
    );
    expect(rimasti.map((e) => e.name)).toEqual([]);
  });

  it('il perché resta scritto: non è una svista da correggere', () => {
    expect(GRUPPI_RITIRATI.map((g) => g.id).sort()).toEqual(['lombari', 'polpacci']);
    GRUPPI_RITIRATI.forEach((g) => expect(g.perche.length).toBeGreaterThan(60));
  });

  // Il calf raise è rimasto uno solo, e con un'altra funzione: pompa
  // venosa nelle schede drenanti, non ipertrofia del polpaccio.
  it('l\'unico calf superstite vive sotto decongestione', () => {
    const calf = allDefaultExercises.filter((e) => /calf/i.test(e.name));
    expect(calf).toHaveLength(1);
    expect(calf[0].muscolo).toBe('decongestione');
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

  // Il difetto trovato rileggendo: un esercizio salvato in Firestore
  // sotto «polpacci» prima che il gruppo venisse ritirato non deve
  // sparire dalla libreria del coach. Deve comparire, in fondo, dove
  // si vede e si sistema.
  it('un esercizio con un gruppo che non esiste più NON sparisce', () => {
    const conRitirato = [
      e('Squat', 'quadricipiti', 'unisex'),
      e('Calf raise vecchio', 'polpacci' as GruppoMuscolare, 'male'),
      e('Iperestensione vecchia', 'lombari' as GruppoMuscolare, 'male'),
    ];
    const sezioni = dividiPerMuscolo(conRitirato, 'tutti');
    const tutti = sezioni.flatMap((s) => s.esercizi.map((x) => x.name));
    expect(tutti).toHaveLength(3);
    const daSistemare = sezioni.find((s) => s.gruppo.id === 'daClassificare')!;
    expect(daSistemare.esercizi.map((x) => x.name))
      .toEqual(['Calf raise vecchio', 'Iperestensione vecchia']);
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

  // «L'importante è che ci sia la suddivisione per gruppi muscolari
  // sia per le donne che per gli uomini.» Il criterio è questo, ed è
  // verificabile: nessun muscolo può essere vuoto per un sesso.
  // Prima di oggi i glutei per l'uomo erano uno e la mobilità zero.
  it('NESSUN gruppo muscolare resta vuoto, né per l\'uomo né per la donna', () => {
    const soloDonna: GruppoMuscolare[] = ['protocolliDonna'];
    (['male', 'female'] as const).forEach((sesso) => {
      const vuoti = gruppiScoperti(allDefaultExercises, sesso)
        .map((g) => g.id)
        .filter((id) => id !== 'daClassificare')
        .filter((id) => !(sesso === 'male' && soloDonna.includes(id)));
      expect({ sesso, vuoti }).toEqual({ sesso, vuoti: [] });
    });
  });

  it('i glutei e la mobilità valgono anche per l\'uomo, come richiesto', () => {
    const c = conteggioPerMuscolo(allDefaultExercises, 'male');
    expect(c.glutei).toBeGreaterThan(20);
    expect(c.mobilita).toBeGreaterThan(3);
  });

  it('i protocolli per la donna restano alla donna', () => {
    const c = conteggioPerMuscolo(allDefaultExercises, 'male');
    expect(c.protocolliDonna).toBeUndefined();
    expect(conteggioPerMuscolo(allDefaultExercises, 'female').protocolliDonna)
      .toBeGreaterThan(0);
  });
});

// ============================================================
// L'AGGIUNTA DEL 10 SETTEMBRE 2026
// ------------------------------------------------------------
// «Aggiungi piuttosto altri esercizi, 30 per uomo e 30 per donne
// distribuiti su tutti i gruppi muscolari. […] Per quanto riguarda
// le donne, esercizi più mirati sulla zona gluteo femorale.»
//
// Trenta vuol dire trenta: qui si conta.
// ============================================================

describe('i 30 + 30 chiesti dal titolare', () => {
  const nuoviUomo = esercizi2026.filter((e) => e.gender === 'male');
  const nuoveDonna = esercizi2026.filter((e) => e.gender === 'female'
    && e.muscolo !== 'protocolliDonna');

  it('trenta per l\'uomo, e distribuiti su tutti i gruppi, non ammucchiati', () => {
    expect(nuoviUomo).toHaveLength(30);
    const gruppiToccati = new Set(nuoviUomo.map((e) => e.muscolo));
    expect(gruppiToccati.size).toBeGreaterThanOrEqual(9);
    // nessun gruppo si prende più di un quinto dell'aggiunta
    gruppiToccati.forEach((g) => {
      expect(nuoviUomo.filter((e) => e.muscolo === g).length).toBeLessThanOrEqual(6);
    });
  });

  it('trenta per la donna, e stanno tutte sulla zona gluteo-femorale', () => {
    expect(nuoveDonna).toHaveLength(30);
    const fuoriZona = nuoveDonna
      .filter((e) => e.muscolo !== 'glutei' && e.muscolo !== 'femorali');
    expect(fuoriZona.map((e) => e.name)).toEqual([]);
    expect(nuoveDonna.filter((e) => e.muscolo === 'glutei').length)
      .toBeGreaterThanOrEqual(15);
  });
});

describe('il cardio chiamato con il suo nome', () => {
  const cardio = allDefaultExercises.filter((e) => e.muscolo === 'cardio');

  // «Cardio ok magari con tecniche LISS, HIIT e tutte le altre
  // varianti che conosci.»
  it('i metodi che il titolare ha nominato ci sono tutti', () => {
    const testo = cardio.map((e) => `${e.name} ${e.notes}`).join(' | ');
    ['LISS', 'HIIT', 'Tabata', 'SIT', 'MICT', 'Fartlek', 'EMOM', 'Zona 2']
      .forEach((m) => expect(testo).toContain(m));
  });

  it('ogni metodo dice quanto dura: un cardio senza durata non è un metodo', () => {
    const senzaDurata = cardio.filter((e) => !/\d/.test(e.reps));
    expect(senzaDurata.map((e) => e.name)).toEqual([]);
  });

  it('il cardio vale per tutti e due: il cuore non ha sesso', () => {
    const c = conteggioPerMuscolo(allDefaultExercises, 'male');
    const d = conteggioPerMuscolo(allDefaultExercises, 'female');
    expect(c.cardio).toBe(d.cardio);
    expect(c.cardio).toBeGreaterThan(12);
  });
});

// ============================================================
// I PROTOCOLLI
// ------------------------------------------------------------
// Sono la parte che più assomiglia a un atto clinico e non lo è.
// Per questo i test qui non guardano i numeri: guardano che il
// perimetro sia scritto sulla scheda, dove lo legge chi la usa.
// ============================================================

describe('i protocolli, e il perimetro scritto sopra', () => {
  const decongestione = allDefaultExercises.filter((e) => e.muscolo === 'decongestione');
  const donna = allDefaultExercises.filter((e) => e.muscolo === 'protocolliDonna');

  it('ci sono, e non sono due righe di contorno', () => {
    expect(decongestione.length).toBeGreaterThanOrEqual(7);
    expect(donna.length).toBeGreaterThanOrEqual(7);
  });

  // La regola che non si tocca: l'avviso sul respiro si scrive per
  // intero, non si abbrevia e non si toglie mai. Il test guarda
  // TUTTA la libreria, non solo i protocolli — è così che è venuto
  // fuori che «Respirazione diaframmatica», in libreria da mesi, non
  // l'aveva mai avuto.
  it('ogni pratica di respiro della libreria porta l\'avviso, per intero', () => {
    const pratiche = allDefaultExercises.filter((e) => /respir/i.test(e.name)
      || (e.muscolo === 'decongestione' && /respir/i.test(e.description))
      || (e.muscolo === 'protocolliDonna' && /respir/i.test(e.description)));
    expect(pratiche.length).toBeGreaterThan(4);
    const senzaAvviso = pratiche.filter((e) => !e.notes.includes(AVVISO_RESPIRO));
    expect(senzaAvviso.map((e) => e.name)).toEqual([]);
  });

  it('l\'avviso è quello canonico, con tutte le sue voci', () => {
    VOCI_AVVISO_RESPIRO.forEach((v) => expect(AVVISO_RESPIRO).toContain(v));
    // e non si abbrevia: se qualcuno lo accorcia, questo test cade
    expect(AVVISO_RESPIRO.length).toBeGreaterThan(140);
  });

  it('ogni protocollo dice quanto dura e non è un titolo vuoto', () => {
    [...decongestione, ...donna].forEach((p) => {
      expect(p.reps.length).toBeGreaterThan(2);
      expect(p.description.length).toBeGreaterThan(150);
    });
  });

  it('il post-parto non parte senza il medico, e lo dice sulla scheda', () => {
    const postParto = donna.find((e) => /gravidanza/i.test(e.name))!;
    expect(postParto).toBeDefined();
    expect(postParto.notes).toMatch(/nulla osta|medico|ostetric/i);
  });
});
