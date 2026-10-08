import { useState } from 'react';
import { View, Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { logLearning } from '../../src/records/quick';
import { deviceId } from '../../src/db/device';
import { useTheme } from '../../src/ui/useTheme';
import { Screen, SheetHeader, Field, Chip, Input, NumInput, PrimaryButton, Hint } from '../../src/ui/components';
import { TimeRow } from '../../src/ui/TimeRow';

const SUBJECTS = ['國語', '數學', '英語', '自然', '社會', '藝術', '體育', '閱讀', '戶外探索', '生活'];
const QUICK = [20, 30, 45, 60, 90];

// 自學學習紀錄（規劃 v1.0 第 5.3 節）：只記錄學了什麼，不評分、不和體制內比較。
// 一年下來的紀錄可以匯出 CSV；整理成學習狀況報告的功能之後加入。
export default function Learning() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const { styles } = useTheme();
  const [at, setAt] = useState(new Date());
  const [subject, setSubject] = useState('');
  const [min, setMin] = useState('');
  const [material, setMaterial] = useState('');
  const [note, setNote] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    const s = subject.trim();
    if (!childId || !s) return setErr('請選或寫一個科目');
    const n = min ? Number(min) : undefined;
    if (n !== undefined && (!Number.isInteger(n) || n <= 0 || n > 720)) return setErr('分鐘數請填 1 到 720');
    await logLearning(childId, { subject: s, minutes: n, material: material.trim() || undefined, note: note.trim() || undefined }, await deviceId(), at.toISOString());
    router.back();
  };

  return (
    <View style={styles.page}>
      <SheetHeader title="學習紀錄" subtitle="今天學了什麼，用你們的方式記" />
      <Screen footer={<PrimaryButton label="儲存" onPress={save} />}>
        <TimeRow value={at} onChange={setAt} />
        <Field label="科目或主題">
          <Input value={subject} onChangeText={setSubject} placeholder="可以自己寫" accessibilityLabel="科目或主題" />
          <View style={styles.chips}>{SUBJECTS.map((s) => <Chip key={s} sm label={s} on={subject === s} onPress={() => setSubject(s)} />)}</View>
        </Field>
        <Field label="多久（可留空）">
          <NumInput value={min} onChangeText={setMin} unit="分" label="學習分鐘數" />
          <View style={styles.chips}>{QUICK.map((q) => <Chip key={q} sm label={`${q} 分`} on={min === String(q)} onPress={() => setMin(String(q))} />)}</View>
        </Field>
        <Field label="用了什麼材料（可留空）">
          <Input value={material} onChangeText={setMaterial} placeholder="書名、網站、參觀地點" accessibilityLabel="學習材料" />
        </Field>
        <Field label="備註（可留空）">
          <Input value={note} onChangeText={setNote} placeholder="孩子的提問、作品、下次想做的" multiline accessibilityLabel="備註" />
        </Field>
        <Hint>只記錄，不評分。想看體制內同年級的進度，可以到時程分頁的「進度對照」；想測實際程度，用教育部因材網。</Hint>
        {err ? <Text style={[styles.p, styles.danger]}>{err}</Text> : null}
      </Screen>
    </View>
  );
}
