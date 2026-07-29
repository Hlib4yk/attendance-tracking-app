import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { buildScheduleByDayAndPeriod, weekParityLabel, type LpnuSlot } from '../lib/lpnu-schedule';

type AttendanceSem = { semestr: 'All' | '1' | '2'; semestrduration: '1' | '2' };

type Props = {
  slots: LpnuSlot[];
  attendanceSemester?: AttendanceSem | null;
  onAttendanceSlotPress?: (p: {
    day: string;
    period: number;
    variant: number;
    semestr: string;
    semestrduration: string;
  }) => void;
};

export function LpnuScheduleGrouped({ slots, attendanceSemester, onAttendanceSlotPress }: Props) {
  const scheduleByDayAndPeriod = useMemo(() => buildScheduleByDayAndPeriod(slots), [slots]);
  if (!scheduleByDayAndPeriod.length) return null;

  return (
    <View style={styles.wrap}>
      {scheduleByDayAndPeriod.map(({ day, periods }) => (
        <View key={day} style={styles.dayCard}>
          <View style={styles.dayHeader}>
            <Text style={styles.dayTitle}>{day}</Text>
          </View>
          {periods.map(({ period, slots: periodSlots }) => {
            const isSplit = periodSlots.length > 1;
            return (
              <View key={`${day}-${period}`} style={styles.periodBlock}>
                <View style={styles.periodLabelRow}>
                  <Text style={styles.periodBadge}>Пара {period}</Text>
                  {isSplit ? (
                    <Text style={styles.variantHint}>{periodSlots.length} варіанти поруч</Text>
                  ) : null}
                </View>
                <View style={isSplit ? styles.variantGrid : styles.variantSingle}>
                  {periodSlots.map((slot, idx) => {
                    const canLink = Boolean(attendanceSemester && onAttendanceSlotPress);
                    const inner = (
                      <>
                        {isSplit ? (
                          <Text style={styles.subgroupLabel}>Варіант {idx + 1}</Text>
                        ) : null}
                        <Text style={styles.parity}>{weekParityLabel(slot.weekParity)}</Text>
                        {slot.lines.map((line, i) => (
                          <Text key={i} style={styles.line}>
                            {line}
                          </Text>
                        ))}
                      </>
                    );
                    const shell = [styles.slotBox, canLink && styles.slotBoxLink];
                    return canLink ? (
                      <Pressable
                        key={`${day}-${period}-${slot.weekParity}-${idx}`}
                        style={({ pressed }) => [...shell, pressed && styles.slotPressed]}
                        onPress={() =>
                          onAttendanceSlotPress!({
                            day,
                            period,
                            variant: idx,
                            semestr: attendanceSemester!.semestr,
                            semestrduration: attendanceSemester!.semestrduration,
                          })
                        }
                      >
                        {inner}
                      </Pressable>
                    ) : (
                      <View key={`${day}-${period}-${slot.weekParity}-${idx}`} style={styles.slotBox}>
                        {inner}
                      </View>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 16 },
  dayCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  dayHeader: { paddingVertical: 10, paddingHorizontal: 16, backgroundColor: '#f8fafc', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  dayTitle: { fontWeight: '800', fontSize: 16, color: '#0f172a' },
  periodBlock: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  periodLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' },
  periodBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4f46e5',
    backgroundColor: '#eef2ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  variantHint: { fontSize: 10, fontWeight: '700', color: '#64748b', textTransform: 'uppercase' },
  variantGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  variantSingle: { gap: 12 },
  slotBox: {
    flex: 1,
    minWidth: 140,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    backgroundColor: '#f8fafc',
    padding: 12,
    gap: 6,
  },
  slotBoxLink: { borderColor: '#c7d2fe' },
  slotPressed: { opacity: 0.85 },
  subgroupLabel: { fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase' },
  parity: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  line: { fontSize: 14, color: '#1e293b' },
});
