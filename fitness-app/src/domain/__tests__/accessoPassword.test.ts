import fs from 'fs';
import path from 'path';

// ============================================================
// IL LINK PER LA PASSWORD CHE «NON È ATTIVO»
// ------------------------------------------------------------
// 2 ottobre 2026. Cercando il motivo, due silenzi — nessuno dei due
// rompeva niente, ed è per questo che erano lì da sempre.
// ============================================================

const leggi = (p: string) =>
  fs.readFileSync(path.join(__dirname, '..', '..', p), 'utf8');

describe('l\'invito che non parte non è più muto', () => {
  const auth = leggi('services/authService.ts');

  // C'era un catch VUOTO, con scritto accanto «lo staff può reinviare
  // il link dal profilo». Ma per reinviarlo deve SAPERE che non è
  // partito, e nessuno glielo diceva.
  it('l\'invio del link di accesso restituisce un esito', () => {
    expect(auth).toContain('EsitoInvito');
    expect(auth).toContain('inviata: false');
    expect(auth).toContain('esitoUltimoInvito');
  });

  it('il fallimento finisce nel registro dei guasti', () => {
    expect(auth).toContain('registraGuasto');
    expect(auth).toContain('Invio link imposta-password');
  });

  // Far risalire l'errore avrebbe rotto una cosa peggiore: a quel
  // punto l'account su Firebase è GIÀ creato, e far fallire la
  // registrazione lascerebbe una persona a metà.
  it('ma l\'account si crea lo stesso: nessuno resta a metà', () => {
    // Nel sorgente l'apostrofo è con escape: si cerca una porzione che
    // non ne contiene, altrimenti il test fallisce su una virgola.
    expect(auth).toContain('account è stato creato lo stesso');
    const blocco = auth.slice(auth.indexOf('const sendPasswordSetupEmail'));
    expect(blocco.slice(0, 900)).not.toMatch(/throw /);
  });
});

describe('«verifica che l\'indirizzo sia corretto» non è sempre vero', () => {
  const login = leggi('screens/auth/LoginScreen.tsx');

  // Lo diceva per ogni errore. Chi legge ricontrolla l'email dieci
  // volte e non trova niente, perché non c'è niente da trovare.
  it('distingue i motivi invece di dare sempre la colpa all\'email', () => {
    ['auth/user-not-found', 'auth/invalid-email',
     'auth/too-many-requests', 'auth/network-request-failed']
      .forEach((c) => expect(login).toContain(c));
  });

  it('e quando l\'indirizzo non c\'entra, lo dice', () => {
    expect(login).toContain('indirizzo non c');
    expect(login).toContain('entra.');
  });

  it('un motivo sconosciuto porta con sé il codice tecnico', () => {
    expect(login).toMatch(/codice \? ` \(\$\{codice\}\)`/);
  });

  it('non resta più il messaggio che incolpava sempre l\'email', () => {
    expect(login).not.toContain(
      'Impossibile inviare l\'email di recupero. Verifica che l\'indirizzo sia corretto.'
    );
  });
});
