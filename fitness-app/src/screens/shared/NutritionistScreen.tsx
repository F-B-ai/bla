import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  FlatList,
  RefreshControl,
  Platform,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { crossAlert } from '../../utils/alert';
import { colors, spacing, fontSize, borderRadius } from '../../config/theme';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { InputField } from '../../components/common/InputField';
import { ModalHeader } from '../../components/common/ModalHeader';
import { Badge } from '../../components/common/Badge';
import {
  NutritionistAppointment,
  BodyMeasurement,
  BiaDocument,
  Student,
} from '../../types';
import { useAuth } from '../../hooks/useAuth';
import {
  createAppointment,
  cancelAppointment,
  getStudentAppointments,
  getAllAppointments,
  updateAppointmentStatus,
  addMeasurement,
  getStudentMeasurements,
  deleteMeasurement,
  uploadBiaPdf,
  addBiaDocument,
  getStudentBiaDocuments,
  deleteBiaDocument,
} from '../../services/nutritionistService';
import { getStudents } from '../../services/authService';

type ActiveTab = 'misure' | 'bia' | 'visite';

const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00', '12:00',
  '14:00', '15:00', '16:00', '17:00', '18:00',
];

export const NutritionistScreen: React.FC = () => {
  const { user, isOwner, isManager, isCollaborator, isStudent } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('misure');
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Misure
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [showMeasureModal, setShowMeasureModal] = useState(false);
  const [savingMeasure, setSavingMeasure] = useState(false);
  const [measureForm, setMeasureForm] = useState({
    weight: '', height: '', bodyFat: '', muscleMass: '',
    waist: '', hips: '', chest: '', arms: '', thighs: '', notes: '',
  });

  // BIA
  const [biaDocuments, setBiaDocuments] = useState<BiaDocument[]>([]);
  const [showBiaModal, setShowBiaModal] = useState(false);
  const [savingBia, setSavingBia] = useState(false);
  const [biaForm, setBiaForm] = useState({ notes: '' });
  const [selectedPdfUri, setSelectedPdfUri] = useState('');
  const [selectedPdfName, setSelectedPdfName] = useState('');

  // Visite
  const [appointments, setAppointments] = useState<NutritionistAppointment[]>([]);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [savingAppointment, setSavingAppointment] = useState(false);
  const [appointmentForm, setAppointmentForm] = useState({
    date: '', startTime: '09:00', endTime: '10:00', notes: '',
  });

  const loadStudents = useCallback(async () => {
    if (!user) return;
    if (isStudent) {
      setSelectedStudentId(user.id);
      return;
    }
    try {
      const studs = await getStudents();
      if (isCollaborator) {
        setStudents(studs.filter((s) => s.assignedCollaboratorId === user.id));
      } else if (isManager) {
        setStudents(studs.filter((s) => s.assignedCollaboratorId === user.id || s.assignedManagerId === user.id));
      } else {
        setStudents(studs);
      }
    } catch (err) {
      console.error('Errore caricamento allievi:', err);
    }
  }, [user, isStudent, isCollaborator, isManager]);

  const loadData = useCallback(async () => {
    if (!selectedStudentId) return;
    try {
      const [meas, bia, appts] = await Promise.all([
        getStudentMeasurements(selectedStudentId),
        getStudentBiaDocuments(selectedStudentId),
        isStudent
          ? getStudentAppointments(selectedStudentId)
          : isOwner
            ? getAllAppointments()
            : getStudentAppointments(selectedStudentId),
      ]);
      setMeasurements(meas);
      setBiaDocuments(bia);
      setAppointments(appts);
    } catch (err) {
      console.error('Errore caricamento dati nutrizionista:', err);
    }
  }, [selectedStudentId, isStudent, isOwner]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  useEffect(() => {
    if (selectedStudentId) loadData();
  }, [selectedStudentId, loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // --- Misure ---
  const handleSaveMeasure = async () => {
    if (!selectedStudentId || !user) {
      crossAlert('Errore', 'Seleziona un allievo');
      return;
    }
    setSavingMeasure(true);
    try {
      await addMeasurement({
        studentId: selectedStudentId,
        date: new Date(),
        weight: measureForm.weight ? parseFloat(measureForm.weight) : undefined,
        height: measureForm.height ? parseFloat(measureForm.height) : undefined,
        bodyFat: measureForm.bodyFat ? parseFloat(measureForm.bodyFat) : undefined,
        muscleMass: measureForm.muscleMass ? parseFloat(measureForm.muscleMass) : undefined,
        waist: measureForm.waist ? parseFloat(measureForm.waist) : undefined,
        hips: measureForm.hips ? parseFloat(measureForm.hips) : undefined,
        chest: measureForm.chest ? parseFloat(measureForm.chest) : undefined,
        arms: measureForm.arms ? parseFloat(measureForm.arms) : undefined,
        thighs: measureForm.thighs ? parseFloat(measureForm.thighs) : undefined,
        notes: measureForm.notes,
        createdAt: new Date(),
      });
      crossAlert('Successo', 'Misure salvate!');
      setShowMeasureModal(false);
      setMeasureForm({ weight: '', height: '', bodyFat: '', muscleMass: '', waist: '', hips: '', chest: '', arms: '', thighs: '', notes: '' });
      loadData();
    } catch {
      crossAlert('Errore', 'Impossibile salvare le misure');
    } finally {
      setSavingMeasure(false);
    }
  };

  const handleDeleteMeasure = (id: string) => {
    crossAlert('Conferma', 'Eliminare questa misurazione?', [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Elimina',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMeasurement(id);
            loadData();
          } catch {
            crossAlert('Errore', 'Impossibile eliminare');
          }
        },
      },
    ]);
  };

  // --- BIA ---
  const handlePickPdf = async () => {
    try {
      if (Platform.OS === 'web') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/pdf';
        input.onchange = (e: any) => {
          const file = e.target.files?.[0];
          if (file) {
            const url = URL.createObjectURL(file);
            setSelectedPdfUri(url);
            setSelectedPdfName(file.name);
          }
        };
        input.click();
      } else {
        const DocumentPicker = require('expo-document-picker');
        const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
        if (!result.canceled && result.assets?.[0]) {
          setSelectedPdfUri(result.assets[0].uri);
          setSelectedPdfName(result.assets[0].name || 'bia_document.pdf');
        }
      }
    } catch {
      crossAlert('Errore', 'Impossibile selezionare il file');
    }
  };

  const handleSaveBia = async () => {
    if (!selectedStudentId || !selectedPdfUri) {
      crossAlert('Errore', 'Seleziona un allievo e un file PDF');
      return;
    }
    setSavingBia(true);
    try {
      const pdfUrl = await uploadBiaPdf(selectedStudentId, selectedPdfUri, selectedPdfName);
      await addBiaDocument({
        studentId: selectedStudentId,
        date: new Date(),
        pdfUrl,
        fileName: selectedPdfName,
        notes: biaForm.notes,
        createdAt: new Date(),
      });
      crossAlert('Successo', 'Documento BIA caricato!');
      setShowBiaModal(false);
      setSelectedPdfUri('');
      setSelectedPdfName('');
      setBiaForm({ notes: '' });
      loadData();
    } catch {
      crossAlert('Errore', 'Impossibile caricare il documento');
    } finally {
      setSavingBia(false);
    }
  };

  const handleDeleteBia = (id: string) => {
    crossAlert('Conferma', 'Eliminare questo documento BIA?', [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Elimina',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteBiaDocument(id);
            loadData();
          } catch {
            crossAlert('Errore', 'Impossibile eliminare');
          }
        },
      },
    ]);
  };

  const handleOpenPdf = (url: string) => {
    if (Platform.OS === 'web') {
      window.open(url, '_blank');
    } else {
      Linking.openURL(url);
    }
  };

  // --- Visite ---
  const getNextDays = (): { label: string; value: string }[] => {
    const days: { label: string; value: string }[] = [];
    for (let i = 1; i <= 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const value = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('it-IT', {
        weekday: 'short', day: 'numeric', month: 'short',
      });
      days.push({ label, value });
    }
    return days;
  };

  const handleCreateAppointment = async () => {
    if (!selectedStudentId || !appointmentForm.date) {
      crossAlert('Errore', 'Seleziona un allievo e una data');
      return;
    }
    setSavingAppointment(true);
    try {
      await createAppointment({
        studentId: selectedStudentId,
        date: new Date(appointmentForm.date),
        startTime: appointmentForm.startTime,
        endTime: appointmentForm.endTime,
        status: 'scheduled',
        notes: appointmentForm.notes,
        isCountedAsCompleted: false,
        createdAt: new Date(),
      });
      crossAlert('Successo', 'Visita prenotata!');
      setShowAppointmentModal(false);
      setAppointmentForm({ date: '', startTime: '09:00', endTime: '10:00', notes: '' });
      loadData();
    } catch {
      crossAlert('Errore', 'Impossibile prenotare la visita');
    } finally {
      setSavingAppointment(false);
    }
  };

  const handleCancelAppointment = (appointment: NutritionistAppointment) => {
    const appointmentDate = new Date(appointment.date as unknown as string);
    const now = new Date();
    const hoursUntil = (appointmentDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    let message = 'Vuoi annullare questa visita?';
    if (hoursUntil < 10) {
      message = 'Attenzione: mancano meno di 10 ore alla visita. La cancellazione verr\u00e0 conteggiata come visita effettuata. Procedere?';
    }

    crossAlert('Annulla Visita', message, [
      { text: 'No', style: 'cancel' },
      {
        text: 'S\u00ec, annulla',
        style: 'destructive',
        onPress: async () => {
          try {
            const result = await cancelAppointment(appointment.id, appointmentDate);
            if (result.isLate) {
              crossAlert('Cancellazione tardiva', 'La visita \u00e8 stata annullata ma verr\u00e0 conteggiata come effettuata (cancellazione < 10 ore).');
            } else {
              crossAlert('Successo', 'Visita annullata.');
            }
            loadData();
          } catch {
            crossAlert('Errore', 'Impossibile annullare la visita');
          }
        },
      },
    ]);
  };

  const handleCompleteAppointment = (appointmentId: string) => {
    crossAlert('Conferma', 'Segna questa visita come completata?', [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Completata',
        onPress: async () => {
          try {
            await updateAppointmentStatus(appointmentId, 'completed');
            loadData();
          } catch {
            crossAlert('Errore', 'Impossibile aggiornare');
          }
        },
      },
    ]);
  };

  const getStudentName = (id: string) => {
    if (isStudent) return `${user?.name || ''} ${user?.surname || ''}`;
    const s = students.find((st) => st.id === id);
    return s ? `${s.name} ${s.surname}` : 'Allievo';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled': return { label: 'Prenotata', color: colors.info };
      case 'completed': return { label: 'Completata', color: colors.success };
      case 'cancelled': return { label: 'Annullata', color: colors.textSecondary };
      case 'cancelled_late': return { label: 'Annullata (tardiva)', color: colors.warning };
      default: return { label: status, color: colors.textSecondary };
    }
  };

  const nextDays = getNextDays();

  const tabs: { key: ActiveTab; label: string; icon: string }[] = [
    { key: 'misure', label: 'Misure', icon: 'resize-outline' },
    { key: 'bia', label: 'BIA', icon: 'document-outline' },
    { key: 'visite', label: 'Visite', icon: 'calendar-outline' },
  ];

  // --- RENDER ---
  const renderMeasurements = () => (
    <>
      {!isStudent && (
        <View style={styles.addButtonContainer}>
          <Button title="+ Nuove Misure" onPress={() => setShowMeasureModal(true)} />
        </View>
      )}
      {measurements.length === 0 ? (
        <Card>
          <Text style={styles.emptyText}>Nessuna misurazione registrata.</Text>
        </Card>
      ) : (
        measurements.map((m) => {
          const date = new Date(m.date as unknown as string);
          return (
            <Card key={m.id} variant="elevated">
              <View style={styles.measureHeader}>
                <Text style={styles.measureDate}>
                  {date.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
                </Text>
                {!isStudent && (
                  <TouchableOpacity onPress={() => handleDeleteMeasure(m.id)}>
                    <Ionicons name="trash-outline" size={18} color={colors.error} />
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.measureGrid}>
                {m.weight != null && <MeasureItem label="Peso" value={`${m.weight} kg`} />}
                {m.height != null && <MeasureItem label="Altezza" value={`${m.height} cm`} />}
                {m.bodyFat != null && <MeasureItem label="Grasso" value={`${m.bodyFat}%`} />}
                {m.muscleMass != null && <MeasureItem label="Massa musc." value={`${m.muscleMass} kg`} />}
                {m.waist != null && <MeasureItem label="Vita" value={`${m.waist} cm`} />}
                {m.hips != null && <MeasureItem label="Fianchi" value={`${m.hips} cm`} />}
                {m.chest != null && <MeasureItem label="Petto" value={`${m.chest} cm`} />}
                {m.arms != null && <MeasureItem label="Braccia" value={`${m.arms} cm`} />}
                {m.thighs != null && <MeasureItem label="Cosce" value={`${m.thighs} cm`} />}
              </View>
              {m.notes ? <Text style={styles.measureNotes}>{m.notes}</Text> : null}
            </Card>
          );
        })
      )}
    </>
  );

  const renderBia = () => (
    <>
      {!isStudent && (
        <View style={styles.addButtonContainer}>
          <Button title="+ Carica BIA (PDF)" onPress={() => setShowBiaModal(true)} />
        </View>
      )}
      {biaDocuments.length === 0 ? (
        <Card>
          <Text style={styles.emptyText}>Nessun documento BIA caricato.</Text>
        </Card>
      ) : (
        biaDocuments.map((doc) => {
          const date = new Date(doc.date as unknown as string);
          return (
            <Card key={doc.id} variant="elevated">
              <View style={styles.biaRow}>
                <TouchableOpacity style={styles.biaInfo} onPress={() => handleOpenPdf(doc.pdfUrl)}>
                  <Ionicons name="document-text" size={28} color={colors.accent} />
                  <View style={styles.biaTextContainer}>
                    <Text style={styles.biaFileName} numberOfLines={1}>{doc.fileName}</Text>
                    <Text style={styles.biaDate}>
                      {date.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </Text>
                  </View>
                </TouchableOpacity>
                <View style={styles.biaActions}>
                  <TouchableOpacity onPress={() => handleOpenPdf(doc.pdfUrl)} style={styles.biaActionBtn}>
                    <Ionicons name="open-outline" size={20} color={colors.info} />
                  </TouchableOpacity>
                  {!isStudent && (
                    <TouchableOpacity onPress={() => handleDeleteBia(doc.id)} style={styles.biaActionBtn}>
                      <Ionicons name="trash-outline" size={18} color={colors.error} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              {doc.notes ? <Text style={styles.measureNotes}>{doc.notes}</Text> : null}
            </Card>
          );
        })
      )}
    </>
  );

  const renderAppointments = () => (
    <>
      {!isStudent && (
        <View style={styles.addButtonContainer}>
          <Button title="+ Prenota Visita" onPress={() => setShowAppointmentModal(true)} />
        </View>
      )}
      <View style={styles.cancellationNotice}>
        <Ionicons name="information-circle-outline" size={16} color={colors.warning} />
        <Text style={styles.cancellationText}>
          La cancellazione deve avvenire almeno 10 ore prima. Cancellazioni tardive verranno conteggiate come visite effettuate.
        </Text>
      </View>
      {appointments.length === 0 ? (
        <Card>
          <Text style={styles.emptyText}>Nessuna visita prenotata.</Text>
        </Card>
      ) : (
        appointments.map((appt) => {
          const apptDate = new Date(appt.date as unknown as string);
          const isFuture = apptDate > new Date();
          const status = getStatusBadge(appt.status);
          const canCancel = isFuture && appt.status === 'scheduled';
          const canComplete = isFuture && appt.status === 'scheduled' && !isStudent;

          return (
            <Card key={appt.id} variant="elevated">
              <View style={styles.appointmentHeader}>
                <View style={styles.appointmentInfo}>
                  <Text style={styles.appointmentDate}>
                    {apptDate.toLocaleDateString('it-IT', {
                      weekday: 'long', day: 'numeric', month: 'long',
                    })}
                  </Text>
                  <Text style={styles.appointmentTime}>
                    {appt.startTime} - {appt.endTime}
                  </Text>
                  {!isStudent && (
                    <Text style={styles.appointmentStudent}>
                      {getStudentName(appt.studentId)}
                    </Text>
                  )}
                </View>
                <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
                  <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                </View>
              </View>
              {appt.notes ? <Text style={styles.measureNotes}>{appt.notes}</Text> : null}
              {appt.isCountedAsCompleted && appt.status === 'cancelled_late' && (
                <View style={styles.lateWarning}>
                  <Ionicons name="warning-outline" size={14} color={colors.warning} />
                  <Text style={styles.lateWarningText}>Conteggiata come effettuata</Text>
                </View>
              )}
              {(canCancel || canComplete) && (
                <View style={styles.appointmentActions}>
                  {canComplete && (
                    <Button
                      title="Completata"
                      onPress={() => handleCompleteAppointment(appt.id)}
                      variant="secondary"
                      style={styles.actionBtn}
                    />
                  )}
                  {canCancel && (
                    <Button
                      title="Annulla"
                      onPress={() => handleCancelAppointment(appt)}
                      variant="danger"
                      style={styles.actionBtn}
                    />
                  )}
                </View>
              )}
            </Card>
          );
        })
      )}
    </>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Nutrizionista</Text>
        <Text style={styles.subtitle}>
          Misure, BIA e prenotazione visite
        </Text>
      </View>

      {/* Selezione allievo (solo per staff) */}
      {!isStudent && (
        <View style={styles.studentSelector}>
          <Text style={styles.fieldLabel}>Allievo</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipRow}>
              {students.map((s) => (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.chip, selectedStudentId === s.id && styles.chipActive]}
                  onPress={() => setSelectedStudentId(s.id)}
                >
                  <Text style={[styles.chipText, selectedStudentId === s.id && styles.chipTextActive]}>
                    {s.name} {s.surname}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Tab switcher */}
      <View style={styles.tabRow}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons
              name={tab.icon as any}
              size={18}
              color={activeTab === tab.key ? colors.accent : colors.textLight}
            />
            <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Contenuto */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {!selectedStudentId ? (
          <Card>
            <Text style={styles.emptyText}>Seleziona un allievo per visualizzare i dati.</Text>
          </Card>
        ) : activeTab === 'misure' ? (
          renderMeasurements()
        ) : activeTab === 'bia' ? (
          renderBia()
        ) : (
          renderAppointments()
        )}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Modale Nuove Misure */}
      <Modal visible={showMeasureModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContent}>
            <ModalHeader title="Nuove Misure Corporee" onClose={() => setShowMeasureModal(false)} />
            <View style={styles.measureFormGrid}>
              <View style={styles.measureFormRow}>
                <InputField label="Peso (kg)" value={measureForm.weight} onChangeText={(v) => setMeasureForm({ ...measureForm, weight: v })} placeholder="75" keyboardType="numeric" style={styles.halfInput} />
                <InputField label="Altezza (cm)" value={measureForm.height} onChangeText={(v) => setMeasureForm({ ...measureForm, height: v })} placeholder="175" keyboardType="numeric" style={styles.halfInput} />
              </View>
              <View style={styles.measureFormRow}>
                <InputField label="Grasso (%)" value={measureForm.bodyFat} onChangeText={(v) => setMeasureForm({ ...measureForm, bodyFat: v })} placeholder="15" keyboardType="numeric" style={styles.halfInput} />
                <InputField label="Massa musc. (kg)" value={measureForm.muscleMass} onChangeText={(v) => setMeasureForm({ ...measureForm, muscleMass: v })} placeholder="35" keyboardType="numeric" style={styles.halfInput} />
              </View>
              <View style={styles.measureFormRow}>
                <InputField label="Vita (cm)" value={measureForm.waist} onChangeText={(v) => setMeasureForm({ ...measureForm, waist: v })} placeholder="80" keyboardType="numeric" style={styles.halfInput} />
                <InputField label="Fianchi (cm)" value={measureForm.hips} onChangeText={(v) => setMeasureForm({ ...measureForm, hips: v })} placeholder="95" keyboardType="numeric" style={styles.halfInput} />
              </View>
              <View style={styles.measureFormRow}>
                <InputField label="Petto (cm)" value={measureForm.chest} onChangeText={(v) => setMeasureForm({ ...measureForm, chest: v })} placeholder="100" keyboardType="numeric" style={styles.halfInput} />
                <InputField label="Braccia (cm)" value={measureForm.arms} onChangeText={(v) => setMeasureForm({ ...measureForm, arms: v })} placeholder="35" keyboardType="numeric" style={styles.halfInput} />
              </View>
              <InputField label="Cosce (cm)" value={measureForm.thighs} onChangeText={(v) => setMeasureForm({ ...measureForm, thighs: v })} placeholder="55" keyboardType="numeric" />
              <InputField label="Note" value={measureForm.notes} onChangeText={(v) => setMeasureForm({ ...measureForm, notes: v })} placeholder="Note aggiuntive..." multiline numberOfLines={3} />
            </View>
            <View style={styles.modalButtons}>
              <Button title="Annulla" onPress={() => setShowMeasureModal(false)} variant="outline" style={styles.modalButton} />
              <Button title={savingMeasure ? 'Salvataggio...' : 'Salva'} onPress={handleSaveMeasure} style={styles.modalButton} loading={savingMeasure} />
            </View>
            <View style={styles.bottomSpacer} />
          </ScrollView>
        </View>
      </Modal>

      {/* Modale Upload BIA */}
      <Modal visible={showBiaModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContent}>
            <ModalHeader title="Carica Documento BIA" onClose={() => { setShowBiaModal(false); setSelectedPdfUri(''); setSelectedPdfName(''); }} />

            <TouchableOpacity style={styles.pdfPicker} onPress={handlePickPdf}>
              <Ionicons
                name={selectedPdfUri ? 'document-text' : 'cloud-upload-outline'}
                size={32}
                color={selectedPdfUri ? colors.accent : colors.textLight}
              />
              <Text style={[styles.pdfPickerText, selectedPdfUri && { color: colors.text }]}>
                {selectedPdfName || 'Tocca per selezionare un PDF'}
              </Text>
            </TouchableOpacity>

            <InputField label="Note (opzionale)" value={biaForm.notes} onChangeText={(v) => setBiaForm({ ...biaForm, notes: v })} placeholder="Note sul documento..." multiline numberOfLines={3} />

            <View style={styles.modalButtons}>
              <Button title="Annulla" onPress={() => { setShowBiaModal(false); setSelectedPdfUri(''); setSelectedPdfName(''); }} variant="outline" style={styles.modalButton} />
              <Button title={savingBia ? 'Caricamento...' : 'Carica'} onPress={handleSaveBia} style={styles.modalButton} loading={savingBia} />
            </View>
            <View style={styles.bottomSpacer} />
          </ScrollView>
        </View>
      </Modal>

      {/* Modale Prenota Visita */}
      <Modal visible={showAppointmentModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContent}>
            <ModalHeader title="Prenota Visita Nutrizionista" onClose={() => setShowAppointmentModal(false)} />

            <View style={styles.cancellationNotice}>
              <Ionicons name="information-circle-outline" size={16} color={colors.warning} />
              <Text style={styles.cancellationText}>
                Cancellazione gratuita fino a 10 ore prima della visita.
              </Text>
            </View>

            <Text style={styles.fieldLabel}>Data</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipRow}>
                {nextDays.map((d) => (
                  <TouchableOpacity
                    key={d.value}
                    style={[styles.dateChip, appointmentForm.date === d.value && styles.chipActive]}
                    onPress={() => setAppointmentForm({ ...appointmentForm, date: d.value })}
                  >
                    <Text style={[styles.chipText, appointmentForm.date === d.value && styles.chipTextActive]}>
                      {d.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.timeRow}>
              <View style={styles.timeField}>
                <Text style={styles.fieldLabel}>Inizio</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.chipRow}>
                    {TIME_SLOTS.map((t) => (
                      <TouchableOpacity
                        key={`start-${t}`}
                        style={[styles.timeChip, appointmentForm.startTime === t && styles.chipActive]}
                        onPress={() => setAppointmentForm({ ...appointmentForm, startTime: t })}
                      >
                        <Text style={[styles.chipText, appointmentForm.startTime === t && styles.chipTextActive]}>{t}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
              <View style={styles.timeField}>
                <Text style={styles.fieldLabel}>Fine</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.chipRow}>
                    {TIME_SLOTS.map((t) => (
                      <TouchableOpacity
                        key={`end-${t}`}
                        style={[styles.timeChip, appointmentForm.endTime === t && styles.chipActive]}
                        onPress={() => setAppointmentForm({ ...appointmentForm, endTime: t })}
                      >
                        <Text style={[styles.chipText, appointmentForm.endTime === t && styles.chipTextActive]}>{t}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            </View>

            <InputField label="Note (opzionale)" value={appointmentForm.notes} onChangeText={(v) => setAppointmentForm({ ...appointmentForm, notes: v })} placeholder="Motivo della visita..." multiline numberOfLines={3} />

            <View style={styles.modalButtons}>
              <Button title="Annulla" onPress={() => setShowAppointmentModal(false)} variant="outline" style={styles.modalButton} />
              <Button title={savingAppointment ? 'Prenotazione...' : 'Prenota'} onPress={handleCreateAppointment} style={styles.modalButton} loading={savingAppointment} />
            </View>
            <View style={styles.bottomSpacer} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

// Componente per singola misura
const MeasureItem = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.measureItem}>
    <Text style={styles.measureLabel}>{label}</Text>
    <Text style={styles.measureValue}>{value}</Text>
  </View>
);

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
  studentSelector: {
    padding: spacing.md,
    paddingBottom: 0,
  },
  fieldLabel: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceLight,
  },
  chipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  chipText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  chipTextActive: {
    color: colors.textOnAccent,
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: {
    backgroundColor: colors.accent + '20',
    borderColor: colors.accent,
  },
  tabLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textLight,
  },
  tabLabelActive: {
    color: colors.accent,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.md,
  },
  addButtonContainer: {
    marginBottom: spacing.md,
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: 'center',
    padding: spacing.lg,
    lineHeight: 22,
  },

  // Misure
  measureHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  measureDate: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  measureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  measureItem: {
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minWidth: 90,
    alignItems: 'center',
  },
  measureLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  measureValue: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.accent,
  },
  measureNotes: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    fontStyle: 'italic',
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
    paddingLeft: spacing.sm,
  },
  measureFormGrid: {
    gap: spacing.xs,
  },
  measureFormRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  halfInput: {
    flex: 1,
  },

  // BIA
  biaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  biaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  biaTextContainer: {
    flex: 1,
  },
  biaFileName: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  biaDate: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  biaActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  biaActionBtn: {
    padding: spacing.sm,
  },
  pdfPicker: {
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  pdfPickerText: {
    fontSize: fontSize.md,
    color: colors.textLight,
    marginTop: spacing.sm,
    textAlign: 'center',
  },

  // Visite
  cancellationNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.warning + '15',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  cancellationText: {
    fontSize: fontSize.sm,
    color: colors.warning,
    flex: 1,
    lineHeight: 18,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  appointmentInfo: {
    flex: 1,
  },
  appointmentDate: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    textTransform: 'capitalize',
  },
  appointmentTime: {
    fontSize: fontSize.md,
    color: colors.accent,
    fontWeight: '600',
    marginTop: 2,
  },
  appointmentStudent: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.round,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  lateWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  lateWarningText: {
    fontSize: fontSize.xs,
    color: colors.warning,
    fontWeight: '600',
  },
  appointmentActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  actionBtn: {
    flex: 1,
  },

  // Modal
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
    maxHeight: '90%',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  modalButton: {
    flex: 1,
  },
  dateChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceLight,
  },
  timeRow: {
    gap: spacing.sm,
  },
  timeField: {},
  timeChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceLight,
  },
  bottomSpacer: {
    height: spacing.xxl * 2,
  },
});
