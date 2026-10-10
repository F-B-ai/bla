import fs from 'fs';
import path from 'path';
import {
  senzaIndefiniti, campiCaduti, motivoSalvataggio,
} from '../salvataggio';
import { leggiCosto, COSTO_MASSIMO } from '../appuntamento';

// ============================================================
// «ERRORE — IMPOSSIBILE SALVARE»
// ------------------------------------------------------------
// 23 settembre 2026. Modifica appuntamento, prima lezione di un piano
// da 200 €, costo sessione lasciato vuoto — giustamente, perché la
// lezione sta dentro il pacchetto. Aggiorna. «Impossibile salvare».
//
// Il campo vuoto diventava `undefined`, Firestore rifiuta i campi
// senza valore, e il `catch` buttava via il motivo. Due difetti.
// ============================================================

describe('un campo vuoto non fa cadere il salvataggio', () => {
  it('toglie i campi senza valore', () => {
    const d = senzaIndefiniti({ notes: 'ciao', sessionCost: undefined });
    expect(d).toEqual({ notes: 'ciao' });
    expect('sessionCost' in d).toBe(false);
  });

  // Il caso peggiore: Firestore un NaN lo ACCETTA. Entra nel documento
  // e da lì in poi ogni somma che lo tocca diventa NaN, in silenzio.
  it('toglie anche i NaN, che Firestore accetterebbe', () => {
    expect(senzaIndefiniti({ sessionCost: parseFloat('abc') })).toEqual({});
  });

  it('zero, null, stringa vuota e false restano: sono valori veri', () => {
    const d = senzaIndefiniti({ a: 0, b: null, c: '', d: false });
    expect(d).toEqual({ a: 0, b: null, c: '', d: false });
  });

  it('dice quali campi ha lasciato cadere', () => {
    expect(campiCaduti({ x: undefined, y: 1, z: NaN })).toEqual(['x', 'z']);
  });
});

describe('il motivo vero arriva fino allo schermo', () => {
  it('il rifiuto del server si legge in italiano, con il codice in coda', () => {
    const m = motivoSalvataggio({ code: 'permission-denied', message: 'Missing permissions' });
    expect(m).toContain('rifiutato');
    expect(m).toContain('permission-denied');
  });

  it('la linea caduta non si confonde con un permesso negato', () => {
    const m = motivoSalvataggio({ code: 'unavailable', message: 'offline' });
    expect(m).toContain('connessione');
    expect(m).not.toContain('ruolo');
  });

  it('un errore sconosciuto non diventa silenzio: il testo tecnico resta', () => {
    const m = motivoSalvataggio(new Error('Qualcosa di mai visto'));
    expect(m).toContain('Qualcosa di mai visto');
  });

  // Il messaggio esatto che Firestore lancia, verificato con l'SDK vero.
  it('il campo senza valore si dice per nome', () => {
    const m = motivoSalvataggio(new Error(
      'Function updateDoc() called with invalid data. Unsupported field value: '
      + 'undefined (found in field sessionCost in document sessions/x)'
    ));
    expect(m).toContain('sessionCost');
    expect(m).toContain('difetto dell\'app');
  });

  it('non resta mai «Impossibile salvare» e basta', () => {
    [null, undefined, {}, ''].forEach((e) => {
      expect(motivoSalvataggio(e).length).toBeGreaterThan(30);
    });
  });
});

describe('il costo della seduta', () => {
  it('vuoto vuol dire zero, non «niente»', () => {
    expect(leggiCosto('')).toEqual({ ok: true, valore: 0 });
    expect(leggiCosto(null)).toEqual({ ok: true, valore: 0 });
    expect(leggiCosto('   ')).toEqual({ ok: true, valore: 0 });
  });

  // Su una tastiera italiana la virgola è quello che esce.
  it('accetta la virgola', () => {
    expect(leggiCosto('12,50')).toEqual({ ok: true, valore: 12.5 });
  });

  it('un testo che non è un numero si dice, non diventa NaN', () => {
    const r = leggiCosto('abc');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motivo).toContain('numero');
  });

  it('un dito scappato sulla tastiera si ferma', () => {
    const r = leggiCosto('200000');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motivo).toContain(String(COSTO_MASSIMO));
  });

  it('i centesimi si tengono, il resto no', () => {
    expect(leggiCosto('12.509')).toEqual({ ok: true, valore: 12.51 });
  });

  it('il costo vero passa intero', () => {
    expect(leggiCosto('200')).toEqual({ ok: true, valore: 200 });
  });
});

// ------------------------------------------------------------
// CHE LA SCHERMATA E I SERVIZI LO USINO DAVVERO
// ------------------------------------------------------------

const leggi = (p: string) =>
  fs.readFileSync(path.join(__dirname, '..', '..', p), 'utf8');

describe('l\'agenda è davvero collegata', () => {
  const src = leggi('screens/shared/CalendarScreen.tsx');

  it('legge il costo con leggiCosto, non con parseFloat nudo', () => {
    expect(src).toContain('leggiCosto(formCost)');
    expect(src).not.toContain('formCost ? parseFloat(formCost) : undefined');
  });

  it('non dice più «Impossibile salvare» e basta quando salva un appuntamento', () => {
    expect(src).not.toContain('crossAlert(\'Errore\', \'Impossibile salvare\')');
    expect(src).toContain('motivoSalvataggio(err)');
  });

  it('nessun catch cieco nel salvataggio dell\'appuntamento', () => {
    const inizio = src.indexOf('const handleSave');
    const fine = src.indexOf('const scalaSeduta');
    expect(inizio).toBeGreaterThan(0);
    expect(fine).toBeGreaterThan(inizio);
    expect(src.slice(inizio, fine)).not.toMatch(/}\s*catch\s*{/);
  });
});

describe('i servizi non passano più campi vuoti a Firestore', () => {
  it('le sedute: creazione e modifica', () => {
    const src = leggi('services/sessionService.ts');
    expect(src).toContain('from \'../domain/salvataggio\'');
    expect(src).toMatch(/addDoc\(collection\(db, SESSIONS_COLLECTION\), senzaIndefiniti\(/);
    expect(src).toContain('senzaIndefiniti({ ...updates })');
  });

  it('la nutrizione: creazione e modifica', () => {
    const src = leggi('services/nutritionistService.ts');
    expect(src).toContain('from \'../domain/salvataggio\'');
    expect(src).toMatch(/addDoc\(collection\(db, APPOINTMENTS_COLLECTION\), senzaIndefiniti\(/);
    expect(src).toContain('senzaIndefiniti({ ...updates })');
  });
});
