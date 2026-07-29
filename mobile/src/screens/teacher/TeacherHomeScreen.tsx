import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, RefreshControl } from 'react-native';
import { apiFetch } from '../../lib/api';

type SubjectRow = {
  id: string;
  name: string;
  groups: { id: string; name: string }[];
};

export function TeacherHomeScreen() {
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await apiFetch('/teacher/subjects');
    if (res.ok) setSubjects((await res.json()) as SubjectRow[]);
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

  const uniqueGroups = new Map<string, string>();
  for (const s of subjects) {
    for (const g of s.groups) {
      uniqueGroups.set(g.id, g.name);
    }
  }
  const groupCount = uniqueGroups.size;
  const [refreshing, setRefreshing] = useState(false);
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

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.inner}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
    >
      <Text style={styles.h1}>Кабінет викладача</Text>
      <Text style={styles.sub}>
        Предметів: <Text style={styles.bold}>{subjects.length}</Text>
        {groupCount > 0 ? (
          <>
            {' '}
            · груп: <Text style={styles.bold}>{groupCount}</Text>
          </>
        ) : null}
      </Text>

      {subjects.length === 0 ? (
        <Text style={styles.muted}>Поки немає предметів у системі.</Text>
      ) : (
        subjects.map((s, i) => (
          <View key={s.id} style={styles.card}>
            <Text style={styles.rank}>#{i + 1}</Text>
            <Text style={styles.cardTitle}>{s.name}</Text>
            <Text style={styles.muted}>
              {s.groups.length === 0 ? 'Груп не прив’язано' : s.groups.map((g) => g.name).join(', ')}
            </Text>
          </View>
        ))
      )}

      <Text style={styles.hint}>Швидкі розділи — у вкладках нижче: Журнал / Розклад / Звіти / Аналітика.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#f8fafc' },
  inner: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  muted: { color: '#64748b', fontSize: 14 },
  h1: { fontSize: 24, fontWeight: '900', color: '#0f172a' },
  sub: { fontSize: 14, color: '#64748b', marginVertical: 12 },
  bold: { fontWeight: '900', color: '#0f172a' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  rank: { fontSize: 11, fontWeight: '800', color: '#4f46e5', marginBottom: 6 },
  cardTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a' },
  hint: { marginTop: 20, fontSize: 13, color: '#94a3b8', lineHeight: 20 },
});
