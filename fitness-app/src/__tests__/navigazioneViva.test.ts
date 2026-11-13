// ============================================================
// IN QUALE NAVIGATORE SI AGGIUNGE UNA SCHERMATA
// ------------------------------------------------------------
// 31 ottobre 2026, mezzanotte e mezza. Il titolare, dopo che gli
// avevo scritto due volte che il Registro era in produzione:
// «Non vedo niente», con la fotografia della sua app.
//
// Aveva ragione. Avevo aggiunto la scheda a `OwnerTabs` dentro
// AppNavigator.tsx — un navigatore a ventisette schede che è
// definito e NON VIENE MAI USATO. Quello vivo è `makeStaffTabs` in
// StaffTabsV2.tsx: cinque pulsanti in basso e la schermata Studio.
//
// Ho controllato le regole, i test, il pacchetto pubblicato e i
// semafori della pubblicazione. Erano tutti verdi, e tutti
// rispondevano a una domanda che non era quella giusta: non «arriva
// dove serve», ma «è stato pubblicato». Due pubblicazioni di niente.
//
// È l'ennesima volta che la stessa cosa ricompare — la funzione che
// esiste e non si raggiunge — e questa volta l'ho creata io.
//
// Questi test rispondono alla domanda giusta.
// ============================================================

import fs from 'fs';
import path from 'path';

const leggi = (r: string): string =>
  fs.readFileSync(path.join(__dirname, '..', r), 'utf8');

const vivo = leggi('navigation/StaffTabsV2.tsx');
const radice = leggi('navigation/AppNavigator.tsx');

describe('qual è il navigatore vivo', () => {
  // Pinnato apposta: è l'informazione che mi mancava, e senza di
  // essa il prossimo che aggiunge una schermata sbaglia uguale.
  it('il titolare entra in makeStaffTabs, non in OwnerTabs', () => {
    expect(radice).toMatch(/const OwnerTabsV2 = makeStaffTabs\('owner'\)/);
    expect(radice).toMatch(/<RootStack\.Screen name="OwnerTabs" component=\{OwnerTabsV2\} \/>/);
  });

  it("e OwnerTabs di AppNavigator non è montato da nessuna parte", () => {
    // se un giorno torna in uso, questo test va aggiornato apposta:
    // meglio un test da cambiare che una schermata invisibile
    expect(radice).not.toMatch(/component=\{OwnerTabs\}/);
  });
});

describe('ogni riga dello Studio porta da qualche parte', () => {
  // L'INVARIANTE CHE MANCAVA. Una riga nell'elenco senza la
  // schermata corrispondente non dà errore: si tocca e non succede
  // niente. È il modo più silenzioso di rompere una funzione.
  const rotteElencate = Array.from(
    vivo.matchAll(/route: '([A-Za-z0-9_]+)'/g)
  ).map((m) => m[1]);

  const schermateRegistrate = new Set(
    Array.from(vivo.matchAll(/StudioStack\.Screen name="([A-Za-z0-9_]+)"/g))
      .map((m) => m[1])
  );

  it('ci sono righe e ci sono schermate', () => {
    expect(rotteElencate.length).toBeGreaterThan(10);
    expect(schermateRegistrate.size).toBeGreaterThan(10);
  });

  it('nessuna riga punta a una schermata che non esiste', () => {
    const orfane = Array.from(new Set(rotteElencate))
      .filter((r) => !schermateRegistrate.has(r));
    expect(orfane).toEqual([]);
  });
});

describe('il Registro è raggiungibile dal titolare', () => {
  it('la schermata è importata nel navigatore vivo', () => {
    expect(vivo).toMatch(/import \{ RegistroScreen \} from '\.\.\/screens\/owner\/RegistroScreen';/);
  });

  it("compare nell'elenco di Gestione del titolare", () => {
    expect(vivo).toMatch(/title: 'Registro attività', route: 'Registro'/);
  });

  it('ed è registrata nello stack, dentro il blocco del titolare', () => {
    const i = vivo.indexOf("role === 'owner' && (");
    expect(i).toBeGreaterThan(-1);
    const blocco = vivo.slice(i, vivo.indexOf("role === 'manager' && ("));
    expect(blocco).toMatch(/StudioStack\.Screen name="Registro" component=\{RegistroScreen\}/);
  });

  // Dove sta conta: accanto a Team, perché è lì che ci si arriva
  // pensando — chi è questo, che cosa ha fatto.
  it('sta subito dopo Team, non in fondo', () => {
    const t = vivo.indexOf("title: 'Team', route: 'Team'");
    const r = vivo.indexOf("title: 'Registro attività'");
    const c = vivo.indexOf("title: 'Contenuti', route: 'Contenuti'");
    expect(t).toBeLessThan(r);
    expect(r).toBeLessThan(c);
  });
});
