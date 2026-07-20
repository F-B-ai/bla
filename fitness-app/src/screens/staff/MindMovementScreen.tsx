import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius } from '../../config/theme';
import { useAuth } from '../../hooks/useAuth';
import { crossAlert } from '../../utils/alert';
import { getStudents } from '../../services/authService';
import { Student } from '../../types';
import {
  MM_DOMAINS,
  MM_TESTS,
  MMTest,
  LEFTRIGHT_OPTIONS,
} from '../../data/mindMovementProtocol';
import { MMResult, computeMMScores } from '../../domain/mindMovement';
import {
  generateSynthesis,
  saveMMAssessment,
  getStudentMMAssessments,
  MMAssessment,
} from '../../services/mindMovementService';

// ============================================================
// PROTOCOLLO MIND MOVEMENT™ — somministrazione (staff)
// Il metodo proprietario del founder, guidato test per test.
// La sintesi AI incrocia gli esiti coi dati oggettivi del twin.
// ============================================================

export default function MindMovementScreen() {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [student, setStudent] = useState<Student | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [search, setSearch] = useState('');
  const [values, setValues] = useState<Record<string, number>>({});
  const [openTest, setOpenTest] = useState<string | null>(null);
  const [phase, setPhase] = useState<'compile' | 'results'>('compile');
  const [synthesis, setSynthesis] = useState('');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previous, setPrevious] = useState<MMAssessment | null>(null);

  useEffect(() => {
    getStudents().then(setStudents).catch(() => {});
  }, []);

  useEffect(() => {
    if (student) {
      getStudentMMAssessments(student.id)
        .then((list) => setPrevious(list[0] || null))
        .catch(() => setPrevious(null));
    } else {
      setPrevious(null);
    }
  }, [student]);

  const results: MMResult[] = Object.entries(values).map(([testId, value]) => ({ testId, value }));
  const scores = computeMMScores(results);

  const handleGenerate = async () => {
    if (!student) return;
    if (results.length < 4) {
      crossAlert('Batteria incompleta', 'Compila almeno 4 test per generare il quadro.');
      return;
    }
    setGenerating(true);
    try {
      const text = await generateSynthesis(
        student.id,
        `${student.name} ${(student as any).surname || ''}`.trim(),
        results,
        scores
      );
      setSynthesis(text);
      setPhase('results');
    } catch {
      setSynthesis('');
      setPhase('results');
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!student || !user) return;
    setSaving(true);
    try {
      await saveMMAssessment({
        studentId: student.id,
        assessorId: user.id,
        results,
        scores,
        aiSynthesis: synthesis,
      });
      crossAlert('Salvata', "La valutazione è nella storia dell'allievo.");
      setValues({});
      setSynthesis('');
      setPhase('compile');
      getStudentMMAssessments(student.id).then((l) => setPrevious(l[0] || null)).catch(() => {});
    } catch {
      crossAlert('Errore', 'Salvataggio non riuscito. Riprova.');
    } finally {
      setSaving(false);
    }
  };

  const renderInput = (t: MMTest) => {
    const v = values[t.id];
    const setV = (x: number) => setValues((prev) => ({ ...prev, [t.id]: x }));
    if (t.input === 'score5') {
      return (
        <View style={styles.optRow}>
          {[1, 2, 3, 4, 5].map((n) => (
            <TouchableOpacity
              key={n}
              style={[styles.scoreBtn, v === n && styles.scoreBtnActive]}
              onPress={() => setV(n)}
            >
              <Text style={[styles.scoreBtnText, v === n && styles.scoreBtnTextActive]}>{n}</Text>
            </TouchableOpacity>
          ))}
        </View>
      );
    }
    if (t.input === 'seconds') {
      return (
        <View style={styles.secondsRow}>
          <TextInput
            style={styles.secondsInput}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={colors.textSecondary}
            value={v !== undefined ? String(v) : ''}
            onChangeText={(x) => {
              const n = parseInt(x, 10);
              if (!isNaN(n)) setV(n);
              else setValues((prev) => { const p = { ...prev }; delete p[t.id]; return p; });
            }}
          />
          <Text style={styles.secondsLabel}>secondi{t.sogliaSecondi ? ` · soglia ${t.sogliaSecondi}s` : ''}</Text>
        </View>
      );
    }
    const options = t.input === 'choice' ? (t.opzioni || []) : [...LEFTRIGHT_OPTIONS];
    return (
      <View style={{ gap: 6 }}>
        {options.map((opt, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.choiceBtn, v === i && styles.choiceBtnActive]}
            onPress={() => setV(i)}
          >
            <Text style={[styles.choiceText, v === i && styles.choiceTextActive]}>{opt}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const prevScore = (key: string): number | null => {
    const d = previous?.scores?.domains?.find((x: any) => x.key === key);
    return d && d.score !== null && d.score !== undefined ? d.score : null;
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerCard}>
        <Text style={styles.protocolName}>Protocollo di Valutazione{'\n'}Neuro-Recettoriale Integrata</Text>
        <Text style={styles.tm}>MIND MOVEMENT™</Text>
        <Text style={styles.subtle}>
          La postura come output del cervello: 4 domini, {MM_TESTS.length} test, un quadro integrato
          coi dati dell'app. Valutazione funzionale — non clinica.
        </Text>
      </View>

      {/* Allievo */}
      <TouchableOpacity style={styles.selector} onPress={() => setShowPicker(!showPicker)}>
        <Ionicons name="person-outline" size={18} color={colors.accent} />
        <Text style={styles.selectorText}>
          {student ? `${student.name} ${(student as any).surname || ''}` : 'Scegli allievo…'}
        </Text>
        <Ionicons name={showPicker ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textSecondary} />
      </TouchableOpacity>
      {showPicker && (
        <View style={styles.pickerList}>
          <TextInput
            style={styles.pickerSearch}
            placeholder="Cerca allievo…"
            placeholderTextColor={colors.textSecondary}
            value={search}
            onChangeText={setSearch}
          />
          <ScrollView style={{ maxHeight: 260 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
            {students
              .filter((s) => `${s.name} ${(s as any).surname || ''}`.toLowerCase().includes(search.trim().toLowerCase()))
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((s) => (
                <TouchableOpacity
                  key={s.id}
                  style={styles.pickerRow}
                  onPress={() => { setStudent(s); setShowPicker(false); setSearch(''); }}
                >
                  <Text style={styles.pickerRowText}>{s.name} {(s as any).surname || ''}</Text>
                </TouchableOpacity>
              ))}
          </ScrollView>
        </View>
      )}

      {previous && phase === 'compile' && (
        <Text style={styles.prevNote}>
          Ultima valutazione: {previous.date.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}
          {previous.scores?.overall !== null ? ` · quadro ${previous.scores.overall}/100` : ''} — i confronti appariranno nel nuovo quadro
        </Text>
      )}

      {student && phase === 'compile' && (
        <>
          {MM_DOMAINS.map((d) => {
            const tests = MM_TESTS.filter((t) => t.dominio === d.key);
            const done = tests.filter((t) => values[t.id] !== undefined).length;
            return (
              <View key={d.key}>
                <View style={styles.domainHeader}>
                  <Text style={styles.domainTitle}>{d.emoji} {d.nome}</Text>
                  <Text style={styles.domainCount}>{done}/{tests.length}</Text>
                </View>
                <Text style={styles.domainDesc}>{d.descrizione}</Text>
                {tests.map((t) => (
                  <View key={t.id} style={[styles.testCard, values[t.id] !== undefined && styles.testCardDone]}>
                    <TouchableOpacity
                      style={styles.testHeader}
                      onPress={() => setOpenTest(openTest === t.id ? null : t.id)}
                    >
                      <Text style={styles.testName}>
                        {values[t.id] !== undefined ? '✓ ' : ''}{t.nome}
                      </Text>
                      <Ionicons
                        name={openTest === t.id ? 'chevron-up' : 'information-circle-outline'}
                        size={18}
                        color={colors.textSecondary}
                      />
                    </TouchableOpacity>
                    {openTest === t.id && (
                      <View style={styles.testInfo}>
                        <Text style={styles.testInfoLabel}>Come si fa</Text>
                        <Text style={styles.testInfoText}>{t.procedura}</Text>
                        <Text style={styles.testInfoLabel}>Cosa osservare</Text>
                        <Text style={styles.testInfoText}>{t.osservare}</Text>
                      </View>
                    )}
                    {renderInput(t)}
                  </View>
                ))}
              </View>
            );
          })}

          <TouchableOpacity
            style={[styles.primaryBtn, (generating || results.length < 4) && { opacity: 0.5 }]}
            disabled={generating || results.length < 4}
            onPress={handleGenerate}
          >
            {generating ? (
              <ActivityIndicator color={colors.textOnPrimary} size="small" />
            ) : (
              <Ionicons name="sparkles-outline" size={18} color={colors.textOnPrimary} />
            )}
            <Text style={styles.primaryBtnText}>
              {generating ? 'Compongo il quadro integrato…' : `Genera il quadro (${results.length}/${MM_TESTS.length} test)`}
            </Text>
          </TouchableOpacity>
        </>
      )}

      {phase === 'results' && (
        <>
          <Text style={styles.sectionTitle}>Il quadro nei 4 domini</Text>
          {scores.domains.map((d) => {
            const prev = prevScore(d.key);
            const delta = d.score !== null && prev !== null ? d.score - prev : null;
            return (
              <View key={d.key} style={styles.domainScoreCard}>
                <View style={styles.domainScoreTop}>
                  <Text style={styles.domainScoreName}>{d.emoji} {d.nome}</Text>
                  <Text style={styles.domainScoreValue}>
                    {d.score === null ? '—' : `${d.score}`}
                    {delta !== null && (
                      <Text style={{ color: delta >= 0 ? colors.success : colors.error, fontSize: fontSize.sm }}>
                        {'  '}{delta >= 0 ? '▲' : '▼'}{Math.abs(delta)}
                      </Text>
                    )}
                  </Text>
                </View>
                {d.score !== null && (
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, {
                      width: `${d.score}%`,
                      backgroundColor: d.score >= 70 ? colors.success : d.score >= 40 ? colors.warning : colors.error,
                    }]} />
                  </View>
                )}
                {d.flags.map((f, i) => (
                  <Text key={i} style={styles.flagText}>⚠ {f.nome}: {f.esito}</Text>
                ))}
                {d.score === null && <Text style={styles.subtle}>Non valutato in questa seduta</Text>}
              </View>
            );
          })}

          <Text style={styles.sectionTitle}>Lettura integrata</Text>
          {synthesis ? (
            <View style={styles.synthesisCard}>
              <Text style={styles.synthesisText}>{synthesis}</Text>
            </View>
          ) : (
            <Text style={styles.subtle}>Sintesi AI non disponibile — i punteggi restano validi.</Text>
          )}

          <Text style={styles.disclaimer}>
            Valutazione funzionale Mind Movement™ — non è una valutazione clinica né una diagnosi.
          </Text>

          <TouchableOpacity style={[styles.primaryBtn, saving && { opacity: 0.5 }]} disabled={saving} onPress={handleSave}>
            <Ionicons name="save-outline" size={18} color={colors.textOnPrimary} />
            <Text style={styles.primaryBtnText}>{saving ? 'Salvo…' : "Salva nella storia dell'allievo"}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => setPhase('compile')}>
            <Text style={styles.secondaryBtnText}>Torna ai test</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  headerCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    padding: spacing.lg, marginBottom: spacing.md,
    borderLeftWidth: 3, borderLeftColor: colors.accent,
  },
  protocolName: { color: colors.text, fontSize: fontSize.lg, fontWeight: '800', lineHeight: 24 },
  tm: { color: colors.accent, fontSize: fontSize.xs, fontWeight: '800', letterSpacing: 2, marginTop: 4 },
  subtle: { color: colors.textSecondary, fontSize: fontSize.sm, marginTop: 6, lineHeight: 19 },
  selector: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.md,
  },
  selectorText: { color: colors.text, fontSize: fontSize.md, flex: 1 },
  pickerList: { backgroundColor: colors.surface, borderRadius: borderRadius.md, marginTop: spacing.xs, overflow: 'hidden' },
  pickerSearch: { color: colors.text, fontSize: fontSize.md, padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.background },
  pickerRow: { padding: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.background },
  pickerRowText: { color: colors.text, fontSize: fontSize.md },
  prevNote: { color: colors.textSecondary, fontSize: fontSize.xs, marginTop: spacing.sm, fontStyle: 'italic' },
  domainHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline',
    marginTop: spacing.lg, marginBottom: 2,
  },
  domainTitle: { color: colors.text, fontSize: fontSize.lg, fontWeight: '800' },
  domainCount: { color: colors.accent, fontSize: fontSize.sm, fontWeight: '700' },
  domainDesc: { color: colors.textSecondary, fontSize: fontSize.sm, marginBottom: spacing.sm },
  testCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.md,
    padding: spacing.md, marginBottom: spacing.sm, gap: spacing.sm,
  },
  testCardDone: { borderLeftWidth: 3, borderLeftColor: colors.success },
  testHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  testName: { color: colors.text, fontSize: fontSize.md, fontWeight: '600', flex: 1 },
  testInfo: { backgroundColor: colors.background, borderRadius: borderRadius.md, padding: spacing.sm },
  testInfoLabel: { color: colors.accent, fontSize: fontSize.xs, fontWeight: '800', textTransform: 'uppercase', marginTop: 4 },
  testInfoText: { color: colors.textSecondary, fontSize: fontSize.sm, lineHeight: 19 },
  optRow: { flexDirection: 'row', gap: spacing.sm },
  scoreBtn: {
    flex: 1, paddingVertical: spacing.sm, borderRadius: borderRadius.md,
    backgroundColor: colors.background, alignItems: 'center',
    borderWidth: 1, borderColor: colors.background,
  },
  scoreBtnActive: { borderColor: colors.accent },
  scoreBtnText: { color: colors.textSecondary, fontWeight: '700' },
  scoreBtnTextActive: { color: colors.accent },
  secondsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  secondsInput: {
    backgroundColor: colors.background, borderRadius: borderRadius.md,
    color: colors.text, fontSize: fontSize.lg, fontWeight: '700',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, width: 90, textAlign: 'center',
  },
  secondsLabel: { color: colors.textSecondary, fontSize: fontSize.sm },
  choiceBtn: {
    backgroundColor: colors.background, borderRadius: borderRadius.md,
    padding: spacing.sm, borderWidth: 1, borderColor: colors.background,
  },
  choiceBtnActive: { borderColor: colors.accent },
  choiceText: { color: colors.textSecondary, fontSize: fontSize.sm },
  choiceTextActive: { color: colors.accent, fontWeight: '600' },
  primaryBtn: {
    flexDirection: 'row', gap: spacing.sm, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.accent, borderRadius: borderRadius.md,
    padding: spacing.md, marginTop: spacing.lg,
  },
  primaryBtnText: { color: colors.textOnPrimary, fontWeight: '700', fontSize: fontSize.md },
  secondaryBtn: { alignItems: 'center', padding: spacing.md },
  secondaryBtnText: { color: colors.accent, fontWeight: '600' },
  sectionTitle: { color: colors.text, fontSize: fontSize.lg, fontWeight: '800', marginTop: spacing.lg, marginBottom: spacing.sm },
  domainScoreCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.md,
    padding: spacing.md, marginBottom: spacing.sm, gap: 6,
  },
  domainScoreTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  domainScoreName: { color: colors.text, fontSize: fontSize.md, fontWeight: '700' },
  domainScoreValue: { color: colors.text, fontSize: fontSize.xl, fontWeight: '800' },
  barTrack: { height: 6, borderRadius: 3, backgroundColor: colors.background, overflow: 'hidden' },
  barFill: { height: 6 },
  flagText: { color: colors.warning, fontSize: fontSize.sm },
  synthesisCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    padding: spacing.lg, borderLeftWidth: 3, borderLeftColor: colors.accent,
  },
  synthesisText: { color: colors.text, fontSize: fontSize.md, lineHeight: 22 },
  disclaimer: { color: colors.textSecondary, fontSize: fontSize.xs, textAlign: 'center', marginTop: spacing.md },
});
