import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { crossAlert } from '../../utils/alert';
import { getFirebaseErrorMessage } from '../../utils/helpers';
import { colors, spacing, fontSize, borderRadius } from '../../config/theme';
import { InputField } from '../../components/common/InputField';
import { Button } from '../../components/common/Button';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { registerStudent, getCollaborators, getManagers } from '../../services/authService';
import { Collaborator, Manager } from '../../types';

interface Props {
  onBack: () => void;
}

export const AddStudentScreen: React.FC<Props> = ({ onBack }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [phone, setPhone] = useState('');
  const [goals, setGoals] = useState('');
  const [medicalNotes, setMedicalNotes] = useState('');
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [selectedCollaboratorId, setSelectedCollaboratorId] = useState('');
  const [selectedManagerId, setSelectedManagerId] = useState('');
  const [managerCommission, setManagerCommission] = useState('');
  const [coachCommission, setCoachCommission] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [collabs, mgrs] = await Promise.all([getCollaborators(), getManagers()]);
      setCollaborators(collabs);
      setManagers(mgrs);
      // Include anche i manager come possibili assegnatari diretti
      if (collabs.length > 0) {
        setSelectedCollaboratorId(collabs[0].id);
        setCoachCommission(String(collabs[0].commissionPercentage));
      }
    } catch {
      crossAlert('Errore', 'Impossibile caricare i dati');
    }
  };

  const handleRegister = async () => {
    if (!email.trim() || !password.trim() || !name.trim() || !surname.trim()) {
      crossAlert('Errore', 'Compila tutti i campi obbligatori');
      return;
    }
    if (password.length < 6) {
      crossAlert('Errore', 'La password deve essere di almeno 6 caratteri');
      return;
    }
    if (!selectedCollaboratorId) {
      crossAlert('Errore', 'Seleziona un coach o manager da assegnare');
      return;
    }

    const mgrComm = parseInt(managerCommission, 10) || 0;
    const coachComm = parseInt(coachCommission, 10) || 0;
    if (mgrComm < 0 || mgrComm > 100 || coachComm < 0 || coachComm > 100) {
      crossAlert('Errore', 'Le commissioni devono essere tra 0 e 100');
      return;
    }

    setLoading(true);
    try {
      await registerStudent(
        email.trim(),
        password,
        name.trim(),
        surname.trim(),
        phone.trim(),
        selectedCollaboratorId,
        goals.trim(),
        medicalNotes.trim() || undefined,
        selectedManagerId || undefined,
        mgrComm,
        coachComm
      );
      crossAlert('Successo', `Allievo ${name} ${surname} registrato!`, [
        { text: 'OK', onPress: onBack },
      ]);
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
      <ScreenHeader
        title="Nuovo Allievo"
        subtitle="Crea le credenziali di accesso per l'allievo"
        onBack={onBack}
      />
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

        <View style={styles.form}>
          <InputField
            label="Nome *"
            value={name}
            onChangeText={setName}
            placeholder="Nome dell'allievo"
          />
          <InputField
            label="Cognome *"
            value={surname}
            onChangeText={setSurname}
            placeholder="Cognome dell'allievo"
          />
          <InputField
            label="Email *"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="email@esempio.com"
          />
          <InputField
            label="Password *"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Minimo 6 caratteri"
          />
          <InputField
            label="Telefono"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="Numero di telefono"
          />

          {/* Selezione manager (opzionale) */}
          {managers.length > 0 && (
            <>
              <Text style={styles.fieldLabel}>Manager responsabile</Text>
              <View style={styles.collabList}>
                <TouchableOpacity
                  style={[
                    styles.collabOption,
                    selectedManagerId === '' && styles.collabOptionSelected,
                  ]}
                  onPress={() => { setSelectedManagerId(''); setManagerCommission('0'); }}
                >
                  <Text style={[styles.collabOptionText, selectedManagerId === '' && styles.collabOptionTextSelected]}>
                    Nessun manager
                  </Text>
                </TouchableOpacity>
                {managers.map((mgr) => (
                  <TouchableOpacity
                    key={mgr.id}
                    style={[
                      styles.collabOption,
                      selectedManagerId === mgr.id && styles.collabOptionSelected,
                    ]}
                    onPress={() => {
                      setSelectedManagerId(mgr.id);
                      setManagerCommission(String(mgr.commissionPercentage ?? 10));
                    }}
                  >
                    <Text style={[styles.collabOptionText, selectedManagerId === mgr.id && styles.collabOptionTextSelected]}>
                      {mgr.name} {mgr.surname} (Manager)
                    </Text>
                    <Text style={styles.collabSpecText}>
                      Commissione default: {mgr.commissionPercentage ?? 10}%
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* Selezione coach o manager diretto */}
          <Text style={styles.fieldLabel}>Coach / Manager assegnato *</Text>
          {collaborators.length === 0 && managers.length === 0 ? (
            <Text style={styles.noCollabText}>
              Nessun coach o manager disponibile. Registrane uno prima.
            </Text>
          ) : (
            <View style={styles.collabList}>
              {/* Manager come coach diretto */}
              {managers.map((mgr) => (
                <TouchableOpacity
                  key={`mgr-${mgr.id}`}
                  style={[
                    styles.collabOption,
                    selectedCollaboratorId === mgr.id && styles.collabOptionSelected,
                  ]}
                  onPress={() => {
                    setSelectedCollaboratorId(mgr.id);
                    setCoachCommission(String(mgr.commissionPercentage ?? 10));
                    setSelectedManagerId('');
                    setManagerCommission('0');
                  }}
                >
                  <Text style={[styles.collabOptionText, selectedCollaboratorId === mgr.id && styles.collabOptionTextSelected]}>
                    {mgr.name} {mgr.surname} (Manager - diretto)
                  </Text>
                  <Text style={styles.collabSpecText}>
                    {(mgr.specializations || []).join(', ')} {mgr.commissionPercentage ?? 10}%
                  </Text>
                </TouchableOpacity>
              ))}
              {/* Coach */}
              {collaborators.map((collab) => (
                <TouchableOpacity
                  key={collab.id}
                  style={[
                    styles.collabOption,
                    selectedCollaboratorId === collab.id && styles.collabOptionSelected,
                  ]}
                  onPress={() => {
                    setSelectedCollaboratorId(collab.id);
                    setCoachCommission(String(collab.commissionPercentage));
                  }}
                >
                  <Text
                    style={[
                      styles.collabOptionText,
                      selectedCollaboratorId === collab.id && styles.collabOptionTextSelected,
                    ]}
                  >
                    {collab.name} {collab.surname} (Coach)
                  </Text>
                  <Text style={styles.collabSpecText}>
                    {collab.specializations.join(', ')} {collab.commissionPercentage}%
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Commissioni configurabili */}
          {selectedManagerId !== '' && (
            <InputField
              label="Commissione Manager %"
              value={managerCommission}
              onChangeText={setManagerCommission}
              keyboardType="numeric"
              placeholder="Es: 10"
            />
          )}
          <InputField
            label="Commissione Coach %"
            value={coachCommission}
            onChangeText={setCoachCommission}
            keyboardType="numeric"
            placeholder="Es: 60"
          />

          <InputField
            label="Obiettivi"
            value={goals}
            onChangeText={setGoals}
            placeholder="Es: Dimagrimento, tonificazione, postura..."
            multiline
          />
          <InputField
            label="Note mediche"
            value={medicalNotes}
            onChangeText={setMedicalNotes}
            placeholder="Eventuali patologie, infortuni, allergie..."
            multiline
          />

          <Button
            title="Registra Allievo"
            onPress={handleRegister}
            loading={loading}
            style={styles.submitButton}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.lg,
  },
  header: {
    paddingTop: spacing.xxl,
    marginBottom: spacing.lg,
  },
  backButton: {
    marginBottom: spacing.md,
  },
  backText: {
    color: colors.accent,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  title: {
    fontSize: fontSize.title,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  form: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fieldLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  noCollabText: {
    color: colors.warning,
    fontSize: fontSize.sm,
    padding: spacing.sm,
  },
  collabList: {
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  collabOption: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceLight,
  },
  collabOptionSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.primaryLight,
  },
  collabOptionText: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: '500',
  },
  collabOptionTextSelected: {
    color: colors.accent,
    fontWeight: '700',
  },
  collabSpecText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  submitButton: {
    marginTop: spacing.lg,
  },
});
