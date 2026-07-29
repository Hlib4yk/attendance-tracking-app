import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSession } from '../context/SessionContext';

export function AdminWebOnlyScreen() {
  const { logout } = useSession();
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.box}>
        <Text style={styles.title}>Адмін-панель</Text>
        <Text style={styles.sub}>
          Керування групами, викладачами та студентами доступне у веб-версії. У мобільному застосунку — ролі студент та
          викладач.
        </Text>
        <Pressable style={styles.btn} onPress={() => void logout()}>
          <Text style={styles.btnTxt}>Вийти</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc', justifyContent: 'center', padding: 24 },
  box: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 14,
  },
  title: { fontSize: 22, fontWeight: '900', color: '#0f172a' },
  sub: { fontSize: 15, color: '#64748b', lineHeight: 22 },
  btn: { marginTop: 8, backgroundColor: '#e2e8f0', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  btnTxt: { fontWeight: '800', color: '#334155' },
});
