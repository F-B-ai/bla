import fs from 'fs';
import path from 'path';
import { ORE_LIMITE } from '../domain/annullamento';

// ============================================================
// LE DIECI ORE VIVONO IN DUE MONDI
// ------------------------------------------------------------
// Nel codice (domain/annullamento.ts) e nelle regole di Firestore,
// che non possono importare niente da TypeScript. Due copie dello
// stesso numero divergono sempre — e qui divergere vorrebbe dire
// che l'App dice una cosa e il database ne fa un'altra.
//
// Questo test non sostituisce la verifica sull'emulatore (quella
// gira a parte, sedici casi): tiene insieme il numero e impedisce
// che la regola torni a essere spalancata.
// ============================================================

const regole = fs.readFileSync(
  path.join(__dirname, '..', '..', 'firestore.rules'), 'utf8'
);

const senzaCommenti = regole
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

describe('il numero è lo stesso nei due mondi', () => {
  it('le regole usano lo stesso limite del codice', () => {
    const m = senzaCommenti.match(/oreAllaSeduta\(quando\)\s*>=\s*(\d+)/);
    expect(m).not.toBeNull();
    expect(Number(m![1])).toBe(ORE_LIMITE);
  });

  it('e il conto è in ore, non in minuti per sbaglio', () => {
    // 3 600 000 millisecondi = un'ora. Un uno di troppo qui
    // vorrebbe dire un limite di cento ore.
    expect(senzaCommenti).toContain('3600000');
  });
});

describe('la porta accanto non resta aperta', () => {
  // Prima: «allow update: if isAuthenticated()» su sessions. Cioè
  // chiunque avesse un account poteva riscrivere qualsiasi seduta
  // di chiunque — costo compreso.
  it('sessions e visite non accettano più un update da chiunque', () => {
    const blocchi = senzaCommenti.split('match /').filter((b) =>
      b.startsWith('sessions/') || b.startsWith('nutritionistAppointments/'));
    expect(blocchi).toHaveLength(2);
    blocchi.forEach((b) => {
      expect(b).not.toMatch(/allow update:\s*if isAuthenticated\(\)\s*;/);
      expect(b).toContain('annullamentoInRegola');
    });
  });

  it('e nemmeno una create da chiunque', () => {
    const blocchi = senzaCommenti.split('match /').filter((b) =>
      b.startsWith('sessions/') || b.startsWith('nutritionistAppointments/'));
    blocchi.forEach((b) => {
      expect(b).not.toMatch(/allow create:\s*if isAuthenticated\(\)\s*;/);
    });
  });
});

describe('che cosa può fare un allievo sulla propria seduta', () => {
  const regola = senzaCommenti.slice(
    senzaCommenti.indexOf('function annullamentoInRegola'),
    senzaCommenti.indexOf('function annullamentoInRegola') + 700
  );

  it('solo la propria', () => {
    expect(regola).toContain('resource.data.studentId == request.auth.uid');
  });

  it('solo una ancora in programma', () => {
    expect(regola).toContain("resource.data.status == 'scheduled'");
  });

  it('solo i campi dell\'annullamento — non il costo, non l\'ora', () => {
    expect(regola).toContain('soloCampiAnnullamento()');
    expect(senzaCommenti).toMatch(
      /hasOnly\(\['status',\s*'cancelledAt',\s*'isCountedAsCompleted'\]\)/
    );
  });

  it('e solo se è in tempo', () => {
    expect(regola).toContain('inTempo(resource.data.date)');
  });

  // Una data illeggibile non deve aprire: si rifiuta e basta.
  it('una data che non è una data non fa passare niente', () => {
    expect(senzaCommenti).toContain('quando is timestamp');
  });
});
