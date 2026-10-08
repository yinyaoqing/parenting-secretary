import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { addEvent, deleteEvent, lastEvent, listEvents, openEvent, recentIntervalsMinutes } from '../../src/db/events';
import { permissionStatus, requestPermission, fatigueToAsk, KIND_NAME, KIND_SETTING } from '../../src/notify/scheduler';
import type { NotifyKind } from '../../src/notify/plan';
import { getCheckIns, isPaused, markInvitation, seenInvitation } from '../../src/caregiver/store';
import { invitationKey, wantsSupport } from '../../src/caregiver/resources';
import { getSetting, setSetting } from '../../src/db/repo';
import { todayCard, dismissToday } from '../../src/encouragement/today';
import { resolveHome, HOME_KEYS, type HomeKey } from '../../src/home/buttons';
import { FEATURES } from '../../src/release/profile';
import { TodayCard } from '../../src/encouragement/TodayCard';
import type { EncourageCard } from '../../src/encouragement/pick';
import { OUTCOMES, TOILET_MAX_DAYS, TOILET_MIN_DAYS, TOILET_TASK, taskStatus, type Outcome, type TaskStatus } from '../../src/tasks/toilet';
import { useChildren } from '../../src/ui/ChildContext';
import { ChildTitle } from '../../src/ui/ChildTitle';
import { logBreastFeed, logDiaper, startSleep, endSleep, safetyNetUpperBound, FEED_TYPES, FEED_CAP_MIN, FEED_PRIOR_MIN, NET_RECENT } from '../../src/records/quick';
import { deviceId } from '../../src/db/device';
import type { Child, Event } from '../../src/db/types';
import { ageLabel, correctedDays, daysSince } from '../../src/util/age';
import { eventSummary, hhmm, durationLabel, startOfToday, typeLabel } from '../../src/util/format';
import { addDays, minutesAgo, sinceShort, toIsoDate } from '../../src/util/datetime';
import { useTheme } from '../../src/ui/useTheme';
import { safetyCards } from '../../src/content/loader';
import { Screen, TopBar, IconButton, Tile, Big, SafetyBox, Section, ListCard, ListRow, Toast, Banner, PrimaryButton, GhostButton, Icon, Card } from '../../src/ui/components';
import { Hero, Thumb } from '../../src/ui/art';

const DIAPER_TYPES = ['diaper.wet', 'diaper.dirty', 'diaper.both'];
// 安全網（規劃 v0.4 第 6.1 節）：上界 = 最近間隔第 90 百分位與安全上限取小；參數在 records/quick.ts，與本地通知共用。

type ToastState = { text: string; eventId?: string };

export default function Home() {
  const { styles, palette, night, setMode } = useTheme();
  const { active: child, loaded, reload } = useChildren();
  const [lastFeed, setLastFeed] = useState<Event | null>(null);
  const [lastDiaper, setLastDiaper] = useState<Event | null>(null);
  const [sleeping, setSleeping] = useState<Event | null>(null);
  const [lastSleep, setLastSleep] = useState<Event | null>(null);
  const [today, setToday] = useState<Event[]>([]);
  const [intervals, setIntervals] = useState<number[]>([]);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [netDismissedUntil, setNetDismissedUntil] = useState(0);
  const [toilet, setToilet] = useState<TaskStatus>({ state: 'none' });
  const [potty, setPotty] = useState(false);
  const [paused, setPaused] = useState(false);
  const [lowMood, setLowMood] = useState(false);
  const [invite, setInvite] = useState<'2w' | '6w' | null>(null);
  const [askNotify, setAskNotify] = useState(false);
  const [today1, setToday1] = useState<EncourageCard | null>(null);
  const [fatigue, setFatigue] = useState<NotifyKind | null>(null);
  const [homeOv, setHomeOv] = useState<Partial<Record<HomeKey, string | null>>>({});
  const [now, setNow] = useState(() => Date.now()); // 每分鐘更新一次，讓「幾分前」與安全網判斷跟著走
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async (c: Child | null) => {
    if (!c) return;
    const [f, d, s, ls, t, iv, tk] = await Promise.all([
      lastEvent(c.id, FEED_TYPES),
      lastEvent(c.id, DIAPER_TYPES),
      openEvent(c.id, 'sleep'),
      lastEvent(c.id, ['sleep']),
      listEvents(c.id, { from: startOfToday(), limit: 50 }),
      recentIntervalsMinutes(c.id, FEED_TYPES, NET_RECENT),
      listEvents(c.id, { types: ['task.start', 'task.pause', 'task.complete'], limit: 20 }),
    ]);
    setLastFeed(f); setLastDiaper(d); setSleeping(s); setLastSleep(ls); setToday(t); setIntervals(iv); setToilet(taskStatus(tk));
    const [p, ci] = await Promise.all([isPaused(), getCheckIns(3)]);
    setPaused(p);
    setLowMood(wantsSupport(ci, [0, 1, 2].map((i) => toIsoDate(addDays(new Date(), -i)))));
    const k = invitationKey(daysSince(c.birthDate));
    setInvite(k && !(await seenInvitation(c.id, k)) ? k : null);
    setAskNotify(daysSince(c.birthDate) < 365 && (await permissionStatus()) === 'undetermined');
    setToday1(p ? null : (await todayCard(c))?.card ?? null);
    setFatigue(p ? null : await fatigueToAsk());
    const ov = await Promise.all(HOME_KEYS.map((k) => getSetting(`home:${k}`)));
    setHomeOv(Object.fromEntries(HOME_KEYS.map((k, i) => [k, ov[i]])));
  }, []);

  // 回到首頁時重讀孩子清單（建檔、交接匯入、封存後都可能變），並刷新目前孩子的狀態。
  useFocusEffect(useCallback(() => { reload(); }, [reload]));
  const childId = child?.id;
  useEffect(() => {
    if (!child) return;
    const t = setTimeout(() => { refresh(child); }, 0); // 下一個 tick 再抓，避免在 effect 內同步 setState
    return () => clearTimeout(t);
  }, [childId, child, refresh]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);

  const showToast = (t: ToastState) => {
    setToast(t);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 6000);
  };

  if (!loaded) {
    return <View style={[styles.page, styles.center]}><ActivityIndicator color={palette.accent} /></View>;
  }

  if (!child) return <Welcome />;

  const d = daysSince(child.birthDate);
  const cd = correctedDays(child.birthDate, child.dueDate);
  // 3 歲以上：第一階段只做 0 到 3 歲，首頁精簡成睡眠、體溫、用藥（擁有者決定）。
  const older = d >= 3 * 365;
  const name = child.nickname;
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
  // 暫停模式：停掉所有提醒與推送內容（住院、喪慟、暫時交由機構照顧）；紀錄與安全內容入口照常。
  const showNet = !paused && d < 365 && feedSince !== null && feedSince > upper && now > netDismissedUntil;
  const netLog = async () => {
    if (child.feedingMethod === 'breast') {
      await quick(() => by().then((b) => logBreastFeed(child.id, 'both', undefined, 'reminder', b)), '已記錄 親餵');
    } else {
      router.push({ pathname: '/record/bottle', params: { childId: child.id, reason: 'reminder' } });
    }
  };

  // 如廁訓練：滿 1 歲半到 6 歲顯示；夜間模式不顯示（擁有者決定，夜間首頁只留吃、睡、尿布）。
  const show = resolveHome(child.feedingMethod, d, homeOv);
  const showToilet = !paused && !night && d >= TOILET_MIN_DAYS && d < TOILET_MAX_DAYS && toilet.state !== 'done';
  const logPotty = async (o: Outcome, label: string) => {
    setPotty(false);
    await quick(async () => addEvent({ childId: child.id, type: 'task.attempt', payload: { task: TOILET_TASK, outcome: o }, recordedBy: await deviceId() }), `已記錄 ${name} 坐小馬桶：${label}`);
  };

  // 兩週內只顯示「第 N 天」，避免「5 天 · 第 6 天」這種重複
  const subtitle = d < 14 ? `第 ${d + 1} 天${cd !== null ? ` · 矯正 ${ageLabel(cd)}` : ''}` : `${ageLabel(d)}${cd !== null ? ` · 矯正 ${ageLabel(cd)}` : ''} · 第 ${d + 1} 天`;
  // 第一天空狀態：完全沒有紀錄時，用小熊卡取代狀態格與今天列表。
  const firstDay = !lastFeed && !lastDiaper && !lastSleep && today.length === 0;

  return (
    <View style={styles.page}>
      <TopBar title={<ChildTitle subtitle={subtitle} />} sky skyRight={204} right={
        <View style={[styles.row, { gap: 8 }]}>
          <IconButton name="search" label="問問看，搜尋官方內容" onPress={() => router.push('/search')} />
          <IconButton name="heart" label="照顧好自己" onPress={() => router.push('/caregiver')} />
          <IconButton name="share-2" label="同步與交接" onPress={() => router.push('/sync')} />
          <IconButton name={night ? 'sun' : 'moon'} label={night ? '切換日間模式' : '切換夜間模式'} onPress={() => setMode(night ? 'day' : 'night')} />
        </View>
      } />
      <Screen>
        {firstDay ? (
          <Card style={{ alignItems: 'center', paddingTop: 18, paddingBottom: 20, gap: 8 }}>
            <Thumb art="bear" size={132} radius={28} />
            <Text style={[styles.p, { fontWeight: '700', fontSize: 18, marginTop: 4 }]}>今天還沒有紀錄</Text>
            <Text style={[styles.muted, { textAlign: 'center' }]}>按下面任何一顆按鈕就開始。記錯了可以復原，時間也能事後修正。</Text>
          </Card>
        ) : (
        <View style={styles.tiles}>
          {older ? null : <Tile k="餵奶" icon="droplet" v={lastFeed ? sinceShort(lastFeed.startAt) : '尚無紀錄'} s={lastFeed ? `${hhmm(lastFeed.startAt)} ${typeLabel(lastFeed.type)} ${eventSummary(lastFeed.type, lastFeed.payload, lastFeed.startAt)}` : undefined} onPress={() => router.push({ pathname: '/record/timeline', params: { childId: child.id } })} />}
          {older ? null : <Tile k="尿布" icon="layers" v={lastDiaper ? sinceShort(lastDiaper.startAt) : '尚無紀錄'} s={lastDiaper ? `${hhmm(lastDiaper.startAt)} ${typeLabel(lastDiaper.type)}` : undefined} onPress={() => router.push({ pathname: '/record/timeline', params: { childId: child.id } })} />}
          {sleeping ? (
            <Tile k="睡眠中" icon="moon" on v={durationLabel(sleeping.startAt)} s={`${hhmm(sleeping.startAt)} 睡著`} onPress={() => router.push({ pathname: '/record/timeline', params: { childId: child.id } })} />
          ) : (
            <Tile k="上次睡眠" icon="moon" v={lastSleep?.endAt ? durationLabel(lastSleep.startAt, lastSleep.endAt) : '尚無紀錄'} s={lastSleep?.endAt ? `${hhmm(lastSleep.endAt)} 醒來` : undefined} onPress={() => router.push({ pathname: '/record/timeline', params: { childId: child.id } })} />
          )}
        </View>
        )}

        {showNet && lastFeed ? (
          <Banner title={`距上次餵奶已 ${durationLabel(lastFeed.startAt)}`} art={<Thumb art="night" size={72} radius={16} />} body="比平常久。寶寶醒著嗎？有沒有找奶的樣子？">
            <Text style={styles.muted}>依據最近 {intervals.length} 筆紀錄的間隔。只提醒這一次，不是時刻表。</Text>
            <View style={styles.grid}>
              <View style={{ flex: 1 }}><PrimaryButton label="記一筆餵奶" onPress={netLog} /></View>
              <View style={{ flex: 1 }}><GhostButton label="還在睡，稍後" onPress={() => setNetDismissedUntil(Date.now() + 30 * 60000)} /></View>
            </View>
          </Banner>
        ) : null}

        {!paused && !night && today1 ? <TodayCard card={today1} onDismiss={async () => { setToday1(null); await dismissToday(child.id); }} /> : null}

        {paused ? (
          <Card style={{ gap: 8 }}>
            <Text style={[styles.p, { fontWeight: '700' }]}>暫停模式中</Text>
            <Text style={styles.muted}>提醒與推送內容都已停止。紀錄照常可以用，隨時恢復。</Text>
            <GhostButton small label="恢復" tone="accent" onPress={async () => { await setSetting('pausedUntil', ''); setPaused(false); }} />
          </Card>
        ) : null}

        {!paused && (lowMood || invite) ? (
          <Card warm onPress={async () => { if (invite) { await markInvitation(child.id, invite); setInvite(null); } router.push('/caregiver'); }}>
            <Text style={[styles.p, { fontWeight: '700', color: palette.warm }]}>{lowMood ? '最近好像很辛苦' : invite === '2w' ? '產後兩週了，你還好嗎？' : '產後六週了，也照顧一下自己'}</Text>
            <Text style={[styles.muted, { color: palette.ink2 }]}>{lowMood ? '照顧孩子的人也需要被照顧。這裡有可以直接撥打的專線。' : '10 秒記下今天的狀態，或看看可以找誰聊聊。只出現這一次。'}</Text>
          </Card>
        ) : null}

        {fatigue ? (
          <Card style={{ gap: 10 }}>
            <Text style={[styles.p, { fontWeight: '700' }]}>{KIND_NAME[fatigue]}提醒連續兩次你都沒點開</Text>
            <Text style={styles.muted}>可能你已經有自己的節奏。要不要先關掉這種提醒？紀錄照常，隨時可以在設定打開。這個問題只問一次。</Text>
            <View style={styles.grid}>
              <View style={{ flex: 1 }}><GhostButton label="先關掉" onPress={async () => { await setSetting(KIND_SETTING[fatigue], '0'); await setSetting(`notify:asked:${fatigue}`, '1'); setFatigue(null); }} /></View>
              <View style={{ flex: 1 }}><GhostButton label="繼續提醒" tone="accent" onPress={async () => { await setSetting(`notify:asked:${fatigue}`, '1'); setFatigue(null); }} /></View>
            </View>
          </Card>
        ) : null}

        {!paused && askNotify && !(lowMood || invite) && !fatigue ? (
          <Card style={{ gap: 8 }}>
            <Text style={[styles.p, { fontWeight: '700' }]}>允許通知，APP 關著也能提醒</Text>
            <Text style={styles.muted}>距上次餵奶比平常久、用藥間隔到了、行程快到時各提醒一次。可以在設定逐項關閉。</Text>
            <View style={styles.grid}>
              <View style={{ flex: 1 }}><PrimaryButton label="允許" onPress={async () => { await requestPermission(); setAskNotify(false); }} /></View>
              <View style={{ flex: 1 }}><GhostButton label="之後再說" onPress={() => setAskNotify(false)} /></View>
            </View>
          </Card>
        ) : null}

        <SafetyBox title={`安全內容 ${safetyCards().length} 條`} sub="安全睡眠、發燒、噎食⋯ 離線可讀，無法關閉" onPress={() => router.push('/cards')} />

        {show.breast || show.bottle || show.pump || show.solid ? (
          <>
            <Text style={styles.h2}>餵食</Text>
            <View style={styles.grid}>
              {show.breast ? <Big label="親餵 左" sub="一鍵記錄" icon="droplet" onPress={() => quick(() => by().then((b) => logBreastFeed(child.id, 'L', undefined, 'cue', b)), `已記錄 ${name} 親餵 左`)} /> : null}
              {show.breast ? <Big label="親餵 右" sub="一鍵記錄" icon="droplet" onPress={() => quick(() => by().then((b) => logBreastFeed(child.id, 'R', undefined, 'cue', b)), `已記錄 ${name} 親餵 右`)} /> : null}
              {show.bottle ? <Big label="瓶餵" sub="輸入 ml" icon="coffee" onPress={() => router.push({ pathname: '/record/bottle', params: { childId: child.id } })} /> : null}
              {show.pump ? <Big label="擠奶" sub="量與庫存" icon="archive" onPress={() => router.push({ pathname: '/record/pump', params: { childId: child.id } })} /> : null}
              {show.solid ? <Big label="副食品" sub="吃了什麼" icon="pie-chart" onPress={() => router.push({ pathname: '/record/solid', params: { childId: child.id } })} /> : null}
            </View>
          </>
        ) : null}

        {show.diaper ? (
          <>
            <Text style={styles.h2}>尿布</Text>
            <View style={styles.grid}>
              <Big third label="濕" sub="一鍵記錄" onPress={() => quick(() => by().then((b) => logDiaper(child.id, 'wet', b)), `已記錄 ${name} 濕尿布`)} />
              <Big third label="便" sub="一鍵記錄" onPress={() => quick(() => by().then((b) => logDiaper(child.id, 'dirty', b)), `已記錄 ${name} 便便`)} />
              <Big third label="濕＋便" sub="一鍵記錄" onPress={() => quick(() => by().then((b) => logDiaper(child.id, 'both', b)), `已記錄 ${name} 濕＋便`)} />
            </View>
          </>
        ) : null}

        <Text style={styles.h2}>{FEATURES.healthRecords ? '睡眠與健康' : '睡眠與其他'}</Text>
        <View style={styles.grid}>
          {sleeping ? (
            <Big label="醒了" sub={`已睡 ${durationLabel(sleeping.startAt)}`} icon="sun" warm onPress={() => quick(() => endSleep(child.id), `已記錄 ${name} 醒了`, false)} />
          ) : (
            <Big label="睡著了" sub="開始計時" icon="moon" onPress={() => quick(() => by().then((b) => startSleep(child.id, b)).then((r) => r.event), `已開始 ${name} 的睡眠計時`)} />
          )}
          {show.temp ? <Big label="體溫" sub="數字與部位" icon="thermometer" onPress={() => router.push({ pathname: '/record/temperature', params: { childId: child.id } })} /> : null}
          {show.tummy ? <Big label="清醒趴臥" sub="幾分鐘" icon="user" onPress={() => router.push({ pathname: '/record/tummy', params: { childId: child.id } })} /> : null}
          {show.med ? <Big label="用藥" sub="只倒數間隔" icon="plus-circle" onPress={() => router.push({ pathname: '/record/medication', params: { childId: child.id } })} /> : null}
          {show.timer ? <Big label="倒數提醒" sub="你寫標題，到時通知" icon="clock" onPress={() => router.push({ pathname: '/record/timer', params: { childId: child.id } })} /> : null}
          <Big label="更多紀錄" sub={FEATURES.healthRecords ? '生長、症狀、就醫⋯' : '生長、日記'} icon="more-horizontal" onPress={() => router.push({ pathname: '/record/more', params: { childId: child.id } })} />
        </View>

        {showToilet ? (
          <>
            <Section title="如廁訓練" action={toilet.state === 'active' ? '進度與做法' : undefined} onAction={() => router.push({ pathname: '/task/toilet', params: { childId: child.id } })} />
            {toilet.state === 'active' ? (
              potty ? (
                <Card style={{ gap: 10 }}>
                  <Text style={[styles.p, { fontWeight: '700' }]}>這次坐小馬桶</Text>
                  <View style={styles.grid}>
                    {OUTCOMES.map((o) => <Big key={o.key} third label={o.label} onPress={() => logPotty(o.key, o.label)} />)}
                  </View>
                  <GhostButton small plain label="取消" onPress={() => setPotty(false)} />
                </Card>
              ) : (
                <View style={styles.grid}>
                  <Big label="坐小馬桶" sub="記下結果" icon="check-circle" onPress={() => setPotty(true)} />
                </View>
              )
            ) : (
              <ListCard>
                <ListRow first main={toilet.state === 'paused' ? '如廁訓練（休息中）' : '如廁訓練'} sub={toilet.state === 'paused' ? '準備好了再試一次' : '國健署的準備度與做法，開始後可以一鍵記錄'} chevron onPress={() => router.push({ pathname: '/task/toilet', params: { childId: child.id } })} />
              </ListCard>
            )}
          </>
        ) : null}

        {firstDay ? null : (
          <ListCard>
            <ListRow first icon="list" main={`今天 ${today.length} 筆`} sub={today[0] ? `最近：${hhmm(today[0].startAt)} ${typeLabel(today[0].type)} ${eventSummary(today[0].type, today[0].payload, today[0].startAt, today[0].endAt)}`.trim() : '今天還沒有紀錄'} chevron onPress={() => router.push({ pathname: '/record/timeline', params: { childId: child.id } })} />
          </ListCard>
        )}
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
      style={{ paddingTop: 64, paddingHorizontal: 24, gap: 18, flexGrow: 1, justifyContent: 'center' }}
      footer={
        <>
          <PrimaryButton label="建立孩子的檔案" onPress={() => router.push('/onboarding/child')} />
          <GhostButton label="已有另一支手機的紀錄？先建檔再到設定交接" plain onPress={() => router.push('/onboarding/child')} small />
        </>
      }
    >
      <Hero art="crib" height={230} radius={28} />
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
