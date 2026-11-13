import * as admin from "firebase-admin";
import {onCall, HttpsError} from "firebase-functions/v2/https";
import {analizzaAccessi, AccountIn, SchedaIn} from "./domain/controlloAccessi";
import {soloTitolareTracciato} from "./traccia";

// ============================================================
// IL CONTROLLO ACCESSI — la porta del titolare
// ------------------------------------------------------------
// Legge, in sola lettura, gli account di accesso (Firebase Auth) e
// le schede dell'anagrafica, e restituisce il confronto calcolato
// dal dominio (src/domain/controlloAccessi.ts).
//
// Non salva niente e non modifica niente: è una fotografia fatta nel
// momento in cui la si chiede. Chi non è il titolare viene respinto,
// e il tentativo resta scritto nel Registro.
// ============================================================

const db = () => admin.firestore();

const iso = (s: string | null | undefined): string | null => {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString();
};

/** Tutti gli account, a pagine da mille. */
const tuttiGliAccount = async (): Promise<AccountIn[]> => {
  const out: AccountIn[] = [];
  let pagina: string | undefined;
  do {
    const r = await admin.auth().listUsers(1000, pagina);
    for (const u of r.users) {
      out.push({
        uid: u.uid,
        email: u.email,
        disabilitato: u.disabled,
        creato: iso(u.metadata.creationTime),
        ultimoIngresso: iso(u.metadata.lastSignInTime),
        ultimaAttivita: iso(u.metadata.lastRefreshTime),
        sessioniValideDal: iso(u.tokensValidAfterTime),
        ruoloToken: typeof u.customClaims?.role === "string" ? u.customClaims.role : undefined,
      });
    }
    pagina = r.pageToken;
  } while (pagina);
  return out;
};

export const controlloAccessi = onCall(
  {region: "europe-west1", timeoutSeconds: 60, memory: "256MiB"},
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Devi essere autenticato.");
    }
    await soloTitolareTracciato(request.auth.uid, "leggere il controllo accessi");

    try {
      const [accounts, schedeSnap] = await Promise.all([
        tuttiGliAccount(),
        db().collection("users").get(),
      ]);
      const schede: SchedaIn[] = schedeSnap.docs.map((d) => {
        const x = d.data();
        return {
          id: d.id,
          email: typeof x.email === "string" ? x.email : undefined,
          role: typeof x.role === "string" ? x.role : undefined,
          name: typeof x.name === "string" ? x.name : undefined,
          surname: typeof x.surname === "string" ? x.surname : undefined,
          isActive: x.isActive === false ? false : undefined,
        };
      });
      return JSON.parse(JSON.stringify(analizzaAccessi(accounts, schede, new Date())));
    } catch (err) {
      const motivo = (err as {code?: string; message?: string})?.code ||
        (err as Error)?.message || String(err);
      throw new HttpsError("internal", `Controllo accessi: ${motivo}`);
    }
  }
);
