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
} from 'react-native';
import { colors, spacing, fontSize, borderRadius, shadows } from '../../config/theme';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { ModalHeader } from '../../components/common/ModalHeader';
import { ChatRoom, User, Student, Collaborator } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { getUserChatRooms, getAllChatRooms, createChatRoom } from '../../services/chatService';
import { getUserProfile, getStudents, getCollaborators } from '../../services/authService';
import { ChatConversationScreen } from './ChatConversationScreen';
import { crossAlert } from '../../utils/alert';

export const ChatListScreen: React.FC = () => {
  const { user, isOwner, isCollaborator, isStudent } = useAuth();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [participants, setParticipants] = useState<Record<string, User>>({});
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [availableContacts, setAvailableContacts] = useState<User[]>([]);
  const [creatingChat, setCreatingChat] = useState(false);

  const loadRooms = useCallback(async () => {
    if (!user) return;
    try {
      // Il titolare vede TUTTE le chat
      const chatRooms = isOwner
        ? await getAllChatRooms()
        : await getUserChatRooms(user.id);
      setRooms(chatRooms);

      // Carica i profili dei partecipanti
      const userIds = new Set<string>();
      chatRooms.forEach((room) => {
        room.participants.forEach((id) => userIds.add(id));
      });

      const profiles: Record<string, User> = {};
      await Promise.all(
        Array.from(userIds).map(async (id) => {
          const profile = await getUserProfile(id);
          if (profile) profiles[id] = profile;
        })
      );
      setParticipants(profiles);
    } catch {
      // Silently handle
    }
  }, [user, isOwner]);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRooms();
    setRefreshing(false);
  };

  const handleNewChat = async () => {
    if (!user) return;
    try {
      if (isCollaborator) {
        // Collaboratore: mostra i suoi allievi
        const allStudents = await getStudents();
        const myStudents = allStudents.filter(
          (s) => s.assignedCollaboratorId === user.id && s.isActive
        );
        setAvailableContacts(myStudents);
      } else if (isStudent) {
        // Allievo: mostra il suo collaboratore assegnato
        const studentProfile = user as unknown as Student;
        if (studentProfile.assignedCollaboratorId) {
          const collab = await getUserProfile(studentProfile.assignedCollaboratorId);
          setAvailableContacts(collab ? [collab] : []);
        } else {
          setAvailableContacts([]);
        }
      } else if (isOwner) {
        // Owner: mostra tutti collaboratori e allievi
        const [allStudents, allCollaborators] = await Promise.all([
          getStudents(),
          getCollaborators(),
        ]);
        setAvailableContacts([
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
      } else if (isCollaborator) {
        studentId = contact.id;
        collaboratorId = user.id;
      } else {
        // Owner: determina ruoli in base al contatto
        if (contact.role === 'student') {
          const student = contact as unknown as Student;
          studentId = contact.id;
          collaboratorId = student.assignedCollaboratorId || user.id;
        } else {
          crossAlert('Info', 'Seleziona un allievo per avviare la chat con il suo collaboratore');
          setCreatingChat(false);
          return;
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

  const getOtherParticipantName = (room: ChatRoom): string => {
    if (!user) return '';
    const otherId = room.participants.find((id) => id !== user.id);
    if (otherId && participants[otherId]) {
      const p = participants[otherId];
      return `${p.name} ${p.surname}`;
    }
    // Per l'owner, mostra entrambi i nomi
    if (isOwner) {
      const student = participants[room.studentId];
      const collab = participants[room.collaboratorId];
      const studentName = student ? `${student.name} ${student.surname}` : 'Allievo';
      const collabName = collab ? `${collab.name} ${collab.surname}` : 'Collaboratore';
      return `${studentName} ↔ ${collabName}`;
    }
    return 'Chat';
  };

  const getParticipantRole = (room: ChatRoom): string => {
    if (isOwner) return 'Allievo ↔ Collaboratore';
    const otherId = room.participants.find((id) => id !== user?.id);
    if (otherId && participants[otherId]) {
      return participants[otherId].role === 'collaborator' ? 'Collaboratore' : 'Allievo';
    }
    return '';
  };

  const getRoleBadge = (contact: User): string => {
    if (contact.role === 'collaborator') return 'Coach';
    if (contact.role === 'student') return 'Allievo';
    return contact.role;
  };

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
      {!isOwner && (
        <View style={styles.newChatContainer}>
          <Button
            title="+ Nuova Conversazione"
            onPress={handleNewChat}
          />
        </View>
      )}

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

      <FlatList
        data={rooms}
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
                  <View style={styles.roomAvatar}>
                    <Text style={styles.roomAvatarText}>
                      {getOtherParticipantName(item).charAt(0)}
                    </Text>
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
  roomAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.collaboratorBadge,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
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
