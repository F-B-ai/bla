import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius } from '../../config/theme';
import { crossAlert } from '../../utils/alert';
import { getStudents } from '../../services/authService';
import { Student } from '../../types';
import { StudentSearchPicker } from '../../components/common/StudentSearchPicker';
import { leggiProgressione, LetturaProgressione } from '../../services/progressioneService';
import {
  ASSI, CICLO, Asse, AsseId, Confronto, CapacitaLetta, Obiettivo, asse,
} from '../../domain/progressione';

// ============================================================
// GERARCHIA DELLA PROGRESSIONE
// ------------------------------------------------------------
// La domanda non è «quanto peso aggiungo». È: che cosa, di tutta
// la domanda imposta al sistema, ha senso aumentare adesso —
// e le formule rispondono con i numeri delle sedute vere.
// Ciò che l'app non misura resta dichiarato come tale: lo vedi tu.
// ============================================================

const OBIETTIVI: Array<{ id: Obiettivo; nome: string }> = [
  { id: 'ipertrofia', nome: 'Ipertrofia' },
  { id: 'forza', nome: 'Forza' },
  { id: 'ricomposizione', nome: 'Ricomposizione' },
  { id: 'salute', nome: 'Salute e qualità' },
];

const ICONA_LIVELLO: Record<string, string> = {
  esposizione: 'enter-outline',
  domanda: 'barbell-outline',
  adattamento: 'sync-outline',
  capacita: 'trophy-outline',
  progressione: 'trending-up-outline',
};

const coloreFonte = (a: Asse) =>
  a.fonte === 'dati' ? colors.accent : a.fonte === 'mista' ? colors.info : colors.textLight;

const etichettaFonte = (a: Asse) =>
  a.fonte === 'dati' ? 'lo misura l\'app' : a.fonte === 'mista' ? 'in parte misurato' : 'lo vedi tu';

const frecciaDi = (v?: string) => {
  switch (v) {
    case 'su': return { icona: 'arrow-up', colore: colors.success };
    case 'giu': return { icona: 'arrow-down', colore: colors.warning };
    case 'stabile': return { icona: 'remove', colore: colors.textSecondary };
    default: return { icona: 'ellipse-outline', colore: colors.textLight };
  }
};

export function ProgressioneScreen() {
  const [students, setStudents] = useState<Student[]>([]);
  const [studentId, setStudentId] = useState<string | undefined>();
  const [esercizio, setEsercizio] = useState<string | undefined>();
  const [obiettivo, setObiettivo] = useState<Obiettivo>('ipertrofia');
  const [lettura, setLettura] = useState<LetturaProgressione | null>(null);
  const [loading, setLoading] = useState(false);
  const [caricaAllievi, setCaricaAllievi] = useState(true);
  const [apriCatalogo, setApriCatalogo] = useState(false);

  useEffect(() => {
    getStudents().then(setStudents)
      .catch(() => crossAlert('Errore', 'Non riesco a caricare gli allievi'))
      .finally(() => setCaricaAllievi(false));
  }, []);

  const leggi = useCallback(async (
    id: string, ex: string | undefined, ob: Obiettivo
  ) => {
    setLoading(true);
    try {
      setLettura(await leggiProgressione(id, { esercizio: ex, obiettivo: ob }));
    } catch {
      crossAlert('Errore', 'Non riesco a leggere lo storico delle sedute');
      setLettura(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const scegliAllievo = (id: string) => {
    setStudentId(id);
    setEsercizio(undefined);
    leggi(id, undefined, obiettivo);
  };

  const scegliEsercizio = (nome?: string) => {
    setEsercizio(nome);
    if (studentId) leggi(studentId, nome, obiettivo);
  };

  const scegliObiettivo = (ob: Obiettivo) => {
    setObiettivo(ob);
    if (studentId) leggi(studentId, esercizio, ob);
  };

  if (caricaAllievi) {
    return <View style={s.center}><ActivityIndicator size="large" color={colors.accent} /></View>;
  }

  const passo = lettura?.passo;
  const asseDelPasso = passo ? asse(passo.asse) : null;

  return (
    <ScrollView style={s.wrap} contentContainerStyle={{ padding: spacing.md, paddingBottom: 60 }}>
      <Text style={s.intro}>
        La parola più potente non è sovraccarico: è <Text style={s.introForte}>domanda progressiva</Text>.
        Il carico è solo uno degli undici modi di aumentarla — ed è quello che costa di più.
      </Text>

      {/* il ciclo */}
      <View style={s.ciclo}>
        {CICLO.map((c, i) => (
          <View key={c.id} style={s.cicloVoce}>
            <Ionicons name={ICONA_LIVELLO[c.id] as any} size={15} color={colors.accent} />
            <Text style={s.cicloTitolo}>{c.titolo}</Text>
            {i < CICLO.length - 1 && (
              <Ionicons name="chevron-forward" size={12} color={colors.textLight} />
            )}
          </View>
        ))}
      </View>

      <StudentSearchPicker
        students={students}
        selectedId={studentId}
        onSelect={scegliAllievo}
        label="Allievo" placeholder="Cerca allievo…"
      />

      {studentId && (
        <View style={s.chips}>
          {OBIETTIVI.map((o) => (
            <TouchableOpacity
              key={o.id}
              style={[s.chip, obiettivo === o.id && s.chipAttivo]}
              onPress={() => scegliObiettivo(o.id)}
              activeOpacity={0.85}
            >
              <Text style={[s.chipTxt, obiettivo === o.id && s.chipTxtAttivo]}>{o.nome}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {loading && (
        <View style={{ paddingVertical: spacing.xl }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      )}

      {!loading && lettura && lettura.sessioni.length === 0 && (
        <View style={s.card}>
          <Text style={s.cardTitle}>Nessuna seduta registrata</Text>
          <Text style={s.muted}>
            Il motore lavora sulle sedute completate nell'app. Finché non ce ne sono,
            qualunque aumento sarebbe un'ipotesi — e questa app non tira a indovinare.
          </Text>
        </View>
      )}

      {!loading && lettura && lettura.sessioni.length > 0 && (
        <>
          {/* esercizio a fuoco */}
          {lettura.esercizi.length > 0 && (
            <>
              <Text style={s.lab}>Su che cosa ragioniamo</Text>
              <View style={s.chips}>
                <TouchableOpacity
                  style={[s.chip, !esercizio && s.chipAttivo]}
                  onPress={() => scegliEsercizio(undefined)}
                  activeOpacity={0.85}
                >
                  <Text style={[s.chipTxt, !esercizio && s.chipTxtAttivo]}>Tutta la seduta</Text>
                </TouchableOpacity>
                {lettura.esercizi.slice(0, 10).map((e) => (
                  <TouchableOpacity
                    key={e}
                    style={[s.chip, esercizio === e && s.chipAttivo]}
                    onPress={() => scegliEsercizio(e)}
                    activeOpacity={0.85}
                  >
                    <Text style={[s.chipTxt, esercizio === e && s.chipTxtAttivo]}>{e}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* il passo */}
          {passo && asseDelPasso && (
            <View style={[s.card, s.cardPasso]}>
              <View style={s.passoTop}>
                <Ionicons
                  name={ICONA_LIVELLO[asseDelPasso.livello] as any}
                  size={18} color={colors.accent}
                />
                <Text style={s.passoAsse}>{asseDelPasso.nome}</Text>
              </View>
              <Text style={s.passoTitolo}>{passo.titolo}</Text>
              <Text style={s.passoAzione}>{passo.azione}</Text>

              <Text style={s.sezione}>Perché</Text>
              <Text style={s.corpo}>{passo.perche}</Text>

              <Text style={s.sezione}>Che cosa guardare la prossima volta</Text>
              <Text style={s.corpo}>{passo.osserva}</Text>

              <Text style={s.sezione}>Su che cosa si basa</Text>
              {passo.prove.map((p, i) => (
                <View key={i} style={s.prova}>
                  <Ionicons name="ellipse" size={5} color={colors.textLight} style={{ marginTop: 7 }} />
                  <Text style={s.corpo}>{p}</Text>
                </View>
              ))}

              {passo.richiedeOcchio && (
                <View style={s.occhio}>
                  <Ionicons name="eye-outline" size={15} color={colors.info} />
                  <Text style={s.occhioTxt}>
                    Questo asse l'app non lo misura: la scelta finale è tua. Il motore propone, non decide.
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* che cosa si è mosso */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Che cosa si è mosso</Text>
            <Text style={s.muted}>Ultime tre sedute contro le tre precedenti.</Text>
            {lettura.confronti.map((c: Confronto) => {
              const f = frecciaDi(c.verso);
              return (
                <View key={c.asse} style={s.riga}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.rigaNome}>{c.etichetta}</Text>
                    <Text style={s.rigaNota}>
                      {c.verso === 'non_misurato'
                        ? 'non misurato'
                        : `${c.prima} → ${c.dopo} ${c.unita}`}
                    </Text>
                  </View>
                  {c.deltaPct !== null && c.verso !== 'non_misurato' && (
                    <Text style={[s.delta, { color: f.colore }]}>
                      {c.deltaPct > 0 ? '+' : ''}{c.deltaPct}%
                    </Text>
                  )}
                  <Ionicons name={f.icona as any} size={16} color={f.colore} />
                </View>
              );
            })}
          </View>

          {/* le capacità */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Che cosa è capace di fare oggi</Text>
            {lettura.capacita.map((c: CapacitaLetta) => {
              const f = frecciaDi(c.verso);
              const misurata = c.stato === 'misurata';
              return (
                <View key={c.id} style={s.riga}>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.rigaNome, !misurata && { color: colors.textLight }]}>{c.nome}</Text>
                    <Text style={s.rigaNota}>{c.nota}</Text>
                  </View>
                  {misurata && c.valore !== undefined && (
                    <Text style={s.valore}>{c.valore} {c.unita || ''}</Text>
                  )}
                  {misurata && c.verso && (
                    <Ionicons name={f.icona as any} size={16} color={f.colore} />
                  )}
                </View>
              );
            })}
          </View>
        </>
      )}

      {/* il catalogo degli undici assi */}
      <TouchableOpacity
        style={s.catalogoBtn}
        onPress={() => setApriCatalogo((v) => !v)}
        activeOpacity={0.85}
      >
        <Ionicons name="list-outline" size={18} color={colors.accent} />
        <Text style={s.catalogoTxt}>Gli undici assi della progressione</Text>
        <Ionicons
          name={apriCatalogo ? 'chevron-up' : 'chevron-down'}
          size={18} color={colors.textSecondary}
        />
      </TouchableOpacity>

      {apriCatalogo && ASSI.map((a: Asse) => (
        <View key={a.id} style={[s.card, { marginTop: spacing.sm }]}>
          <View style={s.passoTop}>
            <Text style={s.asseNome}>{a.nome}</Text>
            <View style={[s.tag, { borderColor: coloreFonte(a) }]}>
              <Text style={[s.tagTxt, { color: coloreFonte(a) }]}>{etichettaFonte(a)}</Text>
            </View>
          </View>
          <Text style={s.asseEn}>{a.nomeEn} · aumenta {a.cosaAumenta}</Text>
          <Text style={s.corpo}>{a.comeSiVede}</Text>
          <Text style={s.esempio}>{a.esempio}</Text>
        </View>
      ))}

      <Text style={s.chiusura}>
        Il progresso non è soltanto aumentare lo stimolo: è aumentare la capacità
        di tollerarlo e di produrlo.
      </Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  intro: { color: colors.textSecondary, fontSize: fontSize.sm, lineHeight: 20, marginBottom: spacing.md },
  introForte: { color: colors.text, fontWeight: '700' },
  ciclo: {
    flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6,
    backgroundColor: colors.surface, borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.sm, marginBottom: spacing.md,
  },
  cicloVoce: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cicloTitolo: { color: colors.text, fontSize: fontSize.xs, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  chip: {
    paddingHorizontal: 11, paddingVertical: 7, borderRadius: borderRadius.round,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
  },
  chipAttivo: { borderColor: colors.accent, backgroundColor: colors.surfaceLight },
  chipTxt: { color: colors.textSecondary, fontSize: fontSize.xs, fontWeight: '600' },
  chipTxtAttivo: { color: colors.accent },
  card: {
    backgroundColor: colors.surface, borderRadius: borderRadius.md, borderWidth: 1,
    borderColor: colors.border, padding: spacing.md, marginTop: spacing.md,
  },
  cardPasso: { borderColor: colors.accent },
  cardTitle: { color: colors.text, fontSize: fontSize.md, fontWeight: '700', marginBottom: spacing.xs },
  muted: { color: colors.textSecondary, fontSize: fontSize.sm, lineHeight: 20 },
  lab: { color: colors.textSecondary, fontSize: fontSize.xs, marginTop: spacing.md },
  passoTop: { flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap' },
  passoAsse: {
    color: colors.accent, fontSize: fontSize.xs, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.6,
  },
  passoTitolo: {
    color: colors.text, fontSize: fontSize.xl, fontWeight: '700',
    marginTop: spacing.xs, marginBottom: spacing.xs,
  },
  passoAzione: { color: colors.text, fontSize: fontSize.md, lineHeight: 21 },
  sezione: {
    color: colors.textSecondary, fontSize: fontSize.xs, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.5, marginTop: spacing.md, marginBottom: 3,
  },
  corpo: { color: colors.textSecondary, fontSize: fontSize.sm, lineHeight: 20, flex: 1 },
  prova: { flexDirection: 'row', gap: 7, marginTop: 3 },
  occhio: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    backgroundColor: colors.surfaceLight, borderRadius: borderRadius.sm,
    padding: spacing.sm, marginTop: spacing.md,
  },
  occhioTxt: { color: colors.info, fontSize: fontSize.xs, lineHeight: 17, flex: 1 },
  riga: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.divider,
  },
  rigaNome: { color: colors.text, fontSize: fontSize.sm, fontWeight: '600' },
  rigaNota: { color: colors.textLight, fontSize: fontSize.xs, marginTop: 2, lineHeight: 15 },
  delta: { fontSize: fontSize.sm, fontWeight: '700' },
  valore: { color: colors.text, fontSize: fontSize.sm, fontWeight: '700' },
  catalogoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.surface, borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, marginTop: spacing.lg,
  },
  catalogoTxt: { color: colors.text, fontSize: fontSize.md, fontWeight: '700', flex: 1 },
  asseNome: { color: colors.text, fontSize: fontSize.md, fontWeight: '700', flex: 1 },
  asseEn: { color: colors.textLight, fontSize: fontSize.xs, marginTop: 2, marginBottom: spacing.xs },
  esempio: {
    color: colors.textLight, fontSize: fontSize.xs, lineHeight: 17,
    marginTop: spacing.xs, fontStyle: 'italic',
  },
  tag: { borderWidth: 1, borderRadius: borderRadius.round, paddingHorizontal: 8, paddingVertical: 2 },
  tagTxt: { fontSize: fontSize.xs, fontWeight: '700' },
  chiusura: {
    color: colors.textLight, fontSize: fontSize.xs, textAlign: 'center',
    lineHeight: 17, marginTop: spacing.lg,
  },
});

export default ProgressioneScreen;
