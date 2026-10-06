import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useChildren } from '../../src/ui/ChildContext';
import { deleteScheduleItem, getScheduleItem, getTemplateMode, saveScheduleItem } from '../../src/db/schedule';
import type { ScheduleItem, ScheduleKind } from '../../src/db/types';
import { KIND_LABEL, SIX_MONTHS_DAYS, hmToMin, minToHm, weekdayChar } from '../../src/timeline/plan';
import { daysSince } from '../../src/util/age';
import { fromIsoDate, toIsoDate } from '../../src/util/datetime';
import { useTheme } from '../../src/ui/useTheme';
import { Screen, SheetHeader, Field, Input, Chip, Card, PrimaryButton, GhostButton, Badge } from '../../src/ui/components';
import { DatePick } from '../../src/ui/DatePick';

const KINDS: ScheduleKind[] = ['routine', 'care', 'visit', 'class', 'activity', 'medication'];
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DURATIONS = [0, 15, 30, 45, 50, 60, 90, 120];
const LEADS: [string, number][] = [['不提醒', 0], ['15 分', 15], ['30 分', 30], ['1 小時', 60], ['前一天', 1440]];
const ROUTINE_TITLES_YOUNG = ['小睡', '夜間睡眠'];
const ROUTINE_TITLES = ['小睡', '夜間睡眠', '早餐', '午餐', '晚餐', '點心', '洗澡', '就寢'];

const timeToDate = (hm: string) => { const d = new Date(); d.setHours(Math.floor(hmToMin(hm) / 60), hmToMin(hm) % 60, 0, 0); return d; };

// 新增或編輯行程（設計稿 Schedule-Add）。作息範本需要先在行程清單選起點。
export default function EditPlan() {
  const { childId, id, kind: kindParam } = useLocalSearchParams<{ childId: string; id?: string; kind?: ScheduleKind }>();
  const { styles, palette } = useTheme();
  const { children, active } = useChildren();
  const child = children.find((c) => c.id === childId) ?? active;
  const [orig, setOrig] = useState<ScheduleItem | null>(null);
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<ScheduleKind>(kindParam && KINDS.includes(kindParam) ? kindParam : 'care');
  const [weekdays, setWeekdays] = useState<number[]>(kindParam === 'routine' ? [0, 1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5]);
  const [time, setTime] = useState('09:00');
  const [duration, setDuration] = useState('60');
  const [period, setPeriod] = useState('');
  const [location, setLocation] = useState('');
  const [lead, setLead] = useState(kindParam === 'routine' ? 0 : 30);
  const [validFrom, setValidFrom] = useState<Date | null>(new Date());
  const [validTo, setValidTo] = useState<Date | null>(null);
  const [hasAnchor, setHasAnchor] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!child) return;
    getTemplateMode(child.id).then((m) => setHasAnchor(!!m.anchor));
  }, [child]);

  useEffect(() => {
    if (!id) return;
    getScheduleItem(id).then((it) => {
      if (!it) return;
      setOrig(it); setTitle(it.title); setKind(it.kind); setWeekdays(it.weekdays); setTime(it.time);
      setDuration(it.durationMinutes ? String(it.durationMinutes) : ''); setPeriod(it.period ? String(it.period) : '');
      setLocation(it.location ?? ''); setLead(it.leadMinutes);
      setValidFrom(it.validFrom ? fromIsoDate(it.validFrom) : null); setValidTo(it.validTo ? fromIsoDate(it.validTo) : null);
    });
  }, [id]);

  if (!child) return null;
  const young = daysSince(child.birthDate) < SIX_MONTHS_DAYS;
  const routineBlocked = kind === 'routine' && !hasAnchor && !orig;
  const dur = Number(duration) || 0;

  const save = async () => {
    const t = title.trim();
    if (!t) return setErr('請輸入名稱');
    if (weekdays.length === 0) return setErr('請選擇星期');
    if (routineBlocked) return setErr('要先在行程清單打開範本並選起點');
    if (kind === 'routine' && young && /餵|奶|喝/.test(t)) return setErr('0 到 6 個月餵食依需求，範本不排餵奶時間');
    if (validFrom && validTo && validTo < validFrom) return setErr('結束日期早於開始日期');
    await saveScheduleItem({
      childId: child.id, title: t, kind, weekdays, time, durationMinutes: dur || undefined,
      location: location.trim() || undefined, leadMinutes: lead, note: orig?.note, syncToDeviceCalendar: false,
      validFrom: validFrom ? toIsoDate(validFrom) : undefined, validTo: validTo ? toIsoDate(validTo) : undefined,
      period: kind === 'class' && Number(period) > 0 ? Number(period) : undefined,
      templateSource: kind === 'routine' ? (orig?.templateSource ?? 'user') : undefined,
    }, orig?.id);
    router.back();
  };

  const remove = async () => {
    if (!orig) return;
    await deleteScheduleItem(orig.id);
    router.back();
  };

  return (
    <View style={styles.page}>
      <SheetHeader title={orig ? (kind === 'routine' ? '編輯範本' : '編輯行程') : kind === 'routine' ? '新增範本' : '新增行程'} subtitle={kind === 'routine' ? '參考，不是目標' : undefined} />
      <Screen footer={
        <>
          <PrimaryButton label="儲存" onPress={save} disabled={routineBlocked} />
          {orig ? (confirmDel ? (
            <View style={styles.grid}>
              <View style={{ flex: 1 }}><GhostButton label="確定刪除" tone="danger" icon="trash-2" onPress={remove} /></View>
              <View style={{ flex: 1 }}><GhostButton label="取消" onPress={() => setConfirmDel(false)} /></View>
            </View>
          ) : <GhostButton label="刪除" tone="danger" icon="trash-2" onPress={() => setConfirmDel(true)} />) : null}
        </>
      }>
        <Field label="類型">
          <View style={styles.chips}>
            {KINDS.map((k) => <Chip key={k} sm label={KIND_LABEL[k]} on={kind === k} onPress={() => { setKind(k); setErr(null); if (k === 'routine') { setWeekdays([0, 1, 2, 3, 4, 5, 6]); setLead(0); } }} />)}
          </View>
        </Field>
        {routineBlocked ? (
          <Card warm><Text style={[styles.muted, { color: palette.ink2 }]}>作息範本要先在「行程與範本」打開開關，選一個起點：滿 6 個月以上，或開始上托嬰、副食品開始、入園或入學。</Text></Card>
        ) : null}

        <Field label="名稱">
          <Input value={title} onChangeText={setTitle} placeholder={kind === 'routine' ? '例如：小睡' : kind === 'class' ? '例如：國語' : '例如：早療復健'} accessibilityLabel="名稱" />
          {kind === 'routine' ? (
            <View style={styles.chips}>{(young ? ROUTINE_TITLES_YOUNG : ROUTINE_TITLES).map((s) => <Chip key={s} sm label={s} on={title === s} onPress={() => setTitle(s)} />)}</View>
          ) : null}
        </Field>

        <Field label="星期">
          <View style={styles.chips}>
            {WEEK_ORDER.map((d) => <Chip key={d} label={weekdayChar(d)} a11yLabel={`星期${weekdayChar(d)}`} on={weekdays.includes(d)} onPress={() => setWeekdays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]))} />)}
          </View>
        </Field>

        <View style={[styles.row, { alignItems: 'flex-start' }]}>
          <View style={styles.sp}><Field label="時間"><DatePick value={timeToDate(time)} mode="time" label="時間" onChange={(dt) => setTime(minToHm(dt.getHours() * 60 + dt.getMinutes()))} /></Field></View>
          {kind === 'class' ? <View style={{ width: 110 }}><Field label="節次"><Input value={period} onChangeText={(s) => setPeriod(s.replace(/\D/g, ''))} keyboardType="number-pad" placeholder="1" accessibilityLabel="節次" /></Field></View> : null}
        </View>

        <Field label="時長" hint={dur ? `到 ${minToHm(hmToMin(time) + dur)}` : '不設時長就是一個時間點'}>
          <View style={styles.chips}>{DURATIONS.map((m) => <Chip key={m} sm label={m ? (m < 60 ? `${m} 分` : m % 60 ? `${Math.floor(m / 60)} 時 ${m % 60} 分` : `${m / 60} 小時`) : '不設'} on={dur === m} onPress={() => setDuration(m ? String(m) : '')} />)}</View>
          <Input value={duration} onChangeText={(v) => setDuration(v.replace(/\D/g, ''))} keyboardType="number-pad" placeholder="其他分鐘數" accessibilityLabel="時長（分鐘）" />
        </Field>

        {kind !== 'routine' ? <Field label="地點（可留空）"><Input value={location} onChangeText={setLocation} accessibilityLabel="地點" /></Field> : null}

        <Field label="提前提醒" hint="到時間前發一則通知；可在設定 › 提醒關閉">
          <View style={styles.chips}>{LEADS.map(([l, m]) => <Chip key={l} sm label={l} on={lead === m} onPress={() => setLead(m)} />)}</View>
        </Field>

        <Card>
          <View style={styles.row}>
            <View style={styles.sp}>
              <Text style={[styles.p, { fontWeight: '700' }]}>同步到裝置行事曆</Text>
              <Text style={styles.muted}>由手機行事曆發通知。需要正式安裝版，Expo Go 測試版不支援。</Text>
            </View>
            <Badge label="即將推出" tone="gray" />
          </View>
        </Card>

        <View style={[styles.row, { alignItems: 'flex-start' }]}>
          <View style={styles.sp}><Field label="開始"><DatePick value={validFrom} mode="date" label="開始日期" placeholder="不限" onChange={setValidFrom} /></Field></View>
          <View style={styles.sp}>
            <Field label="結束（可留空）"><DatePick value={validTo} mode="date" label="結束日期" placeholder="不限" onChange={setValidTo} /></Field>
            {validTo ? <GhostButton small plain label="清除結束日期" onPress={() => setValidTo(null)} /> : null}
          </View>
        </View>
        {kind === 'medication' ? <Text style={styles.muted}>藥名與時間由你輸入，APP 不建議劑量。</Text> : null}
        {err ? <Text style={[styles.p, { color: palette.danger }]}>{err}</Text> : null}
      </Screen>
    </View>
  );
}
