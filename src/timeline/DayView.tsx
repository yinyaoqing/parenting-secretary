// 今天時間軸（設計稿 Timeline-Day、School-Day）：下層計畫（行程、範本虛線），上層實際（睡眠方塊、其他事件圓點）。
// 0 到 3 歲畫 24 小時；3 歲以上只畫 06 到 22 時（設計稿年齡段）。
import { View, Text, Pressable } from 'react-native';
import type { Event } from '../db/types';
import type { Occurrence } from './plan';
import { planColor, pointColor } from './colors';
import { eventSummary, typeLabel, hhmm, durationLabel } from '../util/format';
import { useTheme } from '../ui/useTheme';

const POINT_GAP = 24;
const HIDDEN_POINTS = new Set(['sleep', 'task.start', 'task.pause', 'task.complete']);

export function DayView({ date, events, plan, now, older, onPressEvent, onPressPlan }: {
  date: string; // YYYY-MM-DD
  events: Event[];
  plan: Occurrence[];
  now: number;
  older: boolean;
  onPressEvent: (e: Event) => void;
  onPressPlan: (o: Occurrence) => void;
}) {
  const { styles, palette, night, scale } = useTheme();
  const startH = older ? 6 : 0;
  const endH = older ? 22 : 24;
  const hourH = older ? 48 : 36;
  const [y, m, d] = date.split('-').map(Number);
  const dayStart = new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
  const winStart = dayStart + startH * 3600000;
  const winEnd = dayStart + endH * 3600000;
  const toY = (ms: number) => ((Math.max(winStart, Math.min(winEnd, ms)) - winStart) / 3600000) * hourH;
  const height = (endH - startH) * hourH;
  const labelFs = Math.round(12 * (scale === 'standard' ? 1 : scale === 'large' ? 1.1 : 1.2));

  // 睡眠方塊：與視窗重疊的都畫（前一晚 23:20 睡到 05:40 也會從頂端開始）。
  const sleeps = events.filter((e) => e.type === 'sleep').map((e) => {
    const s = new Date(e.startAt).getTime();
    const end = e.endAt ? new Date(e.endAt).getTime() : now;
    return { e, s, end };
  }).filter((x) => x.end > winStart && x.s < winEnd);

  // 時間點：依時間排序，靠太近的往下推，標籤不重疊。
  const raw = events
    .filter((e) => !HIDDEN_POINTS.has(e.type))
    .map((e) => ({ e, t: new Date(e.startAt).getTime() }))
    .filter((x) => x.t >= winStart && x.t < winEnd)
    .sort((a, b) => a.t - b.t);
  const points: { e: Event; y: number }[] = [];
  for (const x of raw) {
    const prev = points.length ? points[points.length - 1].y : -POINT_GAP;
    points.push({ e: x.e, y: Math.max(toY(x.t), prev + POINT_GAP) });
  }
  const lastY = points.length ? points[points.length - 1].y : 0;

  const plans = plan.filter((o) => o.endMin > startH * 60 || o.startMin >= startH * 60).filter((o) => o.startMin < endH * 60);
  const nowY = now >= winStart && now < winEnd ? toY(now) : null;
  const trackH = Math.max(height, lastY + POINT_GAP);

  const hours: number[] = [];
  for (let h = startH; h < endH; h += 2) hours.push(h);

  return (
    <View style={[styles.card, { paddingVertical: 12, paddingLeft: 6, paddingRight: 10 }]}>
      <View style={{ flexDirection: 'row', height: trackH + 8 }}>
        <View style={{ width: 30 }}>
          {hours.map((h) => (
            <Text key={h} style={{ position: 'absolute', top: (h - startH) * hourH - 7, right: 6, fontSize: 11, color: palette.ink3, fontVariant: ['tabular-nums'] }}>{String(h).padStart(2, '0')}</Text>
          ))}
        </View>
        <View style={{ flex: 1, position: 'relative' }}>
          {hours.map((h) => <View key={h} style={{ position: 'absolute', left: 0, right: 0, top: (h - startH) * hourH, height: 1, backgroundColor: palette.line }} />)}

          {plans.map((o, i) => {
            const c = planColor(o.item.kind, palette, night);
            const top = ((Math.max(o.startMin, startH * 60) - startH * 60) / 60) * hourH;
            const h = o.endMin > o.startMin ? Math.max(20, ((Math.min(o.endMin, endH * 60) - Math.max(o.startMin, startH * 60)) / 60) * hourH) : 20;
            return (
              <Pressable
                key={`${o.item.id}-${i}`}
                onPress={() => onPressPlan(o)}
                accessibilityRole="button"
                accessibilityLabel={`${o.item.kind === 'routine' ? '範本' : '行程'}：${o.item.title} ${o.item.time}`}
                style={{ position: 'absolute', left: 0, right: 0, top, height: h, borderRadius: 8, borderWidth: 1.5, borderStyle: c.dashed ? 'dashed' : 'solid', borderColor: c.border, backgroundColor: c.bg, opacity: c.dashed ? 0.9 : 0.85, paddingHorizontal: 6, paddingTop: 2, alignItems: 'flex-end' }}
              >
                <Text numberOfLines={1} style={{ fontSize: labelFs - 1, color: c.ink, fontWeight: '600' }}>{o.item.title}{o.item.kind === 'routine' ? ' 範本' : ''}</Text>
              </Pressable>
            );
          })}

          {sleeps.map(({ e, s, end }) => {
            const top = toY(s);
            const h = Math.max(18, toY(end) - top);
            const open = !e.endAt;
            return (
              <Pressable
                key={e.id}
                onPress={() => onPressEvent(e)}
                accessibilityRole="button"
                accessibilityLabel={open ? `睡眠中，${hhmm(e.startAt)} 起` : `睡眠 ${hhmm(e.startAt)} 到 ${hhmm(e.endAt!)}`}
                style={{ position: 'absolute', left: 0, width: '47%', top, height: h, borderRadius: 8, backgroundColor: palette.warm, opacity: open ? 0.75 : 1, paddingHorizontal: 6, paddingVertical: 2, overflow: 'hidden', borderBottomWidth: open ? 2 : 0, borderStyle: 'dashed', borderColor: palette.bg }}
              >
                <Text numberOfLines={1} style={{ color: night ? palette.bg : '#fff', fontWeight: '700', fontSize: labelFs }}>{open ? '睡眠中' : `睡眠 ${durationLabel(e.startAt, e.endAt)}`}</Text>
                {h >= 36 ? <Text numberOfLines={1} style={{ color: night ? palette.bg : '#fff', fontSize: labelFs - 1 }}>{open ? `${hhmm(e.startAt)} 起` : `${hhmm(e.startAt)} 到 ${hhmm(e.endAt!)}`}</Text> : null}
              </Pressable>
            );
          })}

          {points.map(({ e, y: top }) => (
            <Pressable
              key={e.id}
              onPress={() => onPressEvent(e)}
              accessibilityRole="button"
              accessibilityLabel={`${hhmm(e.startAt)} ${typeLabel(e.type)} ${eventSummary(e.type, e.payload, e.startAt, e.endAt)}`}
              hitSlop={4}
              style={{ position: 'absolute', left: '50%', right: 0, top: top - 9, height: 20, flexDirection: 'row', alignItems: 'center', gap: 6 }}
            >
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: pointColor(e.type, palette) }} />
              <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: labelFs, color: palette.ink, backgroundColor: palette.surface, paddingHorizontal: 3, borderRadius: 4 }}>
                {`${typeLabel(e.type)} ${eventSummary(e.type, e.payload, e.startAt, e.endAt)}`.trim()}
              </Text>
            </Pressable>
          ))}

          {nowY !== null ? (
            <View pointerEvents="none" style={{ position: 'absolute', left: -4, right: 0, top: nowY, height: 2, backgroundColor: palette.danger }}>
              <Text style={{ position: 'absolute', right: 0, top: -16, fontSize: 11, fontWeight: '700', color: palette.danger, backgroundColor: palette.surface, paddingHorizontal: 3 }}>{hhmm(new Date(now).toISOString())}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export function Legend({ items }: { items: { label: string; color?: string; dot?: boolean; dashed?: boolean }[] }) {
  const { styles, palette } = useTheme();
  return (
    <View style={[styles.chips, { gap: 12 }]}>
      {items.map((it) => (
        <View key={it.label} style={[styles.row, { gap: 6 }]}>
          <View style={{ width: 12, height: 12, borderRadius: it.dot ? 6 : 3, backgroundColor: it.dashed ? 'transparent' : it.color, borderWidth: it.dashed ? 1.5 : 0, borderStyle: 'dashed', borderColor: palette.ink3 }} />
          <Text style={[styles.muted, { fontSize: 13 }]}>{it.label}</Text>
        </View>
      ))}
    </View>
  );
}
