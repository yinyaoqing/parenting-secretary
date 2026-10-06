// 課表格（設計稿 School-Week）：一到五 × 節次。學校課表、補習才藝、服藥都是同一種行程資料。
// 列依節次或開始時間排序；週末的行程只在下方計數。
import { View, Text, Pressable } from 'react-native';
import type { ScheduleItem } from '../db/types';
import { planColor } from './colors';
import { useTheme } from '../ui/useTheme';

const DAYS = [1, 2, 3, 4, 5];
const DAY_LABEL = ['日', '一', '二', '三', '四', '五', '六'];

export function rowsOf(items: ScheduleItem[]): { key: string; period?: number; time: string; cells: (ScheduleItem | null)[] }[] {
  const rows = new Map<string, { key: string; period?: number; time: string; cells: (ScheduleItem | null)[] }>();
  for (const it of items) {
    const key = it.period ? `p${String(it.period).padStart(2, '0')}` : `t${it.time}`;
    const row = rows.get(key) ?? { key, period: it.period, time: it.time, cells: [null, null, null, null, null] };
    if (it.time < row.time) row.time = it.time;
    for (const d of it.weekdays) if (d >= 1 && d <= 5 && !row.cells[d - 1]) row.cells[d - 1] = it;
    rows.set(key, row);
  }
  return [...rows.values()].filter((r) => r.cells.some(Boolean)).sort((a, b) => a.time.localeCompare(b.time) || a.key.localeCompare(b.key));
}

export function Timetable({ items, todayWeekday, onPressItem }: { items: ScheduleItem[]; todayWeekday: number; onPressItem: (it: ScheduleItem) => void }) {
  const { styles, palette, night } = useTheme();
  const weekdayItems = items.filter((it) => it.kind !== 'routine' && it.weekdays.some((d) => d >= 1 && d <= 5));
  const rows = rowsOf(weekdayItems);

  return (
    <View style={[styles.card, { paddingHorizontal: 10, gap: 4 }]}>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        <View style={{ width: 46 }} />
        {DAYS.map((d) => (
          <Text maxFontSizeMultiplier={1.3} key={d} style={{ flex: 1, textAlign: 'center', fontSize: 14, fontWeight: '700', color: d === todayWeekday ? palette.accent : palette.ink2 }}>{DAY_LABEL[d]}</Text>
        ))}
      </View>
      {rows.length === 0 ? <Text maxFontSizeMultiplier={1.3} style={[styles.muted, { paddingVertical: 12 }]}>還沒有週一到週五的行程。新增課程時填「節次」，就會排進這張表。</Text> : null}
      {rows.map((r) => (
        <View key={r.key} style={{ flexDirection: 'row', gap: 4 }}>
          <View style={{ width: 46, justifyContent: 'center' }}>
            {r.period ? <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 14, fontWeight: '700', color: palette.ink }}>{r.period}</Text> : null}
            <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 11, color: palette.ink3, fontVariant: ['tabular-nums'] }}>{r.time}</Text>
          </View>
          {r.cells.map((it, i) => {
            if (!it) return <View key={i} style={{ flex: 1, minHeight: 44, borderRadius: 8, borderWidth: 1, borderStyle: 'dashed', borderColor: palette.line }} />;
            const c = planColor(it.kind, palette, night);
            return (
              <Pressable key={i} onPress={() => onPressItem(it)} accessibilityRole="button" accessibilityLabel={`${DAY_LABEL[i + 1]} ${it.time} ${it.title}`}
                style={{ flex: 1, minHeight: 44, borderRadius: 8, borderWidth: 1, borderColor: c.border, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 }}>
                <Text maxFontSizeMultiplier={1.3} numberOfLines={2} style={{ fontSize: 13, color: c.ink, fontWeight: '600', textAlign: 'center' }}>{it.title}</Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}
