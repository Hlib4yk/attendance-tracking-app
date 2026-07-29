import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useSession } from '../context/SessionContext';
import { TeacherAttendanceScreen } from '../screens/teacher/TeacherAttendanceScreen';
import { TeacherHomeScreen } from '../screens/teacher/TeacherHomeScreen';
import { TeacherScheduleScreen } from '../screens/teacher/TeacherScheduleScreen';
import { ReportsScreen } from '../screens/teacher/ReportsScreen';
import { SessionDetailScreen } from '../screens/teacher/SessionDetailScreen';
import { AnalyticsScreen } from '../screens/teacher/AnalyticsScreen';
import type { TeacherTabParamList, ReportsStackParamList } from './types';

const ReportsStack = createNativeStackNavigator<ReportsStackParamList>();

function ReportsNavigator() {
  return (
    <ReportsStack.Navigator>
      <ReportsStack.Screen
        name="ReportsList"
        component={ReportsScreen}
        options={{ headerShown: false }}
      />
      <ReportsStack.Screen
        name="SessionDetail"
        component={SessionDetailScreen}
        options={({ route }) => ({
          title: route.params.subjectName,
          headerBackTitle: 'Звіти',
          headerTintColor: '#4f46e5',
          headerTitleStyle: { fontWeight: '800' as const, color: '#0f172a' },
        })}
      />
    </ReportsStack.Navigator>
  );
}

const Tab = createBottomTabNavigator<TeacherTabParamList>();

function HeaderLogout() {
  const { logout } = useSession();
  return (
    <Pressable onPress={() => void logout()} style={styles.headerBtn}>
      <Text style={styles.headerBtnTxt}>Вийти</Text>
    </Pressable>
  );
}

export function TeacherTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#4f46e5',
        tabBarInactiveTintColor: '#94a3b8',
        headerRight: () => <HeaderLogout />,
      }}
    >
      <Tab.Screen
        name="TeacherHome"
        component={TeacherHomeScreen}
        options={{
          title: 'Головна',
          tabBarLabel: 'Головна',
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="TeacherAttendance"
        component={TeacherAttendanceScreen}
        options={{
          title: 'Журнал',
          tabBarLabel: 'Журнал',
          tabBarIcon: ({ color, size }) => <Ionicons name="camera-outline" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="TeacherSchedule"
        component={TeacherScheduleScreen}
        options={{
          title: 'Розклад',
          tabBarLabel: 'Розклад',
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="ReportsStack"
        component={ReportsNavigator}
        options={{
          title: 'Звіти',
          tabBarLabel: 'Звіти',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Ionicons name="document-text-outline" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{
          title: 'Аналітика',
          tabBarLabel: 'Аналітика',
          tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart-outline" size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  headerBtn: { marginRight: 12, paddingVertical: 6, paddingHorizontal: 10 },
  headerBtnTxt: { color: '#dc2626', fontWeight: '800', fontSize: 14 },
});
