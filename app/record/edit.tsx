import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { correctEvent, deleteEvent, listEvents } from '../../src/db/events';
import { deviceId } from '../../src/db/device';
import type { Event } from '../../src/db/types';
import { durationLabel, eventSummary, hhmm, typeLabel } from '../../src/util/format';
import { applyDate, applyTime, fmtMonthDay } from '../../src/util/datetime';
import { useTheme } from '../../src/ui/useTheme';
import { Screen, SheetHeader, Field, Chip, Card, PrimaryButton, GhostButton } from '../../src/ui/components';
import { DatePick } from '../../src/ui/DatePick';

const ADJ: [string, number][] = [['－15 分', -15], ['－5 分', -5], ['＋5 分', 5], ['＋15 分', 15]];

// 補登修正：改時間（與結束時間）。以新事件取代舊事件，歷史保留。
export default function EditEvent() {
  const { childId, eventId } = useLocalSearchParams<{ childId: string; eventId: string }>();
  const { styles } = useTheme();
  const [ev, setEv] = useState<Event | null>(null);
  const [start, setStart] = useState<Date>(new Date());
  const [end, setEnd] = useState<Date | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    if (!childId) return;
    listEvents(childId, { limit: 500 }).then((list) => {
      const e = list.find((x) => x.id === eventId) ?? null;
      setEv(e);
      if (e) { setStart(new Date(e.startAt)); setEnd(e.endAt ? new Date(e.endAt) : null); }
    });
  }, [childId, eventId]);

  const shift = (d: Date, mins: number) => new Date(d.getTime() + mins * 60000);

  const save = async () => {
    if (!ev) return;
    if (start.getTime() > Date.now() + 60000) return setErr('開始時間不能在未來');
    if (end && end.getTime() < start.getTime()) return setErr('結束時間不能早於開始時間');
    await correctEvent(ev.id, { startAt: start.toISOString(), endAt: end ? end.toISOString() : undefined }, await deviceId());
    router.back();
  };

  const remove = async () => {
    if (!ev) return;
    await deleteEvent(ev.id);
    router.back();
  };

  if (!ev) return <View style={styles.page}><SheetHeader title="修正紀錄" /><Screen><Text style={styles.muted}>載入中…</Text></Screen></View>;

  const hasEnd = ev.type === 'sleep' || !!ev.endAt;
  const original = `${typeLabel(ev.type)} · 原本 ${hhmm(ev.startAt)}${ev.endAt ? ` 到 ${hhmm(ev.endAt)}` : ''} ${eventSummary(ev.type, ev.payload, ev.startAt, ev.endAt)}`.trim();

  return (
    <View style={styles.page}>
      <SheetHeader title="修正紀錄" subtitle={original} />
      <Screen footer={
        <>
          <PrimaryButton label="儲存修正" onPress={save} />
          {confirm ? (
            <View style={styles.grid}>
              <View style={{ flex: 1 }}><GhostButton label="確定刪除" tone="danger" icon="trash-2" onPress={remove} /></View>
              <View style={{ flex: 1 }}><GhostButton label="取消" onPress={() => setConfirm(false)} /></View>
            </View>
          ) : (
            <GhostButton label="刪除這筆" tone="danger" icon="trash-2" onPress={() => setConfirm(true)} />
          )}
        </>
      }>
        <Field label="開始時間">
          <View style={[styles.row, { gap: 8, alignItems: 'flex-start' }]}>
            <DatePick flex={1.4} value={start} mode="date" label="開始日期" format={fmtMonthDay} maximumDate={new Date()} onChange={(d) => setStart(applyDate(start, d))} />
            <DatePick flex={1} value={start} mode="time" label="開始時間" onChange={(t) => setStart(applyTime(start, t))} />
          </View>
          <View style={styles.chips}>
            {ADJ.map(([l, m]) => <Chip key={l} label={l} sm onPress={() => setStart(shift(start, m))} />)}
          </View>
        </Field>

        {hasEnd ? (
          <Field label="結束時間（可留空）">
            <View style={[styles.row, { gap: 8, alignItems: 'flex-start' }]}>
              <DatePick flex={1.4} value={end} mode="date" label="結束日期" format={fmtMonthDay} maximumDate={new Date()} onChange={(d) => setEnd(applyDate(end ?? start, d))} />
              <DatePick flex={1} value={end} mode="time" label="結束時間" onChange={(t) => { const base = end ?? start; const x = new Date(base); x.setHours(t.getHours(), t.getMinutes(), 0, 0); setEnd(x); }} />
            </View>
            <View style={styles.chips}>
              {ADJ.map(([l, m]) => <Chip key={l} label={l} sm onPress={() => end && setEnd(shift(end, m))} />)}
              {end ? <Chip label="清除" sm onPress={() => setEnd(null)} /> : <Chip label="設為現在" sm onPress={() => setEnd(new Date())} />}
            </View>
            {end ? <Text style={styles.muted}>時長 {durationLabel(start.toISOString(), end.toISOString())}。</Text> : <Text style={styles.muted}>留空代表仍在進行中。</Text>}
          </Field>
        ) : null}

        <Card>
          <Text style={styles.muted}>修正後會以新紀錄取代，原紀錄保留在資料庫但不再顯示。開始時間不能在未來。</Text>
        </Card>
        {err ? <Text style={[styles.p, styles.danger]}>{err}</Text> : null}
      </Screen>
    </View>
  );
}
