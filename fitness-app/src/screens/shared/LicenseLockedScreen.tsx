import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius } from '../../config/theme';
import { brand } from '../../config/brand';

interface Props {
  message?: string;
}

export const LicenseLockedScreen: React.FC<Props> = ({ message }) => (
  <View style={styles.container}>
    <View style={styles.card}>
      <View style={styles.iconCircle}>
        <Ionicons name="lock-closed" size={48} color={colors.warning} />
      </View>
      <Text style={styles.brandName}>{brand.appName}</Text>
      <Text style={styles.title}>Servizio temporaneamente sospeso</Text>
      <Text style={styles.subtitle}>
        {message ||
          "L'accesso all'applicazione è momentaneamente sospeso. Contatta la tua palestra per maggiori informazioni."}
      </Text>
    </View>
    <Text style={styles.footer}>{brand.tagline}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xxl,
    alignItems: 'center',
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.warning + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  brandName: {
    fontSize: fontSize.xxl,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 4,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.warning,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  footer: {
    marginTop: spacing.xl,
    fontSize: fontSize.xs,
    color: colors.textLight,
    letterSpacing: 2,
  },
});
