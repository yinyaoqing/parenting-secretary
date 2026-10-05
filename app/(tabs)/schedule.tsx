import { useCallback, useState } from 'react';
import { View, Text, Pressable, Linking } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { listChildren } from '../../src/db/repo';
import type { Child } from '../../src/db/types';
import { ageLabel, daysSince } from '../../src/util/age';
import { fmtMonthDay } from '../../src/util/datetime';
import { scheduleFor, scheduleMeta, CATEGORY_LABEL, type ScheduledEntry } from '../../src/schedule/loader';
import { useTheme } from '../../src/ui/useTheme';
import { Screen, TopBar, Badge, Card, Section, ListCard, ListRow, Chip, Icon } from '../../src/ui/components';
import { Thumb } from '../../src/ui/art';

// 時程分頁：依出生日算出公費健檢、發展篩檢、疫苗、塗氟的時間窗。只放時程，不放金額（紅線 R11：政策數字走遠端 JSON）。
const UPCOMING_DAYS = 120;

export default function Schedule() {
  const { styles, palette } = useTheme();
  const [child, setChild] = useState<Child | null>(null);
  const [showPast, setShowPast] = useState(false);
  useFocusEffect(useCallback(() => { listChildren().then((cs) => setChild(cs[0] ?? null)); }, []));

  const d = child ? daysSince(child.birthDate) : null;
  const entries = child ? scheduleFor(child.birthDate) : [];
  const open = entries.filter((e) => e.status === 'open');
  const upcoming = entries.filter((e) => e.status === 'upcoming' && e.daysUntilOpen <= UPCOMING_DAYS);
  const later = entries.filter((e) => e.status === 'upcoming' && e.daysUntilOpen > UPCOMING_DAYS);
  const past = entries.filter((e) => e.status === 'past');
  const meta = scheduleMeta();

  const dot = (e: ScheduledEntry) => (e.status === 'open' ? palette.accent : e.status === 'upcoming' ? palette.warm : palette.ink3);
  const sub = (e: ScheduledEntry) => {
    const when = e.status === 'open'
      ? `${e.item.window} · 到 ${fmtMonthDay(e.closesOn)} 前`
      : e.status === 'upcoming'
        ? `${e.item.window} · ${fmtMonthDay(e.opensOn)} 起（${e.daysUntilOpen} 天後）`
        : `${e.item.window} · 時間窗已過（${fmtMonthDay(e.closesOn)}）`;
    return e.item.note ? `${when}\n${e.item.note}` : when;
  };

  const Row = ({ e, first }: { e: ScheduledEntry; first: boolean }) => (
    <ListRow
      first={first}
      left={<View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: dot(e), marginTop: 2 }} />}
      main={e.item.title}
      sub={sub(e)}
      right={<Badge label={CATEGORY_LABEL[e.item.category]} tone={e.status === 'open' ? undefined : 'gray'} />}
    />
  );

  return (
    <View style={styles.page}>
      <TopBar title="時程" subtitle={child && d !== null ? `${child.nickname} · 第 ${d + 1} 天 · 實際 ${ageLabel(d)}` : undefined} />
      <Screen>
        <View style={[styles.row, { backgroundColor: palette.accentSoft, borderRadius: 20, overflow: 'hidden', gap: 14, paddingRight: 16 }]}>
          <Thumb art="bag" size={120} radius={0} style={{ borderWidth: 0 }} />
          <View style={[styles.sp, { gap: 2 }]}>
            <Text style={[styles.p, { fontWeight: '700' }]}>出門前看一眼</Text>
            <Text style={[styles.muted, { color: palette.ink2 }]}>依出生日自動排好的公費健檢、發展篩檢、疫苗與塗氟。帶兒童健康手冊與健保卡。</Text>
          </View>
        </View>

        {!child ? <Card><Text style={styles.muted}>建立孩子的檔案後，這裡會依出生日排出時程。</Text></Card> : null}

        {child ? (
          <>
            <Section title="現在可以去" />
            <ListCard>
              {open.length === 0 ? <ListRow first main="目前沒有在時間窗內的項目。" mainColor={palette.ink3} /> : null}
              {open.map((e, i) => <Row key={e.item.id} e={e} first={i === 0} />)}
            </ListCard>

            <Section title={`接下來 ${UPCOMING_DAYS} 天`} />
            <ListCard>
              {upcoming.length === 0 ? <ListRow first main="接下來幾個月沒有新的項目。" mainColor={palette.ink3} /> : null}
              {upcoming.map((e, i) => <Row key={e.item.id} e={e} first={i === 0} />)}
            </ListCard>

            {later.length ? <Text style={styles.muted}>更之後還有 {later.length} 項，到時會出現在這裡。</Text> : null}

            <Section title="時間窗已過" action={showPast ? '收合' : `${past.length} 項`} onAction={() => setShowPast((v) => !v)} />
            {showPast ? (
              <ListCard>
                {past.length === 0 ? <ListRow first main="還沒有。" mainColor={palette.ink3} /> : null}
                {past.map((e, i) => <Row key={e.item.id} e={e} first={i === 0} />)}
              </ListCard>
            ) : null}
            <Text style={styles.muted}>APP 不知道你是否已經去過，這裡只依年齡列出時間窗；是否完成以兒童健康手冊的紀錄為準。</Text>
          </>
        ) : null}

        <Section title="行政待辦" />
        <Card>
          <View style={[styles.row, { gap: 8 }]}><Text style={[styles.p, { fontWeight: '700' }]}>育兒津貼、托育補助、育嬰留職停薪</Text><Badge label="製作中" tone="gray" /></View>
          <Text style={styles.muted}>金額與年度會標查核日期並由遠端更新，不寫死在 APP 裡。在此之前請以各機關公告為準。</Text>
        </Card>

        <Section title="資料來源" />
        <Card style={{ gap: 8 }}>
          {meta.sources.map((s) => (
            <Pressable key={s.url} onPress={() => Linking.openURL(s.url)} accessibilityRole="link" style={[styles.row, { gap: 6, alignItems: 'flex-start' }]}>
              <Text style={[styles.link, styles.sp, { fontSize: 14, lineHeight: 20 }]}>{s.name}</Text>
              <Icon name="external-link" size={14} color={palette.accent} />
            </Pressable>
          ))}
          <View style={styles.chips}>
            <Chip label={`時程版本 ${meta.version}`} sm off />
            <Chip label={`查核 ${meta.checkedAt}`} sm off />
          </View>
          <Text style={styles.muted}>時程依出生日計算；疫苗與健檢依實際月齡。以疾管署與國健署現行公告為準。</Text>
        </Card>
      </Screen>
    </View>
  );
}
