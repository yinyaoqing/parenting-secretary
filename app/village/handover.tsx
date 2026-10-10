import { useCallback, useState } from 'react';
import { View, Text, Share } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useChildren } from '../../src/ui/ChildContext';
import { useTheme } from '../../src/ui/useTheme';
import { Screen, SheetHeader, Field, Input, Card, Chip, PrimaryButton, Hint } from '../../src/ui/components';
import { listEvents } from '../../src/db/events';
import { getSetting, setSetting } from '../../src/db/repo';
import type { Event } from '../../src/db/types';
import { buildShareText } from '../../src/records/share';
import { listMembers } from '../../src/village/store';
import { buildHandoverText, type VillageMember } from '../../src/village/model';

type Range = 'none' | 'today' | 'h24';
const RANGES: { key: Range; label: string }[] = [{ key: 'none', label: '不附紀錄' }, { key: 'today', label: '附今天紀錄' }, { key: 'h24', label: '附 24 小時' }];

// 交班卡（育村第一層）：注意事項存在這支手機，下次直接沿用；加上聯絡人與近況，用 LINE 或簡訊傳給下一位照顧者。
export default function Handover() {
  const { styles } = useTheme();
  const { active: child } = useChildren();
  const [notes, setNotes] = useState('');
  const [members, setMembers] = useState<VillageMember[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [range, setRange] = useState<Range>('today');
  const [now, setNow] = useState(() => Date.now());

  useFocusEffect(useCallback(() => {
    if (!child) return;
    setNow(Date.now());
    getSetting(`handover:${child.id}`).then((v) => setNotes(v ?? ''));
    listMembers().then(setMembers);
    listEvents(child.id, { from: new Date(Date.now() - 2 * 86400000).toISOString(), limit: 1000 }).then(setEvents);
  }, [child]));

  if (!child) return null;
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  const summary = range === 'none' ? '' : buildShareText(child.nickname, events, range === 'today' ? start.getTime() : now - 24 * 3600000, now, range === 'today' ? '今天' : '24 小時');
  const text = buildHandoverText(child.nickname, notes, members, summary);
  const saveNotes = (v: string) => { setNotes(v); void setSetting(`handover:${child.id}`, v); };

  return (
    <View style={styles.page}>
      <SheetHeader title="交班卡" subtitle="傳給下一位照顧者，對方不用裝 APP" />
      <Screen footer={<PrimaryButton label="用 LINE 或簡訊傳出" icon="share" onPress={() => { void Share.share({ message: text }); }} />}>
        <Field label="注意事項" hint="會留在這支手機，下次交班直接沿用。">
          <Input value={notes} onChangeText={saveNotes} placeholder="例如：午睡前要喝水、對花生過敏、週三要帶室內鞋" multiline accessibilityLabel="交班注意事項" />
        </Field>
        <View style={styles.chips}>{RANGES.map((r) => <Chip key={r.key} sm label={r.label} on={range === r.key} onPress={() => setRange(r.key)} />)}</View>
        <Card><Text selectable style={[styles.p, { fontSize: 15, lineHeight: 24 }]}>{text}</Text></Card>
        <Hint>交班卡是沒有加密的純文字，請只傳給要接手照顧的人。聯絡人只列出有填電話的村民。</Hint>
      </Screen>
    </View>
  );
}
