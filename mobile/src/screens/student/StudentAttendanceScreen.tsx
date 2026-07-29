import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { apiFetch } from '../../lib/api';

type BySubject = {
  subject: string;
  rate: number;
  totalClasses: number;
  attended: number;
  absent: number;
};

type AttendancePayload = {
  bySubject: BySubject[];
  history: {
    id: string;
    status: string;
    session: { date: string; subject: { name: string } };
  }[];
};

const COLORS = ['#4f46e5', '#f59e0b', '#22c55e', '#f43f5e', '#3b82f6'];

function historyStatusLabel(status: string): string {
  switch (status) {
    case 'PRESENT':
      return 'Присутній';
    case 'ABSENT':
      return 'Відсутній';
    case 'LATE':
      return 'Запізнився';
    default:
      return status;
  }
}

export function StudentAttendanceScreen() {
  const [data, setData] = useState<AttendancePayload | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const res = await apiFetch('/student/attendance');
    if (res.ok) setData((await res.json()) as AttendancePayload);
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

  const filtered = useMemo(() => {
    const list = data?.bySubject ?? [];
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter((s) => s.subject.toLowerCase().includes(q));
  }, [data, search]);

  if (loading || !data) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Завантаження…</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.inner}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
    >
      <TextInput
        style={styles.search}
        placeholder="Пошук предмета…"
        placeholderTextColor="#94a3b8"
        value={search}
        onChangeText={setSearch}
      />

      {filtered.map((subject, i) => (
        <View key={subject.subject} style={styles.card}>
          <Text style={styles.cardTitle}>{subject.subject}</Text>
          <Text style={styles.muted}>Всього занять: {subject.totalClasses}</Text>
          <View style={styles.row}>
            <Text style={styles.bigPct}>{subject.rate}%</Text>
            <View style={styles.barBg}>
              <View style={[styles.barFg, { width: `${subject.rate}%`, backgroundColor: COLORS[i % COLORS.length] }]} />
            </View>
          </View>
          <View style={styles.statsRow}>
            <Text style={styles.statOk}>Присутні: {subject.attended}</Text>
            <Text style={styles.statBad}>Відсутні: {subject.absent}</Text>
          </View>
        </View>
      ))}

      {data.history.length > 0 ? (
        <>
          <Text style={styles.section}>Останні записи</Text>
          {data.history.slice(0, 20).map((h) => (
            <View key={h.id} style={styles.histRow}>
              <Text style={styles.histSubj}>{h.session.subject.name}</Text>
              <Text style={styles.histDate}>
                {new Date(h.session.date).toLocaleString('uk-UA', { dateStyle: 'short', timeStyle: 'short' })}
              </Text>
              <Text
                style={[
                  styles.histSt,
                  h.status === 'ABSENT' ? styles.histAbs : h.status === 'LATE' ? styles.histLate : styles.histPr,
                ]}
              >
                {historyStatusLabel(h.status)}
              </Text>
            </View>
          ))}
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#f8fafc' },
  inner: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  muted: { color: '#64748b', fontSize: 14 },
  search: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
    backgroundColor: '#fff',
    fontSize: 16,
    color: '#0f172a',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  cardTitle: { fontSize: 17, fontWeight: '900', color: '#0f172a' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 },
  bigPct: { fontSize: 24, fontWeight: '900', color: '#0f172a', minWidth: 64 },
  barBg: { flex: 1, height: 8, backgroundColor: '#f1f5f9', borderRadius: 99, overflow: 'hidden' },
  barFg: { height: '100%', borderRadius: 99 },
  statsRow: { flexDirection: 'row', gap: 16, marginTop: 10 },
  statOk: { color: '#15803d', fontWeight: '700', fontSize: 13 },
  statBad: { color: '#dc2626', fontWeight: '700', fontSize: 13 },
  section: { fontSize: 16, fontWeight: '800', marginTop: 16, marginBottom: 8, color: '#0f172a' },
  histRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    alignItems: 'center',
  },
  histSubj: { flex: 1, minWidth: 120, fontWeight: '700', color: '#0f172a', fontSize: 14 },
  histDate: { fontSize: 12, color: '#64748b' },
  histSt: { fontSize: 11, fontWeight: '900' },
  histPr: { color: '#15803d' },
  histLate: { color: '#b45309' },
  histAbs: { color: '#dc2626' },
});
