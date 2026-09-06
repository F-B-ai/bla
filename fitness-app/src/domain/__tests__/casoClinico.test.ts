import { CasoClinico, controllaCaso, casiPer, misureConfrontabili } from '../casoClinico';

// ============================================================
// UN CASO CLINICO È VERO, ANONIMO, E NEL PUBBLICO GIUSTO
// ------------------------------------------------------------
// Il libro dichiara «i nomi sono stati cambiati, ma i dati sono
// autentici». Questi test tengono in piedi quella frase.
// ============================================================

const base = (): CasoClinico => ({
  id: 'c1',
  titolo: 'Marco, 52 anni — L\'imprenditore che non dormiva',
  nomeDiFantasia: true,
  pubblico: 'allievo',
  arrivo: 'Voleva perdere dieci chili. Dormiva quattro ore e beveva sei caffè al giorno.',
  svolta: 'Il primo giorno non l\'ho fatto allenare: l\'ho fatto respirare.',
  misure: [{ etichetta: 'HRV basale', partenza: '28 ms', arrivo: '54 ms', quando: '12 settimane' }],
  fasi: [{ titolo: 'Ricostruire il respiro', settimane: '1-4', cosaSiFa: 'Respiro diaframmatico, nessun carico.' }],
  esito: 'Ha smesso l\'ansiolitico, con il suo medico. Dorme sette ore.',
  daRicordare: 'L\'obiettivo dichiarato quasi mai è il problema.',
});

describe('il perimetro vale anche per i contenuti', () => {
  // È il controllo più importante: una storia ispira, un
  // protocollo per una condizione clinica letto da chi non è
  // formato diventa auto-trattamento.
  it('un caso con protocollo non può essere mostrato a un allievo', () => {
    const c = { ...base(), protocollo: 'Fase 1: decompressione lombare, 3x/sett...' };
    const r = controllaCaso(c);
    expect(r.valido).toBe(false);
    expect(r.problemi[0]).toContain('non può essere mostrato a un allievo');
  });

  it('lo stesso caso, marcato per gli operatori, è valido', () => {
    const c: CasoClinico = { ...base(), pubblico: 'operatore', protocollo: 'Fase 1: ...' };
    expect(controllaCaso(c).valido).toBe(true);
  });

  it('un protocollo vuoto o di soli spazi non fa scattare la regola', () => {
    expect(controllaCaso({ ...base(), protocollo: '' }).valido).toBe(true);
    expect(controllaCaso({ ...base(), protocollo: '   ' }).valido).toBe(true);
  });
});

describe('nessun nome vero esce per distrazione', () => {
  it('il nome di fantasia va dichiarato: non basta ometterlo', () => {
    expect(controllaCaso({ ...base(), nomeDiFantasia: false }).valido).toBe(false);
    expect(controllaCaso({ ...base(), nomeDiFantasia: undefined as any }).valido).toBe(false);
  });

  it('il messaggio dice la regola, non solo che manca un campo', () => {
    const r = controllaCaso({ ...base(), nomeDiFantasia: false });
    expect(r.problemi.join(' ')).toContain('nome reale');
  });
});

describe('«i dati sono autentici» è una promessa da mantenere', () => {
  it('senza misure è un aneddoto, e lo dice', () => {
    const r = controllaCaso({ ...base(), misure: [] });
    expect(r.valido).toBe(false);
    expect(r.problemi.join(' ')).toContain('aneddoto');
  });

  it('una misura senza valore di partenza non conta come misura', () => {
    const r = controllaCaso({ ...base(), misure: [{ etichetta: 'HRV', partenza: '  ' }] });
    expect(r.valido).toBe(false);
  });

  it('basta una misura vera perché il caso regga', () => {
    const c = { ...base(), misure: [{ etichetta: 'BOLT', partenza: '11 s' }] };
    expect(controllaCaso(c).valido).toBe(true);
  });
});

describe('un caso incompleto si riconosce', () => {
  it('senza situazione di partenza, senza esito o senza fasi, non passa', () => {
    expect(controllaCaso({ ...base(), arrivo: '' }).valido).toBe(false);
    expect(controllaCaso({ ...base(), esito: '   ' }).valido).toBe(false);
    expect(controllaCaso({ ...base(), fasi: [] }).valido).toBe(false);
  });

  it('un caso completo passa', () => {
    expect(controllaCaso(base()).valido).toBe(true);
  });
});

describe('chi vede che cosa', () => {
  const storia = base();
  const clinico: CasoClinico = { ...base(), id: 'c2', pubblico: 'operatore', protocollo: 'Fase 1: ...' };
  const rotto: CasoClinico = { ...base(), id: 'c3', misure: [] };

  it('l\'allievo vede solo le storie, mai i casi con protocollo', () => {
    const v = casiPer('allievo', [storia, clinico, rotto]);
    expect(v.map((c) => c.id)).toEqual(['c1']);
  });

  it('l\'operatore vede tutto ciò che è valido, storie comprese', () => {
    const v = casiPer('operatore', [storia, clinico, rotto]);
    expect(v.map((c) => c.id)).toEqual(['c1', 'c2']);
  });

  it('un caso non valido non si mostra a nessuno dei due', () => {
    expect(casiPer('allievo', [rotto])).toEqual([]);
    expect(casiPer('operatore', [rotto])).toEqual([]);
  });

  it('una lista vuota o assente non fa esplodere niente', () => {
    expect(casiPer('allievo', [])).toEqual([]);
    expect(casiPer('operatore', undefined as any)).toEqual([]);
  });
});

describe('le misure che raccontano un cambiamento', () => {
  it('si mostrano accostate solo quelle con partenza E arrivo', () => {
    const c: CasoClinico = { ...base(), misure: [
      { etichetta: 'HRV', partenza: '28 ms', arrivo: '54 ms' },
      { etichetta: 'BOLT', partenza: '11 s' },
      { etichetta: 'Sonno', partenza: '4 h', arrivo: '7 h' },
    ] };
    expect(misureConfrontabili(c).map((m) => m.etichetta)).toEqual(['HRV', 'Sonno']);
  });

  it('un caso alla prima misurazione non mostra confronti finti', () => {
    const c: CasoClinico = { ...base(), misure: [{ etichetta: 'HRV', partenza: '28 ms' }] };
    expect(misureConfrontabili(c)).toEqual([]);
  });
});
