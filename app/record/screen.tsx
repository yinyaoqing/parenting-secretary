import { useState } from 'react';
import { View, Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { logScreenTime } from '../../src/records/quick';
import { deviceId } from '../../src/db/device';
import { useTheme } from '../../src/ui/useTheme';
import { Screen, SheetHeader, Field, Chip, NumInput, PrimaryButton, Hint } from '../../src/ui/components';
import { TimeRow } from '../../src/ui/TimeRow';

const QUICK = [10, 20, 30, 45, 60, 90];

// 3C 時間：只記分鐘數，不設上限、不評分、不比較（R1）。
export default function ScreenTime() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const { styles } = useTheme();
  const [at, setAt] = useState(new Date());
  const [min, setMin] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    const n = Number(min);
    if (!childId || !Number.isInteger(n) || n <= 0 || n > 720) return setErr('請輸入 1 到 720 之間的分鐘數');
    await logScreenTime(childId, n, await deviceId(), at.toISOString());
    router.back();
  };

  return (
    <View style={styles.page}>
      <SheetHeader title="3C 時間" subtitle="看螢幕、平板、手機的時間" />
      <Screen footer={<PrimaryButton label="儲存" onPress={save} />}>
        <TimeRow value={at} onChange={setAt} />
        <Field label="幾分鐘">
          <NumInput value={min} onChangeText={setMin} unit="分" label="3C 分鐘數" />
          <View style={styles.chips}>
            {QUICK.map((q) => <Chip key={q} label={`${q} 分`} on={min === String(q)} onPress={() => setMin(String(q))} />)}
          </View>
        </Field>
        <Hint>只記錄時間，不設上限，也不和別人比較。</Hint>
        {err ? <Text style={[styles.p, styles.danger]}>{err}</Text> : null}
      </Screen>
    </View>
  );
}
