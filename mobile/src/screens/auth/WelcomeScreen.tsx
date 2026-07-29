import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Welcome'>;

export function WelcomeScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.brand}>AttendanceMaster</Text>
        <Text style={styles.tag}>Мобільний клієнт</Text>
        <Text style={styles.sub}>Вхід для студентів та викладачів. Адмін-панель — на сайті.</Text>
        <Pressable style={styles.primary} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.primaryText}>Увійти</Text>
        </Pressable>
        <Pressable style={styles.secondary} onPress={() => navigation.navigate('Register')}>
          <Text style={styles.secondaryText}>Створити акаунт</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  container: { flex: 1, padding: 24, justifyContent: 'center', gap: 16 },
  brand: { fontSize: 28, fontWeight: '900', color: '#0f172a' },
  tag: { fontSize: 14, fontWeight: '700', color: '#4f46e5' },
  sub: { fontSize: 15, color: '#64748b', lineHeight: 22, marginBottom: 12 },
  primary: {
    backgroundColor: '#4f46e5',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  secondary: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  secondaryText: { color: '#334155', fontWeight: '700', fontSize: 16 },
});
