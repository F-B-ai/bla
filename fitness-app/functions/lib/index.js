"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanManagedPasswords = exports.migrateUserClaims = exports.setUserClaims = exports.adminDeleteUser = exports.adminChangePassword = exports.adminChangeEmail = exports.brainRun = exports.nightlyBrain = exports.aiMessages = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
var ai_1 = require("./ai");
Object.defineProperty(exports, "aiMessages", { enumerable: true, get: function () { return ai_1.aiMessages; } });
var brain_1 = require("./brain");
Object.defineProperty(exports, "nightlyBrain", { enumerable: true, get: function () { return brain_1.nightlyBrain; } });
Object.defineProperty(exports, "brainRun", { enumerable: true, get: function () { return brain_1.brainRun; } });
admin.initializeApp();
const db = admin.firestore();
const authAdmin = admin.auth();
async function verifyOwner(callerUid) {
    var _a;
    const userDoc = await db.collection("users").doc(callerUid).get();
    if (!userDoc.exists || ((_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.role) !== "owner") {
        throw new https_1.HttpsError("permission-denied", "Solo il titolare può eseguire questa operazione.");
    }
}
async function verifyOwnerOrManager(callerUid) {
    var _a;
    const userDoc = await db.collection("users").doc(callerUid).get();
    const role = (_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.role;
    if (!userDoc.exists || (role !== "owner" && role !== "manager")) {
        throw new https_1.HttpsError("permission-denied", "Non hai i permessi per questa operazione.");
    }
}
exports.adminChangeEmail = (0, https_1.onCall)({ region: "europe-west1" }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Devi essere autenticato.");
    }
    await verifyOwnerOrManager(request.auth.uid);
    const { targetUserId, newEmail } = request.data;
    if (!targetUserId || !newEmail) {
        throw new https_1.HttpsError("invalid-argument", "targetUserId e newEmail sono obbligatori.");
    }
    await authAdmin.updateUser(targetUserId, { email: newEmail });
    await db.collection("users").doc(targetUserId).update({ email: newEmail });
    return { success: true };
});
exports.adminChangePassword = (0, https_1.onCall)({ region: "europe-west1" }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Devi essere autenticato.");
    }
    await verifyOwnerOrManager(request.auth.uid);
    const { targetUserId, newPassword } = request.data;
    if (!targetUserId || !newPassword) {
        throw new https_1.HttpsError("invalid-argument", "targetUserId e newPassword sono obbligatori.");
    }
    if (newPassword.length < 6) {
        throw new https_1.HttpsError("invalid-argument", "La password deve avere almeno 6 caratteri.");
    }
    await authAdmin.updateUser(targetUserId, { password: newPassword });
    return { success: true };
});
exports.adminDeleteUser = (0, https_1.onCall)({ region: "europe-west1" }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Devi essere autenticato.");
    }
    await verifyOwner(request.auth.uid);
    const { targetUserId } = request.data;
    if (!targetUserId) {
        throw new https_1.HttpsError("invalid-argument", "targetUserId è obbligatorio.");
    }
    try {
        await authAdmin.deleteUser(targetUserId);
    }
    catch (e) {
        const err = e;
        if (err.code !== "auth/user-not-found")
            throw e;
    }
    return { success: true };
});
exports.setUserClaims = (0, https_1.onCall)({ region: "europe-west1" }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Devi essere autenticato.");
    }
    await verifyOwner(request.auth.uid);
    const { targetUserId, role } = request.data;
    if (!targetUserId || !role) {
        throw new https_1.HttpsError("invalid-argument", "targetUserId e role sono obbligatori.");
    }
    const validRoles = ["owner", "manager", "collaborator", "student", "academy_student"];
    if (!validRoles.includes(role)) {
        throw new https_1.HttpsError("invalid-argument", "Ruolo non valido.");
    }
    await authAdmin.setCustomUserClaims(targetUserId, { role });
    return { success: true };
});
exports.migrateUserClaims = (0, https_1.onCall)({ region: "europe-west1" }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Devi essere autenticato.");
    }
    await verifyOwner(request.auth.uid);
    const usersSnapshot = await db.collection("users").get();
    let migrated = 0;
    for (const userDoc of usersSnapshot.docs) {
        const role = userDoc.data().role;
        if (role) {
            try {
                await authAdmin.setCustomUserClaims(userDoc.id, { role });
                migrated++;
            }
            catch (_a) {
                // User might not exist in Auth anymore
            }
        }
    }
    return { success: true, migrated };
});
exports.cleanManagedPasswords = (0, https_1.onCall)({ region: "europe-west1" }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Devi essere autenticato.");
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
    return { success: true, cleaned };
});
//# sourceMappingURL=index.js.map