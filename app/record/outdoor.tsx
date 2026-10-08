import { useState } from 'react';
import { View, Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { logOutdoor } from '../../src/records/quick';
import { deviceId } from '../../src/db/device';
import { useTheme } from '../../src/ui/useTheme';
import { Screen, SheetHeader, Field, Chip, NumInput, PrimaryButton, Hint } from '../../src/ui/components';
import { TimeRow } from '../../src/ui/TimeRow';

const QUICK = [15, 30, 60, 90, 120, 180];

// 戶外活動：國健署近視防治建議每天戶外活動，這裡只記分鐘數，不設目標、不累計達標（R1）。
export default function Outdoor() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const { styles } = useTheme();
  const [at, setAt] = useState(new Date());
  const [min, setMin] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    const n = Number(min);
    if (!childId || !Number.isInteger(n) || n <= 0 || n > 720) return setErr('請輸入 1 到 720 之間的分鐘數');
    await logOutdoor(childId, n, await deviceId(), at.toISOString());
    router.back();
  };

  return (
    <View style={styles.page}>
      <SheetHeader title="戶外活動" subtitle="今天在外面待了多久" />
      <Screen footer={<PrimaryButton label="儲存" onPress={save} />}>
        <TimeRow value={at} onChange={setAt} />
        <Field label="幾分鐘">
          <NumInput value={min} onChangeText={setMin} unit="分" label="戶外活動分鐘數" />
          <View style={styles.chips}>
            {QUICK.map((q) => <Chip key={q} label={`${q} 分`} on={min === String(q)} onPress={() => setMin(String(q))} />)}
          </View>
        </Field>
        <Hint>只記錄時間，不設目標。想看國健署的建議，用「問問看」搜「戶外」。</Hint>
        {err ? <Text style={[styles.p, styles.danger]}>{err}</Text> : null}
      </Screen>
    </View>
  );
}
