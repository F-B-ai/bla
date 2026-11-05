// ============================================================
// CANCELLARE UNA CONSULENZA
// ------------------------------------------------------------
// 12 ottobre 2026: «dammi un tasto per eliminare le consulenze». Il
// tasto c'era — ed è proprio questo il punto. Era un bersaglio da
// circa 25 px attaccato alla riga che apre la scheda: col pollice si
// prendeva la riga, si apriva la consulenza, e sembrava che non si
// potesse cancellare. Poi, anche prendendolo, la conferma passava dal
// dialogo del browser, che su un'app installata sulla schermata home
// può essere soppressa e rispondere «no» da sola.
//
// È la terza volta in tre giorni che lo stesso difetto si ripresenta
// con un'altra faccia: una funzione che esiste e non si raggiunge.
// Questi test lo fissano nel punto in cui è stato trovato.
// ============================================================

import fs from 'fs';
import path from 'path';

const schermata = fs.readFileSync(
  path.join(__dirname, '..', '..', 'screens', 'staff', 'OnboardingScreen.tsx'),
  'utf8'
);

describe('il bersaglio si può centrare col dito', () => {
  it('i pulsanti della riga sono 44 px, non 25', () => {
    const i = schermata.indexOf('interessatoBtn: {');
    const stile = schermata.slice(i, i + 220);
    expect(stile).toMatch(/width: 44/);
    expect(stile).toMatch(/height: 44/);
    expect(schermata).not.toMatch(/interessatoBtn: \{ padding: spacing\.xs \}/);
  });

  it('e dicono che cosa fanno, col nome della persona', () => {
    expect(schermata).toMatch(/accessibilityLabel=\{`Cancella la consulenza di/);
    expect(schermata).toMatch(/accessibilityLabel=\{`Collega /);
  });
});

describe('la conferma è dentro l\'app', () => {
  it('non passa più dal dialogo del browser', () => {
    const i = schermata.indexOf('const cancella = (sch: SchedaOnboarding)');
    const j = schermata.indexOf('const collega =');
    expect(i).toBeGreaterThan(0);
    expect(schermata.slice(i, j)).not.toMatch(/crossAlert/);
  });

  it('il riquadro c\'è, ed è distruttivo', () => {
    expect(schermata).toMatch(/<ConfirmModal/);
    expect(schermata).toMatch(/titolo="Cancellare la consulenza\?"/);
    expect(schermata).toMatch(/distruttiva/);
  });

  it('dice di chi è la consulenza che sta per sparire', () => {
    expect(schermata).toMatch(/daCancellare\.ospiteNome/);
  });

  it('non si conferma due volte di seguito', () => {
    expect(schermata).toMatch(/inCorso=\{cancellando\}/);
  });
});

describe('se non riesce, dice perché', () => {
  it('il motivo arriva dal dominio, non è una frase fissa', () => {
    expect(schermata).toMatch(/setErroreCancella\(motivoEliminazione\(err\)\)/);
    expect(schermata).not.toContain('Non sono riuscito a cancellarla.');
  });

  it('e resta scritto nel riquadro, non in un avviso che si chiude', () => {
    expect(schermata).toMatch(/errore=\{erroreCancella\}/);
  });
});

describe('dopo la cancellazione', () => {
  it('se era la scheda aperta, il modulo si chiude', () => {
    // Restare su una scheda che non esiste più fa salvare una cosa
    // cancellata un minuto prima.
    const i = schermata.indexOf('const cancellaConfermato');
    const blocco = schermata.slice(i, i + 900);
    expect(blocco).toMatch(/if \(schedaApertaId === sch\.id\) chiudiScheda\(\)/);
  });

  it('e l\'elenco si rilegge', () => {
    const i = schermata.indexOf('const cancellaConfermato');
    expect(schermata.slice(i, i + 900)).toMatch(/ricaricaInteressati\(\)/);
  });
});
