import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiFetch, fileUrl } from '../../lib/api';
import type { ReportsStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<ReportsStackParamList, 'SessionDetail'>;

type RosterRow = {
  studentId: string;
  name: string;
  email: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE';
  method: 'AUTO' | 'MANUAL';
};

type SessionDetail = {
  id: string;
  date: string;
  confirmed: boolean;
  photoUrl: string | null;
  subject: { id: string; name: string };
  group?: { id: string; name: string } | null;
};

type ApiResponse = {
  session: SessionDetail;
  roster: RosterRow[];
};

export function SessionDetailScreen({ route }: Props) {
  const { sessionId, subjectName } = route.params;

  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await apiFetch(`/teacher/sessions/${sessionId}/attendance`);
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.message ?? 'Помилка завантаження');
        if (!cancelled) setData(json as ApiResponse);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Помилка');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [sessionId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator color="#4f46e5" size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !data) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.err}>{error ?? 'Не знайдено'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const { session, roster } = data;
  const present = roster.filter((r) => r.status === 'PRESENT');
  const late    = roster.filter((r) => r.status === 'LATE');
  const absent  = roster.filter((r) => r.status === 'ABSENT');
  const photo   = fileUrl(session.photoUrl);

  const dateStr = new Date(session.date).toLocaleString('uk-UA', {
    dateStyle: 'full',
    timeStyle: 'short',
  });

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Meta */}
        <Text style={styles.title}>{subjectName}</Text>
        <Text style={styles.date}>{dateStr}</Text>
        <View style={styles.badgeRow}>
          {session.group ? (
            <View style={styles.badge}>
              <Text style={styles.badgeTxt}>{session.group.name}</Text>
            </View>
          ) : null}
          <View style={[styles.badge, session.confirmed ? styles.badgeGreen : styles.badgeAmber]}>
            <Text style={[styles.badgeTxt, session.confirmed ? styles.badgeGreenTxt : styles.badgeAmberTxt]}>
              {session.confirmed ? 'Підтверджено' : 'Чернетка'}
            </Text>
          </View>
        </View>
        <Text style={styles.statLine}>
          Всього: {roster.length}
          {'  ·  '}
          <Text style={{ color: '#15803d' }}>П: {present.length + late.length}</Text>
          {'  ·  '}
          <Text style={{ color: '#dc2626' }}>В: {absent.length}</Text>
        </Text>

        {/* Photo */}
        {photo ? (
          <View style={styles.photoBox}>
            <Text style={styles.sectionLabel}>Фото заняття</Text>
            <Image
              source={{ uri: photo }}
              style={styles.photo}
              resizeMode="contain"
            />
          </View>
        ) : (
          <View style={styles.noPhoto}>
            <Text style={styles.noPhotoTxt}>Фото не завантажувалось</Text>
          </View>
        )}

        {/* Present */}
        {(present.length > 0 || late.length > 0) ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>
              Були присутні — {present.length + late.length}
            </Text>
            {[...present, ...late].map((row) => (
              <View key={row.studentId} style={styles.presentCard}>
                <View style={[
                  styles.avatar,
                  row.status === 'LATE' ? styles.avatarAmber : styles.avatarGreen,
                ]}>
                  <Text style={[
                    styles.avatarTxt,
                    row.status === 'LATE' ? styles.avatarAmberTxt : styles.avatarGreenTxt,
                  ]}>
                    {row.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.studentName}>{row.name}</Text>
                  <Text style={styles.studentEmail}>{row.email}</Text>
                </View>
                <View style={styles.cardRight}>
                  {row.status === 'LATE' ? (
                    <View style={styles.lateBadge}>
                      <Text style={styles.lateTxt}>Запізнився</Text>
                    </View>
                  ) : null}
                  <Text style={styles.methodTxt}>
                    {row.method === 'AUTO' ? 'Авто' : 'Вручну'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {/* Absent */}
        {absent.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Були відсутні — {absent.length}</Text>
            <View style={styles.absentBox}>
              {absent.map((row, i) => (
                <View
                  key={row.studentId}
                  style={[styles.absentRow, i > 0 && styles.absentRowBorder]}
                >
                  <View style={styles.avatarSmall}>
                    <Text style={styles.avatarSmallTxt}>{row.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.cardBody}>
                    <Text style={styles.studentName}>{row.name}</Text>
                    <Text style={styles.studentEmail}>{row.email}</Text>
                  </View>
                  <Text style={styles.methodTxt}>
                    {row.method === 'AUTO' ? 'Авто' : 'Вручну'}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {roster.length === 0 ? (
          <Text style={styles.muted}>Немає записів про відвідуваність.</Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  err: { color: '#dc2626', textAlign: 'center' },
  title: { fontSize: 22, fontWeight: '900', color: '#0f172a', marginBottom: 4 },
  date: { fontSize: 13, color: '#64748b', marginBottom: 10 },
  badgeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 8 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  badgeTxt: { fontSize: 12, fontWeight: '700', color: '#475569' },
  badgeGreen: { backgroundColor: '#dcfce7' },
  badgeGreenTxt: { color: '#15803d' },
  badgeAmber: { backgroundColor: '#fef3c7' },
  badgeAmberTxt: { color: '#b45309' },
  statLine: { fontSize: 13, color: '#64748b', marginBottom: 16 },

  photoBox: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20,
    backgroundColor: '#0f172a',
  },
  photo: { width: '100%', height: 220 },
  noPhoto: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    paddingVertical: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  noPhotoTxt: { color: '#94a3b8', fontSize: 13 },

  section: { marginBottom: 20 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
    backgroundColor: '#f8fafc',
    paddingVertical: 4,
  },

  presentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    marginBottom: 8,
    gap: 10,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarGreen: { backgroundColor: '#dcfce7' },
  avatarGreenTxt: { color: '#15803d' },
  avatarAmber: { backgroundColor: '#fef3c7' },
  avatarAmberTxt: { color: '#b45309' },
  avatarTxt: { fontSize: 15, fontWeight: '900' },
  cardBody: { flex: 1, minWidth: 0 },
  studentName: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  studentEmail: { fontSize: 11, color: '#94a3b8', marginTop: 1 },
  cardRight: { alignItems: 'flex-end', gap: 4 },
  lateBadge: { backgroundColor: '#fef3c7', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  lateTxt: { fontSize: 10, fontWeight: '700', color: '#b45309' },
  methodTxt: { fontSize: 10, color: '#94a3b8' },

  absentBox: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  absentRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  absentRowBorder: { borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  avatarSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarSmallTxt: { fontSize: 13, fontWeight: '900', color: '#dc2626' },
  muted: { color: '#94a3b8', fontSize: 14, textAlign: 'center', marginTop: 20 },
});
