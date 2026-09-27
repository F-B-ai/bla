import fs from 'fs';
import path from 'path';
import {
  misureRidotte, daRidurre, risparmioStimato, pesoBase64MB, troppoPesante,
  LATO_MASSIMO, QUALITA, PESO_MASSIMO_MB,
} from '../foto';

// ============================================================
// LE FOTO CHE HANNO UCCISO LA FUNZIONE
// ------------------------------------------------------------
// 27 settembre 2026, 19:16, con un allievo davanti: errore 502.
// Quattro foto a risoluzione piena, e 256 MiB di memoria sul server
// che finiscono. La memoria è stata alzata quella sera; qui c'è la
// cura: si riduce prima di partire.
// ============================================================

describe('quanto si riduce', () => {
  it('una foto da telefono scende a 1280 sul lato lungo', () => {
    // 4032×3024, l'uscita tipica di un iPhone in orizzontale.
    expect(misureRidotte({ larghezza: 4032, altezza: 3024 }))
      .toEqual({ larghezza: 1280, altezza: 960 });
  });

  it('in verticale il lato lungo resta l\'altezza', () => {
    expect(misureRidotte({ larghezza: 3024, altezza: 4032 }))
      .toEqual({ larghezza: 960, altezza: 1280 });
  });

  it('le proporzioni non si toccano', () => {
    const p = { larghezza: 4000, altezza: 2250 }; // 16:9
    const r = misureRidotte(p);
    expect(r.larghezza / r.altezza).toBeCloseTo(p.larghezza / p.altezza, 2);
  });

  // Ingrandire non aggiunge informazione: aggiunge peso e sfocatura.
  it('una foto già piccola NON si ingrandisce', () => {
    expect(misureRidotte({ larghezza: 800, altezza: 600 }))
      .toEqual({ larghezza: 800, altezza: 600 });
    expect(daRidurre({ larghezza: 800, altezza: 600 })).toBe(false);
  });

  it('esattamente al limite non si tocca', () => {
    expect(daRidurre({ larghezza: LATO_MASSIMO, altezza: 900 })).toBe(false);
    expect(daRidurre({ larghezza: LATO_MASSIMO + 1, altezza: 900 })).toBe(true);
  });

  it('nessuna misura scende mai a zero', () => {
    const r = misureRidotte({ larghezza: 9000, altezza: 3 });
    expect(r.larghezza).toBeGreaterThan(0);
    expect(r.altezza).toBeGreaterThan(0);
  });

  it('misure assurde non fanno esplodere il conto', () => {
    [{ larghezza: 0, altezza: 0 }, { larghezza: -5, altezza: 10 }].forEach((m) => {
      const r = misureRidotte(m);
      expect(Number.isFinite(r.larghezza)).toBe(true);
      expect(r.larghezza).toBeGreaterThan(0);
    });
  });
});

describe('quanto si risparmia', () => {
  // Il peso va con l'AREA, non col lato: è il motivo per cui questa
  // riduzione risolve il problema invece di alleviarlo.
  it('una foto da telefono perde circa nove decimi del peso', () => {
    const r = risparmioStimato({ larghezza: 4032, altezza: 3024 });
    expect(r).toBeGreaterThan(85);
    expect(r).toBeLessThan(95);
  });

  it('una foto già piccola non risparmia niente', () => {
    expect(risparmioStimato({ larghezza: 800, altezza: 600 })).toBe(0);
  });

  it('il base64 pesa un terzo in più dei byte', () => {
    expect(pesoBase64MB(4 * 1024 * 1024)).toBe(3);
  });
});

describe('quando non basta', () => {
  it('il messaggio dice il peso, il limite e che cosa fare', () => {
    const m = troppoPesante(38);
    expect(m).toContain('38 MB');
    expect(m).toContain(String(PESO_MASSIMO_MB));
    expect(m).toContain('ritagliane i bordi');
  });

  // La regola che protegge la valutazione: si stringe sulla stanza,
  // mai sulla persona. Senza i piedi si perde il riferimento a terra.
  it('avverte di non ritagliare la persona', () => {
    const m = troppoPesante(38);
    expect(m).toContain('mai la persona');
    expect(m).toContain('piedi');
  });
});

describe('la qualità scelta', () => {
  it('sta sopra la soglia dove compaiono i gradini', () => {
    expect(QUALITA).toBeGreaterThanOrEqual(0.8);
    expect(QUALITA).toBeLessThan(1);
  });
});

// ------------------------------------------------------------
// CHE SIA DAVVERO COLLEGATO
// ------------------------------------------------------------

describe('ogni immagine che parta passa di qui', () => {
  const ai = fs.readFileSync(
    path.join(__dirname, '..', '..', 'services', 'aiService.ts'), 'utf8'
  );

  it('la riduzione sta nel punto da cui passano tutte le funzioni AI', () => {
    expect(ai).toContain("from '../domain/foto'");
    expect(ai).toContain('riduciSeServe');
  });

  // Si riduce PRIMA di pesare, altrimenti il controllo respinge foto
  // che dopo la riduzione sarebbero state perfettamente utilizzabili.
  it('si riduce prima di controllare il peso', () => {
    const i = ai.indexOf('const ridotta = await riduciSeServe(blob)');
    const j = ai.indexOf('ridotta.size > PESO_MASSIMO_MB');
    expect(i).toBeGreaterThan(0);
    expect(j).toBeGreaterThan(i);
  });

  it('si spedisce la ridotta, non l\'originale', () => {
    expect(ai).toContain('reader.readAsDataURL(ridotta)');
    expect(ai).not.toContain('reader.readAsDataURL(blob)');
  });

  // Una foto pesante che parte è meglio di una valutazione che non si
  // fa: il server adesso la regge.
  it('se la riduzione non riesce, la foto parte lo stesso', () => {
    const blocco = ai.slice(ai.indexOf('const riduciSeServe'));
    expect(blocco.slice(0, 2000)).toMatch(/catch\s*\{\s*return blob;/);
  });

  it('e non si tiene una ridotta più pesante dell\'originale', () => {
    expect(ai).toContain('fatta.size < blob.size ? fatta : blob');
  });
});
