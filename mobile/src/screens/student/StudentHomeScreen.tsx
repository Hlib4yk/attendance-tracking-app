import React, { useCallback, useState } from 'react';
import { Image, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { apiFetch, fileUrl } from '../../lib/api';

type Me = {
  user: { name: string; email: string };
  group: { name: string };
  profilePhotoUrl: string | null;
};

type SessionRow = {
  id: string;
  date: string;
  subject: { id: string; name: string; teacher?: { user?: { name: string } | null } | null };
};

type AttendancePayload = {
  bySubject: {
    subject: string;
    rate: number;
    totalClasses: number;
    attended: number;
    absent: number;
  }[];
};

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

const BAR_COLORS = ['#4f46e5', '#f59e0b', '#22c55e', '#f43f5e', '#3b82f6'];

export function StudentHomeScreen() {
  const [me, setMe] = useState<Me | null>(null);
  const [schedule, setSchedule] = useState<SessionRow[]>([]);
  const [attendance, setAttendance] = useState<AttendancePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [mRes, sRes, aRes] = await Promise.all([
      apiFetch('/student/me'),
      apiFetch('/student/schedule'),
      apiFetch('/student/attendance'),
    ]);
    if (mRes.ok) setMe((await mRes.json()) as Me);
    if (sRes.ok) setSchedule(await sRes.json());
    if (aRes.ok) setAttendance(await aRes.json());
  }, []);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      setLoading(true);
      void (async () => {
        await load();
        if (alive) setLoading(false);
      })();
      return () => {
        alive = false;
      };
    }, [load]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  if (loading || !me) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Завантаження…</Text>
      </View>
    );
  }

  const firstName = me.user.name.split(/\s+/)[0] ?? me.user.name;
  const now = new Date();
  const todaySessions = schedule.filter((s) => sameDay(new Date(s.date), now));
  const bySub = attendance?.bySubject ?? [];
  const withClasses = bySub.filter((b) => b.totalClasses > 0);
  const avgRate =
    withClasses.length > 0
      ? Math.round(withClasses.reduce((acc, b) => acc + b.rate, 0) / withClasses.length)
      : null;
  const worst = withClasses.reduce(
    (w, b) => (!w || b.rate < w.rate ? b : w),
    null as (typeof bySub)[0] | null,
  );
  const photo = fileUrl(me.profilePhotoUrl);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.inner}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
    >
      <View style={styles.hero}>
        {photo ? (
          <Image source={{ uri: photo }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPh}>
            <Text style={styles.avatarPhTxt}>{firstName.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.h1}>Вітаємо, {firstName}!</Text>
          <Text style={styles.sub}>
            Група <Text style={styles.bold}>{me.group.name}</Text>
            {todaySessions.length > 0 ? ` · сьогодні ${todaySessions.length} занять у БД` : ' · на сьогодні немає записів'}
          </Text>
        </View>
      </View>

      <View style={styles.statRow}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Середній %</Text>
          <Text style={styles.statVal}>{avgRate != null ? `${avgRate}%` : '—'}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Предметів</Text>
          <Text style={styles.statVal}>{bySub.length}</Text>
        </View>
      </View>

      <Text style={styles.section}>Сьогодні в системі</Text>
      {todaySessions.length === 0 ? (
        <Text style={styles.muted}>Немає сесій на сьогодні.</Text>
      ) : (
        todaySessions.map((item) => (
          <View key={item.id} style={styles.card}>
            <Text style={styles.cardTitle}>{item.subject.name}</Text>
            <Text style={styles.muted}>{item.subject.teacher?.user?.name ?? 'Викладач'}</Text>
            <Text style={styles.time}>
              {new Date(item.date).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        ))
      )}

      <Text style={styles.section}>Успішність за предметами</Text>
      {bySub.slice(0, 6).map((subject, i) => (
        <View key={subject.subject} style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>{subject.subject}</Text>
            <Text style={[styles.pct, subject.rate < 80 && { color: '#f43f5e' }]}>{subject.rate}%</Text>
          </View>
          <Text style={styles.muted}>
            {subject.attended} / {subject.totalClasses} занять
          </Text>
          <View style={styles.barBg}>
            <View style={[styles.barFg, { width: `${subject.rate}%`, backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }]} />
          </View>
        </View>
      ))}

      {worst && worst.rate < 85 ? (
        <View style={styles.hint}>
          <Text style={styles.hintTitle}>Підказка</Text>
          <Text style={styles.hintTxt}>
            Найнижча відвідуваність: <Text style={styles.bold}>{worst.subject}</Text> ({worst.rate}%).
          </Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#f8fafc' },
  inner: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  muted: { color: '#64748b', fontSize: 14 },
  hero: { flexDirection: 'row', gap: 14, marginBottom: 20 },
  avatar: { width: 56, height: 56, borderRadius: 16, backgroundColor: '#e2e8f0' },
  avatarPh: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPhTxt: { fontSize: 22, fontWeight: '900', color: '#4f46e5' },
  h1: { fontSize: 22, fontWeight: '900', color: '#0f172a' },
  sub: { fontSize: 14, color: '#64748b', marginTop: 4 },
  bold: { fontWeight: '800', color: '#0f172a' },
  statRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statBox: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statLabel: { fontSize: 10, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' },
  statVal: { fontSize: 22, fontWeight: '900', color: '#4f46e5', marginTop: 4 },
  section: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 10, marginTop: 8 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 10,
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  time: { fontSize: 12, color: '#64748b', marginTop: 6 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pct: { fontSize: 18, fontWeight: '900', color: '#4f46e5' },
  barBg: { height: 8, backgroundColor: '#f1f5f9', borderRadius: 99, marginTop: 10, overflow: 'hidden' },
  barFg: { height: '100%', borderRadius: 99 },
  hint: { backgroundColor: '#0f172a', borderRadius: 20, padding: 18, marginTop: 12 },
  hintTitle: { fontSize: 16, fontWeight: '800', color: '#fff', marginBottom: 8 },
  hintTxt: { fontSize: 14, color: '#94a3b8', lineHeight: 20 },
});
