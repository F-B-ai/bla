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
import { InputField } from '../../components/common/InputField';
import { ChatRoom, User } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import {
  createTeamChatRoom,
  subscribeToTeamChatRooms,
  subscribeToPresence,
  deleteChatRoom,
} from '../../services/chatService';
import { getUserProfile, getCollaborators, getManagers, getStudents } from '../../services/authService';
import { ChatConversationScreen } from './ChatConversationScreen';
import { crossAlert } from '../../utils/alert';

export const TeamChatScreen: React.FC = () => {
  const { user, isOwner } = useAuth();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [participants, setParticipants] = useState<Record<string, User>>({});
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [presence, setPresence] = useState<Record<string, { isOnline: boolean; lastSeen: Date | null }>>({});

  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [allStaff, setAllStaff] = useState<User[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [groupName, setGroupName] = useState('');
  const [creating, setCreating] = useState(false);
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
      const userIds = new Set<string>();
      _chatRooms.forEach((room) => {
        if (room.participants) room.participants.forEach((id) => { if (id) userIds.add(id); });
      });
      const profiles: Record<string, User> = {};
      await Promise.allSettled(
        Array.from(userIds).map(async (id) => {
          try { const p = await getUserProfile(id); if (p) profiles[id] = p; } catch { /* skip */ }
        })
      );
      setParticipants((prev) => ({ ...prev, ...profiles }));
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToTeamChatRooms(user.id, isOwner, (chatRooms) => {
      setRooms(chatRooms);
      loadParticipantProfiles(chatRooms);
    });
    return () => unsub();
  }, [user, isOwner, loadParticipantProfiles]);

  useEffect(() => {
    if (!user || rooms.length === 0) return;
    const otherIds = new Set<string>();
    rooms.forEach((room) => {
      room.participants.forEach((id) => {
        if (id !== user.id) otherIds.add(id);
      });
    });
    if (otherIds.size === 0) return;
    const unsub = subscribeToPresence(Array.from(otherIds), setPresence);
    return () => unsub();
  }, [user, rooms]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (user) {
      const chatRooms = isOwner
        ? (await import('../../services/chatService')).getAllTeamChatRooms()
        : (await import('../../services/chatService')).getTeamChatRooms(user.id);
      const resolved = await chatRooms;
      setRooms(resolved);
      await loadParticipantProfiles(resolved);
    }
    setRefreshing(false);
  };

  const handleNewGroup = async () => {
    if (!user) return;
    try {
      const [collabs, mgrs] = await Promise.all([
        getCollaborators(),
        getManagers(),
      ]);
      const staff: User[] = [];
      mgrs.forEach((m) => {
        if (m.id !== user.id && m.isActive) staff.push(m as unknown as User);
      });
      collabs.forEach((c) => {
        if (c.id !== user.id && c.isActive) staff.push(c as unknown as User);
      });
      setAllStaff(staff);
      setSelectedMembers(new Set());
      setGroupName('');
      setShowNewGroupModal(true);
    } catch {
      crossAlert('Errore', 'Impossibile caricare lo staff');
    }
  };

  const toggleMember = (id: string) => {
    setSelectedMembers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreateGroup = async () => {
    if (!user) return;
    if (selectedMembers.size === 0) {
      crossAlert('Errore', 'Seleziona almeno un membro');
      return;
    }
    const name = groupName.trim() || 'Chat Team';
    setCreating(true);
    try {
      await createTeamChatRoom(user.id, Array.from(selectedMembers), name);
      setShowNewGroupModal(false);
      crossAlert('Successo', 'Chat di team creata!');
    } catch {
      crossAlert('Errore', 'Impossibile creare la chat');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteTeamChat = (room: ChatRoom) => {
    const name = room.name || 'Chat Team';
    crossAlert('Elimina Chat', `Eliminare il gruppo "${name}"? Tutti i messaggi saranno cancellati.`, [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Elimina',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteChatRoom(room.id);
            crossAlert('Successo', 'Chat di team eliminata');
          } catch {
            crossAlert('Errore', 'Impossibile eliminare la chat');
          }
        },
      },
    ]);
  };

  const getRoomTitle = (room: ChatRoom): string => {
    if (room.name) return room.name;
    const names = room.participants
      .filter((id) => id !== user?.id)
      .map((id) => {
        const p = participants[id];
        return p ? `${p.name} ${p.surname}` : '';
      })
      .filter(Boolean);
    return names.join(', ') || 'Chat Team';
  };

  const getRoomSubtitle = (room: ChatRoom): string => {
    const names = (room.participants || [])
      .filter((id) => id && id !== user?.id)
      .map((id) => {
        const p = participants[id];
        if (!p) return '';
        const role = p.role === 'manager' ? 'Mgr' :
          p.role === 'collaborator' ? ((p as any).collaboratorType === 'nutritionist' ? 'Nutr' : 'Coach') :
          p.role === 'owner' ? 'Owner' : 'All';
        return `${p.name} (${role})`;
      })
      .filter(Boolean);
    const online = (room.participants || []).filter((id) => id !== user?.id && presence[id]?.isOnline).length;
    const nameStr = names.length > 0 ? names.join(', ') : `${(room.participants || []).length} membri`;
    return online > 0 ? `${nameStr} · ${online} online` : nameStr;
  };

  const getRoleBadge = (u: User): string => {
    if (u.role === 'manager') return 'Manager';
    if (u.role === 'collaborator') {
      const c = u as any;
      return c.collaboratorType === 'nutritionist' ? 'Nutrizionista' : 'Coach';
    }
    if (u.role === 'owner') return 'Owner';
    return u.role;
  };

  const filteredRooms = rooms.filter((room) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const title = getRoomTitle(room).toLowerCase();
    const lastMsg = room.lastMessage?.text?.toLowerCase() || '';
    return title.includes(q) || lastMsg.includes(q);
  });

  if (selectedRoom) {
    return (
      <ChatConversationScreen
        room={selectedRoom}
        isAnonymous={false}
        onBack={() => {
          setSelectedRoom(null);
        }}
        participants={participants}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Chat Team</Text>
        <Text style={styles.subtitle}>
          {rooms.length} conversazion{rooms.length === 1 ? 'e' : 'i'} di team
        </Text>
      </View>

      {isOwner && (
        <View style={styles.newChatContainer}>
          <Button title="+ Nuovo Gruppo" onPress={handleNewGroup} />
        </View>
      )}

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={colors.textLight} />
        <TextInput
          style={styles.searchInput}
          placeholder="Cerca chat team..."
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => {
          const lastMsg = item.lastMessage;
          const onlineCount = item.participants.filter(
            (id) => id !== user?.id && presence[id]?.isOnline
          ).length;

          return (
            <TouchableOpacity onPress={() => setSelectedRoom(item)}>
              <Card variant="elevated">
                <View style={styles.roomRow}>
                  <View style={styles.roomAvatarWrapper}>
                    <View style={styles.roomAvatar}>
                      <Ionicons name="people" size={22} color="#FFFFFF" />
                    </View>
                    {onlineCount > 0 && <View style={styles.presenceDot} />}
                  </View>
                  <View style={styles.roomInfo}>
                    <Text style={styles.roomName}>{getRoomTitle(item)}</Text>
                    <Text style={styles.roomRole}>{getRoomSubtitle(item)}</Text>
                    {lastMsg && (
                      <Text style={styles.lastMessage} numberOfLines={1}>
                        {(lastMsg as any).senderName ? `${(lastMsg as any).senderName}: ` : ''}
                        {lastMsg.text}
                      </Text>
                    )}
                  </View>
                  {isOwner && (
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => handleDeleteTeamChat(item)}
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
              Nessuna chat di team ancora.
            </Text>
          </Card>
        }
      />

      <Modal visible={showNewGroupModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContent}>
            <ModalHeader
              title="Nuovo Gruppo Team"
              onClose={() => setShowNewGroupModal(false)}
            />

            <InputField
              label="Nome del gruppo"
              value={groupName}
              onChangeText={setGroupName}
              placeholder="Es: Staff Palestra, Team Nutrizione..."
            />

            <Text style={styles.fieldLabel}>
              Seleziona membri ({selectedMembers.size} selezionati)
            </Text>

            {allStaff.length === 0 ? (
              <Text style={styles.emptyText}>Nessun membro staff disponibile</Text>
            ) : (
              allStaff.map((s) => {
                const selected = selectedMembers.has(s.id);
                return (
                  <TouchableOpacity
                    key={s.id}
                    style={[styles.contactItem, selected && styles.contactItemSelected]}
                    onPress={() => toggleMember(s.id)}
                  >
                    <View style={[styles.contactAvatar, selected && styles.contactAvatarSelected]}>
                      <Text style={styles.contactAvatarText}>{s.name[0]}{s.surname[0]}</Text>
                    </View>
                    <View style={styles.contactInfo}>
                      <Text style={styles.contactName}>{s.name} {s.surname}</Text>
                      <Text style={styles.contactRole}>{getRoleBadge(s)}</Text>
                    </View>
                    <Ionicons
                      name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                      size={24}
                      color={selected ? colors.accent : colors.textLight}
                    />
                  </TouchableOpacity>
                );
              })
            )}

            <View style={styles.selectAllRow}>
              <TouchableOpacity
                onPress={() => {
                  if (selectedMembers.size === allStaff.length) {
                    setSelectedMembers(new Set());
                  } else {
                    setSelectedMembers(new Set(allStaff.map((s) => s.id)));
                  }
                }}
              >
                <Text style={styles.selectAllText}>
                  {selectedMembers.size === allStaff.length ? 'Deseleziona tutti' : 'Seleziona tutti'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalButtons}>
              <Button
                title="Annulla"
                onPress={() => setShowNewGroupModal(false)}
                variant="outline"
                style={styles.modalButton}
              />
              <Button
                title={creating ? 'Creazione...' : 'Crea Gruppo'}
                onPress={handleCreateGroup}
                style={styles.modalButton}
                loading={creating}
              />
            </View>
            <View style={{ height: 60 }} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.primary,
    padding: spacing.lg,
    paddingTop: spacing.xxl,
  },
  title: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.textOnPrimary },
  subtitle: { fontSize: fontSize.md, color: colors.textLight, marginTop: spacing.xs },
  newChatContainer: { padding: spacing.md },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
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
  list: { padding: spacing.md, paddingBottom: spacing.xxl },

  roomRow: { flexDirection: 'row', alignItems: 'center' },
  roomAvatarWrapper: { position: 'relative', marginRight: spacing.md },
  roomAvatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: colors.accent,
    justifyContent: 'center', alignItems: 'center',
  },
  presenceDot: {
    position: 'absolute', bottom: 0, right: 0,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: colors.success,
    borderWidth: 2, borderColor: colors.surface,
  },
  roomInfo: { flex: 1 },
  roomName: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text },
  roomRole: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 1 },
  lastMessage: { fontSize: fontSize.sm, color: colors.textLight, marginTop: 4 },

  deleteBtn: {
    padding: spacing.sm,
    marginLeft: spacing.xs,
  },
  emptyText: {
    color: colors.textSecondary, textAlign: 'center',
    padding: spacing.lg, lineHeight: 22,
  },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg, maxHeight: '90%',
  },
  fieldLabel: {
    fontSize: fontSize.md, fontWeight: '600', color: colors.text,
    marginBottom: spacing.sm, marginTop: spacing.md,
  },
  contactItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.divider,
  },
  contactItemSelected: {
    backgroundColor: colors.accent + '10',
  },
  contactAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center', alignItems: 'center',
    marginRight: spacing.md,
  },
  contactAvatarSelected: { backgroundColor: colors.accent },
  contactAvatarText: { color: '#FFFFFF', fontSize: fontSize.md, fontWeight: '700' },
  contactInfo: { flex: 1 },
  contactName: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text },
  contactRole: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  selectAllRow: { alignItems: 'center', paddingVertical: spacing.md },
  selectAllText: { fontSize: fontSize.md, color: colors.accent, fontWeight: '600' },
  modalButtons: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  modalButton: { flex: 1 },
});
