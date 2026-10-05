import { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { logBottle } from '../../src/records/quick';
import { deviceId } from '../../src/db/device';
import { useTheme } from '../../src/ui/useTheme';
import type { FeedStartReason } from '../../src/db/types';

const KINDS = [['breastmilk', '母乳'], ['formula', '配方奶'], ['cow_milk', '鮮奶']] as const;
const REASONS: [FeedStartReason, string][] = [['cue', '看到飢餓訊號'], ['schedule', '到時間了'], ['reminder', 'APP 提醒'], ['other', '其他']];
const QUICK = [30, 60, 90, 120, 150, 180, 210, 240];

export default function Bottle() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const { styles } = useTheme();
  const [ml, setMl] = useState('');
  const [kind, setKind] = useState<(typeof KINDS)[number][0]>('breastmilk');
  const [reason, setReason] = useState<FeedStartReason>('cue');
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    const n = Number(ml);
    if (!childId || !Number.isFinite(n) || n <= 0 || n > 500) return setErr('請輸入 1 到 500 之間的 ml');
    await logBottle(childId, n, kind, reason, await deviceId());
    router.back();
  };

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.pad}>
      <Text style={styles.h2}>奶量</Text>
      <View style={styles.chipRow}>
        {QUICK.map((q) => (
          <Pressable key={q} style={[styles.chip, ml === String(q) && styles.chipActive]} onPress={() => setMl(String(q))} accessibilityRole="button">
            <Text style={[styles.chipText, ml === String(q) && styles.chipTextActive]}>{q}</Text>
          </Pressable>
        ))}
      </View>
      <TextInput style={styles.input} value={ml} onChangeText={setMl} keyboardType="number-pad" placeholder="ml" accessibilityLabel="奶量 ml" />

      <Text style={styles.h2}>種類</Text>
      <View style={styles.chipRow}>
        {KINDS.map(([k, l]) => (
          <Pressable key={k} style={[styles.chip, kind === k && styles.chipActive]} onPress={() => setKind(k)} accessibilityRole="button">
            <Text style={[styles.chipText, kind === k && styles.chipTextActive]}>{l}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.h2}>這次怎麼開始的</Text>
      <View style={styles.chipRow}>
        {REASONS.map(([k, l]) => (
          <Pressable key={k} style={[styles.chip, reason === k && styles.chipActive]} onPress={() => setReason(k)} accessibilityRole="button">
            <Text style={[styles.chipText, reason === k && styles.chipTextActive]}>{l}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.muted}>「APP 提醒」開始的餵食不會拿來學習你孩子的節奏。</Text>

      {err && <Text style={[styles.p, styles.danger]}>{err}</Text>}
      <Pressable style={styles.primary} onPress={save} accessibilityRole="button"><Text style={styles.primaryText}>儲存</Text></Pressable>
    </ScrollView>
  );
}
