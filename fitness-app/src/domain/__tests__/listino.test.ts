import fs from 'fs';
import path from 'path';
import {
  tariffaDi, quotaCollaboratore, quotaDelGiorno, eAnnuale,
  avvisoAnnualeColTitolare, statoTetto, lunediDi, stessaSettimana,
  PREZZO_ANNUALE, PREZZO_SINGOLO, PREZZO_TITOLARE,
  QUOTA_PIENA, QUOTA_ACCORDO, TETTO_INIZIALE, quotaSuPrezzoPagato,
  VALUTAZIONE_ONLINE_MIN, VALUTAZIONE_ONLINE_MAX, controllaValutazioneOnline,
  valutazioneOnlineDovuta,
} from '../listino';
import {
  PREZZO_PRIMA_VALUTAZIONE, PREZZO_VALUTAZIONE,
} from '../protocollo';
import { CONDUTTORI } from '../protocollo';

// ============================================================
// IL LISTINO DECISO IL 23 SETTEMBRE 2026
// ------------------------------------------------------------
// Due assi: quanto si impegna l'allievo, e chi conduce. La casella
// che nasce dal loro incrocio — annuale + titolare — era rimasta
// vuota, ed è il tipo di buco che a novembre produce due versioni
// diverse della stessa cosa.
// ============================================================

describe('quanto costa una seduta', () => {
  it('annuale con un collaboratore: 30 €', () => {
    expect(tariffaDi({ conduce: 'collaboratore', annuale: true }).prezzo)
      .toBe(PREZZO_ANNUALE);
  });

  it('non annuale con un collaboratore: 35 €', () => {
    expect(tariffaDi({ conduce: 'collaboratore', annuale: false }).prezzo)
      .toBe(PREZZO_SINGOLO);
  });

  it('con il titolare: 40 €', () => {
    expect(tariffaDi({ conduce: 'titolare' }).prezzo).toBe(PREZZO_TITOLARE);
  });

  // La casella che mancava. Con il titolare i posti sono contati:
  // l'annuale non può occuparli al prezzo più basso del listino.
  it('con il titolare l\'annuale NON abbassa il prezzo', () => {
    expect(tariffaDi({ conduce: 'titolare', annuale: true }).prezzo)
      .toBe(PREZZO_TITOLARE);
  });

  it('e lo dice, invece di lasciarlo scoprire all\'allievo', () => {
    const a = avvisoAnnualeColTitolare({ conduce: 'titolare', annuale: true });
    expect(a).toContain('annuale');
    expect(a).toContain(String(PREZZO_TITOLARE));
    expect(avvisoAnnualeColTitolare({ conduce: 'titolare' })).toBeNull();
    expect(avvisoAnnualeColTitolare({ conduce: 'collaboratore', annuale: true })).toBeNull();
  });

  it('ogni tariffa dice il perché', () => {
    [
      { conduce: 'titolare' as const },
      { conduce: 'collaboratore' as const, annuale: true },
      { conduce: 'collaboratore' as const },
    ].forEach((s) => expect(tariffaDi(s).perche.length).toBeGreaterThan(20));
  });
});

describe('la sostituzione', () => {
  const sost = { conduce: 'collaboratore' as const, previsto: 'titolare' as const };

  // Se il titolare non c'è, i 5 € che valevano la sua persona non si
  // pagano. Vale verso l'allievo, non solo verso il collaboratore.
  it('prevista col titolare e condotta da un altro: si pagano 35, non 40', () => {
    expect(tariffaDi(sost).prezzo).toBe(PREZZO_SINGOLO);
    expect(tariffaDi(sost).sostituzione).toBe(true);
  });

  it('il collaboratore prende la quota dei 35', () => {
    const dopo = new Date('2026-10-05');
    expect(quotaCollaboratore(sost, dopo)).toBe(17.5);
  });

  it('una seduta normale del titolare non è una sostituzione', () => {
    expect(tariffaDi({ conduce: 'titolare', previsto: 'titolare' }).sostituzione)
      .toBe(false);
  });
});

describe('la percentuale, e la data in cui cambia', () => {
  it('fino al 30 settembre 2026 è il 60%', () => {
    expect(quotaDelGiorno(new Date('2026-09-30'))).toBe(QUOTA_PIENA);
  });

  it('dal 1° ottobre 2026 è il 50%', () => {
    expect(quotaDelGiorno(new Date('2026-10-01'))).toBe(QUOTA_ACCORDO);
  });

  // Il conto che chiude la questione: col listino nuovo il ritorno al
  // 50% non toglie un euro al collaboratore.
  it('col listino nuovo il collaboratore non ci perde', () => {
    const prima = 25 * QUOTA_PIENA; // 15 € — come stava a settembre
    const dopo = new Date('2026-10-05');
    expect(quotaCollaboratore({ conduce: 'collaboratore', annuale: true }, dopo))
      .toBe(prima); // annuale: 30 × 50% = 15, identico
    expect(quotaCollaboratore({ conduce: 'collaboratore' }, dopo))
      .toBeGreaterThan(prima); // ordinaria: 35 × 50% = 17,50
  });

  it('al titolare non va nessuna quota: le sue sedute sono sue', () => {
    expect(quotaCollaboratore({ conduce: 'titolare' }, new Date('2026-10-05'))).toBe(0);
  });
});

describe('quando un percorso è annuale', () => {
  const p = (giorni: number) => ({
    inizio: new Date('2026-01-01'),
    fine: new Date(new Date('2026-01-01').getTime() + giorni * 86400000),
  });

  it('si legge dalla durata, senza contrassegni da aggiungere ai dati', () => {
    expect(eAnnuale(p(365))).toBe(true);
    expect(eAnnuale(p(330))).toBe(true);
    expect(eAnnuale(p(90))).toBe(false);
  });

  it('un percorso senza date non è annuale per sbaglio', () => {
    expect(eAnnuale(null)).toBe(false);
    expect(eAnnuale({})).toBe(false);
    expect(eAnnuale({ inizio: new Date('2026-01-01'), fine: null })).toBe(false);
  });
});

describe('i posti della settimana', () => {
  it('si comincia da dieci', () => {
    expect(TETTO_INIZIALE).toBe(10);
    expect(statoTetto(3).tetto).toBe(10);
  });

  it('il tetto si alza quando si decide di alzarlo', () => {
    expect(statoTetto(12, 18).livello).toBe('sotto');
    expect(statoTetto(12, 18).restano).toBe(6);
  });

  it('dice a che punto è la settimana', () => {
    expect(statoTetto(3, 10).livello).toBe('sotto');
    expect(statoTetto(8, 10).livello).toBe('vicino');
    expect(statoTetto(10, 10).livello).toBe('pieno');
    expect(statoTetto(12, 10).livello).toBe('oltre');
  });

  // Oltre il tetto non è un errore da bloccare: è un'informazione.
  // Chi si allena decide il carico, deve solo poterlo leggere.
  it('oltre il tetto lo dice, e dice di quanto', () => {
    expect(statoTetto(13, 10).frase).toContain('3 oltre');
  });

  it('la frase c\'è sempre, a qualsiasi livello', () => {
    [0, 5, 9, 10, 15].forEach((n) =>
      expect(statoTetto(n, 10).frase.length).toBeGreaterThan(10));
  });

  it('un tetto a zero non manda in confusione il conto', () => {
    expect(statoTetto(3, 0).tetto).toBe(TETTO_INIZIALE);
  });
});

describe('la settimana comincia di lunedì', () => {
  it('lunedì è il primo giorno, domenica l\'ultimo', () => {
    const lun = new Date(2026, 8, 21); // lunedì 21 settembre 2026
    const dom = new Date(2026, 8, 27); // domenica 27
    expect(lunediDi(lun).getDate()).toBe(21);
    expect(lunediDi(dom).getDate()).toBe(21);
    expect(stessaSettimana(lun, dom)).toBe(true);
  });

  // Contare da domenica farebbe cadere il sabato nella settimana dopo.
  it('il lunedì successivo è un\'altra settimana', () => {
    expect(stessaSettimana(new Date(2026, 8, 27), new Date(2026, 8, 28))).toBe(false);
  });

  it('l\'ora del giorno non sposta la settimana', () => {
    const mattina = new Date(2026, 8, 23, 7, 0);
    const sera = new Date(2026, 8, 23, 23, 30);
    expect(stessaSettimana(mattina, sera)).toBe(true);
  });
});

// ------------------------------------------------------------
// IL LISTINO HA UN POSTO SOLO
// ------------------------------------------------------------

describe('nessuna seconda copia dei prezzi', () => {
  // I 40 e i 35 stavano scritti in protocollo.ts, e da lì finiscono
  // sul documento che si consegna all'allievo. Due copie dello stesso
  // prezzo divergono sempre, e quella sbagliata la scopre chi paga.
  it('il documento del cliente usa gli stessi numeri del listino', () => {
    const f = CONDUTTORI.find((c) => c.id === 'francesco');
    const g = CONDUTTORI.find((c) => c.id === 'giuseppe');
    expect(f!.prezzo).toBe(PREZZO_TITOLARE);
    expect(g!.prezzo).toBe(PREZZO_SINGOLO);
  });

  it('i prezzi non sono scritti a mano da nessun\'altra parte', () => {
    const p = fs.readFileSync(
      path.join(__dirname, '..', 'protocollo.ts'), 'utf8'
    );
    expect(p).toContain('PREZZO_TITOLARE');
    expect(p).not.toMatch(/prezzo:\s*40\b/);
    expect(p).not.toMatch(/prezzo:\s*35\b/);
  });
});

describe('l\'agenda è davvero collegata', () => {
  const leggi = (p: string) =>
    fs.readFileSync(path.join(__dirname, '..', '..', p), 'utf8');
  const agenda = leggi('screens/shared/CalendarScreen.tsx');
  const modale = leggi('screens/shared/calendar/AppointmentModal.tsx');

  it('la tariffa si propone dal listino, non a mano', () => {
    expect(agenda).toContain("from '../../domain/listino'");
    expect(agenda).toContain('tariffaDi(');
    expect(agenda).toContain('setFormCost(String(tariffa.prezzo))');
  });

  // In modifica il costo è già stato deciso una volta: riscriverlo
  // cambierebbe i conti alle spalle di chi apre la schermata.
  it('in modifica il costo non si sovrascrive mai', () => {
    const blocco = agenda.slice(agenda.indexOf('La proposta riempie il campo'));
    expect(blocco).toContain('if (!showModal || editingItem) return;');
    expect(blocco).toContain('if (formCost) return;');
  });

  it('il modale dice da dove viene il prezzo', () => {
    expect(modale).toContain('tariffaPerche');
    expect(modale).toContain('avvisoTariffa');
  });

  it('e mostra i posti del titolare nella settimana', () => {
    expect(agenda).toContain('statoTetto(');
    expect(agenda).toContain('stessaSettimana(');
    expect(modale).toContain('tettoFrase');
  });

  // Il tetto è un contatore, non un cancello: se il titolare decide di
  // fare la undicesima seduta, la fa. Il numero lo dice, e basta.
  it('il tetto non impedisce di salvare', () => {
    expect(agenda).not.toMatch(/tetto[\s\S]{0,200}crossAlert\([^)]*[Tt]etto/);
    expect(agenda).not.toMatch(/livello === 'oltre'[\s\S]{0,120}return;/);
  });
});

// ------------------------------------------------------------
// LO SCONTO FEDELTÀ LO PAGANO IN DUE
// ------------------------------------------------------------
// Decisione del 28 settembre 2026. La quota del collaboratore si
// calcola su quello che l'allievo paga davvero, non sul listino
// pieno. Un allievo che resta due anni è un allievo che il
// collaboratore ha tenuto: la fedeltà l'hanno costruita in due, e il
// suo costo lo pagano in due.

describe('la quota quando c\'è uno sconto', () => {
  const dopo = new Date('2026-10-05');
  const seduta = { conduce: 'collaboratore' as const };

  it('seduta da 35 € scontata del 20%: al collaboratore vanno 14, non 17,50', () => {
    const pagato = 35 * 0.8; // 28
    expect(quotaSuPrezzoPagato(seduta, dopo, pagato)).toBe(14);
    // e non la quota sul listino pieno
    expect(quotaSuPrezzoPagato(seduta, dopo, pagato))
      .not.toBe(quotaCollaboratore(seduta, dopo));
  });

  it('senza sconto il conto coincide con quello di listino', () => {
    expect(quotaSuPrezzoPagato(seduta, dopo, PREZZO_SINGOLO))
      .toBe(quotaCollaboratore(seduta, dopo));
  });

  it('lo studio e il collaboratore perdono la stessa cifra', () => {
    const pieno = PREZZO_SINGOLO;               // 35
    const scontato = Math.round(pieno * 0.8 * 100) / 100; // 28
    const quotaPrima = quotaCollaboratore(seduta, dopo);
    const quotaDopo = quotaSuPrezzoPagato(seduta, dopo, scontato);
    const studioPrima = pieno - quotaPrima;
    const studioDopo = scontato - quotaDopo;
    expect(quotaPrima - quotaDopo).toBeCloseTo(studioPrima - studioDopo, 2);
  });

  it('al titolare non va niente nemmeno con lo sconto', () => {
    expect(quotaSuPrezzoPagato({ conduce: 'titolare' }, dopo, 32)).toBe(0);
  });

  it('un prezzo assurdo non genera una quota negativa', () => {
    expect(quotaSuPrezzoPagato(seduta, dopo, -50)).toBe(0);
  });
});

// ------------------------------------------------------------
// LA VALUTAZIONE: LA PRIMA HA UN PREZZO, LE ALTRE LE DECIDE LUI
// ------------------------------------------------------------
// Deciso il 28 settembre 2026. Una rivalutazione può essere il ciclo
// completo o il controllo di due test: far pagare uguale due lavori
// diversi fa sentire qualcuno preso in giro.

describe('prima valutazione e rivalutazioni', () => {
  const fs = require('fs');
  const path = require('path');

  it('la prima ha un prezzo di listino', () => {
    expect(PREZZO_PRIMA_VALUTAZIONE).toBe(150);
  });

  it('il nome vecchio continua a funzionare e punta allo stesso numero', () => {
    expect(PREZZO_VALUTAZIONE).toBe(PREZZO_PRIMA_VALUTAZIONE);
  });

  // Il sito non deve far credere che ogni valutazione costi 150: chi
  // torna dopo tre mesi arriverebbe con l'aspettativa sbagliata, e
  // qualunque cifra diversa sembrerebbe un'improvvisazione.
  it('il sito dice «prima valutazione», e che le altre si concordano', () => {
    const studio = fs.readFileSync(
      path.join(__dirname, '..', '..', '..', 'public', 'studio.html'), 'utf8'
    );
    expect(studio).toContain('Prima valutazione');
    expect(studio).toContain('Valutazioni successive');
    expect(studio).toContain('si concordano');
    expect(studio).not.toContain('Valutazione completa');
  });
});

describe('la valutazione a distanza', () => {
  it('sta fra 50 e 100 €', () => {
    expect(VALUTAZIONE_ONLINE_MIN).toBe(50);
    expect(VALUTAZIONE_ONLINE_MAX).toBe(100);
    [50, 60, 80, 100].forEach((n) =>
      expect(controllaValutazioneOnline(n).ok).toBe(true));
  });

  it('sotto i 50 non copre il tempo che costa', () => {
    const r = controllaValutazioneOnline(40);
    expect(r.ok).toBe(false);
    expect(r.motivo).toContain('50');
  });

  // Costa meno perché VALE meno: a distanza manca l'osservazione dal
  // vivo. Il messaggio lo dice, invece di far sembrare il limite una
  // regola arbitraria.
  it('sopra i 100 spiega perché, invece di dire solo «no»', () => {
    const r = controllaValutazioneOnline(150);
    expect(r.ok).toBe(false);
    expect(r.motivo).toContain('osservazione dal vivo');
  });

  it('costa meno della prima valutazione in studio', () => {
    expect(VALUTAZIONE_ONLINE_MAX).toBeLessThan(PREZZO_PRIMA_VALUTAZIONE);
  });
});

describe('chi entra nel percorso non paga la valutazione', () => {
  it('compresa nei tre mesi', () => {
    expect(valutazioneOnlineDovuta(true)).toBe(0);
    expect(valutazioneOnlineDovuta(true, 100)).toBe(0);
  });

  it('chi vuole solo la valutazione la paga, nella forchetta', () => {
    expect(valutazioneOnlineDovuta(false, 80)).toBe(80);
    expect(valutazioneOnlineDovuta(false, 50)).toBe(50);
  });

  it('un importo fuori forchetta viene riportato dentro, non passa', () => {
    expect(valutazioneOnlineDovuta(false, 200)).toBe(VALUTAZIONE_ONLINE_MAX);
    expect(valutazioneOnlineDovuta(false, 10)).toBe(VALUTAZIONE_ONLINE_MIN);
  });

  // Un numero solo si decide; due numeri si confrontano, e mentre si
  // confrontano non si compra.
  it('la pagina dice che è compresa, e che il colloquio non si paga', () => {
    const pagina = fs.readFileSync(
      path.join(__dirname, '..', '..', '..', 'public', 'premium.html'), 'utf8'
    );
    expect(pagina).toContain('La valutazione iniziale è compresa');
    expect(pagina).toContain('da 50 a 100');
    expect(pagina).toContain('Il colloquio non si paga');
  });
});
