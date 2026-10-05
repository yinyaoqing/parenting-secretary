// 表單的「時間」列：預設現在，可用選擇器或快捷鍵補登（設計稿：每個表單都能直接補登）。
import { View } from 'react-native';
import { DatePick } from './DatePick';
import { Chip, Field } from './components';
import { useTheme } from './useTheme';
import { applyTime, fmtWhen, minutesBefore } from '../util/datetime';

const QUICK: [string, number][] = [['現在', 0], ['－15 分', 15], ['－30 分', 30], ['－1 時', 60], ['－2 時', 120]];

export function TimeRow({ value, onChange }: { value: Date; onChange: (d: Date) => void }) {
  const { styles } = useTheme();
  return (
    <Field label="時間">
      <DatePick value={value} mode="time" label="時間" format={(d) => fmtWhen(d)} onChange={(picked) => onChange(applyTime(value, picked))} />
      <View style={styles.chips}>
        {QUICK.map(([l, m]) => <Chip key={l} label={l} sm onPress={() => onChange(minutesBefore(m))} />)}
      </View>
    </Field>
  );
}
