# ESSĒRE OS — 04 · UX & Design System

> Parte del pacchetto: 00-strategia · 01-architettura · 02-dati-digital-twin · 03-ai-engine · **04-ux-design** · 05-api-sdk-integrazioni · 06-sicurezza-compliance · 07-roadmap-milestones.
> Questo documento definisce COME l'utente vede e tocca il twin descritto in 02 e l'intelligenza descritta in 03. Non ridisegna il prodotto da zero: rifonda navigazione e linguaggio visivo sopra le funzionalità già in produzione.

## 0. Principi UX (validi su tutti gli orizzonti)

1. **Una cosa per schermata.** Ogni schermata ha UN obiettivo e UNA sola CTA primaria (colore accent). Se ne servono due, sono due schermate o una bottom sheet.
2. **Il valore prima dell'interfaccia.** L'app apre già sulla risposta ("come sto oggi, cosa faccio oggi"), non su un menu. Tap-to-value misurato, non dichiarato (§8).
3. **Dark-first, semantica sempre.** Il tema attuale è dark e resta il default. Ma ogni colore passa da token semantici, così il light theme white-label (H1) è un file, non un refactor.
4. **Il coach è un utente, non un admin.** La vista coach è una dashboard operativa ("chi devo attenzionare oggi"), non un pannello CRUD.
5. **Semplicità Apple = sottrazione con criterio.** Non "meno feature", ma gerarchia: 5 tab, tutto il resto raggiungibile in ≤2 tap dal posto giusto.

## 1. Diagnosi brutale dell'attuale (H0 — da sanare subito)

| # | Problema reale | Perché è grave | Gravità |
|---|---|---|---|
| 1 | **~20 tab scorrevoli** nella tab bar | Apple HIG: 3–5 tab. Una tab bar che scorre è un menu travestito: l'utente non costruisce un modello mentale, e in review App Store (piano store, doc 01 §5) è un rigetto probabile | CRITICA |
| 2 | Nessuna gerarchia: tutto è "pari livello" | Il check-in Stato ESSĒRE (uso quotidiano) ha la stessa dignità del Listino (uso raro). Le cose frequenti vanno in superficie, le rare in profondità | ALTA |
| 3 | Colori fuori palette in alcune schermate | Il white-label vive di `brand.ts`: ogni hex hardcoded è una schermata che NON si ri-brandizza. Debito che costa a ogni cliente venduto | ALTA |
| 4 | Scala spaziatura attuale fuori griglia (`xs:3, sm:6` in `theme.ts`) | 3 e 6 non stanno su una griglia 4pt: gli allineamenti "quasi giusti" sono il motivo per cui l'app sembra artigianale anche quando funziona | MEDIA |
| 5 | `fontSize.xs: 10` e `sm: 11` | Sotto i 12pt su mobile è illeggibile per una fetta reale dei ~30 allievi (età media palestra, non età media di chi sviluppa) | MEDIA |
| 6 | Accent `#D40000` usato anche come colore testo | Contrasto ~3.6:1 su `#0A0A0A`: fallisce WCAG AA per testo normale (serve 4.5:1). Passa solo per testo grande e componenti UI | MEDIA |
| 7 | Ombre (`shadows`) su tema dark | Ombre nere su sfondo nero = invisibili. L'elevazione su dark si fa con superfici più chiare + bordo, non con `shadowRadius` | MEDIA |
| 8 | Bundle unico ~4MB offuscato | Su Android di fascia media in 4G il time-to-interactive supera i 5s: la migliore UX del mondo non salva un'app che non parte. (Fix: code-splitting, doc 01 §7) | ALTA |
| 9 | Stati vuoto/caricamento/errore incoerenti o assenti | Spinner generici e schermate bianche: l'utente non sa mai se sta aspettando o se è rotto | MEDIA |
| 10 | Nessuna misura di usabilità | Zero eventi analytics sui flussi: le decisioni UX si fanno "a sensazione". Con 30 allievi veri è uno spreco: sono un laboratorio gratuito | MEDIA |

**La sintesi:** il prodotto ha più valore di quanto l'interfaccia lasci vedere. Non serve un redesign estetico: serve rifondare la **navigazione** (§2–3), standardizzare i **token** (§4) e misurare (§8).

## 2. Rifondazione navigazione allievo — MAX 5 tab (H0)

### 2.1 Le 5 tab

| Tab | Contenuto | Perché è una tab |
|---|---|---|
| **Oggi** | Home intelligente: anello Stato ESSĒRE + check-in, seduta del giorno, prossimo appuntamento, avvisi (rata in scadenza, badge sbloccato), quick action QR palestra | È la risposta alla domanda quotidiana "cosa faccio oggi". Uso: ogni giorno |
| **Allenati** | Programma corrente, avvio seduta live, storico allenamenti | Il core dell'app palestra. Uso: 2–5×/settimana |
| **Progressi** | Il twin visualizzato: posturale (timeline foto), composizione corporea, forza/PR, trend Stato ESSĒRE 7/30gg, badge/XP/livelli | La ricompensa: "sto migliorando". Uso: settimanale |
| **Chat** | Coach 1:1, team, Assistente ESSĒRE (supporto) | Il coach umano nel loop è il cuneo (doc 00 §3): merita superficie massima |
| **Profilo** | Dati personali, pagamenti/rate/ricevute, acquisti da listino, Academy, notifiche, impostazioni | Tutto ciò che è importante ma non quotidiano |

### 2.2 Dove finisce tutto il resto (gerarchia, non tab)

| Funzione (oggi tab) | Nuova posizione | Tap dall'apertura |
|---|---|---|
| Stato ESSĒRE check-in | Oggi → card in testa | 1 |
| Respirazione guidata | Oggi → dal risultato check-in, e Progressi → trend | 2 |
| Check-in palestra QR | Oggi → icona QR in header (persistente) | 1 |
| Live workout | Allenati → "Inizia seduta" (e scorciatoia in Oggi se seduta programmata) | 1–2 |
| Storico allenamenti | Allenati → segmented "Storico" | 2 |
| Valutazione posturale | Progressi → sezione Postura | 2 |
| Composizione corporea | Progressi → sezione Corpo | 2 |
| Gamification (badge, premi) | Progressi → sezione Traguardi | 2 |
| Pagamenti, rate, ricevute | Profilo → Pagamenti (+ avviso proattivo in Oggi se rata in scadenza) | 2 |
| Listino / acquisto | Profilo → Listino (+ deep link dall'Assistente) | 2 |
| Academy (corsi, quiz) | Profilo → Academy (per `academy_student` diventa la tab Allenati) | 2 |
| Assistente ESSĒRE | Chat → conversazione fissata in alto | 2 |
| Calendario appuntamenti | Oggi → card prossimo appuntamento → agenda personale | 2 |
| Notifiche | Campanella in header di Oggi | 1 |

**Regola vincolante:** niente rientra in tab bar senza che un'altra tab esca. La tab bar è un budget, non un elenco.
**Alternativa scartata:** tab "Altro/More" con dentro 15 voci (pattern MyFitnessPal). È dove le feature vanno a morire: sposta il problema, non lo risolve. Meglio 5 tab con gerarchia interna chiara.

## 3. Rifondazione navigazione coach/owner (H0)

Stesse 5 posizioni, contenuti per ruolo (il componente TabBar è unico, le voci arrivano da una mappa ruolo→tab):

| Tab | Coach (collaborator) | Owner/Manager (in più) |
|---|---|---|
| **Oggi** | Dashboard operativa (sotto) | + accessi in tempo reale, incassi del giorno |
| **Allievi** | Lista con filtri stato; scheda allievo = hub (programma, posturale, corpo, Stato ESSĒRE, chat, note) | + pagamenti e piano rate nella scheda |
| **Agenda** | Calendario multi-staff, ricerca per allievo | uguale |
| **Chat** | 1:1 e team | + broadcast |
| **Studio** | Libreria template e programmi | + finanza/KPI, listino, staff, riepilogo AI settimanale, Academy admin, storage, brand/impostazioni |

### 3.1 "Oggi" del coach: la dashboard operativa

Il centro non è un grafico: è la lista **"Da attenzionare oggi"**, ordinata per urgenza, calcolata dagli stati derivati del twin (doc 02 §4):

1. Readiness rossa oggi o in calo 3+ giorni (Stato ESSĒRE)
2. Dolori segnalati nel check-in
3. Assente da 7+ giorni (nessun accesso QR né seduta)
4. Rata scaduta / in scadenza ≤3gg
5. Messaggio non letto da >24h

Ogni riga ha il **perché** ("readiness 34, dolore spalla") e **un'azione a 1 tap** (apri chat, apri scheda, segna gestito). Segna-gestito scrive un evento `coach.attention_handled` (tassonomia doc 02 §3.3): così misuriamo il tempo di reazione del coach, che in H1 diventa un KPI venduto alla palestra white-label ("nessun allievo ignorato").

**Perché così:** il coach ha 10 minuti tra una sessione e l'altra. Deve uscire dalla dashboard sapendo chi chiamare, non avendo ammirato dei grafici. **Alternativa scartata:** dashboard analitica stile BI (grafici, funnel) come prima schermata — è la vista owner mensile, non la vista coach quotidiana; vive in Studio → KPI.

## 4. Design System "ESSĒRE UI" (H0 token e componenti · H1 theming white-label · H2 pacchetto SDK, doc 05)

Il design system è un pacchetto `src/ui/` di componenti + token. Le schermate migrano una alla volta (strangler, come per i dati in doc 02 §3.4): niente redesign big-bang.

### 4.1 Colore — token semantici sopra `brand.ts`

I 5 colori brand restano in `src/config/brand.ts` (unico file white-label). Il tema li mappa su token **semantici**: i componenti non vedono mai un hex.

| Token | Valore dark (default) | Uso | Nota |
|---|---|---|---|
| `bg` | `#0A0A0A` | sfondo app | = `brand.primary` |
| `surface1/2/3` | `#161616` / `#1F1F1F` / `#2A2A2C` | card, sheet, modali | elevazione = superficie più chiara + bordo, NON ombra |
| `border` | `#2C2C2E` | bordi 1px | |
| `textPrimary` | `#F2F2F7` | testo principale | contrasto ~17:1 ✅ |
| `textSecondary` | `#8E8E93` | testo secondario | ~6:1 ✅ AA |
| `textDisabled` | `#636366` | SOLO disabled/placeholder | ~3.3:1 — vietato per contenuto |
| `accent` | `#D40000` | riempimenti, bottoni, anelli | ~3.6:1: OK componenti (≥3:1), **vietato come colore testo normale** |
| `accentText` | `#E63333` | testo/link accent su dark | ~4.6:1 ✅ AA |
| `success/warning/danger/info` | `#34C759 / #FF9F0A / #FF453A / #64D2FF` | stati e readiness | mai da soli: sempre con etichetta o numero (§7) |
| `readiness.low/mid/high` | danger / warning / success | anello Stato ESSĒRE | soglie 0–49 / 50–74 / 75–100 |

**Regola white-label (H1):** dai 5 hex del cliente si derivano automaticamente `accentText` (schiarito fino a ≥4.5:1) e le superfici; uno script di build valida i contrasti e blocca il deploy se falliscono. Meglio 10x rispetto al settore: nessun "controllo a occhio" per ogni cliente, il contrasto è un test, non una speranza.

### 4.2 Tipografia

**Font di sistema** (SF Pro su iOS, Roboto su Android, system-ui su web). Perché: 0 KB sul bundle già obeso, resa nativa, dynamic type gratis. **Alternativa scartata:** font custom di brand — costa ~100–300KB e licenze; se un cliente white-label lo esige, in H1 un solo variable font, 2 pesi max.

Scala (sostituisce `fontSize` attuale; minimo 12):

| Token | pt | line-height | Uso |
|---|---|---|---|
| `display` | 34 | 40 | numero readiness, timer live |
| `title1` | 28 | 34 | titolo schermata |
| `title2` | 22 | 28 | titolo sezione/card |
| `headline` | 17 semibold | 22 | riga primaria liste, bottoni |
| `body` | 17 | 22 | testo corrente, chat |
| `subhead` | 15 | 20 | testo secondario |
| `caption` | 12 | 16 | metadati, timestamp — **niente sotto 12** |

### 4.3 Spaziatura, raggi, elevazione

- **Griglia 4pt rigorosa:** `space-1..10` = 4, 8, 12, 16, 24, 32, 40. Sostituisce `xs:3, sm:6`. Migrazione: alias deprecati (`xs→4, sm→8`) + lint che vieta numeri magici negli stili.
- **Raggi:** 4 (chip), 8 (bottoni, input), 12 (card), 16 (sheet), 999 (pill/avatar). La scala attuale va già bene: si conserva.
- **Elevazione dark:** livello 0 = `bg`; 1 = `surface1`; 2 = `surface2` + border; 3 (sheet/modal) = `surface3` + border + scrim 60%. Le `shadows` di `theme.ts` restano solo per il futuro light theme.

### 4.4 Componenti core (18) — con stati

Stati standard per TUTTI i componenti interattivi: `default · pressed (scale 0.97 + opacity) · disabled (textDisabled) · loading (spinner inline, larghezza bloccata) · error (border danger + messaggio)`. In tabella solo le note specifiche.

| # | Componente | Note specifiche |
|---|---|---|
| 1 | `Button` (primary/secondary/ghost/destructive) | 1 solo primary per schermata; altezza 48pt |
| 2 | `IconButton` | hit area min 44×44 anche se l'icona è 24 |
| 3 | `Card` | surface1, radius 12, padding space-4 |
| 4 | `MetricTile` | numero + etichetta + delta (▲▼ con colore E testo) |
| 5 | `ReadinessRing` | anello 0–100, colore da soglie, numero al centro in `display` |
| 6 | `ListRow` | leading icon/avatar, titolo, sottotitolo, trailing chevron/valore; min 56pt |
| 7 | `TextField` | label sempre visibile (no placeholder-as-label), errore sotto il campo |
| 8 | `SegmentedControl` | max 3 segmenti, altrimenti diventa filtro in sheet |
| 9 | `Chip` | filtri e tag; selected = accent riempito |
| 10 | `BadgeMedal` | gamification: locked (grayscale) / unlocked / appena-sbloccata (animazione §4.5) |
| 11 | `Avatar` | iniziali se manca foto; anello colore ruolo (`ownerBadge` ecc.) |
| 12 | `ProgressBar` | XP, quota rate pagate, upload |
| 13 | `TimerDisplay` | live workout: `display` monospaced-digits per non ballare |
| 14 | `BottomSheet` | ogni flusso secondario vive qui, non in nuove schermate |
| 15 | `Toast` | conferme non bloccanti, 3s, mai per errori che richiedono azione |
| 16 | `EmptyState` | icona + 1 frase + 1 CTA. Obbligatorio: nessuna lista può renderizzare "il nulla" |
| 17 | `Skeleton` | caricamento: forma del contenuto, mai spinner a pagina intera |
| 18 | `ErrorState` | messaggio umano + "Riprova"; offline detection inclusa (doc 01 §6) |

`EmptyState`/`Skeleton`/`ErrorState` sono la risposta 10x al problema #9: gli stati non si ridisegnano per ogni schermata, si compongono. Una schermata nuova che non li usa non passa la review.

### 4.5 Motion

| Token | Durata | Easing | Uso |
|---|---|---|---|
| `instant` | 100ms | linear | cambi stato (pressed, toggle) |
| `fast` | 200ms | ease-out `(0.2, 0, 0, 1)` | enter/exit componenti, toast |
| `base` | 300ms | ease-out | transizioni schermata, sheet |
| `celebrate` | 600ms | spring (damping 12) | SOLO badge sbloccato, PR, fine seduta |

Regole: mai animare layout durante scroll; rispettare `prefers-reduced-motion` / `AccessibilityInfo.isReduceMotionEnabled` (riduce tutto a `instant`); implementazione `react-native-reanimated` (già in Expo SDK 52).

### 4.6 Haptics — onestà sulla PWA

Su PWA gli haptics sono ~inesistenti (iOS Safari: no; Android Chrome: solo `navigator.vibrate`). Quindi: **H0** feedback visivo/sonoro come canale primario; **H1** (app native negli store, doc 01 §5) `expo-haptics`: `selection` su picker, `impactLight` su conferme, `notificationSuccess` su set completato/badge/check-in riuscito, `notificationWarning` su errori. Mai haptic su eventi passivi.

## 5. I 12 flussi utente chiave (formato: schermata → azione → risultato)

**F1 · Onboarding allievo con posturale "wow"** — *H0, esiste: si accorcia*
1. Link invito dal coach → apre su schermata benvenuto brandizzata → 1 tap "Inizia".
2. Credenziali (create dal coach, vedi debito `managedPassword` doc 06) → primo accesso → cambio password obbligatorio.
3. 3 schermate di setup (obiettivo, infortuni, giorni/settimana) → swipe → profilo minimo pronto.
4. "Scopriamo la tua postura" → 4 foto guidate con sagoma overlay → upload.
5. Attesa analisi AI (~20s) → Skeleton con micro-copy educativo, non spinner muto → report posturale con annotazioni visive.
6. Report → 1 tap "Inizia il percorso" → atterra su Oggi con primo check-in Stato ESSĒRE proposto.
**Target: dal link al "wow" < 5 minuti.** Il wow al minuto 4, non alla settimana 2: è il momento in cui l'allievo capisce che questa app lo *vede*.

**F2 · Check-in Stato ESSĒRE < 30s** — *H0, esiste: si stringe a 3 interazioni*
1. Oggi → card "Come stai?" (o push 7:30) → tap.
2. Una schermata, 4 slider grossi (sonno, energia, umore, dolori) → dolori>soglia apre picker zona corpo.
3. Tap "Fatto" → anello readiness si anima 0→N + consiglio del giorno → se readiness bassa, CTA respirazione 4-7-8.
**Misura: p50 < 30s, ≥60% allievi attivi/giorno.** Ogni campo aggiunto al check-in va giustificato contro questo numero.

**F3 · Seduta guidata live** — *H0*
1. Oggi/Allenati → "Inizia seduta" → schermata live (una alla volta: esercizio corrente).
2. Serie fatta → tap sul numero → carico/reps precompilati dall'ultima volta → conferma → timer recupero parte da solo, grande, con haptic/suono a fine recupero.
3. Ultimo esercizio → riepilogo (volume, PR evidenziati, XP) → animazione `celebrate` se PR → scrittura evento `workout.completed` (doc 02).

**F4 · Check-in palestra QR** — *H0*
1. Oggi → icona QR in header → schermata con QR personale + codice manuale (`MMLAB`) come fallback.
2. Scan al totem → conferma verde full-screen 1.5s con nome (leggibile dal coach a distanza) → +XP streak.
3. Errore rete → il check-in si accoda offline e sincronizza (doc 01 §6): l'allievo non resta mai bloccato in ingresso.

**F5 · Pagamento rata** — *H0*
1. Push/avviso in Oggi "Rata in scadenza 15/07" → tap → Profilo → Pagamenti.
2. Schermata rata: importo, scadenza, storico → oggi il pagamento avviene in palestra → tap "Ho pagato" notifica l'owner che conferma → ricevuta in app.
3. H1: pagamento in-app (Stripe, doc 05) → 2 tap → ricevuta automatica. Il flusso UX è già pronto per lo swap.

**F6 · Chat coach** — *H0*
1. Chat → lista conversazioni (coach fissato in alto, poi Assistente, poi team).
2. Conversazione → composer con allegati (foto esercizio, video) → invio → stato consegnato/letto.
3. Dal messaggio del coach, deep link a entità: "guarda il programma" apre la scheda giusta, non una descrizione a parole.

**F7 · Onboarding palestra white-label** — *H1 (venduto da H0 col playbook manuale WHITE-LABEL.md)*
1. Fornitore: nuovo progetto Firebase + `brand.ts` cliente + deploy (H1: script `create-instance`, doc 01 §4).
2. Owner cliente: primo accesso → wizard 5 passi: logo/colori (validati §4.1) → listino → staff → codice QR palestra → import allievi CSV.
3. Fine wizard → dashboard Oggi già viva con i primi allievi invitabili via link. **Target H1: palestra operativa < 1 giorno, < 2h di lavoro fornitore.**

**F8 · Creazione programma (coach)** — *H0*
1. Studio → Template → "Nuovo" o duplica esistente.
2. Editor: settimane → giorni → esercizi (ricerca libreria, superset drag) → parametri serie/reps/recupero.
3. "Usa per allievo" → scelta allievo → adattamenti suggeriti dall'AI in base a infortuni/livello del twin (doc 03) → il coach conferma o modifica → pubblica → notifica all'allievo.
Il coach resta l'autore; l'AI propone, non impone (principio del coach nel loop, doc 00 §3).

**F9 · Review settimanale coach** — *H0 per owner (esiste il riepilogo AI), H1 per coach per-allievo*
1. Lunedì 8:00: push "Riepilogo settimana pronto" → Oggi → card riepilogo.
2. Schermata: 3 highlight generati dall'AI (chi migliora, chi scivola, chi ignorato) con evidenze dal twin → per ogni voce 1 azione a 1 tap (chat precompilata, nota, appuntamento).
3. Fine review → evento `coach.weekly_review_done` → il tempo di review è un KPI (target < 15 min per 30 allievi).

**F10 · Acquisto da listino** — *H0*
1. Profilo → Listino (o deep link dall'Assistente che risponde sui prezzi).
2. Tariffa → dettaglio (cosa include, durata, rate possibili) → "Richiedi" → l'owner riceve la richiesta e crea il piano di pagamento dalla tariffa (flusso già esistente).
3. Allievo riceve piano rate da confermare → F5.

**F11 · Recupero/riposo consigliato** — *H0 regole, H1 AI Recovery (doc 03)*
1. Check-in F2 con readiness < 50 → il consiglio del giorno diventa prescrittivo: "Oggi scarico: ecco la versione ridotta della seduta".
2. Tap → seduta alternativa (volume −40%, generata da regole H0, dal Recovery agent H1) → l'allievo sceglie: ridotta / originale / riposo.
3. La scelta scrive un evento → il coach la vede in "Da attenzionare" solo se readiness rossa 3+ giorni (niente rumore per un giorno storto).
**Perché:** Whoop ti dice "sei scarico" e ti abbandona; ESSĒRE ti dice *cosa fare invece*, e il coach lo vede. Questo è il cuneo reso interfaccia.

**F12 · Richiesta aiuto Assistente** — *H0*
1. Chat → Assistente ESSĒRE → domanda libera ("quanto costa il trimestrale?", "a che ora apre sabato?").
2. Risposta ancorata a listino + info palestra (editabili dall'owner) → con azioni: deep link a Listino, prenota appuntamento, "passa al coach umano".
3. Se l'Assistente non sa → handoff esplicito alla chat del coach con contesto, MAI risposta inventata (guardrail doc 03).

## 6. Le 10 schermate chiave — wireframe, gerarchia, stati

Stati standard ovunque: caricamento = `Skeleton` a forma di contenuto; errore = `ErrorState` con retry; vuoto = `EmptyState` con CTA. Sotto ogni schermata solo gli stati *specifici*.

### 6.1 Oggi (allievo)
```
┌─────────────────────────────┐
│ Ciao, Marco        [QR] [🔔]│ ← header: quick action + notifiche
│                             │
│   ╭───────╮  COME STAI?     │
│   │  78   │  Pronto. Spingi │ ← ReadinessRing + consiglio
│   ╰───────╯  [Check-in ▸]   │   (CTA solo se non fatto)
│                             │
│ OGGI TI ALLENI              │
│ ┌─────────────────────────┐ │
│ │ Upper A · 6 esercizi    │ │ ← card seduta del giorno
│ │ ~50 min    [INIZIA]     │ │   (unica CTA primaria)
│ └─────────────────────────┘ │
│ Gio 17:00 · PT con Francesco│ ← prossimo appuntamento
│ ⚠ Rata in scadenza 15/07  ▸ │ ← avvisi (solo se presenti)
│ 🔥 Streak 5 giorni          │
├─────────────────────────────┤
│ Oggi Allenati Progr Chat Pro│
└─────────────────────────────┘
```
Gerarchia: 1) readiness/check-in 2) seduta 3) appuntamento 4) avvisi. **Vuoto:** nessuna seduta → "Giorno di recupero" con CTA respirazione, mai schermata muta. **Check-in fatto:** l'anello mostra il punteggio, la CTA sparisce.

### 6.2 Check-in Stato ESSĒRE
```
┌─────────────────────────────┐
│ ✕        Come stai?         │
│ SONNO      ●────────○  7h+  │
│ ENERGIA    ───●─────○  media│ ← 4 slider grossi (thumb 44pt)
│ UMORE      ─────●───○  buono│
│ DOLORI     ●────────○  no   │ ← >0 apre picker zona corpo
│                             │
│        [ FATTO ]            │ ← sempre visibile, no scroll
└─────────────────────────────┘
```
Gerarchia: gli slider SONO la schermata; nessun altro elemento. **Risultato:** anello animato + consiglio + eventuale CTA respirazione (F2/F11). **Errore rete:** salvataggio locale + toast "Sincronizzo appena torni online".

### 6.3 Live workout
```
┌─────────────────────────────┐
│ ✕  Upper A          3/6  ▓▓░│ ← progresso seduta
│      PANCA PIANA            │
│      [video/immagine]       │
│  SERIE 2/4 · 8 reps · 60kg  │ ← una cosa: la serie corrente
│  ultima volta: 8×57.5       │
│      ( FATTA ✓ )            │ ← target 72pt: mani sudate
│ ──────────────────────────  │
│  RECUPERO   1:24            │ ← TimerDisplay, parte da solo
│  prossima: serie 3 · 60kg   │
└─────────────────────────────┘
```
Gerarchia: esercizio → serie corrente → timer. **Interruzione** (chiamata, blocco schermo): stato persistito, "Riprendi seduta" in Oggi. **Errore:** i set salvano offline sempre (doc 01 §6).

### 6.4 Progressi (twin visualizzato)
```
┌─────────────────────────────┐
│ I tuoi progressi            │
│ [Corpo] [Forza] [Traguardi] │ ← SegmentedControl (3 max)
│ POSTURA          feb → giu  │
│ ┌────────┐  ┌────────┐      │
│ │foto pre│→ │foto ora│ Δ ✅ │ ← confronto posturale
│ └────────┘  └────────┘      │
│ COMPOSIZIONE                │
│ ▁▂▃▅▆ massa magra +2.1kg    │ ← trend, non numero secco
│ STATO ESSĒRE 30gg           │
│ ▅▆▄▆▇▆▇ media 74 ▲          │
└─────────────────────────────┘
```
Gerarchia: confronto visivo prima dei numeri (la foto convince, la tabella annoia). **Vuoto** (nuovo allievo): EmptyState "Fai la tua prima valutazione posturale" → F1 step 4.

### 6.5 Chat
```
┌─────────────────────────────┐
│ Chat                        │
│ ┌─────────────────────────┐ │
│ │ ⭐ Francesco (coach)  2m │ │ ← fissato in alto
│ │ 🤖 Assistente ESSĒRE    │ │ ← sempre secondo
│ │ 👥 Team MML          1h │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```
**Vuoto:** mai — coach e Assistente esistono sempre, con messaggio di benvenuto precaricato. **Non letto:** badge numerico sulla tab.

### 6.6 Oggi (coach) — dashboard operativa
```
┌─────────────────────────────┐
│ Mar 4 lug     12 in palestra│ ← presenza live (owner)
│ DA ATTENZIONARE (4)         │
│ ┌─────────────────────────┐ │
│ │🔴 Anna · readiness 34   │ │
│ │   dolore spalla   [Chat]│ │ ← perché + azione a 1 tap
│ │🟠 Luca · assente 9gg    │ │
│ │           [Chat] [Nota] │ │
│ │🟠 Sara · rata scaduta   │ │
│ └─────────────────────────┘ │
│ AGENDA OGGI                 │
│ 17:00 PT Marco · 18:00 Sala │
└─────────────────────────────┘
```
Gerarchia: attenzioni → agenda → (owner) incassi. **Vuoto:** "Tutto sotto controllo ✅" — lo stato vuoto qui è il premio, va celebrato non nascosto.

### 6.7 Scheda allievo (coach)
```
┌─────────────────────────────┐
│ ← Anna Rossi          [Chat]│
│ ╭──╮ readiness 34 🔴        │
│ │AR│ streak 0 · rata ok     │ ← vitali in 2 righe
│ ╰──╯                        │
│ [Programma][Corpo][Storia]  │
│ PROGRAMMA: Lower B · sett 3 │
│ ultima seduta: 2gg fa ✓     │
│ NOTE COACH                + │
│ "spalla dx da monitorare"   │
└─────────────────────────────┘
```
Gerarchia: stato attuale → programma → note. È l'hub: da qui si raggiunge tutto dell'allievo in 1 tap.

### 6.8 Editor programma (coach)
```
┌─────────────────────────────┐
│ ← Upper A       [Anteprima] │
│ SETT 1 · GIORNO 1        ⋮  │
│ ┌─────────────────────────┐ │
│ │≡ Panca piana   4×8 90"  │ │ ← drag handle, tap = parametri
│ │≡ Rematore      4×10 60" │ │
│ │≡ ┌ superset ────────┐   │ │
│ └─────────────────────────┘ │
│ [+ Esercizio]               │
│         [ USA PER ALLIEVO ] │ ← CTA primaria
└─────────────────────────────┘
```
**Loading AI** (suggerimenti adattamento, F8): inline sotto l'esercizio, mai bloccante — il coach può sempre procedere a mano.

### 6.9 Pagamenti (allievo)
```
┌─────────────────────────────┐
│ ← Pagamenti                 │
│ PIANO TRIMESTRALE           │
│ ▓▓▓▓▓▓░░░ 2 di 3 rate       │ ← ProgressBar
│ PROSSIMA RATA               │
│ ┌─────────────────────────┐ │
│ │ €130 · entro 15/07      │ │
│ │      [ HO PAGATO ]      │ │ ← H1: [PAGA ORA] Stripe
│ └─────────────────────────┘ │
│ STORICO                     │
│ ✓ 15/06 €130 · ricevuta ▸   │
└─────────────────────────────┘
```
**Vuoto:** "Nessun piano attivo" + CTA Listino (F10). **In attesa conferma owner:** stato "in verifica" esplicito, non ambiguo.

### 6.10 Check-in QR
```
┌─────────────────────────────┐
│ ✕     Check-in palestra     │
│      ┌─────────────┐        │
│      │  ██ ▄▄ ██   │        │ ← QR grande, luminosità
│      │  ▄▄ ██ ▄▄   │        │   schermo forzata al max
│      └─────────────┘        │
│   oppure codice:  MMLAB     │ ← fallback sempre visibile
│   Streak: 🔥 5 giorni       │
└─────────────────────────────┘
```
**Successo:** full-screen verde con nome, 1.5s, haptic success. **Offline:** coda locale + "Registrato, sincronizzo dopo" (F4).

## 7. Accessibilità e localizzazione

**Accessibilità (H0, non negoziabile):**
- Touch target ≥ **44×44pt** (48dp Android) su tutto; lo slider del check-in ha thumb 44pt perché lo usano dita stanche post-allenamento.
- Contrasto **AA**: 4.5:1 testo, 3:1 UI — garantito dai token §4.1 e validato in build (white-label incluso).
- **Dynamic type**: `allowFontScaling` attivo ovunque; `maxFontSizeMultiplier` 1.5 solo su layout critici (timer live, tab bar); test obbligatorio a 130%.
- Mai **solo colore**: readiness = colore + numero + parola ("34 · Scarico"); delta = freccia + segno.
- `accessibilityLabel` su ogni IconButton; `reduce motion` rispettato (§4.5); target VoiceOver/TalkBack sui 3 flussi quotidiani (F2, F3, F4) prima degli store (H1).

**Localizzazione:**
- **H0:** stringhe estratte in `src/i18n/it.ts` (oggi hardcoded nei componenti: è il prerequisito, non la traduzione). Chiavi in inglese, valori italiani. Date/valute via `Intl` con locale esplicito.
- **H1:** `en` per white-label estero; libreria `i18next` (standard RN, lazy-load dei namespace per non gonfiare il bundle). Lingua = proprietà dell'istanza white-label, override per utente.
- **H2:** ulteriori lingue solo trainate da clienti firmati, mai speculative.
- **Alternativa scartata:** tradurre subito tutto in en "perché si fa così" — costo ora, valore zero finché il primo cliente estero non esiste (doc 00 §4).

## 8. "Una cosa per schermata" e misura della semplicità

**La regola operativa:** ogni schermata dichiara nel codice il proprio `primaryAction`. Review checklist: (a) un solo bottone accent visibile; (b) l'obiettivo della schermata pronunciabile in una frase; (c) se servono 2 CTA primarie → split o sheet. Le eccezioni si motivano per iscritto nel PR.

**Le due metriche (H0, Firebase Analytics — gratuito, già nello stack):**

| Metrica | Definizione | Come si misura |
|---|---|---|
| **Tap-to-value** | n° tap dall'apertura app al completamento del job | evento `flow_start`/`flow_complete` con contatore tap |
| **Time-to-task** | tempo p50/p90 dello stesso percorso | timestamp negli stessi eventi |

**Budget per flusso (violarlo = bug UX, si tratta come un crash):**

| Flusso | Tap-to-value max | Time-to-task p50 |
|---|---|---|
| Check-in Stato ESSĒRE (F2) | 3 | < 30s |
| Inizia seduta del giorno (F3) | 2 | < 10s |
| Check-in QR (F4) | 1 | < 5s |
| Messaggio al coach (F6) | 2 + testo | < 20s |
| Coach: da apertura a prima azione su allievo attenzionato | 2 | < 15s |
| Stato rata (F5) | 2 | < 10s |

Revisione mensile con i ~30 allievi reali (H0): sono il laboratorio di usabilità che Whoop paga milioni per simulare. In H1 questi numeri entrano nel riepilogo AI dell'owner e nel pitch white-label ("i tuoi allievi fanno check-in in 22 secondi").

**Il 10x rispetto al settore:** le fitness app misurano DAU e retention (quanto resti dentro); noi misuriamo quanto in fretta esci avendo ottenuto il valore. Un check-in da 25s ripetuto 300 giorni l'anno vale più di 10 minuti di scroll: è la stessa tesi anti-engagement-trap della strategia (doc 00), resa metrica.

## Decisioni chiave

| Decisione | Perché | Alternativa scartata |
|---|---|---|
| Max 5 tab per ruolo, resto in gerarchia ≤2 tap | HIG Apple, modello mentale, prerequisito store | Tab "Altro" con 15 voci: cimitero di feature |
| "Oggi" home intelligente per allievo E coach | L'app apre sulla risposta, non su un menu; stessa filosofia, contenuti per ruolo | Home = lista funzioni (stato attuale) |
| Dashboard coach = "da attenzionare" con azione a 1 tap | Il coach ha 10 min tra sessioni; il coach-nel-loop è il cuneo (doc 00) | Dashboard BI analitica come prima vista |
| Dark-first con token semantici; light theme solo H1 white-label | Il tema attuale è dark e funziona; i token rendono il light un file, non un refactor | Doppio tema subito: costo ora, valore dopo |
| Elevazione dark = superfici + bordo, non ombre | Ombre nere su nero invisibili; le `shadows` attuali sono codice morto su dark | Tenere le shadow "perché ci sono" |
| Griglia 4pt rigorosa, font min 12, touch 44pt | Sana `xs:3/sm:6` e `fontSize:10`; utenza reale non ventenne | Conservare la scala attuale per pigrizia di migrazione |
| Accent `#D40000` mai come testo; testo accent = `#E63333` (≥4.5:1), contrasti validati in build per ogni cliente white-label | 3.6:1 fallisce AA; a mano non scala su N clienti | Controllo contrasti "a occhio" per istanza |
| Design system = pacchetto `src/ui` (18 componenti + stati standard), migrazione strangler schermata per schermata | 1 persona + AI non regge un redesign big-bang; ogni schermata migrata è subito più coerente | Redesign completo prima del rilascio |
| Semplicità misurata: tap-to-value e time-to-task con budget per flusso, violazione = bug | Con 30 allievi veri le decisioni UX si misurano gratis, non si opinano | Decidere la UX per estetica/sensazione |

## Cosa NON faremo (e perché)

- **Redesign estetico big-bang.** Il problema è navigazione + coerenza, non lo stile. Si migra schermata per schermata dentro il lavoro ordinario.
- **Tab "Altro/More".** Sposta il disordine, non lo elimina.
- **Font custom in H0.** +100–300KB su un bundle già da 4MB, licenze, zero valore per 30 allievi. Eventuale in H1 se un cliente white-label paga.
- **Light theme in H0.** Nessun utente lo ha chiesto; i token semantici lo tengono a costo marginale per quando servirà.
- **Onboarding-tutorial a slide ("ecco come si usa l'app").** Se serve un tutorial, la schermata è sbagliata. L'onboarding è il posturale wow (F1), non un carosello.
- **Animazioni decorative diffuse.** Motion budget: si celebra solo ciò che è raro e meritato (badge, PR, fine seduta). Su PWA con bundle 4MB ogni ms conta.
- **Gamification invasiva in Oggi.** Streak sì, coriandoli quotidiani no: la retention si costruisce sul valore (readiness, coach), non sulla slot machine — coerente con l'anti-engagement-trap di doc 00.
- **Tool di design system enterprise (Storybook pubblico, Figma tokens pipeline) in H0.** Una persona sola: la fonte di verità è `src/ui` + questo documento. Storybook interno in H1, quando c'è un secondo paio di mani.

## Dipendenze verso gli altri documenti

- **01-architettura:** code-splitting del bundle (prerequisito dei budget time-to-task), offline-first per F3/F4, piano store per haptics e review Apple.
- **02-dati-digital-twin:** gli stati derivati alimentano "Oggi" e "Da attenzionare"; gli eventi UX (`flow_*`, `coach.attention_handled`) entrano nella tassonomia.
- **03-ai-engine:** copy e comportamento di consiglio del giorno, seduta ridotta (F11), riepilogo settimanale (F9), guardrail Assistente (F12).
- **05-api-sdk:** Stripe per F5; il design system diventa parte dell'SDK white-label in H2.
- **06-sicurezza-compliance:** flusso credenziali onboarding (F1) legato alla bonifica `managedPassword`.
- **07-roadmap:** sequenza di migrazione schermate e milestone store.
