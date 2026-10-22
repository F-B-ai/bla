import * as admin from "firebase-admin";
import {onCall, HttpsError} from "firebase-functions/v2/https";
import {logger} from "firebase-functions";

// ============================================================
// LA NOTIFICA CHE ARRIVA ANCHE CON L'APP CHIUSA
// ------------------------------------------------------------
// Il titolare, il 22 ottobre 2026: «e ad ogni richiesta di visita,
// posso avere una notifica».
//
// Dentro l'applicazione l'avviso c'era già: campanella e pallino. Ma
// lo si vedeva solo aprendo — e chi apre l'app per controllare se c'è
// qualcosa da fare, di solito, è chi già sospetta che ci sia.
//
// ------------------------------------------------------------
// PERCHÉ NON È UNA FUNZIONE CHE ASCOLTA IL DATABASE
// ------------------------------------------------------------
// Il primo tentativo lo era: partiva da sola appena nasceva un avviso
// in `notifications`. Più elegante, e non si è potuta pubblicare —
// quel tipo di funzione passa per Eventarc, che pretende permessi che
// l'account di pubblicazione non può concedersi da solo:
//
//   «We failed to modify the IAM policy for the project.»
//
// Si poteva chiedere al titolare di aprire la console Google Cloud e
// assegnare tre ruoli a mano. Ma una strada che per esistere ha
// bisogno di una configurazione fatta una volta e mai più guardata è
// una strada che si rompe il giorno che qualcuno tocca i permessi, e
// si rompe in silenzio.
//
// Questa è dello stesso tipo delle altre funzioni del progetto, che
// si pubblicano da mesi senza chiedere niente a nessuno. La chiama
// l'app subito dopo aver salvato l'avviso.
//
// ------------------------------------------------------------
// PERCHÉ SI MANDA UN MESSAGGIO «DATA» E NON UNA «NOTIFICATION»
// ------------------------------------------------------------
// Firebase sa mandare due cose: una notifica che il browser mostra da
// solo, e dei dati che mostra il nostro service worker. Si sceglie la
// seconda perché il service worker dell'app esiste già, sa disegnare
// la notifica con la sua icona e sa che cosa aprire quando la si
// tocca. Con la prima ne servirebbe un secondo, e due service worker
// sullo stesso sito litigano: esce una notifica doppia, o nessuna.
// ============================================================

/** Un indirizzo che il server rifiuta è un indirizzo da buttare. */
const INDIRIZZI_MORTI = [
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
  "messaging/invalid-argument",
];

/**
 * Quanto può essere vecchio un avviso perché valga la pena suonare.
 *
 * Serve a una cosa sola: impedire che qualcuno, passando l'id di un
 * avviso di mesi fa, faccia squillare il telefono di un'altra persona
 * quando vuole. Il contenuto non lo sceglie chi chiama — si legge dal
 * documento — quindi il peggio che può fare è ripetere un avviso
 * vero, e solo entro due minuti dalla sua nascita.
 */
const MINUTI_VALIDI = 2;

export const inviaAvvisoPush = onCall(
  {region: "europe-west1"},
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Devi essere autenticato.");
    }

    const avvisoId = String(request.data?.avvisoId || "").trim();
    if (!avvisoId) {
      throw new HttpsError("invalid-argument", "Manca l'avviso da mandare.");
    }

    const db = admin.firestore();
    const avviso = await db.collection("notifications").doc(avvisoId).get();

    // Un avviso che non c'è non è un errore da gridare: può essere
    // stato appena cancellato, o non essere ancora arrivato dalla
    // copia locale. Si esce senza rumore.
    if (!avviso.exists) return {inviata: false, motivo: "non trovato"};

    const creato = avviso.get("createdAt") as admin.firestore.Timestamp | undefined;
    const minuti = creato ?
      (Date.now() - creato.toDate().getTime()) / 60000 :
      Number.MAX_SAFE_INTEGER;
    if (minuti > MINUTI_VALIDI) {
      return {inviata: false, motivo: "troppo vecchio"};
    }

    const userId = String(avviso.get("userId") || "");
    if (!userId) return {inviata: false, motivo: "senza destinatario"};

    const scheda = await db.collection("users").doc(userId).get();
    const token = String(scheda.get("pushToken") || "");

    // Nessun indirizzo non è un guasto: è una persona che non ha
    // installato l'app, o che le notifiche non le vuole. L'avviso
    // dentro l'app resta, e il pallino rosso pure.
    if (!token) return {inviata: false, motivo: "nessun telefono"};

    try {
      await admin.messaging().send({
        token,
        data: {
          title: String(avviso.get("title") || "ESSĒRE"),
          body: String(avviso.get("body") || ""),
          url: String(avviso.get("data")?.url || "/"),
        },
        webpush: {headers: {Urgency: "high", TTL: "86400"}},
      });
      return {inviata: true};
    } catch (err) {
      const codice = (err as {code?: string})?.code || "";

      if (INDIRIZZI_MORTI.includes(codice)) {
        // L'indirizzo non vale più: si cancella, altrimenti ogni
        // avviso futuro ritenta contro un telefono che non c'è.
        await db.collection("users").doc(userId)
          .update({pushToken: admin.firestore.FieldValue.delete()})
          .catch(() => undefined);
        logger.info("Indirizzo push scaduto, rimosso", {userId, codice});
        return {inviata: false, motivo: "indirizzo scaduto"};
      }

      // Non si rilancia: l'avviso dentro l'app è già salvato, e far
      // fallire la chiamata farebbe comparire un errore a chi ha solo
      // chiesto una consulenza.
      logger.warn("Notifica non recapitata", {userId, codice});
      return {inviata: false, motivo: codice || "errore"};
    }
  }
);
