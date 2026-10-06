// 一週睡眠與餵食圖（設計稿 Timeline-Week）：7 直欄各是一天 24 小時，橫向看一週的型態。
// 只呈現紀錄的時間與總時數，不評分（R1）。點一欄跳到那天的時間軸。
import { View, Text, Pressable } from 'react-native';
import type { Event } from '../db/types';
import { addDaysIso, parseDate, weekdayChar } from './plan';
import { useTheme } from '../ui/useTheme';

const COL_H = 420;

export function WeekView({ endDate, events, now, onPickDay }: { endDate: string; events: Event[]; now: number; onPickDay: (date: string) => void }) {
  const { styles, palette, night } = useTheme();
  const dates = Array.from({ length: 7 }, (_, i) => addDaysIso(endDate, i - 6));

  const cols = dates.map((date) => {
    const start = parseDate(date).getTime();
    const end = start + 86400000;
    const pct = (ms: number) => ((Math.max(start, Math.min(end, ms)) - start) / 86400000) * 100;
    let sleepMin = 0;
    const bars: { top: number; h: number; open: boolean }[] = [];
    for (const e of events) {
      if (e.type !== 'sleep') continue;
      const s = new Date(e.startAt).getTime();
      const f = e.endAt ? new Date(e.endAt).getTime() : now;
      if (f <= start || s >= end) continue;
      sleepMin += (Math.min(f, end) - Math.max(s, start)) / 60000;
      bars.push({ top: pct(s), h: Math.max(0.6, pct(f) - pct(s)), open: !e.endAt });
    }
    const feeds = events.filter((e) => e.type.startsWith('feed.')).map((e) => new Date(e.startAt).getTime()).filter((t) => t >= start && t < end).map(pct);
    const isToday = now >= start && now < end;
    return { date, bars, feeds, sleepMin, isToday, nowPct: isToday ? pct(now) : null };
  });

  return (
    <View style={[styles.card, { paddingHorizontal: 10 }]}>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        <View style={{ width: 18 }} />
        {cols.map((c) => {
          const d = parseDate(c.date);
          const color = c.isToday ? palette.accent : palette.ink2;
          return (
            <View key={c.date} style={{ flex: 1, alignItems: 'center' }}>
              <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 12, color }}>{weekdayChar(d.getDay())}</Text>
              <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 15, fontWeight: '700', color }}>{d.getDate()}</Text>
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', gap: 4, marginTop: 6 }}>
        <View style={{ width: 18, height: COL_H }}>
          {[0, 6, 12, 18, 24].map((h) => <Text maxFontSizeMultiplier={1.3} key={h} style={{ position: 'absolute', top: (h / 24) * COL_H - 7, right: 2, fontSize: 10, color: palette.ink3 }}>{h}</Text>)}
        </View>
        {cols.map((c) => (
          <Pressable
            key={c.date}
            onPress={() => onPickDay(c.date)}
            accessibilityRole="button"
            accessibilityLabel={`${c.date}，睡眠 ${(c.sleepMin / 60).toFixed(1)} 小時，餵食 ${c.feeds.length} 次，點擊看當天時間軸`}
            style={{ flex: 1, height: COL_H, borderRadius: 8, backgroundColor: c.isToday ? palette.accentSoft : palette.surface2, overflow: 'hidden' }}
          >
            {c.bars.map((b, i) => <View key={i} style={{ position: 'absolute', left: 3, right: 3, top: `${b.top}%`, height: `${b.h}%`, borderRadius: 3, backgroundColor: palette.warm, opacity: b.open ? 0.5 : 1 }} />)}
            {c.feeds.map((p, i) => <View key={`f${i}`} style={{ position: 'absolute', alignSelf: 'center', top: `${p}%`, width: 7, height: 7, marginTop: -3.5, borderRadius: 4, backgroundColor: palette.accent, borderWidth: 1, borderColor: night ? palette.bg : '#fff' }} />)}
            {c.nowPct !== null ? <View style={{ position: 'absolute', left: 0, right: 0, top: `${c.nowPct}%`, height: 2, backgroundColor: palette.danger }} /> : null}
          </Pressable>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 4, marginTop: 6 }}>
        <View style={{ width: 18 }} />
        {cols.map((c) => (
          <Text maxFontSizeMultiplier={1.3} key={c.date} style={{ flex: 1, textAlign: 'center', fontSize: 12, color: c.isToday ? palette.accent : palette.ink2, fontWeight: c.isToday ? '700' : '400' }}>
            {c.sleepMin ? `${(c.sleepMin / 60).toFixed(1)} 時` : '—'}
          </Text>
        ))}
      </View>
    </View>
  );
}
