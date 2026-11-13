// ============================================================
// CHI AGGIUNGE UN ALLIEVO, E A CHI FINISCE
// ------------------------------------------------------------
// 22 ottobre 2026, richiesta del titolare: «fai in modo che anche il
// nutrizionista possa inserire allievi».
//
// Poteva già: è un collaboratore, e la scheda Allievi ha il pulsante
// «Aggiungi». Ma dentro c'era una cosa storta, e non si vedeva.
//
// Il modulo pre-assegna l'allievo nuovo a chi lo sta scrivendo. Per
// un coach è giusto: è lui che lo allenerà. Per il nutrizionista no —
// lui registra una persona che segue sul piano alimentare, e metterlo
// come coach vuol dire scrivere che lo allena lui, con attaccata
// dietro la percentuale sulle sedute. Un debito che non esiste, che
// si scopre a fine mese guardando i conti.
//
// Chi conduce non è chi ha scritto il nome.
// ============================================================

import fs from 'fs';
import path from 'path';

const leggi = (relativo: string): string =>
  fs.readFileSync(path.join(__dirname, '..', '..', relativo), 'utf8');

describe('il modulo «Nuovo allievo»', () => {
  const modulo = leggi('screens/owner/AddStudentScreen.tsx');

  it('sa riconoscere il nutrizionista', () => {
    expect(modulo).toMatch(/isNutritionist/);
  });

  it('un allievo aggiunto dal nutrizionista va al titolare', () => {
    expect(modulo).toMatch(/const daAssegnare = isNutritionist/);
    expect(modulo).toMatch(/ownerData\?\.id \|\| currentUser\.id/);
  });

  // Se il titolare non si riuscisse a leggere, l'allievo non deve
  // restare senza nessuno: meglio assegnato a chi l'ha scritto che
  // appeso a niente, perché un allievo senza coach non compare in
  // nessun elenco e sparisce.
  it('e se il titolare non si legge, l\'allievo non resta appeso a niente', () => {
    const i = modulo.indexOf('const daAssegnare = isNutritionist');
    expect(modulo.slice(i, i + 140)).toMatch(/currentUser\.id/);
  });

  it('e non si porta dietro la percentuale del nutrizionista', () => {
    expect(modulo).toMatch(/if \(meCollab && !isNutritionist\)/);
  });

  it('il modulo dice che cosa sta per succedere, invece di farlo di nascosto', () => {
    expect(modulo).toMatch(/assegnato al titolare dello/);
    expect(modulo).toMatch(/nutrizionale/);
  });

  // Per coach e manager non cambia niente: quella parte funzionava.
  it('per coach e manager resta l\'assegnazione a sé stessi', () => {
    expect(modulo).toMatch(/L\\'allievo verrà assegnato automaticamente a te/);
  });
});

describe('il nutrizionista ci arriva davvero', () => {
  // Il difetto che in questo progetto torna sempre: la cosa esiste e
  // non si raggiunge. Qui si controlla la strada, non la funzione.
  it('la scheda Allievi esiste per tutto lo staff, nutrizionista compreso', () => {
    const tabs = leggi('navigation/StaffTabsV2.tsx');
    expect(tabs).toMatch(/<Tab\.Screen name="Allievi"/);
    expect(tabs).toMatch(/AllieviStack\.Screen name="AllieviHome" component=\{MyStudentsScreen\}/);
  });

  it('e il pulsante «Aggiungi» non è riservato a un ruolo', () => {
    const miei = leggi('screens/collaborator/MyStudentsScreen.tsx');
    const i = miei.indexOf('setShowAddStudent(true)');
    expect(i).toBeGreaterThan(0);
    // nessuna condizione di ruolo attorno al pulsante
    expect(miei.slice(i - 260, i)).not.toMatch(/isOwner &&|isManager &&/);
  });
});
