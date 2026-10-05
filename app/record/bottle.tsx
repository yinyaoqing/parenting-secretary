import { useState } from 'react';
import { View, Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { logBottle } from '../../src/records/quick';
import { deviceId } from '../../src/db/device';
import { useTheme } from '../../src/ui/useTheme';
import type { FeedStartReason } from '../../src/db/types';
import { Screen, SheetHeader, Field, Chip, Seg, NumInput, PrimaryButton } from '../../src/ui/components';
import { TimeRow } from '../../src/ui/TimeRow';
import { SpotBottle } from '../../src/ui/art';

type Kind = 'breastmilk' | 'formula' | 'cow_milk';
const KINDS: { key: Kind; label: string }[] = [{ key: 'breastmilk', label: '母乳' }, { key: 'formula', label: '配方奶' }, { key: 'cow_milk', label: '鮮奶' }];
const REASONS: [FeedStartReason, string][] = [['cue', '飢餓訊號'], ['schedule', '到時間了'], ['reminder', 'APP 提醒'], ['other', '其他']];
const QUICK = [30, 60, 90, 120, 150, 180];

export default function Bottle() {
  const { childId, reason: reasonParam } = useLocalSearchParams<{ childId: string; reason?: string }>();
  const { styles } = useTheme();
  const [at, setAt] = useState(new Date());
  const [ml, setMl] = useState('');
  const [kind, setKind] = useState<Kind>('breastmilk');
  const [reason, setReason] = useState<FeedStartReason>(reasonParam === 'reminder' ? 'reminder' : 'cue');
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    const n = Number(ml);
    if (!childId || !Number.isFinite(n) || n <= 0 || n > 500) return setErr('請輸入 1 到 500 之間的 ml');
    await logBottle(childId, n, kind, reason, await deviceId(), at.toISOString());
    router.back();
  };

  return (
    <View style={styles.page}>
      <SheetHeader title="瓶餵" art={<SpotBottle size={40} />} />
      <Screen footer={<PrimaryButton label="儲存" onPress={save} />}>
        <TimeRow value={at} onChange={setAt} />
        <Field label="奶量">
          <NumInput value={ml} onChangeText={setMl} unit="ml" label="奶量 ml" />
          <View style={styles.chips}>
            {QUICK.map((q) => <Chip key={q} label={String(q)} on={ml === String(q)} onPress={() => setMl(String(q))} />)}
          </View>
        </Field>
        <Field label="種類">
          <Seg<Kind> label="種類" value={kind} onChange={setKind} options={KINDS} />
        </Field>
        <Field label="這次怎麼開始的" hint="「APP 提醒」開始的餵食不會拿來學習你孩子的節奏。">
          <View style={styles.chips}>
            {REASONS.map(([k, l]) => <Chip key={k} label={l} on={reason === k} onPress={() => setReason(k)} />)}
          </View>
        </Field>
        {err ? <Text style={[styles.p, styles.danger]}>{err}</Text> : null}
      </Screen>
    </View>
  );
}
