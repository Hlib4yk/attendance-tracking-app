import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { apiFetch } from '../../lib/api';
import type { ReportsStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<ReportsStackParamList, 'ReportsList'>;

type AnalyticsGroup = { name: string; groupId: string };

type SessionSummary = {
  id: string;
  date: string;
  subjectId: string;
  subjectName: string;
  confirmed: boolean;
  photoUrl: string | null;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  attendanceRecords: number;
};


export function ReportsScreen() {
  const navigation = useNavigation<Nav>();
  const [groups, setGroups] = useState<AnalyticsGroup[]>([]);
  const [groupId, setGroupId] = useState('');
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadGroups = useCallback(async () => {
    setLoadingGroups(true);
    setError(null);
    try {
      const res = await apiFetch('/analytics/teacher');
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = Array.isArray(data.message) ? data.message.join(', ') : data.message;
        throw new Error(msg ?? 'Не вдалося завантажити групи');
      }
      const data = (await res.json()) as { groups: { name: string; groupId: string }[] };
      const list = data.groups.map((g) => ({ name: g.name, groupId: g.groupId }));
      setGroups(list);
      if (list[0]) setGroupId(list[0].groupId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Помилка');
    } finally {
      setLoadingGroups(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadGroups();
    }, [loadGroups]),
  );

  useEffect(() => {
    if (!groupId) { setSessions([]); return; }
    let cancelled = false;
    setLoadingSessions(true);
    void (async () => {
      try {
        const res = await apiFetch(`/teacher/groups/${groupId}/sessions`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message ?? 'Помилка занять');
        if (!cancelled) setSessions(data as SessionSummary[]);
      } catch (e) {
        if (!cancelled) { setSessions([]); setError(e instanceof Error ? e.message : 'Помилка'); }
      } finally {
        if (!cancelled) setLoadingSessions(false);
      }
    })();
    return () => { cancelled = true; };
  }, [groupId]);

  if (loadingGroups) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Завантаження…</Text>
      </View>
    );
  }

  if (error && groups.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.err}>{error}</Text>
        <Pressable style={styles.btn} onPress={() => void loadGroups()}>
          <Text style={styles.btnTxt}>Повторити</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.inner}>
      <Text style={styles.title}>Звіти</Text>
      <Text style={styles.sub}>Група → заняття → журнал</Text>
      {groups.length === 0 ? (
        <Text style={styles.muted}>Немає прив’язаних груп.</Text>
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {groups.map((g) => (
                <Pressable
                  key={g.groupId}
                  style={[styles.gChip, groupId === g.groupId && styles.gChipOn]}
                  onPress={() => setGroupId(g.groupId)}
                >
                  <Text style={[styles.gChipTxt, groupId === g.groupId && styles.gChipTxtOn]}>{g.name}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          <Text style={styles.section}>Заняття</Text>
          {loadingSessions ? <Text style={styles.muted}>…</Text> : null}
          {!loadingSessions && sessions.length === 0 ? (
            <Text style={styles.muted}>Немає занять.</Text>
          ) : (
            sessions.map((s) => (
              <Pressable
                key={s.id}
                style={styles.sCard}
                onPress={() =>
                  navigation.navigate('SessionDetail', {
                    sessionId: s.id,
                    subjectName: s.subjectName,
                  })
                }
              >
                <View style={styles.sCardInner}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sTitle}>{s.subjectName}</Text>
                    <Text style={styles.muted}>
                      {new Date(s.date).toLocaleString('uk-UA', { dateStyle: 'medium', timeStyle: 'short' })}
                    </Text>
                    <Text style={styles.sMetrics}>
                      <Text style={styles.metricPresent}>П: {s.presentCount}</Text>
                      <Text style={styles.metricSep}> · </Text>
                      <Text style={styles.metricAbsent}>В: {s.absentCount}</Text>
                      {s.lateCount > 0 ? (
                        <>
                          <Text style={styles.metricSep}> · </Text>
                          <Text style={styles.metricLate}>З: {s.lateCount}</Text>
                        </>
                      ) : null}
                      {s.photoUrl ? <Text style={styles.metricSep}> · 📷</Text> : null}
                      {!s.confirmed ? <Text style={styles.metricSep}> · чернетка</Text> : null}
                    </Text>
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </View>
              </Pressable>
            ))
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#f8fafc' },
  inner: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { fontSize: 24, fontWeight: '900', color: '#0f172a' },
  sub: { fontSize: 14, color: '#64748b', marginBottom: 14 },
  section: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 8 },
  muted: { color: '#64748b', fontSize: 14 },
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
  gChipOn: { borderColor: '#4f46e5', backgroundColor: '#eef2ff' },
  gChipTxt: { fontWeight: '700', color: '#64748b' },
  gChipTxtOn: { color: '#4f46e5' },
  sCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  sCardInner: { flexDirection: 'row', alignItems: 'center' },
  chevron: { fontSize: 22, color: '#94a3b8', marginLeft: 8 },
  sTitle: { fontWeight: '800', color: '#0f172a', fontSize: 16 },
  sMetrics: { fontSize: 14 },
  metricPresent: { color: '#15803d', fontWeight: '700' },
  metricAbsent: { color: '#dc2626', fontWeight: '700' },
  metricLate: { color: '#b45309', fontWeight: '700' },
  metricSep: { color: '#64748b', fontWeight: '400' },

});
