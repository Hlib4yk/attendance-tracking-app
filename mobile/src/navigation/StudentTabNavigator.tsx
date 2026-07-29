import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useSession } from '../context/SessionContext';
import { StudentAttendanceScreen } from '../screens/student/StudentAttendanceScreen';
import { StudentHomeScreen } from '../screens/student/StudentHomeScreen';
import { StudentScheduleScreen } from '../screens/student/StudentScheduleScreen';
import type { StudentTabParamList } from './types';

const Tab = createBottomTabNavigator<StudentTabParamList>();

function HeaderLogout() {
  const { logout } = useSession();
  return (
    <Pressable onPress={() => void logout()} style={styles.headerBtn}>
      <Text style={styles.headerBtnTxt}>Вийти</Text>
    </Pressable>
  );
}

export function StudentTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#4f46e5',
        tabBarInactiveTintColor: '#94a3b8',
      }}
    >
      <Tab.Screen
        name="StudentHome"
        component={StudentHomeScreen}
        options={{
          title: 'Головна',
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
          headerRight: () => <HeaderLogout />,
        }}
      />
      <Tab.Screen
        name="StudentSchedule"
        component={StudentScheduleScreen}
        options={{
          title: 'Розклад',
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" size={size} color={color} />,
          headerRight: () => <HeaderLogout />,
        }}
      />
      <Tab.Screen
        name="StudentAttendance"
        component={StudentAttendanceScreen}
        options={{
          title: 'Відвідуваність',
          tabBarIcon: ({ color, size }) => <Ionicons name="checkmark-done-outline" size={size} color={color} />,
          headerRight: () => <HeaderLogout />,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  headerBtn: { marginRight: 12, paddingVertical: 6, paddingHorizontal: 10 },
  headerBtnTxt: { color: '#dc2626', fontWeight: '800', fontSize: 14 },
});
