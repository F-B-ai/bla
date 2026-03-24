import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { colors, spacing, fontSize, borderRadius, shadows } from '../../config/theme';
import { EnsoLogo } from '../../components/common/EnsōLogo';
import { AcademyLogo } from '../../components/common/AcademyLogo';

const GOLD = '#C5A55A';
const GOLD_DARK = '#8B7335';

interface LoginSelectorScreenProps {
  onSelectApp: () => void;
  onSelectAcademy: () => void;
}

export const LoginSelectorScreen: React.FC<LoginSelectorScreenProps> = ({
  onSelectApp,
  onSelectAcademy,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.welcomeText}>Benvenuto</Text>
      <Text style={styles.subtitle}>Scegli dove accedere</Text>

      <View style={styles.cardsRow}>
        {/* ESSĒRE Card */}
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.7}
          onPress={onSelectApp}
        >
          <View style={styles.cardContent}>
            <EnsoLogo size={90} />
            <Text style={styles.cardTitle}>ESSĒRE</Text>
            <Text style={styles.cardDescription}>
              Fitness, Coaching{'\n'}& Benessere
            </Text>
          </View>
          <View style={styles.cardFooter}>
            <Text style={styles.cardFooterText}>Accedi</Text>
            <Text style={styles.cardArrow}>{'→'}</Text>
          </View>
        </TouchableOpacity>

        {/* Academy Card */}
        <TouchableOpacity
          style={[styles.card, styles.academyCard]}
          activeOpacity={0.7}
          onPress={onSelectAcademy}
        >
          <View style={styles.cardContent}>
            <AcademyLogo size={90} />
            <Text style={styles.academyCardTitle}>ACADEMY</Text>
            <Text style={styles.academyCardDescription}>
              Mind Movement{'\n'}Academy
            </Text>
          </View>
          <View style={[styles.cardFooter, styles.academyCardFooter]}>
            <Text style={styles.academyFooterText}>Accedi</Text>
            <Text style={styles.academyArrow}>{'→'}</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  welcomeText: {
    fontSize: fontSize.hero,
    fontWeight: '300',
    color: colors.text,
    letterSpacing: 4,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    letterSpacing: 2,
    marginBottom: spacing.xxl + 8,
  },
  cardsRow: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    gap: spacing.lg,
    width: '100%',
    maxWidth: 560,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    width: Platform.OS === 'web' ? 250 : '100%',
    maxWidth: 280,
    overflow: 'hidden',
    ...shadows.medium,
  },
  academyCard: {
    borderColor: GOLD_DARK,
    borderWidth: 1.5,
  },
  cardContent: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  cardTitle: {
    fontSize: fontSize.xxl,
    fontWeight: '300',
    color: colors.text,
    letterSpacing: 4,
    marginTop: spacing.md,
    fontStyle: 'italic',
  },
  cardDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 16,
    letterSpacing: 1,
  },
  academyCardTitle: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: GOLD,
    letterSpacing: 3,
    marginTop: spacing.md,
  },
  academyCardDescription: {
    fontSize: fontSize.sm,
    color: GOLD_DARK,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 16,
    letterSpacing: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  cardFooterText: {
    color: '#FFFFFF',
    fontSize: fontSize.md,
    fontWeight: '600',
    letterSpacing: 1,
  },
  cardArrow: {
    color: '#FFFFFF',
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
  academyCardFooter: {
    backgroundColor: GOLD_DARK,
  },
  academyFooterText: {
    color: '#FFFFFF',
    fontSize: fontSize.md,
    fontWeight: '600',
    letterSpacing: 1,
  },
  academyArrow: {
    color: '#FFFFFF',
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
});
