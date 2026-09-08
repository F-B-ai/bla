import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius } from '../../config/theme';
import { useAuth } from '../../hooks/useAuth';
import { crossAlert } from '../../utils/alert';
import { getStudents } from '../../services/authService';
import { Student } from '../../types';
import { StudentSearchPicker } from '../../components/common/StudentSearchPicker';
import {
  SEZIONI, CHECKLIST, INTRO_SCHEDA, Campo,
} from '../../data/onboardingForm';
import { valutaOnboarding, Risposte } from '../../domain/onboarding';
import { saveOnboarding, getOnboarding } from '../../services/onboardingService';

// ============================================================
// SCHEDA ONBOARDING — si compila DURANTE il colloquio
// Il primo atto del percorso: da qui nasce il gemello.
// Le controindicazioni si portano in evidenza da sole, prima
// che venga consegnato un programma.
// ============================================================

export function OnboardingScreen() {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [student, setStudent] = useState<Student | null>(null);
  const [risposte, setRisposte] = useState<Risposte>({});
  const [checklist, setChecklist] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [aperta, setAperta] = useState<string | null>('anagrafica');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [giaFatta, setGiaFatta] = useState<Date | null>(null);

  useEffect(() => {
    getStudents().then(setStudents)
      .catch(() => crossAlert('Errore', 'Non riesco a caricare gli allievi'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!student) { setGiaFatta(null); return; }
    getOnboarding(student.id).then((s) => {
      if (!s) { setGiaFatta(null); return; }
      setGiaFatta(s.date);
      setRisposte(s.risposte);
      setChecklist(s.checklist);
      setNote(s.noteCoach || '');
    });
  }, [student]);

  const esito = useMemo(() => valutaOnboarding(risposte), [risposte]);

  const set = (id: string, v: Risposte[string]) =>
    setRisposte((p) => ({ ...p, [id]: v }));

  const toggleMulti = (id: string, opt: string) =>
    setRisposte((p) => {
      const cur = Array.isArray(p[id]) ? (p[id] as string[]) : [];
      return { ...p, [id]: cur.includes(opt) ? cur.filter((x) => x !== opt) : [...cur, opt] };
    });

  const salva = async () => {
    if (!student || !user) { crossAlert('Errore', 'Seleziona un allievo'); return; }
    if (esito.compilati === 0) { crossAlert('Errore', 'Compila almeno un campo'); return; }
    setSaving(true);
    try {
      await saveOnboarding({
        studentId: student.id,
        studentName: `${student.name} ${student.surname}`,
        coachId: user.id,
        risposte, checklist, noteCoach: note || undefined,
      });
      crossAlert('Scheda salvata', 'Il percorso è aperto: da adesso il gemello ha un inizio.');
    } catch {
      crossAlert('Errore', 'Salvataggio non riuscito');
    } finally { setSaving(false); }
  };

  const renderCampo = (c: Campo) => {
    const v = risposte[c.id];
    switch (c.tipo) {
      case 'multi':
        return (
          <View style={s.opts}>
            {(c.opzioni || []).map((o) => {
              const on = Array.isArray(v) && v.includes(o);
              return (
                <TouchableOpacity key={o} style={[s.opt, on && s.optOn]}
                  onPress={() => toggleMulti(c.id, o)} activeOpacity={0.75}>
                  <Ionicons name={on ? 'checkbox' : 'square-outline'} size={17}
                    color={on ? colors.accent : colors.textSecondary} />
                  <Text style={[s.optTxt, on && s.optTxtOn]}>{o}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        );
      case 'scelta':
        return (
          <View style={s.opts}>
            {(c.opzioni || []).map((o) => {
              const on = v === o;
              return (
                <TouchableOpacity key={o} style={[s.opt, on && s.optOn]}
                  onPress={() => set(c.id, on ? undefined : o)} activeOpacity={0.75}>
                  <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={17}
                    color={on ? colors.accent : colors.textSecondary} />
                  <Text style={[s.optTxt, on && s.optTxtOn]}>{o}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        );
      case 'scala10':
        return (
          <View style={s.scala}>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
              const on = v === n;
              return (
                <TouchableOpacity key={n} style={[s.pallino, on && s.pallinoOn]}
                  onPress={() => set(c.id, on ? undefined : n)}>
                  <Text style={[s.pallinoTxt, on && s.pallinoTxtOn]}>{n}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        );
      case 'lungo':
        return (
          <TextInput style={[s.input, s.lungo]} multiline
            placeholder="…" placeholderTextColor={colors.textLight}
            value={typeof v === 'string' ? v : ''}
            onChangeText={(t) => set(c.id, t)} />
        );
      default:
        return (
          <TextInput style={s.input}
            keyboardType={c.tipo === 'numero' ? 'numeric' : 'default'}
            placeholder={c.unita || '…'} placeholderTextColor={colors.textLight}
            value={v === undefined ? '' : String(v)}
            onChangeText={(t) => set(c.id, c.tipo === 'numero'
              ? (t === '' ? undefined : parseFloat(t.replace(',', '.')))
              : t)} />
        );
    }
  };

  if (loading) {
    return <View style={s.center}><ActivityIndicator size="large" color={colors.accent} /></View>;
  }

  return (
    <ScrollView style={s.wrap} contentContainerStyle={{ padding: spacing.md, paddingBottom: 60 }}>
      <StudentSearchPicker
        students={students}
        selectedId={student?.id}
        onSelect={(id) => setStudent(students.find((x) => x.id === id) || null)}
        label="Allievo" placeholder="Cerca allievo…"
      />

      {student && (
        <>
          {giaFatta && (
            <View style={[s.card, { borderColor: colors.info }]}>
              <Text style={[s.cardTitle, { color: colors.info }]}>Scheda già compilata</Text>
              <Text style={s.muted}>
                Del {giaFatta.toLocaleDateString('it-IT')}. Le modifiche creano una nuova versione:
                la precedente resta.
              </Text>
            </View>
          )}

          <View style={s.card}>
            <Text style={s.intro}>{INTRO_SCHEDA}</Text>
            <View style={s.barBg}>
              <View style={[s.bar, { width: `${(esito.compilati / esito.totali) * 100}%` }]} />
            </View>
            <Text style={s.muted}>{esito.compilati} campi su {esito.totali}</Text>
          </View>

          {/* ——— CIÒ CHE IL COACH DEVE VEDERE PRIMA ——— */}
          {esito.attenzioni.length > 0 && (
            <View style={[s.card, { borderColor: colors.warning, backgroundColor: colors.warning + '10' }]}>
              <Text style={[s.cardTitle, { color: colors.warning }]}>
                Da leggere prima di consegnare un programma
              </Text>
              {esito.attenzioni.map((a) => (
                <View key={a.campo} style={{ marginTop: spacing.xs }}>
                  <Text style={s.attTitolo}>{a.etichetta}</Text>
                  <Text style={s.muted}>{a.motivo}</Text>
                </View>
              ))}
            </View>
          )}

          {/* ——— LE SETTE SEZIONI ——— */}
          {SEZIONI.map((sez) => {
            const open = aperta === sez.id;
            const mancanti = sez.campi.filter((c) =>
              risposte[c.id] === undefined || risposte[c.id] === '' ||
              (Array.isArray(risposte[c.id]) && (risposte[c.id] as string[]).length === 0)).length;
            return (
              <View key={sez.id} style={s.card}>
                <TouchableOpacity style={s.sezHead}
                  onPress={() => setAperta(open ? null : sez.id)} activeOpacity={0.7}>
                  <Text style={s.sezNum}>{sez.numero}</Text>
                  <Text style={s.sezTitolo}>{sez.titolo}</Text>
                  {mancanti === 0
                    ? <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                    : <Text style={s.mancanti}>{mancanti}</Text>}
                  <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textSecondary} />
                </TouchableOpacity>
                {open && (
                  <View style={{ marginTop: spacing.sm }}>
                    {!!sez.intro && <Text style={s.muted}>{sez.intro}</Text>}
                    {sez.campi.map((c) => (
                      <View key={c.id} style={s.campo}>
                        <Text style={[s.label, c.sensibile && { color: colors.warning }]}>
                          {c.etichetta}{c.unita ? ` (${c.unita})` : ''}
                        </Text>
                        {!!c.aiuto && <Text style={s.aiuto}>{c.aiuto}</Text>}
                        {renderCampo(c)}
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })}

          {/* ——— CHECKLIST OPERATIVA ——— */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Checklist operativa</Text>
            <Text style={s.muted}>Da completare entro il primo colloquio.</Text>
            {[1, 2, 3, 4].map((step) => {
              const passi = CHECKLIST.filter((p) => p.step === step);
              return (
                <View key={step} style={{ marginTop: spacing.sm }}>
                  <Text style={s.stepTitolo}>STEP {step} · {passi[0].gruppo}</Text>
                  {passi.map((p) => {
                    const on = checklist.includes(p.id);
                    return (
                      <TouchableOpacity key={p.id} style={s.check}
                        onPress={() => setChecklist((c) =>
                          on ? c.filter((x) => x !== p.id) : [...c, p.id])}
                        activeOpacity={0.75}>
                        <Ionicons name={on ? 'checkbox' : 'square-outline'} size={19}
                          color={on ? colors.success : colors.textSecondary} />
                        <Text style={[s.checkTxt, on && { color: colors.textSecondary }]}>{p.voce}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              );
            })}
          </View>

          <View style={s.card}>
            <Text style={s.cardTitle}>Note del coach</Text>
            <TextInput style={[s.input, s.lungo]} multiline
              placeholder="Quello che hai visto e sentito, e che nessun campo raccoglie"
              placeholderTextColor={colors.textLight}
              value={note} onChangeText={setNote} />
          </View>

          <TouchableOpacity style={[s.btn, saving && { opacity: 0.6 }]}
            onPress={salva} disabled={saving} activeOpacity={0.85}>
            {saving ? <ActivityIndicator color={colors.textOnAccent} />
              : <Text style={s.btnTxt}>Apri il percorso</Text>}
          </TouchableOpacity>

          <Text style={s.disclaimer}>
            La scheda contiene dati di salute: resta in questa istanza, visibile allo staff e
            all'interessato. Sul gemello va solo la sintesi — mai anagrafica, mai dettaglio clinico.
          </Text>
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  card: {
    backgroundColor: colors.surface, borderRadius: borderRadius.md, borderWidth: 1,
    borderColor: colors.border, padding: spacing.md, marginTop: spacing.md,
  },
  cardTitle: { color: colors.text, fontSize: fontSize.md, fontWeight: '700', marginBottom: 2 },
  muted: { color: colors.textSecondary, fontSize: fontSize.sm, lineHeight: 19 },
  intro: { color: colors.textSecondary, fontSize: fontSize.sm, lineHeight: 20, marginBottom: spacing.sm },
  barBg: { height: 6, backgroundColor: colors.surfaceLight, borderRadius: 3, overflow: 'hidden' },
  bar: { height: 6, backgroundColor: colors.accent, borderRadius: 3 },

  sezHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sezNum: {
    color: colors.accent, fontSize: fontSize.sm, fontWeight: '800',
    minWidth: 18,
  },
  sezTitolo: { color: colors.text, fontSize: fontSize.sm, fontWeight: '700', flex: 1 },
  mancanti: {
    color: colors.textSecondary, fontSize: fontSize.xs, borderWidth: 1,
    borderColor: colors.border, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 1,
    overflow: 'hidden',
  },

  campo: { marginTop: spacing.md },
  label: { color: colors.text, fontSize: fontSize.sm, fontWeight: '600', marginBottom: 4 },
  aiuto: { color: colors.textLight, fontSize: fontSize.xs, marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.sm,
    color: colors.text, paddingHorizontal: 11, paddingVertical: 9,
    backgroundColor: colors.surfaceLight, fontSize: fontSize.sm,
  },
  lungo: { minHeight: 74, textAlignVertical: 'top' },
  opts: { gap: 6 },
  opt: {
    flexDirection: 'row', alignItems: 'center', gap: 9,
    borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.sm,
    paddingVertical: 9, paddingHorizontal: 11, backgroundColor: colors.surfaceLight,
  },
  optOn: { borderColor: colors.accent, backgroundColor: colors.accent + '14' },
  optTxt: { color: colors.textSecondary, fontSize: fontSize.sm, flex: 1 },
  optTxtOn: { color: colors.text, fontWeight: '600' },
  scala: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
  pallino: {
    width: 32, height: 36, borderRadius: borderRadius.sm, borderWidth: 1,
    borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surfaceLight,
  },
  pallinoOn: { borderColor: colors.accent, backgroundColor: colors.accent },
  pallinoTxt: { color: colors.textSecondary, fontSize: fontSize.sm },
  pallinoTxtOn: { color: colors.textOnAccent, fontWeight: '700' },

  attTitolo: { color: colors.text, fontSize: fontSize.sm, fontWeight: '700' },
  stepTitolo: {
    color: colors.accent, fontSize: 10, letterSpacing: 1.6, fontWeight: '700',
    marginBottom: 4,
  },
  check: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 7 },
  checkTxt: { color: colors.text, fontSize: fontSize.sm, flex: 1 },

  btn: {
    backgroundColor: colors.accent, borderRadius: borderRadius.md,
    paddingVertical: 14, alignItems: 'center', marginTop: spacing.md,
  },
  btnTxt: { color: colors.textOnAccent, fontWeight: '700', fontSize: fontSize.md },
  disclaimer: {
    color: colors.textLight, fontSize: fontSize.xs, textAlign: 'center',
    lineHeight: 16, marginTop: spacing.md,
  },
});

export default OnboardingScreen;
