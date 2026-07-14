import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, fontSize, borderRadius, shadows } from '../config/theme';

import { TodayScreen } from '../screens/student/TodayScreen';
import { EssereScreen } from '../screens/student/EssereScreen';
import { CheckinScreen } from '../screens/student/CheckinScreen';
import { CalendarScreen } from '../screens/shared/CalendarScreen';
import { NotificationsScreen } from '../screens/shared/NotificationsScreen';
import { MyProgramScreen } from '../screens/student/MyProgramScreen';
import { LiveWorkoutScreen } from '../screens/student/LiveWorkoutScreen';
import { WorkoutHistoryScreen } from '../screens/shared/WorkoutHistoryScreen';
import { GamificationScreen } from '../screens/student/GamificationScreen';
import { DiaryScreen } from '../screens/student/DiaryScreen';
import { AICoachScreen } from '../screens/shared/AICoachScreen';
import TimelineScreen from '../screens/shared/TimelineScreen';
import { ChatListScreen } from '../screens/shared/ChatListScreen';
import { AssistantScreen } from '../screens/shared/AssistantScreen';
import { ProfileScreen } from '../screens/shared/ProfileScreen';
import { PaymentsScreen } from '../screens/student/PaymentsScreen';
import { NutritionistScreen } from '../screens/shared/NutritionistScreen';
import { ContentScreen } from '../screens/student/ContentScreen';

// ============================================================
// NAVIGAZIONE ALLIEVO v2 — 5 tab (M2, doc 04 §2)
// Oggi · Allenati · Progressi · Chat · Profilo
// Nessuna schermata eliminata: tutto resta raggiungibile in ≤2 tap
// dentro una gerarchia chiara. "La tab bar è un budget, non un elenco."
// ============================================================

const Tab = createBottomTabNavigator();
const OggiStack = createStackNavigator();
const AllenatiStack = createStackNavigator();
const ProgressiStack = createStackNavigator();
const ChatStack = createStackNavigator();
const ProfiloStack = createStackNavigator();

// Barra di ritorno slim sopra le schermate interne (che hanno già
// il proprio header): stesso colore primario, si fonde visivamente.
const stackOptions = {
  headerShown: false,
} as const;
const innerScreenOptions = (title: string) => ({
  headerShown: true,
  title,
  headerStyle: { backgroundColor: colors.primary, shadowColor: 'transparent', elevation: 0, height: 56 },
  headerTintColor: colors.textOnPrimary,
  headerTitleStyle: { fontSize: fontSize.md, fontWeight: '600' as const },
  headerBackTitleVisible: false,
});

// --- Hub generico: elenco di sezioni con icona e descrizione ---
interface HubRow {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  route: string;
}

const HubScreen: React.FC<{ title: string; subtitle: string; rows: HubRow[] }> = ({ title, subtitle, rows }) => {
  const navigation = useNavigation<any>();
  return (
    <View style={hubStyles.container}>
      <View style={hubStyles.header}>
        <Text style={hubStyles.title}>{title}</Text>
        <Text style={hubStyles.subtitle}>{subtitle}</Text>
      </View>
      <ScrollView contentContainerStyle={hubStyles.list}>
        {rows.map((row) => (
          <TouchableOpacity
            key={row.route}
            style={hubStyles.row}
            onPress={() => navigation.navigate(row.route)}
            activeOpacity={0.85}
          >
            <View style={hubStyles.rowIcon}>
              <Ionicons name={row.icon} size={22} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={hubStyles.rowTitle}>{row.title}</Text>
              <Text style={hubStyles.rowSub}>{row.subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

// --- Tab 1: Oggi ---
const OggiNavigator = () => (
  <OggiStack.Navigator screenOptions={stackOptions}>
    <OggiStack.Screen name="OggiHome" component={TodayScreen} />
    <OggiStack.Screen name="StatoEssere" component={EssereScreen} options={innerScreenOptions('Stato ESSĒRE')} />
    <OggiStack.Screen name="CheckinPalestra" component={CheckinScreen} options={innerScreenOptions('Check-in palestra')} />
    <OggiStack.Screen name="Agenda" component={CalendarScreen} options={innerScreenOptions('Agenda')} />
    <OggiStack.Screen name="Notifiche" component={NotificationsScreen} options={innerScreenOptions('Notifiche')} />
  </OggiStack.Navigator>
);

// --- Tab 2: Allenati ---
const AllenatiHub = () => (
  <HubScreen
    title="Allenati"
    subtitle="Il tuo percorso in palestra"
    rows={[
      { icon: 'fitness-outline', title: 'La mia scheda', subtitle: 'Il programma assegnato dal coach', route: 'Scheda' },
      { icon: 'barbell-outline', title: 'Inizia seduta', subtitle: 'Registra l\'allenamento dal vivo', route: 'SedutaLive' },
      { icon: 'analytics-outline', title: 'Storico', subtitle: 'Gli allenamenti completati', route: 'Storico' },
    ]}
  />
);
const AllenatiNavigator = () => (
  <AllenatiStack.Navigator screenOptions={stackOptions}>
    <AllenatiStack.Screen name="AllenatiHome" component={AllenatiHub} />
    <AllenatiStack.Screen name="Scheda" component={MyProgramScreen} options={innerScreenOptions('La mia scheda')} />
    <AllenatiStack.Screen name="SedutaLive" component={LiveWorkoutScreen} options={innerScreenOptions('Seduta dal vivo')} />
    <AllenatiStack.Screen name="Storico" component={WorkoutHistoryScreen} options={innerScreenOptions('Storico allenamenti')} />
  </AllenatiStack.Navigator>
);

// --- Tab 3: Progressi ---
const ProgressiHub = () => (
  <HubScreen
    title="Progressi"
    subtitle="Stai migliorando: eccolo nero su bianco"
    rows={[
      { icon: 'book-outline', title: 'La mia storia', subtitle: 'Tutto il tuo percorso, giorno per giorno', route: 'Storia' },
      { icon: 'trophy-outline', title: 'Traguardi', subtitle: 'Badge, livelli e premi reali', route: 'Traguardi' },
      { icon: 'journal-outline', title: 'Diario', subtitle: 'Le tue note e riflessioni', route: 'Diario' },
      { icon: 'sparkles-outline', title: 'AI Coach', subtitle: 'Analisi e suggerimenti personalizzati', route: 'AICoach' },
      { icon: 'analytics-outline', title: 'Storico allenamenti', subtitle: 'Volume e costanza nel tempo', route: 'StoricoProgressi' },
    ]}
  />
);
const ProgressiNavigator = () => (
  <ProgressiStack.Navigator screenOptions={stackOptions}>
    <ProgressiStack.Screen name="ProgressiHome" component={ProgressiHub} />
    <ProgressiStack.Screen name="Storia" component={TimelineScreen} options={innerScreenOptions('La mia storia')} />
    <ProgressiStack.Screen name="Traguardi" component={GamificationScreen} options={innerScreenOptions('Traguardi')} />
    <ProgressiStack.Screen name="Diario" component={DiaryScreen} options={innerScreenOptions('Diario')} />
    <ProgressiStack.Screen name="AICoach" component={AICoachScreen} options={innerScreenOptions('AI Coach')} />
    <ProgressiStack.Screen name="StoricoProgressi" component={WorkoutHistoryScreen} options={innerScreenOptions('Storico allenamenti')} />
  </ProgressiStack.Navigator>
);

// --- Tab 4: Chat (coach 1:1 + Assistente) ---
const ChatNavigator = () => (
  <ChatStack.Navigator screenOptions={stackOptions}>
    <ChatStack.Screen name="ChatHome" component={ChatListScreen} />
    <ChatStack.Screen name="Assistente" component={AssistantScreen} options={innerScreenOptions('Assistente')} />
  </ChatStack.Navigator>
);

// --- Tab 5: Profilo ---
const ProfiloHub = () => (
  <HubScreen
    title="Profilo"
    subtitle="Il tuo account e i tuoi servizi"
    rows={[
      { icon: 'person-circle-outline', title: 'I miei dati', subtitle: 'Profilo, credenziali e consensi privacy', route: 'MieiDati' },
      { icon: 'card-outline', title: 'Pagamenti', subtitle: 'Piani, rate e ricevute', route: 'Pagamenti' },
      { icon: 'nutrition-outline', title: 'Nutrizionista', subtitle: 'Consulenze e appuntamenti', route: 'NutrizionistaProfilo' },
      { icon: 'grid-outline', title: 'Contenuti extra', subtitle: 'Video, guide e materiali della palestra', route: 'Contenuti' },
    ]}
  />
);
const ProfiloNavigator = () => (
  <ProfiloStack.Navigator screenOptions={stackOptions}>
    <ProfiloStack.Screen name="ProfiloHome" component={ProfiloHub} />
    <ProfiloStack.Screen name="MieiDati" component={ProfileScreen} options={innerScreenOptions('I miei dati')} />
    <ProfiloStack.Screen name="Pagamenti" component={PaymentsScreen} options={innerScreenOptions('Pagamenti')} />
    <ProfiloStack.Screen name="NutrizionistaProfilo" component={NutritionistScreen} options={innerScreenOptions('Nutrizionista')} />
    <ProfiloStack.Screen name="Contenuti" component={ContentScreen} options={innerScreenOptions('Contenuti')} />
  </ProfiloStack.Navigator>
);

// --- Tab bar ---
const TabIcon: React.FC<{ name: keyof typeof Ionicons.glyphMap; focused: boolean }> = ({ name, focused }) => (
  <Ionicons name={name} size={24} color={focused ? colors.accent : colors.textSecondary} />
);

export const StudentTabsV2 = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: colors.accent,
      tabBarInactiveTintColor: colors.textSecondary,
      tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
      tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
    }}
  >
    <Tab.Screen name="Oggi" component={OggiNavigator} options={{
      tabBarLabel: 'Oggi',
      tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'sunny' : 'sunny-outline'} focused={focused} />,
    }} />
    <Tab.Screen name="Allenati" component={AllenatiNavigator} options={{
      tabBarLabel: 'Allenati',
      tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'barbell' : 'barbell-outline'} focused={focused} />,
    }} />
    <Tab.Screen name="Progressi" component={ProgressiNavigator} options={{
      tabBarLabel: 'Progressi',
      tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'trending-up' : 'trending-up-outline'} focused={focused} />,
    }} />
    <Tab.Screen name="Chat" component={ChatNavigator} options={{
      tabBarLabel: 'Chat',
      tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'chatbubbles' : 'chatbubbles-outline'} focused={focused} />,
    }} />
    <Tab.Screen name="Profilo" component={ProfiloNavigator} options={{
      tabBarLabel: 'Profilo',
      tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'person-circle' : 'person-circle-outline'} focused={focused} />,
    }} />
  </Tab.Navigator>
);

const hubStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.primary,
    padding: spacing.lg,
    paddingTop: spacing.xxl,
  },
  title: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.textOnPrimary },
  subtitle: { fontSize: fontSize.md, color: colors.textLight, marginTop: spacing.xs },
  list: { padding: spacing.md },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    padding: spacing.md, marginBottom: spacing.md, ...shadows.small,
  },
  rowIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.background,
    alignItems: 'center', justifyContent: 'center',
  },
  rowTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  rowSub: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
});
