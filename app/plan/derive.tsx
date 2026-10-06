import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useChildren } from '../../src/ui/ChildContext';
import { listEvents } from '../../src/db/events';
import { replaceDerivedTemplates } from '../../src/db/schedule';
import { usePlan } from '../../src/timeline/usePlan';
import { deriveTemplates, durationText, isoDate, minToHm, hmToMin, parseDate, addDaysIso, type DerivedTemplate, type SleepSeg } from '../../src/timeline/plan';
import { fmtMonthDay } from '../../src/util/datetime';
import { useTheme } from '../../src/ui/useTheme';
import { Screen, SheetHeader, ListCard, ListRow, PrimaryButton, Card } from '../../src/ui/components';

// 從這週產生範本（設計稿 Timeline-Week「把這週的型態存成範本」）：
// 取起點之後、最近 7 天的睡眠紀錄中位數，不和任何常模比較。存檔會取代上一次產生的範本，自己建的不動。
export default function DerivePlan() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const { styles, palette } = useTheme();
  const { children, active } = useChildren();
  const child = children.find((c) => c.id === childId) ?? active;
  const plan = usePlan(child);
  const [result, setResult] = useState<DerivedTemplate[] | null | undefined>(undefined);
  const [from, setFrom] = useState<string | null>(null);

  const anchorAt = plan.anchorAt;
  const cid = child?.id;
  useEffect(() => {
    if (!cid || !plan.loaded) return;
    const today = isoDate(new Date());
    const weekAgo = addDaysIso(today, -7);
    const start = anchorAt && anchorAt > weekAgo ? anchorAt : weekAgo;
    listEvents(cid, { types: ['sleep'], from: parseDate(start).toISOString(), limit: 500 }).then((evs) => {
      const segs: SleepSeg[] = evs.filter((e) => e.endAt).map((e) => {
        const s = new Date(e.startAt);
        return { day: isoDate(s), startMin: s.getHours() * 60 + s.getMinutes(), durMin: Math.round((new Date(e.endAt!).getTime() - s.getTime()) / 60000) };
      }).filter((x) => x.day < today); // 今天還沒過完，不取
      setFrom(start);
      setResult(deriveTemplates(segs));
    });
  }, [cid, plan.loaded, anchorAt]);

  if (!child) return null;

  const save = async () => {
    if (!result) return;
    await replaceDerivedTemplates(child.id, result.map((t) => ({
      childId: child.id, title: t.title, kind: 'routine', weekdays: [0, 1, 2, 3, 4, 5, 6], time: t.time, durationMinutes: t.durationMinutes,
      leadMinutes: 0, syncToDeviceCalendar: false, templateSource: 'derived', validFrom: anchorAt ?? undefined,
    })));
    router.back();
  };

  return (
    <View style={styles.page}>
      <SheetHeader title="從這週產生範本" subtitle="用你自己的紀錄，參考，不是目標" />
      <Screen footer={result ? <PrimaryButton label="存成我的範本" onPress={save} /> : undefined}>
        {!anchorAt ? (
          <Card warm><Text style={[styles.muted, { color: palette.ink2 }]}>還沒有起點，或起點的日期還不知道。先回「行程與範本」打開開關並選起點。</Text></Card>
        ) : result === undefined ? (
          <Text style={styles.muted}>讀取紀錄中…</Text>
        ) : result === null ? (
          <Card><Text style={styles.muted}>{from ? `${fmtMonthDay(parseDate(from))}以來` : '最近'}有睡眠起訖紀錄的日子少於 3 天，還不夠產生範本。多記幾天睡眠，或直接手動新增。</Text></Card>
        ) : (
          <>
            <Text style={styles.muted}>取 {from ? fmtMonthDay(parseDate(from)) : ''}以來每天的小睡與夜間睡眠，用中位數排出：</Text>
            <ListCard>
              {result.map((t, i) => (
                <ListRow key={i} first={i === 0} time={t.time} main={t.title} sub={`${durationText(t.durationMinutes)}，到 ${minToHm(hmToMin(t.time) + t.durationMinutes)}`} />
              ))}
            </ListCard>
            <Text style={styles.muted}>存檔會取代上一次從紀錄產生的範本；你自己新增的範本不受影響。範本每天都畫，之後可以逐筆修改。</Text>
          </>
        )}
      </Screen>
    </View>
  );
}
