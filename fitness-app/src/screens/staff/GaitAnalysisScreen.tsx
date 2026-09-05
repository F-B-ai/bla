import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius } from '../../config/theme';
import { useAuth } from '../../hooks/useAuth';
import { crossAlert } from '../../utils/alert';
import { getStudents } from '../../services/authService';
import { Student } from '../../types';
import { GaitMetrics, GaitView } from '../../domain/gait';
import {
  extractLandmarksFromVideo,
  computeGaitMetrics,
  interpretGaitMetrics,
  saveGaitAssessment,
} from '../../services/gaitService';

// ============================================================
// ANALISI DEL CAMMINO (AI Biomechanics v1, BETA) — staff
// ------------------------------------------------------------
// Il coach riprende l'allievo che cammina (laterale o frontale),
// sceglie il video e l'app: estrae lo SCHELETRO on-device (il
// video non lascia il telefono), calcola metriche deterministiche
// e chiede all'AI l'interpretazione da coach.
// Wording: screening wellness, MAI diagnosi (doc 06).
// ============================================================

type Phase = 'setup' | 'processing' | 'results';

// Range di riferimento indicativi per la colorazione delle card
const inRange = (v: number | undefined, ok: (x: number) => boolean): 'ok' | 'warn' | 'none' => {
  if (v === undefined || v === null) return 'none';
  return ok(v) ? 'ok' : 'warn';
};

export default function GaitAnalysisScreen() {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [student, setStudent] = useState<Student | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [view, setView] = useState<GaitView>('laterale');
  const [phase, setPhase] = useState<Phase>('setup');
  const [progress, setProgress] = useState(0);
  const [engineLoading, setEngineLoading] = useState(false);
  const [metrics, setMetrics] = useState<GaitMetrics | null>(null);
  const [narrative, setNarrative] = useState('');
  const [narrativeLoading, setNarrativeLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<any>(null);

  useEffect(() => {
    getStudents().then(setStudents).catch(() => {});
  }, []);

  // input file nascosto (solo web) — accetta video e apre la camera
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const doc = (globalThis as any).document;
    const input = doc.createElement('input');
    input.type = 'file';
    input.accept = 'video/*';
    input.style.display = 'none';
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) processVideo(file);
      input.value = '';
    };
    doc.body.appendChild(input);
    fileInputRef.current = input;
    return () => {
      try { doc.body.removeChild(input); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, student]);

  const processVideo = async (file: Blob) => {
    setPhase('processing');
    setProgress(0);
    setMetrics(null);
    setNarrative('');
    try {
      const frames = await extractLandmarksFromVideo(file, setProgress, (s) =>
        setEngineLoading(s === 'engine')
      );
      const m = computeGaitMetrics(frames, view);
      setMetrics(m);
      setPhase('results');
      if (m.quality === 'ok' && student) {
        setNarrativeLoading(true);
        try {
          const text = await interpretGaitMetrics(m, `${student.name} ${(student as any).surname || ''}`.trim());
          setNarrative(text);
        } catch {
          setNarrative('');
        } finally {
          setNarrativeLoading(false);
        }
      }
    } catch (e) {
      setPhase('setup');
      crossAlert('Analisi non riuscita', (e as Error).message || 'Riprova con un altro video.');
    }
  };

  const handleSave = async () => {
    if (!metrics || !student || !user) return;
    setSaving(true);
    try {
      await saveGaitAssessment({
        studentId: student.id,
        assessorId: user.id,
        view,
        metrics,
        aiNarrative: narrative,
      });
      crossAlert('Salvata', 'La valutazione è nella storia dell\'allievo.');
      setPhase('setup');
      setMetrics(null);
      setNarrative('');
    } catch {
      crossAlert('Errore', 'Salvataggio non riuscito. Riprova.');
    } finally {
      setSaving(false);
    }
  };

  if (Platform.OS !== 'web') {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.subtle}>Disponibile dalla web app (PWA).</Text>
      </View>
    );
  }

  const MetricCard = ({
    label, value, unit, state, hint,
  }: { label: string; value?: number | string; unit?: string; state: 'ok' | 'warn' | 'none'; hint?: string }) => {
    if (value === undefined || value === null) return null;
    return (
      <View style={[styles.metricCard, state === 'warn' && styles.metricWarn]}>
        <Text style={styles.metricLabel}>{label}</Text>
        <Text style={[styles.metricValue, state === 'warn' && { color: colors.warning }]}>
          {value}{unit ? <Text style={styles.metricUnit}> {unit}</Text> : null}
        </Text>
        {hint ? <Text style={styles.metricHint}>{hint}</Text> : null}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.betaRow}>
        <Text style={styles.betaBadge}>BETA</Text>
        <Text style={styles.subtle}>Screening del movimento — non è una valutazione clinica.</Text>
      </View>

      {/* 1. Allievo */}
      <Text style={styles.sectionTitle}>1 · Allievo</Text>
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
            value={studentSearch}
            onChangeText={setStudentSearch}
            autoFocus
          />
          <ScrollView style={styles.pickerScroll} nestedScrollEnabled keyboardShouldPersistTaps="handled">
            {students
              .filter((s) => {
                const full = `${s.name} ${(s as any).surname || ''}`.toLowerCase();
                return full.includes(studentSearch.trim().toLowerCase());
              })
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((s) => (
                <TouchableOpacity
                  key={s.id}
                  style={styles.pickerRow}
                  onPress={() => { setStudent(s); setShowPicker(false); setStudentSearch(''); }}
                >
                  <Text style={styles.pickerRowText}>{s.name} {(s as any).surname || ''}</Text>
                </TouchableOpacity>
              ))}
          </ScrollView>
        </View>
      )}

      {/* 2. Vista */}
      <Text style={styles.sectionTitle}>2 · Ripresa</Text>
      <View style={styles.toggleRow}>
        {(['laterale', 'frontale'] as GaitView[]).map((v) => (
          <TouchableOpacity
            key={v}
            style={[styles.toggle, view === v && styles.toggleActive]}
            onPress={() => setView(v)}
          >
            <Text style={[styles.toggleText, view === v && styles.toggleTextActive]}>
              {v === 'laterale' ? 'Di lato' : 'Di fronte'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.instructions}>
        <Text style={styles.instructionsText}>
          {view === 'laterale'
            ? '📱 Telefono fermo all\'altezza del bacino, a 3-4 metri. L\'allievo cammina passando davanti alla camera: almeno 6-8 passi, tutto il corpo inquadrato.'
            : '📱 Telefono fermo all\'altezza del bacino. L\'allievo cammina VERSO la camera per 6-8 passi, tutto il corpo inquadrato, buona luce.'}
        </Text>
        <Text style={[styles.instructionsText, { marginTop: 4 }]}>
          🔒 Il video resta sul telefono: viene analizzato qui, non viene caricato.
        </Text>
      </View>

      {/* 3. Video */}
      {phase !== 'processing' && (
        <TouchableOpacity
          style={[styles.primaryBtn, !student && styles.btnDisabled]}
          disabled={!student}
          onPress={() => fileInputRef.current?.click()}
        >
          <Ionicons name="videocam-outline" size={20} color={colors.textOnPrimary} />
          <Text style={styles.primaryBtnText}>
            {student ? 'Riprendi o scegli il video' : 'Prima scegli l\'allievo'}
          </Text>
        </TouchableOpacity>
      )}

      {phase === 'processing' && (
        <View style={styles.processing}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.processingText}>
            {engineLoading
              ? 'Scarico il motore di analisi (~38 MB, solo la prima volta)…'
              : `Estraggo lo scheletro… ${Math.round(progress * 100)}%`}
          </Text>
          {!engineLoading && (
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
            </View>
          )}
        </View>
      )}

      {/* 4. Risultati */}
      {phase === 'results' && metrics && (
        <>
          <Text style={styles.sectionTitle}>Risultati · vista {metrics.view}</Text>
          {metrics.quality !== 'ok' ? (
            <View style={styles.qualityBox}>
              <Ionicons name="alert-circle-outline" size={20} color={colors.warning} />
              <View style={{ flex: 1 }}>
                <Text style={styles.qualityTitle}>Video non sufficiente</Text>
                {metrics.quality_notes.map((n, i) => (
                  <Text key={i} style={styles.qualityNote}>• {n}</Text>
                ))}
              </View>
            </View>
          ) : (
            <>
              <View style={styles.metricsGrid}>
                <MetricCard label="Cadenza" value={metrics.cadence_spm} unit="passi/min"
                  state={inRange(metrics.cadence_spm, (x) => x >= 100 && x <= 125)}
                  hint="riferimento 100-120" />
                <MetricCard label="Simmetria passo" value={metrics.step_symmetry_pct} unit="%"
                  state={inRange(metrics.step_symmetry_pct, (x) => x >= 90)}
                  hint="≥ 90% atteso" />
                <MetricCard label="Inclinazione tronco" value={metrics.trunk_lean_deg} unit="°"
                  state={inRange(metrics.trunk_lean_deg, (x) => x < 8)}
                  hint="< 8° atteso" />
                <MetricCard label="Simmetria braccia" value={metrics.arm_swing_symmetry_pct} unit="%"
                  state={inRange(metrics.arm_swing_symmetry_pct, (x) => x >= 80)}
                  hint="≥ 80% atteso" />
                <MetricCard label="Oscillazione bacino" value={metrics.pelvic_drop_deg} unit="°"
                  state={inRange(metrics.pelvic_drop_deg, (x) => x < 5)}
                  hint="< 5° atteso" />
                {metrics.knee_valgus_pct && (
                  <>
                    <MetricCard label="Ginocchio sx (interno)" value={metrics.knee_valgus_pct.left} unit="%"
                      state={inRange(metrics.knee_valgus_pct.left, (x) => Math.abs(x) < 15)}
                      hint="< 15% atteso" />
                    <MetricCard label="Ginocchio dx (interno)" value={metrics.knee_valgus_pct.right} unit="%"
                      state={inRange(metrics.knee_valgus_pct.right, (x) => Math.abs(x) < 15)}
                      hint="< 15% atteso" />
                  </>
                )}
              </View>

              {/* Interpretazione AI */}
              <Text style={styles.sectionTitle}>Lettura del coach AI</Text>
              {narrativeLoading ? (
                <ActivityIndicator color={colors.accent} style={{ marginVertical: spacing.md }} />
              ) : narrative ? (
                <View style={styles.narrative}>
                  <Text style={styles.narrativeText}>{narrative}</Text>
                </View>
              ) : (
                <Text style={styles.subtle}>Interpretazione non disponibile (riprova più tardi) — le metriche restano valide.</Text>
              )}

              <TouchableOpacity
                style={[styles.primaryBtn, saving && styles.btnDisabled]}
                disabled={saving}
                onPress={handleSave}
              >
                <Ionicons name="save-outline" size={20} color={colors.textOnPrimary} />
                <Text style={styles.primaryBtnText}>{saving ? 'Salvo…' : 'Salva nella storia dell\'allievo'}</Text>
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => { setPhase('setup'); setMetrics(null); setNarrative(''); }}>
            <Text style={styles.secondaryBtnText}>Nuova analisi</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  center: { alignItems: 'center', justifyContent: 'center' },
  betaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  betaBadge: {
    color: colors.accent, borderColor: colors.accent, borderWidth: 1,
    paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4,
    fontSize: fontSize.xs, fontWeight: '800', letterSpacing: 1,
  },
  subtle: { color: colors.textSecondary, fontSize: fontSize.sm, flex: 1 },
  sectionTitle: {
    color: colors.text, fontSize: fontSize.md, fontWeight: '700',
    marginTop: spacing.md, marginBottom: spacing.sm,
  },
  selector: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.md,
  },
  selectorText: { color: colors.text, fontSize: fontSize.md, flex: 1 },
  pickerList: {
    backgroundColor: colors.surface, borderRadius: borderRadius.md,
    marginTop: spacing.xs, overflow: 'hidden',
  },
  pickerSearch: {
    color: colors.text, fontSize: fontSize.md, padding: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.background,
  },
  pickerScroll: { maxHeight: 280 },
  pickerRow: { padding: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.background },
  pickerRowText: { color: colors.text, fontSize: fontSize.md },
  toggleRow: { flexDirection: 'row', gap: spacing.sm },
  toggle: {
    flex: 1, padding: spacing.sm, borderRadius: borderRadius.md,
    backgroundColor: colors.surface, alignItems: 'center',
    borderWidth: 1, borderColor: colors.surface,
  },
  toggleActive: { borderColor: colors.accent },
  toggleText: { color: colors.textSecondary, fontWeight: '600' },
  toggleTextActive: { color: colors.accent },
  instructions: {
    backgroundColor: colors.surface, borderRadius: borderRadius.md,
    padding: spacing.md, marginTop: spacing.sm,
  },
  instructionsText: { color: colors.textSecondary, fontSize: fontSize.sm, lineHeight: 19 },
  primaryBtn: {
    flexDirection: 'row', gap: spacing.sm, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.accent, borderRadius: borderRadius.md,
    padding: spacing.md, marginTop: spacing.lg,
  },
  primaryBtnText: { color: colors.textOnPrimary, fontWeight: '700', fontSize: fontSize.md },
  btnDisabled: { opacity: 0.5 },
  secondaryBtn: { alignItems: 'center', padding: spacing.md, marginTop: spacing.sm },
  secondaryBtnText: { color: colors.accent, fontWeight: '600' },
  processing: { alignItems: 'center', marginTop: spacing.xl, gap: spacing.sm },
  processingText: { color: colors.text, fontSize: fontSize.md },
  progressTrack: {
    width: '100%', height: 6, borderRadius: 3, backgroundColor: colors.surface, overflow: 'hidden',
  },
  progressFill: { height: 6, backgroundColor: colors.accent },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  metricCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.md,
    padding: spacing.md, minWidth: '46%', flexGrow: 1,
  },
  metricWarn: { borderLeftWidth: 3, borderLeftColor: colors.warning },
  metricLabel: { color: colors.textSecondary, fontSize: fontSize.xs, textTransform: 'uppercase', letterSpacing: 0.5 },
  metricValue: { color: colors.text, fontSize: fontSize.xl, fontWeight: '800', marginTop: 2 },
  metricUnit: { fontSize: fontSize.sm, fontWeight: '400', color: colors.textSecondary },
  metricHint: { color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 2 },
  qualityBox: {
    flexDirection: 'row', gap: spacing.sm, backgroundColor: colors.surface,
    borderRadius: borderRadius.md, padding: spacing.md,
    borderLeftWidth: 3, borderLeftColor: colors.warning,
  },
  qualityTitle: { color: colors.text, fontWeight: '700', marginBottom: 2 },
  qualityNote: { color: colors.textSecondary, fontSize: fontSize.sm },
  narrative: { backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.md },
  narrativeText: { color: colors.text, fontSize: fontSize.md, lineHeight: 21 },
});
