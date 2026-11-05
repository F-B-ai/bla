// ============================================================
// IL REGISTRO CHE NON DEVE POTER SPARIRE
// ------------------------------------------------------------
// 11 ottobre 2026. Confrontando gli ingressi degli allievi con le
// sedute registrate è emerso che dei personal non risultano da
// nessuna parte. Il check-in è diventato, da quel momento, l'unico
// dato dello studio che non dipende da chi conduce le sedute.
//
// Fino a oggi quel dato lo poteva cancellare tutto lo staff: la
// gomma in mano a chi è controllato. Da adesso togliere un ingresso
// è un gesto del titolare, come annullare una seduta.
// ============================================================

import fs from 'fs';
import path from 'path';

const regole = fs.readFileSync(
  path.join(__dirname, '..', '..', 'firestore.rules'),
  'utf8'
);

const blocco = (nome: string): string => {
  const i = regole.indexOf(`match /${nome}/{`);
  if (i < 0) throw new Error(`manca il blocco ${nome}`);
  return regole.slice(i, regole.indexOf('}', regole.indexOf('allow', i)) + 1);
};

describe('gli ingressi degli allievi', () => {
  const checkins = blocco('checkins');

  it('li registra l\'allievo: chiunque sia autenticato può crearne uno', () => {
    expect(checkins).toMatch(/allow create: if isAuthenticated\(\)/);
  });

  it('li cancella SOLO il titolare, non lo staff', () => {
    expect(checkins).toMatch(/allow update, delete: if isOwner\(\)/);
    expect(checkins).not.toMatch(/allow update, delete: if isStaff\(\)/);
  });
});

describe('le sedute', () => {
  const sessions = blocco('sessions');

  it('le cancella solo il titolare: era già così e resta così', () => {
    expect(sessions).toMatch(/allow delete: if isOwner\(\)/);
  });
});
