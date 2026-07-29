import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSession } from '../../context/SessionContext';
import { apiFetch, setToken } from '../../lib/api';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const { refresh } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        access_token?: string;
        message?: string | string[] | Record<string, string[]>;
      };
      if (!res.ok) {
        const msg = Array.isArray(data.message) ? data.message.join(', ') : (data.message as string);
        throw new Error(msg ?? 'Помилка входу');
      }
      if (!data.access_token) throw new Error('Немає токена');
      await setToken(data.access_token);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Помилка входу');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <View style={styles.card}>
          <Text style={styles.title}>Вхід</Text>
          <Pressable onPress={() => navigation.goBack()}>
            <Text style={styles.back}>← Назад</Text>
          </Pressable>
          {error ? <Text style={styles.err}>{error}</Text> : null}
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#94a3b8"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="Пароль"
            placeholderTextColor="#94a3b8"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <Pressable
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={() => void submit()}
            disabled={loading || !email.trim() || !password}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Увійти</Text>
            )}
          </Pressable>
          <Pressable onPress={() => navigation.navigate('Register')}>
            <Text style={styles.link}>Немає акаунта? Зареєструватися</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  flex: { flex: 1, justifyContent: 'center', padding: 24 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 22, borderWidth: 1, borderColor: '#e2e8f0', gap: 14 },
  title: { fontSize: 24, fontWeight: '900', color: '#0f172a' },
  back: { color: '#4f46e5', fontWeight: '700', fontSize: 14 },
  err: { color: '#dc2626', fontSize: 14 },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#0f172a',
  },
  btn: {
    backgroundColor: '#4f46e5',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.55 },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  link: { textAlign: 'center', color: '#4f46e5', fontWeight: '700', marginTop: 4 },
});
