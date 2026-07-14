import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, fontSize, borderRadius, shadows } from '../config/theme';

import { OperationsTodayScreen } from '../screens/staff/OperationsTodayScreen';
import { NotificationsScreen } from '../screens/shared/NotificationsScreen';
import { QRAccessScreen } from '../screens/owner/QRAccessScreen';
import { MyStudentsScreen } from '../screens/collaborator/MyStudentsScreen';
import { CalendarScreen } from '../screens/shared/CalendarScreen';
import { ChatListScreen } from '../screens/shared/ChatListScreen';
import { TeamChatScreen } from '../screens/shared/TeamChatScreen';
import { AssistantScreen } from '../screens/shared/AssistantScreen';
import { WorkoutPlanScreen } from '../screens/shared/WorkoutPlanScreen';
import { ManageTemplatesScreen } from '../screens/shared/ManageTemplatesScreen';
import { WorkoutMonitorScreen } from '../screens/shared/WorkoutMonitorScreen';
import { WorkoutHistoryScreen } from '../screens/shared/WorkoutHistoryScreen';
import { PosturalAssessmentScreen } from '../screens/shared/PosturalAssessmentScreen';
import { BodyCompositionScreen } from '../screens/shared/BodyCompositionScreen';
import { AICoachScreen } from '../screens/shared/AICoachScreen';
import { NutritionistScreen } from '../screens/shared/NutritionistScreen';
import { NutritionTeamScreen } from '../screens/shared/NutritionTeamScreen';
import { AnalyticsScreen } from '../screens/owner/AnalyticsScreen';
import { ContentManagementScreen } from '../screens/owner/ContentManagementScreen';
import { ProfileScreen } from '../screens/shared/ProfileScreen';
import { AISettingsScreen } from '../screens/shared/AISettingsScreen';
import { DashboardScreen } from '../screens/owner/DashboardScreen';
import { ManagerDashboardScreen } from '../screens/manager/ManagerDashboardScreen';
import TimelineScreen from '../screens/shared/TimelineScreen';
import { ManageUsersScreen } from '../screens/owner/ManageUsersScreen';
import { FinancialScreen } from '../screens/owner/FinancialScreen';
import { PricingScreen } from '../screens/owner/PricingScreen';
import { PaymentPlanScreen } from '../screens/owner/PaymentPlanScreen';
import { StorageManagementScreen } from '../screens/owner/StorageManagementScreen';
import { EarningsScreen } from '../screens/collaborator/EarningsScreen';

// ============================================================
// NAVIGAZIONE STAFF v2 — 5 sezioni (M2, doc 04 §3)
// Oggi · Allievi · Agenda · Chat · Studio
// "Oggi" è la dashboard operativa (coda di decisioni);
// "Studio" raccoglie la coda lunga in una gerarchia per sezioni.
// ============================================================

export type StaffRole = 'owner' | 'manager' | 'collaborator';

const Tab = createBottomTabNavigator();
const OggiStack = createStackNavigator();
const AllieviStack = createStackNavigator();
const AgendaStack = createStackNavigator();
const ChatStack = createStackNavigator();
const StudioStack = createStackNavigator();

const stackOptions = { headerShown: false } as const;
const inner = (title: string) => ({
  headerShown: true,
  title,
  headerStyle: { backgroundColor: colors.primary, shadowColor: 'transparent', elevation: 0, height: 56 },
  headerTintColor: colors.textOnPrimary,
  headerTitleStyle: { fontSize: fontSize.md, fontWeight: '600' as const },
  headerBackTitleVisible: false,
});

interface HubRow {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  route: string;
}
interface HubGroup {
  title: string;
  rows: HubRow[];
}

const StudioHub: React.FC<{ groups: HubGroup[] }> = ({ groups }) => {
  const navigation = useNavigation<any>();
  return (
    <View style={hub.container}>
      <View style={hub.header}>
        <Text style={hub.title}>Studio</Text>
        <Text style={hub.subtitle}>Strumenti di lavoro e gestione</Text>
      </View>
      <ScrollView contentContainerStyle={hub.list}>
        {groups.map((g) => (
          <View key={g.title}>
            <Text style={hub.groupTitle}>{g.title}</Text>
            <View style={hub.groupCard}>
              {g.rows.map((row, i) => (
                <TouchableOpacity
                  key={row.route}
                  style={[hub.row, i < g.rows.length - 1 && hub.rowBorder]}
                  onPress={() => navigation.navigate(row.route)}
                  activeOpacity={0.85}
                >
                  <Ionicons name={row.icon} size={20} color={colors.accent} />
                  <Text style={hub.rowTitle}>{row.title}</Text>
                  <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

// --- Gruppi Studio per ruolo ---
const trainingGroup: HubGroup = {
  title: 'Allenamento',
  rows: [
    { icon: 'fitness-outline', title: 'Programmi', route: 'Programmi' },
    { icon: 'copy-outline', title: 'Template', route: 'Template' },
    { icon: 'tv-outline', title: 'Monitor allenamenti', route: 'Monitor' },
    { icon: 'analytics-outline', title: 'Storico allenamenti', route: 'Storico' },
  ],
};
const assessGroup: HubGroup = {
  title: 'Valutazioni',
  rows: [
    { icon: 'body-outline', title: 'Valutazione posturale', route: 'Postura' },
    { icon: 'scale-outline', title: 'Composizione corporea', route: 'Composizione' },
    { icon: 'sparkles-outline', title: 'AI Coach', route: 'AICoach' },
    { icon: 'nutrition-outline', title: 'Nutrizionista', route: 'Nutrizionista' },
    { icon: 'people-outline', title: 'Team nutrizionisti', route: 'TeamNutrizionisti' },
  ],
};
const accountGroup: HubGroup = {
  title: 'Account',
  rows: [{ icon: 'person-circle-outline', title: 'Il mio profilo', route: 'ProfiloStaff' }],
};

const groupsByRole: Record<StaffRole, HubGroup[]> = {
  owner: [
    {
      title: 'Gestione',
      rows: [
        { icon: 'speedometer-outline', title: 'Dashboard completa', route: 'DashboardCompleta' },
        { icon: 'cash-outline', title: 'Finanza', route: 'Finanza' },
        { icon: 'stats-chart-outline', title: 'Analytics', route: 'Analytics' },
        { icon: 'pricetags-outline', title: 'Listino', route: 'Listino' },
        { icon: 'card-outline', title: 'Piani di pagamento', route: 'Pagamenti' },
        { icon: 'people-circle-outline', title: 'Team', route: 'Team' },
        { icon: 'grid-outline', title: 'Contenuti', route: 'Contenuti' },
        { icon: 'server-outline', title: 'Spazio di archiviazione', route: 'Spazio' },
        { icon: 'hardware-chip-outline', title: 'Impostazioni AI', route: 'ImpostazioniAI' },
      ],
    },
    trainingGroup,
    assessGroup,
    accountGroup,
  ],
  manager: [
    {
      title: 'Gestione',
      rows: [
        { icon: 'speedometer-outline', title: 'Dashboard completa', route: 'DashboardCompleta' },
        { icon: 'stats-chart-outline', title: 'Analytics', route: 'Analytics' },
        { icon: 'wallet-outline', title: 'I tuoi ricavi', route: 'Guadagni' },
        { icon: 'grid-outline', title: 'Contenuti', route: 'Contenuti' },
      ],
    },
    trainingGroup,
    assessGroup,
    accountGroup,
  ],
  collaborator: [
    {
      title: 'Il mio lavoro',
      rows: [
        { icon: 'wallet-outline', title: 'I miei guadagni', route: 'Guadagni' },
        { icon: 'stats-chart-outline', title: 'Analytics', route: 'Analytics' },
        { icon: 'grid-outline', title: 'Contenuti', route: 'Contenuti' },
        { icon: 'hardware-chip-outline', title: 'Impostazioni AI', route: 'ImpostazioniAI' },
      ],
    },
    trainingGroup,
    assessGroup,
    accountGroup,
  ],
};

const buildNavigators = (role: StaffRole) => {
  const OggiNav = () => (
    <OggiStack.Navigator screenOptions={stackOptions}>
      <OggiStack.Screen name="OggiHome" component={OperationsTodayScreen} />
      <OggiStack.Screen name="Notifiche" component={NotificationsScreen} options={inner('Notifiche')} />
      <OggiStack.Screen name="QRAccesso" component={QRAccessScreen} options={inner('QR Accesso')} />
    </OggiStack.Navigator>
  );

  const AllieviNav = () => (
    <AllieviStack.Navigator screenOptions={stackOptions}>
      <AllieviStack.Screen name="AllieviHome" component={MyStudentsScreen} />
      <AllieviStack.Screen name="StoriaAllievo" component={TimelineScreen} options={inner('Storia allievo')} />
    </AllieviStack.Navigator>
  );

  const AgendaNav = () => (
    <AgendaStack.Navigator screenOptions={stackOptions}>
      <AgendaStack.Screen name="AgendaHome" component={CalendarScreen} />
    </AgendaStack.Navigator>
  );

  const ChatNav = () => (
    <ChatStack.Navigator screenOptions={stackOptions}>
      <ChatStack.Screen name="ChatHome" component={ChatListScreen} />
      <ChatStack.Screen name="TeamChat" component={TeamChatScreen} options={inner('Chat del team')} />
      <ChatStack.Screen name="Assistente" component={AssistantScreen} options={inner('Assistente')} />
    </ChatStack.Navigator>
  );

  const Hub = () => <StudioHub groups={groupsByRole[role]} />;
  const StudioNav = () => (
    <StudioStack.Navigator screenOptions={stackOptions}>
      <StudioStack.Screen name="StudioHome" component={Hub} />
      {/* Allenamento */}
      <StudioStack.Screen name="Programmi" component={WorkoutPlanScreen} options={inner('Programmi')} />
      <StudioStack.Screen name="Template" component={ManageTemplatesScreen} options={inner('Template')} />
      <StudioStack.Screen name="Monitor" component={WorkoutMonitorScreen} options={inner('Monitor allenamenti')} />
      <StudioStack.Screen name="Storico" component={WorkoutHistoryScreen} options={inner('Storico allenamenti')} />
      {/* Valutazioni */}
      <StudioStack.Screen name="Postura" component={PosturalAssessmentScreen} options={inner('Valutazione posturale')} />
      <StudioStack.Screen name="Composizione" component={BodyCompositionScreen} options={inner('Composizione corporea')} />
      <StudioStack.Screen name="AICoach" component={AICoachScreen} options={inner('AI Coach')} />
      <StudioStack.Screen name="Nutrizionista" component={NutritionistScreen} options={inner('Nutrizionista')} />
      <StudioStack.Screen name="TeamNutrizionisti" component={NutritionTeamScreen} options={inner('Team nutrizionisti')} />
      {/* Comuni */}
      <StudioStack.Screen name="Analytics" component={AnalyticsScreen} options={inner('Analytics')} />
      <StudioStack.Screen name="Contenuti" component={ContentManagementScreen} options={inner('Contenuti')} />
      <StudioStack.Screen name="ProfiloStaff" component={ProfileScreen} options={inner('Il mio profilo')} />
      {/* Per ruolo */}
      {role === 'owner' && (
        <>
          <StudioStack.Screen name="DashboardCompleta" component={DashboardScreen} options={inner('Dashboard')} />
          <StudioStack.Screen name="Finanza" component={FinancialScreen} options={inner('Finanza')} />
          <StudioStack.Screen name="Listino" component={PricingScreen} options={inner('Listino')} />
          <StudioStack.Screen name="Pagamenti" component={PaymentPlanScreen} options={inner('Piani di pagamento')} />
          <StudioStack.Screen name="Team" component={ManageUsersScreen} options={inner('Team')} />
          <StudioStack.Screen name="Spazio" component={StorageManagementScreen} options={inner('Spazio di archiviazione')} />
          <StudioStack.Screen name="ImpostazioniAI" component={AISettingsScreen} options={inner('Impostazioni AI')} />
        </>
      )}
      {role === 'manager' && (
        <>
          <StudioStack.Screen name="DashboardCompleta" component={ManagerDashboardScreen} options={inner('Dashboard')} />
          <StudioStack.Screen name="Guadagni" component={EarningsScreen} options={inner('I tuoi ricavi')} />
        </>
      )}
      {role === 'collaborator' && (
        <>
          <StudioStack.Screen name="Guadagni" component={EarningsScreen} options={inner('I miei guadagni')} />
          <StudioStack.Screen name="ImpostazioniAI" component={AISettingsScreen} options={inner('Impostazioni AI')} />
        </>
      )}
    </StudioStack.Navigator>
  );

  return { OggiNav, AllieviNav, AgendaNav, ChatNav, StudioNav };
};

const TabIcon: React.FC<{ name: keyof typeof Ionicons.glyphMap; focused: boolean }> = ({ name, focused }) => (
  <Ionicons name={name} size={24} color={focused ? colors.accent : colors.textSecondary} />
);

export const makeStaffTabs = (role: StaffRole) => {
  const { OggiNav, AllieviNav, AgendaNav, ChatNav, StudioNav } = buildNavigators(role);
  return () => (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tab.Screen name="Oggi" component={OggiNav} options={{
        tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'sunny' : 'sunny-outline'} focused={focused} />,
      }} />
      <Tab.Screen name="Allievi" component={AllieviNav} options={{
        tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'people' : 'people-outline'} focused={focused} />,
      }} />
      <Tab.Screen name="Agenda" component={AgendaNav} options={{
        tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'calendar' : 'calendar-outline'} focused={focused} />,
      }} />
      <Tab.Screen name="Chat" component={ChatNav} options={{
        tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'chatbubbles' : 'chatbubbles-outline'} focused={focused} />,
      }} />
      <Tab.Screen name="Studio" component={StudioNav} options={{
        tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'briefcase' : 'briefcase-outline'} focused={focused} />,
      }} />
    </Tab.Navigator>
  );
};

const hub = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { backgroundColor: colors.primary, padding: spacing.lg, paddingTop: spacing.xxl },
  title: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.textOnPrimary },
  subtitle: { fontSize: fontSize.md, color: colors.textLight, marginTop: spacing.xs },
  list: { padding: spacing.md, paddingBottom: spacing.xxl },
  groupTitle: {
    fontSize: fontSize.sm, fontWeight: '700', color: colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginBottom: spacing.xs, marginTop: spacing.sm, marginLeft: spacing.xs,
  },
  groupCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    marginBottom: spacing.sm, ...shadows.small,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.md, paddingVertical: 14,
  },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  rowTitle: { flex: 1, fontSize: fontSize.md, color: colors.text, fontWeight: '600' },
});
