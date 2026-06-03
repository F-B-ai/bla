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
import { isValidEmail } from '../../utils/helpers';
import { useAuth } from '../../hooks/useAuth';
import { User, CredentialChangeRequest, BankDetails } from '../../types';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import {
  uploadAvatar,
  getUserProfile,
  getOwner,
  updateUserProfile,
} from '../../services/authService';
import {
  changeOwnEmail,
  changeOwnPasswordAndStore,
  adminChangeUserEmail,
  adminChangeUserPassword,
  getManagedPassword,
  createCredentialRequest,
  getUserRequests,
} from '../../services/credentialService';
import { createNotification } from '../../services/notificationService';

interface ProfileScreenProps {
  targetUserId?: string;
  targetUser?: User;
  onBack?: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ targetUserId, targetUser, onBack }) => {
  const { user, isStudent, isOwner, refreshProfile } = useAuth();

  const isEditingOther = !!targetUserId && targetUserId !== user?.id;
  const [profileUser, setProfileUser] = useState<User | null>(isEditingOther ? targetUser || null : user);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(profileUser?.avatarUrl);
  const [uploading, setUploading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Password visibility (owner only)
  const [managedPassword, setManagedPassword] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);

  // Edit email
  const [editingEmail, setEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [currentPasswordForEmail, setCurrentPasswordForEmail] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);

  // Edit password
  const [editingPassword, setEditingPassword] = useState(false);
  const [currentPasswordForPw, setCurrentPasswordForPw] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // Edit profile info (name/surname/phone)
  const [editingInfo, setEditingInfo] = useState(false);
  const [editName, setEditName] = useState('');
  const [editSurname, setEditSurname] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [savingInfo, setSavingInfo] = useState(false);

  // Bank details (owner only)
  const [bankIban, setBankIban] = useState('');
  const [bankAccountHolder, setBankAccountHolder] = useState('');
  const [bankName, setBankName] = useState('');
  const [savingBank, setSavingBank] = useState(false);
  const [loadingBank, setLoadingBank] = useState(false);

  const canEditInfo = isOwner;
  const needsApproval = !isOwner && !isEditingOther;

  // Request flow (students + staff)
  const [requestType, setRequestType] = useState<'email' | 'password' | 'info' | null>(null);
  const [requestName, setRequestName] = useState('');
  const [requestSurname, setRequestSurname] = useState('');
  const [requestPhone, setRequestPhone] = useState('');
  const [requestNewEmail, setRequestNewEmail] = useState('');
  const [requestNewPassword, setRequestNewPassword] = useState('');
  const [requestConfirmPassword, setRequestConfirmPassword] = useState('');
  const [sendingRequest, setSendingRequest] = useState(false);
  const [myRequests, setMyRequests] = useState<CredentialChangeRequest[]>([]);

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

  // Load managed password for owner
  useEffect(() => {
    if (isOwner && userId) {
      setLoadingPassword(true);
      getManagedPassword(userId).then((pw) => {
        setManagedPassword(pw);
        setLoadingPassword(false);
      }).catch(() => setLoadingPassword(false));
    }
  }, [isOwner, userId]);

  // Load user's own requests (students + staff)
  useEffect(() => {
    if (needsApproval && user) {
      getUserRequests(user.id).then(setMyRequests).catch(() => {});
    }
  }, [needsApproval, user]);

  // Load bank details for owner
  useEffect(() => {
    if (isOwner && userId) {
      setLoadingBank(true);
      getDoc(doc(db, 'users', userId))
        .then((snap) => {
          if (snap.exists()) {
            const data = snap.data();
            const bd = data?.bankDetails as BankDetails | undefined;
            if (bd) {
              setBankIban(bd.iban || '');
              setBankAccountHolder(bd.accountHolder || '');
              setBankName(bd.bankName || '');
            }
          }
        })
        .catch(() => {})
        .finally(() => setLoadingBank(false));
    }
  }, [isOwner, userId]);

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

  // ====== Save profile info (name/surname/phone) ======
  const handleSaveInfo = async () => {
    if (!editName.trim() || !editSurname.trim()) {
      crossAlert('Errore', 'Nome e cognome sono obbligatori.');
      return;
    }
    setSavingInfo(true);
    try {
      await updateUserProfile(userId!, { name: editName, surname: editSurname, phone: editPhone });
      setProfileUser((prev) => prev ? { ...prev, name: editName.trim(), surname: editSurname.trim(), phone: editPhone.trim() } : prev);
      if (!isEditingOther) await refreshProfile();
      setEditingInfo(false);
      crossAlert('Fatto', 'Profilo aggiornato.');
    } catch (err: any) {
      crossAlert('Errore', err?.message || 'Impossibile aggiornare il profilo.');
    } finally {
      setSavingInfo(false);
    }
  };

  // ====== Owner: change email (own or other) ======
  const handleChangeEmail = async () => {
    if (!newEmail.trim()) {
      crossAlert('Errore', 'Inserisci la nuova email.');
      return;
    }
    if (!isValidEmail(newEmail)) {
      crossAlert('Errore', 'Email non valida.');
      return;
    }

    setSavingEmail(true);
    try {
      if (isEditingOther && profileUser) {
        if (!managedPassword) {
          crossAlert('Errore', 'Password gestita non disponibile per questo utente.');
          setSavingEmail(false);
          return;
        }
        await adminChangeUserEmail(profileUser.id, profileUser.email, managedPassword, newEmail.trim());
        setProfileUser({ ...profileUser, email: newEmail.trim() });
      } else {
        if (!currentPasswordForEmail) {
          crossAlert('Errore', 'Inserisci la password attuale.');
          setSavingEmail(false);
          return;
        }
        await changeOwnEmail(currentPasswordForEmail, newEmail.trim());
        await refreshProfile();
      }
      crossAlert('Fatto', 'Email aggiornata con successo.');
      setEditingEmail(false);
      setNewEmail('');
      setCurrentPasswordForEmail('');
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('EMAIL_EXISTS') || msg.includes('già in uso')) {
        crossAlert('Errore', 'Questa email è già in uso.');
      } else if (msg.includes('INVALID_EMAIL')) {
        crossAlert('Errore', 'Email non valida.');
      } else if (err?.code === 'auth/wrong-password' || err?.code === 'auth/invalid-credential') {
        crossAlert('Errore', 'Password attuale non corretta.');
      } else {
        crossAlert('Errore', msg || 'Impossibile aggiornare l\'email.');
      }
    } finally {
      setSavingEmail(false);
    }
  };

  // ====== Owner: change password (own or other) ======
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

    setSavingPassword(true);
    try {
      if (isEditingOther && profileUser) {
        if (!managedPassword) {
          crossAlert('Errore', 'Password gestita non disponibile per questo utente.');
          setSavingPassword(false);
          return;
        }
        await adminChangeUserPassword(profileUser.id, profileUser.email, managedPassword, newPassword);
        setManagedPassword(newPassword);
      } else {
        if (!currentPasswordForPw) {
          crossAlert('Errore', 'Inserisci la password attuale.');
          setSavingPassword(false);
          return;
        }
        await changeOwnPasswordAndStore(currentPasswordForPw, newPassword);
        setManagedPassword(newPassword);
      }
      crossAlert('Fatto', 'Password aggiornata con successo.');
      setEditingPassword(false);
      setNewPassword('');
      setConfirmPassword('');
      setCurrentPasswordForPw('');
    } catch (err: any) {
      const code = err?.code || '';
      const msg = err?.message || '';
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        crossAlert('Errore', 'La password attuale non è corretta.');
      } else if (code === 'auth/weak-password' || msg.includes('troppo debole')) {
        crossAlert('Errore', 'La nuova password è troppo debole.');
      } else {
        crossAlert('Errore', msg || 'Impossibile cambiare la password.');
      }
    } finally {
      setSavingPassword(false);
    }
  };

  // ====== Submit change request (students + staff) ======
  const handleSubmitRequest = async () => {
    if (!user || !profileUser) return;

    if (requestType === 'email') {
      if (!requestNewEmail.trim() || !isValidEmail(requestNewEmail)) {
        crossAlert('Errore', 'Inserisci una email valida.');
        return;
      }
    } else if (requestType === 'password') {
      if (!requestNewPassword || requestNewPassword.length < 6) {
        crossAlert('Errore', 'La password deve avere almeno 6 caratteri.');
        return;
      }
      if (requestNewPassword !== requestConfirmPassword) {
        crossAlert('Errore', 'Le password non coincidono.');
        return;
      }
    } else if (requestType === 'info') {
      if (!requestName.trim() || !requestSurname.trim()) {
        crossAlert('Errore', 'Nome e cognome sono obbligatori.');
        return;
      }
    }

    setSendingRequest(true);
    try {
      let value: string;
      let typeLabel: string;
      if (requestType === 'email') {
        value = requestNewEmail.trim();
        typeLabel = 'email';
      } else if (requestType === 'password') {
        value = requestNewPassword;
        typeLabel = 'password';
      } else {
        value = JSON.stringify({ name: requestName.trim(), surname: requestSurname.trim(), phone: requestPhone.trim() });
        typeLabel = 'dati anagrafici';
      }
      await createCredentialRequest(
        user.id,
        user.name,
        user.surname,
        user.email,
        requestType === 'info' ? 'info' : requestType!,
        value
      );
      getOwner().then((owner) => {
        if (owner) createNotification(
          owner.id,
          'custom_alert',
          'Richiesta modifica credenziali',
          `${user.name} ${user.surname} ha richiesto la modifica di ${typeLabel}. Verifica nella sezione Team.`
        ).catch(() => {});
      }).catch(() => {});
      crossAlert('Fatto', 'Richiesta inviata! Il titolare la esaminerà.');
      setRequestType(null);
      setRequestNewEmail('');
      setRequestNewPassword('');
      setRequestConfirmPassword('');
      setRequestName('');
      setRequestSurname('');
      setRequestPhone('');
      const updated = await getUserRequests(user.id);
      setMyRequests(updated);
    } catch (err: any) {
      crossAlert('Errore', err?.message || 'Impossibile inviare la richiesta.');
    } finally {
      setSendingRequest(false);
    }
  };

  // ====== Save bank details (owner only) ======
  const handleSaveBankDetails = async () => {
    if (!bankIban.trim()) {
      crossAlert('Errore', 'Inserisci l\'IBAN.');
      return;
    }
    if (!bankAccountHolder.trim()) {
      crossAlert('Errore', 'Inserisci l\'intestatario del conto.');
      return;
    }
    setSavingBank(true);
    try {
      await updateDoc(doc(db, 'users', userId!), {
        bankDetails: {
          iban: bankIban.trim(),
          accountHolder: bankAccountHolder.trim(),
          bankName: bankName.trim(),
        },
      });
      crossAlert('Fatto', 'Dati bancari salvati con successo.');
    } catch (err: any) {
      crossAlert('Errore', err?.message || 'Impossibile salvare i dati bancari.');
    } finally {
      setSavingBank(false);
    }
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

  const pendingRequests = myRequests.filter((r) => r.status === 'pending');
  const pastRequests = myRequests.filter((r) => r.status !== 'pending').slice(0, 5);

  return (
    <ScrollView style={styles.container}>
      {isEditingOther && onBack && (
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.6}>
          <Ionicons name="arrow-back" size={24} color={colors.accent} />
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
        {!editingInfo ? (
          <>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nome</Text>
              <View style={styles.infoValueRow}>
                <Text style={styles.infoValue}>{profileUser.name} {profileUser.surname}</Text>
                {(canEditInfo || needsApproval) && (
                  <TouchableOpacity onPress={() => {
                    if (needsApproval) {
                      setRequestName(profileUser.name || '');
                      setRequestSurname(profileUser.surname || '');
                      setRequestPhone(profileUser.phone || '');
                      setRequestType('info');
                    } else {
                      setEditName(profileUser.name || '');
                      setEditSurname(profileUser.surname || '');
                      setEditPhone(profileUser.phone || '');
                      setEditingInfo(true);
                    }
                  }}>
                    <Ionicons name="create-outline" size={18} color={colors.accent} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email</Text>
              <View style={styles.infoValueRow}>
                <Text style={styles.infoValue} numberOfLines={1}>{profileUser.email}</Text>
                {(isOwner || needsApproval) && (
                  <TouchableOpacity onPress={() => {
                    if (needsApproval) {
                      setRequestType('email');
                    } else {
                      setEditingEmail(true);
                      setNewEmail(profileUser.email);
                    }
                  }}>
                    <Ionicons name="create-outline" size={18} color={colors.accent} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Telefono</Text>
              <View style={styles.infoValueRow}>
                <Text style={styles.infoValue}>{profileUser.phone || '-'}</Text>
                {(canEditInfo || needsApproval) && (
                  <TouchableOpacity onPress={() => {
                    if (needsApproval) {
                      setRequestName(profileUser.name || '');
                      setRequestSurname(profileUser.surname || '');
                      setRequestPhone(profileUser.phone || '');
                      setRequestType('info');
                    } else {
                      setEditName(profileUser.name || '');
                      setEditSurname(profileUser.surname || '');
                      setEditPhone(profileUser.phone || '');
                      setEditingInfo(true);
                    }
                  }}>
                    <Ionicons name="create-outline" size={18} color={colors.accent} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={{ ...styles.infoRow, borderBottomWidth: 0 }}>
              <Text style={styles.infoLabel}>Ruolo</Text>
              <Text style={styles.infoValue}>{roleLabel[profileUser.role] || profileUser.role}</Text>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Modifica Dati</Text>
            <InputField label="Nome" value={editName} onChangeText={setEditName} />
            <InputField label="Cognome" value={editSurname} onChangeText={setEditSurname} />
            <InputField label="Telefono" value={editPhone} onChangeText={setEditPhone} keyboardType="phone-pad" />
            <View style={styles.formActions}>
              <Button title="Annulla" onPress={() => setEditingInfo(false)} variant="outline" style={styles.formBtn} />
              <Button title={savingInfo ? 'Salvataggio...' : 'Salva'} onPress={handleSaveInfo} loading={savingInfo} style={styles.formBtn} />
            </View>
          </>
        )}
      </Card>

      {/* Email edit form */}
      {editingEmail && isOwner && (
        <Card variant="elevated">
          <Text style={styles.sectionTitle}>Modifica Email</Text>
          <InputField
            label="Nuova Email"
            value={newEmail}
            onChangeText={setNewEmail}
            placeholder="nuova@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          {!isEditingOther && (
            <InputField
              label="Password attuale"
              secureTextEntry
              value={currentPasswordForEmail}
              onChangeText={setCurrentPasswordForEmail}
              placeholder="Inserisci la tua password"
            />
          )}
          <View style={styles.formActions}>
            <Button
              title="Annulla"
              onPress={() => { setEditingEmail(false); setNewEmail(''); setCurrentPasswordForEmail(''); }}
              variant="outline"
              style={styles.formBtn}
            />
            <Button
              title={savingEmail ? 'Salvataggio...' : 'Salva'}
              onPress={handleChangeEmail}
              loading={savingEmail}
              style={styles.formBtn}
            />
          </View>
        </Card>
      )}

      {/* Password section */}
      <Card variant="elevated">
        <Text style={styles.sectionTitle}>Password</Text>

        {/* Owner: show stored password */}
        {isOwner && (
          <View style={styles.passwordDisplay}>
            <Text style={styles.passwordLabel}>Password attuale:</Text>
            {loadingPassword ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : managedPassword ? (
              <View style={styles.passwordValueRow}>
                <Text style={styles.passwordValue}>
                  {showPassword ? managedPassword : '••••••••'}
                </Text>
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={styles.passwordNotAvailable}>Non disponibile</Text>
            )}
          </View>
        )}

        {/* Owner: change password form */}
        {isOwner && !editingPassword && (
          <Button
            title="Cambia Password"
            onPress={() => setEditingPassword(true)}
            variant="outline"
          />
        )}

        {isOwner && editingPassword && (
          <View>
            {!isEditingOther && (
              <InputField
                label="Password attuale"
                secureTextEntry
                value={currentPasswordForPw}
                onChangeText={setCurrentPasswordForPw}
                placeholder="Inserisci password attuale"
              />
            )}
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
            <View style={styles.formActions}>
              <Button
                title="Annulla"
                onPress={() => {
                  setEditingPassword(false);
                  setCurrentPasswordForPw('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                variant="outline"
                style={styles.formBtn}
              />
              <Button
                title={savingPassword ? 'Salvataggio...' : 'Salva'}
                onPress={handleChangePassword}
                loading={savingPassword}
                style={styles.formBtn}
              />
            </View>
          </View>
        )}

        {/* Non-owner: request password change button */}
        {needsApproval && (
          <Button
            title="Richiedi Cambio Password"
            onPress={() => setRequestType('password')}
            variant="outline"
          />
        )}
      </Card>

      {/* Non-owner: request form */}
      {needsApproval && requestType && (
        <Card variant="elevated">
          <Text style={styles.sectionTitle}>
            {requestType === 'email' ? 'Richiesta Cambio Email' : requestType === 'password' ? 'Richiesta Cambio Password' : 'Richiesta Modifica Dati'}
          </Text>
          <Text style={styles.requestHint}>
            La tua richiesta verrà inviata al titolare per approvazione.
          </Text>

          {requestType === 'email' ? (
            <InputField
              label="Nuova Email"
              value={requestNewEmail}
              onChangeText={setRequestNewEmail}
              placeholder="nuova@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          ) : requestType === 'password' ? (
            <>
              <InputField
                label="Nuova Password"
                secureTextEntry
                value={requestNewPassword}
                onChangeText={setRequestNewPassword}
                placeholder="Minimo 6 caratteri"
              />
              <InputField
                label="Conferma Nuova Password"
                secureTextEntry
                value={requestConfirmPassword}
                onChangeText={setRequestConfirmPassword}
                placeholder="Ripeti nuova password"
              />
            </>
          ) : (
            <>
              <InputField label="Nome" value={requestName} onChangeText={setRequestName} />
              <InputField label="Cognome" value={requestSurname} onChangeText={setRequestSurname} />
              <InputField label="Telefono" value={requestPhone} onChangeText={setRequestPhone} keyboardType="phone-pad" />
            </>
          )}

          <View style={styles.formActions}>
            <Button
              title="Annulla"
              onPress={() => {
                setRequestType(null);
                setRequestNewEmail('');
                setRequestNewPassword('');
                setRequestConfirmPassword('');
                setRequestName('');
                setRequestSurname('');
                setRequestPhone('');
              }}
              variant="outline"
              style={styles.formBtn}
            />
            <Button
              title={sendingRequest ? 'Invio...' : 'Invia Richiesta'}
              onPress={handleSubmitRequest}
              loading={sendingRequest}
              style={styles.formBtn}
            />
          </View>
        </Card>
      )}

      {/* Non-owner: pending requests */}
      {needsApproval && pendingRequests.length > 0 && (
        <Card variant="elevated">
          <Text style={styles.sectionTitle}>Richieste in Attesa</Text>
          {pendingRequests.map((req) => (
            <View key={req.id} style={styles.requestItem}>
              <View style={styles.requestIcon}>
                <Ionicons
                  name={req.requestType === 'email' ? 'mail-outline' : req.requestType === 'info' ? 'person-outline' : 'lock-closed-outline'}
                  size={16}
                  color={colors.warning}
                />
              </View>
              <View style={styles.requestInfo}>
                <Text style={styles.requestTitle}>
                  {req.requestType === 'email'
                    ? `Cambio email → ${req.newEmail}`
                    : req.requestType === 'info'
                    ? 'Modifica dati anagrafici'
                    : 'Cambio password'}
                </Text>
                <Text style={styles.requestStatus}>In attesa di approvazione</Text>
              </View>
            </View>
          ))}
        </Card>
      )}

      {/* Non-owner: past requests */}
      {needsApproval && pastRequests.length > 0 && (
        <Card variant="elevated">
          <Text style={styles.sectionTitle}>Storico Richieste</Text>
          {pastRequests.map((req) => {
            const isApproved = req.status === 'approved';
            return (
              <View key={req.id} style={styles.requestItem}>
                <View style={styles.requestIcon}>
                  <Ionicons
                    name={isApproved ? 'checkmark-circle' : 'close-circle'}
                    size={16}
                    color={isApproved ? colors.success : colors.error}
                  />
                </View>
                <View style={styles.requestInfo}>
                  <Text style={styles.requestTitle}>
                    {req.requestType === 'email'
                      ? `Cambio email → ${req.newEmail}`
                      : req.requestType === 'info'
                      ? 'Modifica dati anagrafici'
                      : 'Cambio password'}
                  </Text>
                  <Text style={{
                    ...styles.requestStatus,
                    color: isApproved ? colors.success : colors.error,
                  }}>
                    {isApproved ? 'Approvata' : 'Rifiutata'}
                    {req.denialReason ? ` - ${req.denialReason}` : ''}
                  </Text>
                </View>
              </View>
            );
          })}
        </Card>
      )}

      {/* Owner: bank details */}
      {isOwner && !isEditingOther && (
        <Card variant="elevated">
          <Text style={styles.sectionTitle}>Dati Bancari</Text>
          <Text style={styles.bankHint}>
            Questi dati verranno mostrati agli allievi per il pagamento tramite bonifico.
          </Text>
          {loadingBank ? (
            <ActivityIndicator size="small" color={colors.accent} style={{ marginVertical: spacing.md }} />
          ) : (
            <>
              <InputField
                label="IBAN"
                value={bankIban}
                onChangeText={setBankIban}
                placeholder="IT60X0542811101000000123456"
                autoCapitalize="characters"
              />
              <InputField
                label="Intestatario"
                value={bankAccountHolder}
                onChangeText={setBankAccountHolder}
                placeholder="Nome e cognome intestatario"
              />
              <InputField
                label="Nome Banca"
                value={bankName}
                onChangeText={setBankName}
                placeholder="Es. Intesa Sanpaolo"
              />
              <Button
                title={savingBank ? 'Salvataggio...' : 'Salva Dati Bancari'}
                onPress={handleSaveBankDetails}
                loading={savingBank}
              />
            </>
          )}
        </Card>
      )}

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
    paddingTop: 60,
    paddingBottom: spacing.md,
    gap: spacing.sm,
    minHeight: 48,
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
  infoValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 1,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },

  // Password display
  passwordDisplay: {
    marginBottom: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.lg,
  },
  passwordLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  passwordValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  passwordValue: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
  passwordNotAvailable: {
    fontSize: fontSize.sm,
    color: colors.textLight,
    fontStyle: 'italic',
  },

  // Forms
  formActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  formBtn: {
    flex: 1,
  },

  // Student requests
  requestHint: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    backgroundColor: colors.surfaceLight,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  requestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  requestIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  requestInfo: {
    flex: 1,
  },
  requestTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  requestStatus: {
    fontSize: fontSize.xs,
    color: colors.warning,
    marginTop: 2,
  },

  bankHint: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    backgroundColor: colors.surfaceLight,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
  },
  bottomSpacer: {
    height: spacing.xxl * 2,
  },
});
