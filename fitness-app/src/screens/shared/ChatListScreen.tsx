import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  ScrollView,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius, shadows } from '../../config/theme';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { ModalHeader } from '../../components/common/ModalHeader';
import { ChatRoom, User, Student, Collaborator } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import {
  getUserChatRooms,
  getAllChatRooms,
  createChatRoom,
  subscribeToUserChatRooms,
  subscribeToAllChatRooms,
  subscribeToPresence,
  deleteChatRoom,
} from '../../services/chatService';
import { getUserProfile, getStudents, getCollaborators, getManagers } from '../../services/authService';
import { isStudentAssignedTo, getStudentCoachIds } from '../../utils/helpers';
import { ChatConversationScreen } from './ChatConversationScreen';
import { crossAlert } from '../../utils/alert';

export const ChatListScreen: React.FC = () => {
  const { user, isOwner, isManager, isCollaborator, isStudent } = useAuth();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [participants, setParticipants] = useState<Record<string, User>>({});
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [availableContacts, setAvailableContacts] = useState<User[]>([]);
  const [creatingChat, setCreatingChat] = useState(false);
  const [presence, setPresence] = useState<Record<string, { isOnline: boolean; lastSeen: Date | null }>>({});
  const [searchQuery, setSearchQuery] = useState('');

  const loadParticipantProfiles = useCallback(async (_chatRooms: ChatRoom[]) => {
    try {
      const [students, collaborators, managers] = await Promise.allSettled([
        getStudents(),
        getCollaborators(),
        getManagers(),
      ]);
      const profiles: Record<string, User> = {};
      const addAll = (list: User[]) => list.forEach((u) => { profiles[u.id] = u; });
      if (students.status === 'fulfilled') addAll(students.value);
      if (collaborators.status === 'fulfilled') addAll(collaborators.value);
      if (managers.status === 'fulfilled') addAll(managers.value);
      if (user) profiles[user.id] = user;
      setParticipants(profiles);
    } catch {
      // fallback: load individually
      const userIds = new Set<string>();
      _chatRooms.forEach((room) => {
        if (room.participants) room.participants.forEach((id) => { if (id) userIds.add(id); });
        if (room.studentId) userIds.add(room.studentId);
        if (room.collaboratorId) userIds.add(room.collaboratorId);
      });
      const profiles: Record<string, User> = {};
      await Promise.allSettled(
        Array.from(userIds).map(async (id) => {
          try {
            const profile = await getUserProfile(id);
            if (profile) profiles[id] = profile;
          } catch { /* skip */ }
        })
      );
      setParticipants((prev) => ({ ...prev, ...profiles }));
    }
  }, [user]);

  const loadRooms = useCallback(async () => {
    if (!user) return;
    try {
      const chatRooms = isOwner
        ? await getAllChatRooms()
        : await getUserChatRooms(user.id);
      setRooms(chatRooms);
      await loadParticipantProfiles(chatRooms);
    } catch {
      // Silently handle
    }
  }, [user, isOwner, loadParticipantProfiles]);

  // Listener real-time per aggiornare la lista chat automaticamente
  useEffect(() => {
    if (!user) return;

    const handleRoomsUpdate = (chatRooms: ChatRoom[]) => {
      setRooms(chatRooms);
      loadParticipantProfiles(chatRooms);
    };

    const unsubscribe = isOwner
      ? subscribeToAllChatRooms(handleRoomsUpdate)
      : subscribeToUserChatRooms(user.id, handleRoomsUpdate);

    return () => unsubscribe();
  }, [user, isOwner, loadParticipantProfiles]);

  // Sottoscrizione presenza online dei partecipanti
  useEffect(() => {
    if (!user || rooms.length === 0) return;

    const otherIds = new Set<string>();
    rooms.forEach((room) => {
      room.participants.forEach((id) => {
        if (id !== user.id) otherIds.add(id);
      });
    });

    if (otherIds.size === 0) return;

    const unsubscribe = subscribeToPresence(Array.from(otherIds), setPresence);
    return () => unsubscribe();
  }, [user, rooms]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRooms();
    setRefreshing(false);
  };

  const handleNewChat = async () => {
    if (!user) return;
    try {
      if (isCollaborator || isManager) {
        // Collaboratore/Manager: mostra i propri allievi
        const allStudents = await getStudents();
        const myStudents = allStudents.filter(
          (s) => (isStudentAssignedTo(s, user.id) || (isManager && s.assignedManagerId === user.id)) && s.isActive
        );
        setAvailableContacts(myStudents);
      } else if (isStudent) {
        // Allievo: mostra il suo collaboratore assegnato
        const studentProfile = user as unknown as Student;
        const coachIds = getStudentCoachIds(studentProfile);
        if (coachIds.length > 0) {
          const coaches = await Promise.all(coachIds.map((id) => getUserProfile(id)));
          setAvailableContacts(coaches.filter(Boolean) as any[]);
        } else {
          setAvailableContacts([]);
        }
      } else if (isOwner) {
        // Owner: mostra tutti collaboratori, manager e allievi
        const [allStudents, allCollaborators, allManagers] = await Promise.all([
          getStudents(),
          getCollaborators(),
          getManagers(),
        ]);
        setAvailableContacts([
          ...allManagers.filter((m) => m.isActive && m.id !== user.id),
          ...allCollaborators.filter((c) => c.isActive),
          ...allStudents.filter((s) => s.isActive),
        ]);
      }
      setShowNewChatModal(true);
    } catch {
      crossAlert('Errore', 'Impossibile caricare i contatti');
    }
  };

  const handleStartChat = async (contact: User) => {
    if (!user) return;
    setCreatingChat(true);
    try {
      let studentId: string;
      let collaboratorId: string;

      if (isStudent) {
        studentId = user.id;
        collaboratorId = contact.id;
      } else if (isCollaborator || isManager) {
        studentId = contact.id;
        collaboratorId = user.id;
      } else {
        // Owner: chat diretta con il contatto selezionato
        if (contact.role === 'student') {
          studentId = contact.id;
          collaboratorId = user.id;
        } else {
          studentId = user.id;
          collaboratorId = contact.id;
        }
      }

      const roomId = await createChatRoom(studentId, collaboratorId);
      setShowNewChatModal(false);
      await loadRooms();

      // Apri direttamente la conversazione appena creata
      const updatedRooms = isOwner
        ? await getAllChatRooms()
        : await getUserChatRooms(user.id);
      const newRoom = updatedRooms.find((r) => r.id === roomId);
      if (newRoom) {
        setSelectedRoom(newRoom);
      }
    } catch {
      crossAlert('Errore', 'Impossibile avviare la conversazione');
    } finally {
      setCreatingChat(false);
    }
  };

  const handleDeleteChat = (room: ChatRoom) => {
    const name = getOtherParticipantName(room);
    crossAlert('Elimina Chat', `Eliminare la conversazione con ${name}? Tutti i messaggi saranno cancellati.`, [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Elimina',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteChatRoom(room.id);
            crossAlert('Successo', 'Chat eliminata');
          } catch {
            crossAlert('Errore', 'Impossibile eliminare la chat');
          }
        },
      },
    ]);
  };

  const getOtherParticipantName = (room: ChatRoom): string => {
    if (!user) return '';

    // Chat di gruppo/team: usa il nome della room
    if (room.chatType === 'team' || room.type === 'group') {
      if (room.name) return room.name;
      const names = (room.participants || [])
        .filter((id) => id && id !== user.id && participants[id])
        .map((id) => { const p = participants[id]; return `${p.name}`; });
      return names.length > 0 ? names.join(', ') : 'Chat di Gruppo';
    }

    // Owner: mostra entrambi i nomi (allievo ↔ collaboratore)
    if (isOwner) {
      const student = room.studentId ? participants[room.studentId] : null;
      const collab = room.collaboratorId ? participants[room.collaboratorId] : null;
      if (student || collab) {
        const studentName = student ? `${student.name} ${student.surname}` : 'Allievo';
        const collabName = collab ? `${collab.name} ${collab.surname}` : 'Collaboratore';
        return `${studentName} ↔ ${collabName}`;
      }
      // Fallback: prova dall'array participants
      const names = (room.participants || [])
        .filter((id) => id && participants[id])
        .map((id) => { const p = participants[id]; return `${p.name} ${p.surname}`; });
      return names.length > 0 ? names.join(' ↔ ') : 'Chat';
    }

    // Manager/Collaboratore: mostra il nome dell'allievo
    if ((isManager || isCollaborator) && room.studentId && participants[room.studentId]) {
      const s = participants[room.studentId];
      return `${s.name} ${s.surname}`;
    }

    // Fallback: mostra l'altro partecipante
    const otherId = (room.participants || []).find((id) => id && id !== user.id);
    if (otherId && participants[otherId]) {
      const p = participants[otherId];
      return `${p.name} ${p.surname}`;
    }
    return 'Chat';
  };

  const getUserRoleLabel = (u: User): string => {
    if (u.role === 'owner') return 'Owner';
    if (u.role === 'manager') return 'Manager';
    if (u.role === 'collaborator') {
      const c = u as unknown as Collaborator;
      return c.collaboratorType === 'nutritionist' ? 'Nutrizionista' : 'Coach';
    }
    return 'Allievo';
  };

  const getParticipantRole = (room: ChatRoom): string => {
    if (room.chatType === 'team' || room.type === 'group') return 'Chat di Gruppo';
    if (isOwner) {
      const student = room.studentId ? participants[room.studentId] : null;
      const collab = room.collaboratorId ? participants[room.collaboratorId] : null;
      const sRole = student ? getUserRoleLabel(student) : 'Allievo';
      const cRole = collab ? getUserRoleLabel(collab) : 'Collaboratore';
      return `${sRole} ↔ ${cRole}`;
    }
    if (isManager || isCollaborator) return 'Allievo';
    const otherId = (room.participants || []).find((id) => id && id !== user?.id);
    if (otherId && participants[otherId]) {
      return getUserRoleLabel(participants[otherId]);
    }
    return '';
  };

  const getRoleBadge = (contact: User): string => {
    if (contact.role === 'manager') return 'Manager';
    if (contact.role === 'collaborator') {
      const c = contact as unknown as Collaborator;
      return c.collaboratorType === 'nutritionist' ? 'Nutrizionista' : 'Coach';
    }
    if (contact.role === 'student') return 'Allievo';
    return contact.role;
  };

  const filteredRooms = rooms.filter((room) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const name = getOtherParticipantName(room).toLowerCase();
    const lastMsg = room.lastMessage?.text?.toLowerCase() || '';
    return name.includes(q) || lastMsg.includes(q);
  });

  if (selectedRoom) {
    return (
      <ChatConversationScreen
        room={selectedRoom}
        isAnonymous={isAnonymous}
        onBack={() => {
          setSelectedRoom(null);
          setIsAnonymous(false);
          loadRooms();
        }}
        participants={participants}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Chat</Text>
        <Text style={styles.subtitle}>
          {isOwner
            ? 'Puoi accedere a tutte le conversazioni'
            : `${rooms.length} conversazioni`}
        </Text>
      </View>

      {/* Pulsante Nuova Chat */}
      <View style={styles.newChatContainer}>
        <Button
          title="+ Nuova Conversazione"
          onPress={handleNewChat}
        />
      </View>

      {isOwner && (
        <View style={styles.ownerActions}>
          <View style={styles.ownerModeToggle}>
            <TouchableOpacity
              style={[styles.modeButton, !isAnonymous && styles.modeButtonActive]}
              onPress={() => setIsAnonymous(false)}
            >
              <Text style={[styles.modeText, !isAnonymous && styles.modeTextActive]}>
                Partecipa
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeButton, isAnonymous && styles.modeButtonAnon]}
              onPress={() => setIsAnonymous(true)}
            >
              <Text style={[styles.modeText, isAnonymous && styles.modeTextActive]}>
                Anonimo (sola lettura)
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={colors.textLight} />
        <TextInput
          style={styles.searchInput}
          placeholder="Cerca chat..."
          placeholderTextColor={colors.textLight}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={colors.textLight} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filteredRooms}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        renderItem={({ item }) => {
          const lastMsg = item.lastMessage;
          return (
            <TouchableOpacity onPress={() => setSelectedRoom(item)}>
              <Card variant="elevated">
                <View style={styles.roomRow}>
                  <View style={styles.roomAvatarWrapper}>
                    <View style={styles.roomAvatar}>
                      <Text style={styles.roomAvatarText}>
                        {getOtherParticipantName(item).charAt(0)}
                      </Text>
                    </View>
                    {(() => {
                      const otherId = item.participants.find((id) => id !== user?.id);
                      const isOnline = otherId && presence[otherId]?.isOnline;
                      return isOnline ? <View style={styles.presenceDot} /> : null;
                    })()}
                  </View>
                  <View style={styles.roomInfo}>
                    <Text style={styles.roomName}>
                      {getOtherParticipantName(item)}
                    </Text>
                    <Text style={styles.roomRole}>
                      {getParticipantRole(item)}
                    </Text>
                    {lastMsg && (
                      <Text style={styles.lastMessage} numberOfLines={1}>
                        {lastMsg.text}
                      </Text>
                    )}
                  </View>
                  {isOwner && isAnonymous && (
                    <View style={styles.anonBadge}>
                      <Text style={styles.anonBadgeText}>Anon</Text>
                    </View>
                  )}
                  {isOwner && (
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => handleDeleteChat(item)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="trash-outline" size={18} color={colors.error} />
                    </TouchableOpacity>
                  )}
                </View>
              </Card>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <Card>
            <Text style={styles.emptyText}>
              Nessuna conversazione attiva.{'\n'}
              {!isOwner && 'Premi "+ Nuova Conversazione" per iniziare.'}
            </Text>
          </Card>
        }
      />

      {/* Modale Nuova Chat */}
      <Modal visible={showNewChatModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ModalHeader
              title="Nuova Conversazione"
              onClose={() => setShowNewChatModal(false)}
            />

            {availableContacts.length === 0 ? (
              <Text style={styles.emptyText}>
                {isStudent
                  ? 'Nessun collaboratore assegnato. Contatta il tuo responsabile.'
                  : 'Nessun contatto disponibile.'}
              </Text>
            ) : (
              <ScrollView style={styles.contactList}>
                <Text style={styles.contactHint}>
                  Seleziona un contatto per avviare la conversazione:
                </Text>
                {availableContacts.map((contact) => (
                  <TouchableOpacity
                    key={contact.id}
                    style={styles.contactItem}
                    onPress={() => handleStartChat(contact)}
                    disabled={creatingChat}
                  >
                    <View style={styles.contactAvatar}>
                      <Text style={styles.contactAvatarText}>
                        {contact.name[0]}{contact.surname[0]}
                      </Text>
                    </View>
                    <View style={styles.contactInfo}>
                      <Text style={styles.contactName}>
                        {contact.name} {contact.surname}
                      </Text>
                      <Text style={styles.contactRole}>
                        {getRoleBadge(contact)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.primary,
    padding: spacing.lg,
    paddingTop: spacing.xxl,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.textOnPrimary,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textLight,
    marginTop: spacing.xs,
  },
  newChatContainer: {
    padding: spacing.md,
  },
  ownerActions: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  ownerModeToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xs,
    ...shadows.small,
  },
  modeButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.md,
  },
  modeButtonActive: {
    backgroundColor: colors.accent,
  },
  modeButtonAnon: {
    backgroundColor: colors.warning,
  },
  modeText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  modeTextActive: {
    color: '#FFFFFF',
  },
  list: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  roomRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roomAvatarWrapper: {
    position: 'relative',
    marginRight: spacing.md,
  },
  roomAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.collaboratorBadge,
    justifyContent: 'center',
    alignItems: 'center',
  },
  presenceDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  roomAvatarText: {
    color: '#FFFFFF',
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  roomInfo: {
    flex: 1,
  },
  roomName: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  roomRole: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 1,
  },
  lastMessage: {
    fontSize: fontSize.sm,
    color: colors.textLight,
    marginTop: 4,
  },
  anonBadge: {
    backgroundColor: colors.warning + '30',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.round,
  },
  anonBadgeText: {
    fontSize: fontSize.xs,
    color: colors.warning,
    fontWeight: '700',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
    paddingVertical: 0,
  },
  deleteBtn: {
    padding: spacing.sm,
    marginLeft: spacing.xs,
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: 'center',
    padding: spacing.lg,
    lineHeight: 22,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    maxHeight: '80%',
  },
  contactList: {
    marginTop: spacing.sm,
  },
  contactHint: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  contactAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  contactAvatarText: {
    color: '#FFFFFF',
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  contactRole: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
