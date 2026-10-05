import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { listChildren } from '../../src/db/repo';
import { deleteEvent, lastEvent, listEvents, openEvent, recentIntervalsMinutes } from '../../src/db/events';
import { logBreastFeed, logDiaper, startSleep, endSleep, safetyNetUpperBound } from '../../src/records/quick';
import { deviceId } from '../../src/db/device';
import type { Child, Event } from '../../src/db/types';
import { ageLabel, correctedDays, daysSince } from '../../src/util/age';
import { eventSummary, hhmm, durationLabel, startOfToday, typeLabel } from '../../src/util/format';
import { minutesAgo, sinceShort } from '../../src/util/datetime';
import { useTheme } from '../../src/ui/useTheme';
import { safetyCards } from '../../src/content/loader';
import { Screen, TopBar, IconButton, Tile, Big, SafetyBox, Section, ListCard, ListRow, Toast, Banner, PrimaryButton, GhostButton, Icon, Badge } from '../../src/ui/components';

const FEED_TYPES = ['feed.breast', 'feed.bottle'];
const DIAPER_TYPES = ['diaper.wet', 'diaper.dirty', 'diaper.both'];
// 安全網（規劃 v0.4 第 6.1 節）：上界 = 最近間隔第 90 百分位與安全上限取小。
// 安全上限只採官方文字可推得的值：國健署「新生兒依需求哺餵、每天約 8–12 次」推得白天間隔上限約 3 小時；
// 月齡常模虛擬樣本以 2.5 小時計。只在 1 歲前啟用。
const FEED_CAP_MIN = 180;
const FEED_PRIOR_MIN = 150;
const NET_RECENT = 14;

type ToastState = { text: string; eventId?: string };

export default function Home() {
  const { styles, palette, night, setMode } = useTheme();
  const [children, setChildren] = useState<Child[] | null>(null);
  const [child, setChild] = useState<Child | null>(null);
  const [lastFeed, setLastFeed] = useState<Event | null>(null);
  const [lastDiaper, setLastDiaper] = useState<Event | null>(null);
  const [sleeping, setSleeping] = useState<Event | null>(null);
  const [lastSleep, setLastSleep] = useState<Event | null>(null);
  const [today, setToday] = useState<Event[]>([]);
  const [intervals, setIntervals] = useState<number[]>([]);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [netDismissedUntil, setNetDismissedUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now()); // 每分鐘更新一次，讓「幾分前」與安全網判斷跟著走
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async (c: Child | null) => {
    if (!c) return;
    const [f, d, s, ls, t, iv] = await Promise.all([
      lastEvent(c.id, FEED_TYPES),
      lastEvent(c.id, DIAPER_TYPES),
      openEvent(c.id, 'sleep'),
      lastEvent(c.id, ['sleep']),
      listEvents(c.id, { from: startOfToday(), limit: 50 }),
      recentIntervalsMinutes(c.id, FEED_TYPES, NET_RECENT),
    ]);
    setLastFeed(f); setLastDiaper(d); setSleeping(s); setLastSleep(ls); setToday(t); setIntervals(iv);
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
    const id = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);

  const showToast = (t: ToastState) => {
    setToast(t);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 6000);
  };

  if (children === null) {
    return <View style={[styles.page, styles.center]}><ActivityIndicator color={palette.accent} /></View>;
  }

  if (!child) return <Welcome />;

  const d = daysSince(child.birthDate);
  const cd = correctedDays(child.birthDate, child.dueDate);
  const by = async () => deviceId();
  const quick = async (fn: () => Promise<Event | null | undefined>, text: string, undoable = true) => {
    const ev = await fn();
    await refresh(child);
    showToast({ text, eventId: undoable && ev ? ev.id : undefined });
  };
  const undo = async () => {
    if (toast?.eventId) await deleteEvent(toast.eventId);
    setToast(null);
    await refresh(child);
  };

  // 安全網提醒：距上次餵奶超過上界，且還沒按「稍後」。
  const feedSince = lastFeed ? minutesAgo(lastFeed.startAt) : null;
  const upper = safetyNetUpperBound(intervals, FEED_PRIOR_MIN, FEED_CAP_MIN);
  const showNet = d < 365 && feedSince !== null && feedSince > upper && now > netDismissedUntil;
  const netLog = async () => {
    if (child.feedingMethod === 'breast') {
      await quick(() => by().then((b) => logBreastFeed(child.id, 'both', undefined, 'reminder', b)), '已記錄 親餵');
    } else {
      router.push({ pathname: '/record/bottle', params: { childId: child.id, reason: 'reminder' } });
    }
  };

  const subtitle = `${ageLabel(d)}${cd !== null ? ` · 矯正 ${ageLabel(cd)}` : ''} · 第 ${d + 1} 天`;

  return (
    <View style={styles.page}>
      <TopBar title={child.nickname} subtitle={subtitle} right={<IconButton name={night ? 'sun' : 'moon'} label={night ? '切換日間模式' : '切換夜間模式'} onPress={() => setMode(night ? 'day' : 'night')} />} />
      <Screen>
        <View style={styles.tiles}>
          <Tile k="餵奶" icon="droplet" v={lastFeed ? sinceShort(lastFeed.startAt) : '尚無紀錄'} s={lastFeed ? `${hhmm(lastFeed.startAt)} ${typeLabel(lastFeed.type)} ${eventSummary(lastFeed.type, lastFeed.payload, lastFeed.startAt)}` : undefined} onPress={() => router.push({ pathname: '/record/timeline', params: { childId: child.id } })} />
          <Tile k="尿布" icon="layers" v={lastDiaper ? sinceShort(lastDiaper.startAt) : '尚無紀錄'} s={lastDiaper ? `${hhmm(lastDiaper.startAt)} ${typeLabel(lastDiaper.type)}` : undefined} onPress={() => router.push({ pathname: '/record/timeline', params: { childId: child.id } })} />
          {sleeping ? (
            <Tile k="睡眠中" icon="moon" on v={durationLabel(sleeping.startAt)} s={`${hhmm(sleeping.startAt)} 睡著`} onPress={() => router.push({ pathname: '/record/timeline', params: { childId: child.id } })} />
          ) : (
            <Tile k="上次睡眠" icon="moon" v={lastSleep?.endAt ? durationLabel(lastSleep.startAt, lastSleep.endAt) : '尚無紀錄'} s={lastSleep?.endAt ? `${hhmm(lastSleep.endAt)} 醒來` : undefined} onPress={() => router.push({ pathname: '/record/timeline', params: { childId: child.id } })} />
          )}
        </View>

        {showNet && lastFeed ? (
          <Banner title={`距上次餵奶已 ${durationLabel(lastFeed.startAt)}，比平常久`}>
            <Text style={styles.p}>寶寶醒著嗎？有沒有找奶的樣子？</Text>
            <Text style={styles.muted}>依據最近 {intervals.length} 筆紀錄的間隔。只提醒這一次，不是時刻表。</Text>
            <View style={styles.grid}>
              <View style={{ flex: 1 }}><PrimaryButton label="記一筆餵奶" onPress={netLog} /></View>
              <View style={{ flex: 1 }}><GhostButton label="還在睡，稍後" onPress={() => setNetDismissedUntil(Date.now() + 30 * 60000)} /></View>
            </View>
          </Banner>
        ) : null}

        <SafetyBox title={`安全內容 ${safetyCards().length} 條`} sub="安全睡眠、發燒、噎食⋯ 離線可讀，無法關閉" onPress={() => router.push('/cards')} />

        <Text style={styles.h2}>餵食</Text>
        <View style={styles.grid}>
          <Big label="親餵 左" sub="一鍵記錄" icon="droplet" onPress={() => quick(() => by().then((b) => logBreastFeed(child.id, 'L', undefined, 'cue', b)), '已記錄 親餵 左')} />
          <Big label="親餵 右" sub="一鍵記錄" icon="droplet" onPress={() => quick(() => by().then((b) => logBreastFeed(child.id, 'R', undefined, 'cue', b)), '已記錄 親餵 右')} />
          <Big label="瓶餵" sub="輸入 ml" icon="coffee" onPress={() => router.push({ pathname: '/record/bottle', params: { childId: child.id } })} />
          <Big label="副食品" sub="吃了什麼" icon="pie-chart" onPress={() => router.push({ pathname: '/record/solid', params: { childId: child.id } })} />
        </View>

        <Text style={styles.h2}>尿布</Text>
        <View style={styles.grid}>
          <Big third label="濕" sub="一鍵記錄" onPress={() => quick(() => by().then((b) => logDiaper(child.id, 'wet', b)), '已記錄 濕尿布')} />
          <Big third label="便" sub="一鍵記錄" onPress={() => quick(() => by().then((b) => logDiaper(child.id, 'dirty', b)), '已記錄 便便')} />
          <Big third label="濕＋便" sub="一鍵記錄" onPress={() => quick(() => by().then((b) => logDiaper(child.id, 'both', b)), '已記錄 濕＋便')} />
        </View>

        <Text style={styles.h2}>睡眠與健康</Text>
        <View style={styles.grid}>
          {sleeping ? (
            <Big label="醒了" sub={`已睡 ${durationLabel(sleeping.startAt)}`} icon="sun" warm onPress={() => quick(() => endSleep(child.id), '已記錄 醒了', false)} />
          ) : (
            <Big label="睡著了" sub="開始計時" icon="moon" onPress={() => quick(() => by().then((b) => startSleep(child.id, b)).then((r) => r.event), '已開始睡眠計時')} />
          )}
          <Big label="體溫" sub="數字與部位" icon="thermometer" onPress={() => router.push({ pathname: '/record/temperature', params: { childId: child.id } })} />
          <Big label="清醒趴臥" sub="幾分鐘" icon="user" onPress={() => router.push({ pathname: '/record/tummy', params: { childId: child.id } })} />
          <Big label="用藥" sub="只倒數間隔" icon="plus-circle" onPress={() => router.push({ pathname: '/record/medication', params: { childId: child.id } })} />
        </View>

        <Section title="今天" action={`全部 ${today.length} 筆`} onAction={() => router.push({ pathname: '/record/timeline', params: { childId: child.id } })} />
        <ListCard>
          {today.length === 0 ? <ListRow first main="今天還沒有紀錄。" mainColor={palette.ink3} /> : null}
          {today.slice(0, 6).map((e, i) => (
            <ListRow
              key={e.id}
              first={i === 0}
              time={hhmm(e.startAt)}
              main={`${typeLabel(e.type)} ${eventSummary(e.type, e.payload, e.startAt, e.endAt)}`.trim()}
              right={e.type === 'sleep' && !e.endAt ? <Badge label="進行中" tone="warm" /> : undefined}
              onPress={() => router.push({ pathname: '/record/timeline', params: { childId: child.id } })}
            />
          ))}
        </ListCard>
      </Screen>
      {toast ? <Toast text={toast.text} onUndo={toast.eventId ? undo : undefined} /> : null}
    </View>
  );
}

function FeatureRow({ icon, t, s }: { icon: 'clock' | 'shield' | 'lock'; t: string; s: string }) {
  const { styles, palette } = useTheme();
  return (
    <View style={styles.row}>
      <Icon name={icon} size={24} color={palette.accent} />
      <View style={styles.sp}>
        <Text style={[styles.p, { fontWeight: '700' }]}>{t}</Text>
        <Text style={styles.muted}>{s}</Text>
      </View>
    </View>
  );
}

// 歡迎（首頁空狀態）
function Welcome() {
  const { styles, palette } = useTheme();
  return (
    <Screen
      style={{ paddingTop: 96, paddingHorizontal: 24, gap: 20, flexGrow: 1, justifyContent: 'center' }}
      footer={
        <>
          <PrimaryButton label="建立孩子的檔案" onPress={() => router.push('/onboarding/child')} />
          <Text style={[styles.muted, { textAlign: 'center' }]}>備份匯入會在之後的版本提供。</Text>
        </>
      }
    >
      <View style={{ width: 72, height: 72, borderRadius: 24, backgroundColor: palette.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="shield" size={36} color={palette.accent} />
      </View>
      <View style={{ gap: 8 }}>
        <Text style={[styles.h1, { fontSize: 30 }]}>育兒秘書</Text>
        <Text style={[styles.body, { color: palette.ink2 }]}>記下孩子的吃、睡、尿布，在該提醒的時候提醒，衛教內容每一條都附政府或醫學會的原文來源。</Text>
      </View>
      <View style={{ gap: 14, marginTop: 8 }}>
        <FeatureRow icon="clock" t="三秒記一筆" s="單手、大按鈕，半夜也能用" />
        <FeatureRow icon="shield" t="安全內容永遠在" s="安全睡眠、發燒、噎食，離線可讀" />
        <FeatureRow icon="lock" t="資料只在這支手機" s="沒有帳號、沒有伺服器，不會上傳" />
      </View>
    </Screen>
  );
}
