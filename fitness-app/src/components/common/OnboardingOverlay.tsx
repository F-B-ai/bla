import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius } from '../../config/theme';
import { UserRole } from '../../types';

const { width } = Dimensions.get('window');

interface OnboardingStep {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  description: string;
}

const STUDENT_STEPS: OnboardingStep[] = [
  {
    icon: 'fitness-outline',
    title: 'La tua scheda',
    description: 'Nella tab "Scheda" trovi il tuo programma di allenamento personalizzato con tutti gli esercizi.',
  },
  {
    icon: 'barbell-outline',
    title: 'Allenamento live',
    description: 'Usa "Allenamento" per seguire la scheda in palestra: timer, serie, pesi e note in tempo reale.',
  },
  {
    icon: 'calendar-outline',
    title: 'Calendario',
    description: 'Visualizza i tuoi appuntamenti. Se devi disdire, fallo almeno 10 ore prima per evitare che venga contata come eseguita.',
  },
  {
    icon: 'journal-outline',
    title: 'Diario',
    description: 'Annota come ti senti, foto progressi e appunti personali. Solo tu e il tuo coach potete vederli.',
  },
  {
    icon: 'chatbubbles-outline',
    title: 'Chat',
    description: 'Scrivi direttamente al tuo coach per domande, aggiornamenti o spostare appuntamenti.',
  },
  {
    icon: 'notifications-outline',
    title: 'Notifiche',
    description: 'Attiva le notifiche per ricevere promemoria degli appuntamenti e aggiornamenti importanti.',
  },
];

const COLLABORATOR_STEPS: OnboardingStep[] = [
  {
    icon: 'people-outline',
    title: 'I tuoi allievi',
    description: 'Nella prima tab trovi tutti i tuoi allievi. Tocca un nome per vedere scheda, sessioni, diario e progressi.',
  },
  {
    icon: 'calendar-outline',
    title: 'Calendario',
    description: 'Gestisci il tuo calendario: crea appuntamenti, segna sessioni completate e tieni traccia delle disdette.',
  },
  {
    icon: 'fitness-outline',
    title: 'Programmi',
    description: 'Crea e modifica le schede di allenamento dei tuoi allievi. Usa i template per velocizzare il lavoro.',
  },
  {
    icon: 'barbell-outline',
    title: 'Monitor allenamento',
    description: 'Quando un allievo si allena in palestra, puoi seguire in tempo reale il suo allenamento.',
  },
  {
    icon: 'wallet-outline',
    title: 'Guadagni',
    description: 'Tieni traccia delle tue commissioni e degli incassi dalle sessioni completate.',
  },
  {
    icon: 'chatbubbles-outline',
    title: 'Chat',
    description: 'Comunica con i tuoi allievi e con il team. Riceverai notifiche per i nuovi messaggi.',
  },
];

const ONBOARDING_KEY = 'essere_onboarding_completed';

export const hasCompletedOnboarding = (userId: string): boolean => {
  if (Platform.OS !== 'web' || typeof localStorage === 'undefined') return true;
  try {
    return localStorage.getItem(`${ONBOARDING_KEY}_${userId}`) === '1';
  } catch { return true; }
};

export const markOnboardingComplete = (userId: string): void => {
  if (Platform.OS !== 'web' || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(`${ONBOARDING_KEY}_${userId}`, '1');
  } catch {}
};

interface Props {
  role: UserRole;
  userName: string;
  userId: string;
  onComplete: () => void;
}

export const OnboardingOverlay: React.FC<Props> = ({ role, userName, userId, onComplete }) => {
  const [step, setStep] = useState(-1); // -1 = welcome screen

  const steps = role === 'student' ? STUDENT_STEPS : COLLABORATOR_STEPS;
  const isWelcome = step === -1;
  const isLastStep = step === steps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      markOnboardingComplete(userId);
      onComplete();
    } else {
      setStep(step + 1);
    }
  };

  const handleSkip = () => {
    markOnboardingComplete(userId);
    onComplete();
  };

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        {isWelcome ? (
          <>
            <View style={styles.welcomeIcon}>
              <Ionicons name="sparkles" size={48} color={colors.accent} />
            </View>
            <Text style={styles.welcomeTitle}>
              Benvenuto{role === 'student' ? '' : '/a'}, {userName}!
            </Text>
            <Text style={styles.welcomeSubtitle}>
              {role === 'student'
                ? 'Facciamo un tour veloce dell\'app per scoprire tutte le funzionalità a tua disposizione.'
                : 'Ecco una panoramica degli strumenti a tua disposizione per gestire i tuoi allievi.'}
            </Text>
            <TouchableOpacity style={styles.primaryButton} onPress={() => setStep(0)}>
              <Text style={styles.primaryButtonText}>Inizia il tour</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
              <Text style={styles.skipText}>Salta, conosco già l'app</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.stepIndicator}>
              {steps.map((_, i) => (
                <View key={i} style={[styles.dot, i === step && styles.dotActive, i < step && styles.dotDone]} />
              ))}
            </View>
            <View style={styles.stepIconBox}>
              <Ionicons name={steps[step].icon} size={40} color={colors.accent} />
            </View>
            <Text style={styles.stepTitle}>{steps[step].title}</Text>
            <Text style={styles.stepDesc}>{steps[step].description}</Text>
            <View style={styles.navRow}>
              {step > 0 && (
                <TouchableOpacity style={styles.backBtn} onPress={() => setStep(step - 1)}>
                  <Ionicons name="arrow-back" size={18} color={colors.textSecondary} />
                  <Text style={styles.backText}>Indietro</Text>
                </TouchableOpacity>
              )}
              <View style={{ flex: 1 }} />
              <TouchableOpacity style={styles.primaryButton} onPress={handleNext}>
                <Text style={styles.primaryButtonText}>
                  {isLastStep ? 'Inizia!' : 'Avanti'}
                </Text>
                <Ionicons name={isLastStep ? 'checkmark' : 'arrow-forward'} size={18} color="#FFF" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
              <Text style={styles.skipText}>Salta il tour</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10000,
    padding: spacing.xl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: Math.min(width - 48, 400),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  welcomeIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.accent + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  welcomeTitle: {
    fontSize: fontSize.title,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  welcomeSubtitle: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: borderRadius.md,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minWidth: 140,
  },
  primaryButtonText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: fontSize.lg,
  },
  skipButton: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
  },
  skipText: {
    color: colors.textLight,
    fontSize: fontSize.sm,
  },
  stepIndicator: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: spacing.lg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.accent,
    width: 20,
  },
  dotDone: {
    backgroundColor: colors.accent + '60',
  },
  stepIconBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.accent + '12',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  stepTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  stepDesc: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
  },
});
