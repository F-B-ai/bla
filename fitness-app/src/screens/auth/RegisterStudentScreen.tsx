import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { crossAlert } from '../../utils/alert';
import { getFirebaseErrorMessage } from '../../utils/helpers';
import { colors, spacing, fontSize, borderRadius } from '../../config/theme';
import { InputField } from '../../components/common/InputField';
import { Button } from '../../components/common/Button';
import { validateInviteCode, registerStudentWithInvite, StudentInvite } from '../../services/authService';

interface Props {
  onBack: () => void;
}

export const RegisterStudentScreen: React.FC<Props> = ({ onBack }) => {
  const [step, setStep] = useState<'invite' | 'register'>('invite');
  const [inviteCode, setInviteCode] = useState('');
  const [invite, setInvite] = useState<StudentInvite | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [goals, setGoals] = useState('');
  const [loading, setLoading] = useState(false);

  const handleValidateCode = async () => {
    if (!inviteCode.trim()) {
      crossAlert('Errore', 'Inserisci il codice invito ricevuto dal tuo coach o manager');
      return;
    }

    setLoading(true);
    try {
      const foundInvite = await validateInviteCode(inviteCode.trim());
      if (!foundInvite) {
        crossAlert('Codice non valido', 'Il codice invito non è valido o è già stato utilizzato. Contatta il tuo coach o manager.');
        return;
      }
      setInvite(foundInvite);
      setStep('register');
    } catch {
      crossAlert('Errore', 'Impossibile verificare il codice. Riprova.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!email.trim() || !password.trim()) {
      crossAlert('Errore', 'Compila email e password');
      return;
    }
    if (password.length < 6) {
      crossAlert('Errore', 'La password deve essere di almeno 6 caratteri');
      return;
    }
    if (password !== confirmPassword) {
      crossAlert('Errore', 'Le password non corrispondono');
      return;
    }

    setLoading(true);
    try {
      await registerStudentWithInvite(
        inviteCode.trim().toUpperCase(),
        email.trim(),
        password,
        phone.trim(),
        goals.trim()
      );
      // Dopo la registrazione l'utente e' automaticamente loggato via onAuthStateChanged
    } catch (err: unknown) {
      crossAlert('Errore', getFirebaseErrorMessage(err));
    } finally {
      setLoading(false);
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
        <View style={styles.header}>
          <Text style={styles.title}>ESSĒRE</Text>
          <Text style={styles.subtitle}>Registrazione Allievo</Text>
        </View>

        {step === 'invite' ? (
          <View style={styles.form}>
            <Text style={styles.infoText}>
              Per registrarti hai bisogno del codice invito che ti è stato fornito dal tuo coach o manager.
            </Text>

            <InputField
              label="Codice Invito *"
              value={inviteCode}
              onChangeText={(text) => setInviteCode(text.toUpperCase())}
              placeholder="Es: ABC123"
              autoCapitalize="characters"
            />

            <Button
              title="Verifica Codice"
              onPress={handleValidateCode}
              loading={loading}
              style={styles.registerButton}
            />
          </View>
        ) : (
          <View style={styles.form}>
            <View style={styles.inviteInfo}>
              <Text style={styles.inviteInfoTitle}>Invito verificato!</Text>
              <Text style={styles.inviteInfoText}>
                Benvenuto/a {invite?.name} {invite?.surname}
              </Text>
              <Text style={styles.inviteInfoText}>
                Coach assegnato: {invite?.assignedCollaboratorName}
              </Text>
            </View>

            <InputField
              label="Email *"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="la.tua@email.com"
            />
            <InputField
              label="Password *"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="Minimo 6 caratteri"
            />
            <InputField
              label="Conferma Password *"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              placeholder="Ripeti la password"
            />
            <InputField
              label="Telefono"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="Il tuo numero"
            />
            <InputField
              label="Obiettivi"
              value={goals}
              onChangeText={setGoals}
              placeholder="Es: Dimagrimento, tonificazione..."
              multiline
            />

            <Button
              title="Registrati"
              onPress={handleRegister}
              loading={loading}
              style={styles.registerButton}
            />

            <TouchableOpacity
              onPress={() => {
                setStep('invite');
                setInvite(null);
              }}
              style={styles.changeCodeLink}
            >
              <Text style={styles.changeCodeText}>Cambia codice invito</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity onPress={onBack} style={styles.backLink}>
          <Text style={styles.backText}>Hai già un account? Accedi</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.hero,
    fontWeight: '300',
    color: colors.textOnPrimary,
    letterSpacing: 8,
  },
  subtitle: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    letterSpacing: 2,
  },
  form: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  inviteInfo: {
    backgroundColor: colors.success + '15',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.success + '30',
  },
  inviteInfoTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.success,
    marginBottom: spacing.xs,
  },
  inviteInfoText: {
    fontSize: fontSize.md,
    color: colors.text,
    marginTop: 2,
  },
  registerButton: {
    marginTop: spacing.md,
  },
  changeCodeLink: {
    alignItems: 'center',
    marginTop: spacing.md,
    padding: spacing.xs,
  },
  changeCodeText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    textDecorationLine: 'underline',
  },
  backLink: {
    alignItems: 'center',
    marginTop: spacing.lg,
    padding: spacing.sm,
  },
  backText: {
    color: colors.accent,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
});
