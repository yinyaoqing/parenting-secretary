import { useCallback, useState } from 'react';
import { View, Text, Pressable, Linking, Share } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { allCards } from '../../src/content/loader';
import { ASKS, QUESTIONS, RESOURCES, askMessage, wantsSupport, type CheckIn, type Level } from '../../src/caregiver/resources';
import { getCheckIns, saveCheckIn } from '../../src/caregiver/store';
import { addDays, toIsoDate } from '../../src/util/datetime';
import { useTheme } from '../../src/ui/useTheme';
import { Screen, TopBar, Card, Section, Chip, Input, PrimaryButton, Icon, Badge, ListCard, ListRow, Big } from '../../src/ui/components';
import { setSetting } from '../../src/db/repo';
import { SpotMoonCloud } from '../../src/ui/art';

// 照顧好自己（規劃 4.9）：10 秒打卡、想聊聊的專線、請求支援。不計分、不篩檢，紀錄只在這支手機。
export default function Caregiver() {
  const { styles, palette } = useTheme();
  const today = toIsoDate(new Date());
  const dates = [0, 1, 2].map((i) => toIsoDate(addDays(new Date(), -i)));
  const [byDate, setByDate] = useState<Record<string, CheckIn>>({});
  const [draft, setDraft] = useState<Partial<CheckIn>>({});
  const [picks, setPicks] = useState<string[]>([]);
  const [extra, setExtra] = useState('');
  const [want, setWant] = useState<'record' | 'help' | 'talk' | null>(null);

  const load = useCallback(() => {
    getCheckIns(7).then((m) => { setByDate(m); setDraft(m[toIsoDate(new Date())] ?? {}); });
  }, []);
  useFocusEffect(load);

  const pick = async (key: keyof CheckIn, v: Level) => {
    const next = { ...draft, [key]: v };
    setDraft(next);
    if (next.sleep !== undefined && next.energy !== undefined && next.mood !== undefined) {
      await saveCheckIn(today, next as CheckIn);
      setByDate((m) => ({ ...m, [today]: next as CheckIn }));
    }
  };

  const support = wantsSupport(byDate, dates) || draft.mood === 2 || want === 'talk';
  const done = byDate[today];

  const resourceList = (
    <View style={{ gap: 10 }}>
      {RESOURCES.map((r) => (
        <Card key={r.id} style={{ gap: 6 }}>
          <Text style={[styles.p, { fontWeight: '700' }]}>{r.name}</Text>
          <Text style={styles.muted}>{r.desc}</Text>
          <Text style={[styles.muted, { color: palette.ink2 }]}>{r.hours}</Text>
          <View style={[styles.row, { gap: 8, flexWrap: 'wrap' }]}>
            {r.phone ? (
              <Pressable onPress={() => Linking.openURL(`tel:${r.phone}`)} accessibilityRole="button" accessibilityLabel={`撥打 ${r.name} ${r.phoneLabel}`}
                style={[styles.chip, styles.chipOn, { gap: 6 }]}>
                <Icon name="phone" size={16} color={palette.accentInk} />
                <Text style={[styles.chipText, styles.chipTextOn]}>{r.phoneLabel}</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={() => Linking.openURL(r.url)} accessibilityRole="link" style={[styles.row, { gap: 4, minHeight: 44 }]}>
              <Text style={[styles.link, { fontSize: 14 }]}>官方頁面</Text>
              <Icon name="external-link" size={14} color={palette.accent} />
            </Pressable>
          </View>
          <Text style={[styles.muted, { fontSize: 12 }]}>來源：{r.source}，查核 {r.checkedAt}</Text>
        </Card>
      ))}
      <Card warm><Text style={[styles.p, { color: palette.warm, fontWeight: '700' }]}>有立即危險時，請直接撥 119 或 110。</Text></Card>
    </View>
  );

  return (
    <View style={styles.page}>
      <TopBar back title="照顧好自己" />
      <Screen>
        <Text style={styles.label}>今天只想</Text>
        <View style={styles.grid}>
          <Big third label="只記錄" sub="不看內容" on={want === 'record'} onPress={async () => { setWant('record'); await setSetting('contentQuiet', '1'); }} />
          <Big third label="找人換手" sub="請別人幫忙" on={want === 'help'} onPress={() => setWant('help')} />
          <Big third label="找人說話" sub="專線" on={want === 'talk'} onPress={() => setWant('talk')} />
        </View>
        {want === 'record' ? <Text style={[styles.muted, { color: palette.accent }]}>已打開內容安靜：內容分頁不再主動放卡片，紀錄照常。設定裡可以關。</Text> : <Text style={styles.muted}>不問原因，也不記錄你選了什麼。</Text>}
        {want === 'help' ? <Text style={[styles.muted, { color: palette.accent }]}>往下滑到「請別人幫忙」，選好要說的事就能傳出去。</Text> : null}

        <Card warm style={{ gap: 10 }}>
          <View style={styles.row}>
            <SpotMoonCloud size={40} />
            <View style={styles.sp}>
              <Text style={[styles.p, { fontWeight: '700' }]}>今天的你，還好嗎？</Text>
              <Text style={[styles.muted, { color: palette.ink2 }]}>10 秒就好。不計分、不判讀，只存在這支手機，不會交接給別人。</Text>
            </View>
          </View>
          {QUESTIONS.map((q) => (
            <View key={q.key} style={{ gap: 6 }}>
              <Text style={styles.label}>{q.label}</Text>
              <View style={styles.chips}>
                {q.options.map((o, i) => <Chip key={o} sm label={o} on={draft[q.key] === i} onPress={() => pick(q.key, i as Level)} />)}
              </View>
            </View>
          ))}
          {done ? <Badge label="今天已記下" icon="check" /> : null}
        </Card>

        {support ? (
          <>
            <Text style={[styles.p, { color: palette.ink2 }]}>最近好像很辛苦。照顧孩子的人也需要被照顧，下面的專線都可以打，不用先想好要說什麼。</Text>
            {resourceList}
          </>
        ) : null}

        <Section title="請別人幫忙" />
        <Card style={{ gap: 10 }}>
          <Text style={styles.muted}>選好要說的事，預覽後用 LINE 或簡訊傳給你信任的人。APP 不會替你送出。</Text>
          <View style={styles.chips}>
            {ASKS.map((a) => <Chip key={a} sm label={a} on={picks.includes(a)} icon={picks.includes(a) ? 'check' : undefined} onPress={() => setPicks((p) => (p.includes(a) ? p.filter((x) => x !== a) : [...p, a]))} />)}
          </View>
          <Input value={extra} onChangeText={setExtra} placeholder="其他想說的（可留空）" accessibilityLabel="其他想說的" />
          {picks.length || extra.trim() ? (
            <View style={{ backgroundColor: palette.surface2, borderRadius: 12, padding: 12 }}>
              <Text style={[styles.p, { fontSize: 15 }]}>{askMessage(picks, extra)}</Text>
            </View>
          ) : null}
          <PrimaryButton label="選擇要傳給誰" icon="send" disabled={!picks.length && !extra.trim()} onPress={() => { void Share.share({ message: askMessage(picks, extra) }); }} />
        </Card>

        {!support ? (
          <>
            <Section title="想聊聊嗎" />
            {resourceList}
          </>
        ) : null}

        <Section title="給照顧者的內容" />
        <ListCard>
          {allCards().filter((c) => c.topicGroup === 'caregiver').map((c, i) => (
            <ListRow key={c.id} first={i === 0} main={c.title} chevron onPress={() => router.push({ pathname: '/cards/[id]', params: { id: c.id } })} />
          ))}
        </ListCard>
      </Screen>
    </View>
  );
}
