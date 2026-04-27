import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, fontSize, borderRadius, shadows } from '../../config/theme';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { InputField } from '../../components/common/InputField';
import { crossAlert } from '../../utils/alert';
import { useAuth } from '../../hooks/useAuth';
import { User } from '../../types';
import {
  uploadAvatar,
  changeOwnPassword,
  sendStudentPasswordReset,
  getUserProfile,
} from '../../services/authService';

interface ProfileScreenProps {
  targetUserId?: string;
  targetUser?: User;
  onBack?: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ targetUserId, targetUser, onBack }) => {
  const { user, isStudent, refreshProfile } = useAuth();

  const isEditingOther = !!targetUserId && targetUserId !== user?.id;
  const [profileUser, setProfileUser] = useState<User | null>(isEditingOther ? targetUser || null : user);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(profileUser?.avatarUrl);
  const [uploading, setUploading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const userId = isEditingOther ? targetUserId! : user?.id;

  useEffect(() => {
    if (isEditingOther && targetUserId && !targetUser) {
      setLoadingProfile(true);
      getUserProfile(targetUserId).then((p) => {
        setProfileUser(p);
        setAvatarUrl(p?.avatarUrl);
        setLoadingProfile(false);
      });
    }
  }, [isEditingOther, targetUserId, targetUser]);

  useEffect(() => {
    if (!isEditingOther && user) {
      setProfileUser(user);
      setAvatarUrl(user.avatarUrl);
    }
  }, [user, isEditingOther]);

  const pickImage = useCallback(async () => {
    if (!userId) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      crossAlert('Permesso negato', 'Serve il permesso per accedere alla galleria.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (result.canceled) return;

    const uri = result.assets[0].uri;
    setUploading(true);
    try {
      const downloadUrl = await uploadAvatar(userId, uri);
      setAvatarUrl(downloadUrl);
      if (!isEditingOther) await refreshProfile();
      crossAlert('Fatto', 'Foto profilo aggiornata.');
    } catch (err) {
      console.error('Errore upload avatar:', err);
      crossAlert('Errore', 'Impossibile caricare la foto. Riprova.');
    } finally {
      setUploading(false);
    }
  }, [userId, isEditingOther, refreshProfile]);

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      crossAlert('Errore', 'Compila tutti i campi.');
      return;
    }
    if (newPassword.length < 6) {
      crossAlert('Errore', 'La nuova password deve avere almeno 6 caratteri.');
      return;
    }
    if (newPassword !== confirmPassword) {
      crossAlert('Errore', 'Le password non coincidono.');
      return;
    }
    if (!isEditingOther && !currentPassword) {
      crossAlert('Errore', 'Inserisci la password attuale.');
      return;
    }

    setChangingPassword(true);
    try {
      await changeOwnPassword(currentPassword, newPassword);
      setShowPasswordForm(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      crossAlert('Fatto', 'Password aggiornata con successo.');
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        crossAlert('Errore', 'La password attuale non è corretta.');
      } else if (code === 'auth/weak-password') {
        crossAlert('Errore', 'La nuova password è troppo debole.');
      } else {
        crossAlert('Errore', 'Impossibile cambiare la password. Riprova.');
      }
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSendResetEmail = () => {
    if (!profileUser?.email) return;
    crossAlert(
      'Reset Password',
      `Inviare un'email di reset password a ${profileUser.email}?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Invia',
          onPress: async () => {
            try {
              await sendStudentPasswordReset(profileUser.email);
              crossAlert('Fatto', `Email di reset inviata a ${profileUser.email}.`);
            } catch {
              crossAlert('Errore', 'Impossibile inviare email di reset.');
            }
          },
        },
      ]
    );
  };

  if (loadingProfile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!profileUser) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.emptyText}>Utente non trovato</Text>
      </View>
    );
  }

  const roleLabel: Record<string, string> = {
    owner: 'Titolare',
    manager: 'Manager',
    collaborator: 'Coach',
    student: 'Allievo',
    academy_student: 'Studente Academy',
  };

  return (
    <ScrollView style={styles.container}>
      {isEditingOther && onBack && (
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Ionicons name="arrow-back" size={22} color={colors.accent} />
          <Text style={styles.backText}>Indietro</Text>
        </TouchableOpacity>
      )}

      <View style={styles.header}>
        <Text style={styles.title}>
          {isEditingOther ? `Profilo di ${profileUser.name}` : 'Il Mio Profilo'}
        </Text>
      </View>

      {/* Avatar */}
      <Card variant="elevated">
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={pickImage} disabled={uploading} style={styles.avatarWrapper}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitials}>
                  {profileUser.name?.[0]}{profileUser.surname?.[0]}
                </Text>
              </View>
            )}
            {uploading ? (
              <View style={styles.avatarOverlay}>
                <ActivityIndicator size="small" color="#fff" />
              </View>
            ) : (
              <View style={styles.cameraIcon}>
                <Ionicons name="camera" size={18} color="#fff" />
              </View>
            )}
          </TouchableOpacity>
          <Text style={styles.avatarHint}>Tocca per cambiare la foto</Text>
        </View>
      </Card>

      {/* Info utente */}
      <Card variant="elevated">
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Nome</Text>
          <Text style={styles.infoValue}>{profileUser.name} {profileUser.surname}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Email</Text>
          <Text style={styles.infoValue}>{profileUser.email}</Text>
        </View>
        {profileUser.phone ? (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Telefono</Text>
            <Text style={styles.infoValue}>{profileUser.phone}</Text>
          </View>
        ) : null}
        <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
          <Text style={styles.infoLabel}>Ruolo</Text>
          <Text style={styles.infoValue}>{roleLabel[profileUser.role] || profileUser.role}</Text>
        </View>
      </Card>

      {/* Password section */}
      <Card variant="elevated">
        <Text style={styles.sectionTitle}>Password</Text>

        {isEditingOther ? (
          <Button
            title="Invia Email Reset Password"
            onPress={handleSendResetEmail}
            variant="outline"
          />
        ) : showPasswordForm ? (
          <View>
            <InputField
              label="Password attuale"
              secureTextEntry
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Inserisci password attuale"
            />
            <InputField
              label="Nuova password"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Minimo 6 caratteri"
            />
            <InputField
              label="Conferma nuova password"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Ripeti nuova password"
            />
            <View style={styles.passwordActions}>
              <Button
                title="Annulla"
                onPress={() => {
                  setShowPasswordForm(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                variant="outline"
                style={styles.passwordBtn}
              />
              <Button
                title={changingPassword ? 'Salvataggio...' : 'Salva'}
                onPress={handleChangePassword}
                disabled={changingPassword}
                style={styles.passwordBtn}
              />
            </View>
          </View>
        ) : (
          <Button
            title="Cambia Password"
            onPress={() => setShowPasswordForm(true)}
            variant="outline"
          />
        )}
      </Card>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.xs,
  },
  backText: {
    color: colors.accent,
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  header: {
    backgroundColor: colors.primary,
    padding: spacing.lg,
    paddingTop: spacing.xxl,
    borderBottomLeftRadius: borderRadius.xl,
    borderBottomRightRadius: borderRadius.xl,
  },
  title: {
    fontSize: fontSize.title,
    fontWeight: '700',
    color: colors.textOnPrimary,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  avatarWrapper: {
    position: 'relative',
    width: 110,
    height: 110,
    borderRadius: 55,
  },
  avatarImage: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: colors.accent,
  },
  avatarPlaceholder: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: colors.surfaceLight,
    borderWidth: 3,
    borderColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.accent,
  },
  avatarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 55,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.small,
  },
  avatarHint: {
    color: colors.textLight,
    fontSize: fontSize.sm,
    marginTop: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  infoLabel: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  passwordActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  passwordBtn: {
    flex: 1,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
  },
  bottomSpacer: {
    height: spacing.xxl * 2,
  },
});
