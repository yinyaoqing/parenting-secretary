import { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Switch } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { logSolid } from '../../src/records/quick';
import { deviceId } from '../../src/db/device';
import { useTheme } from '../../src/ui/useTheme';

// 常見食材快選只是輸入便利，不是建議清單。順序與內容不代表引入時機。
const COMMON = ['米糊', '十倍粥', '地瓜', '南瓜', '胡蘿蔔', '蘋果', '香蕉', '蛋黃', '全蛋', '豆腐', '雞肉', '魚', '花椰菜', '菠菜', '優格', '麵'];
const ACCEPT = [['ate', '有吃'], ['tasted', '嚐一點'], ['refused', '拒絕']] as const;

export default function Solid() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const { styles } = useTheme();
  const [foods, setFoods] = useState<string[]>([]);
  const [custom, setCustom] = useState('');
  const [acceptance, setAcceptance] = useState<(typeof ACCEPT)[number][0]>('ate');
  const [newFood, setNewFood] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const toggle = (f: string) => setFoods((cur) => (cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f]));

  const save = async () => {
    const list = [...foods, ...custom.split(/[、,，\s]+/).filter(Boolean)];
    if (!childId || list.length === 0) return setErr('請選或輸入至少一種食物');
    await logSolid(childId, list, acceptance, newFood, await deviceId());
    router.back();
  };

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.pad}>
      <Text style={styles.h2}>吃了什麼</Text>
      <View style={styles.chipRow}>
        {COMMON.map((f) => (
          <Pressable key={f} style={[styles.chip, foods.includes(f) && styles.chipActive]} onPress={() => toggle(f)} accessibilityRole="button">
            <Text style={[styles.chipText, foods.includes(f) && styles.chipTextActive]}>{f}</Text>
          </Pressable>
        ))}
      </View>
      <TextInput style={styles.input} value={custom} onChangeText={setCustom} placeholder="其他，用頓號分開" accessibilityLabel="其他食物" />

      <Text style={styles.h2}>接受度</Text>
      <View style={styles.chipRow}>
        {ACCEPT.map(([k, l]) => (
          <Pressable key={k} style={[styles.chip, acceptance === k && styles.chipActive]} onPress={() => setAcceptance(k)} accessibilityRole="button">
            <Text style={[styles.chipText, acceptance === k && styles.chipTextActive]}>{l}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.row}>
        <Text style={styles.p}>這次有新食材</Text>
        <Switch value={newFood} onValueChange={setNewFood} />
      </View>
      {newFood && <Text style={styles.muted}>新食材請一次一種、由少量開始，觀察 3 到 5 天（國健署）。這裡只記錄，不提醒。</Text>}

      {err && <Text style={[styles.p, styles.danger]}>{err}</Text>}
      <Pressable style={styles.primary} onPress={save} accessibilityRole="button"><Text style={styles.primaryText}>儲存</Text></Pressable>
    </ScrollView>
  );
}
