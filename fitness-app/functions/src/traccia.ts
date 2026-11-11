import * as admin from "firebase-admin";
import {HttpsError} from "firebase-functions/v2/https";

// ============================================================
// LA TRACCIA DEGLI ACCESSI — scritta dal server
// ------------------------------------------------------------
// 11 novembre 2026. Per due mesi un manager ha potuto cambiare email
// e password di chiunque, titolare compreso, e nessuno lo avrebbe
// saputo: i cambi di accesso non lasciavano nessuna riga.
//
// Da qui in poi ogni cambio di accesso lascia una riga nel Registro:
// chi l'ha fatto, su chi, quando, che cosa. E la lascia anche ogni
// TENTATIVO respinto: chi prova a fare una cosa che non gli spetta
// è un'informazione, non un errore da buttare.
//
// La scrive il server, non l'applicazione: un'applicazione può
// essere modificata o saltata, la funzione no. Il Registro resta
// quello di sempre — si aggiunge, non si modifica e non si cancella,
// e lo legge solo il titolare.
//
// Non scrive MAI una password, né in chiaro né in altra forma.
// ============================================================

const db = () => admin.firestore();

const REGISTRO = "registro";

export type AzioneAccesso = "creato" | "modificato" | "eliminato" | "tentato";

interface Persona {
  nome: string;
  ruolo: string;
}

const leggiPersona = async (uid: string): Promise<Persona> => {
  if (!uid) return {nome: "", ruolo: ""};
  try {
    const d = await db().collection("users").doc(uid).get();
    const x = d.data() || {};
    const nome = `${x.name || ""} ${x.surname || ""}`.trim();
    return {nome, ruolo: String(x.role || "")};
  } catch {
    return {nome: "", ruolo: ""};
  }
};

/**
 * Scrive una riga. Non solleva mai: se il Registro non si scrive,
 * il motivo finisce nei log della funzione, ma l'operazione che la
 * persona ha chiesto non viene annullata per questo.
 */
export const tracciaAccesso = async (riga: {
  chi: string;
  azione: AzioneAccesso;
  bersaglio?: string;
  dettaglio: string;
}): Promise<void> => {
  try {
    const [autore, bersaglio] = await Promise.all([
      leggiPersona(riga.chi),
      leggiPersona(riga.bersaglio || ""),
    ]);
    await db().collection(REGISTRO).add({
      chi: riga.chi,
      chiNome: autore.nome,
      ruolo: autore.ruolo,
      azione: riga.azione,
      oggetto: "accesso",
      oggettoId: riga.bersaglio || "",
      oggettoNome: bersaglio.nome,
      quando: admin.firestore.Timestamp.now(),
      dettaglio: riga.dettaglio,
      origine: "server",
    });
  } catch (err) {
    console.error("Registro accessi: riga non scritta", riga.azione, riga.dettaglio, err);
  }
};

/**
 * Il cancello delle funzioni sugli accessi. Lascia passare solo il
 * titolare; chiunque altro viene respinto, e il tentativo resta
 * scritto nel Registro con quello che stava provando a fare.
 */
export const soloTitolareTracciato = async (
  uid: string,
  cosa: string,
  bersaglio?: string
): Promise<void> => {
  // Lettura diretta, senza rete di sicurezza: se il database non
  // risponde, la funzione fallisce e NON lascia passare nessuno.
  const d = await db().collection("users").doc(uid).get();
  if (d.exists && d.data()?.role === "owner") return;
  await tracciaAccesso({
    chi: uid,
    azione: "tentato",
    bersaglio,
    dettaglio: `${cosa}: respinto, solo il titolare può farlo`,
  });
  throw new HttpsError(
    "permission-denied", "Solo il titolare può eseguire questa operazione.");
};
