import { useState } from 'react';
import { View, Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { logSolid } from '../../src/records/quick';
import { deviceId } from '../../src/db/device';
import { useTheme } from '../../src/ui/useTheme';
import { Screen, SheetHeader, Field, Chip, Seg, Input, Card, SwitchRow, PrimaryButton } from '../../src/ui/components';
import { TimeRow } from '../../src/ui/TimeRow';
import { Thumb } from '../../src/ui/art';

// 常見食材快選只是輸入便利，不是建議清單。順序與內容不代表引入時機。
const COMMON = ['米糊', '十倍粥', '地瓜', '南瓜', '胡蘿蔔', '蘋果', '香蕉', '蛋黃', '全蛋', '豆腐', '雞肉', '魚', '花椰菜', '菠菜', '優格', '麵'];
type Accept = 'ate' | 'tasted' | 'refused';
const ACCEPT: { key: Accept; label: string }[] = [{ key: 'ate', label: '有吃' }, { key: 'tasted', label: '嚐一點' }, { key: 'refused', label: '拒絕' }];

export default function Solid() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const { styles } = useTheme();
  const [at, setAt] = useState(new Date());
  const [foods, setFoods] = useState<string[]>([]);
  const [custom, setCustom] = useState('');
  const [acceptance, setAcceptance] = useState<Accept>('ate');
  const [newFood, setNewFood] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const toggle = (f: string) => setFoods((cur) => (cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f]));

  const save = async () => {
    const list = [...foods, ...custom.split(/[、,，\s]+/).filter(Boolean)];
    if (!childId || list.length === 0) return setErr('請選或輸入至少一種食物');
    await logSolid(childId, list, acceptance, newFood, await deviceId(), at.toISOString());
    router.back();
  };

  return (
    <View style={styles.page}>
      <SheetHeader title="副食品" art={<Thumb art="bowl" size={44} radius={12} />} />
      <Screen footer={<PrimaryButton label="儲存" onPress={save} />}>
        <TimeRow value={at} onChange={setAt} />
        <Field label="吃了什麼" hint="快選只是輸入方便，順序不代表引入時機。">
          <View style={styles.chips}>
            {COMMON.map((f) => <Chip key={f} label={f} on={foods.includes(f)} onPress={() => toggle(f)} />)}
          </View>
          <Input value={custom} onChangeText={setCustom} placeholder="其他，用頓號分開" accessibilityLabel="其他食物" />
        </Field>
        <Field label="接受度">
          <Seg<Accept> label="接受度" value={acceptance} onChange={setAcceptance} options={ACCEPT} />
        </Field>
        <Card>
          <SwitchRow title="這次有新食材" sub="新食材一次一種、由少量開始，觀察 3 到 5 天（國健署）。這裡只記錄，不提醒。" value={newFood} onChange={setNewFood} />
        </Card>
        {err ? <Text style={[styles.p, styles.danger]}>{err}</Text> : null}
      </Screen>
    </View>
  );
}
