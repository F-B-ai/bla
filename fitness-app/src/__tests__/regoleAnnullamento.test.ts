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

// ============================================================
// «QUESTO È UN CONTROLLO CHE DOVEVA AVERE SOLAMENTE IO»
// ------------------------------------------------------------
// 14 settembre 2026: annullare ed eliminare passano al titolare.
// Nascondere i due pulsanti non basta — senza queste regole
// resterebbero raggiungibili da fuori l'App.
// ============================================================

describe('annullare ed eliminare sono del titolare', () => {
  const blocchi = senzaCommenti.split('match /').filter((b) =>
    b.startsWith('sessions/') || b.startsWith('nutritionistAppointments/'));

  it('eliminare: solo il titolare, su sedute e visite', () => {
    expect(blocchi).toHaveLength(2);
    blocchi.forEach((b) => {
      expect(b).toMatch(/allow delete:\s*if isOwner\(\)\s*;/);
      expect(b).not.toMatch(/allow delete:\s*if isStaff\(\)\s*;/);
    });
  });

  it('aggiornare: il titolare tutto, gli altri solo se non stanno annullando', () => {
    blocchi.forEach((b) => {
      expect(b).toContain('isOwner()');
      expect(b).toContain('nonStaAnnullando()');
      // la vecchia riga che dava tutto a tutto lo staff
      expect(b).not.toMatch(/allow update:\s*if isStaff\(\)\s*$/m);
    });
  });

  it('gli stati annullati sono elencati tutti e tre', () => {
    ['cancelled', 'cancelled_by_student', 'cancelled_late'].forEach((s) =>
      expect(senzaCommenti).toContain(`'${s}'`));
  });

  // Il buco classico: cambio l'ora E annullo nella stessa scrittura.
  it('il divieto guarda lo stato finale, non solo i campi toccati', () => {
    const f = senzaCommenti.slice(
      senzaCommenti.indexOf('function nonStaAnnullando'),
      senzaCommenti.indexOf('function nonStaAnnullando') + 300
    );
    expect(f).toContain('request.resource.data.status');
    expect(f).toContain('statoAnnullato');
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
