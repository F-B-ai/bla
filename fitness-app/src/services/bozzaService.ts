import AsyncStorage from '@react-native-async-storage/async-storage';
import { BozzaScheda, BOZZA_VERSION, daProporre, vuota } from '../domain/bozzaScheda';

// ============================================================
// DOVE VIVE LA BOZZA — sul telefono, e basta
// ------------------------------------------------------------
// La bozza non esce dal dispositivo. Non passa dalla rete, quindi
// non può fallire quando la rete va male — che è esattamente il
// momento in cui si rischia di perdere il lavoro.
//
// Una bozza per persona: chi lavora su più schede in un giorno
// riprende sempre l'ultima. È la regola più semplice da spiegare, e
// quella che non sorprende nessuno.
// ============================================================

const chiave = (uid: string) => `essere.bozzaScheda.${uid}`;

/** Scrive la bozza. Non solleva: una bozza che non si salva non deve
 *  rompere la schermata su cui si sta lavorando. */
export const salvaBozza = async (
  uid: string,
  bozza: Omit<BozzaScheda, 'v' | 'salvataAlle'>
): Promise<number | null> => {
  if (!uid) return null;
  // Non si salva il nulla: eviterebbe di ritrovare una bozza vera.
  if (vuota(bozza as Partial<BozzaScheda>)) return null;
  const salvataAlle = Date.now();
  try {
    await AsyncStorage.setItem(
      chiave(uid),
      JSON.stringify({ ...bozza, v: BOZZA_VERSION, salvataAlle })
    );
    return salvataAlle;
  } catch {
    return null;
  }
};

/** Legge la bozza, solo se ha ancora senso proporla. */
export const leggiBozza = async (uid: string): Promise<BozzaScheda | null> => {
  if (!uid) return null;
  try {
    const grezzo = await AsyncStorage.getItem(chiave(uid));
    if (!grezzo) return null;
    const b = JSON.parse(grezzo) as BozzaScheda;
    return daProporre(b) ? b : null;
  } catch {
    // Una bozza illeggibile è come una bozza che non c'è.
    return null;
  }
};

export const scartaBozza = async (uid: string): Promise<void> => {
  if (!uid) return;
  try {
    await AsyncStorage.removeItem(chiave(uid));
  } catch {
    // niente da fare, e niente da dire a chi sta lavorando
  }
};
