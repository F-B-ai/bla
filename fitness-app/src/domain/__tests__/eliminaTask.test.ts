// ============================================================
// ELIMINARE UN TASK — perché non ci riusciva
// ------------------------------------------------------------
// Segnalato l'11 ottobre 2026: «non riesco ad eliminare i task».
// La funzione c'era, il permesso c'era, il pulsante c'era. Tre cose
// però rendevano l'eliminazione un muro:
//
//   1. IL BERSAGLIO. Cestino e matita erano due quadratini da 24 px
//      incollati uno sopra l'altro. Col pollice si prendeva la
//      matita: si apriva la modifica, si chiudeva, e il task era
//      ancora lì. Non è un dettaglio estetico — è la differenza fra
//      una funzione che esiste e una che si può usare.
//
//   2. IL RITORNO. Dopo l'eliminazione si rileggeva tutto dal
//      server. Se la lettura arrivava dalla cache, il task tornava
//      in pagina: cancellato davvero, e di nuovo sullo schermo.
//
//   3. IL SILENZIO. In caso di errore il messaggio era «Impossibile
//      eliminare»: non diceva se era la linea, il ruolo o una cosa
//      già cancellata altrove — quindi non diceva nemmeno se
//      riprovare.
// ============================================================

import fs from 'fs';
import path from 'path';
import { motivoEliminazione } from '../salvataggio';

const leggi = (relativo: string): string =>
  fs.readFileSync(path.join(__dirname, '..', '..', relativo), 'utf8');

describe('il messaggio dice perché', () => {
  it('il permesso negato si riconosce, e dice a chi chiedere', () => {
    const m = motivoEliminazione({ code: 'permission-denied' });
    expect(m).toMatch(/rifiutato/i);
    expect(m).toMatch(/titolare/i);
    expect(m).toContain('permission-denied');
  });

  it('una cosa già cancellata altrove non è un errore, ed è detto', () => {
    const m = motivoEliminazione({ code: 'not-found' });
    expect(m).toMatch(/già/i);
    expect(m).toMatch(/altra postazione/i);
  });

  it('la linea caduta dice di riprovare, non di rassegnarsi', () => {
    expect(motivoEliminazione({ code: 'unavailable' })).toMatch(/connessione/i);
  });

  it('la sessione scaduta dice di rientrare', () => {
    expect(motivoEliminazione({ code: 'unauthenticated' })).toMatch(/rientra/i);
  });

  it('non parla mai di «salvataggio»: qui si sta cancellando', () => {
    ['permission-denied', 'not-found', 'unavailable', 'xyz-sconosciuto'].forEach((code) => {
      expect(motivoEliminazione({ code })).not.toMatch(/salvataggio/i);
    });
    expect(motivoEliminazione(new Error('boom'))).not.toMatch(/salvataggio/i);
  });

  it('un errore senza codice e senza testo non resta muto', () => {
    const m = motivoEliminazione({});
    expect(m).toMatch(/non ha detto perché/i);
    expect(m.length).toBeGreaterThan(40);
  });

  it('il testo tecnico non si nasconde: serve a chi deve aggiustare', () => {
    expect(motivoEliminazione(new Error('PERMISSION_DENIED: insufficient'))).toContain(
      'PERMISSION_DENIED: insufficient'
    );
  });
});

describe('il pulsante si può centrare col dito', () => {
  const card = leggi('screens/shared/calendar/TaskCard.tsx');

  it('i bersagli sono 44 px, non 24', () => {
    expect(card).toMatch(/width:\s*44/);
    expect(card).toMatch(/height:\s*44/);
    expect(card).not.toMatch(/taskActionBtn:\s*\{\s*padding:\s*4,?\s*\}/);
  });

  it('cestino e matita non sono più incolonnati uno sull\'altro', () => {
    const i = card.indexOf('taskActions:');
    expect(card.slice(i, i + 120)).toMatch(/flexDirection:\s*'row'/);
  });

  it('e si capisce quale è quale anche senza vederli', () => {
    expect(card).toMatch(/accessibilityLabel="Elimina il task"/);
    expect(card).toMatch(/accessibilityLabel="Modifica il task"/);
  });
});

describe('il task eliminato non torna in pagina', () => {
  const schermata = leggi('screens/shared/CalendarScreen.tsx');
  const i = schermata.indexOf('await deleteTask(task.id)');
  const blocco = schermata.slice(i, i + 900);

  it('si toglie dalla lista subito, senza aspettare la rilettura', () => {
    expect(i).toBeGreaterThan(0);
    expect(blocco).toMatch(/setTasks\(\(p\) => p\.filter/);
  });

  it('e la rilettura si fa comunque, per allinearsi al server', () => {
    expect(blocco).toMatch(/loadData\(\)/);
  });

  it('l\'errore dice il motivo, non «Impossibile eliminare»', () => {
    expect(blocco).toMatch(/motivoEliminazione\(err\)/);
    expect(schermata).not.toContain("'Impossibile eliminare'");
  });

  it('anche per gli appuntamenti, che avevano lo stesso silenzio', () => {
    const j = schermata.indexOf('await deleteAppointment(item.id)');
    expect(schermata.slice(j, j + 400)).toMatch(/motivoEliminazione\(err\)/);
  });
});
