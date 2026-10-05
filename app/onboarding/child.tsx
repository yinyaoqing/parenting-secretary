import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Switch } from 'react-native';
import { router } from 'expo-router';
import { createChild } from '../../src/db/repo';
import type { FeedingMethod, Location } from '../../src/db/types';

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

const isoDate = /^\d{4}-\d{2}-\d{2}$/;

export default function ChildForm() {
  const [nickname, setNickname] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [isPreterm, setIsPreterm] = useState(false);
  const [dueDate, setDueDate] = useState('');
  const [feeding, setFeeding] = useState<FeedingMethod>('breast');
  const [location, setLocation] = useState<Location>('home');
  const [locationUntil, setLocationUntil] = useState('');
  const [contexts, setContexts] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const toggleContext = (k: string) =>
    setContexts((cur) => (cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]));

  const submit = async () => {
    if (!nickname.trim()) return setError('請輸入孩子的暱稱');
    if (!isoDate.test(birthDate)) return setError('出生日請用 YYYY-MM-DD');
    if (isPreterm && !isoDate.test(dueDate)) return setError('預產期請用 YYYY-MM-DD');
    if (location === 'postnatal_center' && locationUntil && !isoDate.test(locationUntil)) return setError('預定出所日請用 YYYY-MM-DD');
    setError(null);
    const specialContexts = [...contexts];
    if (isPreterm && !specialContexts.includes('preterm')) specialContexts.push('preterm');
    const child = await createChild({
      nickname: nickname.trim(),
      birthDate,
      dueDate: isPreterm ? dueDate : undefined,
      feedingMethod: feeding,
      location,
      locationUntil: location === 'postnatal_center' && locationUntil ? locationUntil : undefined,
      specialContexts,
    });
    router.replace({ pathname: '/onboarding/style', params: { childId: child.id } });
  };

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <Text style={styles.label}>暱稱</Text>
      <TextInput style={styles.input} value={nickname} onChangeText={setNickname} placeholder="例如：小米" accessibilityLabel="暱稱" />

      <Text style={styles.label}>出生日</Text>
      <TextInput style={styles.input} value={birthDate} onChangeText={setBirthDate} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" accessibilityLabel="出生日" />

      <View style={styles.row}>
        <Text style={styles.label}>早產兒（會顯示矯正月齡）</Text>
        <Switch value={isPreterm} onValueChange={setIsPreterm} />
      </View>
      {isPreterm && (
        <>
          <Text style={styles.label}>預產期</Text>
          <TextInput style={styles.input} value={dueDate} onChangeText={setDueDate} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" accessibilityLabel="預產期" />
        </>
      )}

      <Text style={styles.label}>目前餵養方式</Text>
      <View style={styles.chips}>
        {FEEDING.map((f) => (
          <Chip key={f.key} label={f.label} active={feeding === f.key} onPress={() => setFeeding(f.key)} />
        ))}
      </View>

      <Text style={styles.label}>孩子現在主要在哪裡</Text>
      <View style={styles.chips}>
        {LOCATION.map((l) => (
          <Chip key={l.key} label={l.label} active={location === l.key} onPress={() => setLocation(l.key)} />
        ))}
      </View>
      {location === 'postnatal_center' && (
        <>
          <Text style={styles.label}>預定出所日（內容與提醒從這天開始）</Text>
          <TextInput style={styles.input} value={locationUntil} onChangeText={setLocationUntil} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" accessibilityLabel="預定出所日" />
        </>
      )}

      <Text style={styles.label}>你想多看哪些資源？（可不選）</Text>
      <View style={styles.chips}>
        {CONTEXTS.map((c) => (
          <Chip
            key={c.key}
            label={c.soon ? `${c.label}（即將推出）` : c.label}
            active={contexts.includes(c.key)}
            disabled={c.soon}
            onPress={() => toggleContext(c.key)}
          />
        ))}
      </View>

      {error && <Text style={styles.error}>{error}</Text>}
      <Pressable style={styles.btn} onPress={submit} accessibilityRole="button">
        <Text style={styles.btnText}>下一步：照顧風格</Text>
      </Pressable>
      <Text style={styles.muted}>資料只存在這支手機。你之後可以在設定匯出備份。</Text>
    </ScrollView>
  );
}

function Chip({ label, active, disabled, onPress }: { label: string; active: boolean; disabled?: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={[styles.chip, active && styles.chipActive, disabled && styles.chipDisabled]}
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled }}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, gap: 8, paddingBottom: 48 },
  label: { fontSize: 16, fontWeight: '600', marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#aaa', borderRadius: 10, padding: 12, fontSize: 18 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: '#aaa' },
  chipActive: { backgroundColor: '#145a63', borderColor: '#145a63' },
  chipDisabled: { opacity: 0.45 },
  chipText: { fontSize: 16 },
  chipTextActive: { color: '#fff' },
  error: { color: '#a3261c', marginTop: 8 },
  btn: { marginTop: 20, paddingVertical: 16, borderRadius: 12, backgroundColor: '#145a63', alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  muted: { fontSize: 13, opacity: 0.6, marginTop: 10 },
});
