import * as admin from "firebase-admin";
import {onCall, HttpsError} from "firebase-functions/v2/https";

export {aiMessages} from "./ai";
export {nightlyBrain, brainRun} from "./brain";
export {calIngest, calKeyRotate} from "./cal";
export {validaInvito} from "./inviti";

admin.initializeApp();

const db = admin.firestore();
const authAdmin = admin.auth();

/**
 * Qualunque errore, trasformato in qualcosa che ARRIVA sullo schermo.
 *
 * Se da una Function scappa un errore che non è un `HttpsError`, il
 * runtime lo sostituisce con la sola parola `INTERNAL` e il motivo
 * vero resta nei log, dove il titolare non lo legge mai. È quello
 * che gli è successo il 14 settembre 2026 col cambio email.
 *
 * `contesto` dice che cosa si stava facendo: senza, «errore» da solo
 * non aiuta nessuno.
 */
function comeHttpsError(err: unknown, contesto: string): HttpsError {
  if (err instanceof HttpsError) return err;
  const e = err as {code?: string; message?: string};
  const motivo = e?.code || e?.message || String(err);
  return new HttpsError("internal", `${contesto}: ${motivo}`);
}

async function verifyOwner(callerUid: string): Promise<void> {
  const userDoc = await db.collection("users").doc(callerUid).get();
  if (!userDoc.exists || userDoc.data()?.role !== "owner") {
    throw new HttpsError("permission-denied", "Solo il titolare può eseguire questa operazione.");
  }
}

async function verifyOwnerOrManager(callerUid: string): Promise<void> {
  const userDoc = await db.collection("users").doc(callerUid).get();
  const role = userDoc.data()?.role;
  if (!userDoc.exists || (role !== "owner" && role !== "manager")) {
    throw new HttpsError("permission-denied", "Non hai i permessi per questa operazione.");
  }
}

/**
 * Perché tutto sta dentro un try.
 *
 * Il 14 settembre 2026 il titolare ha provato a cambiare l'email di
 * un'allieva e ha letto: «L'operazione non è riuscita e non so dirti
 * perché. Dettaglio: internal (functions/internal)».
 *
 * Quel messaggio nudo — la parola `internal` e basta — è la firma di
 * una Function **crollata**, non di una Function che rifiuta: quando
 * si lancia un `HttpsError` il suo testo arriva fino allo schermo,
 * quando invece scappa un errore qualunque il runtime restituisce
 * `INTERNAL` e nient'altro. Il testo che questa funzione si era
 * preparata non è mai partito.
 *
 * E la riga scoperta era l'ultima: la scrittura su Firestore, fuori
 * dal try. Con una conseguenza peggiore del messaggio brutto —
 * l'email su Firebase Auth era GIÀ cambiata, quindi la persona si
 * ritrovava a dover entrare con l'indirizzo nuovo mentre l'App
 * continuava a mostrare quello vecchio. Due verità diverse sulla
 * stessa persona, e nessuno che lo sapesse.
 *
 * Adesso: niente esce da qui senza essere un HttpsError con dentro
 * il motivo vero, e se la seconda scrittura fallisce si RIPORTA
 * INDIETRO la prima.
 */
export const adminChangeEmail = onCall({region: "europe-west1"}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Devi essere autenticato.");
  }
  await verifyOwnerOrManager(request.auth.uid);

  const {targetUserId, newEmail} = request.data;
  if (!targetUserId || !newEmail) {
    throw new HttpsError("invalid-argument", "targetUserId e newEmail sono obbligatori.");
  }

  // Serve dopo, per poter tornare indietro.
  let emailPrecedente = "";
  try {
    emailPrecedente = (await authAdmin.getUser(targetUserId)).email || "";
  } catch (err) {
    const codice = (err as {code?: string})?.code || "";
    if (codice === "auth/user-not-found") {
      throw new HttpsError(
        "failed-precondition",
        "Questa persona non ha ancora un accesso: è in anagrafica ma non ha " +
        "mai completato la registrazione, quindi non c'è nessuna email di " +
        "accesso da cambiare. Mandale l'invito."
      );
    }
    throw new HttpsError(
      "internal",
      `Non riesco a leggere l'accesso di questa persona: ${codice || String(err)}`
    );
  }

  try {
    await authAdmin.updateUser(targetUserId, {email: newEmail});
  } catch (err) {
    const codice = (err as {code?: string})?.code || "";
    if (codice === "auth/email-already-exists") {
      throw new HttpsError(
        "already-exists",
        "Questa email è già usata da un altro account."
      );
    }
    if (codice === "auth/invalid-email") {
      throw new HttpsError("invalid-argument", "Questa email non è valida.");
    }
    throw new HttpsError(
      "internal",
      `Non sono riuscito a cambiare l'email dell'accesso: ${codice || String(err)}`
    );
  }

  // La riga che prima era scoperta. `set(merge)` invece di `update`:
  // così una scheda mancante non fa crollare niente, la crea.
  try {
    await db.collection("users").doc(targetUserId)
      .set({email: newEmail}, {merge: true});
  } catch (err) {
    // Firestore non ha scritto: l'accesso non può restare avanti.
    // Si torna indietro, così le due verità non divergono mai.
    let ripristinata = false;
    try {
      if (emailPrecedente) {
        await authAdmin.updateUser(targetUserId, {email: emailPrecedente});
        ripristinata = true;
      }
    } catch {
      ripristinata = false;
    }
    const codice = (err as {code?: string})?.code || String(err);
    throw new HttpsError(
      "internal",
      ripristinata ?
        "L'email dell'accesso era cambiata ma la scheda no, quindi ho " +
        `rimesso tutto com'era: non è cambiato niente. Motivo: ${codice}` :
        "ATTENZIONE: l'email di ACCESSO è stata cambiata ma la scheda no, " +
        `e non sono riuscito a tornare indietro. Motivo: ${codice}. ` +
        `Questa persona adesso entra con «${newEmail}». Sistemalo dalla ` +
        "console Firebase prima di riprovare."
    );
  }

  return {success: true};
});

export const adminChangePassword = onCall({region: "europe-west1"}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Devi essere autenticato.");
  }
  await verifyOwnerOrManager(request.auth.uid);

  const {targetUserId, newPassword} = request.data;
  if (!targetUserId || !newPassword) {
    throw new HttpsError("invalid-argument", "targetUserId e newPassword sono obbligatori.");
  }
  if (newPassword.length < 6) {
    throw new HttpsError("invalid-argument", "La password deve avere almeno 6 caratteri.");
  }

  // L'errore vero non si perde in un `internal`: il caso di gran lunga
  // più frequente è che la persona sia in anagrafica ma non abbia mai
  // completato la registrazione — non c'è nessuna password da cambiare,
  // e dirlo così è tutt'altra cosa che «operazione fallita».
  try {
    await authAdmin.updateUser(targetUserId, {password: newPassword});
  } catch (err) {
    const codice = (err as {code?: string})?.code || "";
    if (codice === "auth/user-not-found") {
      throw new HttpsError(
        "failed-precondition",
        "Questa persona non ha ancora un accesso: è in anagrafica ma non ha " +
        "mai completato la registrazione, quindi non c'è una password da " +
        "cambiare. Mandale l'invito, oppure usa «Invia link reimpostazione " +
        "password»."
      );
    }
    throw new HttpsError(
      "internal",
      `Non sono riuscito a cambiare la password: ${codice || String(err)}`
    );
  }

  return {success: true};
});

export const adminDeleteUser = onCall({region: "europe-west1"}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Devi essere autenticato.");
  }
  await verifyOwner(request.auth.uid);

  const {targetUserId} = request.data;
  if (!targetUserId) {
    throw new HttpsError("invalid-argument", "targetUserId è obbligatorio.");
  }

  try {
    await authAdmin.deleteUser(targetUserId);
  } catch (e: unknown) {
    const err = e as {code?: string};
    // Chi non ha mai completato la registrazione non ha un accesso da
    // cancellare: non è un errore, è già come dovrebbe essere.
    if (err.code !== "auth/user-not-found") {
      // Prima qui c'era `throw e` — l'errore nudo, che diventava
      // «internal» e basta.
      throw comeHttpsError(e, "Non sono riuscito a eliminare l'accesso");
    }
  }

  return {success: true};
});

export const setUserClaims = onCall({region: "europe-west1"}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Devi essere autenticato.");
  }
  await verifyOwner(request.auth.uid);

  const {targetUserId, role} = request.data;
  if (!targetUserId || !role) {
    throw new HttpsError("invalid-argument", "targetUserId e role sono obbligatori.");
  }

  const validRoles = ["owner", "manager", "collaborator", "student", "academy_student"];
  if (!validRoles.includes(role)) {
    throw new HttpsError("invalid-argument", "Ruolo non valido.");
  }

  // Il ruolo viaggia nel token: le regole di Storage lo leggono da lì,
  // perché la lettura di Firestore da dentro quelle regole non funziona
  // in produzione (11 set 2026). Insieme al ruolo va anche «attivo»:
  // senza, un accesso disattivato resterebbe staff fino alla scadenza.
  try {
    const doc = await db.collection("users").doc(targetUserId).get();
    const attivo = doc.exists ? doc.data()?.isActive !== false : true;
    await authAdmin.setCustomUserClaims(targetUserId, {role, attivo});
  } catch (err) {
    throw comeHttpsError(err, "Non sono riuscito ad assegnare il ruolo");
  }
  return {success: true};
});

export const migrateUserClaims = onCall({region: "europe-west1"}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Devi essere autenticato.");
  }
  await verifyOwner(request.auth.uid);

  let usersSnapshot;
  try {
    usersSnapshot = await db.collection("users").get();
  } catch (err) {
    throw comeHttpsError(err, "Non sono riuscito a leggere gli utenti");
  }
  let migrated = 0;

  for (const userDoc of usersSnapshot.docs) {
    const role = userDoc.data().role;
    if (role) {
      try {
        const attivo = userDoc.data().isActive !== false;
        await authAdmin.setCustomUserClaims(userDoc.id, {role, attivo});
        migrated++;
      } catch {
        // User might not exist in Auth anymore
      }
    }
  }

  return {success: true, migrated};
});

export const cleanManagedPasswords = onCall({region: "europe-west1"}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Devi essere autenticato.");
  }
  await verifyOwner(request.auth.uid);

  let cleaned = 0;
  try {
    const usersSnapshot = await db.collection("users")
      .where("managedPassword", "!=", null).get();

    const batch = db.batch();
    for (const userDoc of usersSnapshot.docs) {
      batch.update(userDoc.ref, {
        managedPassword: admin.firestore.FieldValue.delete(),
      });
      cleaned++;
    }
    if (cleaned > 0) await batch.commit();
  } catch (err) {
    throw comeHttpsError(err, "Non sono riuscito a ripulire le password salvate");
  }

  return {success: true, cleaned};
});
