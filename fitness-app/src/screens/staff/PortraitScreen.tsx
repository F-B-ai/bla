import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { colors, spacing, fontSize, borderRadius } from '../../config/theme';
import { crossAlert } from '../../utils/alert';
import { Portrait, getPortrait, generatePortrait } from '../../services/portraitService';

// ============================================================
// RITRATTO ESSĒRE — "chi è questa persona quando si muove"
// La pagina che mantiene la missione: comprendi chi sei
// attraverso il movimento. Ogni tratto cita la sua prova.
// ============================================================

const MATURITY_LABEL: Record<string, string> = {
  ricco: 'Ritratto completo',
  parziale: 'Ritratto in formazione',
  appena_iniziato: 'Ci stiamo conoscendo',
};

export default function PortraitScreen() {
  const route = useRoute<any>();
  const studentId: string | undefined = route.params?.studentId;
  const studentName: string = route.params?.studentName || 'Allievo';

  const [portrait, setPortrait] = useState<Portrait | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    try {
      setPortrait(await getPortrait(studentId));
    } catch {
      setPortrait(null);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleGenerate = async () => {
    if (!studentId) return;
    setGenerating(true);
    try {
      setPortrait(await generatePortrait(studentId, studentName));
    } catch (e) {
      crossAlert(
        'Ritratto non generato',
        (e as Error)?.message?.includes('consenso')
          ? "Serve il consenso AI dell'allievo (lo attiva dal suo profilo)."
          : 'Riprova tra qualche istante.'
      );
    } finally {
      setGenerating(false);
    }
  };

  const stale =
    portrait && Date.now() - portrait.generatedAt.getTime() > 30 * 86400000;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.xl }} />
      ) : !portrait ? (
        <View style={styles.empty}>
          <Ionicons name="finger-print-outline" size={48} color={colors.accent} />
          <Text style={styles.emptyTitle}>Il ritratto di {studentName}</Text>
          <Text style={styles.emptyText}>
            ESSĒRE leggerà la sua storia — allenamenti, check-in, presenze —
            e comporrà chi è quando si muove. Ogni tratto con la sua prova.
          </Text>
          <TouchableOpacity
            style={[styles.primaryBtn, generating && { opacity: 0.6 }]}
            disabled={generating}
            onPress={handleGenerate}
          >
            {generating ? (
              <ActivityIndicator color={colors.textOnPrimary} size="small" />
            ) : (
              <Ionicons name="sparkles-outline" size={18} color={colors.textOnPrimary} />
            )}
            <Text style={styles.primaryBtnText}>
              {generating ? 'Sto leggendo la sua storia…' : 'Genera il ritratto'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.header}>
            <Text style={styles.kicker}>{MATURITY_LABEL[portrait.maturity]}</Text>
            <Text style={styles.title}>Chi è {portrait.name}, quando si allena</Text>
            <Text style={styles.date}>
              aggiornato il {portrait.generatedAt.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}
            </Text>
          </View>

          <View style={styles.essenceCard}>
            <Text style={styles.essence}>{portrait.essenza}</Text>
          </View>

          {portrait.tratti.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Tratti osservati</Text>
              {portrait.tratti.map((t, i) => (
                <View key={i} style={styles.traitCard}>
                  <Text style={styles.traitEmoji}>{t.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.traitName}>{t.nome}</Text>
                    <Text style={styles.traitEvidence}>{t.evidenza}</Text>
                  </View>
                </View>
              ))}
            </>
          )}

          {!!portrait.come_allenarlo && (
            <View style={styles.adviceCard}>
              <Text style={styles.adviceLabel}>Come allenarlo</Text>
              <Text style={styles.adviceText}>{portrait.come_allenarlo}</Text>
            </View>
          )}
          {!!portrait.da_ascoltare && (
            <View style={styles.adviceCard}>
              <Text style={styles.adviceLabel}>Da ascoltare</Text>
              <Text style={styles.adviceText}>{portrait.da_ascoltare}</Text>
            </View>
          )}

          <Text style={styles.disclaimer}>
            Ritratto comportamentale generato dai dati di allenamento — non è
            una valutazione psicologica o clinica. Ogni tratto cita la sua prova.
          </Text>

          <TouchableOpacity
            style={[styles.secondaryBtn, generating && { opacity: 0.6 }]}
            disabled={generating}
            onPress={handleGenerate}
          >
            <Ionicons name="refresh-outline" size={16} color={colors.accent} />
            <Text style={styles.secondaryBtnText}>
              {generating ? 'Rigenero…' : stale ? 'Aggiorna (ha più di un mese)' : 'Rigenera'}
            </Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  empty: { alignItems: 'center', marginTop: spacing.xl, gap: spacing.md, paddingHorizontal: spacing.lg },
  emptyTitle: { color: colors.text, fontSize: fontSize.lg, fontWeight: '700' },
  emptyText: { color: colors.textSecondary, fontSize: fontSize.md, textAlign: 'center', lineHeight: 21 },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: colors.accent, borderRadius: borderRadius.md,
    paddingVertical: spacing.md, paddingHorizontal: spacing.xl, marginTop: spacing.sm,
  },
  primaryBtnText: { color: colors.textOnPrimary, fontWeight: '700', fontSize: fontSize.md },
  header: { marginBottom: spacing.md },
  kicker: {
    color: colors.accent, fontSize: fontSize.xs, fontWeight: '800',
    textTransform: 'uppercase', letterSpacing: 1,
  },
  title: { color: colors.text, fontSize: fontSize.xl, fontWeight: '800', marginTop: 4 },
  date: { color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 2 },
  essenceCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    padding: spacing.lg, borderLeftWidth: 3, borderLeftColor: colors.accent,
  },
  essence: { color: colors.text, fontSize: fontSize.md, lineHeight: 24 },
  sectionTitle: {
    color: colors.text, fontSize: fontSize.md, fontWeight: '700',
    marginTop: spacing.lg, marginBottom: spacing.sm,
  },
  traitCard: {
    flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start',
    backgroundColor: colors.surface, borderRadius: borderRadius.md,
    padding: spacing.md, marginBottom: spacing.sm,
  },
  traitEmoji: { fontSize: 22 },
  traitName: { color: colors.text, fontSize: fontSize.md, fontWeight: '700' },
  traitEvidence: { color: colors.textSecondary, fontSize: fontSize.sm, marginTop: 2, lineHeight: 18 },
  adviceCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.md,
    padding: spacing.md, marginTop: spacing.sm,
  },
  adviceLabel: {
    color: colors.accent, fontSize: fontSize.xs, fontWeight: '800',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4,
  },
  adviceText: { color: colors.text, fontSize: fontSize.md, lineHeight: 21 },
  disclaimer: {
    color: colors.textSecondary, fontSize: fontSize.xs,
    marginTop: spacing.lg, lineHeight: 16, textAlign: 'center',
  },
  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: spacing.md, marginTop: spacing.sm,
  },
  secondaryBtnText: { color: colors.accent, fontWeight: '600' },
});
