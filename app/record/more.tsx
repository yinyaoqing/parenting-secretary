import { useCallback, useState } from 'react';
import { View, Text, Pressable, Linking } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { addEvent, listEvents } from '../../src/db/events';
import { logDiaper, logGrowth } from '../../src/records/quick';
import { deviceId } from '../../src/db/device';
import type { Event } from '../../src/db/types';
import { fmtMonthDay } from '../../src/util/datetime';
import { useTheme } from '../../src/ui/useTheme';
import { Screen, SheetHeader, Field, Chip, Input, NumInput, PrimaryButton, Seg, Card, ListCard, ListRow, Icon } from '../../src/ui/components';
import { TimeRow } from '../../src/ui/TimeRow';

type Tab = 'growth' | 'stool' | 'symptom' | 'visit' | 'diary';
const TABS: { key: Tab; label: string }[] = [{ key: 'growth', label: '生長' }, { key: 'stool', label: '便色' }, { key: 'symptom', label: '症狀' }, { key: 'visit', label: '就醫' }, { key: 'diary', label: '日記' }];
const SYMPTOMS = ['咳嗽', '流鼻水', '鼻塞', '嘔吐', '腹瀉', '紅疹', '哭鬧不安', '食慾差', '睡不好'];
const DIARY = ['情緒爆發', '分離焦慮', '新技能', '有趣的話', '其他'];
const STOOL_URL = 'https://mammy.hpa.gov.tw/Home/NewsKBContent?id=3649&type=01';

// 更多紀錄（規劃 4.2）：生長、便便顏色、症狀、就醫、情緒行為日記。只記錄，不判斷（R1）。
export default function MoreRecords() {
  const { childId, tab: initialTab } = useLocalSearchParams<{ childId: string; tab?: Tab }>();
  const { styles, palette } = useTheme();
  const [tab, setTab] = useState<Tab>(initialTab ?? 'growth');
  const [at, setAt] = useState(new Date());
  const [kg, setKg] = useState('');
  const [cm, setCm] = useState('');
  const [head, setHead] = useState('');
  const [stool, setStool] = useState<string | null>(null);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [place, setPlace] = useState('');
  const [reason, setReason] = useState('');
  const [diaryKind, setDiaryKind] = useState(DIARY[2]);
  const [note, setNote] = useState('');
  const [growth, setGrowth] = useState<Event[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    if (childId) listEvents(childId, { types: ['growth'], limit: 5 }).then(setGrowth);
  }, [childId]));

  const toggle = (s: string) => setSymptoms((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));

  const save = async () => {
    if (!childId) return;
    setErr(null);
    const by = await deviceId();
    const startAt = at.toISOString();
    if (tab === 'growth') {
      const k = kg ? Number(kg) : undefined, c = cm ? Number(cm) : undefined, h = head ? Number(head) : undefined;
      if (!k && !c && !h) return setErr('至少填一項');
      if ((k && (k <= 0 || k > 40)) || (c && (c <= 20 || c > 200)) || (h && (h <= 20 || h > 70))) return setErr('數字看起來不對，請確認單位');
      await logGrowth(childId, k, c, h, by, startAt);
    } else if (tab === 'stool') {
      if (!stool) return setErr('請選一個編號，或選「看不出來」');
      await logDiaper(childId, 'dirty', by, stool, startAt);
    } else if (tab === 'symptom') {
      if (!symptoms.length && !note.trim()) return setErr('請選或寫一項');
      await addEvent({ childId, type: 'symptom', startAt, payload: { items: symptoms, note: note.trim() || undefined }, recordedBy: by });
    } else if (tab === 'visit') {
      if (!place.trim() && !reason.trim()) return setErr('請填院所或原因');
      await addEvent({ childId, type: 'visit', startAt, payload: { place: place.trim() || undefined, reason: reason.trim() || undefined, note: note.trim() || undefined }, recordedBy: by });
    } else {
      if (!note.trim()) return setErr('寫一句就好');
      await addEvent({ childId, type: 'mood_note', startAt, payload: { kind: diaryKind, note: note.trim() }, recordedBy: by });
    }
    router.back();
  };

  const abnormalStool = stool !== null && Number(stool) >= 1 && Number(stool) <= 6;

  return (
    <View style={styles.page}>
      <SheetHeader title="更多紀錄" subtitle="只記錄，APP 不判斷" />
      <Screen footer={<PrimaryButton label="儲存" onPress={save} />}>
        <Seg<Tab> label="紀錄種類" value={tab} onChange={(t) => { setTab(t); setErr(null); setNote(''); }} options={TABS} />
        <TimeRow value={at} onChange={setAt} />

        {tab === 'growth' ? (
          <>
            <Field label="體重"><NumInput value={kg} onChangeText={setKg} unit="kg" label="體重 kg" decimal /></Field>
            <Field label="身長"><NumInput value={cm} onChangeText={setCm} unit="cm" label="身長 cm" decimal /></Field>
            <Field label="頭圍"><NumInput value={head} onChangeText={setHead} unit="cm" label="頭圍 cm" decimal /></Field>
            <Text style={styles.muted}>可以只填一項。APP 不計算百分位；生長曲線以健檢時醫師在兒童健康手冊上的紀錄為準。</Text>
            {growth.length ? (
              <ListCard>
                {growth.map((g, i) => {
                  const p = g.payload as { kg?: number; cm?: number; headCm?: number };
                  return <ListRow key={g.id} first={i === 0} time={fmtMonthDay(new Date(g.startAt))} main={[p.kg ? `${p.kg} kg` : null, p.cm ? `${p.cm} cm` : null, p.headCm ? `頭圍 ${p.headCm} cm` : null].filter(Boolean).join('，')} />;
                })}
              </ListCard>
            ) : null}
          </>
        ) : null}

        {tab === 'stool' ? (
          <>
            <Field label="比對兒童健康手冊的「嬰兒黃金九色卡」，選編號" hint="在日光或白色燈光下比對。出生後 2 週內是觀察期，喝母乳的寶寶延長到 1 個月。">
              <View style={styles.chips}>
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((n) => <Chip key={n} label={`${n} 號`} on={stool === n} onPress={() => setStool(n)} />)}
                <Chip label="看不出來" on={stool === 'unsure'} onPress={() => setStool('unsure')} />
              </View>
            </Field>
            <Card style={abnormalStool ? { borderColor: palette.danger, backgroundColor: palette.dangerSoft, gap: 6 } : { gap: 6 }}>
              <Text style={[styles.p, { fontSize: 15 }]}>國健署說明：黃色或綠色的大便（九色卡編號 7 至 9 號）為正常狀況；淡黃色或灰白色（編號 1 至 6 號）為異常狀況。</Text>
              <Text style={[styles.muted, { color: palette.ink2 }]}>國健署原文：「假如寶寶出生後2週至1個月內，持續有黃疸現象，且便便顏色不太正常，呈現灰白或淡黃，就應儘快就醫檢查。」</Text>
              <Pressable onPress={() => Linking.openURL(STOOL_URL)} accessibilityRole="link" style={[styles.row, { gap: 4 }]}>
                <Text style={[styles.link, { fontSize: 14 }]}>國健署：嬰兒黃金九色卡為何那麼重要？</Text>
                <Icon name="external-link" size={14} color={palette.accent} />
              </Pressable>
            </Card>
            <Text style={styles.muted}>會記成一筆「便便」，並附上編號。</Text>
          </>
        ) : null}

        {tab === 'symptom' ? (
          <>
            <Field label="看到什麼（可複選）"><View style={styles.chips}>{SYMPTOMS.map((s) => <Chip key={s} label={s} on={symptoms.includes(s)} icon={symptoms.includes(s) ? 'check' : undefined} onPress={() => toggle(s)} />)}</View></Field>
            <Field label="補充（可留空）"><Input value={note} onChangeText={setNote} placeholder="例如：晚上咳比較多" accessibilityLabel="症狀補充" /></Field>
            <Text style={styles.muted}>只記下你看到的，看醫生時可以給醫生看。APP 不判斷是否需要就醫；緊急狀況請撥 119。</Text>
          </>
        ) : null}

        {tab === 'visit' ? (
          <>
            <Field label="院所（可留空）"><Input value={place} onChangeText={setPlace} placeholder="例如：○○小兒科" accessibilityLabel="院所" /></Field>
            <Field label="原因（可留空）"><Input value={reason} onChangeText={setReason} placeholder="例如：健檢、咳嗽" accessibilityLabel="就醫原因" /></Field>
            <Field label="醫師說的（可留空）"><Input value={note} onChangeText={setNote} placeholder="例如：三天後回診" accessibilityLabel="醫師說的" /></Field>
            <Text style={styles.muted}>用藥請另外記在「用藥」，可以倒數間隔。</Text>
          </>
        ) : null}

        {tab === 'diary' ? (
          <>
            <Field label="哪一種"><View style={styles.chips}>{DIARY.map((k) => <Chip key={k} label={k} on={diaryKind === k} onPress={() => setDiaryKind(k)} />)}</View></Field>
            <Field label="發生了什麼"><Input value={note} onChangeText={setNote} placeholder="寫一句就好" multiline style={{ minHeight: 96, paddingTop: 14, textAlignVertical: 'top' }} accessibilityLabel="日記內容" /></Field>
            <Text style={styles.muted}>不評分、不分析，只是留下來。</Text>
          </>
        ) : null}

        {err ? <Text style={[styles.p, { color: palette.danger }]}>{err}</Text> : null}
      </Screen>
    </View>
  );
}
