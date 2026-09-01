# Academy — l'archivio dei documenti

Questa cartella esiste per una ragione precisa: i documenti dell'Accademia sono
stati scritti, stampati, e poi persi. Erano nati in conversazioni diverse, non
erano in nessun repository, e quando è servito ritrovarli non c'era un posto
dove cercarli.

**Da qui in avanti la regola è una sola: un documento dell'Accademia esiste se
sta in questa cartella.** Se è solo stampato, o solo in una chat, non esiste —
esiste una copia, che è un'altra cosa.

I file qui dentro sono versionati con il codice: hanno una storia, si possono
confrontare, e non si perdono.

---

## Lo stato dei sei documenti

| Documento | File | Stato |
|---|---|---|
| Specifica clinica e tecnica — Valutazione in due sessioni e Sistema Stellato | `valutazione-due-sessioni-e-sistema-stellato.pdf` | **Originale, integro** (14 pagine). Già implementato in `src/data/stellatoProtocol.ts` |
| Percorso formatori, Sessione 01 — Docimologia | `docimologia.html` | **Ricostruito a norma di copertina.** Non è la scansione dell'originale: vedi l'avvertenza dentro il documento |
| Livello 1, modulo A-01 — Perché un corpo cambia | `modulo-a01-perche-un-corpo-cambia.html` | **Completo**, due strade + kit d'aula. Codice A-01 proposto, da confermare col Documento operativo 03 |
| Documento strategico 01/02 — Mind Movement Academy | — | **Mancante.** Esiste solo su carta |
| Documento operativo 03 — I 22 moduli | — | **Mancante.** È il più urgente: contiene l'elenco dei 22 moduli con codice e area |
| Documento strategico 02/02 — ESSĒRE | — | **Mancante.** Esiste solo su carta |
| Moduli C-23 e C-24 — I meccanismi dell'ipertrofia e la scheda sartoriale | — | **Mancante.** Esiste solo su carta |

## Che cosa sappiamo dell'architettura, dalle copertine

Le copertine fotografate dei documenti mancanti fissano alcuni fatti che valgono
come canone finché non rientrano i testi completi:

- **3 livelli, 22 moduli**, ripartiti **8 / 8 / 6**. La ripartizione 8 / 9 / 5 è
  un errore corretto nel capitolo 2 del Documento operativo 03.
- I moduli hanno **codici per area**: A-02, C-23, C-24.
- Il percorso è **doppio**: quello che il formatore studia e quello che si eroga
  in aula.
- Il modulo C-23/C-24 rimanda ad A-02 per gli studi sulla frequenza di
  allenamento: i moduli si citano fra loro, quindi l'ordine dei codici è
  significativo e non va rinumerato a piacere.

L'artifact «ESSĒRE Academy» contiene una bozza a 13 moduli scritta prima che
queste copertine fossero disponibili: **non è il canone** e va sostituita quando
il Documento operativo 03 rientra.

## Il vincolo di coerenza fra documento e codice

Il modulo A-01 e `src/domain/progressione.ts` dicono le stesse cose: le cinque
caselle della catena, gli undici assi con la loro fonte, le soglie numeriche
(2 sedute, prontezza 40, compenso 3, angolo 100°) e l'ordine dei cinque cancelli.

Se un giorno divergono, **ha ragione il documento e si corregge il codice** — mai
il contrario. Un corsista che ritrova in app parole diverse da quelle dell'aula
smette di fidarsi di entrambi.

## Come si aggiunge un documento

1. Metti il file qui (`.pdf` per gli originali, `.html` per quelli composti).
2. Aggiungi la riga nella tabella qui sopra, con lo stato reale.
3. Committa. Non serve altro.
