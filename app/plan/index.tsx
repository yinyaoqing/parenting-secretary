import { useCallback, useState } from 'react';
import { View, Text } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { takeCalendarNotice } from '../../src/calendar/sync';
import { useChildren } from '../../src/ui/ChildContext';
import { setTemplateMode } from '../../src/db/schedule';
import { usePlan } from '../../src/timeline/usePlan';
import { ANCHOR_MONTH_CHOICES, EVENT_LABEL, anchorDate, anchorLabel, eventAnchorOptions, scheduleSub, KIND_LABEL, parseDate, type Anchor } from '../../src/timeline/plan';
import { ageLabel, daysSince } from '../../src/util/age';
import { fmtMonthDay } from '../../src/util/datetime';
import { useTheme } from '../../src/ui/useTheme';
import { Screen, TopBar, Card, SwitchRow, Section, ListCard, ListRow, Badge, GhostButton, PrimaryButton, Seg, Chip, Opt, Icon } from '../../src/ui/components';

// 行程與範本（設計稿 Schedule-List）。
// 作息範本的開關須先選起點：滿 N 個月（N ≥ 6）或三個 APP 自己知道的事件之一（擁有者決定 2026-10-06）。
export default function PlanList() {
  const { childId } = useLocalSearchParams<{ childId?: string }>();
  const { styles, palette } = useTheme();
  const { children, active } = useChildren();
  const child = children.find((c) => c.id === childId) ?? active;
  const plan = usePlan(child);
  const [picking, setPicking] = useState(false);
  const [calNotice, setCalNotice] = useState(false);
  useFocusEffect(useCallback(() => { takeCalendarNotice().then((v) => { if (v) setCalNotice(true); }); }, []));
  const [pickType, setPickType] = useState<'age' | 'event'>('age');
  const [pick, setPick] = useState<Anchor | null>(null);

  if (!child || !plan.facts) return <View style={styles.page}><TopBar back title="行程與範本" /></View>;
  const d = daysSince(child.birthDate);
  const routines = plan.items.filter((it) => it.kind === 'routine');
  const fixed = plan.items.filter((it) => it.kind !== 'routine');
  const facts = plan.facts;
  const anchor = plan.mode.anchor;
  const anchorAt = plan.anchorAt;
  const todayIso = new Date().toISOString().slice(0, 10);
  const pickDate = pick ? anchorDate(pick, facts) : null;

  const toggle = async (v: boolean) => {
    if (v && !anchor) { setPicking(true); return; }
    await setTemplateMode(child.id, { enabled: v, anchor });
    await plan.reload();
  };
  const confirmAnchor = async () => {
    if (!pick || !pickDate) return;
    await setTemplateMode(child.id, { enabled: true, anchor: pick });
    setPicking(false); setPick(null);
    await plan.reload();
  };

  const anchorSub = anchor
    ? anchorAt
      ? `起點：${anchorLabel(anchor)}，自 ${fmtMonthDay(parseDate(anchorAt))}起${anchorAt > todayIso ? '（尚未到起點，到那天才會畫出）' : ''}`
      : `起點：${anchorLabel(anchor)}（還不知道日期，${anchor.type === 'event' ? eventAnchorOptions(facts).find((o) => o.event === anchor.event)?.missing ?? '' : ''}）`
    : '用虛線畫在紀錄旁邊。參考，不是目標。要先選一個起點。';

  return (
    <View style={styles.page}>
      <TopBar back title="行程與範本" subtitle={`${child.nickname} · ${ageLabel(d)}`} />
      <Screen>
        <Card>
          <SwitchRow title="在時間軸顯示範本" sub={anchorSub} value={plan.mode.enabled && !!anchor} onChange={toggle} />
          {anchor && !picking ? <GhostButton small plain label="更改起點" tone="accent" onPress={() => { setPicking(true); setPickType(anchor.type); setPick(anchor); }} /> : null}
        </Card>

        {picking ? (
          <Card accent style={{ gap: 10 }}>
            <Text style={[styles.p, { fontWeight: '700' }]}>範本從什麼時候開始？</Text>
            <Text style={styles.muted}>選一個月齡或一件事。起點之前的日子不畫範本；0 到 6 個月不排作息範本。</Text>
            <Seg<'age' | 'event'> label="起點類型" value={pickType} onChange={(k) => { setPickType(k); setPick(null); }} options={[{ key: 'age', label: '月齡' }, { key: 'event', label: '事件' }]} />
            {pickType === 'age' ? (
              <View style={styles.chips}>
                {ANCHOR_MONTH_CHOICES.map((m) => <Chip key={m} sm label={`滿 ${m} 個月`} on={pick?.type === 'age' && pick.months === m} onPress={() => setPick({ type: 'age', months: m })} />)}
              </View>
            ) : (
              <View style={{ gap: 8 }}>
                {eventAnchorOptions(facts).map((o) => (
                  <Opt key={o.event} label={EVENT_LABEL[o.event]} sub={o.date ? `${fmtMonthDay(parseDate(o.date))}` : o.missing} on={pick?.type === 'event' && pick.event === o.event}
                    onPress={() => (o.date ? setPick({ type: 'event', event: o.event }) : router.push({ pathname: '/child/[id]', params: { id: child.id } }))} />
                ))}
              </View>
            )}
            {pick && pickDate ? <Text style={styles.muted}>範本自 {fmtMonthDay(parseDate(pickDate))}起畫在時間軸上。</Text> : null}
            <View style={styles.grid}>
              <View style={{ flex: 1 }}><PrimaryButton label="確定" onPress={confirmAnchor} disabled={!pick || !pickDate} /></View>
              <View style={{ flex: 1 }}><GhostButton label="取消" onPress={() => { setPicking(false); setPick(null); }} /></View>
            </View>
          </Card>
        ) : null}

        <Section title="每天 · 我的作息範本" action={anchor ? '從這週產生' : undefined} onAction={() => router.push({ pathname: '/plan/derive', params: { childId: child.id } })} />
        {anchor ? (
          <ListCard>
            {routines.length === 0 ? <ListRow first main="還沒有範本" sub="手動新增，或從這週的睡眠紀錄產生" mainColor={palette.ink3} /> : null}
            {routines.map((it, i) => (
              <ListRow key={it.id} first={i === 0} time={it.time} main={it.title} sub={[scheduleSub(it), it.templateSource === 'derived' ? '從紀錄產生' : null].filter(Boolean).join(' · ')} chevron
                onPress={() => router.push({ pathname: '/plan/edit', params: { childId: child.id, id: it.id } })} />
            ))}
            <ListRow main="新增範本" mainColor={palette.accent} onPress={() => router.push({ pathname: '/plan/edit', params: { childId: child.id, kind: 'routine' } })} />
          </ListCard>
        ) : (
          <Card><Text style={styles.muted}>打開上面的開關、選好起點後，才能建立作息範本。範本只能自己建立或從自己的紀錄產生，APP 不提供時刻表。</Text></Card>
        )}
        {d < 365 ? <Text style={styles.muted}>0 到 6 個月餵食依需求、每天約 8 到 12 次（國健署），範本不排餵奶時間，餵食提醒維持安全網。</Text> : null}

        <Section title="每週 · 固定行程" />
        <ListCard>
          {fixed.length === 0 ? <ListRow first main="還沒有固定行程" sub="托嬰、親子館、回診復健、課程、才藝補習、服藥" mainColor={palette.ink3} /> : null}
          {fixed.map((it, i) => (
            <ListRow key={it.id} first={i === 0} main={it.title} sub={scheduleSub(it)} right={<Badge label={KIND_LABEL[it.kind]} tone="gray" />} chevron
              onPress={() => router.push({ pathname: '/plan/edit', params: { childId: child.id, id: it.id } })} />
          ))}
        </ListCard>
        <GhostButton label="新增行程" icon="plus" tone="accent" onPress={() => router.push({ pathname: '/plan/edit', params: { childId: child.id } })} />

        <Card style={{ backgroundColor: palette.accentSoft, borderColor: palette.accent }}>
          <View style={[styles.row, { alignItems: 'flex-start', gap: 10 }]}>
            <Icon name="calendar" size={22} color={palette.accent} />
            <View style={styles.sp}>
              <Text style={[styles.p, { fontWeight: '700' }]}>上學以後，這張表就是課表</Text>
              <Text style={[styles.muted, { color: palette.ink2 }]}>同一種行程：名稱、星期、時間、時長、地點、提前提醒。幼兒園作息、國小課表、補習班都放這裡，時間軸自動畫出來。</Text>
            </View>
          </View>
        </Card>
        {calNotice ? <Card warm><Text style={[styles.muted, { color: palette.ink2 }]}>手機裡的「育兒秘書」行事曆被刪掉了，所以所有行程的行事曆同步都已關閉，改回由 APP 發提前提醒。要再同步，到行程編輯頁打開。</Text></Card> : null}
        <Text style={styles.muted}>提前提醒會發通知（設定 › 提醒可關閉）。每筆行程可以在編輯頁打開「同步到手機行事曆」。行程會跟著交接傳給另一支手機，行事曆開關不會。</Text>
      </Screen>
    </View>
  );
}
