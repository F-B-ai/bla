// ============================================================
// IL REGISTRO DEVE VEDERE LE SEDUTE
// ------------------------------------------------------------
// 2 novembre 2026. Il titolare: «il registro, mi devi dire tutto
// quello che avverrà».
//
// Sono andato a contare i punti dove si annotava: sei, e nessuno
// riguardava le sedute. Appuntamenti fissati, lezioni segnate come
// svolte, spostamenti, disdette, cancellazioni — niente.
//
// Cioè esattamente le cose per cui il Registro era stato chiesto.
//
// E due giorni prima gli avevo scritto che «se qualcuno inserisce
// quaranta appuntamenti in una sera, il Registro tiene traccia».
// Era falso. Sarebbe andato a una conversazione difficile contando
// su uno strumento che non esisteva.
//
// Questi test tengono fermi i cinque momenti di una seduta.
// ============================================================

import fs from 'fs';
import path from 'path';

const leggi = (r: string): string =>
  fs.readFileSync(path.join(__dirname, '..', '..', r), 'utf8');

const sedute = leggi('services/sessionService.ts');

describe('i cinque momenti di una seduta lasciano una riga', () => {
  it('quando si fissa', () => {
    const i = sedute.indexOf('export const createSession');
    expect(sedute.slice(i, i + 900)).toMatch(/annotaSeduta\('creato'/);
  });

  // È LA RIGA PIÙ IMPORTANTE DI TUTTE: dice chi ha segnato una
  // lezione come svolta, e quando. Quaranta righe con la stessa
  // data e lo stesso nome raccontano da sole com'è andata.
  it('quando si segna come svolta', () => {
    const i = sedute.indexOf('export const updateSessionStatus');
    const blocco = sedute.slice(i, i + 1200);
    expect(blocco).toMatch(/annotaSeduta\('modificato'/);
    expect(blocco).toMatch(/segnata come svolta/);
  });

  it('quando si sposta', () => {
    const i = sedute.indexOf('export const updateSession =');
    expect(sedute.slice(i, i + 900)).toMatch(/spostata al/);
  });

  it('quando si disdice, e si distingue la disdetta tardiva', () => {
    const i = sedute.indexOf('export const cancelSession');
    const blocco = sedute.slice(i, i + 1400);
    expect(blocco).toMatch(/annotaSeduta\('modificato'/);
    expect(blocco).toMatch(/disdetta tardiva \(conta come svolta\)/);
  });

  it('quando si cancella', () => {
    const i = sedute.indexOf('export const deleteSession');
    expect(sedute.slice(i, i + 900)).toMatch(/annotaSeduta\('eliminato'/);
  });
});

describe('la riga resta leggibile', () => {
  it("il nome dell'allievo si risolve dentro il registro, non lo deve passare chi chiama", () => {
    // altrimenti bisognerebbe toccare ogni schermata che fissa un
    // appuntamento, e la prima dimenticata produce righe mute
    expect(sedute).toMatch(/const annotaSeduta = \(/);
    expect(sedute).toMatch(/oggettoNome: nome/);
  });

  it('e se il nome non si legge la riga esiste lo stesso', () => {
    const i = sedute.indexOf('const annotaSeduta');
    const blocco = sedute.slice(i, i + 900);
    expect(blocco).toMatch(/catch \{/);
    expect(blocco).toMatch(/let nome = '';/);
  });

  // Stessa lezione di deleteUser: dopo la cancellazione la seduta
  // non esiste più, e con lei l'allievo a cui si riferiva.
  it('su cancellazione e cambio di stato si legge PRIMA di scrivere', () => {
    const d = sedute.indexOf('export const deleteSession');
    const blocco = sedute.slice(d, d + 900);
    expect(blocco.indexOf('getDoc')).toBeLessThan(blocco.indexOf('deleteDoc'));

    const u = sedute.indexOf('export const updateSessionStatus');
    const bu = sedute.slice(u, u + 1200);
    expect(bu.indexOf('getDoc')).toBeLessThan(bu.indexOf('updateDoc'));
  });
});

describe('annotare non rallenta e non rompe il lavoro', () => {
  it('la funzione non si aspetta: chi fissa un appuntamento lo vede salvato subito', () => {
    expect(sedute).toMatch(/\): void => \{\s*\n\s*void \(async \(\) => \{/);
  });

  it("e createSession restituisce l'id senza aspettare la riga", () => {
    const i = sedute.indexOf('export const createSession');
    const blocco = sedute.slice(i, i + 900);
    expect(blocco).toMatch(/annotaSeduta\('creato'[\s\S]*return docRef\.id;/);
    expect(blocco).not.toMatch(/await annotaSeduta/);
  });
});
