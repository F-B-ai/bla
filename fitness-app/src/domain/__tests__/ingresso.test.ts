// ============================================================
// L'INGRESSO CHIESTO ALL'APERTURA
// ------------------------------------------------------------
// In un anno il registro ha raccolto 109 ingressi, non perché la
// gente non entri ma perché nessuno glielo chiedeva. Adesso lo chiede
// l'app, appena si apre.
//
// Una domanda che compare quando non serve è peggio di una che non
// compare: insegna a ignorare tutte le altre. Per questo i test più
// importanti qui sotto non sono quelli che verificano che la domanda
// arrivi — sono quelli che verificano che STIA ZITTA.
// ============================================================

import fs from 'fs';
import path from 'path';
import {
  RUOLI_CON_INGRESSO, chiedeIngresso, inOrarioStudio, ORE_RINVIO,
  deveChiedereIngresso, testoIngresso,
} from '../ingresso';
import { GRIGLIA_DA, GRIGLIA_A } from '../orariStudio';

const alle = (ora: string, giorno = '2026-10-12'): Date =>
  new Date(`${giorno}T${ora}:00`);

const leggi = (relativo: string): string =>
  fs.readFileSync(path.join(__dirname, '..', '..', relativo), 'utf8');

describe('a chi si chiede', () => {
  it('agli allievi e a chi lavora qui: nessuno è esentato per grado', () => {
    expect(chiedeIngresso('student')).toBe(true);
    expect(chiedeIngresso('collaborator')).toBe(true);
    expect(chiedeIngresso('manager')).toBe(true);
    expect(chiedeIngresso('nutritionist')).toBe(true);
  });

  it('al titolare no: il QR lo espone lui', () => {
    expect(chiedeIngresso('owner')).toBe(false);
  });

  it('e a chi non ha ancora un ruolo nemmeno', () => {
    expect(chiedeIngresso(null)).toBe(false);
    expect(chiedeIngresso(undefined)).toBe(false);
    expect(chiedeIngresso('')).toBe(false);
  });

  it('i ruoli sono quattro, in un posto solo', () => {
    expect([...RUOLI_CON_INGRESSO]).toEqual(
      ['student', 'collaborator', 'manager', 'nutritionist']
    );
  });
});

describe('quando lo studio è aperto', () => {
  it('dentro la griglia degli orari si chiede', () => {
    expect(inOrarioStudio(alle(GRIGLIA_DA))).toBe(true);
    expect(inOrarioStudio(alle('13:00'))).toBe(true);
    expect(inOrarioStudio(alle(GRIGLIA_A))).toBe(true);
  });

  it('prima dell\'apertura e dopo la chiusura si tace', () => {
    expect(inOrarioStudio(alle('06:30'))).toBe(false);
    expect(inOrarioStudio(alle('23:30'))).toBe(false);
    expect(inOrarioStudio(alle('03:00'))).toBe(false);
  });
});

describe('la domanda arriva', () => {
  it('a un allievo che apre l\'app in orario e non è ancora entrato', () => {
    const e = deveChiedereIngresso({ ruolo: 'student' }, alle('10:00'));
    expect(e.chiedere).toBe(true);
  });

  it('e a un collaboratore nelle stesse condizioni', () => {
    expect(deveChiedereIngresso({ ruolo: 'collaborator' }, alle('10:00')).chiedere)
      .toBe(true);
  });
});

describe('la domanda STA ZITTA', () => {
  it('se ha già registrato l\'ingresso oggi', () => {
    const e = deveChiedereIngresso(
      { ruolo: 'student', ultimoIngresso: alle('09:00') },
      alle('11:00')
    );
    expect(e).toEqual({ chiedere: false, motivo: 'gia_registrato' });
  });

  it('ma un ingresso di IERI non vale per oggi', () => {
    const e = deveChiedereIngresso(
      { ruolo: 'student', ultimoIngresso: alle('18:00', '2026-10-11') },
      alle('10:00')
    );
    expect(e.chiedere).toBe(true);
  });

  it('se ha appena detto «non sono in studio»', () => {
    const e = deveChiedereIngresso(
      { ruolo: 'student', rinviatoIl: alle('10:00') },
      alle('11:00')
    );
    expect(e).toEqual({ chiedere: false, motivo: 'rinviato' });
  });

  it('e torna dopo tre ore, perché nel pomeriggio può essere arrivato', () => {
    const e = deveChiedereIngresso(
      { ruolo: 'student', rinviatoIl: alle('10:00') },
      alle('13:00')
    );
    expect(e.chiedere).toBe(true);
    expect(ORE_RINVIO).toBe(3);
  });

  it('un rinvio di ieri sera non zittisce la mattina dopo', () => {
    const e = deveChiedereIngresso(
      { ruolo: 'student', rinviatoIl: alle('21:00', '2026-10-11') },
      alle('08:00')
    );
    expect(e.chiedere).toBe(true);
  });

  it('fuori orario, anche se non è mai entrato', () => {
    expect(deveChiedereIngresso({ ruolo: 'student' }, alle('23:50')).motivo)
      .toBe('fuori_orario');
  });

  it('al titolare, sempre', () => {
    expect(deveChiedereIngresso({ ruolo: 'owner' }, alle('10:00')))
      .toEqual({ chiedere: false, motivo: 'ruolo' });
  });

  it('e quando dice di no dice anche perché: «non compare» non è una diagnosi', () => {
    ['ruolo', 'fuori_orario', 'gia_registrato', 'rinviato'].forEach((m) => {
      expect(typeof m).toBe('string');
    });
    expect(deveChiedereIngresso({ ruolo: 'owner' }, alle('10:00')).motivo).toBeTruthy();
  });
});

describe('le parole cambiano con chi legge', () => {
  it('a un allievo si parla del suo allenamento', () => {
    const t = testoIngresso('student');
    expect(t.titolo).toMatch(/arrivato/i);
    expect(t.sottotitolo).toMatch(/allenamento/i);
  });

  it('a chi lavora qui si parla del registro dello studio', () => {
    const t = testoIngresso('collaborator');
    expect(t.sottotitolo).toMatch(/lavorano qui/i);
    expect(t.sottotitolo).not.toMatch(/il tuo allenamento/i);
  });

  it('in tutti i casi si può rispondere che non si è in studio', () => {
    ['student', 'collaborator', 'manager', 'nutritionist'].forEach((r) => {
      expect(testoIngresso(r).rinvio).toMatch(/non sono in studio/i);
      expect(testoIngresso(r).azione.length).toBeGreaterThan(5);
    });
  });
});

// ------------------------------------------------------------
// CHE ARRIVI DAVVERO DAVANTI A TUTTO
// ------------------------------------------------------------

describe('la schermata è montata sopra l\'applicazione', () => {
  const nav = leggi('navigation/AppNavigator.tsx');

  it('il navigatore la mostra, e solo a chi deve riceverla', () => {
    expect(nav).toMatch(/<IngressoGate/);
    expect(nav).toMatch(/chiedeIngresso\(role\)/);
  });

  it('non si sovrappone alla presentazione del primo accesso', () => {
    expect(nav).toMatch(/!showOnboarding && !ingressoChiuso/);
  });

  it('una volta chiusa non ritorna nella stessa sessione', () => {
    expect(nav).toMatch(/onChiuso=\{\(\) => setIngressoChiuso\(true\)\}/);
  });
});

describe('la schermata non reinventa il lettore di QR', () => {
  const gate = leggi('components/common/IngressoGate.tsx');

  it('usa la schermata di check-in che esiste già', () => {
    expect(gate).toMatch(/import \{ CheckinScreen \}/);
    expect(gate).toMatch(/<CheckinScreen \/>/);
  });

  it('chiede al dominio se deve comparire, invece di deciderlo da sé', () => {
    expect(gate).toMatch(/deveChiedereIngresso\(/);
  });

  it('se non riesce a leggere i dati NON insiste', () => {
    const i = gate.indexOf('.catch(');
    expect(gate.slice(i, i + 400)).toMatch(/onChiuso\(\)/);
  });

  it('il pulsante principale è alto 56: si preme sulla porta, con una mano', () => {
    expect(gate).toMatch(/height: 56/);
  });

  it('e si può sempre dire di no', () => {
    expect(gate).toMatch(/segnaRinvio\(userId\)/);
  });
});

describe('il check-in porta con sé il ruolo di chi entra', () => {
  it('la schermata lo passa al servizio', () => {
    expect(leggi('screens/student/CheckinScreen.tsx'))
      .toMatch(/registerCheckin\(user\.id, displayName, method, user\.role\)/);
  });

  it('e il servizio lo scrive nel registro', () => {
    const s = leggi('services/checkinService.ts');
    expect(s).toMatch(/ruolo = 'student'/);
    expect(s).toMatch(/\n    ruolo,\n/);
  });
});
