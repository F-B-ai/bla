import * as admin from "firebase-admin";
import {onDocumentCreated} from "firebase-functions/v2/firestore";
import {logger} from "firebase-functions";

// ============================================================
// LA NOTIFICA CHE ARRIVA ANCHE CON L'APP CHIUSA
// ------------------------------------------------------------
// Il titolare, il 22 ottobre 2026: «e ad ogni richiesta di visita,
// posso avere una notifica».
//
// Dentro l'applicazione l'avviso c'era già: campanella e pallino. Ma
// lo si vedeva solo aprendo — e chi apre l'app per controllare se c'è
// qualcosa da fare, di solito, è chi già sospetta che ci sia. Le
// richieste che arrivano mentre il telefono è in tasca aspettavano
// che qualcuno si ricordasse di guardare.
//
// Questa funzione chiude il giro: appena nasce un avviso in
// `notifications`, lo manda al telefono della persona a cui è
// destinato.
//
// ------------------------------------------------------------
// PERCHÉ SI MANDA UN MESSAGGIO «DATA» E NON UNA «NOTIFICATION»
// ------------------------------------------------------------
// Firebase sa mandare due cose: una notifica che il browser mostra da
// solo, e dei dati che mostra il nostro service worker. Scegliamo la
// seconda perché il service worker dell'app esiste già, sa disegnare
// la notifica con la sua icona e sa che cosa aprire quando la si
// tocca. Con la prima ne servirebbe un secondo, e due service worker
// sullo stesso sito litigano: esce una notifica doppia, o nessuna.
//
// ------------------------------------------------------------
// E PERCHÉ UN FALLIMENTO QUI NON DEVE FARE RUMORE
// ------------------------------------------------------------
// L'avviso dentro l'app è già salvato quando questa funzione parte.
// Se il telefono non si raggiunge — permesso tolto, app disinstallata,
// indirizzo scaduto — la persona vede comunque il pallino rosso la
// prossima volta che apre. Quindi qui non si rilancia niente: si
// scrive nei log e si lascia perdere. Un errore che si propaga
// farebbe riprovare la funzione all'infinito per un telefono che non
// esiste più.
// ============================================================

/** Un indirizzo che il server rifiuta è un indirizzo da buttare. */
const INDIRIZZI_MORTI = [
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
  "messaging/invalid-argument",
];

export const avvisaSulTelefono = onDocumentCreated(
  {document: "notifications/{avvisoId}", region: "europe-west1"},
  async (event) => {
    const dati = event.data?.data();
    if (!dati) return;

    const userId = String(dati.userId || "");
    if (!userId) return;

    const titolo = String(dati.title || "ESSĒRE");
    const testo = String(dati.body || "");

    const db = admin.firestore();
    const scheda = await db.collection("users").doc(userId).get();
    const token = String(scheda.get("pushToken") || "");

    // Nessun indirizzo non è un guasto: è una persona che non ha
    // installato l'app, o che le notifiche non le vuole.
    if (!token) return;

    try {
      await admin.messaging().send({
        token,
        data: {
          title: titolo,
          body: testo,
          url: String(dati.data?.url || "/"),
        },
        webpush: {
          headers: {Urgency: "high", TTL: "86400"},
        },
      });
    } catch (err) {
      const codice = (err as {code?: string})?.code || "";

      if (INDIRIZZI_MORTI.includes(codice)) {
        // L'indirizzo non vale più: si cancella, altrimenti ogni
        // avviso futuro ritenta contro un telefono che non c'è e i
        // log si riempiono di un guasto che non si può riparare.
        await db.collection("users").doc(userId)
          .update({pushToken: admin.firestore.FieldValue.delete()})
          .catch(() => undefined);
        logger.info("Indirizzo push scaduto, rimosso", {userId, codice});
        return;
      }

      logger.warn("Notifica non recapitata", {userId, codice});
    }
  }
);
