import { useState } from 'react';
import { View, Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { logMedication } from '../../src/records/quick';
import { deviceId } from '../../src/db/device';
import { useTheme } from '../../src/ui/useTheme';
import { Screen, SheetHeader, Field, Chip, Input, PrimaryButton, Hint } from '../../src/ui/components';
import { TimeRow } from '../../src/ui/TimeRow';

const INTERVALS: [number | undefined, string][] = [[undefined, '不倒數'], [4, '4 時'], [6, '6 時'], [8, '8 時'], [12, '12 時'], [24, '24 時']];

// 用藥：藥名、劑量文字與間隔都由使用者照藥袋輸入；APP 不建議劑量、不宣稱療效（紅線 R6）。
export default function Medication() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const { styles } = useTheme();
  const [at, setAt] = useState(new Date());
  const [name, setName] = useState('');
  const [dose, setDose] = useState('');
  const [interval, setInterval] = useState<number | undefined>(undefined);
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    if (!childId || !name.trim()) return setErr('請輸入藥名（照藥袋寫）');
    await logMedication(childId, name.trim(), dose.trim(), interval, await deviceId(), at.toISOString());
    router.back();
  };

  return (
    <View style={styles.page}>
      <SheetHeader title="用藥" subtitle="只記錄與倒數，不建議劑量" />
      <Screen footer={<PrimaryButton label="儲存" onPress={save} />}>
        <TimeRow value={at} onChange={setAt} />
        <Field label="藥名">
          <Input value={name} onChangeText={setName} placeholder="照藥袋或醫囑寫" accessibilityLabel="藥名" />
        </Field>
        <Field label="劑量（可留空）">
          <Input value={dose} onChangeText={setDose} placeholder="照藥袋寫，例如 2.5 ml" accessibilityLabel="劑量" />
        </Field>
        <Field label="下次最早可給的間隔" hint="間隔以藥袋或醫囑為準。到時間會發一則通知，可在設定 › 提醒關閉。">
          <View style={styles.chips}>
            {INTERVALS.map(([h, l]) => <Chip key={l} label={l} on={interval === h} onPress={() => setInterval(h)} />)}
          </View>
        </Field>
        <Hint>APP 不建議任何藥物劑量，也不判斷是否需要用藥。</Hint>
        {err ? <Text style={[styles.p, styles.danger]}>{err}</Text> : null}
      </Screen>
    </View>
  );
}
