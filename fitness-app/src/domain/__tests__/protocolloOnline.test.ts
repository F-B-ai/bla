import {
  PROCEDURA_ONLINE, DOMANDE_A_DISTANZA, FUORI_PORTATA,
  MESI, INCONTRI_MESE, SETTIMANE_CHECK,
} from '../protocolloOnline';
import { PROCEDURA } from '../protocollo';

// ============================================================
// LA PROCEDURA A DISTANZA NON È QUELLA IN STUDIO CON MENO COSE
// ------------------------------------------------------------
// A distanza cambiano tre fatti: manca la mezz'ora di osservazione
// dal vivo, il tempo è scandito dal pacchetto, e nessuno corregge
// l'esecuzione mentre avviene. Ognuno cambia il lavoro.
// ============================================================

describe('la forma è la stessa di quella in studio', () => {
  // Due procedure con due strutture diverse diventano due mondi, e
  // chi lavora in tutti e due si perde.
  it('ogni passo dichiara le stesse quattro cose', () => {
    PROCEDURA_ONLINE.forEach((p) => {
      expect(p.fase.length).toBeGreaterThan(5);
      expect(p.cosaFare.length).toBeGreaterThan(30);
      expect(p.strumento.length).toBeGreaterThan(10);
      expect(p.alternativa.length).toBeGreaterThan(30);
      expect(p.siPassaOltreQuando.length).toBeGreaterThan(15);
    });
  });

  it('i numeri sono in ordine e senza buchi', () => {
    expect(PROCEDURA_ONLINE.map((p) => p.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  // La colonna che conta: finché non è vera, il passo non è chiuso.
  it('nessun passo si può chiudere senza una condizione verificabile', () => {
    PROCEDURA_ONLINE.forEach((p) => {
      expect(p.siPassaOltreQuando).not.toMatch(/quando (sembra|si sente|va bene)/i);
    });
  });
});

describe('quello che a distanza cambia davvero', () => {
  const tutto = JSON.stringify(PROCEDURA_ONLINE).toLowerCase();

  // In studio nessuno comincia senza essere stato visto muovere. Da
  // lontano quella mezz'ora non c'è, e non si può fingere che le foto
  // la sostituiscano.
  it('dice che l\'osservazione dal vivo manca, invece di far finta', () => {
    expect(tutto).toContain('non c\'è');
    expect(tutto).toMatch(/più a lungo|chiede di più/);
  });

  it('una foto sbagliata ferma il percorso, non lo rallenta', () => {
    const p = PROCEDURA_ONLINE.find((x) => x.n === 2)!;
    expect(p.alternativa).toContain('PRIMA di andare avanti');
    expect(p.siPassaOltreQuando).toContain('intera');
  });

  // Nessuno sposta una mano al posto suo: l'esercizio deve reggere
  // da solo o non va nella scheda.
  it('un esercizio che non si spiega da solo non entra nella scheda', () => {
    const p = PROCEDURA_ONLINE.find((x) => x.n === 5)!;
    expect(p.alternativa).toContain('NON va nella scheda');
    expect(p.alternativa).toMatch(/più semplice/);
  });

  it('il dubbio sanitario ferma la partenza, e si restituisce la rata', () => {
    const p = PROCEDURA_ONLINE.find((x) => x.n === 3)!;
    expect(p.alternativa).toContain('non si parte');
    expect(p.alternativa).toContain('restituisce');
  });
});

describe('i numeri del pacchetto sono quelli del documento firmato', () => {
  it('tre mesi, tre incontri al mese, check ogni quattro settimane', () => {
    expect(MESI).toBe(3);
    expect(INCONTRI_MESE).toBe(3);
    expect(SETTIMANE_CHECK).toBe(4);
  });

  it('il ritmo del check è scritto nel passo, non ricordato a parte', () => {
    const p = PROCEDURA_ONLINE.find((x) => x.n === 7)!;
    expect(p.fase).toContain(String(SETTIMANE_CHECK));
  });

  it('il percorso si chiude alla fine del terzo mese, e la chiusura è un passo', () => {
    const ultimo = PROCEDURA_ONLINE[PROCEDURA_ONLINE.length - 1];
    expect(ultimo.fase).toContain('terzo mese');
    expect(ultimo.siPassaOltreQuando).toContain('anche quando la decisione è no');
  });
});

describe('i confini, detti per nome', () => {
  it('c\'è un elenco di cose che a distanza non si fanno', () => {
    expect(FUORI_PORTATA.length).toBeGreaterThanOrEqual(4);
  });

  it('il dolore in corso e l\'alimentazione sono fuori', () => {
    const t = FUORI_PORTATA.join(' ').toLowerCase();
    expect(t).toContain('dolore');
    expect(t).toContain('alimentari');
  });

  it('le domande prima del check guardano a che cosa si è visto davvero', () => {
    expect(DOMANDE_A_DISTANZA.length).toBeGreaterThanOrEqual(4);
    expect(DOMANDE_A_DISTANZA.join(' ')).toContain('che cosa sto deducendo');
    // La stessa domanda finale della procedura in studio: il limite
    // del proprio ruolo si chiede in tutti e due i mondi.
    expect(DOMANDE_A_DISTANZA.join(' ')).toContain('non è mio da decidere');
  });
});

describe('le due procedure restano due, e nessuna mangia l\'altra', () => {
  it('quella in studio non è stata toccata', () => {
    expect(PROCEDURA.length).toBeGreaterThanOrEqual(8);
    expect(PROCEDURA[0].fase).toContain('Prima sessione');
  });

  it('e quella a distanza non parla di sedute in sala', () => {
    const t = JSON.stringify(PROCEDURA_ONLINE).toLowerCase();
    expect(t).not.toContain('in sala');
    expect(t).not.toContain('sala pesi');
  });
});
