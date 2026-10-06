import { useCallback, useState } from 'react';
import { View, Text, Pressable, Linking } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useChildren } from '../../src/ui/ChildContext';
import { addEvent, listEvents } from '../../src/db/events';
import { getSetting, setSetting } from '../../src/db/repo';
import { deviceId } from '../../src/db/device';
import type { Event } from '../../src/db/types';
import { MINDSET, PAUSE_QUOTE, READINESS, SMALL_TIPS, SOURCE, TIMING, TIPS, TOILET_CARD_ID, TOILET_TASK, OUTCOMES, countAttempts, taskStatus } from '../../src/tasks/toilet';
import { addDays, fmtMonthDay, toIsoDate } from '../../src/util/datetime';
import { useTheme } from '../../src/ui/useTheme';
import { Screen, TopBar, Card, Section, PrimaryButton, GhostButton, Icon, Badge } from '../../src/ui/components';

const TASK_TYPES = ['task.start', 'task.pause', 'task.complete', 'task.attempt'];

function List({ items }: { items: string[] }) {
  const { styles, palette } = useTheme();
  return (
    <Card style={{ gap: 10 }}>
      {items.map((t, i) => (
        <View key={i} style={[styles.row, { alignItems: 'flex-start', gap: 8 }]}>
          <Text style={[styles.p, { color: palette.accent }]}>•</Text>
          <Text style={[styles.p, styles.sp]}>{t}</Text>
        </View>
      ))}
    </Card>
  );
}

// 如廁訓練（第一版唯一的任務）。準備度由家長自己勾、APP 不判斷；只數次數，不算百分比、不比常模（R1）。
export default function ToiletTask() {
  const { childId } = useLocalSearchParams<{ childId?: string }>();
  const { styles, palette } = useTheme();
  const { children, active } = useChildren();
  const child = children.find((c) => c.id === childId) ?? active;
  const [events, setEvents] = useState<Event[]>([]);
  const [ready, setReady] = useState<number[]>([]);
  const cid = child?.id;

  const load = useCallback(async () => {
    if (!cid) return;
    const [evs, r] = await Promise.all([listEvents(cid, { types: TASK_TYPES, limit: 1000 }), getSetting(`toiletReady:${cid}`)]);
    setEvents(evs);
    try { setReady(r ? JSON.parse(r) : []); } catch { setReady([]); }
  }, [cid]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  if (!child) return <View style={styles.page}><TopBar back title="如廁訓練" /></View>;

  const status = taskStatus(events);
  const now = new Date();
  const weekFrom = new Date(now); weekFrom.setHours(0, 0, 0, 0); weekFrom.setDate(weekFrom.getDate() - 6);
  const week = countAttempts(events, weekFrom.toISOString());
  const days14 = Array.from({ length: 14 }, (_, i) => addDays(now, i - 13));
  const perDay = days14.map((d) => {
    const key = toIsoDate(d);
    const list = events.filter((e) => e.type === 'task.attempt' && toIsoDate(new Date(e.startAt)) === key);
    return { d, n: list.length, hit: list.some((e) => e.payload.outcome === 'pee' || e.payload.outcome === 'poo') };
  });

  const life = async (type: 'task.start' | 'task.pause' | 'task.complete') => {
    await addEvent({ childId: child.id, type, payload: { task: TOILET_TASK }, recordedBy: await deviceId() });
    await load();
  };
  const toggleReady = async (i: number) => {
    const next = ready.includes(i) ? ready.filter((x) => x !== i) : [...ready, i];
    setReady(next);
    await setSetting(`toiletReady:${child.id}`, JSON.stringify(next));
  };

  return (
    <View style={styles.page}>
      <TopBar back title="如廁訓練" subtitle={child.nickname} />
      <Screen>
        {status.state === 'active' ? (
          <Card accent style={{ gap: 10 }}>
            <View style={[styles.row, { gap: 8 }]}><Badge label="進行中" /><Text style={styles.muted}>{fmtMonthDay(new Date(status.since))}開始</Text></View>
            <Text style={[styles.p, { fontWeight: '700' }]}>這 7 天坐了 {week.total} 次</Text>
            <Text style={styles.muted}>{OUTCOMES.map((o) => `${o.label} ${week.byOutcome[o.key]}`).join(' · ')}</Text>
            <View style={{ flexDirection: 'row', gap: 4 }} accessibilityLabel="最近 14 天每天坐小馬桶的次數">
              {perDay.map((x, i) => (
                <View key={i} style={{ flex: 1, alignItems: 'center', gap: 2 }}>
                  <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: x.n ? (x.hit ? palette.accent : palette.accentSoft) : 'transparent', borderWidth: 1, borderColor: x.n ? palette.accent : palette.line }} />
                  <Text style={{ fontSize: 10, color: palette.ink3 }}>{x.d.getDate()}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.muted}>圓點只表示那天有練習；實心表示那天至少一次有尿或便。不算比例，不和別的孩子比較。在「今天」分頁按「坐小馬桶」記錄。</Text>
            <View style={styles.grid}>
              <View style={{ flex: 1 }}><GhostButton label="先休息" onPress={() => life('task.pause')} /></View>
              <View style={{ flex: 1 }}><GhostButton label="完成了" tone="accent" icon="check" onPress={() => life('task.complete')} /></View>
            </View>
          </Card>
        ) : status.state === 'paused' ? (
          <Card warm style={{ gap: 10 }}>
            <View style={[styles.row, { gap: 8 }]}><Badge label="休息中" tone="warm" /><Text style={styles.muted}>{fmtMonthDay(new Date(status.since))}起</Text></View>
            <Text style={[styles.p, { color: palette.ink2 }]}>「{PAUSE_QUOTE}」</Text>
            <PrimaryButton label="再試一次" onPress={() => life('task.start')} />
          </Card>
        ) : status.state === 'done' ? (
          <Card accent style={{ gap: 10 }}>
            <View style={[styles.row, { gap: 8 }]}><Badge label="完成" icon="check" /><Text style={styles.muted}>{fmtMonthDay(new Date(status.since))}</Text></View>
            <Text style={[styles.p, { color: palette.ink2 }]}>「{MINDSET[3]}」</Text>
            <GhostButton label="重新開始記錄" onPress={() => life('task.start')} />
          </Card>
        ) : (
          <Card style={{ gap: 10 }}>
            <Text style={[styles.p, { fontWeight: '700' }]}>開始前，看看孩子準備好了沒</Text>
            <Text style={styles.muted}>勾選只給你自己看，APP 不會判斷。開始時機：{TIMING}</Text>
            {READINESS.map((t, i) => (
              <Pressable key={i} onPress={() => toggleReady(i)} accessibilityRole="checkbox" accessibilityState={{ checked: ready.includes(i) }} style={[styles.row, { alignItems: 'flex-start', gap: 10, minHeight: 44 }]}>
                <View style={{ width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: ready.includes(i) ? palette.accent : palette.line, backgroundColor: ready.includes(i) ? palette.accent : 'transparent', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                  {ready.includes(i) ? <Icon name="check" size={16} color={palette.accentInk} /> : null}
                </View>
                <Text style={[styles.p, styles.sp]}>{t}</Text>
              </Pressable>
            ))}
            <PrimaryButton label="開始如廁訓練" onPress={() => life('task.start')} />
            <Text style={styles.muted}>開始後，「今天」分頁會多一顆「坐小馬桶」按鈕（夜間模式不顯示）。隨時可以先休息。</Text>
          </Card>
        )}

        <Section title="順利完成的正確心態" />
        <List items={MINDSET} />
        <Section title="訓練成功的訣竅" />
        <List items={TIPS} />
        <Section title="小技巧幫大忙" />
        <List items={SMALL_TIPS} />

        <Section title="資料來源" />
        <Card style={{ gap: 8 }}>
          <Pressable onPress={() => Linking.openURL(SOURCE.url)} accessibilityRole="link" style={[styles.row, { gap: 6, alignItems: 'flex-start' }]}>
            <Text style={[styles.link, styles.sp, { fontSize: 14, lineHeight: 20 }]}>{SOURCE.name}</Text>
            <Icon name="external-link" size={14} color={palette.accent} />
          </Pressable>
          <Text style={styles.muted}>以上文字逐字引用國健署原文（政府網站資料開放宣告）。查核 {SOURCE.checkedAt}。</Text>
          <GhostButton small plain tone="accent" label="看內容卡" onPress={() => router.push({ pathname: '/cards/[id]', params: { id: TOILET_CARD_ID } })} />
        </Card>
      </Screen>
    </View>
  );
}
