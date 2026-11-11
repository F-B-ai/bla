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
      expect(indice.slice(i, i + 500)).toMatch(/await soloTitolareTracciato\(request\.auth\.uid,/);
    }
  });

  it('ricalcolare il motore a mano: solo il titolare', () => {
    const brain = leggi('functions', 'src', 'brain.ts');
    const i = brain.indexOf('export const brainRun = onRequest(');
    expect(brain.slice(i)).toMatch(/if \(role !== "owner"\) \{/);
    expect(brain.slice(i)).not.toMatch(/role !== "manager"/);
  });
});


// ============================================================
// 11 novembre 2026 — LA TRACCIA DEGLI ACCESSI
// ------------------------------------------------------------
// Ogni funzione che tocca un accesso passa da un cancello che lascia
// passare solo il titolare e scrive nel Registro chi ci ha provato.
// Ogni modifica riuscita lascia una riga. Nessuna riga contiene una
// password.
// ============================================================

describe('ogni funzione sugli accessi passa dal cancello tracciato', () => {
  const indice = leggi('functions', 'src', 'index.ts');
  const funzioni = [
    'adminChangeEmail', 'adminChangePassword', 'adminStatoAccesso', 'adminCreaAccesso',
    'adminDeleteUser', 'setUserClaims', 'migrateUserClaims', 'cleanManagedPasswords',
  ];
  const corpo = (nome: string): string => {
    const i = indice.indexOf(`export const ${nome} = onCall(`);
    const j = indice.indexOf('export const ', i + 10);
    return indice.slice(i, j === -1 ? undefined : j);
  };

  it('il vecchio cancello non è più usato da nessuna funzione', () => {
    expect(indice).not.toMatch(/await verifyOwner\(/);
  });

  for (const nome of funzioni) {
    it(`${nome}: il cancello viene PRIMA di qualunque operazione`, () => {
      const c = corpo(nome);
      const cancello = c.indexOf('await soloTitolareTracciato(request.auth.uid');
      expect(cancello).toBeGreaterThan(-1);
      for (const op of ['authAdmin.', 'db.collection(', '.updateUser(', '.createUser(', '.deleteUser(', '.setCustomUserClaims(']) {
        const k = c.indexOf(op);
        if (k > -1) expect(cancello).toBeLessThan(k);
      }
    });
  }

  for (const nome of ['adminChangeEmail', 'adminChangePassword', 'adminCreaAccesso', 'adminDeleteUser', 'setUserClaims']) {
    it(`${nome}: la modifica riuscita lascia una riga nel Registro`, () => {
      expect(corpo(nome)).toMatch(/await tracciaAccesso\(\{\s*chi: request\.auth\.uid,/);
    });
  }

  it('nessuna riga del Registro contiene una password', () => {
    const righe = indice.split('await tracciaAccesso({').slice(1).map((x) => x.slice(0, x.indexOf('});')));
    expect(righe.length).toBe(5);
    for (const r of righe) expect(r).not.toMatch(/newPassword|password\b(?!\s+cambiata)/);
    const traccia = leggi('functions', 'src', 'traccia.ts');
    expect(traccia).not.toMatch(/newPassword|request\.data/);
  });
});

describe('il cancello tracciato', () => {
  const traccia = leggi('functions', 'src', 'traccia.ts');

  it('lascia passare solo il titolare, leggendo il ruolo senza rete di sicurezza', () => {
    const i = traccia.indexOf('export const soloTitolareTracciato');
    const c = traccia.slice(i);
    expect(c).toMatch(/if \(d\.exists && d\.data\(\)\?\.role === "owner"\) return;/);
    expect(c).not.toMatch(/"manager"|"collaborator"/);
  });

  it('scrive il tentativo e poi respinge', () => {
    const i = traccia.indexOf('export const soloTitolareTracciato');
    const c = traccia.slice(i);
    expect(c.indexOf('azione: "tentato"')).toBeGreaterThan(-1);
    expect(c.indexOf('azione: "tentato"')).toBeLessThan(c.indexOf('throw new HttpsError('));
    expect(c).toMatch(/"permission-denied"/);
  });

  it('scrive nel Registro di sempre, con i campi di sempre', () => {
    for (const campo of ['chi:', 'chiNome:', 'ruolo:', 'azione:', 'oggetto: "accesso"', 'oggettoId:', 'oggettoNome:', 'quando:', 'dettaglio:']) {
      expect(traccia).toContain(campo);
    }
    expect(traccia).toMatch(/collection\(REGISTRO\)\.add\(/);
    expect(traccia).toMatch(/const REGISTRO = "registro";/);
    // aggiunge e basta: niente set, update o delete sul Registro
    expect(traccia).not.toMatch(/\.(set|update|delete)\(/);
  });

  it('il Registro dell\'app conosce le nuove voci', () => {
    const dominio = leggi('src', 'domain', 'registro.ts');
    expect(dominio).toMatch(/\| 'tentato';/);
    expect(dominio).toMatch(/\| 'accesso'/);
  });

  it('le regole del Registro non sono cambiate: si aggiunge, non si modifica, lo legge il titolare', () => {
    const regole = leggi('firestore.rules');
    const i = regole.indexOf('match /registro/{voceId}');
    const b = regole.slice(i, i + 600);
    expect(b).toMatch(/allow read: if isOwner\(\);/);
    expect(b).toMatch(/allow update, delete: if false;/);
  });
});

describe('il controllo accessi è del titolare', () => {
  const f = leggi('functions', 'src', 'accessi.ts');

  it('passa dal cancello tracciato prima di leggere qualunque cosa', () => {
    const i = f.indexOf('export const controlloAccessi = onCall(');
    const c = f.slice(i);
    expect(c.indexOf('await soloTitolareTracciato(')).toBeGreaterThan(-1);
    expect(c.indexOf('await soloTitolareTracciato(')).toBeLessThan(c.indexOf('tuttiGliAccount()'));
  });

  it('legge e basta: nessuna scrittura, nessuna modifica di account', () => {
    expect(f).not.toMatch(/\.(set|update|add|delete)\(|updateUser|deleteUser|createUser|setCustomUserClaims|revokeRefreshTokens/);
  });

  it('la schermata sta solo nel blocco del titolare', () => {
    const nav = leggi('src', 'navigation', 'StaffTabsV2.tsx');
    const da = nav.indexOf("role === 'owner' && (");
    const a = nav.indexOf("role === 'manager' && (");
    expect(nav.slice(da, a)).toMatch(/StudioStack\.Screen name="ControlloAccessi" component=\{ControlloAccessiScreen\}/);
    expect(nav.slice(a)).not.toMatch(/ControlloAccessi/);
    expect((nav.match(/route: 'ControlloAccessi'/g) || []).length).toBe(1);
  });
});
