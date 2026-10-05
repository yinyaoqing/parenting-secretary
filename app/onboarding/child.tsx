import { useState } from 'react';
import { View, Text } from 'react-native';
import { router } from 'expo-router';
import { createChild, saveStyleProfile } from '../../src/db/repo';
import { PRESETS } from '../../src/style/questionnaire';
import type { FeedingMethod, Location } from '../../src/db/types';
import { toIsoDate } from '../../src/util/datetime';
import { useTheme } from '../../src/ui/useTheme';
import { Screen, TopBar, Progress, Field, Input, Chip, Opt, Card, SwitchRow, PrimaryButton, GhostButton } from '../../src/ui/components';
import { DatePick } from '../../src/ui/DatePick';

const FEEDING: { key: FeedingMethod; label: string }[] = [
  { key: 'breast', label: '親餵母乳' },
  { key: 'bottle_breastmilk', label: '瓶餵母乳' },
  { key: 'formula', label: '配方奶' },
  { key: 'mixed', label: '混合' },
];

const LOCATION: { key: Location; label: string }[] = [
  { key: 'home', label: '在家' },
  { key: 'postnatal_center', label: '產後護理之家' },
  { key: 'daycare', label: '托嬰中心或保母' },
];

// 特殊情境：措辭為「你想多看哪些資源」，可不選（v0.8 D6-7）。上架 7 種，其餘標即將推出。
const CONTEXTS: { key: string; label: string; soon?: boolean }[] = [
  { key: 'preterm', label: '早產兒' },
  { key: 'multiple', label: '多胞胎' },
  { key: 'dev_concern', label: '想了解發展評估資源' },
  { key: 'disability_chronic', label: '身心障礙或慢性病' },
  { key: 'new_immigrant', label: '新住民家庭' },
  { key: 'grandparent', label: '隔代教養' },
  { key: 'protection', label: '兒少保護資源' },
  { key: 'single', label: '單親', soon: true },
  { key: 'sibling', label: '手足即將出生', soon: true },
  { key: 'adoption', label: '收出養', soon: true },
];

// 建檔拆三步，每步只問一件事（設計稿第 1 區）。
export default function ChildForm() {
  const { styles } = useTheme();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [nickname, setNickname] = useState('');
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [isPreterm, setIsPreterm] = useState(false);
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [feeding, setFeeding] = useState<FeedingMethod>('breast');
  const [location, setLocation] = useState<Location>('home');
  const [locationUntil, setLocationUntil] = useState<Date | null>(null);
  const [contexts, setContexts] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const toggleContext = (k: string) => setContexts((cur) => (cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]));

  const next1 = () => {
    if (!nickname.trim()) return setError('請輸入孩子的暱稱');
    if (!birthDate) return setError('請選擇出生日');
    if (isPreterm && !dueDate) return setError('請選擇預產期');
    setError(null);
    setStep(2);
  };

  const create = async () => {
    if (!birthDate) return;
    setBusy(true);
    const specialContexts = [...contexts];
    if (isPreterm && !specialContexts.includes('preterm')) specialContexts.push('preterm');
    const child = await createChild({
      nickname: nickname.trim(),
      birthDate: toIsoDate(birthDate),
      dueDate: isPreterm && dueDate ? toIsoDate(dueDate) : undefined,
      feedingMethod: feeding,
      location,
      locationUntil: location === 'postnatal_center' && locationUntil ? toIsoDate(locationUntil) : undefined,
      specialContexts,
    });
    return child;
  };

  const toStyle = async () => {
    const child = await create();
    if (child) router.replace({ pathname: '/onboarding/style', params: { childId: child.id } });
  };

  const skipStyle = async () => {
    const child = await create();
    if (child) {
      await saveStyleProfile(child.id, 'mixed', PRESETS.mixed.axes);
      router.replace('/');
    }
  };

  const back = () => (step === 1 ? router.back() : setStep((s) => (s === 3 ? 2 : 1)));
  const today = new Date();

  return (
    <View style={styles.page}>
      <TopBar back={back}><Text style={styles.step}>第 {step} 步，共 3 步</Text></TopBar>

      {step === 1 ? (
        <Screen footer={<><PrimaryButton label="下一步" onPress={next1} /><Text style={[styles.muted, { textAlign: 'center' }]}>資料只存在這支手機，之後可在設定匯出備份。</Text></>}>
          <Progress pct={33} />
          <Text style={styles.h1}>孩子的基本資料</Text>
          <Field label="暱稱">
            <Input value={nickname} onChangeText={setNickname} placeholder="例如：小米" accessibilityLabel="暱稱" autoFocus />
          </Field>
          <Field label="出生日">
            <DatePick value={birthDate} onChange={setBirthDate} mode="date" label="出生日" maximumDate={today} />
          </Field>
          <Card>
            <SwitchRow title="早產兒" sub="會同時顯示實際月齡與矯正月齡" value={isPreterm} onChange={(v) => { setIsPreterm(v); if (v && !contexts.includes('preterm')) setContexts((c) => [...c, 'preterm']); }} />
            {isPreterm ? (
              <View style={{ marginTop: 10, gap: 6 }}>
                <Field label="預產期">
                  <DatePick value={dueDate} onChange={setDueDate} mode="date" label="預產期" />
                </Field>
                <Text style={styles.muted}>2 歲前的發展內容以矯正月齡呈現，疫苗依實際月齡。</Text>
              </View>
            ) : null}
          </Card>
          {error ? <Text style={[styles.p, styles.danger]}>{error}</Text> : null}
        </Screen>
      ) : null}

      {step === 2 ? (
        <Screen footer={<PrimaryButton label="下一步" onPress={() => setStep(3)} />}>
          <Progress pct={66} />
          <Text style={styles.h1}>餵養與地點</Text>
          <Field label="目前餵養方式">
            <View style={styles.chips}>
              {FEEDING.map((f) => <Chip key={f.key} label={f.label} on={feeding === f.key} onPress={() => setFeeding(f.key)} />)}
            </View>
          </Field>
          <Field label="孩子現在主要在哪裡">
            <View style={{ gap: 8 }}>
              {LOCATION.map((l) => <Opt key={l.key} label={l.label} on={location === l.key} onPress={() => setLocation(l.key)} />)}
            </View>
          </Field>
          {location === 'postnatal_center' ? (
            <Card>
              <Field label="預定出所日">
                <DatePick value={locationUntil} onChange={setLocationUntil} mode="date" label="預定出所日" />
              </Field>
              <Text style={styles.muted}>內容與提醒從這天開始。可留空。</Text>
            </Card>
          ) : null}
        </Screen>
      ) : null}

      {step === 3 ? (
        <Screen footer={<><PrimaryButton label="下一步：照顧風格" onPress={toStyle} disabled={busy} /><GhostButton label="先跳過，用混合型預設" onPress={skipStyle} /></>}>
          <Progress pct={100} />
          <Text style={styles.h1}>你想多看哪些資源？</Text>
          <Text style={styles.muted}>可以不選。只影響內容排序，之後在設定可以改。</Text>
          <View style={styles.chips}>
            {CONTEXTS.filter((c) => !c.soon).map((c) => (
              <Chip key={c.key} label={c.label} icon={contexts.includes(c.key) ? 'check' : undefined} on={contexts.includes(c.key)} onPress={() => toggleContext(c.key)} />
            ))}
          </View>
          {isPreterm ? <Text style={styles.muted}>早產兒已依預產期自動勾選。</Text> : null}
          <Text style={[styles.label, { marginTop: 6 }]}>即將推出</Text>
          <View style={styles.chips}>
            {CONTEXTS.filter((c) => c.soon).map((c) => <Chip key={c.key} label={c.label} off />)}
          </View>
        </Screen>
      ) : null}
    </View>
  );
}
