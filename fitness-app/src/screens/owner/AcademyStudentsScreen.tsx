import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius, shadows } from '../../config/theme';
import { Card } from '../../components/common/Card';
import { useAuth } from '../../hooks/useAuth';
import { AcademyStudent } from '../../types';
import {
  getAcademyStudents,
  registerAcademyStudent,
  getAllCourses,
  getStudentProgress,
  getStudentCertificates,
} from '../../services/academyService';
import { toggleUserActive } from '../../services/authService';

const showAlert = (title: string, message: string, buttons?: any[]) => {
  if (Platform.OS === 'web') {
    if (buttons && buttons.length > 1) {
      const confirmed = window.confirm(`${title}\n${message}`);
      if (confirmed && buttons[1]?.onPress) buttons[1].onPress();
    } else {
      window.alert(`${title}\n${message}`);
    }
  } else {
    Alert.alert(title, message, buttons);
  }
};

const GOLD = '#C5A55A';

export const AcademyStudentsScreen: React.FC = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState<AcademyStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Add form
  const [formName, setFormName] = useState('');
  const [formSurname, setFormSurname] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [saving, setSaving] = useState(false);

  // Student detail
  const [selectedStudent, setSelectedStudent] = useState<AcademyStudent | null>(null);
  const [studentProgress, setStudentProgress] = useState<number>(0);
  const [studentCerts, setStudentCerts] = useState<number>(0);

  const loadStudents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAcademyStudents();
      setStudents(data);
    } catch (err) {
      console.error('Load academy students error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const handleAddStudent = async () => {
    if (!formName.trim() || !formSurname.trim() || !formEmail.trim() || !formPassword.trim()) {
      showAlert('Errore', 'Compila tutti i campi obbligatori');
      return;
    }
    setSaving(true);
    try {
      await registerAcademyStudent(
        formEmail.trim(),
        formPassword,
        formName.trim(),
        formSurname.trim(),
        formPhone.trim()
      );
      setShowAddModal(false);
      setFormName('');
      setFormSurname('');
      setFormEmail('');
      setFormPhone('');
      setFormPassword('');
      loadStudents();
      showAlert('Successo', 'Studente Academy creato con successo!');
    } catch (err: any) {
      if (err?.code === 'auth/email-already-in-use') {
        showAlert('Errore', 'Questa email è già registrata');
      } else if (err?.code === 'auth/weak-password') {
        showAlert('Errore', 'La password deve avere almeno 6 caratteri');
      } else {
        showAlert('Errore', `Impossibile creare lo studente: ${err.message || err}`);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = (student: AcademyStudent) => {
    const action = student.isActive ? 'disattivare' : 'attivare';
    showAlert(
      `${student.isActive ? 'Disattiva' : 'Attiva'} studente`,
      `Vuoi ${action} ${student.name} ${student.surname}?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Conferma',
          onPress: async () => {
            try {
              await toggleUserActive(student.id, !student.isActive);
              loadStudents();
            } catch {
              showAlert('Errore', 'Impossibile aggiornare lo stato');
            }
          },
        },
      ]
    );
  };

  const openStudentDetail = async (student: AcademyStudent) => {
    setSelectedStudent(student);
    try {
      const [prog, certs] = await Promise.all([
        getStudentProgress(student.id),
        getStudentCertificates(student.id),
      ]);
      setStudentProgress(prog.length);
      setStudentCerts(certs.length);
    } catch {
      setStudentProgress(0);
      setStudentCerts(0);
    }
  };

  const filtered = students.filter((s) => {
    if (!searchQuery.trim()) return true;
    const term = searchQuery.toLowerCase();
    return (
      `${s.name} ${s.surname}`.toLowerCase().includes(term) ||
      s.email.toLowerCase().includes(term)
    );
  });

  const renderStudent = ({ item }: { item: AcademyStudent }) => (
    <TouchableOpacity onPress={() => openStudentDetail(item)}>
      <Card>
        <View style={styles.studentRow}>
          <View style={[styles.avatar, !item.isActive && { opacity: 0.5 }]}>
            <Text style={styles.avatarText}>
              {item.name[0]}{item.surname[0]}
            </Text>
          </View>
          <View style={styles.studentInfo}>
            <Text style={[styles.studentName, !item.isActive && { color: colors.textLight }]}>
              {item.name} {item.surname}
            </Text>
            <Text style={styles.studentEmail}>{item.email}</Text>
          </View>
          {!item.isActive && (
            <View style={styles.inactiveBadge}>
              <Text style={styles.inactiveBadgeText}>INATTIVO</Text>
            </View>
          )}
          <TouchableOpacity onPress={() => handleToggleActive(item)} style={styles.actionBtn}>
            <Ionicons
              name={item.isActive ? 'pause-circle-outline' : 'play-circle-outline'}
              size={22}
              color={item.isActive ? colors.warning : colors.success}
            />
          </TouchableOpacity>
        </View>
      </Card>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Studenti Academy</Text>
            <Text style={styles.statsText}>
              {students.length} studenti · {students.filter((s) => s.isActive).length} attivi
            </Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddModal(true)}
          >
            <Ionicons name="person-add" size={18} color={colors.textOnAccent} />
            <Text style={styles.addButtonText}>Aggiungi</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={18} color={colors.textLight} />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Cerca studente..."
          placeholderTextColor={colors.textLight}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={colors.textLight} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Student list */}
      <FlatList
        data={filtered}
        renderItem={renderStudent}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyContainer}>
              <ActivityIndicator size="large" color={GOLD} />
            </View>
          ) : (
            <Card>
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={48} color={GOLD} />
                <Text style={styles.emptyText}>
                  Nessuno studente Academy registrato
                </Text>
              </View>
            </Card>
          )
        }
      />

      {/* Student detail modal */}
      <Modal visible={!!selectedStudent} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.detailModal}>
            {selectedStudent && (
              <>
                <View style={styles.detailHeader}>
                  <View style={styles.detailAvatar}>
                    <Text style={styles.detailAvatarText}>
                      {selectedStudent.name[0]}{selectedStudent.surname[0]}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setSelectedStudent(null)}
                    style={{ padding: spacing.xs }}
                  >
                    <Ionicons name="close" size={24} color={colors.text} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.detailName}>
                  {selectedStudent.name} {selectedStudent.surname}
                </Text>
                <Text style={styles.detailEmail}>{selectedStudent.email}</Text>
                {selectedStudent.phone ? (
                  <Text style={styles.detailEmail}>{selectedStudent.phone}</Text>
                ) : null}

                <View style={styles.detailStats}>
                  <View style={styles.detailStat}>
                    <Text style={styles.detailStatValue}>{studentProgress}</Text>
                    <Text style={styles.detailStatLabel}>Lezioni completate</Text>
                  </View>
                  <View style={styles.detailStat}>
                    <Text style={styles.detailStatValue}>{studentCerts}</Text>
                    <Text style={styles.detailStatLabel}>Certificati</Text>
                  </View>
                  <View style={styles.detailStat}>
                    <View style={[
                      styles.statusDot,
                      { backgroundColor: selectedStudent.isActive ? colors.success : colors.error },
                    ]} />
                    <Text style={styles.detailStatLabel}>
                      {selectedStudent.isActive ? 'Attivo' : 'Inattivo'}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.detailActionBtn}
                  onPress={() => {
                    setSelectedStudent(null);
                    handleToggleActive(selectedStudent);
                  }}
                >
                  <Ionicons
                    name={selectedStudent.isActive ? 'pause-circle-outline' : 'play-circle-outline'}
                    size={20}
                    color={selectedStudent.isActive ? colors.warning : colors.success}
                  />
                  <Text style={[styles.detailActionText, {
                    color: selectedStudent.isActive ? colors.warning : colors.success,
                  }]}>
                    {selectedStudent.isActive ? 'Disattiva' : 'Attiva'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Add student modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.addModal}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <View style={styles.addModalHeader}>
                <Text style={styles.addModalTitle}>Nuovo Studente Academy</Text>
                <TouchableOpacity onPress={() => setShowAddModal(false)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Nome *</Text>
                <TextInput
                  style={styles.input}
                  value={formName}
                  onChangeText={setFormName}
                  placeholder="Nome"
                  placeholderTextColor={colors.textLight}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Cognome *</Text>
                <TextInput
                  style={styles.input}
                  value={formSurname}
                  onChangeText={setFormSurname}
                  placeholder="Cognome"
                  placeholderTextColor={colors.textLight}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Email *</Text>
                <TextInput
                  style={styles.input}
                  value={formEmail}
                  onChangeText={setFormEmail}
                  placeholder="email@esempio.com"
                  placeholderTextColor={colors.textLight}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Telefono</Text>
                <TextInput
                  style={styles.input}
                  value={formPhone}
                  onChangeText={setFormPhone}
                  placeholder="+39..."
                  placeholderTextColor={colors.textLight}
                  keyboardType="phone-pad"
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Password *</Text>
                <TextInput
                  style={styles.input}
                  value={formPassword}
                  onChangeText={setFormPassword}
                  placeholder="Min. 6 caratteri"
                  placeholderTextColor={colors.textLight}
                  secureTextEntry
                />
              </View>

              <View style={styles.formActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setShowAddModal(false)}
                >
                  <Text style={styles.cancelBtnText}>Annulla</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveBtn, saving && { opacity: 0.5 }]}
                  onPress={handleAddStudent}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.saveBtnText}>Crea Studente</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
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
    borderBottomWidth: 1,
    borderBottomColor: GOLD + '30',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: GOLD,
  },
  statsText: {
    fontSize: fontSize.sm,
    color: colors.textLight,
    marginTop: 2,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  addButtonText: {
    color: colors.textOnAccent,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    margin: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.sm,
    color: colors.text,
    fontSize: fontSize.md,
  },
  list: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
  },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: GOLD + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: GOLD,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  studentEmail: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    marginTop: 1,
  },
  inactiveBadge: {
    backgroundColor: colors.error + '20',
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
    borderRadius: borderRadius.sm,
  },
  inactiveBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.error,
  },
  actionBtn: {
    padding: spacing.xs,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: 'center',
    fontSize: fontSize.md,
  },
  // Detail modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  detailModal: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: spacing.md,
  },
  detailAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: GOLD + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailAvatarText: {
    color: GOLD,
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
  detailName: {
    fontSize: fontSize.title,
    fontWeight: '700',
    color: colors.text,
  },
  detailEmail: {
    fontSize: fontSize.md,
    color: colors.textLight,
    marginTop: 2,
  },
  detailStats: {
    flexDirection: 'row',
    gap: spacing.xl,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  detailStat: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  detailStatValue: {
    fontSize: fontSize.title,
    fontWeight: '700',
    color: GOLD,
  },
  detailStatLabel: {
    fontSize: fontSize.xs,
    color: colors.textLight,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  detailActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  detailActionText: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  // Add modal
  addModal: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    maxHeight: '85%',
  },
  addModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  addModalTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
  },
  formGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.text,
    fontSize: fontSize.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  formActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  cancelBtn: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: fontSize.md,
  },
  saveBtn: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.accent,
    alignItems: 'center',
  },
  saveBtnText: {
    color: colors.textOnAccent,
    fontWeight: '700',
    fontSize: fontSize.md,
  },
});
