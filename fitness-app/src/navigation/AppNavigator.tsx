import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, Platform, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize } from '../config/theme';
import { useAuth } from '../hooks/useAuth';

// Screens
import { LoginScreen } from '../screens/auth/LoginScreen';
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
import { AnalyticsScreen } from '../screens/owner/AnalyticsScreen';
import { ManagerDashboardScreen } from '../screens/manager/ManagerDashboardScreen';

const RootStack = createStackNavigator();
const OwnerTab = createBottomTabNavigator();
const ManagerTab = createBottomTabNavigator();
const CollaboratorTab = createBottomTabNavigator();
const StudentTab = createBottomTabNavigator();

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ICON_SIZE = 26;

const TabIcon = ({ name, focused }: { name: IoniconsName; focused: boolean }) => (
  <Ionicons
    name={name}
    size={TAB_ICON_SIZE}
    color={focused ? colors.accent : colors.textLight}
  />
);

// Custom scrollable tab bar for navigators with many tabs
const ScrollableTabBar = ({ state, descriptors, navigation }: any) => (
  <View style={styles.scrollableTabBarContainer}>
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
      name="Postura"
      component={PosturalAssessmentScreen}
      options={{
        tabBarLabel: 'Postura',
        tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'body' : 'body-outline'} focused={focused} />,
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
    screenOptions={{
      tabBarActiveTintColor: colors.accent,
      tabBarInactiveTintColor: colors.textLight,
      tabBarStyle: styles.tabBar,
      tabBarLabelStyle: styles.tabLabel,
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

// --- Loading screen ---
const LoadingScreen = () => (
  <View style={styles.loading}>
    <ActivityIndicator size="large" color={colors.accent} />
    <Text style={styles.loadingText}>Caricamento...</Text>
  </View>
);

// --- Main Navigator ---
export const AppNavigator: React.FC = () => {
  const { isAuthenticated, loading, role } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <RootStack.Screen name="Login" component={LoginScreen} />
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
    paddingBottom: Platform.OS === 'web' ? 8 : 20,
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
});
