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
import { colors, spacing, fontSize, borderRadius } from '../../config/theme';
import { InputField } from '../../components/common/InputField';
import { Button } from '../../components/common/Button';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { Card } from '../../components/common/Card';
import { createStudentInvite, getCollaborators, getManagers, getOwner, getStudentInvites, StudentInvite } from '../../services/authService';
import { Collaborator, Manager, Owner } from '../../types';
import { useAuth } from '../../hooks/useAuth';

interface Props {
  onBack: () => void;
}

export const InviteStudentScreen: React.FC<Props> = ({ onBack }) => {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [owner, setOwner] = useState<Owner | null>(null);
  const [selectedCollaboratorId, setSelectedCollaboratorId] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [invites, setInvites] = useState<StudentInvite[]>([]);

  // Unisce tutti i possibili assegnatari (owner, manager, coach)
  const allAssignees = [
    ...(owner ? [{ id: owner.id, name: owner.name, surname: owner.surname, label: 'Titolare' }] : []),
    ...managers.map((m) => ({ id: m.id, name: m.name, surname: m.surname, label: 'Manager' })),
    ...collaborators.map((c) => ({ id: c.id, name: c.name, surname: c.surname, label: 'Coach' })),
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [collabs, mgrs, ownerData, allInvites] = await Promise.all([
        getCollaborators(),
        getManagers(),
        getOwner(),
        getStudentInvites(),
      ]);
      setCollaborators(collabs);
      setManagers(mgrs);
      setOwner(ownerData);
      setInvites(allInvites.filter((inv) => !inv.isUsed));
      // Pre-seleziona il primo disponibile
      if (ownerData) {
        setSelectedCollaboratorId(ownerData.id);
      } else if (mgrs.length > 0) {
        setSelectedCollaboratorId(mgrs[0].id);
      } else if (collabs.length > 0) {
        setSelectedCollaboratorId(collabs[0].id);
      }
    } catch {
      // silent
    }
  };

  const handleCreateInvite = async () => {
    if (!name.trim() || !surname.trim()) {
      crossAlert('Errore', 'Inserisci nome e cognome dell\'allievo');
      return;
    }
    if (!selectedCollaboratorId) {
      crossAlert('Errore', 'Seleziona un coach da assegnare');
      return;
    }

    setLoading(true);
    try {
      const selectedAssignee = allAssignees.find((a) => a.id === selectedCollaboratorId);
      const collabName = selectedAssignee ? `${selectedAssignee.name} ${selectedAssignee.surname}` : '';

      const invite = await createStudentInvite(
        email.trim(),
        name.trim(),
        surname.trim(),
        selectedCollaboratorId,
        collabName,
        user?.id || '',
        user ? `${user.name} ${user.surname}` : ''
      );

      setGeneratedCode(invite.inviteCode);
      await loadData();

      crossAlert(
        'Invito Creato!',
        `Codice invito per ${name} ${surname}: ${invite.inviteCode}\n\nComunica questo codice all'allievo per la registrazione.`
      );

      setName('');
      setSurname('');
      setEmail('');
    } catch {
      crossAlert('Errore', 'Impossibile creare l\'invito');
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
        title="Invita Allievo"
        subtitle="Crea un codice invito per un nuovo allievo"
        onBack={onBack}
      />
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.form}>
          <InputField
            label="Nome allievo *"
            value={name}
            onChangeText={setName}
            placeholder="Nome dell'allievo"
          />
          <InputField
            label="Cognome allievo *"
            value={surname}
            onChangeText={setSurname}
            placeholder="Cognome dell'allievo"
          />
          <InputField
            label="Email (opzionale)"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="email dell'allievo"
          />

          <Text style={styles.fieldLabel}>Coach / Manager assegnato *</Text>
          {allAssignees.length === 0 ? (
            <Text style={styles.noCollabText}>
              Nessun coach o manager disponibile. Registrane uno prima.
            </Text>
          ) : (
            <View style={styles.collabList}>
              {allAssignees.map((assignee) => (
                <TouchableOpacity
                  key={assignee.id}
                  style={[
                    styles.collabOption,
                    selectedCollaboratorId === assignee.id && styles.collabOptionSelected,
                  ]}
                  onPress={() => setSelectedCollaboratorId(assignee.id)}
                >
                  <Text
                    style={[
                      styles.collabOptionText,
                      selectedCollaboratorId === assignee.id && styles.collabOptionTextSelected,
                    ]}
                  >
                    {assignee.name} {assignee.surname} ({assignee.label})
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Button
            title="Genera Codice Invito"
            onPress={handleCreateInvite}
            loading={loading}
            style={styles.submitButton}
          />

          {generatedCode ? (
            <View style={styles.codeBox}>
              <Text style={styles.codeLabel}>Ultimo codice generato:</Text>
              <Text style={styles.codeValue}>{generatedCode}</Text>
              <Text style={styles.codeHint}>
                Comunica questo codice all'allievo
              </Text>
            </View>
          ) : null}
        </View>

        {/* Lista inviti pendenti */}
        {invites.length > 0 && (
          <View style={styles.pendingSection}>
            <Text style={styles.sectionTitle}>Inviti pendenti ({invites.length})</Text>
            {invites.map((inv) => (
              <Card key={inv.id} variant="outlined">
                <View style={styles.inviteRow}>
                  <View style={styles.inviteInfo}>
                    <Text style={styles.inviteName}>{inv.name} {inv.surname}</Text>
                    <Text style={styles.inviteDetail}>Coach: {inv.assignedCollaboratorName}</Text>
                    <Text style={styles.inviteDetail}>Creato da: {inv.createdByName}</Text>
                  </View>
                  <View style={styles.inviteCodeBadge}>
                    <Text style={styles.inviteCodeText}>{inv.inviteCode}</Text>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        )}
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
  codeBox: {
    marginTop: spacing.lg,
    backgroundColor: colors.accent + '15',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.accent + '30',
  },
  codeLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  codeValue: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.accent,
    letterSpacing: 6,
  },
  codeHint: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  pendingSection: {
    marginTop: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  inviteRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inviteInfo: {
    flex: 1,
  },
  inviteName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  inviteDetail: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  inviteCodeBadge: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  inviteCodeText: {
    color: colors.textOnAccent,
    fontWeight: '800',
    fontSize: fontSize.md,
    letterSpacing: 2,
  },
});
