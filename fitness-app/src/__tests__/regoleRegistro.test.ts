import fs from 'fs';
import path from 'path';

// ============================================================
// DUE PORTE CHE ERANO APERTE
// ------------------------------------------------------------
// 30 ottobre 2026, mentre rispondevo alla domanda «come posso
// monitorare l'attività dei collaboratori». Prima di costruire il
// registro sono andato a leggere che cosa i collaboratori potessero
// già fare, e ho trovato due cose.
//
// Questi test non sostituiscono la verifica sull'emulatore. Servono
// a una cosa sola: impedire che quelle due righe tornino com'erano,
// perché tornarci sarebbe silenzioso.
// ============================================================

const regole = fs.readFileSync(
  path.join(__dirname, '..', '..', 'firestore.rules'), 'utf8'
);

const senzaCommenti = regole
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

const bloccoUtenti = (): string => {
  const i = senzaCommenti.indexOf('match /users/{userId}');
  expect(i).toBeGreaterThan(-1);
  return senzaCommenti.slice(i, senzaCommenti.indexOf('match /registro/{voceId}'));
};

describe('cancellare una persona è solo del titolare', () => {
  // Qui c'era `allow delete: if isStaff()`. Qualunque collaboratore
  // poteva cancellare la scheda di chiunque — un allievo, un altro
  // collaboratore, il titolare — senza lasciare traccia.
  it('la regola dice isOwner, non isStaff', () => {
    expect(bloccoUtenti()).toMatch(/allow delete: if isOwner\(\);/);
    expect(bloccoUtenti()).not.toMatch(/allow delete: if isStaff\(\);/);
  });
});

describe('l\'elenco degli allievi di un altro non si riscrive a piacere', () => {
  // Il ramo `hasOnly(['assignedStudents'])` stava dentro un OR senza
  // nessuna guardia: chiunque fosse autenticato, allievi compresi,
  // poteva riscrivere quell'elenco sulla scheda di chiunque.
  it('il ramo ha una guardia, e non sta più da solo', () => {
    const b = bloccoUtenti();
    const i = b.indexOf("hasOnly(['assignedStudents'])");
    expect(i).toBeGreaterThan(-1);
    // nei 400 caratteri dopo il ramo devono comparire le due strade
    // ammesse: lo staff, oppure chi tocca solo sé stesso
    const dopo = b.slice(i, i + 400);
    expect(dopo).toMatch(/isStaff\(\)/);
    expect(dopo).toMatch(/removeAll\(\[request\.auth\.uid\]\)/);
  });

  it('e chi non è staff può togliere o mettere SOLO sé stesso', () => {
    const b = bloccoUtenti();
    const i = b.indexOf("hasOnly(['assignedStudents'])");
    const dopo = b.slice(i, i + 400);
    // le due liste, tolto il proprio identificativo, devono restare
    // identiche: è questo che impedisce di spostare gli altri
    expect(dopo).toMatch(
      /request\.resource\.data\.assignedStudents\.removeAll\(\[request\.auth\.uid\]\)\s*==\s*resource\.data\.assignedStudents\.removeAll\(\[request\.auth\.uid\]\)/
    );
  });

  it('e non esplode se il campo non c\'è ancora', () => {
    const b = bloccoUtenti();
    const i = b.indexOf("hasOnly(['assignedStudents'])");
    expect(b.slice(i, i + 400)).toMatch(/'assignedStudents' in resource\.data/);
  });
});

describe('il registro non si riscrive', () => {
  const blocco = (): string => {
    const i = senzaCommenti.indexOf('match /registro/{voceId}');
    expect(i).toBeGreaterThan(-1);
    return senzaCommenti.slice(i, i + 900);
  };

  it('update e delete sono falsi per tutti, titolare compreso', () => {
    expect(blocco()).toMatch(/allow update, delete: if false;/);
  });

  it('e non c\'è nessuna eccezione per il titolare', () => {
    const b = blocco();
    const i = b.indexOf('allow update');
    expect(b.slice(i, i + 80)).not.toMatch(/isOwner/);
  });

  // Senza questo, chiunque potrebbe lasciare righe firmate da un
  // altro: il registro diventerebbe un modo per incastrare qualcuno
  // invece che per sapere come sono andate le cose.
  it('una riga la firma solo chi la scrive', () => {
    expect(blocco()).toMatch(/request\.resource\.data\.chi == request\.auth\.uid/);
  });

  it('e una riga senza i campi che la rendono leggibile non entra', () => {
    expect(blocco()).toMatch(/hasAll\(/);
    expect(blocco()).toMatch(/'chiNome'/);
  });

  it('lo legge il titolare e basta', () => {
    expect(blocco()).toMatch(/allow read: if isOwner\(\);/);
  });
});

describe('le righe si scrivono davvero: non è una funzione mai chiamata', () => {
  const leggi = (r: string): string =>
    fs.readFileSync(path.join(__dirname, '..', r), 'utf8');

  it('l\'autore si imposta all\'ingresso, una volta sola', () => {
    const a = leggi('services/authService.ts');
    expect(a).toMatch(/impostaAutoreRegistro\(/);
    expect(a).toMatch(/annota\(\{ azione: 'entrato'/);
    expect(a).toMatch(/dimenticaAutoreRegistro\(\)/);
  });

  // È l'azione per cui il registro esiste.
  it('cancellare una persona lascia una riga, col nome dentro', () => {
    const a = leggi('services/authService.ts');
    const i = a.indexOf('export const deleteUser');
    const blocco = a.slice(i, i + 1200);
    expect(blocco).toMatch(/azione: 'eliminato'/);
    // il nome si legge PRIMA della cancellazione: dopo non esiste più
    expect(blocco.indexOf('getDoc')).toBeLessThan(blocco.indexOf('deleteDoc'));
    expect(blocco).toMatch(/oggettoNome:/);
  });

  it('e i soldi lasciano una riga in tutti e tre i versi', () => {
    const p = leggi('services/paymentService.ts');
    expect(p).toMatch(/azione: 'creato',\s*\n\s*oggetto: 'pagamento'/);
    expect(p).toMatch(/azione: 'modificato',\s*\n\s*oggetto: 'pagamento'/);
    expect(p).toMatch(/azione: 'eliminato', oggetto: 'pagamento'/);
  });

  it('e annotare non può far fallire il lavoro che annota', () => {
    const s = leggi('services/registroService.ts');
    // niente await verso l'esterno, e l'errore si ferma dentro
    expect(s).toMatch(/export const annota = \(a: Annotazione\): void =>/);
    expect(s).toMatch(/\.catch\(\(err\)/);
  });
});
