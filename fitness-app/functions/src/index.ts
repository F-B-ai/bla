import * as admin from "firebase-admin";
import {onCall, HttpsError} from "firebase-functions/v2/https";

export {aiMessages} from "./ai";
export {nightlyBrain, brainRun} from "./brain";
export {calIngest, calKeyRotate} from "./cal";

admin.initializeApp();

const db = admin.firestore();
const authAdmin = admin.auth();

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

export const adminChangeEmail = onCall({region: "europe-west1"}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Devi essere autenticato.");
  }
  await verifyOwnerOrManager(request.auth.uid);

  const {targetUserId, newEmail} = request.data;
  if (!targetUserId || !newEmail) {
    throw new HttpsError("invalid-argument", "targetUserId e newEmail sono obbligatori.");
  }

  await authAdmin.updateUser(targetUserId, {email: newEmail});
  await db.collection("users").doc(targetUserId).update({email: newEmail});

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

  await authAdmin.updateUser(targetUserId, {password: newPassword});

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
    if (err.code !== "auth/user-not-found") throw e;
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

  await authAdmin.setCustomUserClaims(targetUserId, {role});
  return {success: true};
});

export const migrateUserClaims = onCall({region: "europe-west1"}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Devi essere autenticato.");
  }
  await verifyOwner(request.auth.uid);

  const usersSnapshot = await db.collection("users").get();
  let migrated = 0;

  for (const userDoc of usersSnapshot.docs) {
    const role = userDoc.data().role;
    if (role) {
      try {
        await authAdmin.setCustomUserClaims(userDoc.id, {role});
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

  const usersSnapshot = await db.collection("users")
    .where("managedPassword", "!=", null).get();

  const batch = db.batch();
  let cleaned = 0;

  for (const userDoc of usersSnapshot.docs) {
    batch.update(userDoc.ref, {
      managedPassword: admin.firestore.FieldValue.delete(),
    });
    cleaned++;
  }

  if (cleaned > 0) {
    await batch.commit();
  }

  return {success: true, cleaned};
});
