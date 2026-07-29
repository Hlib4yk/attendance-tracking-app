import { useFocusEffect } from '@react-navigation/native';
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

type SessionRow = {
  id: string;
  date: string;
  confirmed: boolean;
  subject: { id: string; name: string; teacher?: { user?: { name: string } | null } | null };
};

type Me = {
  user: { name: string; email: string };
  group: { name: string };
};

type LpnuScheduleResponse = {
  source: 'student';
  slots: LpnuSlot[];
  params: Record<string, string>;
  fetchedAt: string;
  cached: boolean;
  expiresAt: string;
  officialUrl: string;
  message?: string;
};

export function StudentScheduleScreen() {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [semestr, setSemestr] = useState<'1' | '2'>('2');
  const [semestrduration, setSemestrduration] = useState<'1' | '2'>('1');
  const [lpnu, setLpnu] = useState<LpnuScheduleResponse | null>(null);
  const [lpnuLoading, setLpnuLoading] = useState(false);
  const [lpnuError, setLpnuError] = useState<string | null>(null);

  const loadCore = useCallback(async () => {
    const [mRes, sRes] = await Promise.all([apiFetch('/student/me'), apiFetch('/student/schedule')]);
    if (mRes.ok) setMe((await mRes.json()) as Me);
    if (sRes.ok) {
      const data = (await sRes.json()) as SessionRow[];
      setSessions(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    }
  }, []);

  const loadLpnu = useCallback(async () => {
    if (!me?.group?.name) return;
    setLpnuLoading(true);
    setLpnuError(null);
    try {
      const q = new URLSearchParams({
        studygroup_abbrname: me.group.name,
        semestr,
        semestrduration,
      });
      const res = await apiFetch(`/schedule/lpnu/student?${q.toString()}`);
      const data = (await res.json().catch(() => ({}))) as LpnuScheduleResponse & { message?: string };
      if (!res.ok) {
        const msg = Array.isArray(data.message) ? data.message.join(', ') : data.message;
        throw new Error(msg ?? 'Не вдалося завантажити розклад LPNU');
      }
      setLpnu(data);
    } catch (e) {
      setLpnu(null);
      setLpnuError(e instanceof Error ? e.message : 'Помилка');
    } finally {
      setLpnuLoading(false);
    }
  }, [me?.group?.name, semestr, semestrduration]);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      setLoading(true);
      void (async () => {
        await loadCore();
        if (alive) setLoading(false);
      })();
      return () => {
        alive = false;
      };
    }, [loadCore]),
  );

  useEffect(() => {
    if (!me?.group?.name) return;
    void loadLpnu();
  }, [me?.group?.name, loadLpnu]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadCore();
    await loadLpnu();
    setRefreshing(false);
  }, [loadCore, loadLpnu]);

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
            <Text style={styles.muted}>{s.subject.teacher?.user?.name ?? 'Викладач'}</Text>
            <Text style={styles.date}>
              {new Date(s.date).toLocaleString('uk-UA', { dateStyle: 'medium', timeStyle: 'short' })}
            </Text>
            <Text style={[styles.badge, s.confirmed ? styles.badgeOk : styles.badgeWait]}>
              {s.confirmed ? 'Відвідування зафіксовано' : 'Очікується'}
            </Text>
          </View>
        ))
      )}

      <Text style={[styles.h2, { marginTop: 24 }]}>Розклад LPNU</Text>
      <Text style={styles.muted}>Група: {me?.group?.name ?? '—'}</Text>

      <View style={styles.filters}>
        <Pressable
          style={[styles.chip, semestr === '1' && styles.chipOn]}
          onPress={() => setSemestr('1')}
        >
          <Text style={[styles.chipTxt, semestr === '1' && styles.chipTxtOn]}>1 сем.</Text>
        </Pressable>
        <Pressable
          style={[styles.chip, semestr === '2' && styles.chipOn]}
          onPress={() => setSemestr('2')}
        >
          <Text style={[styles.chipTxt, semestr === '2' && styles.chipTxtOn]}>2 сем.</Text>
        </Pressable>
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
          <Text style={styles.linkBtnTxt}>Відкрити сайт LPNU</Text>
        </Pressable>
      ) : null}

      {lpnuError ? <Text style={styles.err}>{lpnuError}</Text> : null}
      {lpnuLoading && !lpnu?.slots?.length ? <Text style={styles.muted}>Завантаження LPNU…</Text> : null}
      {!lpnuLoading && lpnu && lpnu.slots.length === 0 && !lpnuError ? (
        <Text style={styles.muted}>Немає даних LPNU для цих параметрів.</Text>
      ) : null}

      <LpnuScheduleGrouped slots={lpnu?.slots ?? []} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#f8fafc' },
  inner: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  h2: { fontSize: 18, fontWeight: '900', color: '#0f172a', marginBottom: 10 },
  muted: { color: '#64748b', fontSize: 14, marginBottom: 8 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 10,
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  date: { fontSize: 13, color: '#64748b', marginTop: 6 },
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
  err: { color: '#dc2626', marginBottom: 8 },
});
