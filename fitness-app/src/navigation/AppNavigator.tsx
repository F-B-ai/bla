import React, { useState, useEffect, useCallback, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, Platform, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize } from '../config/theme';
import { useAuth } from '../hooks/useAuth';

// --- Persist loginMode so Academy mode survives refresh ---
const LOGIN_MODE_KEY = 'essere_login_mode';

const saveLoginMode = (mode: 'app' | 'academy' | null) => {
  try {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      if (mode === null) {
        localStorage.removeItem(LOGIN_MODE_KEY);
      } else {
        localStorage.setItem(LOGIN_MODE_KEY, mode);
      }
    } else {
      // Native: use AsyncStorage
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      if (mode === null) {
        AsyncStorage.removeItem(LOGIN_MODE_KEY);
      } else {
        AsyncStorage.setItem(LOGIN_MODE_KEY, mode);
      }
    }
  } catch {}
};

const loadLoginMode = async (): Promise<'app' | 'academy' | null> => {
  try {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      const val = localStorage.getItem(LOGIN_MODE_KEY);
      if (val === 'app' || val === 'academy') return val;
      return null;
    } else {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const val = await AsyncStorage.getItem(LOGIN_MODE_KEY);
      if (val === 'app' || val === 'academy') return val;
      return null;
    }
  } catch {
    return null;
  }
};

// Screens
import { LoginScreen } from '../screens/auth/LoginScreen';
import { LoginSelectorScreen } from '../screens/auth/LoginSelectorScreen';
import { AcademyLoginScreen } from '../screens/auth/AcademyLoginScreen';
import { DashboardScreen } from '../screens/owner/DashboardScreen';
import { FinancialScreen } from '../screens/owner/FinancialScreen';
import { ManageUsersScreen } from '../screens/owner/ManageUsersScreen';
import { ContentManagementScreen } from '../screens/owner/ContentManagementScreen';
import { MyStudentsScreen } from '../screens/collaborator/MyStudentsScreen';
import { EarningsScreen } from '../screens/collaborator/EarningsScreen';
import { MyProgramScreen } from '../screens/student/MyProgramScreen';
import { SessionsScreen } from '../screens/student/SessionsScreen';
import { DiaryScreen } from '../screens/student/DiaryScreen';
import { PaymentsScreen } from '../screens/student/PaymentsScreen';
import { ContentScreen } from '../screens/student/ContentScreen';
import { PosturalAssessmentScreen } from '../screens/shared/PosturalAssessmentScreen';
import { WorkoutPlanScreen } from '../screens/shared/WorkoutPlanScreen';
import { ScheduleSessionScreen } from '../screens/shared/ScheduleSessionScreen';

import { ChatListScreen } from '../screens/shared/ChatListScreen';
import { AISettingsScreen } from '../screens/shared/AISettingsScreen';
import { NutritionistScreen } from '../screens/shared/NutritionistScreen';
import { NutritionTeamScreen } from '../screens/shared/NutritionTeamScreen';
import { AnalyticsScreen } from '../screens/owner/AnalyticsScreen';
import { ManagerDashboardScreen } from '../screens/manager/ManagerDashboardScreen';
import { ManageTemplatesScreen } from '../screens/shared/ManageTemplatesScreen';
import { AcademyScreen } from '../screens/shared/AcademyScreen';
import { AcademyManagementScreen } from '../screens/owner/AcademyManagementScreen';
import { AcademyStudentsScreen } from '../screens/owner/AcademyStudentsScreen';
import { AcademyAnalyticsScreen } from '../screens/owner/AcademyAnalyticsScreen';

const RootStack = createStackNavigator();
const OwnerTab = createBottomTabNavigator();
const ManagerTab = createBottomTabNavigator();
const CollaboratorTab = createBottomTabNavigator();
const StudentTab = createBottomTabNavigator();
const AcademyTab = createBottomTabNavigator();

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ICON_SIZE = 26;
const GOLD = '#C5A55A';
const GOLD_DARK = '#8B7335';

const TabIcon = ({ name, focused }: { name: IoniconsName; focused: boolean }) => (
  <Ionicons
    name={name}
    size={TAB_ICON_SIZE}
    color={focused ? colors.accent : colors.textLight}
  />
);

const AcademyTabIcon = ({ name, focused }: { name: IoniconsName; focused: boolean }) => (
  <Ionicons
    name={name}
    size={TAB_ICON_SIZE}
    color={focused ? GOLD : colors.textLight}
  />
);

// Custom scrollable tab bar for navigators with many tabs
const ScrollableTabBar = ({ state, descriptors, navigation }: any) => (
  <View nativeID="tab-bar-bottom" style={styles.scrollableTabBarContainer}>
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollableTabBarContent}
    >
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const label = options.tabBarLabel ?? route.name;
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            activeOpacity={0.7}
            style={styles.scrollableTab}
            onPress={onPress}
          >
            {options.tabBarIcon?.({ focused: isFocused, color: isFocused ? colors.accent : colors.textLight, size: TAB_ICON_SIZE })}
            <Text style={[styles.scrollableTabLabel, { color: isFocused ? colors.accent : colors.textLight }]}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  </View>
);

// Academy-themed scrollable tab bar (gold accent)
const AcademyScrollableTabBar = ({ state, descriptors, navigation }: any) => (
  <View nativeID="tab-bar-bottom" style={styles.academyTabBarContainer}>
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollableTabBarContent}
    >
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const label = options.tabBarLabel ?? route.name;
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            activeOpacity={0.7}
            style={styles.scrollableTab}
            onPress={onPress}
          >
            {options.tabBarIcon?.({ focused: isFocused, color: isFocused ? GOLD : colors.textLight, size: TAB_ICON_SIZE })}
            <Text style={[styles.scrollableTabLabel, { color: isFocused ? GOLD : colors.textLight }]}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  </View>
);

// --- Owner Tabs ---
const OwnerTabs = () => (
  <OwnerTab.Navigator
    tabBar={(props) => <ScrollableTabBar {...props} />}
    screenOptions={{
      tabBarActiveTintColor: colors.accent,
      tabBarInactiveTintColor: colors.textLight,
      headerShown: false,
    }}
  >
    <OwnerTab.Screen
      name="Dashboard"
      component={DashboardScreen}
      options={{
        tabBarLabel: 'Home',
        tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'home' : 'home-outline'} focused={focused} />,
      }}
    />
    <OwnerTab.Screen
      name="MyStudents"
      component={MyStudentsScreen}
      options={{
        tabBarLabel: 'Allievi',
        tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'person' : 'person-outline'} focused={focused} />,
      }}
    />
    <OwnerTab.Screen
      name="Team"
      component={ManageUsersScreen}
      options={{
        tabBarLabel: 'Team',
        tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'people' : 'people-outline'} focused={focused} />,
      }}
    />
    <OwnerTab.Screen
      name="Sessions"
      component={ScheduleSessionScreen}
      options={{
        tabBarLabel: 'Sessioni',
        tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'calendar' : 'calendar-outline'} focused={focused} />,
      }}
    />
    <OwnerTab.Screen
      name="Financial"
      component={FinancialScreen}
      options={{
        tabBarLabel: 'Economia',
        tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'wallet' : 'wallet-outline'} focused={focused} />,
      }}
    />
    <OwnerTab.Screen
      name="Analytics"
      component={AnalyticsScreen}
      options={{
        tabBarLabel: 'KPI',
        tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'bar-chart' : 'bar-chart-outline'} focused={focused} />,
      }}
    />
    <OwnerTab.Screen
      name="Content"
      component={ContentManagementScreen}
      options={{
        tabBarLabel: 'Contenuti',
        tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'folder' : 'folder-outline'} focused={focused} />,
      }}
    />
    <OwnerTab.Screen
      name="Programmi"
      component={WorkoutPlanScreen}
      options={{
        tabBarLabel: 'Programmi',
        tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'fitness' : 'fitness-outline'} focused={focused} />,
      }}
    />
    <OwnerTab.Screen
      name="Template"
      component={ManageTemplatesScreen}
      options={{
        tabBarLabel: 'Template',
        tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'copy' : 'copy-outline'} focused={focused} />,
      }}
    />
    <OwnerTab.Screen
      name="Postura"
      component={PosturalAssessmentScreen}
      options={{
        tabBarLabel: 'Postura',
        tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'body' : 'body-outline'} focused={focused} />,
      }}
    />
    <OwnerTab.Screen
      name="Nutrizionista"
      component={NutritionistScreen}
      options={{
        tabBarLabel: 'Nutrizione',
        tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'nutrition' : 'nutrition-outline'} focused={focused} />,
      }}
    />
    <OwnerTab.Screen
      name="TeamNutrizionisti"
      component={NutritionTeamScreen}
      options={{
        tabBarLabel: 'Team Nutri',
        tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'people-circle' : 'people-circle-outline'} focused={focused} />,
      }}
    />
    <OwnerTab.Screen
      name="AI"
      component={AISettingsScreen}
      options={{
        tabBarLabel: 'AI',
        tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'sparkles' : 'sparkles-outline'} focused={focused} />,
      }}
    />
    <OwnerTab.Screen
      name="Chat"
      component={ChatListScreen}
      options={{
        tabBarLabel: 'Chat',
        tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'chatbubbles' : 'chatbubbles-outline'} focused={focused} />,
      }}
    />
  </OwnerTab.Navigator>
);

// --- Manager Tabs ---
const ManagerTabs = () => (
  <ManagerTab.Navigator
    tabBar={(props) => <ScrollableTabBar {...props} />}
    screenOptions={{
      tabBarActiveTintColor: colors.accent,
      tabBarInactiveTintColor: colors.textLight,
      headerShown: false,
    }}
  >
    <ManagerTab.Screen
      name="Dashboard"
      component={ManagerDashboardScreen}
      options={{
        tabBarLabel: 'Home',
        tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'home' : 'home-outline'} focused={focused} />,
      }}
    />
    <ManagerTab.Screen
      name="MyStudents"
      component={MyStudentsScreen}
      options={{
        tabBarLabel: 'Allievi',
        tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'person' : 'person-outline'} focused={focused} />,
      }}
    />
    <ManagerTab.Screen
      name="Team"
      component={ManageUsersScreen}
      options={{
        tabBarLabel: 'Team',
        tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'people' : 'people-outline'} focused={focused} />,
      }}
    />
    <ManagerTab.Screen
      name="Programmi"
      component={WorkoutPlanScreen}
      options={{
        tabBarLabel: 'Programmi',
        tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'fitness' : 'fitness-outline'} focused={focused} />,
      }}
    />
    <ManagerTab.Screen
      name="Sessions"
      component={ScheduleSessionScreen}
      options={{
        tabBarLabel: 'Sessioni',
        tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'calendar' : 'calendar-outline'} focused={focused} />,
      }}
    />
    <ManagerTab.Screen
      name="Template"
      component={ManageTemplatesScreen}
      options={{
        tabBarLabel: 'Template',
        tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'copy' : 'copy-outline'} focused={focused} />,
      }}
    />
    <ManagerTab.Screen
      name="Postura"
      component={PosturalAssessmentScreen}
      options={{
        tabBarLabel: 'Postura',
        tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'body' : 'body-outline'} focused={focused} />,
      }}
    />
    <ManagerTab.Screen
      name="Earnings"
      component={EarningsScreen}
      options={{
        tabBarLabel: 'Guadagni',
        tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'wallet' : 'wallet-outline'} focused={focused} />,
      }}
    />
    <ManagerTab.Screen
      name="Nutrizionista"
      component={NutritionistScreen}
      options={{
        tabBarLabel: 'Nutrizione',
        tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'nutrition' : 'nutrition-outline'} focused={focused} />,
      }}
    />
    <ManagerTab.Screen
      name="TeamNutrizionisti"
      component={NutritionTeamScreen}
      options={{
        tabBarLabel: 'Team Nutri',
        tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'people-circle' : 'people-circle-outline'} focused={focused} />,
      }}
    />
    <ManagerTab.Screen
      name="Content"
      component={ContentManagementScreen}
      options={{
        tabBarLabel: 'Contenuti',
        tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'folder' : 'folder-outline'} focused={focused} />,
      }}
    />
    <ManagerTab.Screen
      name="Chat"
      component={ChatListScreen}
      options={{
        tabBarLabel: 'Chat',
        tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'chatbubbles' : 'chatbubbles-outline'} focused={focused} />,
      }}
    />
  </ManagerTab.Navigator>
);

// --- Collaborator Tabs ---
const CollaboratorTabs = () => (
  <CollaboratorTab.Navigator
    tabBar={(props) => <ScrollableTabBar {...props} />}
    screenOptions={{
      tabBarActiveTintColor: colors.accent,
      tabBarInactiveTintColor: colors.textLight,
      headerShown: false,
    }}
  >
    <CollaboratorTab.Screen
      name="MyStudents"
      component={MyStudentsScreen}
      options={{
        tabBarLabel: 'Allievi',
        tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'people' : 'people-outline'} focused={focused} />,
      }}
    />
    <CollaboratorTab.Screen
      name="Schedule"
      component={ScheduleSessionScreen}
      options={{
        tabBarLabel: 'Sessioni',
        tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'calendar' : 'calendar-outline'} focused={focused} />,
      }}
    />
    <CollaboratorTab.Screen
      name="Programs"
      component={WorkoutPlanScreen}
      options={{
        tabBarLabel: 'Programmi',
        tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'fitness' : 'fitness-outline'} focused={focused} />,
      }}
    />
    <CollaboratorTab.Screen
      name="Template"
      component={ManageTemplatesScreen}
      options={{
        tabBarLabel: 'Template',
        tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'copy' : 'copy-outline'} focused={focused} />,
      }}
    />
    <CollaboratorTab.Screen
      name="Postura"
      component={PosturalAssessmentScreen}
      options={{
        tabBarLabel: 'Postura',
        tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'body' : 'body-outline'} focused={focused} />,
      }}
    />
    <CollaboratorTab.Screen
      name="Earnings"
      component={EarningsScreen}
      options={{
        tabBarLabel: 'Guadagni',
        tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'wallet' : 'wallet-outline'} focused={focused} />,
      }}
    />
    <CollaboratorTab.Screen
      name="Nutrizionista"
      component={NutritionistScreen}
      options={{
        tabBarLabel: 'Nutrizione',
        tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'nutrition' : 'nutrition-outline'} focused={focused} />,
      }}
    />
    <CollaboratorTab.Screen
      name="TeamNutrizionisti"
      component={NutritionTeamScreen}
      options={{
        tabBarLabel: 'Team Nutri',
        tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'people-circle' : 'people-circle-outline'} focused={focused} />,
      }}
    />
    <CollaboratorTab.Screen
      name="AI"
      component={AISettingsScreen}
      options={{
        tabBarLabel: 'AI',
        tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'sparkles' : 'sparkles-outline'} focused={focused} />,
      }}
    />
    <CollaboratorTab.Screen
      name="Chat"
      component={ChatListScreen}
      options={{
        tabBarLabel: 'Chat',
        tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'chatbubbles' : 'chatbubbles-outline'} focused={focused} />,
      }}
    />
  </CollaboratorTab.Navigator>
);

// --- Student Tabs ---
const StudentTabs = () => (
  <StudentTab.Navigator
    tabBar={(props) => <ScrollableTabBar {...props} />}
    screenOptions={{
      tabBarActiveTintColor: colors.accent,
      tabBarInactiveTintColor: colors.textLight,
      headerShown: false,
    }}
  >
    <StudentTab.Screen
      name="MyProgram"
      component={MyProgramScreen}
      options={{
        tabBarLabel: 'Scheda',
        tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'fitness' : 'fitness-outline'} focused={focused} />,
      }}
    />
    <StudentTab.Screen
      name="Sessions"
      component={SessionsScreen}
      options={{
        tabBarLabel: 'Sessioni',
        tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'calendar' : 'calendar-outline'} focused={focused} />,
      }}
    />
    <StudentTab.Screen
      name="Diary"
      component={DiaryScreen}
      options={{
        tabBarLabel: 'Diario',
        tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'journal' : 'journal-outline'} focused={focused} />,
      }}
    />
    <StudentTab.Screen
      name="Payments"
      component={PaymentsScreen}
      options={{
        tabBarLabel: 'Paga',
        tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'card' : 'card-outline'} focused={focused} />,
      }}
    />
    <StudentTab.Screen
      name="Postura"
      component={PosturalAssessmentScreen}
      options={{
        tabBarLabel: 'Postura',
        tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'body' : 'body-outline'} focused={focused} />,
      }}
    />
    <StudentTab.Screen
      name="Nutrizionista"
      component={NutritionistScreen}
      options={{
        tabBarLabel: 'Nutrizione',
        tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'nutrition' : 'nutrition-outline'} focused={focused} />,
      }}
    />
    <StudentTab.Screen
      name="Content"
      component={ContentScreen}
      options={{
        tabBarLabel: 'Extra',
        tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'grid' : 'grid-outline'} focused={focused} />,
      }}
    />
    <StudentTab.Screen
      name="Chat"
      component={ChatListScreen}
      options={{
        tabBarLabel: 'Chat',
        tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'chatbubbles' : 'chatbubbles-outline'} focused={focused} />,
      }}
    />
  </StudentTab.Navigator>
);

// --- Academy-Only Tabs (for Academy login) ---
const AcademyOnlyStudentTabs = () => (
  <AcademyTab.Navigator
    tabBar={(props) => <AcademyScrollableTabBar {...props} />}
    screenOptions={{
      tabBarActiveTintColor: GOLD,
      tabBarInactiveTintColor: colors.textLight,
      headerShown: false,
    }}
  >
    <AcademyTab.Screen
      name="AcademyCorsi"
      component={AcademyScreen}
      options={{
        tabBarLabel: 'Corsi',
        tabBarIcon: ({ focused }) => <AcademyTabIcon name={focused ? 'school' : 'school-outline'} focused={focused} />,
      }}
    />
    <AcademyTab.Screen
      name="AcademyChat"
      component={ChatListScreen}
      options={{
        tabBarLabel: 'Chat',
        tabBarIcon: ({ focused }) => <AcademyTabIcon name={focused ? 'chatbubbles' : 'chatbubbles-outline'} focused={focused} />,
      }}
    />
  </AcademyTab.Navigator>
);


// Academy-Only for Owner/Manager (shows management view)
const AcademyOnlyAdminTabs = () => (
  <AcademyTab.Navigator
    tabBar={(props) => <AcademyScrollableTabBar {...props} />}
    screenOptions={{
      tabBarActiveTintColor: GOLD,
      tabBarInactiveTintColor: colors.textLight,
      headerShown: false,
    }}
  >
    <AcademyTab.Screen
      name="AcademyGestione"
      component={AcademyManagementScreen}
      options={{
        tabBarLabel: 'Gestione',
        tabBarIcon: ({ focused }) => <AcademyTabIcon name={focused ? 'settings' : 'settings-outline'} focused={focused} />,
      }}
    />
    <AcademyTab.Screen
      name="AcademyCorsi"
      component={AcademyScreen}
      options={{
        tabBarLabel: 'Corsi',
        tabBarIcon: ({ focused }) => <AcademyTabIcon name={focused ? 'school' : 'school-outline'} focused={focused} />,
      }}
    />
    <AcademyTab.Screen
      name="AcademyStudenti"
      component={AcademyStudentsScreen}
      options={{
        tabBarLabel: 'Studenti',
        tabBarIcon: ({ focused }) => <AcademyTabIcon name={focused ? 'people' : 'people-outline'} focused={focused} />,
      }}
    />
    <AcademyTab.Screen
      name="AcademyAnalytics"
      component={AcademyAnalyticsScreen}
      options={{
        tabBarLabel: 'Analytics',
        tabBarIcon: ({ focused }) => <AcademyTabIcon name={focused ? 'bar-chart' : 'bar-chart-outline'} focused={focused} />,
      }}
    />
    <AcademyTab.Screen
      name="AcademyChat"
      component={ChatListScreen}
      options={{
        tabBarLabel: 'Chat',
        tabBarIcon: ({ focused }) => <AcademyTabIcon name={focused ? 'chatbubbles' : 'chatbubbles-outline'} focused={focused} />,
      }}
    />
  </AcademyTab.Navigator>
);

// Logout header for Academy mode
const AcademyLogoutHeader = ({ onLogout }: { onLogout: () => void }) => (
  <View style={styles.academyLogoutHeader}>
    <View style={styles.academyLogoutBrand}>
      <Text style={styles.academyLogoutTitle}>Mind Movement Academy</Text>
    </View>
    <TouchableOpacity onPress={onLogout} style={styles.logoutBtn}>
      <Ionicons name="log-out-outline" size={20} color={GOLD} />
      <Text style={styles.logoutBtnText}>Esci</Text>
    </TouchableOpacity>
  </View>
);

// --- Loading screen ---
const LoadingScreen = () => (
  <View style={styles.loading}>
    <ActivityIndicator size="large" color={colors.accent} />
    <Text style={styles.loadingText}>Caricamento...</Text>
  </View>
);

// --- Main Navigator ---
export const AppNavigator: React.FC = () => {
  const { isAuthenticated, loading, role, user, logout } = useAuth();
  // null = selector, 'app' = ESSĒRE login, 'academy' = Academy login
  const [loginMode, setLoginMode] = useState<'app' | 'academy' | null>(null);
  const [loginModeLoaded, setLoginModeLoaded] = useState(false);

  // Load persisted loginMode on mount
  useEffect(() => {
    loadLoginMode().then((mode) => {
      setLoginMode(mode);
      setLoginModeLoaded(true);
    });
  }, []);

  // Persist loginMode whenever it changes
  const setLoginModeAndPersist = useCallback((mode: 'app' | 'academy' | null) => {
    setLoginMode(mode);
    saveLoginMode(mode);
  }, []);

  // On initial load, if user is NOT authenticated, reset loginMode to null
  // so the selector screen always shows. Persistence only matters while logged in.
  const initialCheckDone = useRef(false);
  useEffect(() => {
    if (loginModeLoaded && !loading && !initialCheckDone.current) {
      initialCheckDone.current = true;
      if (!isAuthenticated && loginMode !== null) {
        setLoginModeAndPersist(null);
      }
    }
  }, [loginModeLoaded, loading, isAuthenticated, loginMode, setLoginModeAndPersist]);

  const handleLogoutAndReset = useCallback(async () => {
    await logout();
    setLoginModeAndPersist(null);
  }, [logout, setLoginModeAndPersist]);

  if (loading || !loginModeLoaded) {
    return <LoadingScreen />;
  }

  // If authenticated but profile not loaded yet, show loading
  if (isAuthenticated && !user) {
    return <LoadingScreen />;
  }

  // Determine which tabs to show for Academy mode
  const AcademyTabsComponent = (role === 'owner' || role === 'manager')
    ? AcademyOnlyAdminTabs
    : AcademyOnlyStudentTabs;

  // Wrap Academy tabs with logout header
  const AcademyTabsWithLogout = () => (
    <View style={{ flex: 1 }}>
      <AcademyLogoutHeader onLogout={handleLogoutAndReset} />
      <AcademyTabsComponent />
    </View>
  );

  return (
    <NavigationContainer
      documentTitle={{
        formatter: () => loginMode === 'academy' ? 'FB Mind Movement Academy' : 'ESSĒRE',
      }}
    >
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          // Not authenticated: show login selector or specific login
          loginMode === null ? (
            <RootStack.Screen name="LoginSelector">
              {() => (
                <LoginSelectorScreen
                  onSelectApp={() => setLoginModeAndPersist('app')}
                  onSelectAcademy={() => setLoginModeAndPersist('academy')}
                />
              )}
            </RootStack.Screen>
          ) : loginMode === 'app' ? (
            <RootStack.Screen name="Login">
              {() => (
                <LoginScreen onBack={() => setLoginModeAndPersist(null)} />
              )}
            </RootStack.Screen>
          ) : (
            <RootStack.Screen name="AcademyLogin">
              {() => (
                <AcademyLoginScreen
                  onBack={() => setLoginModeAndPersist(null)}
                />
              )}
            </RootStack.Screen>
          )
        ) : loginMode === 'academy' ? (
          // Authenticated via Academy login: show only Academy tabs with logout
          <RootStack.Screen name="AcademyTabs" component={AcademyTabsWithLogout} />
        ) : role === 'owner' ? (
          <RootStack.Screen name="OwnerTabs" component={OwnerTabs} />
        ) : role === 'manager' ? (
          <RootStack.Screen name="ManagerTabs" component={ManagerTabs} />
        ) : role === 'collaborator' ? (
          <RootStack.Screen
            name="CollaboratorTabs"
            component={CollaboratorTabs}
          />
        ) : (
          <RootStack.Screen name="StudentTabs" component={StudentTabs} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.divider,
    borderTopWidth: 1,
    paddingTop: 4,
    paddingBottom: 4,
    height: 62,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 3,
  },
  scrollableTabBarContainer: {
    backgroundColor: colors.surface,
    borderTopColor: colors.divider,
    borderTopWidth: 1,
    paddingBottom: Platform.OS === 'web' ? 0 : 20,
  },
  academyTabBarContainer: {
    backgroundColor: '#0D0D0D',
    borderTopColor: GOLD_DARK + '40',
    borderTopWidth: 1,
    paddingBottom: Platform.OS === 'web' ? 0 : 20,
  },
  scrollableTabBarContent: {
    paddingHorizontal: 4,
  },
  scrollableTab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    minWidth: 64,
    minHeight: 48,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  scrollableTabLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 3,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  loadingText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.md,
    marginTop: 16,
  },
  academyLogoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0D0D0D',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'web' ? 12 : 48,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: GOLD_DARK + '30',
  },
  academyLogoutBrand: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  academyLogoutTitle: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: GOLD_DARK,
    letterSpacing: 1,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: GOLD_DARK + '50',
  },
  logoutBtnText: {
    color: GOLD,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
});
