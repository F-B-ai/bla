import * as admin from "firebase-admin";
import {createHash} from "crypto";
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
// essere modificata o saltata, la funzione no. Le regole del
// database impediscono all'applicazione di scrivere righe «tentato»
// o «accesso»: quelle righe, quindi, vengono solo da qui.
//
// Non scrive MAI una password, né in chiaro né in altra forma.
// ============================================================

const db = () => admin.firestore();

const REGISTRO = "registro";

export type AzioneAccesso = "creato" | "modificato" | "eliminato" | "tentato";
export type OggettoTraccia = "accesso" | "pagamento" | "applicazione";

interface Persona {
  nome: string;
  ruolo: string;
}

/**
 * Un testo che arriva da fuori, reso innocuo: una riga sola, lunghezza
 * limitata. Chi chiama una funzione può mandare qualunque cosa (un
 * oggetto enorme, un testo che finge di essere una spiegazione): nel
 * Registro entra solo un frammento corto e piatto.
 */
export const testoSicuro = (x: unknown, massimo = 120): string =>
  String(x ?? "").replace(/[\r\n\t]+/g, " ").slice(0, massimo);

/** Un identificativo usabile come documento: niente barre, niente vuoti. */
const idValido = (x: unknown): string => {
  const s = testoSicuro(x, 128);
  return s && !s.includes("/") ? s : "";
};

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
 * Scrive una riga. Non solleva mai: se il Registro non si scrive, il
 * motivo finisce nei log della funzione, ma l'operazione che la persona
 * ha chiesto non viene annullata per questo.
 *
 * I TENTATIVI si scrivono una volta per ora, per persona e per tipo di
 * operazione: chi prova cento volte non può riempire il Registro e
 * spingere fuori dallo schermo le righe vere. La riga resta la prima.
 */
export const tracciaAccesso = async (riga: {
  chi: string;
  azione: AzioneAccesso;
  bersaglio?: unknown;
  dettaglio: string;
  oggetto?: OggettoTraccia;
  /** per i tentativi: che cosa si stava provando a fare */
  tentativo?: string;
}): Promise<void> => {
  try {
    const bersaglio = idValido(riga.bersaglio);
    const [autore, persona] = await Promise.all([
      leggiPersona(riga.chi),
      leggiPersona(bersaglio),
    ]);
    const dati: Record<string, unknown> = {
      chi: riga.chi,
      chiNome: autore.nome,
      ruolo: autore.ruolo,
      azione: riga.azione,
      oggetto: riga.oggetto || "accesso",
      oggettoId: bersaglio,
      oggettoNome: persona.nome,
      quando: admin.firestore.Timestamp.now(),
      dettaglio: testoSicuro(riga.dettaglio, 300),
      origine: "server",
    };
    if (riga.tentativo) dati.tentativo = testoSicuro(riga.tentativo, 120);

    if (riga.azione !== "tentato") {
      await db().collection(REGISTRO).add(dati);
      return;
    }
    const ora = new Date().toISOString().slice(0, 13); // AAAA-MM-GGTHH
    const tipo = createHash("sha1").update(String(riga.tentativo || "")).digest("hex").slice(0, 12);
    const id = `tentato_${idValido(riga.chi) || "anonimo"}_${tipo}_${ora}`;
    try {
      await db().collection(REGISTRO).doc(id).create(dati);
    } catch (err) {
      // 6 = ALREADY_EXISTS: il tentativo di quest'ora è già scritto.
      if ((err as {code?: number})?.code !== 6) throw err;
    }
  } catch (err) {
    console.error("Registro accessi: riga NON scritta", riga.azione, riga.dettaglio, err);
  }
};

/**
 * Il cancello delle funzioni riservate. Lascia passare solo il
 * titolare, con la scheda attiva; chiunque altro viene respinto, e il
 * tentativo resta scritto nel Registro con quello che stava provando a
 * fare.
 */
export const soloTitolareTracciato = async (
  uid: string,
  cosa: string,
  bersaglio?: unknown,
  oggetto: OggettoTraccia = "accesso"
): Promise<void> => {
  // Lettura diretta, senza rete di sicurezza: se il database non
  // risponde, la funzione fallisce e NON lascia passare nessuno.
  const d = await db().collection("users").doc(uid).get();
  const x = d.data();
  if (d.exists && x?.role === "owner" && x?.isActive !== false) return;
  await tracciaAccesso({
    chi: uid,
    azione: "tentato",
    bersaglio,
    oggetto,
    tentativo: cosa,
    dettaglio: `${cosa}: respinto, solo il titolare può farlo`,
  });
  throw new HttpsError(
    "permission-denied", "Solo il titolare può eseguire questa operazione.");
};
