import { useCallback, useState } from 'react';
import { View, Text } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { addTimer, listTimers, deleteReminder } from '../../src/db/reminders';
import type { Reminder } from '../../src/db/types';
import { fmtWhen } from '../../src/util/datetime';
import { useTheme } from '../../src/ui/useTheme';
import { Screen, SheetHeader, Field, Chip, Input, PrimaryButton, GhostButton, Hint, ListCard, ListRow } from '../../src/ui/components';
import { TimeRow } from '../../src/ui/TimeRow';

const INTERVALS: [number, string][] = [[30, '30 分'], [60, '1 時'], [120, '2 時'], [180, '3 時'], [240, '4 時'], [360, '6 時'], [480, '8 時'], [720, '12 時'], [1440, '24 時']];

// 倒數提醒：標題、起算時間、間隔全由使用者輸入。APP 不給範本、不解讀標題、不留歷史；響過就刪（送審版型 personal，見 src/release/profile.ts）。
export default function Timer() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const { styles } = useTheme();
  const [from, setFrom] = useState(new Date());
  const [title, setTitle] = useState('');
  const [minutes, setMinutes] = useState<number | null>(null);
  const [pending, setPending] = useState<Reminder[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(() => { if (childId) listTimers(childId).then(setPending); }, [childId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const save = async () => {
    if (!childId) return;
    if (!title.trim()) return setErr('請寫一個標題，通知會原樣顯示這幾個字');
    if (!minutes) return setErr('請選多久以後提醒');
    await addTimer(childId, title, from.toISOString(), minutes);
    router.back();
  };

  return (
    <View style={styles.page}>
      <SheetHeader title="倒數提醒" subtitle="你寫標題、選時間，到了發一則通知" />
      <Screen footer={<PrimaryButton label="設定提醒" onPress={save} />}>
        <Field label="標題">
          <Input value={title} onChangeText={setTitle} placeholder="自己寫，例如：奶瓶消毒好了" accessibilityLabel="倒數提醒標題" />
        </Field>
        <TimeRow value={from} onChange={setFrom} />
        <Field label="多久以後" hint="從上面的時間起算。可在設定 › 提醒關閉所有倒數。">
          <View style={styles.chips}>
            {INTERVALS.map(([m, l]) => <Chip key={m} label={l} on={minutes === m} onPress={() => { setMinutes(m); setErr(null); }} />)}
          </View>
        </Field>
        <Hint>通知只會重複你的標題。響過就刪掉，不留紀錄；APP 不解讀標題的內容。</Hint>
        {err ? <Text style={[styles.p, styles.danger]}>{err}</Text> : null}

        {pending.length ? (
          <>
            <Text style={styles.h2}>還沒響的</Text>
            <ListCard>
              {pending.map((r, i) => (
                <ListRow key={r.id} first={i === 0} main={r.title} sub={fmtWhen(new Date(r.dueAt))} right={<GhostButton small plain label="取消" onPress={async () => { await deleteReminder(r.id); load(); }} />} />
              ))}
            </ListCard>
          </>
        ) : null}
      </Screen>
    </View>
  );
}
