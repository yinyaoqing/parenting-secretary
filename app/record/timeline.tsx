import { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { deleteEvent, listEvents } from '../../src/db/events';
import type { Event } from '../../src/db/types';
import { eventSummary, hhmm, typeLabel, durationLabel } from '../../src/util/format';
import { addDays, dayLabel, dayKeyOf, toIsoDate } from '../../src/util/datetime';
import { daysSince, ageLabel } from '../../src/util/age';
import { useChildren } from '../../src/ui/ChildContext';
import { useTheme } from '../../src/ui/useTheme';
import { Screen, TopBar, Chip, ListCard, ListRow, Badge, GhostButton, Card, Seg, IconButton, Banner } from '../../src/ui/components';
import { DayView, Legend } from '../../src/timeline/DayView';
import { WeekView } from '../../src/timeline/WeekView';
import { Timetable } from '../../src/timeline/Timetable';
import { usePlan } from '../../src/timeline/usePlan';
import { occurrencesOn, hmToMin, minToHm, type Occurrence } from '../../src/timeline/plan';

const REASON_LABEL: Record<string, string> = { cue: '看到飢餓訊號', schedule: '到時間了', reminder: 'APP 提醒', other: '其他' };
const DAYS_SHOWN = 5;
type View3 = 'list' | 'day' | 'week';

// 紀錄（設計稿 Timeline、Timeline-Day、Timeline-Week、School-Day、School-Week）：列表、時間軸、一週（學齡為課表）三個視圖。
export default function Timeline() {
  const { childId, view: initialView } = useLocalSearchParams<{ childId: string; view?: View3 }>();
  const { styles, palette } = useTheme();
  const { children, active } = useChildren();
  const child = children.find((c) => c.id === childId) ?? active;
  const plan = usePlan(child);
  const [view, setView] = useState<View3>(initialView === 'day' || initialView === 'week' ? initialView : 'list');
  const [events, setEvents] = useState<Event[]>([]);
  const [day, setDay] = useState<number | 'earlier'>(0); // 0 = 今天，1 = 昨天…
  const [selected, setSelected] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(() => { if (childId) listEvents(childId, { limit: 3000 }).then(setEvents); }, [childId]);
  useFocusEffect(load);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);

  const nowDate = new Date(now);
  const days = Array.from({ length: DAYS_SHOWN }, (_, i) => addDays(nowDate, -i));
  const dayIndex = day === 'earlier' ? 0 : day;
  const selectedDate = toIsoDate(days[dayIndex]);
  const d = child ? daysSince(child.birthDate) : 0;
  const older = d >= 3 * 365;
  const school = d >= 6 * 365;

  // 依「記錄當時的時區」切日：出國記的紀錄回國後仍歸在當地那一天。
  const cutoffKey = toIsoDate(addDays(nowDate, -(DAYS_SHOWN - 1)));
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

  // 當天摘要。睡眠以當天 0 到 24 時內的部分計算（跨夜的切開），進行中的算到現在。只顯示數字，不評分。
  const dayStart = new Date(days[dayIndex]); dayStart.setHours(0, 0, 0, 0);
  const dayEnd = dayStart.getTime() + 86400000;
  const sleepSegs = events.filter((e) => e.type === 'sleep').map((e) => ({ s: Math.max(new Date(e.startAt).getTime(), dayStart.getTime()), f: Math.min(e.endAt ? new Date(e.endAt).getTime() : now, dayEnd) })).filter((x) => x.f > x.s).sort((a, b) => a.s - b.s);
  const sleepMin = sleepSegs.reduce((a, x) => a + (x.f - x.s) / 60000, 0);
  const hm = (min: number) => (min < 60 ? `${Math.round(min)} 分` : `${Math.floor(min / 60)} 時 ${Math.round(min % 60)} 分`);
  const breast = shown.filter((e) => e.type === 'feed.breast').length;
  const feeds = shown.filter((e) => e.type === 'feed.breast' || e.type === 'feed.bottle').length;
  const bottleMl = shown.filter((e) => e.type === 'feed.bottle').reduce((a, e) => a + (Number(e.payload.ml) || 0), 0);
  const diapers = shown.filter((e) => e.type.startsWith('diaper.')).length;
  // 最長清醒：當天兩段睡眠之間最長的間隔（今天的話，最後一段醒來到現在也算）。
  let longestAwake = 0;
  for (let i = 1; i < sleepSegs.length; i++) longestAwake = Math.max(longestAwake, (sleepSegs[i].s - sleepSegs[i - 1].f) / 60000);
  if (dayIndex === 0 && sleepSegs.length && !events.some((e) => e.type === 'sleep' && !e.endAt)) longestAwake = Math.max(longestAwake, (now - sleepSegs[sleepSegs.length - 1].f) / 60000);
  const meds = shown.filter((e) => e.type === 'medication').length;
  const temps = shown.filter((e) => e.type === 'temperature').length;

  const remove = async (id: string) => { await deleteEvent(id); setConfirmId(null); setSelected(null); load(); };
  const openEdit = (e: Event) => router.push({ pathname: '/record/edit', params: { childId: e.childId, eventId: e.id } });
  const openPlan = (o: Occurrence) => router.push({ pathname: '/plan/edit', params: { childId: child?.id, id: o.item.id } });

  const subOf = (e: Event) => {
    if (e.type === 'sleep') return e.endAt ? `${durationLabel(e.startAt, e.endAt)}，到 ${hhmm(e.endAt)}` : `進行中 ${durationLabel(e.startAt)}`;
    const r = (e.payload as { startReason?: string }).startReason;
    return r && REASON_LABEL[r] ? REASON_LABEL[r] : undefined;
  };

  // 今天的計畫層與「接下來」提示（學齡設計稿：下一個行程、服藥倒數）。
  const occ = plan.opts ? occurrencesOn(plan.items, selectedDate, plan.opts) : [];
  const nowMin = nowDate.getHours() * 60 + nowDate.getMinutes();
  const next = dayIndex === 0 ? occ.find((o) => o.item.kind !== 'routine' && o.startMin > nowMin && hmToMin(o.item.time) === o.startMin) : undefined;
  const lastMed = events.find((e) => e.type === 'medication' && Number((e.payload as { intervalHours?: number }).intervalHours) > 0);
  const nextMedAt = lastMed ? new Date(lastMed.startAt).getTime() + Number((lastMed.payload as { intervalHours?: number }).intervalHours) * 3600000 : null;
  const medDue = nextMedAt && nextMedAt > now ? nextMedAt : null;

  const subtitle = child ? `${child.nickname} · ${ageLabel(d)}` : undefined;
  const title = view === 'week' ? (school ? '課表' : '這一週') : view === 'day' ? `${dayLabel(days[dayIndex], nowDate)} ${days[dayIndex].getMonth() + 1}/${days[dayIndex].getDate()}` : '紀錄';

  return (
    <View style={styles.page}>
      <TopBar title={title} subtitle={subtitle} back right={child ? <IconButton name="calendar" label="行程與範本" onPress={() => router.push({ pathname: '/plan', params: { childId: child.id } })} /> : undefined} />
      <Screen>
        <Seg<View3> label="檢視" value={view} onChange={(v) => { setView(v); setSelected(null); if (v === 'day' && day === 'earlier') setDay(0); }} options={[{ key: 'list', label: '列表' }, { key: 'day', label: '時間軸' }, { key: 'week', label: school ? '課表' : '一週' }]} />

        {view !== 'week' ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {days.map((dd, i) => <Chip key={i} label={dayLabel(dd, nowDate)} sm on={day === i} onPress={() => { setDay(i); setSelected(null); }} />)}
            {view === 'list' ? <Chip label="更早" sm on={day === 'earlier'} onPress={() => { setDay('earlier'); setSelected(null); }} /> : null}
          </ScrollView>
        ) : null}

        {view === 'list' ? (
          <>
            <Card style={[styles.summary, { gap: 0 }]}>
              {(older ? [['睡眠', hm(sleepMin)], ['體溫', `${temps} 次`], ['用藥', `${meds} 次`]] : [['親餵', `${breast} 次`], ['瓶餵', `${bottleMl} ml`], ['尿布', `${diapers} 片`], ['睡眠', hm(sleepMin)]]).map(([k, v], i) => (
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
                          <View style={{ flex: 1 }}><GhostButton small label="修正時間" tone="accent" icon="edit-2" onPress={() => openEdit(e)} /></View>
                          <View style={{ flex: 1 }}><GhostButton small label="刪除" tone="danger" icon="trash-2" onPress={() => setConfirmId(e.id)} /></View>
                        </View>
                      )
                    ) : null}
                  </ListRow>
                );
              })}
            </ListCard>
            <Text style={styles.muted}>點一筆可修正時間或刪除。刪除會保留在資料庫但不再顯示；修正以新紀錄取代。</Text>
          </>
        ) : null}

        {view === 'day' ? (
          <>
            {next || medDue ? (
              <Banner title={next ? `接下來：${next.item.title} ${next.item.time}` : '服藥倒數'} icon="bell">
                <Text style={[styles.muted, { color: palette.ink }]}>
                  {[next?.item.location, medDue ? `服藥倒數：下次 ${minToHm(new Date(medDue).getHours() * 60 + new Date(medDue).getMinutes())}，剩 ${hm((medDue - now) / 60000)}。` : null].filter(Boolean).join(' · ')}
                </Text>
              </Banner>
            ) : null}
            <Card style={[styles.summary, { gap: 0 }]}>
              {(older ? [['睡眠', hm(sleepMin)], ['體溫', `${temps} 次`], ['用藥', `${meds} 次`]] : [['睡眠', hm(sleepMin)], ['餵食', `${feeds} 次`], ['尿布', `${diapers} 片`], ['最長清醒', longestAwake ? hm(longestAwake) : '—']]).map(([k, v], i) => (
                <View key={k} style={[styles.summaryCell, i === 0 && styles.summaryCellFirst]}>
                  <Text style={styles.summaryK}>{k}</Text>
                  <Text style={[styles.summaryV, { fontSize: 15 }]} adjustsFontSizeToFit numberOfLines={1}>{v}</Text>
                </View>
              ))}
            </Card>
            <DayView date={selectedDate} events={events} plan={occ} now={now} older={older} onPressEvent={openEdit} onPressPlan={openPlan} />
            <Legend items={school
              ? [{ label: '課表', color: palette.accentSoft }, { label: '補習才藝', color: '#B79AD6' }, { label: '服藥', color: palette.danger, dot: true }, { label: '睡眠', color: palette.warm }, { label: '範本', dashed: true }]
              : [{ label: '睡眠', color: palette.warm }, { label: '餵食', color: palette.accent, dot: true }, { label: '尿布', color: palette.ink3, dot: true }, { label: '我的範本', dashed: true }]} />
            <Text style={styles.muted}>
              {plan.mode.enabled && plan.anchorAt ? '範本是參考，不是目標。' : '範本預設不顯示，可在右上角「行程與範本」開啟。'}
              {d < 183 ? '0 到 6 個月餵食依需求，範本不排餵奶時間。' : ''}點一筆可修正。
            </Text>
          </>
        ) : null}

        {view === 'week' && !school ? (
          <>
            <WeekView endDate={toIsoDate(nowDate)} events={events} now={now} onPickDay={(date) => { const i = days.findIndex((x) => toIsoDate(x) === date); setDay(i >= 0 ? i : 0); setView('day'); }} />
            <Legend items={[{ label: '睡眠', color: palette.warm }, { label: '餵食', color: palette.accent, dot: true }]} />
            <Text style={styles.muted}>直欄是一天 24 小時，橫向看一週的型態。只呈現紀錄的時間與總時數，不做評分。點一欄看當天時間軸。</Text>
            {child ? (
              <ListCard>
                <ListRow first main="把這週的型態存成範本" sub={plan.anchorAt ? '用最近 7 天的小睡與夜間睡眠起訖，產生「我的範本」' : '要先在「行程與範本」選起點（滿 6 個月或一個事件）'} chevron
                  onPress={() => router.push({ pathname: plan.anchorAt ? '/plan/derive' : '/plan', params: { childId: child.id } })} />
              </ListCard>
            ) : null}
          </>
        ) : null}

        {view === 'week' && school ? (
          <>
            <Timetable items={plan.items.filter((it) => !it.validTo || it.validTo >= toIsoDate(nowDate))} todayWeekday={nowDate.getDay()} onPressItem={(it) => router.push({ pathname: '/plan/edit', params: { childId: child?.id, id: it.id } })} />
            {child ? (
              <ListCard>
                <ListRow first icon="plus" main="新增課程" sub="填節次就會排進課表" chevron onPress={() => router.push({ pathname: '/plan/edit', params: { childId: child.id, kind: 'class' } })} />
                <ListRow main="全部行程" sub={`共 ${plan.items.length} 筆`} chevron onPress={() => router.push({ pathname: '/plan', params: { childId: child.id } })} />
              </ListCard>
            ) : null}
            <Text style={styles.muted}>三歲前的「作息範本」和這張課表是同一種資料：名稱、星期、時間、時長。換了年齡段，只換呈現方式。</Text>
          </>
        ) : null}
      </Screen>
    </View>
  );
}
