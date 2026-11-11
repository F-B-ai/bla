import * as fs from 'fs';
import * as path from 'path';

// ============================================================
// 11 novembre 2026 — SUL SERVER, SOLO IL TITOLARE
// ------------------------------------------------------------
// Il 9 novembre il titolare ha deciso che il manager non ha poteri
// amministrativi, e le regole del database sono state allineate.
// Le funzioni sul server erano rimaste alla versione di prima.
// ============================================================

const radice = path.join(__dirname, '..', '..');
const leggi = (...p: string[]): string => fs.readFileSync(path.join(radice, ...p), 'utf8');

describe('sul server il manager non ha più poteri amministrativi', () => {
  const indice = leggi('functions', 'src', 'index.ts');

  it('nessuna funzione accetta più «titolare o manager»', () => {
    expect(indice).not.toMatch(/await verifyOwnerOrManager\(/);
    expect(indice).not.toMatch(/async function verifyOwnerOrManager/);
  });

  it('cambiare email e password, creare e leggere un accesso: solo il titolare', () => {
    for (const nome of ['adminChangeEmail', 'adminChangePassword', 'adminStatoAccesso', 'adminCreaAccesso']) {
      const i = indice.indexOf(`export const ${nome} = onCall(`);
      expect(i).toBeGreaterThan(-1);
      expect(indice.slice(i, i + 400)).toMatch(/await verifyOwner\(request\.auth\.uid\);/);
    }
  });

  it('ricalcolare il motore a mano: solo il titolare', () => {
    const brain = leggi('functions', 'src', 'brain.ts');
    const i = brain.indexOf('export const brainRun = onRequest(');
    expect(brain.slice(i)).toMatch(/if \(role !== "owner"\) \{/);
    expect(brain.slice(i)).not.toMatch(/role !== "manager"/);
  });
});
