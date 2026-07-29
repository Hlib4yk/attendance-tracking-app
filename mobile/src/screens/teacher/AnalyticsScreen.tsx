import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { apiFetch } from '../../lib/api';

type AnalyticsStudent = {
  id: string;
  name: string;
  group: string;
  attendanceRate: number;
  status: string;
};

type AnalyticsGroup = {
  name: string;
  groupId: string;
  students: AnalyticsStudent[];
  averageAttendance: number;
};

type StatCard = {
  label: string;
  value: string;
  change: string;
  color: string;
};

type AnalyticsPayload = {
  groups: AnalyticsGroup[];
  stats: StatCard[];
  autoRecognizedPercent: number | null;
  manualPercent: number | null;
};

function statColor(c: string): string {
  if (c.includes('green')) return '#15803d';
  if (c.includes('rose')) return '#f43f5e';
  if (c.includes('indigo')) return '#4f46e5';
  return '#0f172a';
}

export function AnalyticsScreen() {
  const [groups, setGroups] = useState<AnalyticsGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<AnalyticsGroup | null>(null);
  const [stats, setStats] = useState<StatCard[]>([]);
  const [autoPct, setAutoPct] = useState<number | null>(null);
  const [manualPct, setManualPct] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch('/analytics/teacher');
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = Array.isArray(data.message) ? data.message.join(', ') : data.message;
        throw new Error(msg ?? 'Помилка');
      }
      const data = (await res.json()) as AnalyticsPayload;
      setGroups(data.groups);
      setStats(data.stats);
      setAutoPct(data.autoRecognizedPercent);
      setManualPct(data.manualPercent);
      setSelectedGroup((prev) => {
        if (data.groups.length === 0) return null;
        if (prev && data.groups.some((g) => g.groupId === prev.groupId)) {
          return data.groups.find((g) => g.groupId === prev.groupId)!;
        }
        return data.groups[0]!;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Помилка');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Завантаження…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.err}>{error}</Text>
        <Pressable style={styles.btn} onPress={() => void load()}>
          <Text style={styles.btnTxt}>Повторити</Text>
        </Pressable>
      </View>
    );
  }

  if (!selectedGroup && groups.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Немає груп для відображення.</Text>
      </View>
    );
  }

  if (!selectedGroup) return null;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.inner}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
    >
      <Text style={styles.title}>Аналітика відвідуваності</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {groups.map((group) => (
            <Pressable
              key={group.groupId}
              style={[styles.gChip, selectedGroup.groupId === group.groupId && styles.gChipOn]}
              onPress={() => setSelectedGroup(group)}
            >
              <Text style={[styles.gChipTxt, selectedGroup.groupId === group.groupId && styles.gChipTxtOn]}>
                {group.name}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {stats.map((stat, i) => (
        <View key={i} style={styles.statCard}>
          <Text style={styles.statLabel}>{stat.label}</Text>
          <Text style={[styles.statVal, { color: statColor(stat.color) }]}>{stat.value}</Text>
          <Text style={styles.mutedSmall}>{stat.change}</Text>
        </View>
      ))}

      <View style={styles.groupCard}>
        <Text style={styles.gTitle}>Група: {selectedGroup.name}</Text>
        <Text style={styles.muted}>
          Середня відвідуваність: <Text style={styles.bold}>{selectedGroup.averageAttendance}%</Text>
        </Text>
        {selectedGroup.students.length === 0 ? (
          <Text style={styles.muted}>Немає студентів.</Text>
        ) : (
          selectedGroup.students.map((student, i) => (
            <View key={student.id} style={styles.stRow}>
              <Text style={styles.stNum}>{i + 1}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.stName}>{student.name}</Text>
                <Text style={styles.mutedSmall}>{student.status}</Text>
              </View>
              <Text
                style={[
                  styles.stPct,
                  student.attendanceRate < 80 ? { color: '#dc2626' } : { color: '#15803d' },
                ]}
              >
                {student.attendanceRate}%
              </Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.note}>
        <Text style={styles.noteTxt}>
          Авто: {autoPct != null ? `${autoPct}%` : '—'} · Вручну: {manualPct != null ? `${manualPct}%` : '—'}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#f8fafc' },
  inner: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { fontSize: 24, fontWeight: '900', color: '#0f172a', marginBottom: 12 },
  muted: { color: '#64748b', fontSize: 14 },
  mutedSmall: { fontSize: 11, color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' },
  err: { color: '#dc2626', marginBottom: 12 },
  btn: { padding: 14, backgroundColor: '#e2e8f0', borderRadius: 12 },
  btnTxt: { fontWeight: '800', color: '#334155' },
  gChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  gChipOn: { borderColor: '#4f46e5', backgroundColor: '#4f46e5' },
  gChipTxt: { fontWeight: '700', color: '#64748b' },
  gChipTxtOn: { color: '#fff' },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    marginBottom: 10,
  },
  statLabel: { fontSize: 11, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' },
  statVal: { fontSize: 28, fontWeight: '900', color: '#4f46e5', marginVertical: 4 },
  groupCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    marginTop: 8,
  },
  gTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  bold: { fontWeight: '900', color: '#4f46e5' },
  stRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 12,
  },
  stNum: { fontWeight: '800', color: '#94a3b8', width: 28 },
  stName: { fontWeight: '700', color: '#0f172a' },
  stPct: { fontWeight: '900', fontSize: 16 },
  note: { marginTop: 16, padding: 14, backgroundColor: '#4f46e5', borderRadius: 16 },
  noteTxt: { color: '#e0e7ff', fontSize: 13 },
});
