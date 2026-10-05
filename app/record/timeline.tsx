import { useCallback, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { deleteEvent, listEvents } from '../../src/db/events';
import type { Event } from '../../src/db/types';
import { eventSummary, hhmm, typeLabel, durationLabel } from '../../src/util/format';
import { addDays, dayLabel, dayKeyOf, toIsoDate } from '../../src/util/datetime';
import { useTheme } from '../../src/ui/useTheme';
import { Screen, TopBar, Chip, ListCard, ListRow, Badge, GhostButton, Card } from '../../src/ui/components';

const REASON_LABEL: Record<string, string> = { cue: '看到飢餓訊號', schedule: '到時間了', reminder: 'APP 提醒', other: '其他' };
const DAYS_SHOWN = 5;

export default function Timeline() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const { styles } = useTheme();
  const [events, setEvents] = useState<Event[]>([]);
  const [day, setDay] = useState<number | 'earlier'>(0); // 0 = 今天，1 = 昨天…
  const [selected, setSelected] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const load = useCallback(() => { if (childId) listEvents(childId, { limit: 500 }).then(setEvents); }, [childId]);
  useFocusEffect(load);

  const now = new Date();
  const days = Array.from({ length: DAYS_SHOWN }, (_, i) => addDays(now, -i));
  // 依「記錄當時的時區」切日：出國記的紀錄回國後仍歸在當地那一天。
  const cutoffKey = toIsoDate(addDays(now, -(DAYS_SHOWN - 1)));
  const shown = events.filter((e) => {
    const key = dayKeyOf(e.startAt, e.tzOffsetMin);
    return day === 'earlier' ? key < cutoffKey : key === toIsoDate(days[day]);
  });

  // 可能重複：不同裝置在一分鐘內記的同類事件（交接合併後最常見），只標示不刪。
  const dupIds = new Set<string>();
  const sorted = [...shown].sort((a, b) => a.startAt.localeCompare(b.startAt));
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const gap = new Date(sorted[j].startAt).getTime() - new Date(sorted[i].startAt).getTime();
      if (gap > 60000) break;
      if (sorted[i].type === sorted[j].type && sorted[i].recordedBy !== sorted[j].recordedBy) { dupIds.add(sorted[i].id); dupIds.add(sorted[j].id); }
    }
  }

  // 當日摘要：親餵次數、瓶餵總量、尿布片數、睡眠總時長（進行中的算到現在）
  const breast = shown.filter((e) => e.type === 'feed.breast').length;
  const bottleMl = shown.filter((e) => e.type === 'feed.bottle').reduce((a, e) => a + (Number(e.payload.ml) || 0), 0);
  const diapers = shown.filter((e) => e.type.startsWith('diaper.')).length;
  const sleepMin = shown.filter((e) => e.type === 'sleep').reduce((a, e) => a + Math.max(0, ((e.endAt ? new Date(e.endAt) : now).getTime() - new Date(e.startAt).getTime()) / 60000), 0);
  const sleepLabel = sleepMin < 60 ? `${Math.round(sleepMin)} 分` : `${Math.floor(sleepMin / 60)} 時 ${Math.round(sleepMin % 60)} 分`;

  const remove = async (id: string) => { await deleteEvent(id); setConfirmId(null); setSelected(null); load(); };

  const subOf = (e: Event) => {
    if (e.type === 'sleep') return e.endAt ? `${durationLabel(e.startAt, e.endAt)}，到 ${hhmm(e.endAt)}` : `進行中 ${durationLabel(e.startAt)}`;
    const r = (e.payload as { startReason?: string }).startReason;
    return r && REASON_LABEL[r] ? REASON_LABEL[r] : undefined;
  };

  return (
    <View style={styles.page}>
      <TopBar title="紀錄" back />
      <Screen>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {days.map((d, i) => <Chip key={i} label={dayLabel(d, now)} sm on={day === i} onPress={() => { setDay(i); setSelected(null); }} />)}
          <Chip label="更早" sm on={day === 'earlier'} onPress={() => { setDay('earlier'); setSelected(null); }} />
        </ScrollView>

        <Card style={[styles.summary, { gap: 0 }]}>
          {[['親餵', `${breast} 次`], ['瓶餵', `${bottleMl} ml`], ['尿布', `${diapers} 片`], ['睡眠', sleepLabel]].map(([k, v], i) => (
            <View key={k} style={[styles.summaryCell, i === 0 && styles.summaryCellFirst]}>
              <Text style={styles.summaryK}>{k}</Text>
              <Text style={styles.summaryV}>{v}</Text>
            </View>
          ))}
        </Card>

        <ListCard>
          {shown.length === 0 ? <ListRow first main="這天沒有紀錄。" /> : null}
          {shown.map((e, i) => {
            const isSel = selected === e.id;
            const main = `${typeLabel(e.type)} ${e.type === 'sleep' ? '' : eventSummary(e.type, e.payload, e.startAt, e.endAt)}`.trim();
            return (
              <ListRow
                key={e.id}
                first={i === 0}
                time={hhmm(e.startAt)}
                main={main}
                sub={subOf(e)}
                right={e.type === 'sleep' && !e.endAt ? <Badge label="進行中" tone="warm" /> : dupIds.has(e.id) ? <Badge label="可能重複" tone="warm" /> : undefined}
                chevron={!isSel}
                selected={isSel}
                onPress={() => { setSelected(isSel ? null : e.id); setConfirmId(null); }}
              >
                {isSel ? (
                  confirmId === e.id ? (
                    <View style={styles.grid}>
                      <View style={{ flex: 1 }}><GhostButton small label="確定刪除" tone="danger" icon="trash-2" onPress={() => remove(e.id)} /></View>
                      <View style={{ flex: 1 }}><GhostButton small label="取消" onPress={() => setConfirmId(null)} /></View>
                    </View>
                  ) : (
                    <View style={styles.grid}>
                      <View style={{ flex: 1 }}><GhostButton small label="修正時間" tone="accent" icon="edit-2" onPress={() => router.push({ pathname: '/record/edit', params: { childId, eventId: e.id } })} /></View>
                      <View style={{ flex: 1 }}><GhostButton small label="刪除" tone="danger" icon="trash-2" onPress={() => setConfirmId(e.id)} /></View>
                    </View>
                  )
                ) : null}
              </ListRow>
            );
          })}
        </ListCard>
        <Text style={styles.muted}>點一筆可修正時間或刪除。刪除會保留在資料庫但不再顯示；修正以新紀錄取代。</Text>
      </Screen>
    </View>
  );
}
