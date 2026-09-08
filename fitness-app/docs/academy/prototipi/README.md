# Prototipi

## `academy-lms-essere-linkinbio.jsx`

Un solo componente React con **tre interfacce complete e navigabili**:

1. **ACADEMY** — un prototipo di piattaforma di erogazione: barra laterale con
   le lezioni, stato di completamento, contenuto, **quiz con soglia al 75%** e
   rilascio di un certificato di modulo.
2. **ESSĒRE APP** — una vista allievo con statistiche, sessione del giorno,
   libreria contenuti, protocollo a fasi e progressi.
3. **LINK IN BIO** — pagina pubblica con posizionamento, dati del metodo e
   chiamate all'azione.

**Perché conta.** L'inventario del Documento strategico 01/02 elenca la
*«Piattaforma di erogazione (LMS)»* fra gli asset **assenti**, con nota
«Decisione tecnologica da prendere». Questo prototipo non è una piattaforma,
ma è la dimostrazione che l'impianto didattico — lezioni, progressione, quiz,
soglia, certificato — è già stato disegnato. Serve alla decisione: dice che
cosa deve fare la piattaforma, chiunque la fornisca.

**Da verificare prima di riusarlo:** la vista ESSĒRE contiene dati d'esempio
(un allievo «Marco Rossi», percentuali di miglioramento) che sono finti. Se il
componente finisce in una demo commerciale, quei numeri vanno sostituiti con
dati veri e anonimizzati, o dichiarati come esempio — la regola della nota di
due diligence vale anche qui.

## `respira-esperienza-guidata.html`

Esperienza di respirazione guidata, autonoma e completa: orbo pulsante
sincronizzato al respiro (inspira 5s · trattieni 0,9s · espira 5,8s, ritmo di
coerenza), braci animate, audio generato dal browser su D3 e A3 che sale e
scende col respiro, frasi che ruotano, chiusura poetica.

Funziona da sola in un file, rispetta `prefers-reduced-motion`, non carica
nulla dall'esterno. È dichiarata «Risveglio Live · Mind Movement — Il cuore del
Metodo».

**È l'unico pezzo dell'archivio che non è un documento ma un'esperienza.** Il
Modulo 05 mette il Centring come prima delle cinque fasi della sessione: questo
file è quella fase, già fatta. Andrebbe dentro ESSĒRE — l'app ha già una
schermata Respiro, e oggi non fa questo.
