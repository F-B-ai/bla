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

// ------------------------------------------------------------
// «NON FA NULLA» — 11 ottobre 2026
// ------------------------------------------------------------
//
// Dopo i 44 px il cestino si prendeva, e non succedeva ancora niente.
// Restava una sola cosa in mezzo fra il tocco e l'eliminazione: il
// dialogo `window.confirm` del browser. Quel dialogo può essere
// soppresso — app installata sulla schermata home, impostazione del
// telefono — e in quel caso risponde «no» da solo, senza chiedere
// niente a nessuno. Il pulsante funziona e sembra morto.
//
// La conferma adesso è un riquadro dell'app: se il tocco arriva, si
// vede. Non c'è più nessuno che possa rispondere al posto del
// titolare.

// ------------------------------------------------------------
// «NÉ ELIMINARE NÉ SPUNTARE» — la riga della giornata
// ------------------------------------------------------------
//
// Lo schermo che il titolare usa davvero non era quello che stavo
// aggiustando. Nella riga della giornata — quella con l'ora a
// sinistra e la freccia a destra — la casella del task era un
// DISEGNO da 12 px dentro il sottotitolo: sembrava una casella da
// spuntare e non era un pulsante. Il cestino non c'era affatto.
// Toccando la riga si apriva la modifica, e nella modifica non c'era
// modo di eliminare: si chiudeva, e il task era ancora lì.
//
// Tre schermi mostravano i task e due non potevano toccarli.

describe('la riga della giornata: spuntare e eliminare', () => {
  const schermata = leggi('screens/shared/CalendarScreen.tsx');
  const i = schermata.indexOf('const renderVoce =');
  const blocco = schermata.slice(i, schermata.indexOf('const renderOspiteRow'));

  it('la spunta è un pulsante vero, non un\'icona del sottotitolo', () => {
    expect(blocco).toMatch(/onPress=\{\(\) => handleToggleTask\(task\)\}/);
    expect(blocco).toMatch(/accessibilityLabel=\{v\.completato \? 'Segna come da fare'/);
  });

  it('il cestino c\'è, e apre la conferma dell\'app', () => {
    expect(blocco).toMatch(/onPress=\{\(\) => chiediEliminaTask\(task\)\}/);
  });

  it('i due pulsanti sono 44 px', () => {
    const j = schermata.indexOf('vocePulsante: {');
    const stile = schermata.slice(j, j + 220);
    expect(stile).toMatch(/width:\s*44/);
    expect(stile).toMatch(/height:\s*44/);
  });

  it('e NON sono annidati dentro il tocco della riga', () => {
    // Un tocco dentro un altro tocco si comporta diversamente sul
    // telefono e nel browser: spuntando si aprirebbe la modifica.
    const apre = blocco.indexOf('style={styles.agendaRowTocco}');
    const spunta = blocco.indexOf('handleToggleTask(task)');
    expect(apre).toBeGreaterThan(0);
    expect(spunta).toBeGreaterThan(apre);
    // il tocco della riga si chiude prima che comincino i pulsanti
    const chiusura = blocco.indexOf('</TouchableOpacity>', apre);
    expect(chiusura).toBeLessThan(spunta);
  });

  it('un appuntamento resta una riga sola che si apre toccandola', () => {
    expect(blocco).toMatch(/if \(!eTask \|\| !task\)/);
  });
});

describe('si elimina anche dalla schermata di modifica', () => {
  const modale = leggi('screens/shared/calendar/TaskModal.tsx');
  const schermata = leggi('screens/shared/CalendarScreen.tsx');

  it('il pulsante c\'è, ed è largo quanto lo schermo', () => {
    expect(modale).toMatch(/Elimina questo task/);
    const i = modale.indexOf('eliminaBtn: {');
    expect(modale.slice(i, i + 200)).toMatch(/height:\s*48/);
  });

  it('compare solo quando si sta modificando, mai creando', () => {
    expect(modale).toMatch(/\{!!editingTask && !!onDelete &&/);
  });

  it('e porta alla stessa conferma, non a una seconda strada', () => {
    const i = schermata.indexOf('onDelete={editingTask ?');
    expect(schermata.slice(i, i + 400)).toMatch(/chiediEliminaTask\(t\)/);
  });

  it('chiude la modifica prima di aprire la conferma', () => {
    const i = schermata.indexOf('onDelete={editingTask ?');
    const b = schermata.slice(i, i + 400);
    expect(b.indexOf('setShowTaskModal(false)')).toBeLessThan(b.indexOf('chiediEliminaTask(t)'));
  });

  it('e gli orari del task vengono dal dominio, a 15 minuti', () => {
    expect(modale).toMatch(/const TIME_SLOTS = grigliaOrari\(\)/);
    expect(modale).not.toMatch(/'07:30', '08:00'/);
  });
});

describe('la conferma è dentro l\'app, non nel browser', () => {
  const schermata = leggi('screens/shared/CalendarScreen.tsx');

  it('il cestino apre il riquadro dell\'app', () => {
    expect(schermata).toMatch(/onDelete=\{chiediEliminaTask\}/);
    expect(schermata).toMatch(/setTaskDaEliminare\(task\)/);
  });

  it('l\'eliminazione di un task non passa più da crossAlert', () => {
    const i = schermata.indexOf('const chiediEliminaTask');
    const j = schermata.indexOf('const eliminaTaskConfermato');
    const fine = schermata.indexOf('};', j);
    const blocco = schermata.slice(i, fine);
    expect(blocco).not.toMatch(/crossAlert/);
  });

  it('il riquadro è reso da renderTaskModal, che tutte le viste chiamano', () => {
    const i = schermata.indexOf('function renderTaskModal()');
    const blocco = schermata.slice(i, i + 1400);
    expect(blocco).toMatch(/<ConfirmModal/);
    // tre viste, tre chiamate: agenda, timeline, calendario
    const chiamate = schermata.match(/renderTaskModal\(\)/g) || [];
    expect(chiamate.length).toBeGreaterThanOrEqual(4); // 3 usi + la definizione
  });

  it('dice quale task sta per sparire, col suo titolo', () => {
    expect(schermata).toMatch(/taskDaEliminare\.title/);
  });

  it('mentre elimina non si può toccare due volte', () => {
    expect(schermata).toMatch(/inCorso=\{eliminandoTask\}/);
  });

  it('il motivo resta nel riquadro, non in un avviso che si chiude', () => {
    expect(schermata).toMatch(/errore=\{erroreEliminaTask\}/);
    expect(schermata).toMatch(/setErroreEliminaTask\(motivoEliminazione\(err\)\)/);
  });

  it('e il guasto finisce nel registro, per la lettura del lunedì', () => {
    const i = schermata.indexOf('registraGuasto({');
    expect(i).toBeGreaterThan(0);
    expect(schermata.slice(i, i + 220)).toMatch(/eliminazione task/);
  });
});

describe('il riquadro di conferma', () => {
  const comp = leggi('components/common/ConfirmModal.tsx');

  it('è un Modal dell\'app, senza dialoghi del browser', () => {
    expect(comp).toMatch(/<Modal/);
    // senza i commenti, dove `window.confirm` è citato apposta come
    // la cosa da cui ci si sta allontanando
    const codice = comp.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    expect(codice).not.toMatch(/window\.(confirm|alert)/);
  });

  it('ha due pulsanti alti 48 px: anche il «No» si deve prendere', () => {
    const altezze = comp.match(/height:\s*48/g) || [];
    expect(altezze.length).toBeGreaterThanOrEqual(2);
  });

  it('mostra il motivo quando qualcosa va storto', () => {
    expect(comp).toMatch(/\{!!errore &&/);
  });

  it('non si può confermare due volte di seguito', () => {
    const disabilitati = comp.match(/disabled=\{inCorso\}/g) || [];
    expect(disabilitati.length).toBe(2);
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
