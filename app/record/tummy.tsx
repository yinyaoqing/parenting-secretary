import { useState } from 'react';
import { View, Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { logTummyTime } from '../../src/records/quick';
import { deviceId } from '../../src/db/device';
import { useTheme } from '../../src/ui/useTheme';
import { Screen, SheetHeader, Field, Chip, NumInput, PrimaryButton, Hint } from '../../src/ui/components';
import { TimeRow } from '../../src/ui/TimeRow';

const QUICK = [1, 3, 5, 10, 15, 20];

// 清醒趴臥時間：全產品不用「趴睡」一詞（紅線 R7）。只記錄分鐘數。
export default function Tummy() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const { styles } = useTheme();
  const [at, setAt] = useState(new Date());
  const [min, setMin] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    const n = Number(min);
    if (!childId || !Number.isInteger(n) || n <= 0 || n > 120) return setErr('請輸入 1 到 120 之間的分鐘數');
    await logTummyTime(childId, n, await deviceId(), at.toISOString());
    router.back();
  };

  return (
    <View style={styles.page}>
      <SheetHeader title="清醒趴臥" subtitle="清醒時、大人看著的趴臥練習" />
      <Screen footer={<PrimaryButton label="儲存" onPress={save} />}>
        <TimeRow value={at} onChange={setAt} />
        <Field label="幾分鐘">
          <NumInput value={min} onChangeText={setMin} unit="分" label="清醒趴臥分鐘數" />
          <View style={styles.chips}>
            {QUICK.map((q) => <Chip key={q} label={`${q} 分`} on={min === String(q)} onPress={() => setMin(String(q))} />)}
          </View>
        </Field>
        <Hint>只記錄時間，不設目標。睡覺時一律仰睡，見安全內容「安全睡眠」。</Hint>
        {err ? <Text style={[styles.p, styles.danger]}>{err}</Text> : null}
      </Screen>
    </View>
  );
}
