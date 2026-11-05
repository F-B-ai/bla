// ============================================================
// IL FOGLIO CHE ESCE DALLO STUDIO
// ------------------------------------------------------------
// Questo documento finisce sul tavolo del commercialista. Un numero
// sbagliato o una riga che promette più di quanto i dati reggono non
// è un difetto dell'applicazione: è una cosa falsa detta a chi deve
// consigliare, e poi detta a suo nome a qualcun altro.
//
// I test guardano tre cose: che i numeri stampati siano quelli
// calcolati, che le avvertenze ci siano SEMPRE — anche quando non c'è
// niente da segnalare — e che un nome con dentro una parentesi
// angolare non rompa la pagina.
// ============================================================

import { documentoRegistro, DatiDocumentoRegistro } from '../documentoRegistro';
import { componiRegistro, AVVERTENZE } from '../registroPresenze';

const base = (): DatiDocumentoRegistro => ({
  registro: componiRegistro({
    sedute: [
      {
        id: 's1', studentId: 'a1', collaboratorId: 'c1',
        date: new Date('2026-10-05T10:00:00'), startTime: '10:00',
        status: 'completed', createdAt: new Date('2026-10-19T21:00:00'),
      },
      {
        id: 's2', studentId: 'a1', collaboratorId: 'c1',
        date: new Date('2026-10-07T10:00:00'), startTime: '11:00',
        status: 'completed', createdAt: new Date('2026-10-07T12:00:00'),
      },
    ],
    ingressi: [
      { id: 'i1', studentId: 'a1', studentName: 'Arianna Russo', timestamp: new Date('2026-10-09T18:30:00') },
    ],
    nomeAllievo: () => 'Arianna Russo',
    nomeConduttore: () => 'Giuseppe Palumbo',
  }),
  avvertenze: AVVERTENZE,
  nomeAllievo: () => 'Arianna Russo',
  nomeConduttore: () => 'Giuseppe Palumbo',
  ente: 'A.S.D. Evolution Sport',
  sede: 'Mind Movement Lab · Gragnano (NA)',
});

describe('l\'intestazione dice di chi è il foglio', () => {
  const d = documentoRegistro(base());

  it('porta l\'ente e la sede', () => {
    expect(d.html).toContain('A.S.D. Evolution Sport');
    expect(d.html).toContain('Gragnano');
  });

  it('dice quando è stato estratto e che è un documento interno', () => {
    expect(d.html).toMatch(/Estratto il/);
    expect(d.html).toMatch(/Documento interno/);
  });

  it('dichiara il periodo coperto, in giorno\/mese\/anno', () => {
    expect(d.html).toContain('05/10/2026');
    expect(d.html).toContain('09/10/2026');
  });
});

describe('i numeri stampati sono quelli calcolati', () => {
  const dati = base();
  const d = documentoRegistro(dati);

  it('due sedute svolte, un ingresso', () => {
    expect(d.html).toMatch(/<div class="v">2<\/div><div class="e">Sedute svolte/);
    expect(d.html).toMatch(/<div class="v">1<\/div><div class="e">Ingressi registrati/);
  });

  it('e nessuna ancora da svolgere, perché sono tutte passate', () => {
    expect(d.html).toMatch(/<div class="v">0<\/div><div class="e">Ancora da svolgere/);
  });

  it('una sola seduta risulta scritta dopo', () => {
    expect(dati.registro.righeInRitardo).toHaveLength(1);
    expect(d.html).toMatch(/<div class="v">1<\/div><div class="e">Scritte dopo/);
  });

  it('la seduta scritta dopo porta il suo giorno, la sua scrittura e i giorni', () => {
    expect(d.html).toContain('05/10/2026');
    expect(d.html).toContain('19/10/2026');
    expect(d.html).toMatch(/<td class="n">14<\/td>/);
  });

  it('la seduta scritta puntualmente NON finisce nell\'elenco dei ritardi', () => {
    const sezione = d.html.slice(
      d.html.indexOf('3 · Sedute scritte dopo'),
      d.html.indexOf('4 · Ingressi di chi svolge')
    );
    expect(sezione).not.toContain('07/10/2026');
  });

  it('l\'ingresso scoperto compare col nome e l\'ora', () => {
    const sezione = d.html.slice(d.html.indexOf('4 · Ingressi di chi svolge'));
    expect(sezione).toContain('09/10/2026');
    expect(sezione).toContain('18:30');
    expect(sezione).toContain('Arianna Russo');
  });
});

describe('quando non c\'è niente da segnalare, lo dice', () => {
  const vuoto = documentoRegistro({
    ...base(),
    registro: componiRegistro({
      sedute: [], ingressi: [], nomeAllievo: () => '', nomeConduttore: () => '',
    }),
  });

  it('non lascia una tabella vuota che sembra un errore', () => {
    expect(vuoto.html).toContain('Nessuna seduta nel periodo');
    expect(vuoto.html).toMatch(/Nessuna seduta risulta scritta dopo/);
    expect(vuoto.html).toMatch(/Ogni ingresso registrato trova una seduta/);
    expect(vuoto.html).toContain('Nessuna seduta svolta nel periodo');
  });

  it('e stampa lo stesso le avvertenze: valgono anche per un foglio vuoto', () => {
    AVVERTENZE.forEach((a) => {
      expect(vuoto.html).toContain(a.slice(0, 40));
    });
  });
});

describe('le avvertenze sono sempre sul foglio', () => {
  const d = documentoRegistro(base());

  it('tutte e cinque, numerate', () => {
    expect(d.html).toMatch(/<ol class="avvertenze">/);
    expect((d.html.match(/<li>/g) || []).length).toBe(AVVERTENZE.length);
  });

  it('e in fondo c\'è scritto che nessun dato è stato scelto a mano', () => {
    expect(d.html).toMatch(/Nessun dato è stato inserito, modificato o selezionato a mano/);
  });

  it('il documento non conclude niente al posto di chi legge', () => {
    const t = d.html.toLowerCase();
    ['ammanco', 'sottratto', 'non ha registrato', 'grave', 'irregolare'].forEach((parola) => {
      expect(t).not.toContain(parola);
    });
  });
});

describe('un nome non può rompere la pagina', () => {
  it('le parentesi angolari nei nomi vengono neutralizzate', () => {
    const d = documentoRegistro({
      ...base(),
      nomeAllievo: () => '<script>alert(1)</script>',
      nomeConduttore: () => 'Mario <b>Rossi</b>',
      ente: 'A.S.D. <Evolution> Sport',
    });
    expect(d.html).not.toContain('<script>');
    expect(d.html).toContain('&lt;script&gt;');
    expect(d.html).toContain('Mario &lt;b&gt;Rossi&lt;/b&gt;');
    expect(d.html).toContain('A.S.D. &lt;Evolution&gt; Sport');
  });
});

describe('un elenco lunghissimo non mente per omissione', () => {
  it('se taglia le righe, dice quante ne ha tagliate', () => {
    const sedute = Array.from({ length: 250 }, (_, i) => ({
      id: `s${i}`, studentId: 'a1', collaboratorId: 'c1',
      date: new Date('2026-10-05T10:00:00'), startTime: '10:00',
      status: 'completed', createdAt: new Date('2026-10-19T10:00:00'),
    }));
    const d = documentoRegistro({
      ...base(),
      registro: componiRegistro({
        sedute, ingressi: [], nomeAllievo: () => 'X', nomeConduttore: () => 'Y',
      }),
    });
    expect(d.html).toMatch(/Elencate le prime 200 righe su 250/);
  });
});

describe('il foglio è impaginato per la carta', () => {
  const d = documentoRegistro(base());

  it('A4 con i margini, non uno schermo', () => {
    expect(d.css).toMatch(/@page \{ size: A4/);
  });

  it('i numeri in colonna sono allineati per essere confrontati', () => {
    expect(d.css).toMatch(/tabular-nums/);
  });
});

// ============================================================
// LE TRE CORREZIONI DEL 12 OTTOBRE 2026
// ------------------------------------------------------------
// Sui dati veri il primo documento presentava numeri veri in modo
// fuorviante. Per un foglio destinato a un professionista è peggio di
// un errore di calcolo, perché non si nota.
// ============================================================

describe('il documento separa il fatto dal da fare', () => {
  const conFutura = documentoRegistro({
    ...base(),
    registro: componiRegistro({
      sedute: [
        {
          id: 'p', studentId: 'a1', collaboratorId: 'c1',
          date: new Date('2026-10-05T10:00:00'), startTime: '10:00',
          status: 'completed', createdAt: new Date('2026-10-05T10:00:00'),
        },
        {
          id: 'f', studentId: 'a1', collaboratorId: 'c1',
          date: new Date('2026-10-20T10:00:00'), startTime: '10:00',
          status: 'scheduled', createdAt: new Date('2026-10-05T10:00:00'),
        },
      ],
      ingressi: [], nomeAllievo: () => 'A', nomeConduttore: () => 'G',
    }, new Date('2026-10-12T12:00:00')),
  });

  it('una svolta e una ancora da svolgere, in due caselle diverse', () => {
    expect(conFutura.html).toMatch(/<div class="v">1<\/div><div class="e">Sedute svolte/);
    expect(conFutura.html).toMatch(/<div class="v">1<\/div><div class="e">Ancora da svolgere/);
  });

  it('e non esiste più una casella che somma le due cose', () => {
    expect(conFutura.html).not.toContain('Sedute registrate');
  });
});

describe('la tabella mese per mese', () => {
  const d = documentoRegistro({
    ...base(),
    registro: componiRegistro({
      sedute: [
        { id: '1', studentId: 'a1', collaboratorId: 'c1', date: new Date('2026-09-03T10:00:00'), startTime: '9:00', status: 'completed', createdAt: new Date('2026-09-03T10:00:00') },
        { id: '2', studentId: 'a1', collaboratorId: 'c2', date: new Date('2026-10-01T10:00:00'), startTime: '9:00', status: 'completed', createdAt: new Date('2026-10-01T10:00:00') },
      ],
      ingressi: [],
      nomeAllievo: () => 'A',
      nomeConduttore: (id: string) => (id === 'c1' ? 'Giuseppe' : 'Francesco'),
    }, new Date('2026-10-12T12:00:00')),
    nomeConduttore: (id: string) => (id === 'c1' ? 'Giuseppe' : 'Francesco'),
  });

  it('i mesi sono scritti a parole, non come codici', () => {
    expect(d.html).toContain('set 2026');
    expect(d.html).toContain('ott 2026');
  });

  it('ogni conduttore ha la sua colonna, e c\'è il totale del mese', () => {
    const sezione = d.html.slice(d.html.indexOf('1 · Sedute per mese'), d.html.indexOf('2 · Riepilogo'));
    expect(sezione).toContain('Giuseppe');
    expect(sezione).toContain('Francesco');
    expect(sezione).toContain('Totale');
  });
});

describe('chi viene solo in sala non riempie l\'elenco', () => {
  const d = documentoRegistro({
    ...base(),
    registro: componiRegistro({
      sedute: [
        { id: 's', studentId: 'a1', collaboratorId: 'c1', date: new Date('2026-10-05T10:00:00'), startTime: '10:00', status: 'completed', createdAt: new Date('2026-10-05T10:00:00') },
      ],
      ingressi: [
        { id: 'i1', studentId: 'a1', studentName: 'Arianna', timestamp: new Date('2026-10-09T18:00:00') },
        { id: 'i2', studentId: 'sala', studentName: 'Chi viene in sala', timestamp: new Date('2026-10-09T19:00:00') },
        { id: 'i3', studentId: 'sala', studentName: 'Chi viene in sala', timestamp: new Date('2026-10-10T19:00:00') },
      ],
      nomeAllievo: () => 'Arianna', nomeConduttore: () => 'Giuseppe',
    }, new Date('2026-10-12T12:00:00')),
  });

  it('l\'elenco tiene solo chi le sedute le fa', () => {
    const sezione = d.html.slice(d.html.indexOf('4 · Ingressi di chi svolge'));
    expect(sezione).toContain('Arianna');
    expect(sezione).not.toContain('Chi viene in sala');
  });

  it('ma dice quanti ingressi ha lasciato fuori, e di quante persone', () => {
    expect(d.html).toMatch(/restano fuori 2 ingressi di 1 iscritti/);
  });

  it('e li chiama per quello che sono: persone che si allenano in autonomia', () => {
    expect(d.html).toMatch(/si allenano in autonomia/);
  });
});
