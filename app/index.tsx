import { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { listChildren } from '../src/db/repo';
import { lastEvent, listEvents, openEvent } from '../src/db/events';
import { logBreastFeed, logDiaper, startSleep, endSleep } from '../src/records/quick';
import { deviceId } from '../src/db/device';
import type { Child, Event } from '../src/db/types';
import { ageLabel, correctedDays, daysSince } from '../src/util/age';
import { eventSummary, hhmm, sinceLabel, startOfToday, typeLabel } from '../src/util/format';
import { useTheme } from '../src/ui/useTheme';

export default function Home() {
  const { styles, palette, night, mode, setMode } = useTheme();
  const [children, setChildren] = useState<Child[] | null>(null);
  const [child, setChild] = useState<Child | null>(null);
  const [lastFeed, setLastFeed] = useState<Event | null>(null);
  const [lastDiaper, setLastDiaper] = useState<Event | null>(null);
  const [sleeping, setSleeping] = useState<Event | null>(null);
  const [today, setToday] = useState<Event[]>([]);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(async (c: Child | null) => {
    if (!c) return;
    const [f, d, s, t] = await Promise.all([
      lastEvent(c.id, ['feed.breast', 'feed.bottle']),
      lastEvent(c.id, ['diaper.wet', 'diaper.dirty', 'diaper.both']),
      openEvent(c.id, 'sleep'),
      listEvents(c.id, { from: startOfToday(), limit: 50 }),
    ]);
    setLastFeed(f); setLastDiaper(d); setSleeping(s); setToday(t);
  }, []);

  useFocusEffect(useCallback(() => {
    let alive = true;
    listChildren().then((cs) => {
      if (!alive) return;
      setChildren(cs);
      const c = cs[0] ?? null;
      setChild(c);
      refresh(c);
    }).catch(() => setChildren([]));
    return () => { alive = false; };
  }, [refresh]));

  useEffect(() => {
    const id = setInterval(() => setTick((x) => x + 1), 60000);
    return () => clearInterval(id);
  }, []);

  if (children === null) {
    return <View style={[styles.page, { alignItems: 'center', justifyContent: 'center' }]}><ActivityIndicator color={palette.accent} /></View>;
  }

  if (!child) {
    return (
      <View style={[styles.page, { alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 }]}>
        <Text style={styles.h1}>先建立孩子的檔案</Text>
        <Text style={[styles.p, { textAlign: 'center' }]}>只存在這支手機上，沒有帳號，也不會上傳。</Text>
        <Pressable style={[styles.primary, { paddingHorizontal: 28 }]} onPress={() => router.push('/onboarding/child')} accessibilityRole="button">
          <Text style={styles.primaryText}>開始</Text>
        </Pressable>
      </View>
    );
  }

  const d = daysSince(child.birthDate);
  const cd = correctedDays(child.birthDate, child.dueDate);
  const by = async () => deviceId();

  const act = async (fn: () => Promise<unknown>) => { await fn(); await refresh(child); };

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.pad}>
      <View style={styles.row}>
        <View>
          <Text style={styles.h1}>{child.nickname}</Text>
          <Text style={styles.muted}>{ageLabel(d)}{cd !== null ? `（矯正 ${ageLabel(cd)}）` : ''}</Text>
        </View>
        <Pressable onPress={() => setMode(mode === 'night' ? 'auto' : 'night')} accessibilityRole="button" accessibilityLabel={night ? '關閉夜間模式' : '開啟夜間模式'} style={styles.chip}>
          <Text style={styles.chipText}>{night ? '夜間' : '日間'}</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.p}>上次餵奶：{lastFeed ? sinceLabel(lastFeed.startAt) : '尚無紀錄'}</Text>
        <Text style={styles.p}>上次尿布：{lastDiaper ? sinceLabel(lastDiaper.startAt) : '尚無紀錄'}</Text>
        {sleeping && <Text style={styles.p}>睡眠進行中：{eventSummary('sleep', sleeping.payload, sleeping.startAt)}</Text>}
        <Text style={styles.muted}>只顯示時間，不做提醒以外的判斷。</Text>
      </View>

      <Text style={styles.h2}>餵食</Text>
      <View style={styles.bigGrid}>
        <Big label="親餵 左" sub="一鍵記錄" onPress={() => act(async () => logBreastFeed(child.id, 'L', undefined, 'cue', await by()))} s={styles} />
        <Big label="親餵 右" sub="一鍵記錄" onPress={() => act(async () => logBreastFeed(child.id, 'R', undefined, 'cue', await by()))} s={styles} />
        <Big label="瓶餵" sub="輸入 ml" onPress={() => router.push({ pathname: '/record/bottle', params: { childId: child.id } })} s={styles} />
        <Big label="副食品" sub="第 5 週加入" onPress={() => {}} s={styles} disabled />
      </View>

      <Text style={styles.h2}>尿布</Text>
      <View style={styles.bigGrid}>
        <Big label="濕" onPress={() => act(async () => logDiaper(child.id, 'wet', await by()))} s={styles} />
        <Big label="便" onPress={() => act(async () => logDiaper(child.id, 'dirty', await by()))} s={styles} />
        <Big label="濕＋便" onPress={() => act(async () => logDiaper(child.id, 'both', await by()))} s={styles} />
      </View>

      <Text style={styles.h2}>睡眠與健康</Text>
      <View style={styles.bigGrid}>
        <Big
          label={sleeping ? '醒了' : '睡著了'}
          sub={sleeping ? `已睡 ${eventSummary('sleep', {}, sleeping.startAt).replace('進行中 ', '')}` : '開始計時'}
          active={!!sleeping}
          onPress={() => act(async () => (sleeping ? endSleep(child.id) : startSleep(child.id, await by())))}
          s={styles}
        />
        <Big label="體溫" sub="數字與部位" onPress={() => router.push({ pathname: '/record/temperature', params: { childId: child.id } })} s={styles} />
      </View>

      <View style={styles.row}>
        <Text style={styles.h2}>今天</Text>
        <Pressable onPress={() => router.push({ pathname: '/record/timeline', params: { childId: child.id } })} accessibilityRole="button"><Text style={[styles.muted, { color: palette.accent }]}>全部與修正</Text></Pressable>
      </View>
      <View style={styles.card}>
        {today.length === 0 && <Text style={styles.muted}>今天還沒有紀錄。</Text>}
        {today.slice(0, 8).map((e) => (
          <View key={e.id} style={styles.timelineItem}>
            <Text style={styles.time}>{hhmm(e.startAt)}</Text>
            <Text style={styles.p}>{typeLabel(e.type)} {eventSummary(e.type, e.payload, e.startAt, e.endAt)}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.muted} accessibilityElementsHidden>{tick ? '' : ''}</Text>
    </ScrollView>
  );
}

function Big({ label, sub, onPress, s, active, disabled }: { label: string; sub?: string; onPress: () => void; s: ReturnType<typeof useTheme>['styles']; active?: boolean; disabled?: boolean }) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={[s.bigBtn, active && s.bigBtnActive, disabled && { opacity: 0.4 }]}
      accessibilityRole="button"
      accessibilityState={{ disabled, selected: active }}
    >
      <Text style={[s.bigBtnText, active && s.bigBtnTextActive]}>{label}</Text>
      {sub ? <Text style={[s.bigBtnSub, active && s.bigBtnTextActive]}>{sub}</Text> : null}
    </Pressable>
  );
}
