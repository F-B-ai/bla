import type { DefaultExercise } from './defaultExercises';
import { AVVISO_RESPIRO, PERIMETRO } from '../domain/perimetro';

// ============================================================
// LIBRERIA v3 — 10 settembre 2026
// ------------------------------------------------------------
// Richiesta del titolare, parola per parola:
//
//   «Aggiungi piuttosto altri esercizi, 30 per uomo e 30 per donne
//    distribuiti su tutti i gruppi muscolari. […] Per quanto
//    riguarda le donne, esercizi più mirati sulla zona gluteo
//    femorale, ovviamente. E poi l'inserimento dei protocolli di
//    decongestione e dei protocolli speciali per le donne.»
//
// Qui dentro, in quest'ordine:
//   1. 30 esercizi uomo, distribuiti su tutti i gruppi
//   2. 30 esercizi donna, concentrati su gluteo e femorale
//   3. i metodi cardio con il loro nome: LISS, Zona 2, HIIT, Tabata,
//      SIT, fartlek, EMOM, circuito metabolico, piramidale
//   4. i protocolli di decongestione
//   5. i protocolli speciali per la donna
//
// Le immagini e i filmati li aggiunge il direttore tecnico: qui c'è
// il metodo scritto, che è la parte che non si delega.
// ============================================================

// L'avviso sul respiro e il perimetro vivono in domain/perimetro.ts:
// sono regole, non contenuto, e da lì li importa anche chi non ha
// niente a che vedere con la libreria esercizi.
export { AVVISO_RESPIRO, PERIMETRO };

// ============================================================
// 1. TRENTA ESERCIZI UOMO, DISTRIBUITI SU TUTTI I GRUPPI
// ------------------------------------------------------------
// Quattro petto, quattro dorso, quattro spalle, tre bicipiti, tre
// tricipiti, quattro quadricipiti, tre femorali, due glutei, tre
// addome. Nessun gruppo saltato: era esattamente la richiesta.
// ============================================================

export const uomoV3: DefaultExercise[] = [
  // ---------- PETTORALI ----------
  {
    name: 'Panca inclinata al multipower',
    description: 'Panca a trenta gradi sotto la barra guidata, occhi appena sotto la sbarra. Scapole retratte e ferme, piedi piantati. Scendi portando la barra alla parte alta del petto, sfiorala e spingi senza bloccare i gomiti. La guida toglie il lavoro di stabilizzazione: serve proprio a questo, potersi concentrare sul petto quando si è vicini al cedimento.',
    sets: 4, reps: '8-12', restSeconds: 90, category: 'forza',
    notes: 'La guida non è un aiuto per andare più pesante: è un aiuto per andare più preciso.',
    gender: 'male', muscolo: 'pettorali',
  },
  {
    name: 'Distensioni con manubri presa neutra',
    description: 'Sdraiato, un manubrio per mano con i palmi che si fronteggiano e i gomiti a circa quarantacinque gradi dal busto. Scendi fino a portare i manubri all\'altezza del petto e spingi verso l\'alto avvicinandoli senza farli sbattere. La presa neutra scarica la spalla anteriore: è la versione che regge anche chi ha un passato di fastidi alla cuffia.',
    sets: 4, reps: '10-12', restSeconds: 90, category: 'forza',
    notes: 'I gomiti restano stretti. Se si aprono a novanta, hai perso il motivo per cui usi questa presa.',
    gender: 'male', muscolo: 'pettorali',
  },
  {
    name: 'Croci ai cavi bassi verso l\'alto',
    description: 'In piedi al centro della cross-over con i cavi in basso, un braccio per lato, gomiti morbidi e fissi. Porta le mani in alto e al centro fino a incrociarle sopra lo sterno, come per abbracciare qualcuno più alto di te. Il vettore basso-alto colpisce la porzione clavicolare del pettorale, quella che resta indietro in quasi tutti.',
    sets: 3, reps: '12-15', restSeconds: 75, category: 'forza',
    notes: 'Fermata di un secondo nel punto di incrocio. È lì che il petto alto lavora davvero.',
    gender: 'male', muscolo: 'pettorali',
  },
  {
    name: 'Piegamenti a presa larga sulle maniglie',
    description: 'Mani sulle maniglie da push-up, larghe più delle spalle, corpo in linea dalle caviglie alla testa. Scendi finché le spalle non superano di poco la linea delle mani, sfruttando la profondità che le maniglie concedono, e risali spingendo il pavimento lontano. Il maggiore allungamento in basso è tutto il vantaggio di questo attrezzo.',
    sets: 3, reps: '10-20', restSeconds: 75, category: 'funzionale',
    notes: 'Glutei contratti: se il bacino cade, l\'esercizio si sposta sulla lombare.',
    gender: 'male', muscolo: 'pettorali',
  },

  // ---------- DORSALI ----------
  {
    name: 'Lat machine presa inversa',
    description: 'Seduto con le cosce bloccate, impugna la barra a presa supina a larghezza spalle. Tira portando la barra allo sterno con i gomiti che scorrono vicini ai fianchi, petto in fuori, e risali in controllo completo fino a distendere. La presa supina porta i gomiti in linea con il corpo e sposta il lavoro sul gran dorsale basso.',
    sets: 4, reps: '10-12', restSeconds: 90, category: 'forza',
    notes: 'Non tirare con le braccia: comincia il movimento abbassando le scapole.',
    gender: 'male', muscolo: 'dorsali',
  },
  {
    name: 'Rematore a un braccio al cavo basso',
    description: 'In affondo corto davanti al cavo basso, una mano sulla coscia avanti e l\'altra sulla maniglia. Tira il gomito indietro lungo il fianco fino a portare la mano all\'anca, lascia che la scapola scorra avanti nella fase negativa. Un lato per volta permette un\'escursione che il bilanciere non concede mai.',
    sets: 3, reps: '10-12 per lato', restSeconds: 75, category: 'forza',
    notes: 'Il busto resta fermo: se ruota per aiutare la tirata, il carico è troppo.',
    gender: 'male', muscolo: 'dorsali',
  },
  {
    name: 'Trazioni a presa neutra',
    description: 'Appeso alle maniglie parallele con i palmi che si fronteggiano, gambe leggermente flesse e incrociate. Tira il petto verso le maniglie tenendo i gomiti che puntano avanti, e scendi fino alla distensione completa senza lasciarti cadere. È la trazione più tollerata dalla spalla: la presa neutra è la posizione naturale dell\'articolazione.',
    sets: 4, reps: 'max', restSeconds: 120, category: 'forza',
    notes: 'Se non arrivi a sei ripetizioni pulite, usa l\'elastico: le mezze trazioni non allenano niente.',
    gender: 'male', muscolo: 'dorsali',
  },
  {
    name: 'Chest supported row su panca inclinata',
    description: 'Prono su una panca inclinata a quarantacinque gradi, petto appoggiato, un manubrio per mano che pende. Tira i gomiti indietro fino a portare i manubri ai fianchi stringendo le scapole, poi scendi lentamente. Con il petto appoggiato la schiena non può barare: la lombare è fuori dal gioco e resta solo il dorso.',
    sets: 4, reps: '10-12', restSeconds: 90, category: 'forza',
    notes: 'Se sollevi il petto dalla panca per tirare, il peso è sbagliato.',
    gender: 'male', muscolo: 'dorsali',
  },

  // ---------- SPALLE ----------
  {
    name: 'Alzate laterali alla macchina',
    description: 'Seduto con i cuscinetti contro la parte esterna delle braccia, gomiti leggermente flessi. Sali fino all\'altezza delle spalle guidando con il gomito e non con la mano, fermati un istante e scendi in tre secondi. La macchina mantiene la resistenza costante anche in basso, dove con i manubri il deltoide si riposa.',
    sets: 4, reps: '12-15', restSeconds: 60, category: 'forza',
    notes: 'Le spalle restano basse: se le scrollate salgono, sta lavorando il trapezio.',
    gender: 'male', muscolo: 'spalle',
  },
  {
    name: 'Tirate al mento con corda al cavo',
    description: 'Corda agganciata al cavo basso, una mano per capo, braccia distese davanti alle cosce. Tira portando i gomiti alti e larghi fino all\'altezza delle spalle, mai oltre, separando le estremità della corda. La corda lascia libera la rotazione dell\'avambraccio ed evita il conflitto che la barra rigida crea nella spalla.',
    sets: 3, reps: '12-15', restSeconds: 60, category: 'forza',
    notes: 'Il gomito si ferma alla linea della spalla. Sopra quella linea non c\'è più deltoide, c\'è solo impingement.',
    gender: 'male', muscolo: 'spalle',
  },
  {
    name: 'Spinte sopra la testa al multipower',
    description: 'Seduto con lo schienale alto sotto la barra guidata, barra all\'altezza delle clavicole e avambracci verticali. Spingi fino a distendere senza bloccare, e scendi fino a sfiorare le clavicole. La guida permette di spingere a cedimento senza il rischio che la barra ti scappi in avanti quando il deltoide finisce.',
    sets: 4, reps: '8-12', restSeconds: 90, category: 'forza',
    notes: 'Costole basse e glutei contratti: la lombare non deve inarcarsi per far salire il peso.',
    gender: 'male', muscolo: 'spalle',
  },
  {
    name: 'Alzate laterali con fermata a metà',
    description: 'Manubri leggeri lungo i fianchi. Sali fino a quarantacinque gradi, fermati due secondi, prosegui fino all\'altezza della spalla, fermati un secondo, poi scendi in tre secondi senza sosta. La doppia fermata elimina qualsiasi slancio e rende evidente quanto poco carico serva davvero al deltoide laterale.',
    sets: 3, reps: '8-10', restSeconds: 75, category: 'forza',
    notes: 'Con questa esecuzione il peso si dimezza. È normale, ed è il punto.',
    gender: 'male', muscolo: 'spalle',
  },

  // ---------- BICIPITI ----------
  {
    name: 'Curl spider su panca inclinata',
    description: 'Prono su una panca inclinata a quarantacinque gradi con le braccia che pendono verticali, un manubrio per mano. Fletti i gomiti fino alla massima contrazione senza muovere la spalla, e scendi lentamente fino a distendere. Con le braccia davanti al corpo il bicipite lavora accorciato: è la posizione in cui la contrazione di picco è più intensa.',
    sets: 3, reps: '10-12', restSeconds: 60, category: 'forza',
    notes: 'Le spalle non si muovono di un centimetro: si muovono solo i gomiti.',
    gender: 'male', muscolo: 'bicipiti',
  },
  {
    name: 'Curl 21 con bilanciere EZ',
    description: 'Bilanciere EZ a presa supina. Sette ripetizioni dal basso a metà, sette da metà in alto, sette complete, tutte di fila senza pausa. Le tre porzioni di escursione accumulano fatica in modo diverso: alla ventunesima il bicipite ha lavorato in ogni punto dell\'arco.',
    sets: 3, reps: '21 (7+7+7)', restSeconds: 90, category: 'forza',
    notes: 'Si parte leggeri: chi sceglie il carico sulle ultime sette non arriva alla fine.',
    gender: 'male', muscolo: 'bicipiti',
  },
  {
    name: 'Curl al cavo con braccio dietro il corpo',
    description: 'In piedi di fianco alla cross-over, cavo basso, un passo avanti in modo che il braccio resti dietro la linea del busto. Fletti il gomito tenendo la spalla ferma dietro, e scendi in controllo. Con il braccio in estensione della spalla il capo lungo del bicipite parte già allungato, e la tensione in basso non sparisce mai.',
    sets: 3, reps: '12-15 per lato', restSeconds: 60, category: 'forza',
    notes: 'Se il gomito scivola in avanti mentre sali, hai perso l\'allungamento che sei venuto a cercare.',
    gender: 'male', muscolo: 'bicipiti',
  },

  // ---------- TRICIPITI ----------
  {
    name: 'Pushdown al cavo con barra dritta',
    description: 'Barra dritta al cavo alto, presa prona a larghezza spalle, gomiti stretti ai fianchi. Estendi i gomiti fino a distendere completamente e risali fino a novanta gradi senza far salire i gomiti. La barra rigida permette carichi superiori alla corda: qui si costruisce forza, con la corda si cerca la contrazione.',
    sets: 4, reps: '10-12', restSeconds: 60, category: 'forza',
    notes: 'Busto fermo. Se ti pieghi in avanti per spingere, stai facendo un push-down con il petto.',
    gender: 'male', muscolo: 'tricipiti',
  },
  {
    name: 'Estensioni dietro la testa in ginocchio al cavo',
    description: 'In ginocchio dando le spalle alla cross-over, corda al cavo alto tenuta dietro la nuca, busto inclinato avanti con la schiena in linea. Estendi i gomiti portando le mani avanti e in alto, poi torna dietro la nuca in controllo. Con le braccia sopra la testa il capo lungo del tricipite è in allungamento massimo, ed è l\'unico modo per allenarlo per intero.',
    sets: 3, reps: '12-15', restSeconds: 60, category: 'forza',
    notes: 'I gomiti restano puntati avanti e fermi: sono un cardine, non un pistone.',
    gender: 'male', muscolo: 'tricipiti',
  },
  {
    name: 'JM press con bilanciere EZ',
    description: 'Sdraiato come per una presa stretta, bilanciere EZ sopra il petto. Abbassa portando la barra verso il mento con i gomiti che avanzano leggermente, in una via di mezzo fra panca stretta e french press, poi spingi indietro e in alto. È il movimento che i powerlifter usano per costruire il tricipite sotto carico senza spremere il gomito.',
    sets: 4, reps: '8-10', restSeconds: 90, category: 'forza',
    notes: 'Carico moderato e traiettoria studiata. Non è un esercizio in cui si improvvisa.',
    gender: 'male', muscolo: 'tricipiti',
  },

  // ---------- QUADRICIPITI ----------
  {
    name: 'Pressa 45 gradi con fermata in basso',
    description: 'Piedi a larghezza spalle a metà pedana. Scendi fino a novanta gradi al ginocchio, fermati due secondi con il carico fermo e la schiena aderente, poi spingi senza bloccare le ginocchia. La fermata elimina il rimbalzo elastico e obbliga il quadricipite a ripartire da fermo, che è la parte che di solito nessuno allena.',
    sets: 4, reps: '8-10', restSeconds: 120, category: 'forza',
    notes: 'La lombare resta appoggiata. Se il bacino si arrotola in basso, sei sceso troppo per la tua mobilità.',
    gender: 'male', muscolo: 'quadricipiti',
  },
  {
    name: 'Squat al multipower con piedi avanzati',
    description: 'Barra guidata sui trapezi, piedi trenta centimetri più avanti del solito. Scendi verticalmente lungo la guida fino a superare il parallelo, busto quasi eretto, e risali. Con i piedi avanti il busto resta verticale e il carico si concentra sul quadricipite: è la variante per chi ha femori lunghi e nello squat libero si piega troppo in avanti.',
    sets: 4, reps: '10-12', restSeconds: 120, category: 'forza',
    notes: 'Le ginocchia seguono le punte. Piedi troppo avanti e il ginocchio finisce in taglio.',
    gender: 'male', muscolo: 'quadricipiti',
  },
  {
    name: 'Squat con fermata di due secondi',
    description: 'Squat con bilanciere, discesa controllata fino sotto il parallelo, due secondi immobili in buca mantenendo la pressione addominale, poi risalita esplosiva. La fermata smaschera ogni compenso: chi in buca crolla in avanti o perde il bacino, qui non può nasconderlo.',
    sets: 4, reps: '5-6', restSeconds: 180, category: 'forza',
    notes: 'Si cala il carico del venti per cento rispetto allo squat normale. Chi non lo fa, si ferma male.',
    gender: 'male', muscolo: 'quadricipiti',
  },
  {
    name: 'Step-up alto su box con manubri',
    description: 'Box all\'altezza del ginocchio, un manubrio per mano. Sali spingendo tutto il piede sul box senza darti la spinta con la gamba a terra, e scendi in controllo appoggiando la punta. L\'altezza porta l\'anca oltre i novanta gradi e chiede al quadricipite di lavorare in un punto dell\'escursione che nella vita di tutti i giorni si evita.',
    sets: 3, reps: '8-10 per gamba', restSeconds: 90, category: 'funzionale',
    notes: 'Se il piede a terra dà lo slancio, il box è troppo alto: abbassalo.',
    gender: 'male', muscolo: 'quadricipiti',
  },

  // ---------- FEMORALI ----------
  {
    name: 'Leg curl sdraiato con fermata',
    description: 'Prono alla macchina, cuscinetto sopra i talloni, bacino aderente. Chiudi fino alla massima contrazione, fermati due secondi con i polpacci contro i femorali, poi scendi in quattro secondi fino quasi a distendere. La fermata in accorciamento e la negativa lunga sono le due cose che al femorale mancano quasi sempre.',
    sets: 3, reps: '10-12', restSeconds: 75, category: 'forza',
    notes: 'Il bacino non si stacca dal supporto: se si alza, stai tirando con la lombare.',
    gender: 'male', muscolo: 'femorali',
  },
  {
    name: 'Stacco rumeno alla smith machine',
    description: 'Barra guidata all\'altezza delle cosce, presa prona a larghezza spalle. Manda il bacino indietro tenendo le ginocchia appena flesse e la schiena in linea, scendi finché senti tirare i femorali, poi risali spingendo il bacino avanti. La guida verticale toglie l\'equilibrio dall\'equazione e lascia sentire l\'allungamento, che è il punto dell\'esercizio.',
    sets: 4, reps: '8-10', restSeconds: 120, category: 'forza',
    notes: 'Si scende finché la schiena resta in linea, non un centimetro oltre.',
    gender: 'male', muscolo: 'femorali',
  },
  {
    name: 'Slider leg curl a terra',
    description: 'Supino con i talloni su due slider o due panni, bacino sollevato in ponte. Distendi lentamente le gambe facendo scivolare i talloni lontano senza far cadere il bacino, poi richiama i talloni verso i glutei. Il bacino sospeso obbliga il femorale a lavorare in flessione del ginocchio ed estensione dell\'anca insieme: è così che lavora quando corri.',
    sets: 3, reps: '8-12', restSeconds: 75, category: 'funzionale',
    notes: 'Se il bacino tocca terra durante la distensione, accorcia il raggio.',
    gender: 'male', muscolo: 'femorali',
  },

  // ---------- GLUTEI ----------
  {
    name: 'Hip thrust con manubrio senza panca',
    description: 'Seduto a terra con le scapole appoggiate al pavimento e un manubrio sulle anche protetto da un cuscinetto, piedi piantati. Spingi il bacino verso l\'alto fino ad allineare tronco e cosce, chiudi il gluteo un secondo e scendi senza appoggiare. Con la schiena a terra l\'escursione è ridotta ma il carico sul gluteo resta pieno: è la versione che si fa ovunque, anche in casa.',
    sets: 4, reps: '12-15', restSeconds: 75, category: 'forza',
    notes: 'Si chiude con il gluteo, non con la lombare: le costole restano basse.',
    gender: 'male', muscolo: 'glutei',
  },
  {
    name: 'Abductor machine con busto inclinato avanti',
    description: 'Seduto alla macchina per abduttori, busto inclinato in avanti di circa trenta gradi tenendosi ai supporti. Apri le ginocchia fino a fine corsa, fermati un secondo e chiudi in controllo. L\'inclinazione del busto porta il gluteo in una posizione più allungata e sposta il lavoro dal tensore della fascia lata al medio gluteo.',
    sets: 3, reps: '15-20', restSeconds: 60, category: 'forza',
    notes: 'Se resti seduto dritto lavori il fianco. Inclinato lavori il gluteo. È tutta lì la differenza.',
    gender: 'male', muscolo: 'glutei',
  },

  // ---------- ADDOME ----------
  {
    name: 'Crunch alla macchina',
    description: 'Seduto con le maniglie sopra le spalle e i piedi bloccati. Chiudi il busto avvicinando lo sterno al bacino, fermati un secondo alla massima flessione e risali lentamente senza scaricare. La macchina permette di caricare il retto addominale in progressione, cosa che a corpo libero si può fare solo aggiungendo ripetizioni.',
    sets: 3, reps: '12-15', restSeconds: 60, category: 'forza',
    notes: 'Si flette la colonna, non l\'anca: il movimento è corto e il collo non tira.',
    gender: 'male', muscolo: 'addome',
  },
  {
    name: 'Sollevamento gambe alle parallele',
    description: 'Appoggiato sugli avambracci alle parallele con la schiena contro lo schienale, gambe che pendono. Solleva le ginocchia arrotolando il bacino verso l\'alto, non solo flettendo l\'anca, e scendi lentamente. L\'arrotolamento del bacino è ciò che distingue un esercizio per l\'addome da un esercizio per i flessori dell\'anca.',
    sets: 3, reps: '10-15', restSeconds: 60, category: 'funzionale',
    notes: 'Se la lombare si stacca dallo schienale in basso, hai perso il controllo del bacino.',
    gender: 'male', muscolo: 'addome',
  },
  {
    name: 'Plank su superficie instabile',
    description: 'Plank sugli avambracci con i gomiti su un cuscino propriocettivo o su una bosu rovesciata, corpo in linea. Le micro-oscillazioni della superficie chiamano in continuazione il trasverso e gli obliqui, che devono correggere senza che il bacino si muova. Meno secondi dello stesso plank a terra, e molto più lavoro.',
    sets: 3, reps: '20-40 sec', restSeconds: 60, category: 'funzionale',
    notes: 'Al primo cedimento del bacino si scende. Un plank che ondeggia non allena, insegna a compensare.',
    gender: 'male', muscolo: 'addome',
  },
];

// ============================================================
// 2. TRENTA ESERCIZI DONNA, ZONA GLUTEO-FEMORALE
// ------------------------------------------------------------
// «Per quanto riguarda le donne, esercizi più mirati sulla zona
// gluteo femorale, ovviamente.» Diciotto glutei, dodici femorali.
// Non è una libreria diversa: è la stessa libreria con il peso
// spostato dove serve.
// ============================================================

export const donnaV3: DefaultExercise[] = [
  // ---------- GLUTEI ----------
  {
    name: 'Hip thrust alla macchina',
    description: 'Schiena contro lo schienale imbottito, cintura o cuscinetto sulle anche, piedi piantati a larghezza bacino. Spingi il bacino avanti fino ad allineare tronco e cosce, chiudi il gluteo un secondo pieno, poi scendi in controllo senza appoggiare il carico. La macchina tiene la resistenza orizzontale per tutta l\'escursione: sul gluteo non esiste attrezzo più diretto.',
    sets: 4, reps: '10-12', restSeconds: 90, category: 'forza',
    notes: 'Mento verso lo sterno e costole basse: se guardi il soffitto, chiudi con la lombare.',
    gender: 'female', muscolo: 'glutei',
  },
  {
    name: 'Hip thrust con banda sopra le ginocchia',
    description: 'Hip thrust classico con una banda elastica appena sopra le ginocchia. Durante tutta la serie spingi le ginocchia verso l\'esterno contro la banda, soprattutto nella chiusura in alto. L\'abduzione attiva chiama il medio gluteo insieme al grande gluteo, e impedisce alle ginocchia di crollare dentro nelle ultime ripetizioni.',
    sets: 4, reps: '12-15', restSeconds: 75, category: 'forza',
    notes: 'La banda è un promemoria, non una resistenza: se ti obbliga a rallentare, è troppo dura.',
    gender: 'female', muscolo: 'glutei',
  },
  {
    name: 'B-stance hip thrust',
    description: 'In posizione di hip thrust con un piede piantato normale e l\'altro appoggiato solo con la punta, mezzo passo avanti, che fa da stabilizzatore. Spingi con la gamba di lavoro. Si ottiene quasi il carico di un monopodalico senza il problema di equilibrio, ed è il ponte perfetto verso la versione a una gamba sola.',
    sets: 3, reps: '10-12 per lato', restSeconds: 75, category: 'forza',
    notes: 'La gamba d\'appoggio accompagna e basta: se spinge, l\'esercizio torna a due gambe.',
    gender: 'female', muscolo: 'glutei',
  },
  {
    name: 'Ponte glutei con spalle e piedi rialzati',
    description: 'Scapole su una panca e talloni su un rialzo della stessa altezza o poco meno, corpo sospeso fra i due appoggi. Spingi il bacino in alto fino alla linea, chiudi il gluteo, scendi senza toccare. Con entrambe le estremità rialzate l\'escursione dell\'anca è la più ampia possibile a corpo libero.',
    sets: 3, reps: '12-15', restSeconds: 75, category: 'funzionale',
    notes: 'Il collo resta neutro sulla panca: guarda avanti, non indietro.',
    gender: 'female', muscolo: 'glutei',
  },
  {
    name: 'Abduzione a terra in decubito laterale con elastico',
    description: 'Sdraiata su un fianco con la banda sopra le ginocchia, gambe sovrapposte e anche leggermente flesse. Solleva il ginocchio di sopra ruotando l\'anca senza far rotolare indietro il bacino, fermati in alto, scendi lentamente. È il clamshell portato a carico: quando il bacino resta fermo, il medio gluteo brucia in venti secondi.',
    sets: 3, reps: '15-20 per lato', restSeconds: 45, category: 'forza',
    notes: 'Una mano sul fianco per sentire se il bacino ruota. Se ruota, abbassa l\'ampiezza.',
    gender: 'female', muscolo: 'glutei',
  },
  {
    name: 'Frog pump monopodalico',
    description: 'Supina con la pianta di un piede appoggiata contro il ginocchio dell\'altra gamba flessa e il ginocchio aperto verso l\'esterno, l\'altra gamba sollevata. Spingi il bacino in alto con la gamba a terra e chiudi il gluteo. L\'anca extraruotata mette il grande gluteo nella posizione in cui contrae di più, e una gamba sola raddoppia il carico.',
    sets: 3, reps: '15-20 per lato', restSeconds: 60, category: 'funzionale',
    notes: 'Ripetizioni corte e veloci con chiusura netta in alto: qui si cerca il sangue, non il carico.',
    gender: 'female', muscolo: 'glutei',
  },
  {
    name: 'Kickback alla macchina',
    description: 'In piedi alla macchina glute kickback, avampiede sulla pedana e busto appoggiato al supporto. Estendi l\'anca indietro senza inarcare la schiena, fermati alla massima estensione, torna lentamente. Il supporto per il busto è ciò che rende questa versione superiore al cavo: la lombare non può rubare il movimento.',
    sets: 3, reps: '12-15 per lato', restSeconds: 60, category: 'forza',
    notes: 'L\'esercizio finisce quando il tronco e la coscia sono in linea. Oltre, la spinta viene dalla schiena.',
    gender: 'female', muscolo: 'glutei',
  },
  {
    name: 'Salita su box alto con spinta di tallone',
    description: 'Box appena sopra l\'altezza del ginocchio. Appoggia tutto il piede e sali spingendo con il tallone, portando l\'anca in estensione completa in cima senza slancio dell\'altra gamba. Il box alto obbliga a partire da un\'anca molto flessa: è la posizione in cui il gluteo produce più forza.',
    sets: 3, reps: '8-10 per gamba', restSeconds: 90, category: 'funzionale',
    notes: 'Le dita del piede si possono sollevare: se le usi per spingere, hai spostato tutto sul quadricipite.',
    gender: 'female', muscolo: 'glutei',
  },
  {
    name: 'Affondo bulgaro con deficit',
    description: 'Piede posteriore su una panca, piede anteriore su un rialzo di dieci-quindici centimetri. Scendi con il busto leggermente inclinato avanti finché il ginocchio posteriore va sotto il livello del piede anteriore, poi risali spingendo con il tallone. Il deficit aggiunge l\'ultimo pezzo di escursione, quello in cui il gluteo è più allungato.',
    sets: 3, reps: '8-10 per gamba', restSeconds: 90, category: 'forza',
    notes: 'Il deficit si aggiunge solo quando il bulgaro normale è pulito e senza dolore al ginocchio.',
    gender: 'female', muscolo: 'glutei',
  },
  {
    name: 'Reverse hyper focus gluteo',
    description: 'Prona sulla panca con il bacino sul bordo e le mani che tengono saldamente, gambe che pendono flesse a novanta con le anche extraruotate. Solleva le cosce fino alla linea del tronco contraendo il gluteo, e scendi in controllo. Con le ginocchia piegate i femorali sono accorciati e il lavoro resta sul gluteo.',
    sets: 3, reps: '15-20', restSeconds: 60, category: 'funzionale',
    notes: 'Si sale con il gluteo e ci si ferma in linea. Non è un esercizio per la schiena e non deve diventarlo.',
    gender: 'female', muscolo: 'glutei',
  },
  {
    name: 'Pull-through con elastico',
    description: 'Elastico ancorato in basso dietro di te, passato fra le gambe, capi tenuti con entrambe le mani. Manda il bacino indietro lasciando che le braccia scendano fra le cosce, poi spingi il bacino avanti fino alla linea chiudendo il gluteo. È lo schema dello stacco insegnato senza carico sulla colonna: perfetto per imparare la cerniera dell\'anca.',
    sets: 3, reps: '15-20', restSeconds: 60, category: 'funzionale',
    notes: 'La tensione dell\'elastico tira il bacino indietro: è il maestro, lasciati correggere da lui.',
    gender: 'female', muscolo: 'glutei',
  },
  {
    name: 'Hip thrust monopodalico con piede su rialzo',
    description: 'Scapole sulla panca, un piede su un rialzo di dieci centimetri e l\'altra gamba sollevata e ferma. Spingi il bacino in alto con la gamba di lavoro fino alla linea, chiudi, scendi senza appoggiare. Il rialzo aumenta la flessione di partenza dell\'anca e rende il monopodalico molto più esigente del solito.',
    sets: 3, reps: '8-12 per lato', restSeconds: 75, category: 'forza',
    notes: 'Se il bacino si inclina da un lato, la gamba libera sta compensando: tienila ferma e alta.',
    gender: 'female', muscolo: 'glutei',
  },
  {
    name: 'Squat sumo alla pressa con piedi alti e larghi',
    description: 'Alla pressa a quarantacinque gradi con i piedi in alto sulla pedana e molto larghi, punte aperte. Scendi fino a portare le ginocchia verso le spalle mantenendo la schiena aderente, poi spingi con i talloni senza bloccare. Piedi alti e larghi spostano il lavoro su gluteo e adduttori e alleggeriscono il quadricipite.',
    sets: 4, reps: '12-15', restSeconds: 90, category: 'forza',
    notes: 'Le ginocchia seguono le punte per tutta la discesa. Se rientrano, torna con i piedi più stretti.',
    gender: 'female', muscolo: 'glutei',
  },
  {
    name: 'Ponte glutei isometrico con banda',
    description: 'Ponte glutei a due gambe con la banda sopra le ginocchia. Sali in posizione alta e resta lì spingendo le ginocchia verso l\'esterno, respirando normalmente per tutto il tempo. L\'isometria a lungo insegna al gluteo a restare acceso, che è precisamente ciò che smette di fare in chi passa la giornata seduta.',
    sets: 3, reps: '30-45 sec', restSeconds: 45, category: 'funzionale',
    notes: 'Se durante la tenuta senti tirare la lombare, abbassa di due centimetri il bacino.',
    gender: 'female', muscolo: 'glutei',
  },
  {
    name: 'Estensione anca al cavo a gamba tesa',
    description: 'In piedi davanti alla cross-over con la cavigliera al cavo basso, mani ai supporti e busto leggermente inclinato avanti. Porta la gamba tesa indietro fino a fine estensione dell\'anca, fermati, torna lentamente. A ginocchio esteso il femorale partecipa di più e il movimento diventa una cerniera d\'anca a una gamba sola sotto tensione costante.',
    sets: 3, reps: '12-15 per lato', restSeconds: 60, category: 'forza',
    notes: 'La schiena non si inarca per guadagnare ampiezza: si ferma dove finisce l\'anca.',
    gender: 'female', muscolo: 'glutei',
  },
  {
    name: 'Affondo inverso con deficit su step',
    description: 'In piedi su uno step di quindici centimetri. Porta una gamba indietro nel vuoto scendendo finché il ginocchio posteriore arriva sotto il livello dello step, poi risali spingendo con il tallone anteriore. Il deficit aggiunge escursione all\'anca della gamba avanti, dove il gluteo lavora di più.',
    sets: 3, reps: '10-12 per gamba', restSeconds: 75, category: 'funzionale',
    notes: 'Guarda un punto fisso davanti a te: l\'equilibrio qui è metà dell\'esercizio.',
    gender: 'female', muscolo: 'glutei',
  },
  {
    name: 'Camminata in quadrupedia con elastico (crab walk)',
    description: 'Semi-accosciata con la banda sopra le ginocchia, busto inclinato avanti e petto alto. Cammina lateralmente con passi corti mantenendo la tensione dell\'elastico e senza far avvicinare i piedi. Il medio gluteo lavora in continuità, senza mai il riposo che le ripetizioni normali concedono fra una e l\'altra.',
    sets: 3, reps: '10 passi per lato ×2', restSeconds: 45, category: 'funzionale',
    notes: 'Il bacino resta alla stessa altezza per tutto il percorso: niente saltelli.',
    gender: 'female', muscolo: 'glutei',
  },
  {
    name: 'Abduzione seduta alla macchina con fermata',
    description: 'Alla macchina per abduttori, busto eretto e mani ai supporti. Apri le ginocchia fino a fine corsa, tieni la posizione due secondi contraendo il gluteo, poi chiudi in quattro secondi resistendo al ritorno. La fermata più la negativa lunga triplicano il tempo sotto tensione di un esercizio che quasi tutti fanno di slancio.',
    sets: 3, reps: '12-15', restSeconds: 60, category: 'forza',
    notes: 'La schiena resta appoggiata: se ti inclini indietro per aprire di più, il carico è troppo.',
    gender: 'female', muscolo: 'glutei',
  },

  // ---------- FEMORALI ----------
  {
    name: 'Leg curl sdraiato monopodalico',
    description: 'Prona alla macchina con una gamba sola sotto il cuscinetto. Chiudi fino alla massima contrazione, fermati, scendi in tre secondi. Una gamba per volta rende impossibile che la più forte copra la più debole, ed è la ragione per cui va inserito quando c\'è una storia di problemi a un ginocchio.',
    sets: 3, reps: '10-12 per lato', restSeconds: 60, category: 'forza',
    notes: 'Si comincia dal lato debole e si fa lo stesso numero anche con il forte.',
    gender: 'female', muscolo: 'femorali',
  },
  {
    name: 'Stacco rumeno monopodalico con kettlebell',
    description: 'In piedi su una gamba con la kettlebell nella mano opposta. Manda l\'anca indietro lasciando salire la gamba libera dietro fino alla linea del tronco, scendi finché senti tirare il femorale, poi risali chiudendo l\'anca. La kettlebell controlaterale crea una rotazione da contrastare: il lavoro è sul femorale e sul gluteo medio insieme.',
    sets: 3, reps: '8-10 per lato', restSeconds: 75, category: 'forza',
    notes: 'Il bacino resta quadrato: se l\'anca libera si apre verso l\'alto, hai perso il controllo.',
    gender: 'female', muscolo: 'femorali',
  },
  {
    name: 'Nordic curl con partner',
    description: 'In ginocchio con le caviglie tenute ferme da chi ti assiste, corpo in linea dalle ginocchia alla testa. Scendi in avanti il più lentamente possibile resistendo con i femorali e accompagna con le mani solo quando cedi, poi spingi per tornare su. È il lavoro eccentrico più intenso che esista sulla catena posteriore.',
    sets: 3, reps: '4-6', restSeconds: 120, category: 'forza',
    notes: 'Si comincia da tre ripetizioni. I dolori del giorno dopo, qui, sono la regola e non l\'errore.',
    gender: 'female', muscolo: 'femorali',
  },
  {
    name: 'Good morning al multipower',
    description: 'Barra guidata sui trapezi, piedi a larghezza bacino, ginocchia appena flesse. Fletti il busto in avanti dall\'anca mantenendo la schiena in linea fino a dove la mobilità dei femorali permette, poi risali spingendo il bacino avanti. La guida verticale toglie l\'equilibrio e lascia solo la cerniera dell\'anca da controllare.',
    sets: 3, reps: '10-12', restSeconds: 90, category: 'forza',
    notes: 'Carico leggero e ampiezza onesta: si scende dove la schiena resta dritta, non dove arriva la testa.',
    gender: 'female', muscolo: 'femorali',
  },
  {
    name: 'Ponte femorale con slider monopodalico',
    description: 'Supina con un tallone su uno slider e l\'altra gamba sollevata, bacino in ponte. Fai scivolare lentamente il tallone lontano distendendo la gamba senza far cadere il bacino, poi richiamalo verso il gluteo. Con una gamba sola e il bacino sospeso il femorale lavora in eccentrica sotto tutto il peso del corpo.',
    sets: 3, reps: '6-10 per lato', restSeconds: 75, category: 'funzionale',
    notes: 'Al primo cedimento del bacino la serie è finita: continuare significa allenare la lombare.',
    gender: 'female', muscolo: 'femorali',
  },
  {
    name: 'Leg curl con fitball monopodalico',
    description: 'Supina con un tallone sulla fitball e l\'altra gamba sollevata, bacino alto. Richiama la palla verso i glutei piegando il ginocchio senza abbassare il bacino, poi distendi lentamente. L\'instabilità della palla aggiunge un lavoro continuo di controllo che la macchina non chiede mai.',
    sets: 3, reps: '8-12 per lato', restSeconds: 75, category: 'funzionale',
    notes: 'Braccia larghe a terra per stabilizzare: non servono a spingere, servono a non ruotare.',
    gender: 'female', muscolo: 'femorali',
  },
  {
    name: 'Stacco a gambe tese su rialzo',
    description: 'In piedi su un rialzo di dieci centimetri con il bilanciere davanti alle cosce, ginocchia appena morbide. Scendi mandando il bacino indietro e lasciando che la barra scorra sulle gambe fino sotto il livello dei piedi, poi risali. Il rialzo concede quella parte finale di allungamento che dal pavimento è impossibile raggiungere.',
    sets: 4, reps: '8-10', restSeconds: 120, category: 'forza',
    notes: 'Si sale sul rialzo solo quando lo stacco rumeno da terra è tecnicamente pulito.',
    gender: 'female', muscolo: 'femorali',
  },
  {
    name: 'Leg curl seduta monopodalica',
    description: 'Alla leg curl seduta con una gamba sola sotto il cuscinetto e il fermo ben chiuso sulle cosce. Chiudi il ginocchio fino a fine corsa, fermati, torna in tre secondi. Da seduta l\'anca è flessa e il femorale parte già allungato: è la posizione in cui questo muscolo risponde meglio.',
    sets: 3, reps: '10-12 per lato', restSeconds: 60, category: 'forza',
    notes: 'La schiena resta appoggiata allo schienale per tutta la serie.',
    gender: 'female', muscolo: 'femorali',
  },
  {
    name: 'Iperestensione orizzontale focus femorali',
    description: 'Alla panca a novanta gradi con il cuscinetto sotto le creste iliache, punte dei piedi ruotate verso l\'esterno e ginocchia distese. Scendi flettendo dall\'anca con la schiena in linea e risali fino ad allineare tronco e gambe, mai oltre. Con le ginocchia bloccate ed estese il lavoro va sui femorali, non sugli estensori della colonna.',
    sets: 3, reps: '12-15', restSeconds: 60, category: 'funzionale',
    notes: 'Ci si ferma in linea. Andare sopra la linea non allena di più: comprime di più, e basta.',
    gender: 'female', muscolo: 'femorali',
  },
  {
    name: 'Stacco rumeno a presa larga',
    description: 'Bilanciere con presa molto larga, quasi da strappo, davanti alle cosce. Manda il bacino indietro con la schiena in linea e scendi finché senti tirare, poi risali chiudendo l\'anca. La presa larga abbassa il punto di partenza della barra e allunga la catena posteriore più della presa normale.',
    sets: 3, reps: '8-10', restSeconds: 120, category: 'forza',
    notes: 'Con la presa larga si usa meno carico. Chi tiene lo stesso peso arrotonda la schiena, sempre.',
    gender: 'female', muscolo: 'femorali',
  },
  {
    name: 'Ponte femorale con talloni su panca',
    description: 'Supina con i talloni su una panca e le gambe quasi distese, braccia a terra. Solleva il bacino spingendo con i talloni fino ad allineare tronco e cosce, chiudi un secondo e scendi senza appoggiare. A ginocchio quasi esteso l\'estensione dell\'anca la fanno i femorali: il gluteo aiuta, non comanda.',
    sets: 3, reps: '12-15', restSeconds: 60, category: 'funzionale',
    notes: 'Se compaiono crampi ai femorali, riduci l\'altezza della panca e rallenta.',
    gender: 'female', muscolo: 'femorali',
  },
  {
    name: 'Stacco rumeno con elastico',
    description: 'In piedi al centro di un elastico lungo tenuto con entrambe le mani, ginocchia morbide. Manda il bacino indietro scendendo con la schiena in linea, poi risali contro la resistenza dell\'elastico che aumenta man mano che ti raddrizzi. La resistenza crescente carica proprio la parte finale della chiusura, che è dove il gluteo entra.',
    sets: 3, reps: '15-20', restSeconds: 60, category: 'funzionale',
    notes: 'Versione da casa e da riscaldamento: insegna lo schema prima di metterci il bilanciere.',
    gender: 'female', muscolo: 'femorali',
  },
];

// ============================================================
// 3. IL CARDIO CHIAMATO CON IL SUO NOME
// ------------------------------------------------------------
// «Cardio ok, magari con tecniche LISS, HIIT e tutte le altre
// varianti che conosci.»
//
// Il cardio non è "andare sul tapis roulant". Sono metodi diversi,
// con effetti diversi, che si scelgono in base a che cosa serve:
// scaricare, costruire capacità, alzare la soglia, o spendere in
// poco tempo. Qui ognuno ha il suo nome, i suoi tempi e il perché.
// Tutti unisex: il cuore non ha sesso.
// ============================================================

export const cardioMetodi: DefaultExercise[] = [
  {
    name: 'LISS — camminata continua in Zona 2',
    description: 'Camminata continua di quaranta-sessanta minuti a un ritmo in cui riesci a parlare a frasi intere ma non canteresti: è la Zona 2, circa il sessanta-settanta per cento della frequenza massima. Bassa intensità, lunga durata, nessun debito da recuperare. È il metodo che costruisce la base aerobica e migliora il ritorno venoso senza aggiungere fatica alla seduta di pesi.',
    sets: 1, reps: '40-60 min', restSeconds: 0, category: 'cardio',
    notes: 'LISS = Low Intensity Steady State. Il test è la frase: se ansimi, hai già lasciato la Zona 2.',
    gender: 'unisex', muscolo: 'cardio',
  },
  {
    name: 'LISS — cyclette a ritmo costante',
    description: 'Trenta-quarantacinque minuti di pedalata a cadenza costante fra ottanta e novanta pedalate al minuto, resistenza bassa e respiro sempre sotto controllo. La bici toglie l\'impatto dalle articolazioni: è la scelta quando le ginocchia o le caviglie stanno già lavorando abbastanza nella seduta di forza.',
    sets: 1, reps: '30-45 min', restSeconds: 0, category: 'cardio',
    notes: 'Sella alta al punto che il ginocchio resti appena flesso a pedale basso.',
    gender: 'unisex', muscolo: 'cardio',
  },
  {
    name: 'LISS — ellittica lunga a bassa intensità',
    description: 'Trenta-cinquanta minuti all\'ellittica a resistenza bassa, usando anche le braccia in modo attivo e mantenendo il respiro regolare. Il movimento coinvolge tutto il corpo senza impatto e distribuisce il lavoro fra arti superiori e inferiori: consuma bene senza affaticare una zona sola.',
    sets: 1, reps: '30-50 min', restSeconds: 0, category: 'cardio',
    notes: 'Non appoggiarti alle maniglie fisse: se lo fai, hai tolto metà del lavoro.',
    gender: 'unisex', muscolo: 'cardio',
  },
  {
    name: 'HIIT — intervalli 30/30 alla cyclette',
    description: 'Dopo cinque minuti di riscaldamento: trenta secondi di pedalata intensa a resistenza alta, trenta secondi di pedalata lenta di recupero, per dieci-quindici ripetizioni, e cinque minuti di defaticamento. Gli intervalli brevi alzano la potenza aerobica in molto meno tempo di una seduta continua.',
    sets: 1, reps: '10-15 × (30″ / 30″)', restSeconds: 0, category: 'cardio',
    notes: 'HIIT = High Intensity Interval Training. Massimo due sedute a settimana: è una spesa vera, non un extra.',
    gender: 'unisex', muscolo: 'cardio',
  },
  {
    name: 'HIIT — Tabata 20/10',
    description: 'Otto round da venti secondi al massimo sforzo con dieci secondi di pausa, quattro minuti in tutto, su un solo esercizio ciclico: cyclette, vogatore, salti, o corsa sul posto. È il protocollo più corto che esista e anche il più duro: non ci si arriva il primo mese.',
    sets: 1, reps: '8 × (20″ / 10″)', restSeconds: 0, category: 'cardio',
    notes: 'Se all\'ottavo round vai ancora forte come al primo, non hai fatto un Tabata: hai fatto un circuito.',
    gender: 'unisex', muscolo: 'cardio',
  },
  {
    name: 'HIIT — intervalli 40/20 al vogatore',
    description: 'Quaranta secondi di voga a ritmo alto e venti di recupero remando piano, per otto-dodici round. Al vogatore la spinta parte dalle gambe e coinvolge anche il dorso: è l\'intervallo che dà la resa più alta per minuto senza impatto sulle articolazioni.',
    sets: 1, reps: '8-12 × (40″ / 20″)', restSeconds: 0, category: 'cardio',
    notes: 'La sequenza è gambe, busto, braccia in andata e l\'inverso al ritorno. Sbagliarla significa remare con la schiena.',
    gender: 'unisex', muscolo: 'cardio',
  },
  {
    name: 'SIT — sprint brevi su assault bike',
    description: 'Sei-otto ripetizioni da dieci-quindici secondi di sprint totale con due-tre minuti di recupero completo fra una e l\'altra. Il recupero è lungo apposta: qui non si cerca l\'affanno continuo, si cerca che ogni sprint sia davvero al massimo. Alza la potenza anaerobica in poche sedute.',
    sets: 1, reps: '6-8 × 10-15″', restSeconds: 150, category: 'cardio',
    notes: 'SIT = Sprint Interval Training. Riservato a chi ha già una base: non è un metodo da primo mese.',
    gender: 'unisex', muscolo: 'cardio',
  },
  {
    name: 'MICT — corsa continua a intensità moderata',
    description: 'Venti-quaranta minuti di corsa continua al settanta-ottanta per cento della frequenza massima, ritmo costante e respiro impegnato ma regolare. È il metodo classico della resistenza: costa più del LISS in termini di recupero, ma alza la soglia più in fretta.',
    sets: 1, reps: '20-40 min', restSeconds: 0, category: 'cardio',
    notes: 'MICT = Moderate Intensity Continuous Training. Non nello stesso giorno di una seduta pesante di gambe.',
    gender: 'unisex', muscolo: 'cardio',
  },
  {
    name: 'Fartlek — gioco di velocità',
    description: 'Corsa continua in cui si alternano liberamente tratti veloci e tratti lenti senza cronometro, decidendo sul momento in base al percorso: si accelera fino a quell\'albero, si rallenta fino al semaforo. Allena la capacità di cambiare ritmo, che è quello che serve nella vita e in quasi tutti gli sport.',
    sets: 1, reps: '20-30 min', restSeconds: 0, category: 'cardio',
    notes: 'Fartlek, in svedese, vuol dire proprio "gioco di velocità". È l\'unico metodo cardio senza regole rigide.',
    gender: 'unisex', muscolo: 'cardio',
  },
  {
    name: 'EMOM cardio da 10 minuti',
    description: 'Ogni minuto, allo scoccare del minuto, si esegue un numero fisso di ripetizioni di un esercizio ciclico (per esempio quindici swing o dodici calorie al vogatore); il tempo che avanza è il riposo. Chi va più veloce riposa di più: il metodo si autoregola sul livello di chi lo fa.',
    sets: 1, reps: '10 round da 1 min', restSeconds: 0, category: 'cardio',
    notes: 'EMOM = Every Minute On the Minute. Se il lavoro occupa più di quaranta secondi, il numero di ripetizioni è troppo alto.',
    gender: 'unisex', muscolo: 'cardio',
  },
  {
    name: 'Circuito metabolico a stazioni',
    description: 'Quattro-sei esercizi a corpo libero o con carichi leggeri eseguiti uno dopo l\'altro per quaranta secondi ciascuno con venti di transito, per tre-quattro giri. Alternando parte alta e parte bassa il cuore resta alto mentre i muscoli si danno il cambio: si allena la capacità di lavoro senza esaurire un distretto solo.',
    sets: 3, reps: '4-6 stazioni × 40″', restSeconds: 120, category: 'cardio',
    notes: 'La tecnica cala per prima quando arriva la fatica: al primo movimento sporco si toglie carico, non si stringe i denti.',
    gender: 'unisex', muscolo: 'cardio',
  },
  {
    name: 'Cardio piramidale 1-2-3-2-1',
    description: 'Intervalli di intensità alta di durata crescente e poi decrescente — un minuto, due, tre, due, uno — con un recupero pari alla metà della frazione appena fatta. La piramide fa incontrare il lavoro breve e intenso con quello lungo nella stessa seduta, ed è il modo più semplice per non annoiarsi in venti minuti.',
    sets: 1, reps: '1-2-3-2-1 min', restSeconds: 60, category: 'cardio',
    notes: 'L\'intensità resta la stessa in tutte le frazioni: è la durata a cambiare, non il ritmo.',
    gender: 'unisex', muscolo: 'cardio',
  },
];

// ============================================================
// 4. I PROTOCOLLI DI DECONGESTIONE
// ------------------------------------------------------------
// Non sono esercizi: sono sequenze che si prendono intere e si
// mettono in coda alla seduta, o al mattino, o nei giorni di
// scarico. Il principio è uno solo: il sangue e la linfa dalle
// gambe risalgono grazie alla pompa muscolare, alla gravità e al
// diaframma. Questi protocolli usano tutte e tre.
//
// Perimetro, scritto in ogni scheda: è educazione al movimento,
// non è un atto terapeutico.
// ============================================================

export const protocolliDecongestione: DefaultExercise[] = [
  {
    name: 'Protocollo pompa podalica',
    description: 'Seduti o sdraiati con le gambe distese: trenta flessioni ed estensioni lente della caviglia per lato, poi venti circonduzioni per senso, poi trenta contrazioni brevi del polpaccio spingendo la punta come su un pedale. La contrazione ritmica del polpaccio spinge il sangue venoso verso l\'alto: è la ragione per cui il polpaccio viene chiamato il secondo cuore.',
    sets: 2, reps: '≈4 min', restSeconds: 30, category: 'posturale',
    notes: `Da fare anche in ufficio, a fine giornata, senza cambiarsi. ${PERIMETRO}`,
    gender: 'unisex', muscolo: 'decongestione',
  },
  {
    name: 'Protocollo gambe al muro con respiro lento',
    description: 'Sdraiati supini con i glutei vicino al muro e le gambe appoggiate verticali, ginocchia morbide e braccia lungo i fianchi. Restare cinque-otto minuti respirando lentamente dal naso, con l\'espirazione più lunga dell\'inspirazione. La gravità favorisce il ritorno dai piedi e il respiro lento accompagna il passaggio a uno stato di recupero.',
    sets: 1, reps: '5-8 min', restSeconds: 0, category: 'posturale',
    notes: `${AVVISO_RESPIRO} ${PERIMETRO}`,
    gender: 'unisex', muscolo: 'decongestione',
  },
  {
    name: 'Protocollo di fine seduta — scarico degli arti inferiori',
    description: 'In sequenza, senza pausa fra i passaggi: due minuti di camminata lenta, trenta calf raise leggeri, un minuto di gambe al muro, trenta secondi di allungamento dei femorali per lato, un minuto di respiro lento a terra con le ginocchia flesse. Chiude la seduta di gambe riportando il sistema dallo sforzo al recupero invece di lasciarlo a metà.',
    sets: 1, reps: '≈8 min', restSeconds: 0, category: 'posturale',
    notes: `Si fa subito dopo l\'ultima serie, non dopo la doccia. ${AVVISO_RESPIRO}`,
    gender: 'unisex', muscolo: 'decongestione',
  },
  {
    name: 'Protocollo antigravitario del mattino',
    description: 'Appena svegli, ancora a letto: venti pompe di caviglia per piede, dieci ginocchia al petto alternate, due minuti di gambe appoggiate alla parete o alla testiera, e infine dieci respiri lenti prima di alzarsi. Riattiva la circolazione periferica prima che il peso della giornata si scarichi sulle gambe.',
    sets: 1, reps: '≈5 min', restSeconds: 0, category: 'posturale',
    notes: `Ci si alza in due tempi: prima seduti, poi in piedi. ${AVVISO_RESPIRO}`,
    gender: 'unisex', muscolo: 'decongestione',
  },
  {
    name: 'Protocollo mobilità della caviglia per il ritorno venoso',
    description: 'In ginocchio davanti a un muro con un piede avanti: spingi il ginocchio oltre la punta senza staccare il tallone, dieci volte per lato; poi dieci scivolamenti del tallone su e giù su uno step; infine venti secondi di allungamento del polpaccio a ginocchio teso e venti a ginocchio flesso. Una caviglia che si muove poco è una pompa che lavora poco.',
    sets: 2, reps: '≈5 min', restSeconds: 30, category: 'mobilita',
    notes: `Se il tallone si stacca dal pavimento, l\'esercizio non conta: avvicina il piede al muro. ${PERIMETRO}`,
    gender: 'unisex', muscolo: 'decongestione',
  },
  {
    name: 'Protocollo respiro e scarico addominale',
    description: 'Supini con le ginocchia flesse e i piedi a terra, una mano sul petto e una sull\'addome. Dieci respiri in cui si gonfia solo la mano sull\'addome, poi dieci respiri con espirazione doppia rispetto all\'inspirazione, poi dieci respiri con una breve pausa a polmoni vuoti. Il diaframma che scende crea la differenza di pressione che richiama il sangue dal basso verso il torace.',
    sets: 1, reps: '≈6 min', restSeconds: 0, category: 'posturale',
    notes: `${AVVISO_RESPIRO} ${PERIMETRO}`,
    gender: 'unisex', muscolo: 'decongestione',
  },
  {
    name: 'Protocollo automassaggio ascendente delle gambe',
    description: 'Seduti con una gamba distesa: con le mani a coppa si risale con pressioni lente e leggere dalla caviglia al ginocchio, dieci passaggi, e poi dal ginocchio all\'inguine, dieci passaggi. Sempre dal basso verso l\'alto, mai al contrario, e sempre con pressione leggera. Poi si cambia gamba.',
    sets: 1, reps: '10 passaggi × 2 tratti per gamba', restSeconds: 0, category: 'posturale',
    notes: `Solo pressione leggera e sempre verso il cuore. Si sospende in caso di dolore, gonfiore improvviso, arrossamento o calore locale. ${PERIMETRO}`,
    gender: 'unisex', muscolo: 'decongestione',
  },
];

// ============================================================
// 5. I PROTOCOLLI SPECIALI PER LA DONNA
// ------------------------------------------------------------
// «E poi l'inserimento dei protocolli di decongestione e dei
// protocolli speciali per le donne che conosci. Poi andremo ad
// approfondire anche questo campo.»
//
// Questo è l'inizio dell'archivio, non la sua fine. Sette
// protocolli: due sul pavimento pelvico, uno per il ritorno al
// movimento dopo la gravidanza, tre sulle fasi del ciclo, uno
// sulla menopausa.
//
// Il perimetro qui va tenuto stretto e scritto: allenare non è
// curare. Dove serve un nulla osta medico, la scheda lo dice.
// ============================================================

export const protocolliDonna: DefaultExercise[] = [
  {
    name: 'Protocollo pavimento pelvico — attivazione',
    description: 'Sdraiate con le ginocchia flesse: dieci contrazioni brevi del pavimento pelvico da un secondo con tre di rilascio, poi cinque tenute da cinque secondi, poi cinque contrazioni coordinate con l\'espirazione. Si contrae come per trattenere l\'aria, senza stringere glutei, addome o cosce e senza trattenere il respiro.',
    sets: 2, reps: '≈5 min', restSeconds: 60, category: 'posturale',
    notes: `Se non riesci a isolare la contrazione, il lavoro è ancora sul respiro: torna lì. ${AVVISO_RESPIRO} ${PERIMETRO}`,
    gender: 'female', muscolo: 'protocolliDonna',
  },
  {
    name: 'Protocollo pavimento pelvico — rilascio',
    description: 'In posizione del bambino o supine con i piedi uniti e le ginocchia aperte: dieci respiri lenti in cui a ogni inspirazione si lascia scendere e allargare il perineo, senza contrarlo. Un pavimento pelvico che non si rilassa mai non è forte: è rigido, e la rigidità dà gli stessi sintomi della debolezza.',
    sets: 1, reps: '≈6 min', restSeconds: 0, category: 'posturale',
    notes: `Metà del lavoro sul pavimento pelvico è imparare a lasciarlo andare. ${AVVISO_RESPIRO} ${PERIMETRO}`,
    gender: 'female', muscolo: 'protocolliDonna',
  },
  {
    name: 'Protocollo ritorno al movimento dopo la gravidanza',
    description: 'Sequenza di riavvicinamento: cinque minuti di respiro diaframmatico supino, dieci attivazioni del pavimento pelvico coordinate con l\'espirazione, dieci dead bug a raggio corto, dieci ponti glutei lenti, due minuti di camminata. Nessun crunch, nessun plank, nessun salto: si ricostruisce la pressione interna prima di chiedere forza.',
    sets: 1, reps: '≈15 min', restSeconds: 0, category: 'posturale',
    notes: `Si comincia solo dopo la visita di controllo e con il nulla osta scritto del medico o dell\'ostetrica. Se durante un esercizio l\'addome forma una cresta al centro, si scende di livello. ${AVVISO_RESPIRO} ${PERIMETRO}`,
    gender: 'female', muscolo: 'protocolliDonna',
  },
  {
    name: 'Protocollo fase follicolare — finestra di carico',
    description: 'Nei giorni che seguono le mestruazioni e precedono l\'ovulazione molte donne riferiscono più energia e migliore recupero. È la finestra in cui si collocano le sedute più impegnative: carichi alti a ripetizioni basse sui fondamentali, progressioni nuove, test di forza. Due-tre sedute pesanti nella settimana, cardio breve e intenso.',
    sets: 1, reps: '2-3 sedute pesanti', restSeconds: 0, category: 'forza',
    notes: `È una traccia di programmazione, non una regola biologica valida per tutte: si adatta a quello che il diario di allenamento dice davvero. ${PERIMETRO}`,
    gender: 'female', muscolo: 'protocolliDonna',
  },
  {
    name: 'Protocollo fase luteale — mantenimento e scarico',
    description: 'Nella seconda metà del ciclo si mantiene il carico invece di aumentarlo: stessi esercizi con qualche ripetizione in meno e una serie in meno, cardio spostato verso il LISS, e un protocollo di decongestione in chiusura di ogni seduta per la sensazione di pesantezza alle gambe. Si programma per arrivare interi, non per fare record.',
    sets: 1, reps: '2-3 sedute di mantenimento', restSeconds: 0, category: 'forza',
    notes: `Togliere una serie in questa settimana non è un passo indietro: è la ragione per cui la settimana dopo si va più forte. ${PERIMETRO}`,
    gender: 'female', muscolo: 'protocolliDonna',
  },
  {
    name: 'Protocollo giorni mestruali — movimento che alleggerisce',
    description: 'Sequenza breve e a bassa intensità: cinque minuti di camminata, gatto-cammello lento, apertura delle anche in posizione del bambino, dieci ponti glutei senza carico, cinque minuti di gambe al muro con respiro lento. Muoversi in questi giorni è quasi sempre meglio che fermarsi, ma il criterio è come ci si sente, non il calendario.',
    sets: 1, reps: '≈15 min', restSeconds: 0, category: 'mobilita',
    notes: `Se il dolore è forte o invalidante non è materia di allenamento: è materia di medico curante. ${AVVISO_RESPIRO}`,
    gender: 'female', muscolo: 'protocolliDonna',
  },
  {
    name: 'Protocollo menopausa — forza, impatto e osso',
    description: 'Due-tre sedute di forza a settimana sui fondamentali con carichi progressivi e ripetizioni fra sei e dieci, più un lavoro di impatto controllato — salti bassi, salite su gradino, camminata veloce in salita — e un lavoro di equilibrio monopodalico. Il tessuto osseo risponde al carico e all\'impatto: sono lo stimolo, non un rischio da evitare a priori.',
    sets: 1, reps: '2-3 sedute a settimana', restSeconds: 0, category: 'forza',
    notes: `L\'impatto si introduce per gradi e si concorda con il medico curante in presenza di fragilità ossea accertata. ${PERIMETRO}`,
    gender: 'female', muscolo: 'protocolliDonna',
  },
];

/** Tutto ciò che è stato aggiunto nella v3, in un elenco solo. */
export const esercizi2026: DefaultExercise[] = [
  ...uomoV3,
  ...donnaV3,
  ...cardioMetodi,
  ...protocolliDecongestione,
  ...protocolliDonna,
];
