import { useCallback, useState } from 'react';
import { View, Text, Share } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { listEvents } from '../../src/db/events';
import type { Event } from '../../src/db/types';
import { buildShareText } from '../../src/records/share';
import { useChildren } from '../../src/ui/ChildContext';
import { useTheme } from '../../src/ui/useTheme';
import { Screen, SheetHeader, Chip, Card, PrimaryButton } from '../../src/ui/components';

type Range = 'today' | 'h24' | 'h72';
const RANGES: { key: Range; label: string }[] = [{ key: 'today', label: '今天' }, { key: 'h24', label: '最近 24 小時' }, { key: 'h72', label: '最近 72 小時' }];

// 分享今天（媽媽視角自檢）：純文字給另一位照顧者，對方不用裝 APP。只有紀錄，沒有評語。
export default function ShareToday() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const { styles } = useTheme();
  const { children, active } = useChildren();
  const child = children.find((c) => c.id === childId) ?? active;
  const [range, setRange] = useState<Range>('today');
  const [events, setEvents] = useState<Event[]>([]);
  const [now, setNow] = useState(() => Date.now());

  useFocusEffect(useCallback(() => {
    if (!child) return;
    setNow(Date.now());
    listEvents(child.id, { from: new Date(Date.now() - 4 * 86400000).toISOString(), limit: 2000 }).then(setEvents);
  }, [child]));

  if (!child) return null;
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  const from = range === 'today' ? start.getTime() : now - (range === 'h24' ? 24 : 72) * 3600000;
  const label = range === 'today' ? `${start.getMonth() + 1}/${start.getDate()}` : RANGES.find((r) => r.key === range)!.label;
  const text = buildShareText(child.nickname, events, from, now, label);

  return (
    <View style={styles.page}>
      <SheetHeader title="分享今天" subtitle="純文字，對方不用裝 APP" />
      <Screen footer={<PrimaryButton label="用 LINE 或簡訊傳出" icon="share" onPress={() => { void Share.share({ message: text }); }} />}>
        <View style={styles.chips}>{RANGES.map((r) => <Chip key={r.key} sm label={r.label} on={range === r.key} onPress={() => setRange(r.key)} />)}</View>
        <Card><Text selectable style={[styles.p, { fontSize: 15, lineHeight: 24 }]}>{text}</Text></Card>
        <Text style={styles.muted}>分享面板裡也可以選「拷貝」。只包含這段時間的紀錄，不含照顧者打卡或其他孩子。</Text>
      </Screen>
    </View>
  );
}
