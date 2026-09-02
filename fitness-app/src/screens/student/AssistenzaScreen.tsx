import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, fontSize, borderRadius } from '../../config/theme';
import { useAuth } from '../../hooks/useAuth';
import { getUserProfile } from '../../services/authService';
import {
  ARGOMENTI, PROBLEMI, INTRO, PERIMETRO, bloccoCoach, Argomento,
} from '../../data/assistenza';

// ============================================================
// ASSISTENZA — la schermata che l'allievo apre quando non capisce
// ------------------------------------------------------------
// Gerarchia voluta: PRIMA la persona, POI le risposte scritte.
// L'app non sostituisce il coach, e questa schermata è il posto
// dove si vede.
//
// Niente casella di ricerca: con otto argomenti che stanno in una
// schermata, una ricerca che non trova nulla fa più danno del suo
// vantaggio. Torna quando gli articoli saranno quaranta.
// ============================================================

export const AssistenzaScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [nomeCoach, setNomeCoach] = useState<string | null>(null);

  // Il nome del coach assegnato. Se non c'è, il blocco parla
  // dello studio: mai un nome vuoto, mai un segnaposto.
  useEffect(() => {
    let vivo = true;
    const idCoach = (user as any)?.assignedCollaboratorIds?.[0];
    if (!idCoach) return undefined;
    getUserProfile(idCoach)
      .then((c) => { if (vivo && c?.name) setNomeCoach(c.name); })
      .catch(() => { /* resta «lo studio»: meglio del nome sbagliato */ });
    return () => { vivo = false; };
  }, [user]);

  // Gli orari li configura lo studio nella scheda Assistente.
  // Finché non ci sono, non si promette nessuna fascia oraria.
  const orariStudio = (user as any)?.studioOrari ?? null;
  const coach = bloccoCoach(nomeCoach, orariStudio);

  const nome = (user?.name || '').trim().split(' ')[0];
  const apri = (a: Argomento) => navigation.navigate('ArticoloAssistenza', { id: a.id });
  const vaiAllaChat = () => navigation.navigate(
    coach.destinazione.tab,
    { screen: coach.destinazione.route }
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      <Text style={styles.occhiello}>Assistenza</Text>
      <Text style={styles.titolo}>
        {nome ? `Come possiamo aiutarti, ${nome}?` : 'Come possiamo aiutarti?'}
      </Text>
      <Text style={styles.intro}>{INTRO}</Text>

      {/* --- Prima di tutto: la persona --- */}
      <View style={styles.coach}>
        <Text style={styles.coachTitolo}>Parla con il tuo coach</Text>
        <Text style={styles.coachTesto}>
          Per tutto ciò che riguarda il tuo corpo, il tuo programma o come ti senti,
          la risposta giusta è la sua.
        </Text>
        <View style={styles.chi}>
          <View style={styles.pallino}>
            <Text style={styles.inizialeCoach}>{coach.iniziale}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.nomeCoach}>{coach.nome}</Text>
            {coach.quandoRisponde ? (
              <Text style={styles.quando}>{coach.quandoRisponde}</Text>
            ) : null}
          </View>
        </View>
        <TouchableOpacity style={styles.bottone} onPress={vaiAllaChat} activeOpacity={0.85}>
          <Text style={styles.bottoneTesto}>{coach.invito}</Text>
        </TouchableOpacity>
      </View>

      {/* --- Argomenti --- */}
      <Text style={styles.sezione}>Argomenti</Text>
      <View style={styles.righe}>
        {ARGOMENTI.map((a) => (
          <TouchableOpacity key={a.id} style={styles.riga} onPress={() => apri(a)} activeOpacity={0.85}>
            <View style={styles.segno} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rigaTitolo}>{a.titolo}</Text>
              <Text style={styles.rigaSommario}>{a.sommario}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
          </TouchableOpacity>
        ))}
      </View>

      {/* --- Qualcosa non funziona --- */}
      <Text style={styles.sezione}>Qualcosa non funziona</Text>
      <View style={styles.guasti}>
        {PROBLEMI.map((p, i) => (
          <TouchableOpacity
            key={p.id}
            style={[styles.guasto, i === PROBLEMI.length - 1 && styles.guastoUltimo]}
            onPress={() => apri(p)}
            activeOpacity={0.85}
          >
            <Text style={styles.guastoTesto}>{p.titolo}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.piede}>
        ESSĒRE — A.S.D. Evolution Sport, Gragnano (NA).{'\n'}{PERIMETRO}
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },

  occhiello: {
    fontSize: fontSize.xs, letterSpacing: 2.4, textTransform: 'uppercase',
    color: colors.textSecondary, marginBottom: spacing.md,
  },
  titolo: {
    fontSize: fontSize.xxl, fontWeight: '600', color: colors.text,
    marginBottom: spacing.sm, lineHeight: 34,
  },
  intro: { fontSize: fontSize.md, color: colors.textSecondary, lineHeight: 22 },

  coach: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.accent,
    borderRadius: borderRadius.lg, padding: spacing.lg,
    marginTop: spacing.xl, marginBottom: spacing.xl,
  },
  coachTitolo: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  coachTesto: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20, marginBottom: spacing.md },
  chi: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  pallino: {
    width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: colors.accent,
    backgroundColor: colors.surfaceLight, alignItems: 'center', justifyContent: 'center',
  },
  inizialeCoach: { color: colors.accent, fontSize: fontSize.md, fontWeight: '600' },
  nomeCoach: { fontSize: fontSize.md, color: colors.text },
  quando: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  bottone: {
    backgroundColor: colors.accent, borderRadius: borderRadius.md,
    paddingVertical: spacing.md, alignItems: 'center',
  },
  bottoneTesto: { color: colors.textOnAccent, fontSize: fontSize.md, fontWeight: '600' },

  sezione: {
    fontSize: fontSize.xs, letterSpacing: 2.4, textTransform: 'uppercase',
    color: colors.textSecondary, marginBottom: spacing.sm,
  },
  righe: { borderTopWidth: 1, borderTopColor: colors.border, marginBottom: spacing.xl },
  riga: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md,
    paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  segno: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.accent, marginTop: 7 },
  rigaTitolo: { fontSize: fontSize.md, fontWeight: '600', color: colors.text, marginBottom: 2 },
  rigaSommario: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 19 },

  guasti: {
    backgroundColor: colors.surfaceLight, borderWidth: 1, borderColor: colors.border,
    borderRadius: borderRadius.lg, paddingHorizontal: spacing.lg, marginBottom: spacing.xl,
  },
  guasto: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  guastoUltimo: { borderBottomWidth: 0 },
  guastoTesto: { fontSize: fontSize.sm, color: colors.text, flex: 1 },

  piede: {
    fontSize: fontSize.xs, color: colors.textLight, lineHeight: 18,
    borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.lg,
  },
});
