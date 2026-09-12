import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Platform, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { colors, spacing, fontSize, borderRadius } from '../../config/theme';
import { crossAlert } from '../../utils/alert';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../hooks/useAuth';
import { getStudents } from '../../services/authService';
import { Student } from '../../types';
import {
  TipoComunicazione, Allegato, ETICHETTE_TIPO, ICONE_ALLEGATO, NOMI_ALLEGATO,
  controllaComunicazione, controllaAllegato, confermaInvio, tipoDaMime,
  pesoLeggibile, descriviComunicazione, LUNGHEZZA_TITOLO, LUNGHEZZA_TESTO,
  Comunicazione,
} from '../../domain/comunicazione';
import {
  caricaAllegato, inviaComunicazione, leggiComunicazioni, cancellaComunicazione,
} from '../../services/comunicazioneService';

// ============================================================
// LA BACHECA — scrivere una cosa a tutti
// ------------------------------------------------------------
// Il titolare, il 12 settembre 2026: «Una sezione in cui posso
// inviare in broadcast un avviso, un annuncio, un video, una foto,
// un audio — a tutti gli allievi contemporaneamente.»
//
// Due cose sono deliberate e non sono decorazione:
//
// 1. La conferma dice **il numero**, non «sei sicuro?». Il numero è
//    l'unica cosa che fa fermare chi sta per mandare a ottanta
//    persone una prova pensata per uno.
//
// 2. Dopo l'invio si dice **quante ne sono arrivate e quante no**.
//    Un «inviata!» che nasconde dieci fallimenti è una bugia comoda.
// ============================================================

const TIPI: TipoComunicazione[] = ['avviso', 'annuncio', 'urgente'];

const COLORE_TIPO: Record<TipoComunicazione, string> = {
  avviso: colors.info,
  annuncio: colors.success,
  urgente: colors.error,
};

export const ComunicazioniScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { user, isOwner } = useAuth();

  const [allievi, setAllievi] = useState<Student[]>([]);
  const [storico, setStorico] = useState<Comunicazione[]>([]);
  const [caricando, setCaricando] = useState(true);

  const [tipo, setTipo] = useState<TipoComunicazione>('avviso');
  const [titolo, setTitolo] = useState('');
  const [testo, setTesto] = useState('');
  const [allegato, setAllegato] = useState<Allegato | null>(null);
  const [allegatoLocale, setAllegatoLocale] = useState<{ uri: string; nome: string; mime: string } | null>(null);
  const [inviando, setInviando] = useState(false);

  const carica = useCallback(async () => {
    setCaricando(true);
    try {
      const [studs, comms] = await Promise.all([
        getStudents().catch(() => [] as Student[]),
        leggiComunicazioni(30).catch(() => [] as Comunicazione[]),
      ]);
      setAllievi(studs);
      setStorico(comms);
    } finally {
      setCaricando(false);
    }
  }, []);

  useEffect(() => { carica(); }, [carica]);

  // Solo gli allievi attivi: mandare un avviso a chi non frequenta
  // più non è gentilezza, è rumore — e a volte è imbarazzo.
  const destinatari = useMemo(
    () => allievi.filter((a) => (a as { isActive?: boolean }).isActive !== false),
    [allievi]
  );

  const controllo = controllaComunicazione({ titolo, testo, allegato });

  // ----------------------------------------------------------
  // Scegliere l'allegato
  // ----------------------------------------------------------

  const prendiMedia = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        quality: 0.7,
      });
      if (res.canceled || !res.assets?.[0]) return;
      const a = res.assets[0];
      const mime = a.mimeType || (a.type === 'video' ? 'video/mp4' : 'image/jpeg');
      setAllegatoLocale({ uri: a.uri, nome: a.fileName || 'allegato', mime });
      setAllegato(null);
    } catch {
      crossAlert('Errore', 'Non sono riuscito ad aprire la galleria.');
    }
  };

  const prendiFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (res.canceled || !res.assets?.[0]) return;
      const a = res.assets[0];
      setAllegatoLocale({
        uri: a.uri,
        nome: a.name || 'allegato',
        mime: a.mimeType || 'application/octet-stream',
      });
      setAllegato(null);
    } catch {
      crossAlert('Errore', 'Non sono riuscito ad aprire i file.');
    }
  };

  const togliAllegato = () => {
    setAllegatoLocale(null);
    setAllegato(null);
  };

  // ----------------------------------------------------------
  // Inviare
  // ----------------------------------------------------------

  const invia = async (prova = false) => {
    if (!user) return;
    if (!controllo.ok) {
      crossAlert('Manca qualcosa', controllo.problemi.join('\n'));
      return;
    }
    // Una prova va a una persona sola: sé stessi. Quindi il controllo
    // «non c'è nessun allievo» non la riguarda.
    if (!prova && destinatari.length === 0) {
      crossAlert('Nessun destinatario', 'Non c\'è nessun allievo attivo a cui mandarla.');
      return;
    }
    const aChi = prova ? [user.id] : destinatari.map((a) => a.id);

    crossAlert(
      'Conferma invio',
      confermaInvio(aChi.length, tipo, !!allegatoLocale || !!allegato, prova),
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: prova ? 'Mandala a me' : 'Invia a tutti',
          onPress: async () => {
            setInviando(true);
            try {
              let finale: Allegato | null = allegato;

              if (allegatoLocale && !finale) {
                const risposta = await fetch(allegatoLocale.uri);
                const blob = await risposta.blob();
                const t = tipoDaMime(allegatoLocale.mime);

                // Il peso si controlla PRIMA di caricare: dire «troppo
                // grande» dopo tre minuti di caricamento è una presa in giro.
                const ok = controllaAllegato(t, blob.size);
                if (!ok.ok) {
                  crossAlert('Allegato non valido', ok.motivo);
                  setInviando(false);
                  return;
                }
                finale = await caricaAllegato(blob, t, allegatoLocale.nome);
              }

              const esito = await inviaComunicazione({
                tipo,
                titolo,
                testo,
                allegato: finale,
                autoreId: user.id,
                autoreNome: `${user.name || ''} ${(user as { surname?: string }).surname || ''}`.trim(),
                destinatariIds: aChi,
                prova,
              });

              // Quante sono arrivate e quante no: non si nasconde.
              crossAlert(
                esito.nonConsegnate === 0
                  ? (prova ? 'Prova inviata' : 'Inviata')
                  : 'Inviata, ma non a tutti',
                esito.nonConsegnate === 0
                  ? (prova
                    ? 'Guarda la campanella: la vedrai come la vedrà un allievo.'
                    : `Arrivata a ${esito.consegnate} allievi.`)
                  : `Arrivata a ${esito.consegnate} allievi. `
                    + `Per ${esito.nonConsegnate} la notifica non è partita — `
                    + 'la comunicazione è comunque in bacheca e la vedranno aprendola.'
              );

              setTitolo('');
              setTesto('');
              togliAllegato();
              setTipo('avviso');
              await carica();
            } catch (err) {
              const msg = err instanceof Error ? err.message : 'Errore sconosciuto';
              crossAlert('Non inviata', `Nessuno l'ha ricevuta. Dettaglio: ${msg}`);
            } finally {
              setInviando(false);
            }
          },
        },
      ]
    );
  };

  const elimina = (c: Comunicazione) => {
    crossAlert(
      'Togliere dalla bacheca?',
      `«${c.titolo}» sparirà dalla bacheca di tutti.\n\n`
      + 'Le notifiche già arrivate restano sul telefono di chi le ha ricevute: '
      + 'quelle non si richiamano indietro.',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Togli',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancellaComunicazione(c.id, c.allegato?.url);
              await carica();
            } catch {
              crossAlert('Errore', 'Non sono riuscito a toglierla.');
            }
          },
        },
      ]
    );
  };

  const nomeAllegato = allegatoLocale
    ? NOMI_ALLEGATO[tipoDaMime(allegatoLocale.mime)]
    : '';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ ...styles.header, paddingTop: insets.top + spacing.md }}>
        <Ionicons name="megaphone" size={24} color={colors.accent} />
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Comunicazioni</Text>
          <Text style={styles.headerSub}>
            {caricando
              ? 'Conto gli allievi…'
              : `${destinatari.length} ${destinatari.length === 1 ? 'allievo attivo' : 'allievi attivi'}`}
          </Text>
        </View>
      </View>

      {/* --- COMPOSIZIONE --- */}
      <View style={styles.card}>
        <Text style={styles.label}>Tipo</Text>
        <View style={styles.tipoRiga}>
          {TIPI.map((t) => (
            <TouchableOpacity
              key={t}
              style={[
                styles.tipoChip,
                tipo === t && { backgroundColor: COLORE_TIPO[t], borderColor: COLORE_TIPO[t] },
              ]}
              onPress={() => setTipo(t)}
            >
              <Text style={[styles.tipoTxt, tipo === t && styles.tipoTxtAttivo]}>
                {ETICHETTE_TIPO[t]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Titolo</Text>
        <TextInput
          style={styles.input}
          value={titolo}
          onChangeText={setTitolo}
          placeholder="Es. Chiusura per ferie"
          placeholderTextColor={colors.textLight}
          maxLength={LUNGHEZZA_TITOLO}
        />
        <Text style={styles.contatore}>{titolo.length}/{LUNGHEZZA_TITOLO}</Text>

        <Text style={styles.label}>Messaggio</Text>
        <TextInput
          style={[styles.input, styles.inputLungo]}
          value={testo}
          onChangeText={setTesto}
          placeholder="Scrivi quello che vuoi dire a tutti…"
          placeholderTextColor={colors.textLight}
          multiline
          maxLength={LUNGHEZZA_TESTO}
        />
        <Text style={styles.contatore}>{testo.length}/{LUNGHEZZA_TESTO}</Text>

        <Text style={styles.label}>Allegato</Text>
        {allegatoLocale ? (
          <View style={styles.allegatoBox}>
            <Ionicons
              name={ICONE_ALLEGATO[tipoDaMime(allegatoLocale.mime)] as never}
              size={20}
              color={colors.accent}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.allegatoNome} numberOfLines={1}>{allegatoLocale.nome}</Text>
              <Text style={styles.allegatoMeta}>{nomeAllegato}</Text>
            </View>
            <TouchableOpacity onPress={togliAllegato} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={22} color={colors.error} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.allegatoAzioni}>
            <TouchableOpacity style={styles.allegatoBtn} onPress={prendiMedia}>
              <Ionicons name="image" size={18} color={colors.accent} />
              <Text style={styles.allegatoBtnTxt}>Foto o video</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.allegatoBtn} onPress={prendiFile}>
              <Ionicons name="document-attach" size={18} color={colors.accent} />
              <Text style={styles.allegatoBtnTxt}>Audio o documento</Text>
            </TouchableOpacity>
          </View>
        )}

        {!controllo.ok && (titolo.length > 0 || testo.length > 0) && (
          <View style={styles.problemi}>
            {controllo.problemi.map((p) => (
              <Text key={p} style={styles.problemaTxt}>· {p}</Text>
            ))}
          </View>
        )}

        {/* Prima la prova, e non è cortesia: è che «mandalo a tutti» è
            un tasto che non si annulla, e chi non ha mai visto com'è
            fatta deve poterla vedere senza rischiare ottanta persone. */}
        <TouchableOpacity
          style={styles.provaBtn}
          onPress={() => invia(true)}
          disabled={inviando || caricando}
        >
          <Ionicons name="flask-outline" size={17} color={colors.accent} />
          <Text style={styles.provaTxt}>Provala su di me</Text>
        </TouchableOpacity>

        <Button
          title={inviando ? 'Invio…' : `Invia a ${destinatari.length} allievi`}
          onPress={() => invia(false)}
          loading={inviando}
          disabled={inviando || caricando}
          style={styles.inviaBtn}
        />
      </View>

      {/* --- STORICO --- */}
      <View style={styles.sezione}>
        <Ionicons name="time-outline" size={18} color={colors.accent} />
        <Text style={styles.sezioneTitolo}>Già mandate</Text>
        <Text style={styles.sezioneNum}>{storico.length}</Text>
      </View>

      {caricando ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.lg }} />
      ) : storico.length === 0 ? (
        <Text style={styles.vuoto}>Non hai ancora mandato niente a tutti.</Text>
      ) : (
        storico.map((c) => (
          <View key={c.id} style={styles.storicoCard}>
            <View style={styles.storicoTesta}>
              <View style={[styles.pallino, { backgroundColor: COLORE_TIPO[c.tipo] }]} />
              <Text style={styles.storicoTitolo} numberOfLines={1}>{c.titolo}</Text>
              {c.prova && <Text style={styles.provaTag}>PROVA</Text>}
              {isOwner && (
                <TouchableOpacity onPress={() => elimina(c)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="trash-outline" size={17} color={colors.error} />
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.storicoMeta}>{descriviComunicazione(c)}</Text>
            {c.testo ? (
              <Text style={styles.storicoTesto} numberOfLines={3}>{c.testo}</Text>
            ) : null}
            {c.allegato && (
              <TouchableOpacity
                style={styles.storicoAllegato}
                onPress={() => Linking.openURL(c.allegato!.url).catch(() => {})}
              >
                <Ionicons name={ICONE_ALLEGATO[c.allegato.tipo] as never} size={15} color={colors.accent} />
                <Text style={styles.storicoAllegatoTxt} numberOfLines={1}>
                  {c.allegato.nome}
                  {c.allegato.peso ? ` · ${pesoLeggibile(c.allegato.peso)}` : ''}
                </Text>
              </TouchableOpacity>
            )}
            <Text style={styles.storicoQuanti}>
              {c.prova
                ? 'Prova: arrivata solo a te'
                : `Mandata a ${c.quanti} ${c.quanti === 1 ? 'allievo' : 'allievi'}`}
            </Text>
          </View>
        ))
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  headerTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },
  headerSub: { fontSize: fontSize.sm, color: colors.textSecondary },
  card: {
    marginHorizontal: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  tipoRiga: { flexDirection: 'row', gap: spacing.xs },
  tipoChip: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  tipoTxt: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textSecondary },
  tipoTxtAttivo: { color: colors.textOnAccent },
  input: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? spacing.md : spacing.sm,
    fontSize: fontSize.md,
    color: colors.text,
  },
  inputLungo: { minHeight: 110, textAlignVertical: 'top' },
  contatore: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    alignSelf: 'flex-end',
    marginTop: 2,
  },
  allegatoAzioni: { flexDirection: 'row', gap: spacing.sm },
  allegatoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
  },
  allegatoBtnTxt: { fontSize: fontSize.sm, color: colors.accent, fontWeight: '600' },
  allegatoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.background,
  },
  allegatoNome: { fontSize: fontSize.sm, color: colors.text, fontWeight: '600' },
  allegatoMeta: { fontSize: fontSize.xs, color: colors.textSecondary },
  problemi: {
    marginTop: spacing.md,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  problemaTxt: { fontSize: fontSize.xs, color: colors.textSecondary, lineHeight: 18 },
  provaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  provaTxt: { fontSize: fontSize.sm, fontWeight: '600', color: colors.accent },
  provaTag: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.warning,
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  inviaBtn: { marginTop: spacing.sm },
  sezione: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xl,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  sezioneTitolo: { flex: 1, fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  sezioneNum: { fontSize: fontSize.sm, color: colors.textSecondary },
  vuoto: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: spacing.lg,
  },
  storicoCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  storicoTesta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  pallino: { width: 8, height: 8, borderRadius: 4 },
  storicoTitolo: { flex: 1, fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  storicoMeta: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  storicoTesto: { fontSize: fontSize.sm, color: colors.text, marginTop: spacing.xs, lineHeight: 19 },
  storicoAllegato: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  storicoAllegatoTxt: { flex: 1, fontSize: fontSize.xs, color: colors.accent },
  storicoQuanti: { fontSize: fontSize.xs, color: colors.textLight, marginTop: spacing.xs },
});
