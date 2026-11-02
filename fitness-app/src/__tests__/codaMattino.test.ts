// ============================================================
// LA CODA DEL MATTINO È DEL TITOLARE
// ------------------------------------------------------------
// 9 novembre 2026. Il titolare, indicando la schermata «Oggi in
// palestra»: «non deve assolutamente vedere nemmeno questo».
//
// La coda del mattino legge i twins di TUTTI gli allievi — churn,
// rate scadute, abbandoni, chi sta mollando: è la salute commerciale
// dello studio su una pagina. Un collaboratore non la deve vedere.
//
// Questo test guarda il CODICE della schermata: la coda non si deve
// nemmeno chiedere al server quando chi guarda non vede i soldi, e
// non si deve rendere.
// ============================================================

import fs from 'fs';
import path from 'path';

const schermata = fs.readFileSync(
  path.join(__dirname, '..', 'screens', 'staff', 'OperationsTodayScreen.tsx'),
  'utf8'
);

describe('la coda del mattino non arriva a chi non vede i soldi', () => {
  it('non si CHIEDE nemmeno al server se chi guarda non vede i soldi', () => {
    // dentro un ramo `if (canSeeMoney)`, non chiamata incondizionata
    const i = schermata.indexOf('if (canSeeMoney) {');
    expect(i).toBeGreaterThan(-1);
    const blocco = schermata.slice(i, i + 200);
    expect(blocco).toMatch(/getBrainQueue\(\)/);
    expect(blocco).toMatch(/getBrainStatus\(\)/);
  });

  it('e non si chiama fuori da quel ramo', () => {
    // una sola occorrenza di getBrainQueue(), quella dentro la guardia
    expect((schermata.match(/getBrainQueue\(\)/g) || []).length).toBe(1);
  });

  it('e non si rende senza il permesso, nemmeno se per qualche motivo ci fossero righe', () => {
    expect(schermata).toMatch(/\{canSeeMoney && brainRows\.length > 0 &&/);
  });

  // 9 novembre 2026, scelta A del titolare: la coda — e tutta la parte
  // commerciale di questa schermata — è del SOLO titolare. Né manager
  // né nutrizionisti. `canSeeMoney` è isOwner, non più isOwner||isManager.
  it('il permesso è isOwner soltanto: nessun manager, nessun nutrizionista', () => {
    expect(schermata).toMatch(/const canSeeMoney = isOwner;/);
    expect(schermata).not.toMatch(/const canSeeMoney = isOwner \|\| isManager;/);
  });
});
