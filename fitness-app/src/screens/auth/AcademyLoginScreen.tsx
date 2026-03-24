import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { crossAlert } from '../../utils/alert';
import { colors, spacing, fontSize, borderRadius } from '../../config/theme';
import { InputField } from '../../components/common/InputField';
import { useAuth } from '../../hooks/useAuth';
import { resetPassword } from '../../services/authService';
import { AcademyLogo } from '../../components/common/AcademyLogo';

const GOLD = '#C5A55A';
const GOLD_DARK = '#8B7335';
const GOLD_LIGHT = '#E8D5A0';
const ACADEMY_BG = '#0D0D0D';
const ACADEMY_SURFACE = '#141414';

interface AcademyLoginScreenProps {
  onBack: () => void;
}

export const AcademyLoginScreen: React.FC<AcademyLoginScreenProps> = ({ onBack }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const { login, loading, error } = useAuth();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      crossAlert('Errore', 'Inserisci email e password');
      return;
    }
    try {
      await login(email.trim(), password);
    } catch {
      crossAlert('Errore di accesso', 'Credenziali non valide. Riprova.');
    }
  };

  const handleResetPassword = async () => {
    const target = resetEmail.trim() || email.trim();
    if (!target) {
      crossAlert('Errore', 'Inserisci la tua email per recuperare la password');
      return;
    }
    setResetLoading(true);
    try {
      await resetPassword(target);
      crossAlert(
        'Email inviata',
        `Abbiamo inviato un link per reimpostare la password a ${target}. Controlla la tua casella di posta.`
      );
      setShowForgotPassword(false);
      setResetEmail('');
    } catch {
      crossAlert(
        'Errore',
        'Impossibile inviare l\'email di recupero. Verifica che l\'indirizzo sia corretto.'
      );
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back button */}
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>{'← Indietro'}</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <AcademyLogo size={140} />
          <Text style={styles.title}>MIND MOVEMENT</Text>
          <Text style={styles.titleAccent}>ACADEMY</Text>
          <View style={styles.goldLine} />
          <Text style={styles.subtitle}>Formazione & Crescita Professionale</Text>
        </View>

        <View style={styles.form}>
          <InputField
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="la.tua@email.com"
          />

          <InputField
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="La tua password"
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={styles.loginButtonText}>
              {loading ? 'Accesso in corso...' : 'Accedi all\'Academy'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setResetEmail(email);
              setShowForgotPassword(true);
            }}
            style={styles.forgotLink}
          >
            <Text style={styles.forgotText}>Password dimenticata?</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal Password Dimenticata */}
      <Modal
        visible={showForgotPassword}
        transparent
        animationType="fade"
        onRequestClose={() => setShowForgotPassword(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Recupera Password</Text>
            <Text style={styles.modalDescription}>
              Inserisci la tua email e ti invieremo un link per reimpostare la password.
            </Text>

            <InputField
              label="Email"
              value={resetEmail}
              onChangeText={setResetEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="la.tua@email.com"
            />

            <TouchableOpacity
              style={[styles.loginButton, resetLoading && styles.loginButtonDisabled]}
              onPress={handleResetPassword}
              disabled={resetLoading}
              activeOpacity={0.8}
            >
              <Text style={styles.loginButtonText}>
                {resetLoading ? 'Invio in corso...' : 'Invia link di recupero'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowForgotPassword(false)}
              style={styles.cancelLink}
            >
              <Text style={styles.cancelText}>Annulla</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ACADEMY_BG,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  backButton: {
    position: 'absolute',
    top: 0,
    left: 0,
    padding: spacing.md,
  },
  backText: {
    color: GOLD,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '300',
    color: GOLD_LIGHT,
    letterSpacing: 6,
    marginTop: spacing.lg,
  },
  titleAccent: {
    fontSize: fontSize.hero,
    fontWeight: '700',
    color: GOLD,
    letterSpacing: 8,
    marginTop: spacing.xs,
  },
  goldLine: {
    width: 60,
    height: 2,
    backgroundColor: GOLD,
    marginTop: spacing.md,
    borderRadius: 1,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: GOLD_DARK,
    marginTop: spacing.md,
    letterSpacing: 2,
  },
  form: {
    backgroundColor: ACADEMY_SURFACE,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: GOLD_DARK + '40',
  },
  loginButton: {
    backgroundColor: GOLD_DARK,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: fontSize.md,
    fontWeight: '700',
    letterSpacing: 1,
  },
  error: {
    color: colors.error,
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  forgotLink: {
    alignItems: 'center',
    marginTop: spacing.md,
    padding: spacing.xs,
  },
  forgotText: {
    color: GOLD_DARK,
    fontSize: fontSize.sm,
    textDecorationLine: 'underline',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalContent: {
    backgroundColor: ACADEMY_SURFACE,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: GOLD_DARK + '40',
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: GOLD,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  modalDescription: {
    fontSize: fontSize.sm,
    color: GOLD_DARK,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 18,
  },
  cancelLink: {
    alignItems: 'center',
    marginTop: spacing.md,
    padding: spacing.sm,
  },
  cancelText: {
    color: GOLD_DARK,
    fontSize: fontSize.md,
  },
});
