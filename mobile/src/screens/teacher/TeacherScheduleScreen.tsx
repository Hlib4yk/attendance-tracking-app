import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LpnuScheduleGrouped } from '../../components/LpnuScheduleGrouped';
import { apiFetch } from '../../lib/api';
import type { LpnuSlot } from '../../lib/lpnu-schedule';
import type { TeacherTabParamList } from '../../navigation/types';

type SessionRow = {
  id: string;
  date: string;
  confirmed: boolean;
  subject: { id: string; name: string };
  group?: { id: string; name: string } | null;
};

type Me = {
  id: string;
  email: string;
  name: string;
  role: string;
};

type LpnuScheduleResponse = {
  source: 'lecturer';
  slots: LpnuSlot[];
  params: Record<string, string>;
  fetchedAt: string;
  cached: boolean;
  expiresAt: string;
  officialUrl: string;
  message?: string;
};

type SubjectRow = {
  id: string;
  name: string;
  groups: { id: string; name: string }[];
};

type SyncGroupsResult = {
  linkedFromSchedule: string[];
  missingInDatabase: string[];
  codesDetectedInSchedule: { raw: string; normalized: string }[];
  subjectGroups: { id: string; name: string }[];
  lpnuCached: boolean;
  lpnuFetchedAt: string;
};

type Nav = BottomTabNavigationProp<TeacherTabParamList, 'TeacherSchedule'>;

export function TeacherScheduleScreen() {
  const navigation = useNavigation<Nav>();
  const [me, setMe] = useState<Me | null>(null);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncSubjectId, setSyncSubjectId] = useState('');
  const [syncBusy, setSyncBusy] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncGroupsResult | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [semestr, setSemestr] = useState<'All' | '1' | '2'>('2');
  const [semestrduration, setSemestrduration] = useState<'1' | '2'>('1');
  const [lpnu, setLpnu] = useState<LpnuScheduleResponse | null>(null);
  const [lpnuLoading, setLpnuLoading] = useState(false);
  const [lpnuError, setLpnuError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    const meRes = await apiFetch('/auth/me');
    if (!meRes.ok) return;
    const meJson = (await meRes.json()) as Me;
    setMe(meJson);
    const subRes = await apiFetch('/teacher/subjects');
    if (!subRes.ok) return;
    const subjectsJson = (await subRes.json()) as SubjectRow[];
    setSubjects(subjectsJson);
    const sessionLists = await Promise.all(
      subjectsJson.map(async (s) => {
        const r = await apiFetch(`/teacher/subjects/${s.id}/sessions`);
        if (!r.ok) return [] as SessionRow[];
        const rows = (await r.json()) as {
          id: string;
          date: string;
          confirmed: boolean;
          group?: { id: string; name: string } | null;
        }[];
        return rows.map((row) => ({
          ...row,
          subject: { id: s.id, name: s.name },
        }));
      }),
    );
    const flat = sessionLists.flat().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setSessions(flat);
  }, []);

  const loadLpnu = useCallback(async () => {
    if (!me?.name) return;
    setLpnuLoading(true);
    setLpnuError(null);
    try {
      const q = new URLSearchParams({
        teachername: me.name,
        semestr,
        semestrduration,
      });
      const res = await apiFetch(`/schedule/lpnu/lecturer?${q.toString()}`);
      const data = (await res.json().catch(() => ({}))) as LpnuScheduleResponse & { message?: string };
      if (!res.ok) {
        const msg = Array.isArray(data.message) ? data.message.join(', ') : data.message;
        throw new Error(msg ?? 'Не вдалося завантажити LPNU');
      }
      setLpnu(data);
    } catch (e) {
      setLpnu(null);
      setLpnuError(e instanceof Error ? e.message : 'Помилка');
    } finally {
      setLpnuLoading(false);
    }
  }, [me?.name, semestr, semestrduration]);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      setLoading(true);
      void (async () => {
        await loadAll();
        if (alive) setLoading(false);
      })();
      return () => {
        alive = false;
      };
    }, [loadAll]),
  );

  useEffect(() => {
    if (!me?.name) return;
    void loadLpnu();
  }, [me?.name, loadLpnu]);

  useEffect(() => {
    if (!subjects.length) return;
    setSyncSubjectId((id) => (id && subjects.some((s) => s.id === id) ? id : subjects[0]!.id));
  }, [subjects]);

  const runSync = useCallback(async () => {
    if (!syncSubjectId) return;
    setSyncBusy(true);
    setSyncError(null);
    setSyncResult(null);
    try {
      const res = await apiFetch(`/teacher/subjects/${syncSubjectId}/sync-groups-from-lpnu`, {
        method: 'POST',
        body: JSON.stringify({ semestr, semestrduration }),
      });
      const data = (await res.json().catch(() => ({}))) as SyncGroupsResult & { message?: string | string[] };
      if (!res.ok) {
        const msg = Array.isArray(data.message) ? data.message.join(', ') : data.message;
        throw new Error(typeof msg === 'string' ? msg : 'Помилка синхронізації');
      }
      setSyncResult(data);
      setSubjects((prev) => prev.map((s) => (s.id === syncSubjectId ? { ...s, groups: data.subjectGroups } : s)));
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : 'Помилка');
    } finally {
      setSyncBusy(false);
    }
  }, [syncSubjectId, semestr, semestrduration]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    await loadLpnu();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.inner}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
    >
      <Text style={styles.h2}>Заняття в системі</Text>
      {sessions.length === 0 ? (
        <Text style={styles.muted}>Поки немає записів.</Text>
      ) : (
        sessions.map((s) => (
          <View key={s.id} style={styles.card}>
            <Text style={styles.cardTitle}>{s.subject.name}</Text>
            <Text style={styles.muted}>{s.group?.name ? `Група ${s.group.name}` : 'Група'}</Text>
            <Text style={styles.muted}>
              {new Date(s.date).toLocaleString('uk-UA', { dateStyle: 'medium', timeStyle: 'short' })}
            </Text>
            <Text style={[styles.badge, s.confirmed ? styles.badgeOk : styles.badgeWait]}>
              {s.confirmed ? 'Зафіксовано' : 'Очікується'}
            </Text>
          </View>
        ))
      )}

      <Text style={[styles.h2, { marginTop: 20 }]}>Розклад LPNU</Text>
      <Text style={styles.muted}>Викладач: {me?.name ?? '—'}</Text>

      <View style={styles.filters}>
        {(['All', '1', '2'] as const).map((v) => (
          <Pressable key={v} style={[styles.chip, semestr === v && styles.chipOn]} onPress={() => setSemestr(v)}>
            <Text style={[styles.chipTxt, semestr === v && styles.chipTxtOn]}>
              {v === 'All' ? 'Рік' : v === '1' ? '1 сем.' : '2 сем.'}
            </Text>
          </Pressable>
        ))}
        <Pressable
          style={[styles.chip, semestrduration === '1' && styles.chipOn]}
          onPress={() => setSemestrduration('1')}
        >
          <Text style={[styles.chipTxt, semestrduration === '1' && styles.chipTxtOn]}>1 пол.</Text>
        </Pressable>
        <Pressable
          style={[styles.chip, semestrduration === '2' && styles.chipOn]}
          onPress={() => setSemestrduration('2')}
        >
          <Text style={[styles.chipTxt, semestrduration === '2' && styles.chipTxtOn]}>2 пол.</Text>
        </Pressable>
      </View>

      {lpnu?.officialUrl ? (
        <Pressable style={styles.linkBtn} onPress={() => void Linking.openURL(lpnu.officialUrl)}>
          <Text style={styles.linkBtnTxt}>Сайт LPNU</Text>
        </Pressable>
      ) : null}

      <View style={styles.syncBox}>
        <Text style={styles.syncTitle}>Групи з LPNU → предмет</Text>
        {subjects.length === 0 ? (
          <Text style={styles.muted}>Немає предметів.</Text>
        ) : (
          <>
            <View style={styles.syncRow}>
              {subjects.map((s) => (
                <Pressable
                  key={s.id}
                  style={[styles.chip, syncSubjectId === s.id && styles.chipOn]}
                  onPress={() => setSyncSubjectId(s.id)}
                >
                  <Text style={[styles.chipTxt, syncSubjectId === s.id && styles.chipTxtOn]} numberOfLines={1}>
                    {s.name.length > 22 ? `${s.name.slice(0, 22)}…` : s.name}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Pressable style={styles.syncBtn} onPress={() => void runSync()} disabled={syncBusy}>
              <Text style={styles.syncBtnTxt}>{syncBusy ? '…' : 'Додати групи з LPNU'}</Text>
            </Pressable>
          </>
        )}
        {syncError ? <Text style={styles.err}>{syncError}</Text> : null}
        {syncResult ? (
          <Text style={styles.syncRes}>
            Додано: {syncResult.linkedFromSchedule.length ? syncResult.linkedFromSchedule.join(', ') : '—'}
          </Text>
        ) : null}
      </View>

      {lpnuError ? <Text style={styles.err}>{lpnuError}</Text> : null}
      {lpnuLoading && !lpnu?.slots?.length ? <Text style={styles.muted}>Завантаження LPNU…</Text> : null}

      <LpnuScheduleGrouped
        slots={lpnu?.slots ?? []}
        attendanceSemester={{ semestr, semestrduration }}
        onAttendanceSlotPress={(p) => {
          navigation.navigate('TeacherAttendance', {
            day: p.day,
            period: String(p.period),
            variant: String(p.variant),
            semestr: p.semestr,
            semestrduration: p.semestrduration,
          });
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#f8fafc' },
  inner: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  h2: { fontSize: 18, fontWeight: '900', color: '#0f172a', marginBottom: 10 },
  muted: { color: '#64748b', fontSize: 14, marginBottom: 6 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 10,
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  badge: { marginTop: 8, alignSelf: 'flex-start', fontSize: 10, fontWeight: '800', textTransform: 'uppercase', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 99, overflow: 'hidden' },
  badgeOk: { backgroundColor: '#dcfce7', color: '#15803d' },
  badgeWait: { backgroundColor: '#fef3c7', color: '#b45309' },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 12 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  chipOn: { borderColor: '#4f46e5', backgroundColor: '#eef2ff' },
  chipTxt: { fontWeight: '700', color: '#64748b', fontSize: 13 },
  chipTxtOn: { color: '#4f46e5' },
  linkBtn: {
    backgroundColor: '#4f46e5',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  linkBtnTxt: { color: '#fff', fontWeight: '800' },
  syncBox: {
    borderWidth: 1,
    borderColor: '#c7d2fe',
    borderRadius: 16,
    padding: 14,
    backgroundColor: '#f8fafc',
    marginBottom: 14,
  },
  syncTitle: { fontWeight: '800', color: '#0f172a', marginBottom: 8 },
  syncRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  syncBtn: {
    backgroundColor: '#4f46e5',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  syncBtnTxt: { color: '#fff', fontWeight: '800' },
  err: { color: '#dc2626', marginTop: 8 },
  syncRes: { fontSize: 13, color: '#475569', marginTop: 8 },
});
