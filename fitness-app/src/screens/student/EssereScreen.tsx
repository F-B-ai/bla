import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, borderRadius } from '../../config/theme';
import { brand } from '../../config/brand';
import { useAuth } from '../../hooks/useAuth';
import {
  WellnessCheck,
  getTodayCheck,
  saveDailyCheck,
  getRecentChecks,
  computeScore,
  adviceForScore,
} from '../../services/wellnessService';
import { awardXp } from '../../services/gamificationService';
import { crossAlert } from '../../utils/alert';

// ------------------------------------------------------------
// Domande del check-in (scala 1-5)
// ------------------------------------------------------------
const QUESTIONS: { key: 'sleep' | 'energy' | 'mood' | 'soreness'; icon: string; label: string; low: string; high: string }[] = [
  { key: 'sleep', icon: 'moon', label: 'Come hai dormito?', low: 'Male', high: 'Benissimo' },
  { key: 'energy', icon: 'flash', label: 'Quanta energia hai?', low: 'Scarico', high: 'Carico' },
  { key: 'mood', icon: 'happy', label: 'Come ti senti?', low: 'Giù', high: 'Alla grande' },
  { key: 'soreness', icon: 'bandage', label: 'Dolori muscolari?', low: 'Nessuno', high: 'Molti' },
];

// ------------------------------------------------------------
// Protocolli di respirazione
// ------------------------------------------------------------
interface BreathPhase { label: string; ms: number; to: number }
interface BreathProtocol { key: string; name: string; desc: string; icon: string; phases: BreathPhase[] }

const PROTOCOLS: BreathProtocol[] = [
  {
    key: 'calma', name: 'Calma', desc: '4-7-8 · rilassamento profondo', icon: 'moon-outline',
    phases: [
      { label: 'Inspira', ms: 4000, to: 1 },
      { label: 'Trattieni', ms: 7000, to: 1 },
      { label: 'Espira', ms: 8000, to: 0.35 },
    ],
  },
  {
    key: 'focus', name: 'Focus', desc: 'Box 4-4-4-4 · concentrazione', icon: 'square-outline',
    phases: [
      { label: 'Inspira', ms: 4000, to: 1 },
      { label: 'Trattieni', ms: 4000, to: 1 },
      { label: 'Espira', ms: 4000, to: 0.35 },
      { label: 'Trattieni', ms: 4000, to: 0.35 },
    ],
  },
  {
    key: 'equilibrio', name: 'Equilibrio', desc: 'Coerenza 5-5 · pre-allenamento', icon: 'infinite-outline',
    phases: [
      { label: 'Inspira', ms: 5000, to: 1 },
      { label: 'Espira', ms: 5000, to: 0.35 },
    ],
  },
];

const scoreColor = (score: number): string =>
  score >= 75 ? colors.success : score >= 50 ? colors.warning : colors.error;

export const EssereScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  // --- Stato check-in ---
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [todayCheck, setTodayCheck] = useState<WellnessCheck | null>(null);
  const [recent, setRecent] = useState<WellnessCheck[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});

  // --- Stato respirazione ---
  const [activeProtocol, setActiveProtocol] = useState<BreathProtocol | null>(null);
  const [phaseLabel, setPhaseLabel] = useState('');
  const [cycles, setCycles] = useState(0);
  const breathAnim = useRef(new Animated.Value(0.35)).current;
  const breathingRef = useRef(false);
  const phaseTimerRef = useRef<any>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [today, hist] = await Promise.all([
        getTodayCheck(user.id),
        getRecentChecks(user.id, 14),
      ]);
      setTodayCheck(today);
      setRecent(hist);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const allAnswered = QUESTIONS.every((q) => answers[q.key] != null);
  const previewScore = allAnswered
    ? computeScore(answers.sleep, answers.energy, answers.mood, answers.soreness)
    : null;

  const handleSave = async () => {
    if (!user || !allAnswered) return;
    setSaving(true);
    try {
      const name = `${user.name || ''}${(user as any).surname ? ' ' + (user as any).surname : ''}`.trim() || user.email || 'Allievo';
      const check = await saveDailyCheck(user.id, name, {
        sleep: answers.sleep,
        energy: answers.energy,
        mood: answers.mood,
        soreness: answers.soreness,
      });
      setTodayCheck(check);
      setRecent((prev) => [check, ...prev]);
      awardXp(user.id, 10).catch(() => {});
    } catch {
      crossAlert('Errore', 'Impossibile salvare il tuo stato. Riprova.');
    } finally {
      setSaving(false);
    }
  };

  // --- Respirazione: ciclo di fasi con animazione ---
  const stopBreathing = useCallback(() => {
    breathingRef.current = false;
    if (phaseTimerRef.current) { clearTimeout(phaseTimerRef.current); phaseTimerRef.current = null; }
    breathAnim.stopAnimation();
    breathAnim.setValue(0.35);
    setActiveProtocol(null);
    setPhaseLabel('');
    setCycles(0);
  }, [breathAnim]);

  const runPhase = useCallback((protocol: BreathProtocol, index: number) => {
    if (!breathingRef.current) return;
    const phase = protocol.phases[index];
    setPhaseLabel(phase.label);
    Animated.timing(breathAnim, {
      toValue: phase.to,
      duration: phase.ms,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start();
    phaseTimerRef.current = setTimeout(() => {
      const next = (index + 1) % protocol.phases.length;
      if (next === 0) setCycles((c) => c + 1);
      runPhase(protocol, next);
    }, phase.ms);
  }, [breathAnim]);

  const startBreathing = useCallback((protocol: BreathProtocol) => {
    stopBreathing();
    breathingRef.current = true;
    setActiveProtocol(protocol);
    setCycles(0);
    runPhase(protocol, 0);
  }, [runPhase, stopBreathing]);

  useEffect(() => () => { breathingRef.current = false; if (phaseTimerRef.current) clearTimeout(phaseTimerRef.current); }, []);

  const advice = todayCheck ? adviceForScore(todayCheck.score) : null;
  const adviceColor = advice ? colors[advice.color] : colors.accent;

  return (
    <View style={styles.container}>
      <View style={{ ...styles.header, paddingTop: insets.top + spacing.md }}>
        <Text style={styles.headerTitle}>{brand.appName}</Text>
        <Text style={styles.headerSub}>{brand.tagline}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ================= RESPIRAZIONE ATTIVA ================= */}
        {activeProtocol ? (
          <View style={styles.breathSession}>
            <Text style={styles.breathProtocolName}>{activeProtocol.name}</Text>
            <View style={styles.breathCircleWrap}>
              <Animated.View
                style={[
                  styles.breathCircle,
                  { transform: [{ scale: breathAnim }] },
                ]}
              />
              <View style={styles.breathLabelWrap} pointerEvents="none">
                <Text style={styles.breathPhase}>{phaseLabel}</Text>
                <Text style={styles.breathCycles}>{cycles} cicli</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.breathStop} onPress={stopBreathing} activeOpacity={0.8}>
              <Ionicons name="stop" size={18} color={colors.text} />
              <Text style={styles.breathStopText}>Termina</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* ================= STATO DEL GIORNO ================= */}
            {loading ? (
              <ActivityIndicator color={colors.accent} style={{ marginVertical: spacing.xxl }} />
            ) : todayCheck ? (
              <View style={styles.resultCard}>
                <View style={[styles.scoreRing, { borderColor: scoreColor(todayCheck.score) }]}>
                  <Text style={[styles.scoreValue, { color: scoreColor(todayCheck.score) }]}>
                    {todayCheck.score}
                  </Text>
                  <Text style={styles.scoreOf}>/ 100</Text>
                </View>
                <Text style={styles.resultTitle}>Il tuo Stato {brand.appName} oggi</Text>
                {advice && (
                  <View style={[styles.adviceBox, { borderColor: adviceColor + '50', backgroundColor: adviceColor + '12' }]}>
                    <Text style={[styles.adviceTitle, { color: adviceColor }]}>{advice.title}</Text>
                    <Text style={styles.adviceDetail}>{advice.detail}</Text>
                  </View>
                )}
                {/* Trend ultimi giorni */}
                {recent.length > 1 && (
                  <View style={styles.trendRow}>
                    {recent.slice(0, 7).reverse().map((c) => (
                      <View key={c.id} style={styles.trendItem}>
                        <View style={[styles.trendBar, { height: 8 + (c.score / 100) * 36, backgroundColor: scoreColor(c.score) }]} />
                        <Text style={styles.trendDay}>
                          {c.timestamp.toLocaleDateString('it-IT', { day: '2-digit' })}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.checkCard}>
                <Text style={styles.checkTitle}>Come stai oggi?</Text>
                <Text style={styles.checkSub}>
                  30 secondi per ascoltarti. Il tuo coach saprà come guidarti al meglio. (+10 XP)
                </Text>
                {QUESTIONS.map((q) => (
                  <View key={q.key} style={styles.questionBlock}>
                    <View style={styles.questionHeader}>
                      <Ionicons name={q.icon as any} size={16} color={colors.accent} />
                      <Text style={styles.questionLabel}>{q.label}</Text>
                    </View>
                    <View style={styles.dotsRow}>
                      <Text style={styles.dotEdgeLabel}>{q.low}</Text>
                      {[1, 2, 3, 4, 5].map((v) => (
                        <TouchableOpacity
                          key={v}
                          style={[
                            styles.dot,
                            answers[q.key] === v && styles.dotActive,
                          ]}
                          onPress={() => setAnswers((a) => ({ ...a, [q.key]: v }))}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.dotText, answers[q.key] === v && styles.dotTextActive]}>{v}</Text>
                        </TouchableOpacity>
                      ))}
                      <Text style={styles.dotEdgeLabel}>{q.high}</Text>
                    </View>
                  </View>
                ))}
                <TouchableOpacity
                  style={[styles.saveBtn, !allAnswered && { opacity: 0.4 }]}
                  onPress={handleSave}
                  disabled={!allAnswered || saving}
                  activeOpacity={0.85}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="pulse" size={20} color="#fff" />
                      <Text style={styles.saveBtnText}>
                        {previewScore != null ? `Registra il mio stato · ${previewScore}` : 'Registra il mio stato'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* ================= RESPIRAZIONE ================= */}
            <Text style={styles.sectionTitle}>Respirazione guidata</Text>
            <Text style={styles.sectionSub}>
              La mente guida il movimento: pochi minuti di respiro consapevole cambiano la seduta.
            </Text>
            {PROTOCOLS.map((p) => (
              <TouchableOpacity
                key={p.key}
                style={styles.protocolCard}
                onPress={() => startBreathing(p)}
                activeOpacity={0.75}
              >
                <View style={styles.protocolIcon}>
                  <Ionicons name={p.icon as any} size={22} color={colors.accent} />
                </View>
                <View style={styles.protocolInfo}>
                  <Text style={styles.protocolName}>{p.name}</Text>
                  <Text style={styles.protocolDesc}>{p.desc}</Text>
                </View>
                <Ionicons name="play-circle" size={30} color={colors.accent} />
              </TouchableOpacity>
            ))}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === 'web' ? spacing.lg : 60,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSize.title,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 4,
  },
  headerSub: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    letterSpacing: 2,
    marginTop: 2,
  },
  scroll: { padding: spacing.lg },

  // --- Check-in ---
  checkCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  checkTitle: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.text, textAlign: 'center' },
  checkSub: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
    lineHeight: 18,
  },
  questionBlock: { marginBottom: spacing.lg },
  questionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  questionLabel: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  dotsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  dotEdgeLabel: { fontSize: 9, color: colors.textLight, width: 52, textAlign: 'center' },
  dot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  dotText: { fontSize: fontSize.md, fontWeight: '700', color: colors.textSecondary },
  dotTextActive: { color: '#fff' },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent,
    paddingVertical: spacing.md + 2,
    borderRadius: borderRadius.lg,
    marginTop: spacing.sm,
  },
  saveBtnText: { fontSize: fontSize.lg, fontWeight: '700', color: '#fff' },

  // --- Risultato ---
  resultCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    alignItems: 'center',
  },
  scoreRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  scoreValue: { fontSize: 44, fontWeight: '800' },
  scoreOf: { fontSize: fontSize.xs, color: colors.textLight, marginTop: -4 },
  resultTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  adviceBox: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    width: '100%',
  },
  adviceTitle: { fontSize: fontSize.lg, fontWeight: '700', textAlign: 'center' },
  adviceDetail: { fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs, lineHeight: 18 },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.lg,
    height: 62,
  },
  trendItem: { alignItems: 'center', gap: 3 },
  trendBar: { width: 16, borderRadius: 4 },
  trendDay: { fontSize: 8, color: colors.textLight },

  // --- Respirazione ---
  sectionTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.xl,
  },
  sectionSub: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  protocolCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  protocolIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  protocolInfo: { flex: 1 },
  protocolName: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  protocolDesc: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },

  breathSession: { alignItems: 'center', paddingTop: spacing.xl },
  breathProtocolName: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xl,
  },
  breathCircleWrap: {
    width: 280,
    height: 280,
    justifyContent: 'center',
    alignItems: 'center',
  },
  breathCircle: {
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: colors.accent + '30',
    borderWidth: 2,
    borderColor: colors.accent,
  },
  breathLabelWrap: {
    position: 'absolute',
    alignItems: 'center',
  },
  breathPhase: { fontSize: fontSize.title, fontWeight: '700', color: colors.text },
  breathCycles: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.xs },
  breathStop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  breathStopText: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
});
