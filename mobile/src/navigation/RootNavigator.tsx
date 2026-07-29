import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useSession } from '../context/SessionContext';
import { AdminWebOnlyScreen } from '../screens/AdminWebOnlyScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { WelcomeScreen } from '../screens/auth/WelcomeScreen';
import { StudentTabNavigator } from './StudentTabNavigator';
import { TeacherTabNavigator } from './TeacherTabNavigator';
import type { AuthStackParamList } from './types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

export function RootNavigator() {
  const { me, ready } = useSession();

  if (!ready) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  if (!me) {
    return <AuthStack />;
  }

  if (me.role === 'ADMIN') {
    return <AdminWebOnlyScreen />;
  }

  if (me.role === 'STUDENT') {
    return <StudentTabNavigator />;
  }

  if (me.role === 'TEACHER') {
    return <TeacherTabNavigator />;
  }

  return <AuthStack />;
}

const styles = StyleSheet.create({
  splash: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
});
