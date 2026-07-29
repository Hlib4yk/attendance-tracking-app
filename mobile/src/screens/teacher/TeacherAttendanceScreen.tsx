import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { apiFetch, fileUrl } from '../../lib/api';
import { weekParityLabel } from '../../lib/lpnu-schedule';
import type { TeacherAttendanceRoute, TeacherTabParamList } from '../../navigation/types';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

type SubjectRow = {
  id: string;
  name: string;
  groups: { id: string; name: string }[];
};

type SubjectOption = {
  subjectId: string;
  subjectName: string;
  groups: { id: string; name: string }[];
};

type SlotContextOk = {
  ok: true;
  ambiguousSubjects: boolean;
  subjects: SubjectOption[];
  slot: {
    day: string;
    period: number;
    weekParity: 'full' | 'chys' | 'znam';
    lines: string[];
    rawText: string;
  };
  lpnu: { cached: boolean; fetchedAt: string };
};

type SlotContextResponse =
  | SlotContextOk
  | {
      ok: false;
      reason: string;
      message: string;
      slot?: { day: string; period: number; weekParity: string; lines: string[] };
    };

type RecognitionHit = { studentId: string; name: string; email: string; confidence: number };

type RecognizeResult = {
  sessionId: string;
  photoUrl?: string;
  engine?: string;
  processingMs?: number;
  recognizedCount: number;
  presentCount?: number;
  absentCount?: number;
  totalStudents?: number;
  recognizedStudentIds?: string[];
  recognitions?: RecognitionHit[];
  message?: string;
};

type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE';

type RosterRow = {
  studentId: string;
  name: string;
  email: string;
  groupName?: string;
  status: AttendanceStatus;
  method: string;
};

type Nav = BottomTabNavigationProp<TeacherTabParamList, 'TeacherAttendance'>;

export function TeacherAttendanceScreen() {
  const route = useRoute<TeacherAttendanceRoute>();
  const navigation = useNavigation<Nav>();
  const day = route.params?.day;
  const periodRaw = route.params?.period;
  const variantRaw = route.params?.variant;
  const semestr = route.params?.semestr;
  const semestrduration = route.params?.semestrduration;
  const period = periodRaw != null ? parseInt(periodRaw, 10) : NaN;
  const variant = variantRaw != null ? parseInt(variantRaw, 10) : NaN;
  const hasSlotQuery =
    Boolean(day) &&
    Number.isFinite(period) &&
    Number.isFinite(variant) &&
    semestr != null &&
    ['All', '1', '2'].includes(semestr) &&
    semestrduration != null &&
    ['1', '2'].includes(semestrduration);

  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [subjectId, setSubjectId] = useState('');
  const [groupId, setGroupId] = useState('');
  const [sessionIdOverride, setSessionIdOverride] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<RecognizeResult | null>(null);
  const [roster, setRoster] = useState<RosterRow[] | null>(null);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [entryMode, setEntryMode] = useState<'photo' | 'manual'>('photo');
  const [manualBusy, setManualBusy] = useState(false);
  const [slotContext, setSlotContext] = useState<SlotContextOk | null>(null);
  const [slotError, setSlotError] = useState<string | null>(null);
  const [slotLoading, setSlotLoading] = useState(false);

  const loadSubjects = useCallback(async (opts?: { skipDefaultPick?: boolean }) => {
    const res = await apiFetch('/teacher/subjects');
    if (!res.ok) {
      setLoadError('Не вдалося завантажити предмети');
      return;
    }
    const data = (await res.json()) as SubjectRow[];
    setSubjects(data);
    if (!opts?.skipDefaultPick && data[0]) {
      setSubjectId(data[0].id);
      setGroupId(data[0].groups[0]?.id ?? '');
    }
    setLoadError(null);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadSubjects({ skipDefaultPick: hasSlotQuery });
    }, [loadSubjects, hasSlotQuery]),
  );

  useEffect(() => {
    if (!hasSlotQuery || !day || !Number.isFinite(period) || !Number.isFinite(variant) || !semestr || !semestrduration) {
      setSlotContext(null);
      setSlotError(null);
      setSlotLoading(false);
      return;
    }
    let cancelled = false;
    setSlotLoading(true);
    setSlotError(null);
    void (async () => {
      try {
        const qs = new URLSearchParams({
          day,
          period: String(period),
          variant: String(variant),
          semestr,
          semestrduration,
        });
        const res = await apiFetch(`/teacher/schedule-slot/attendance-context?${qs.toString()}`);
        const data = (await res.json()) as SlotContextResponse & { message?: string };
        if (cancelled) return;
        if (!res.ok) {
          setSlotContext(null);
          setSlotError(
            typeof (data as { message?: string }).message === 'string'
              ? (data as { message: string }).message
              : 'Не вдалося завантажити контекст пари.',
          );
          return;
        }
        if (!data.ok) {
          setSlotContext(null);
          setSlotError(data.message);
          return;
        }
        setSlotContext(data);
        const first = data.subjects[0];
        if (first) {
          setSubjectId(first.subjectId);
          setGroupId(first.groups[0]?.id ?? '');
        }
      } catch {
        if (!cancelled) {
          setSlotContext(null);
          setSlotError('Помилка мережі');
        }
      } finally {
        if (!cancelled) setSlotLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hasSlotQuery, day, period, variant, semestr, semestrduration]);

  const subjectOptions: SubjectOption[] = useMemo(() => {
    if (slotContext?.ok) return slotContext.subjects;
    return subjects.map((s) => ({ subjectId: s.id, subjectName: s.name, groups: s.groups }));
  }, [slotContext, subjects]);

  const groupsForSubject = useMemo(
    () => subjectOptions.find((s) => s.subjectId === subjectId)?.groups ?? [],
    [subjectOptions, subjectId],
  );

  useEffect(() => {
    const g = groupsForSubject[0];
    if (!groupId || !groupsForSubject.some((x) => x.id === groupId)) {
      setGroupId(g ? g.id : '');
    }
  }, [subjectId, groupsForSubject, groupId]);

  useEffect(() => {
    const sid = result?.sessionId;
    if (!sid) {
      setRoster(null);
      return;
    }
    let cancelled = false;
    setRosterLoading(true);
    void (async () => {
      try {
        const res = await apiFetch(`/teacher/sessions/${sid}/attendance`);
        const data = (await res.json()) as { roster?: RosterRow[] };
        if (!res.ok) throw new Error();
        if (!cancelled && data.roster) setRoster(data.roster);
      } catch {
        if (!cancelled) {
          setRoster(null);
          setError('Не вдалося завантажити журнал');
        }
      } finally {
        if (!cancelled) setRosterLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [result?.sessionId]);

  const clearSlot = () => {
    navigation.navigate('TeacherAttendance', undefined);
    setSlotContext(null);
    setSlotError(null);
    void loadSubjects({ skipDefaultPick: false });
  };

  const startManualJournal = async () => {
    if (!subjectId || !groupId) {
      setError('Оберіть предмет і групу');
      return;
    }
    setManualBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await apiFetch(`/teacher/subjects/${subjectId}/sessions`, {
        method: 'POST',
        body: JSON.stringify({ groupId, date: new Date().toISOString() }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof body.message === 'string' ? body.message : 'Не вдалося створити заняття');
      const sessionId = body.id as string;
      setResult({
        sessionId,
        message: 'Ручний журнал: усі спочатку відсутні. Відмітьте та підтвердіть.',
        recognizedCount: 0,
        presentCount: 0,
        absentCount: 0,
        totalStudents: 0,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка');
    } finally {
      setManualBusy(false);
    }
  };

  const handleUploadAsset = async (uri: string, mime: string) => {
    if (!subjectId) {
      setError('Оберіть предмет');
      return;
    }
    const photoGroupIds = groupsForSubject.map((g) => g.id);
    if (photoGroupIds.length === 0) {
      setError('У обраного предмета немає груп');
      return;
    }
    setIsUploading(true);
    setError(null);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append('image', { uri, name: 'classroom.jpg', type: mime } as unknown as Blob);
      formData.append('subjectId', subjectId);
      formData.append('groupIds', JSON.stringify(photoGroupIds));
      if (sessionIdOverride.trim()) formData.append('sessionId', sessionIdOverride.trim());
      const res = await apiFetch('/attendance/recognize', { method: 'POST', body: formData });
      const data = (await res.json()) as RecognizeResult & { message?: string | string[]; error?: string };
      if (!res.ok) {
        const msg = typeof data.message === 'string' ? data.message : data.error ?? 'Помилка';
        throw new Error(msg);
      }
      setResult({
        sessionId: data.sessionId,
        photoUrl: data.photoUrl,
        engine: data.engine,
        processingMs: data.processingMs,
        recognizedCount: data.recognizedCount,
        presentCount: data.presentCount,
        absentCount: data.absentCount,
        totalStudents: data.totalStudents,
        recognizedStudentIds: data.recognizedStudentIds,
        recognitions: data.recognitions,
        message: typeof data.message === 'string' ? data.message : undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка');
    } finally {
      setIsUploading(false);
    }
  };

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError('Потрібен доступ до галереї');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
    if (!res.canceled && res.assets[0]) {
      const a = res.assets[0];
      await handleUploadAsset(a.uri, a.mimeType ?? 'image/jpeg');
    }
  };

  const takePhotoWithCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      setError('Потрібен доступ до камери');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.85 });
    if (!res.canceled && res.assets[0]) {
      const a = res.assets[0];
      await handleUploadAsset(a.uri, a.mimeType ?? 'image/jpeg');
    }
  };

  const confirmAttendance = async () => {
    if (!result?.sessionId || !roster) return;
    setConfirming(true);
    setError(null);
    try {
      const patch = await apiFetch(`/teacher/sessions/${result.sessionId}/attendance`, {
        method: 'PATCH',
        body: JSON.stringify({
          records: roster.map((r) => ({ studentId: r.studentId, status: r.status })),
        }),
      });
      const patchBody = await patch.json().catch(() => ({}));
      if (!patch.ok) throw new Error(patchBody.message ?? 'Не збережено');
      if (patchBody.roster) setRoster(patchBody.roster as RosterRow[]);
      const res = await apiFetch(`/teacher/sessions/${result.sessionId}/confirm`, { method: 'POST' });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.message ?? 'Підтвердження не вдалося');
      }
      setResult((r) => (r ? { ...r, message: 'Відвідуваність підтверджено.' } : r));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка');
    } finally {
      setConfirming(false);
    }
  };

  const updateRosterStatus = (studentId: string, status: AttendanceStatus) => {
    setRoster((rows) => (rows ? rows.map((r) => (r.studentId === studentId ? { ...r, status } : r)) : rows));
  };

  if (loadError) {
    return (
      <View style={styles.center}>
        <Text style={styles.err}>{loadError}</Text>
        <Pressable style={styles.btn} onPress={() => void loadSubjects()}>
          <Text style={styles.btnTxt}>Повторити</Text>
        </Pressable>
      </View>
    );
  }

  const hasActiveSession = Boolean(result?.sessionId);
  const multiGroupOnSlot = Boolean(slotContext?.ok && groupsForSubject.length > 1);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.inner}>
      <Text style={styles.title}>Журнал відвідуваності</Text>

      {hasSlotQuery ? (
        <View style={styles.slotBox}>
          <Text style={styles.slotCap}>Пара з розкладу</Text>
          {slotLoading ? <Text style={styles.muted}>Завантаження…</Text> : null}
          {!slotLoading && slotContext?.ok ? (
            <Text style={styles.slotLine}>
              {slotContext.slot.day}, пара {slotContext.slot.period} · {weekParityLabel(slotContext.slot.weekParity)}
              {slotContext.ambiguousSubjects ? ' · оберіть предмет' : ''}
            </Text>
          ) : null}
          {!slotLoading && slotError ? <Text style={styles.err}>{slotError}</Text> : null}
          {slotContext?.ok ? (
            <View style={{ marginTop: 8 }}>
              {slotContext.slot.lines.map((line, i) => (
                <Text key={i} style={styles.lineTxt}>
                  {line}
                </Text>
              ))}
            </View>
          ) : null}
          {multiGroupOnSlot ? (
            <Text style={styles.muted}>
              Кілька груп на парі — одне фото обліковує всіх студентів цих груп одночасно. Групу оберіть лише для режиму
              «Вручну».
            </Text>
          ) : null}
          <Pressable onPress={clearSlot}>
            <Text style={styles.link}>Звичайний режим (без пари)</Text>
          </Pressable>
        </View>
      ) : null}

      <Text style={styles.label}>Предмет</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {subjectOptions.map((s) => (
            <Pressable
              key={s.subjectId}
              style={[styles.chip, subjectId === s.subjectId && styles.chipOn, hasActiveSession && { opacity: 0.5 }]}
              disabled={hasActiveSession}
              onPress={() => setSubjectId(s.subjectId)}
            >
              <Text style={[styles.chipTxt, subjectId === s.subjectId && styles.chipTxtOn]}>{s.subjectName}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {entryMode === 'photo' && groupsForSubject.length > 0 ? (
        <Text style={[styles.muted, { marginBottom: 10 }]}>
          Фото: одразу для{' '}
          {groupsForSubject.length === 1 ? `групи «${groupsForSubject[0].name}»` : `${groupsForSubject.length} груп`}
          {groupsForSubject.length > 1 ? ` (${groupsForSubject.map((g) => g.name).join(', ')})` : ''}.
        </Text>
      ) : null}

      {entryMode === 'manual' ? (
        <>
          <Text style={styles.label}>Група</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
            {groupsForSubject.map((g) => (
              <Pressable
                key={g.id}
                style={[styles.chip, groupId === g.id && styles.chipOn, hasActiveSession && { opacity: 0.5 }]}
                disabled={hasActiveSession}
                onPress={() => setGroupId(g.id)}
              >
                <Text style={[styles.chipTxt, groupId === g.id && styles.chipTxtOn]}>{g.name}</Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}

      <Text style={styles.label}>ID існуючої сесії (необов’язково)</Text>
      <TextInput
        style={styles.input}
        placeholder="Нове заняття — залиште порожнім"
        value={sessionIdOverride}
        onChangeText={setSessionIdOverride}
        editable={!hasActiveSession && entryMode === 'photo'}
      />

      {!hasActiveSession ? (
        <View style={styles.modeRow}>
          <Pressable style={[styles.modeBtn, entryMode === 'photo' && styles.modeOn]} onPress={() => setEntryMode('photo')}>
            <Text style={[styles.modeTxt, entryMode === 'photo' && styles.modeTxtOn]}>Фото</Text>
          </Pressable>
          <Pressable
            style={[styles.modeBtn, entryMode === 'manual' && styles.modeOn]}
            onPress={() => setEntryMode('manual')}
          >
            <Text style={[styles.modeTxt, entryMode === 'manual' && styles.modeTxtOn]}>Вручну</Text>
          </Pressable>
        </View>
      ) : null}

      {entryMode === 'photo' && !hasActiveSession ? (
        <View style={styles.photoActionRow}>
          <Pressable
            style={[styles.pickBtn, styles.pickBtnFlex]}
            onPress={() => void pickImage()}
            disabled={isUploading}
          >
            <Text style={styles.pickTxt}>{isUploading ? 'Обробка…' : 'Галерея'}</Text>
          </Pressable>
          <Pressable
            style={[styles.pickBtnSecondary, styles.pickBtnFlex]}
            onPress={() => void takePhotoWithCamera()}
            disabled={isUploading}
          >
            <Text style={styles.pickTxtSecondary}>{isUploading ? 'Обробка…' : 'Камера'}</Text>
          </Pressable>
        </View>
      ) : null}

      {entryMode === 'manual' && !hasActiveSession ? (
        <Pressable style={[styles.pickBtn, styles.pickBtnFull]} onPress={() => void startManualJournal()} disabled={manualBusy}>
          <Text style={styles.pickTxt}>{manualBusy ? 'Створення…' : 'Відкрити журнал без фото'}</Text>
        </Pressable>
      ) : null}

      {error ? <Text style={styles.err}>{error}</Text> : null}

      {result ? (
        <View style={styles.resultBox}>
          <Text style={styles.resultTitle}>Результат</Text>
          {result.photoUrl ? (
            <Image source={{ uri: fileUrl(result.photoUrl) ?? result.photoUrl }} style={styles.photo} resizeMode="contain" />
          ) : null}
          <View style={styles.metrics}>
            <View style={styles.metric}>
              <Text style={styles.muted}>Присутні</Text>
              <Text style={styles.metricVal}>{result.presentCount ?? result.recognizedCount}</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.muted}>Відсутні</Text>
              <Text style={styles.metricVal}>{result.absentCount ?? '—'}</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.muted}>Студентів (усі групи)</Text>
              <Text style={styles.metricVal}>{result.totalStudents ?? '—'}</Text>
            </View>
          </View>
          {result.recognitions && result.recognitions.length > 0 ? (
            <View style={{ marginTop: 10 }}>
              {result.recognitions.map((r) => (
                <Text key={r.studentId} style={styles.recRow}>
                  {r.name} · {(r.confidence * 100).toFixed(1)}%
                </Text>
              ))}
            </View>
          ) : null}
          <Text style={[styles.label, { marginTop: 16 }]}>Журнал</Text>
          {rosterLoading ? <ActivityIndicator color="#4f46e5" /> : null}
          {!rosterLoading && roster && roster.length > 0
            ? roster.map((row) => (
                <View key={row.studentId} style={styles.rosterRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rosterName}>{row.name}</Text>
                    <Text style={styles.mutedSmall}>{[row.groupName, row.email].filter(Boolean).join(' · ')}</Text>
                  </View>
                  <View style={styles.statusBtns}>
                    {(['PRESENT', 'ABSENT', 'LATE'] as const).map((st) => (
                      <Pressable
                        key={st}
                        style={[styles.stChip, row.status === st && styles.stChipOn]}
                        onPress={() => updateRosterStatus(row.studentId, st)}
                      >
                        <Text style={[styles.stChipTxt, row.status === st && styles.stChipTxtOn]}>
                          {st === 'PRESENT' ? 'П' : st === 'ABSENT' ? 'В' : 'З'}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ))
            : null}

          <View style={styles.footerBtns}>
            <Pressable
              onPress={() => {
                setResult(null);
                setRoster(null);
              }}
            >
              <Text style={styles.link}>Скасувати</Text>
            </Pressable>
            <Pressable
              style={[styles.confirmBtn, (!roster || confirming) && { opacity: 0.5 }]}
              disabled={confirming || !roster}
              onPress={() => void confirmAttendance()}
            >
              <Text style={styles.confirmTxt}>{confirming ? '…' : 'Зберегти та підтвердити'}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#f8fafc' },
  inner: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { fontSize: 22, fontWeight: '900', color: '#0f172a', marginBottom: 14 },
  slotBox: {
    borderWidth: 1,
    borderColor: '#c7d2fe',
    borderRadius: 16,
    padding: 14,
    backgroundColor: '#eef2ff',
    marginBottom: 16,
    gap: 6,
  },
  slotCap: { fontSize: 11, fontWeight: '800', color: '#4f46e5', textTransform: 'uppercase' },
  slotLine: { fontWeight: '700', color: '#0f172a' },
  lineTxt: { fontSize: 14, color: '#334155' },
  link: { color: '#4f46e5', fontWeight: '800', marginTop: 8 },
  label: { fontSize: 11, fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#fff',
    marginBottom: 12,
    color: '#0f172a',
  },
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
  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  modeBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: '#e2e8f0', alignItems: 'center' },
  modeOn: { backgroundColor: '#fff', borderWidth: 2, borderColor: '#4f46e5' },
  modeTxt: { fontWeight: '700', color: '#64748b' },
  modeTxtOn: { color: '#4f46e5' },
  photoActionRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  pickBtn: {
    backgroundColor: '#4f46e5',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  pickBtnFlex: { flex: 1 },
  pickBtnFull: { marginBottom: 12, alignSelf: 'stretch' },
  pickBtnSecondary: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#4f46e5',
  },
  pickTxt: { color: '#fff', fontWeight: '800' },
  pickTxtSecondary: { color: '#4f46e5', fontWeight: '800' },
  err: { color: '#dc2626', marginVertical: 8 },
  muted: { color: '#64748b', fontSize: 14 },
  mutedSmall: { color: '#94a3b8', fontSize: 12 },
  resultBox: {
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    marginTop: 8,
  },
  resultTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  photo: { width: '100%', height: 220, backgroundColor: '#f1f5f9', marginTop: 12, borderRadius: 12 },
  metrics: { flexDirection: 'row', gap: 10, marginTop: 12 },
  metric: { flex: 1, backgroundColor: '#f8fafc', padding: 12, borderRadius: 12 },
  metricVal: { fontSize: 22, fontWeight: '900', color: '#4f46e5' },
  recRow: { fontSize: 13, color: '#334155', marginBottom: 4 },
  rosterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 8,
  },
  rosterName: { fontWeight: '700', color: '#0f172a' },
  statusBtns: { flexDirection: 'row', gap: 6 },
  stChip: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  stChipOn: { borderColor: '#4f46e5', backgroundColor: '#eef2ff' },
  stChipTxt: { fontWeight: '800', color: '#64748b', fontSize: 12 },
  stChipTxtOn: { color: '#4f46e5' },
  footerBtns: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
  },
  confirmBtn: { backgroundColor: '#4f46e5', paddingVertical: 12, paddingHorizontal: 18, borderRadius: 12 },
  confirmTxt: { color: '#fff', fontWeight: '800' },
  btn: { marginTop: 12, padding: 14, backgroundColor: '#e2e8f0', borderRadius: 12 },
  btnTxt: { fontWeight: '800', color: '#334155', textAlign: 'center' },
});
