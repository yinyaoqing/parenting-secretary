import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { getChild, updateChild, archiveChild } from '../../src/db/repo';
import { useChildren } from '../../src/ui/ChildContext';
import type { Child, FeedingMethod, Location } from '../../src/db/types';
import { fromIsoDate, toIsoDate } from '../../src/util/datetime';
import { daysSince } from '../../src/util/age';
import { locationsForAge } from '../../src/home/location';
import { CountyPick } from '../../src/ui/CountyPick';
import { useTheme } from '../../src/ui/useTheme';
import { Screen, TopBar, Field, Input, Chip, Opt, Card, SwitchRow, PrimaryButton, GhostButton, Badge } from '../../src/ui/components';
import { DatePick } from '../../src/ui/DatePick';

const FEEDING: { key: FeedingMethod; label: string }[] = [
  { key: 'breast', label: '親餵母乳' }, { key: 'bottle_breastmilk', label: '瓶餵母乳' }, { key: 'formula', label: '配方奶' }, { key: 'mixed', label: '混合' },
];
const CONTEXTS: { key: string; label: string }[] = [
  { key: 'preterm', label: '早產兒' }, { key: 'multiple', label: '多胞胎' }, { key: 'dev_concern', label: '想了解發展評估資源' }, { key: 'disability_chronic', label: '身心障礙或慢性病' }, { key: 'new_immigrant', label: '新住民家庭' }, { key: 'grandparent', label: '隔代教養' }, { key: 'protection', label: '兒少保護資源' },
];

// 編輯孩子：同建檔的欄位；可設為目前；「封存」只隱藏，紀錄全部保留。
export default function EditChild() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { styles, palette } = useTheme();
  const { active, setActive, reload, children } = useChildren();
  const [c, setC] = useState<Child | null>(null);
  const [nickname, setNickname] = useState('');
  const [birth, setBirth] = useState<Date | null>(null);
  const [preterm, setPreterm] = useState(false);
  const [due, setDue] = useState<Date | null>(null);
  const [feeding, setFeeding] = useState<FeedingMethod>('breast');
  const [location, setLocation] = useState<Location>('home');
  const [until, setUntil] = useState<Date | null>(null);
  const [contexts, setContexts] = useState<string[]>([]);
  const [daycareFrom, setDaycareFrom] = useState<Date | null>(null);
  const [schoolFrom, setSchoolFrom] = useState<Date | null>(null);
  const [county, setCounty] = useState<string | undefined>(undefined);
  const [confirm, setConfirm] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getChild(id).then((ch) => {
      if (!ch) return;
      setC(ch); setNickname(ch.nickname); setBirth(fromIsoDate(ch.birthDate)); setPreterm(!!ch.dueDate); setDue(ch.dueDate ? fromIsoDate(ch.dueDate) : null);
      setFeeding(ch.feedingMethod); setLocation(ch.location); setUntil(ch.locationUntil ? fromIsoDate(ch.locationUntil) : null); setContexts(ch.specialContexts);
      setDaycareFrom(ch.daycareFrom ? fromIsoDate(ch.daycareFrom) : null); setSchoolFrom(ch.schoolFrom ? fromIsoDate(ch.schoolFrom) : null); setCounty(ch.county);
    });
  }, [id]);

  const save = async () => {
    if (!c) return;
    if (!nickname.trim()) return setErr('請輸入暱稱');
    if (!birth) return setErr('請選擇出生日');
    if (preterm && !due) return setErr('請選擇預產期');
    const specialContexts = contexts.filter((k) => k !== 'preterm');
    if (preterm) specialContexts.push('preterm');
    await updateChild(c.id, {
      nickname: nickname.trim(), birthDate: toIsoDate(birth), dueDate: preterm && due ? toIsoDate(due) : undefined,
      feedingMethod: feeding, location, locationUntil: location === 'postnatal_center' && until ? toIsoDate(until) : undefined, specialContexts,
      daycareFrom: daycareFrom ? toIsoDate(daycareFrom) : undefined, schoolFrom: schoolFrom ? toIsoDate(schoolFrom) : undefined, county,
    });
    await reload();
    router.back();
  };

  const archive = async () => {
    if (!c) return;
    await archiveChild(c.id);
    await reload();
    router.back();
  };

  if (!c) return <View style={styles.page}><TopBar back title="孩子" /></View>;
  const isActive = active?.id === c.id;

  return (
    <View style={styles.page}>
      <TopBar back title={c.nickname} right={isActive ? <Badge label="目前" /> : undefined} />
      <Screen footer={
        <>
          <PrimaryButton label="儲存" onPress={save} />
          {!isActive ? <GhostButton label="設為目前的孩子" tone="accent" onPress={async () => { await setActive(c.id); router.back(); }} /> : null}
          {confirm ? (
            <View style={styles.grid}>
              <View style={{ flex: 1 }}><GhostButton label="確定封存" tone="danger" icon="archive" onPress={archive} /></View>
              <View style={{ flex: 1 }}><GhostButton label="取消" onPress={() => setConfirm(false)} /></View>
            </View>
          ) : (
            <GhostButton label="封存這個孩子" tone="danger" icon="archive" onPress={() => setConfirm(true)} />
          )}
        </>
      }>
        <Field label="暱稱"><Input value={nickname} onChangeText={setNickname} accessibilityLabel="暱稱" /></Field>
        <Field label="出生日"><DatePick value={birth} onChange={setBirth} mode="date" label="出生日" maximumDate={new Date()} /></Field>
        <Card>
          <SwitchRow title="早產兒" sub="會同時顯示實際月齡與矯正月齡（2 歲前）" value={preterm} onChange={setPreterm} />
          {preterm ? <View style={{ marginTop: 10 }}><Field label="預產期"><DatePick value={due} onChange={setDue} mode="date" label="預產期" /></Field></View> : null}
        </Card>
        <Field label="目前餵養方式">
          <View style={styles.chips}>{FEEDING.map((f) => <Chip key={f.key} label={f.label} on={feeding === f.key} onPress={() => setFeeding(f.key)} />)}</View>
        </Field>
        <Field label="孩子現在主要在哪裡">
          <View style={{ gap: 8 }}>{locationsForAge(birth ? daysSince(toIsoDate(birth)) : null, location).map((l) => <Opt key={l.key} label={l.label} on={location === l.key} onPress={() => setLocation(l.key)} />)}</View>
        </Field>
        <Field label="戶籍縣市（可不選）" hint="用來顯示該縣市的生育津貼等地方補助"><CountyPick value={county} onChange={setCounty} /></Field>
        {location === 'postnatal_center' ? <Field label="預定出所日"><DatePick value={until} onChange={setUntil} mode="date" label="預定出所日" /></Field> : null}
        <Card style={{ gap: 10 }}>
          <Text style={[styles.p, { fontWeight: '700' }]}>生活的轉折（可留空）</Text>
          <Text style={styles.muted}>作息範本可以從這兩天開始畫。日期可以是之後，到那天才顯示。</Text>
          <Field label="開始上托嬰的日期">
            <DatePick value={daycareFrom} onChange={setDaycareFrom} mode="date" label="開始上托嬰的日期" placeholder="還沒有" />
            {daycareFrom ? <GhostButton small plain label="清除" onPress={() => setDaycareFrom(null)} /> : null}
          </Field>
          <Field label="入園或入學的日期">
            <DatePick value={schoolFrom} onChange={setSchoolFrom} mode="date" label="入園或入學的日期" placeholder="還沒有" />
            {schoolFrom ? <GhostButton small plain label="清除" onPress={() => setSchoolFrom(null)} /> : null}
          </Field>
        </Card>
        <Field label="想多看哪些資源">
          <View style={styles.chips}>{CONTEXTS.filter((k) => k.key !== 'preterm').map((k) => <Chip key={k.key} label={k.label} on={contexts.includes(k.key)} icon={contexts.includes(k.key) ? 'check' : undefined} onPress={() => setContexts((cur) => (cur.includes(k.key) ? cur.filter((x) => x !== k.key) : [...cur, k.key]))} />)}</View>
        </Field>
        <Text style={styles.muted}>封存只會把孩子從列表隱藏，所有紀錄仍留在手機裡，交接時也不會傳給對方。可以在「設定 › 資料」取消封存。{children.length === 1 ? '這是唯一的孩子，封存後首頁會回到歡迎頁。' : ''}</Text>
        {err ? <Text style={[styles.p, styles.danger, { color: palette.danger }]}>{err}</Text> : null}
      </Screen>
    </View>
  );
}
