import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSession } from '../../context/SessionContext';
import { apiFetch, setToken } from '../../lib/api';
import type { AuthStackParamList } from '../../navigation/types';

type GroupOption = { id: string; name: string };

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export function RegisterScreen({ navigation, route }: Props) {
  const { refresh } = useSession();
  const inviteFromRoute = route.params?.inviteToken?.trim() ?? '';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'STUDENT' | 'TEACHER'>(inviteFromRoute ? 'TEACHER' : 'STUDENT');
  const [inviteToken, setInviteToken] = useState(inviteFromRoute);
  const [groupId, setGroupId] = useState('');
  const [groupSearch, setGroupSearch] = useState('');
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [profilePhoto, setProfilePhoto] = useState<{ uri: string; mime: string } | null>(null);
  const [inviteStatus, setInviteStatus] = useState<'none' | 'loading' | 'ok' | 'bad'>(
    inviteFromRoute ? 'loading' : 'none',
  );
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const res = await apiFetch('/groups');
        if (res.ok) setGroups((await res.json()) as GroupOption[]);
      } catch {
        /* offline */
      }
    })();
  }, []);

  useEffect(() => {
    if (!inviteFromRoute) {
      setInviteStatus('none');
      return;
    }
    setInviteStatus('loading');
    void (async () => {
      try {
        const res = await apiFetch(`/auth/teacher-invite-preview?token=${encodeURIComponent(inviteFromRoute)}`);
        const data = (await res.json()) as { invitedEmail?: string; message?: string | string[] };
        if (res.ok && data.invitedEmail) {
          setEmail(data.invitedEmail);
          setRole('TEACHER');
          setInviteStatus('ok');
          setError(null);
        } else {
          const msg = Array.isArray(data.message) ? data.message.join(', ') : data.message;
          setError(msg ?? 'Недійсне запрошення');
          setInviteStatus('bad');
        }
      } catch {
        setError('Не вдалося перевірити запрошення');
        setInviteStatus('bad');
      }
    })();
  }, [inviteFromRoute]);

  const filteredGroups = useMemo(() => {
    const q = groupSearch.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) => g.name.toLowerCase().includes(q));
  }, [groups, groupSearch]);

  useEffect(() => {
    if (role !== 'STUDENT' || filteredGroups.length === 0) return;
    if (!groupId || !filteredGroups.some((g) => g.id === groupId)) {
      setGroupId(filteredGroups[0]!.id);
    }
  }, [role, filteredGroups, groupId]);

  async function pickPhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError('Потрібен дозвіл до галереї');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (!res.canceled && res.assets[0]) {
      const a = res.assets[0];
      setProfilePhoto({ uri: a.uri, mime: a.mimeType ?? 'image/jpeg' });
    }
  }

  async function onSubmit() {
    setError(null);
    setLoading(true);
    try {
      if (role === 'STUDENT') {
        if (!profilePhoto) throw new Error('Додайте фото профілю');
        const fd = new FormData();
        fd.append('email', email.trim().toLowerCase());
        fd.append('password', password);
        fd.append('name', name);
        fd.append('groupId', groupId);
        fd.append('image', { uri: profilePhoto.uri, name: 'profile.jpg', type: profilePhoto.mime } as unknown as Blob);
        const res = await apiFetch('/auth/register/student', { method: 'POST', body: fd });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const msg = Array.isArray(data.message) ? data.message.join(', ') : data.message;
          throw new Error(msg ?? 'Помилка реєстрації');
        }
        if (!data.access_token) throw new Error('Немає токена');
        await setToken(data.access_token);
        await refresh();
        return;
      }

      const body = { email, password, name, role: 'TEACHER', inviteToken: inviteToken.trim() || inviteFromRoute };
      const res = await apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = Array.isArray(data.message) ? data.message.join(', ') : data.message;
        throw new Error(msg ?? 'Помилка реєстрації');
      }
      if (!data.access_token) throw new Error('Немає токена');
      await setToken(data.access_token);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Помилка');
    } finally {
      setLoading(false);
    }
  }

  const teacherFlow = Boolean(inviteFromRoute);
  const canSubmitStudent =
    consent && role === 'STUDENT' && groupId && profilePhoto && name.length >= 2 && password.length >= 8;
  const canSubmitTeacher =
    consent &&
    role === 'TEACHER' &&
    name.length >= 2 &&
    password.length >= 8 &&
    email.includes('@') &&
    (teacherFlow ? inviteStatus === 'ok' : inviteToken.trim().length >= 20);

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Реєстрація</Text>
          <Pressable onPress={() => navigation.goBack()}>
            <Text style={styles.back}>← Назад</Text>
          </Pressable>
          {error ? <Text style={styles.err}>{error}</Text> : null}

          <Text style={styles.label}>Роль</Text>
          <View style={styles.roleRow}>
            <Pressable
              style={[styles.roleBtn, role === 'STUDENT' && styles.roleBtnOn]}
              onPress={() => setRole('STUDENT')}
              disabled={teacherFlow}
            >
              <Text style={[styles.roleTxt, role === 'STUDENT' && styles.roleTxtOn]}>Студент</Text>
            </Pressable>
            <Pressable
              style={[styles.roleBtn, role === 'TEACHER' && styles.roleBtnOn]}
              onPress={() => setRole('TEACHER')}
              disabled={teacherFlow}
            >
              <Text style={[styles.roleTxt, role === 'TEACHER' && styles.roleTxtOn]}>Викладач</Text>
            </Pressable>
          </View>

          <Text style={styles.label}>ПІБ</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Іван Петренко" />

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={[styles.input, teacherFlow && styles.inputDisabled]}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!teacherFlow}
          />

          <Text style={styles.label}>Пароль (мін. 8)</Text>
          <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry />

          {role === 'TEACHER' && !teacherFlow ? (
            <>
              <Text style={styles.label}>Токен запрошення з листа</Text>
              <TextInput style={styles.input} value={inviteToken} onChangeText={setInviteToken} autoCapitalize="none" />
            </>
          ) : null}

          {role === 'STUDENT' ? (
            <>
              <Text style={styles.label}>Група</Text>
              <TextInput
                style={styles.input}
                placeholder="Пошук…"
                value={groupSearch}
                onChangeText={setGroupSearch}
              />
              <View style={styles.groupList}>
                {filteredGroups.map((g) => (
                  <Pressable
                    key={g.id}
                    style={[styles.groupChip, groupId === g.id && styles.groupChipOn]}
                    onPress={() => setGroupId(g.id)}
                  >
                    <Text style={[styles.groupChipTxt, groupId === g.id && styles.groupChipTxtOn]}>{g.name}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.label}>Фото обличчя</Text>
              <Pressable style={styles.pickBtn} onPress={() => void pickPhoto()}>
                <Text style={styles.pickBtnTxt}>{profilePhoto ? 'Змінити фото' : 'Обрати з галереї'}</Text>
              </Pressable>
            </>
          ) : null}

          <Pressable style={styles.consentRow} onPress={() => setConsent((v) => !v)}>
            <View style={[styles.checkbox, consent && styles.checkboxOn]}>
              {consent ? <Text style={styles.checkmark}>✓</Text> : null}
            </View>
            <Text style={styles.consentTxt}>
              Я погоджуюсь на обробку моїх персональних даних (ім'я, email, фото обличчя) з метою ідентифікації та
              обліку відвідуваності.
            </Text>
          </Pressable>

          <Pressable
            style={[styles.submit, (loading || (!canSubmitStudent && !canSubmitTeacher)) && styles.submitOff]}
            disabled={loading || (role === 'STUDENT' ? !canSubmitStudent : !canSubmitTeacher)}
            onPress={() => void onSubmit()}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitTxt}>Зареєструватися</Text>
            )}
          </Pressable>

          <Pressable onPress={() => navigation.navigate('Login')}>
            <Text style={styles.link}>Вже є акаунт? Увійти</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  flex: { flex: 1 },
  scroll: { padding: 24, paddingBottom: 48, gap: 10 },
  title: { fontSize: 24, fontWeight: '900', color: '#0f172a' },
  back: { color: '#4f46e5', fontWeight: '700', marginBottom: 6 },
  err: { color: '#dc2626', marginVertical: 4 },
  label: { fontSize: 12, fontWeight: '800', color: '#64748b', marginTop: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#0f172a',
  },
  inputDisabled: { backgroundColor: '#f1f5f9', color: '#64748b' },
  roleRow: { flexDirection: 'row', gap: 10 },
  roleBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  roleBtnOn: { borderColor: '#4f46e5', backgroundColor: '#eef2ff' },
  roleTxt: { fontWeight: '700', color: '#64748b' },
  roleTxtOn: { color: '#4f46e5' },
  groupList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  groupChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  groupChipOn: { borderColor: '#4f46e5', backgroundColor: '#eef2ff' },
  groupChipTxt: { fontWeight: '600', color: '#334155', fontSize: 13 },
  groupChipTxtOn: { color: '#4f46e5' },
  pickBtn: {
    borderWidth: 1,
    borderColor: '#c7d2fe',
    borderRadius: 12,
    padding: 14,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
  },
  pickBtnTxt: { fontWeight: '800', color: '#4338ca' },
  consentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 8 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  checkboxOn: { borderColor: '#4f46e5', backgroundColor: '#4f46e5' },
  checkmark: { color: '#fff', fontSize: 13, fontWeight: '900', lineHeight: 16 },
  consentTxt: { flex: 1, fontSize: 12, color: '#64748b', lineHeight: 18 },
  submit: {
    marginTop: 16,
    backgroundColor: '#4f46e5',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  submitOff: { opacity: 0.55 },
  submitTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
  link: { textAlign: 'center', color: '#4f46e5', fontWeight: '700', marginTop: 12 },
});
