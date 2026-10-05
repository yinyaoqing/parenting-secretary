import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { listChildren } from '../src/db/repo';
import type { Child } from '../src/db/types';
import { ageLabel, correctedDays, daysSince } from '../src/util/age';

export default function Home() {
  const [children, setChildren] = useState<Child[] | null>(null);

  useEffect(() => {
    listChildren().then(setChildren).catch(() => setChildren([]));
  }, []);

  if (children === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (children.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.h1}>先建立孩子的檔案</Text>
        <Text style={styles.p}>只存在這支手機上，沒有帳號，也不會上傳。</Text>
        <Pressable style={styles.btn} onPress={() => router.push('/onboarding/child')} accessibilityRole="button">
          <Text style={styles.btnText}>開始</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.page}>
      {children.map((c) => {
        const d = daysSince(c.birthDate);
        const cd = correctedDays(c.birthDate, c.dueDate);
        return (
          <View key={c.id} style={styles.card}>
            <Text style={styles.h2}>{c.nickname}</Text>
            <Text style={styles.p}>
              {ageLabel(d)}
              {cd !== null ? `（矯正 ${ageLabel(cd)}）` : ''}
            </Text>
          </View>
        );
      })}
      <Text style={styles.muted}>快速紀錄與提醒在第 4 到 8 週加入。</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, padding: 20, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  h1: { fontSize: 24, fontWeight: '700', textAlign: 'center' },
  h2: { fontSize: 20, fontWeight: '700' },
  p: { fontSize: 16, lineHeight: 24, textAlign: 'center' },
  muted: { fontSize: 14, opacity: 0.6, marginTop: 8 },
  card: { padding: 16, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: '#999' },
  btn: { marginTop: 12, paddingVertical: 14, paddingHorizontal: 28, borderRadius: 12, backgroundColor: '#145a63' },
  btnText: { color: '#fff', fontSize: 18, fontWeight: '600' },
});
