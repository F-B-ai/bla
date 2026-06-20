import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { colors, spacing, fontSize, borderRadius, shadows } from '../../config/theme';
import { crossAlert } from '../../utils/alert';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { getCollaborators, getStudents, getManagers, getOwner, deleteUser, toggleUserActive, removeStudentFromCollaborator, updateStudentCoaches, updateUserProfile } from '../../services/authService';
import { isStudentAssignedTo, getStudentCoachIds } from '../../utils/helpers';
import { Collaborator, Student, Manager, Owner, CredentialChangeRequest } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { AddCollaboratorScreen } from './AddCollaboratorScreen';
import { AddStudentScreen } from './AddStudentScreen';
import { AddManagerScreen } from './AddManagerScreen';
import { AddNutritionistScreen } from './AddNutritionistScreen';
import { InviteStudentScreen } from './InviteStudentScreen';
import { ProfileScreen } from '../shared/ProfileScreen';
import { Ionicons } from '@expo/vector-icons';
import {
  getPendingRequests,
  approveRequest,
  denyRequest,
} from '../../services/credentialService';
import { createNotification } from '../../services/notificationService';
import { openStudentReport } from '../../services/reportService';

type ViewMode = 'list' | 'addManager' | 'addCollaborator' | 'addNutritionist' | 'addStudent' | 'inviteStudent' | 'editProfile';

export const ManageUsersScreen: React.FC = () => {
  const { isOwner, isManager, isCollaborator, user } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [managers, setManagers] = useState<Manager[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [owner, setOwner] = useState<Owner | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'managers' | 'collaborators' | 'students'>(
    isCollaborator ? 'students' : 'collaborators'
  );
  const [editingUser, setEditingUser] = useState<Student | null>(null);
  const [showCoachModal, setShowCoachModal] = useState(false);
  const [coachModalStudent, setCoachModalStudent] = useState<Student | null>(null);
  const [coachModalSelected, setCoachModalSelected] = useState<string[]>([]);
  const [savingCoaches, setSavingCoaches] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [credentialRequests, setCredentialRequests] = useState<CredentialChangeRequest[]>([]);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTarget, setEditTarget] = useState<(Manager | Collaborator) | null>(null);
  const [editName, setEditName] = useState('');
  const [editSurname, setEditSurname] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editCommission, setEditCommission] = useState('');
  const [editSpecializations, setEditSpecializations] = useState('');
  const [editCollabType, setEditCollabType] = useState<'coach' | 'nutritionist'>('coach');
  const [savingEdit, setSavingEdit] = useState(false);
  const [generatingReport, setGeneratingReport] = useState<string | null>(null);

  // Gerarchia permessi:
  // Owner: crea manager, coach, allievi
  // Manager: crea coach, allievi
  // Coach: crea allievi (solo i propri)
  const canCreateManager = isOwner;
  const canCreateCoach = isOwner;
  const canCreateStudent = isOwner || isManager || isCollaborator;
  const canDeleteUsers = isOwner || isManager;

  const loadData = useCallback(async () => {
    try {
      const [mgrs, collabs, studs, ownerData] = await Promise.all([getManagers(), getCollaborators(), getStudents(), getOwner()]);
      setManagers(mgrs);
      setCollaborators(collabs);
      setOwner(ownerData);
      if (isCollaborator && user) {
        setStudents(studs.filter((s) => isStudentAssignedTo(s, user.id)));
      } else {
        setStudents(studs);
      }
      if (isOwner) {
        const pending = await getPendingRequests().catch(() => []);
        setCredentialRequests(pending);
      }
    } catch {
      // Silently handle - data will show empty
    }
  }, [isCollaborator, isOwner, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleBack = () => {
    setViewMode('list');
    loadData(); // Ricarica dati dopo aggiunta
  };

  const handleToggleActive = async (userId: string, currentActive: boolean, name: string) => {
    const action = currentActive ? 'disattivare' : 'riattivare';
    crossAlert(
      'Conferma',
      `Vuoi ${action} ${name}?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: currentActive ? 'Disattiva' : 'Riattiva',
          style: currentActive ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await toggleUserActive(userId, !currentActive);
              await loadData();
            } catch {
              crossAlert('Errore', 'Impossibile aggiornare lo stato');
            }
          },
        },
      ]
    );
  };

  const handleDeleteUser = async (userId: string, name: string) => {
    crossAlert(
      'Elimina Utente',
      `Sei sicuro di voler eliminare ${name}? Questa azione non può essere annullata.`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: async () => {
            try {
              // Se è uno studente, rimuovilo dalla lista del collaboratore
              const student = students.find((s) => s.id === userId);
              if (student) {
                const coachIds = getStudentCoachIds(student);
                for (const coachId of coachIds) {
                  await removeStudentFromCollaborator(coachId, userId);
                }
              }
              await deleteUser(userId);
              await loadData();
              crossAlert('Fatto', `${name} eliminato`);
            } catch (err: any) {
              console.error('Errore eliminazione utente:', err);
              crossAlert('Errore', `Impossibile eliminare l'utente: ${err?.message || err?.code || JSON.stringify(err)}`);
            }
          },
        },
      ]
    );
  };

  const handleGenerateReport = async (student: Student) => {
    const coachIds = getStudentCoachIds(student);
    const coachNames = coachIds.map((cid) => {
      const c = collaborators.find((co) => co.id === cid);
      if (c) return `${c.name} ${c.surname}`;
      const m = managers.find((mg) => mg.id === cid);
      if (m) return `${m.name} ${m.surname}`;
      if (owner && owner.id === cid) return `${owner.name} ${owner.surname}`;
      return null;
    }).filter(Boolean).join(', ') || 'N/D';

    setGeneratingReport(student.id);
    try {
      await openStudentReport(student, coachNames);
    } catch (err: any) {
      crossAlert('Errore', `Impossibile generare il report: ${err?.message || String(err)}`);
    } finally {
      setGeneratingReport(null);
    }
  };

  const openCoachModal = (student: Student) => {
    setCoachModalStudent(student);
    setCoachModalSelected(getStudentCoachIds(student));
    setShowCoachModal(true);
  };

  const handleSaveCoaches = async () => {
    if (!coachModalStudent) return;
    if (coachModalSelected.length === 0) {
      crossAlert('Errore', 'Seleziona almeno un coach');
      return;
    }
    setSavingCoaches(true);
    try {
      const oldIds = getStudentCoachIds(coachModalStudent);
      await updateStudentCoaches(coachModalStudent.id, coachModalSelected, oldIds);
      crossAlert('Fatto', 'Coach aggiornati');
      setShowCoachModal(false);
      setCoachModalStudent(null);
      await loadData();
    } catch (err: any) {
      crossAlert('Errore', `Impossibile aggiornare: ${err?.message || String(err)}`);
    } finally {
      setSavingCoaches(false);
    }
  };

  const handleApproveRequest = (req: CredentialChangeRequest) => {
    let label: string;
    if (req.requestType === 'email') {
      label = `Approvare il cambio email da ${req.currentEmail} a ${req.newEmail}?`;
    } else if (req.requestType === 'info' && req.newInfo) {
      try {
        const info = JSON.parse(req.newInfo);
        label = `Approvare la modifica dati per ${req.userName} ${req.userSurname}?\n\nNuovi dati: ${info.name} ${info.surname}${info.phone ? ', Tel: ' + info.phone : ''}`;
      } catch { label = `Approvare la modifica dati per ${req.userName} ${req.userSurname}?`; }
    } else {
      label = `Approvare il cambio password per ${req.userName} ${req.userSurname}?`;
    }

    crossAlert('Approva Richiesta', label, [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Approva',
        onPress: async () => {
          setProcessingRequestId(req.id);
          try {
            await approveRequest(req, user!.id);
            createNotification(
              req.userId,
              'custom_alert',
              'Richiesta approvata',
              `La tua richiesta di modifica ${req.requestType === 'email' ? 'email' : req.requestType === 'info' ? 'dati anagrafici' : 'password'} è stata approvata.`
            ).catch(() => {});
            crossAlert('Fatto', 'Richiesta approvata e dati aggiornati.');
            await loadData();
          } catch (err: any) {
            const msg = err?.message || '';
            if (msg.startsWith('VERIFY_SENT:')) {
              crossAlert('Email di Verifica Inviata', msg.replace('VERIFY_SENT: ', ''));
              await loadData();
            } else {
              crossAlert('Errore', msg || 'Impossibile approvare la richiesta.');
            }
          } finally {
            setProcessingRequestId(null);
          }
        },
      },
    ]);
  };

  const handleDenyRequest = (req: CredentialChangeRequest) => {
    crossAlert('Rifiuta Richiesta', `Rifiutare la richiesta di ${req.userName} ${req.userSurname}?`, [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Rifiuta',
        style: 'destructive',
        onPress: async () => {
          setProcessingRequestId(req.id);
          try {
            await denyRequest(req.id, user!.id);
            createNotification(
              req.userId,
              'custom_alert',
              'Richiesta rifiutata',
              `La tua richiesta di modifica ${req.requestType === 'email' ? 'email' : req.requestType === 'info' ? 'dati anagrafici' : 'password'} è stata rifiutata.`
            ).catch(() => {});
            crossAlert('Fatto', 'Richiesta rifiutata.');
            await loadData();
          } catch {
            crossAlert('Errore', 'Impossibile rifiutare la richiesta.');
          } finally {
            setProcessingRequestId(null);
          }
        },
      },
    ]);
  };

  const openEditModal = (userToEdit: Manager | Collaborator) => {
    setEditTarget(userToEdit);
    setEditName(userToEdit.name);
    setEditSurname(userToEdit.surname);
    setEditPhone(userToEdit.phone || '');
    setEditCommission(String(userToEdit.commissionPercentage ?? 0));
    setEditSpecializations((userToEdit.specializations || []).join(', '));
    if (userToEdit.role === 'collaborator') {
      setEditCollabType((userToEdit as Collaborator).collaboratorType || 'coach');
    }
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editTarget) return;
    if (!editName.trim() || !editSurname.trim()) {
      crossAlert('Errore', 'Nome e cognome sono obbligatori.');
      return;
    }
    const commission = Number(editCommission);
    if (isNaN(commission) || commission < 0 || commission > 100) {
      crossAlert('Errore', 'La commissione deve essere un valore tra 0 e 100.');
      return;
    }
    setSavingEdit(true);
    try {
      const updateData: Parameters<typeof updateUserProfile>[1] = {
        name: editName.trim(),
        surname: editSurname.trim(),
        phone: editPhone.trim(),
        commissionPercentage: commission,
        specializations: editSpecializations.split(',').map((s) => s.trim()).filter(Boolean),
      };
      if (editTarget.role === 'collaborator') {
        updateData.collaboratorType = editCollabType;
      }
      await updateUserProfile(editTarget.id, updateData);
      crossAlert('Fatto', 'Dati aggiornati con successo.');
      setShowEditModal(false);
      setEditTarget(null);
      await loadData();
    } catch (err: any) {
      crossAlert('Errore', `Impossibile salvare: ${err?.message || String(err)}`);
    } finally {
      setSavingEdit(false);
    }
  };

  if (viewMode === 'addManager') {
    return <AddManagerScreen onBack={handleBack} />;
  }

  if (viewMode === 'addCollaborator') {
    return <AddCollaboratorScreen onBack={handleBack} />;
  }

  if (viewMode === 'addNutritionist') {
    return <AddNutritionistScreen onBack={handleBack} />;
  }

  if (viewMode === 'addStudent') {
    return <AddStudentScreen onBack={handleBack} />;
  }

  if (viewMode === 'inviteStudent') {
    return <InviteStudentScreen onBack={handleBack} />;
  }

  if (viewMode === 'editProfile' && editingUser) {
    return (
      <ProfileScreen
        targetUserId={editingUser.id}
        targetUser={editingUser}
        onBack={() => {
          setViewMode('list');
          setEditingUser(null);
          loadData();
        }}
      />
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Gestione Utenti</Text>
        <Text style={styles.subtitle}>
          {managers.length} manager · {collaborators.length} coach · {students.length} allievi
        </Text>
      </View>

      {/* Pulsanti azione in base al ruolo */}
      <View style={styles.actions}>
        {canCreateManager && (
          <Button
            title="+ Manager"
            onPress={() => setViewMode('addManager')}
            style={styles.actionButton}
          />
        )}
        {canCreateCoach && (
          <Button
            title="+ Coach"
            onPress={() => setViewMode('addCollaborator')}
            style={styles.actionButton}
          />
        )}
        {canCreateCoach && (
          <Button
            title="+ Nutrizionista"
            onPress={() => setViewMode('addNutritionist')}
            style={styles.actionButton}
          />
        )}
      </View>
      {canCreateStudent && (
        <View style={styles.actions}>
          <Button
            title="+ Allievo"
            onPress={() => setViewMode('addStudent')}
            style={styles.actionButton}
          />
          <Button
            title="Invita Allievo"
            onPress={() => setViewMode('inviteStudent')}
            variant="outline"
            style={styles.actionButton}
          />
        </View>
      )}

      {/* Tab switch */}
      <View style={styles.tabSwitch}>
        {(isOwner || isManager) && (
          <TouchableOpacity
            style={[styles.tab, activeTab === 'managers' && styles.tabActive]}
            onPress={() => setActiveTab('managers')}
          >
            <Text style={[styles.tabText, activeTab === 'managers' && styles.tabTextActive]}>
              Manager ({managers.length})
            </Text>
          </TouchableOpacity>
        )}
        {(isOwner || isManager) && (
          <TouchableOpacity
            style={[styles.tab, activeTab === 'collaborators' && styles.tabActive]}
            onPress={() => setActiveTab('collaborators')}
          >
            <Text style={[styles.tabText, activeTab === 'collaborators' && styles.tabTextActive]}>
              Coach ({collaborators.length})
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.tab, activeTab === 'students' && styles.tabActive]}
          onPress={() => setActiveTab('students')}
        >
          <Text style={[styles.tabText, activeTab === 'students' && styles.tabTextActive]}>
            Allievi ({students.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Barra di ricerca */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={colors.textLight} />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={`Cerca ${activeTab === 'managers' ? 'manager' : activeTab === 'collaborators' ? 'coach' : 'allievo'}...`}
          placeholderTextColor={colors.textLight}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Richieste modifica credenziali (owner only) */}
      {isOwner && credentialRequests.length > 0 && (
        <Card variant="elevated" style={styles.requestsSection}>
          <View style={styles.requestsHeader}>
            <View style={styles.requestsBadge}>
              <Ionicons name="alert-circle" size={18} color={colors.warning} />
              <Text style={styles.requestsTitle}>
                Richieste Modifica Credenziali ({credentialRequests.length})
              </Text>
            </View>
          </View>
          {credentialRequests.map((req) => {
            const isProcessing = processingRequestId === req.id;
            return (
              <View key={req.id} style={styles.requestCard}>
                <View style={styles.requestCardHeader}>
                  <View style={styles.requestCardIcon}>
                    <Ionicons
                      name={req.requestType === 'email' ? 'mail-outline' : req.requestType === 'info' ? 'person-outline' : 'lock-closed-outline'}
                      size={16}
                      color={colors.warning}
                    />
                  </View>
                  <View style={styles.requestCardInfo}>
                    <Text style={styles.requestCardName}>
                      {req.userName} {req.userSurname}
                    </Text>
                    <Text style={styles.requestCardDetail}>
                      {req.requestType === 'email'
                        ? `${req.currentEmail} → ${req.newEmail}`
                        : req.requestType === 'info'
                        ? (() => { try { const info = JSON.parse(req.newInfo || '{}'); return `Modifica dati: ${[info.name && `Nome: ${info.name}`, info.surname && `Cognome: ${info.surname}`, info.phone !== undefined && `Tel: ${info.phone || 'rimosso'}`].filter(Boolean).join(', ')}`; } catch { return 'Modifica dati anagrafici'; } })()
                        : `Cambio password`}
                    </Text>
                  </View>
                </View>
                <View style={styles.requestCardActions}>
                  <TouchableOpacity
                    style={[styles.requestActionBtn, styles.requestApproveBtn]}
                    onPress={() => handleApproveRequest(req)}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="checkmark" size={16} color="#fff" />
                        <Text style={styles.requestActionText}>Approva</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.requestActionBtn, styles.requestDenyBtn]}
                    onPress={() => handleDenyRequest(req)}
                    disabled={isProcessing}
                  >
                    <Ionicons name="close" size={16} color={colors.error} />
                    <Text style={[styles.requestActionText, { color: colors.error }]}>Rifiuta</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </Card>
      )}

      {/* Lista manager */}
      {activeTab === 'managers' && (
        <>
          {managers.length === 0 ? (
            <Card>
              <Text style={styles.emptyText}>
                Nessun manager registrato. Premi "+ Manager" per aggiungerne uno.
              </Text>
            </Card>
          ) : (
            managers.filter((m) => {
              if (!searchQuery.trim()) return true;
              const q = searchQuery.toLowerCase();
              return `${m.name} ${m.surname}`.toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
            }).map((mgr) => {
              const mgrStudents = students.filter(
                (s) => s.assignedManagerId === mgr.id || isStudentAssignedTo(s, mgr.id)
              );
              return (
                <Card key={mgr.id} variant="elevated">
                  <View style={styles.userRow}>
                    <View style={[styles.avatar, styles.avatarManager]}>
                      <Text style={styles.avatarText}>
                        {mgr.name[0]}{mgr.surname[0]}
                      </Text>
                    </View>
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>
                        {mgr.name} {mgr.surname}
                      </Text>
                      <Text style={styles.userEmail}>{mgr.email}</Text>
                      <Text style={styles.userDetail}>
                        {mgr.assignedCollaborators.length} coach · {mgrStudents.length} allievi · {mgr.commissionPercentage ?? 0}% comm.
                      </Text>
                    </View>
                    <View style={[styles.statusDot, mgr.isActive ? styles.statusActive : styles.statusInactive]} />
                  </View>

                  {mgrStudents.length > 0 && (
                    <View style={styles.assignedList}>
                      {mgrStudents.map((s) => (
                        <View key={s.id} style={styles.assignedItem}>
                          <View style={styles.assignedDot} />
                          <Text style={styles.assignedName}>{s.name} {s.surname}</Text>
                          {!s.isActive && (
                            <Text style={styles.assignedInactive}>(disattivato)</Text>
                          )}
                        </View>
                      ))}
                    </View>
                  )}

                  {canDeleteUsers && (
                    <View style={styles.userActions}>
                      <TouchableOpacity
                        style={styles.userActionBtn}
                        onPress={() => openEditModal(mgr)}
                      >
                        <View style={styles.userActionRow}>
                          <Ionicons name="create-outline" size={14} color={colors.info} />
                          <Text style={[styles.userActionText, { color: colors.info }]}>Modifica</Text>
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.userActionBtn}
                        onPress={() => handleToggleActive(mgr.id, mgr.isActive, mgr.name)}
                      >
                        <Text style={[styles.userActionText, { color: mgr.isActive ? colors.warning : colors.success }]}>
                          {mgr.isActive ? 'Disattiva' : 'Riattiva'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.userActionBtn}
                        onPress={() => handleDeleteUser(mgr.id, `${mgr.name} ${mgr.surname}`)}
                      >
                        <Text style={[styles.userActionText, { color: colors.error }]}>Elimina</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </Card>
              );
            })
          )}
        </>
      )}

      {/* Lista collaboratori */}
      {activeTab === 'collaborators' && (
        <>
          {collaborators.length === 0 ? (
            <Card>
              <Text style={styles.emptyText}>
                Nessun collaboratore registrato. Premi "+ Collaboratore" per aggiungerne uno.
              </Text>
            </Card>
          ) : (
            collaborators.filter((c) => {
              if (!searchQuery.trim()) return true;
              const q = searchQuery.toLowerCase();
              return `${c.name} ${c.surname}`.toLowerCase().includes(q) || c.email.toLowerCase().includes(q);
            }).map((collab) => {
              const assignedStudents = students.filter(
                (s) => isStudentAssignedTo(s, collab.id)
              );
              return (
                <Card key={collab.id} variant="elevated">
                  <View style={styles.userRow}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {collab.name[0]}{collab.surname[0]}
                      </Text>
                    </View>
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>
                        {collab.name} {collab.surname}
                      </Text>
                      <Text style={styles.userEmail}>{collab.email}</Text>
                      <Text style={styles.userDetail}>
                        {collab.collaboratorType === 'nutritionist' ? 'Nutrizionista' : 'Coach'} · {collab.specializations.join(', ')} · {collab.commissionPercentage}% commissione
                      </Text>
                      <Text style={styles.userStudents}>
                        {assignedStudents.length} allievi assegnati
                      </Text>
                    </View>
                    <View style={[styles.statusDot, collab.isActive ? styles.statusActive : styles.statusInactive]} />
                  </View>

                  {/* Lista allievi assegnati */}
                  {assignedStudents.length > 0 && (
                    <View style={styles.assignedList}>
                      {assignedStudents.map((s) => (
                        <View key={s.id} style={styles.assignedItem}>
                          <View style={styles.assignedDot} />
                          <Text style={styles.assignedName}>{s.name} {s.surname}</Text>
                          {!s.isActive && (
                            <Text style={styles.assignedInactive}>(disattivato)</Text>
                          )}
                        </View>
                      ))}
                    </View>
                  )}

                  {canDeleteUsers && (
                    <View style={styles.userActions}>
                      <TouchableOpacity
                        style={styles.userActionBtn}
                        onPress={() => openEditModal(collab)}
                      >
                        <View style={styles.userActionRow}>
                          <Ionicons name="create-outline" size={14} color={colors.info} />
                          <Text style={[styles.userActionText, { color: colors.info }]}>Modifica</Text>
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.userActionBtn}
                        onPress={() => handleToggleActive(collab.id, collab.isActive, collab.name)}
                      >
                        <Text style={[styles.userActionText, { color: collab.isActive ? colors.warning : colors.success }]}>
                          {collab.isActive ? 'Disattiva' : 'Riattiva'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.userActionBtn}
                        onPress={() => handleDeleteUser(collab.id, `${collab.name} ${collab.surname}`)}
                      >
                        <Text style={[styles.userActionText, { color: colors.error }]}>Elimina</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </Card>
              );
            })
          )}
        </>
      )}

      {/* Lista allievi */}
      {activeTab === 'students' && (
        <>
          {students.length === 0 ? (
            <Card>
              <Text style={styles.emptyText}>
                Nessun allievo registrato. Premi "+ Allievo" per aggiungerne uno.
              </Text>
            </Card>
          ) : (
            students.filter((s) => {
              if (!searchQuery.trim()) return true;
              const q = searchQuery.toLowerCase();
              return `${s.name} ${s.surname}`.toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
            }).map((student) => {
              const coachIds = getStudentCoachIds(student);
              const coachNames = coachIds.map((cid) => {
                const c = collaborators.find((co) => co.id === cid);
                if (c) return `${c.name} ${c.surname} (Coach)`;
                const m = managers.find((mg) => mg.id === cid);
                if (m) return `${m.name} ${m.surname} (Manager)`;
                if (owner && owner.id === cid) return `${owner.name} ${owner.surname} (Titolare)`;
                return null;
              }).filter(Boolean);
              const coachName = coachNames.length > 0 ? coachNames.join(', ') : null;
              return (
                <Card key={student.id} variant="elevated">
                  <View style={styles.userRow}>
                    <View style={[styles.avatar, styles.avatarStudent]}>
                      <Text style={styles.avatarText}>
                        {student.name[0]}{student.surname[0]}
                      </Text>
                    </View>
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>
                        {student.name} {student.surname}
                      </Text>
                      <Text style={styles.userEmail}>{student.email}</Text>
                      {student.goals && (
                        <Text style={styles.userDetail}>Obiettivi: {student.goals}</Text>
                      )}
                      {coachName && (
                        <Text style={styles.userCollab}>
                          Seguito da: {coachName}
                        </Text>
                      )}
                      {(student.coachCommissionPercentage || student.managerCommissionPercentage) ? (
                        <Text style={styles.userDetail}>
                          Coach: {student.coachCommissionPercentage ?? 0}%
                          {student.managerCommissionPercentage ? ` · Manager: ${student.managerCommissionPercentage}%` : ''}
                        </Text>
                      ) : null}
                    </View>
                    <View style={[styles.statusDot, student.isActive ? styles.statusActive : styles.statusInactive]} />
                  </View>
                  <View style={styles.userActions}>
                    <TouchableOpacity
                      style={styles.userActionBtn}
                      onPress={() => handleGenerateReport(student)}
                      disabled={generatingReport === student.id}
                    >
                      <View style={styles.userActionRow}>
                        {generatingReport === student.id ? (
                          <ActivityIndicator size="small" color={colors.success} />
                        ) : (
                          <Ionicons name="document-text-outline" size={14} color={colors.success} />
                        )}
                        <Text style={[styles.userActionText, { color: colors.success }]}>Report</Text>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.userActionBtn}
                      onPress={() => openCoachModal(student)}
                    >
                      <View style={styles.userActionRow}>
                        <Ionicons name="people-outline" size={14} color={colors.accent} />
                        <Text style={[styles.userActionText, { color: colors.accent }]}>Coach</Text>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.userActionBtn}
                      onPress={() => {
                        setEditingUser(student);
                        setViewMode('editProfile');
                      }}
                    >
                      <View style={styles.userActionRow}>
                        <Ionicons name="create-outline" size={14} color={colors.info} />
                        <Text style={[styles.userActionText, { color: colors.info }]}>Modifica</Text>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.userActionBtn}
                      onPress={() => handleToggleActive(student.id, student.isActive, student.name)}
                    >
                      <Text style={[styles.userActionText, { color: student.isActive ? colors.warning : colors.success }]}>
                        {student.isActive ? 'Disattiva' : 'Riattiva'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.userActionBtn}
                      onPress={() => handleDeleteUser(student.id, `${student.name} ${student.surname}`)}
                    >
                      <Text style={[styles.userActionText, { color: colors.error }]}>Elimina</Text>
                    </TouchableOpacity>
                  </View>
                </Card>
              );
            })
          )}
        </>
      )}

      <View style={styles.bottomSpacer} />

      {/* Modal Gestisci Coach */}
      <Modal
        visible={showCoachModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCoachModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Gestisci Coach
            </Text>
            {coachModalStudent && (
              <Text style={styles.modalSubtitle}>
                {coachModalStudent.name} {coachModalStudent.surname}
              </Text>
            )}
            <Text style={styles.modalHint}>
              Seleziona uno o più coach per questo allievo
            </Text>

            <ScrollView style={styles.modalList}>
              {owner && (
                <TouchableOpacity
                  style={[styles.modalOption, coachModalSelected.includes(owner.id) && styles.modalOptionSelected]}
                  onPress={() => setCoachModalSelected((prev) =>
                    prev.includes(owner.id) ? prev.filter((id) => id !== owner.id) : [...prev, owner.id]
                  )}
                >
                  <Ionicons
                    name={coachModalSelected.includes(owner.id) ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={coachModalSelected.includes(owner.id) ? colors.accent : colors.textSecondary}
                  />
                  <Text style={[styles.modalOptionText, coachModalSelected.includes(owner.id) && styles.modalOptionTextSelected]}>
                    {owner.name} {owner.surname} (Titolare)
                  </Text>
                </TouchableOpacity>
              )}
              {managers.map((mgr) => (
                <TouchableOpacity
                  key={mgr.id}
                  style={[styles.modalOption, coachModalSelected.includes(mgr.id) && styles.modalOptionSelected]}
                  onPress={() => setCoachModalSelected((prev) =>
                    prev.includes(mgr.id) ? prev.filter((id) => id !== mgr.id) : [...prev, mgr.id]
                  )}
                >
                  <Ionicons
                    name={coachModalSelected.includes(mgr.id) ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={coachModalSelected.includes(mgr.id) ? colors.accent : colors.textSecondary}
                  />
                  <Text style={[styles.modalOptionText, coachModalSelected.includes(mgr.id) && styles.modalOptionTextSelected]}>
                    {mgr.name} {mgr.surname} (Manager)
                  </Text>
                </TouchableOpacity>
              ))}
              {collaborators.map((collab) => (
                <TouchableOpacity
                  key={collab.id}
                  style={[styles.modalOption, coachModalSelected.includes(collab.id) && styles.modalOptionSelected]}
                  onPress={() => setCoachModalSelected((prev) =>
                    prev.includes(collab.id) ? prev.filter((id) => id !== collab.id) : [...prev, collab.id]
                  )}
                >
                  <Ionicons
                    name={coachModalSelected.includes(collab.id) ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={coachModalSelected.includes(collab.id) ? colors.accent : colors.textSecondary}
                  />
                  <Text style={[styles.modalOptionText, coachModalSelected.includes(collab.id) && styles.modalOptionTextSelected]}>
                    {collab.name} {collab.surname} ({collab.collaboratorType === 'nutritionist' ? 'Nutrizionista' : 'Coach'})
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.modalSelectedCount}>
              {coachModalSelected.length} coach selezionati
            </Text>

            <TouchableOpacity
              style={[styles.modalSaveBtn, savingCoaches && { opacity: 0.6 }]}
              onPress={handleSaveCoaches}
              disabled={savingCoaches}
            >
              <Text style={styles.modalSaveBtnText}>
                {savingCoaches ? 'Salvataggio...' : 'Salva'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => setShowCoachModal(false)}
            >
              <Text style={styles.modalCancelText}>Annulla</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Modifica Manager/Coach */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Modifica Dati</Text>
            {editTarget && (
              <Text style={styles.modalSubtitle}>
                {editTarget.role === 'collaborator'
                  ? (editTarget as Collaborator).collaboratorType === 'nutritionist'
                    ? 'Nutrizionista'
                    : 'Coach'
                  : 'Manager'}
              </Text>
            )}

            <ScrollView style={styles.editModalScroll} keyboardShouldPersistTaps="handled">
              <Text style={styles.editLabel}>Nome</Text>
              <TextInput
                style={styles.editInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Nome"
                placeholderTextColor={colors.textLight}
              />

              <Text style={styles.editLabel}>Cognome</Text>
              <TextInput
                style={styles.editInput}
                value={editSurname}
                onChangeText={setEditSurname}
                placeholder="Cognome"
                placeholderTextColor={colors.textLight}
              />

              <Text style={styles.editLabel}>Telefono</Text>
              <TextInput
                style={styles.editInput}
                value={editPhone}
                onChangeText={setEditPhone}
                placeholder="Telefono"
                placeholderTextColor={colors.textLight}
                keyboardType="phone-pad"
              />

              <Text style={styles.editLabel}>Commissione %</Text>
              <TextInput
                style={styles.editInput}
                value={editCommission}
                onChangeText={setEditCommission}
                placeholder="0-100"
                placeholderTextColor={colors.textLight}
                keyboardType="numeric"
              />

              <Text style={styles.editLabel}>Specializzazioni (separate da virgola)</Text>
              <TextInput
                style={styles.editInput}
                value={editSpecializations}
                onChangeText={setEditSpecializations}
                placeholder="Es: Forza, CrossFit, Postura"
                placeholderTextColor={colors.textLight}
              />

              {editTarget?.role === 'collaborator' && (
                <>
                  <Text style={styles.editLabel}>Tipo</Text>
                  <View style={styles.editTypeRow}>
                    <TouchableOpacity
                      style={[
                        styles.editTypeBtn,
                        editCollabType === 'coach' && styles.editTypeBtnActive,
                      ]}
                      onPress={() => setEditCollabType('coach')}
                    >
                      <Text
                        style={[
                          styles.editTypeBtnText,
                          editCollabType === 'coach' && styles.editTypeBtnTextActive,
                        ]}
                      >
                        Coach
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.editTypeBtn,
                        editCollabType === 'nutritionist' && styles.editTypeBtnActive,
                      ]}
                      onPress={() => setEditCollabType('nutritionist')}
                    >
                      <Text
                        style={[
                          styles.editTypeBtnText,
                          editCollabType === 'nutritionist' && styles.editTypeBtnTextActive,
                        ]}
                      >
                        Nutrizionista
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </ScrollView>

            <TouchableOpacity
              style={[styles.modalSaveBtn, savingEdit && { opacity: 0.6 }]}
              onPress={handleSaveEdit}
              disabled={savingEdit}
            >
              <Text style={styles.modalSaveBtnText}>
                {savingEdit ? 'Salvataggio...' : 'Salva Modifiche'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => { setShowEditModal(false); setEditTarget(null); }}
            >
              <Text style={styles.modalCancelText}>Annulla</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
    padding: 0,
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
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textLight,
    marginTop: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
  tabSwitch: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xs,
    ...shadows.small,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.md,
  },
  tabActive: {
    backgroundColor: colors.accent,
  },
  tabText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  tabTextActive: {
    color: colors.textOnAccent,
    fontWeight: '700',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.collaboratorBadge,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarManager: {
    backgroundColor: colors.managerBadge,
  },
  avatarStudent: {
    backgroundColor: colors.studentBadge,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  userEmail: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 1,
  },
  userDetail: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    marginTop: 2,
  },
  userStudents: {
    fontSize: fontSize.xs,
    color: colors.collaboratorBadge,
    marginTop: 2,
    fontWeight: '500',
  },
  userCollab: {
    fontSize: fontSize.xs,
    color: colors.collaboratorBadge,
    marginTop: 2,
    fontWeight: '500',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusActive: {
    backgroundColor: colors.success,
  },
  statusInactive: {
    backgroundColor: colors.error,
  },
  assignedList: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  assignedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 3,
    paddingLeft: spacing.sm,
  },
  assignedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.studentBadge,
  },
  assignedName: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: '500',
  },
  assignedInactive: {
    fontSize: fontSize.xs,
    color: colors.error,
    fontStyle: 'italic',
  },
  userActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  userActionBtn: {
    padding: spacing.xs,
  },
  userActionText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  userActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: 'center',
    padding: spacing.md,
  },
  bottomSpacer: {
    height: spacing.xxl,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 420,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: fontSize.md,
    color: colors.accent,
    textAlign: 'center',
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  modalHint: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  modalList: {
    maxHeight: 300,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xs,
  },
  modalOptionSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.primaryLight,
  },
  modalOptionText: {
    fontSize: fontSize.md,
    color: colors.text,
    flex: 1,
  },
  modalOptionTextSelected: {
    color: colors.accent,
    fontWeight: '700',
  },
  modalSelectedCount: {
    fontSize: fontSize.sm,
    color: colors.accent,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: spacing.md,
  },
  modalSaveBtn: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  modalSaveBtnText: {
    color: '#fff',
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  modalCancelBtn: {
    alignItems: 'center',
    marginTop: spacing.md,
    padding: spacing.sm,
  },
  modalCancelText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
  },
  // Credential requests
  requestsSection: {
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.warning + '40',
  },
  requestsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  requestsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  requestsTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
  },
  requestCard: {
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  requestCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  requestCardIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.warning + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  requestCardInfo: {
    flex: 1,
  },
  requestCardName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  requestCardDetail: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  requestCardActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  requestActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  requestApproveBtn: {
    backgroundColor: colors.success,
  },
  requestDenyBtn: {
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.error,
  },
  requestActionText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: '#fff',
  },
  // Edit modal
  editModalScroll: {
    maxHeight: 380,
  },
  editLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  editInput: {
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: fontSize.md,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  editTypeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  editTypeBtn: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
  },
  editTypeBtnActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accent + '15',
  },
  editTypeBtnText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  editTypeBtnTextActive: {
    color: colors.accent,
  },
});
