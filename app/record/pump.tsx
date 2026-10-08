import { useCallback, useState } from 'react';
import { View, Text } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { addEvent, listEvents } from '../../src/db/events';
import { deviceId } from '../../src/db/device';
import type { Event } from '../../src/db/types';
import { inventory, recentAmounts, STORE_LABEL, STORE_GUIDE_DAYS, type Store, type Bag } from '../../src/records/pump';
import { fmtMonthDay } from '../../src/util/datetime';
import { useTheme } from '../../src/ui/useTheme';
import { Screen, SheetHeader, Field, Chip, NumInput, PrimaryButton, ListCard, ListRow, Badge, GhostButton } from '../../src/ui/components';
import { TimeRow } from '../../src/ui/TimeRow';

function StoreList({ s, bags, onUse }: { s: 'fridge' | 'freezer'; bags: Bag[]; onUse: (b: Bag) => void }) {
  const total = bags.reduce((a, b) => a + b.ml, 0);
  return (
    <ListRow first={s === 'fridge'} main={`${STORE_LABEL[s]} ${bags.length} 袋${total ? `，共 ${total} ml` : ''}`}
      sub={bags.length ? `最早 ${fmtMonthDay(new Date(bags[0].at))}，已存 ${bags[0].days} 天（國健署：${s === 'fridge' ? '冷藏 3 天' : '冷凍 3 個月'}）` : '沒有'}
      right={bags.length && bags[0].pastGuide ? <Badge label={`超過 ${STORE_GUIDE_DAYS[s]} 天`} tone="warm" /> : undefined}>
      {bags.length ? <GhostButton small tone="accent" label="用掉最早一袋" onPress={() => onUse(bags[0])} /> : null}
    </ListRow>
  );
}

// 擠奶與簡單庫存（媽媽視角自檢：回職場的媽媽原本沒有對應功能）。只記袋數與日期，不提醒。
export default function Pump() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const { styles, palette } = useTheme();
  const [at, setAt] = useState(new Date());
  const [ml, setMl] = useState('');
  const [store, setStore] = useState<Store>('fridge');
  const [events, setEvents] = useState<Event[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(() => {
    if (childId) listEvents(childId, { types: ['feed.pump', 'pump.use'], limit: 1000 }).then(setEvents);
  }, [childId]);
  useFocusEffect(load);

  const inv = inventory(events);
  const quick = recentAmounts(events, 'feed.pump', [90, 120, 150]);

  const save = async () => {
    const n = Number(ml);
    if (!childId || !Number.isFinite(n) || n <= 0 || n > 600) return setErr('請輸入 1 到 600 之間的 ml');
    await addEvent({ childId, type: 'feed.pump', startAt: at.toISOString(), payload: { ml: n, store }, recordedBy: await deviceId() });
    router.back();
  };

  const markUsed = async (b: Bag) => {
    if (!childId) return;
    await addEvent({ childId, type: 'pump.use', payload: { pumpId: b.id, store: b.store, ml: b.ml }, recordedBy: await deviceId() });
    load();
  };

  return (
    <View style={styles.page}>
      <SheetHeader title="擠奶" subtitle="只記量與存放，不提醒" />
      <Screen footer={<PrimaryButton label="儲存" onPress={save} />}>
        <Field label="奶量">
          <NumInput value={ml} onChangeText={setMl} unit="ml" label="擠奶量 ml" />
          <View style={styles.chips}>{quick.map((q) => <Chip key={q} label={String(q)} on={ml === String(q)} onPress={() => setMl(String(q))} />)}</View>
        </Field>
        <TimeRow value={at} onChange={setAt} />
        <Field label="放到哪裡" hint="國健署 333 原則：室溫 3 小時、冷藏 3 天、冷凍 3 個月。細節見飲食「母乳保存與回溫」。">
          <View style={styles.chips}>{(['feed', 'fridge', 'freezer'] as Store[]).map((s) => <Chip key={s} label={STORE_LABEL[s]} on={store === s} onPress={() => setStore(s)} />)}</View>
        </Field>
        <Text style={styles.h2}>庫存</Text>
        <ListCard>
          <StoreList s="fridge" bags={inv.fridge} onUse={markUsed} />
          <StoreList s="freezer" bags={inv.freezer} onUse={markUsed} />
        </ListCard>
        <Text style={styles.muted}>庫存只算存進冷藏、冷凍且還沒標「用掉」的。交接時會一起同步。</Text>
        {err ? <Text style={[styles.p, { color: palette.danger }]}>{err}</Text> : null}
      </Screen>
    </View>
  );
}
