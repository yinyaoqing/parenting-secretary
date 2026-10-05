import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { logTemperature, type TempSite } from '../../src/records/quick';
import { deviceId } from '../../src/db/device';
import { useTheme } from '../../src/ui/useTheme';
import { siteLabel } from '../../src/util/format';
import { Screen, SheetHeader, Field, Chip, NumInput, PrimaryButton, SafetyBox, Icon } from '../../src/ui/components';
import { TimeRow } from '../../src/ui/TimeRow';

const SITES: TempSite[] = ['rectal', 'ear', 'axillary', 'forehead', 'oral'];

// 各部位發燒定義（台灣兒科醫學會兒童發燒處置建議；內容卡 safety.fever）。只顯示定義，不判斷。
const DEFINITION: Record<TempSite, string> = {
  rectal: '肛溫 38.0°C 以上為發燒',
  ear: '耳溫 38.0°C 以上為發燒；3 個月以下不適用耳溫',
  axillary: '腋溫 37.2°C 以上為發燒；腋溫偏低，不能用來排除發燒',
  forehead: '額溫 37.5°C 以上為發燒；額溫僅供初篩',
  oral: '口溫 37.5°C 以上為發燒',
};

export default function Temperature() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const { styles, palette } = useTheme();
  const [at, setAt] = useState(new Date());
  const [c, setC] = useState('');
  const [site, setSite] = useState<TempSite | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    const n = Number(c);
    if (!site) return setErr('請選擇量測部位');
    if (!childId || !Number.isFinite(n) || n < 30 || n > 45) return setErr('請輸入 30 到 45 之間的度數');
    await logTemperature(childId, n, site, await deviceId(), at.toISOString());
    router.back();
  };

  return (
    <View style={styles.page}>
      <SheetHeader title="體溫" />
      <Screen footer={<PrimaryButton label="儲存" onPress={save} />}>
        <TimeRow value={at} onChange={setAt} />
        <Field label="度數">
          <NumInput value={c} onChangeText={setC} unit="°C" label="體溫度數" decimal placeholder="37.0" />
        </Field>
        <Field label="量測部位（必填）" hint={site ? DEFINITION[site] : undefined}>
          <View style={styles.chips}>
            {SITES.map((s) => <Chip key={s} label={siteLabel(s)} on={site === s} onPress={() => setSite(s)} />)}
          </View>
        </Field>
        <SafetyBox>
          <Text style={styles.p}>3 個月以下的寶寶量到 38°C 以上，請立即就醫。</Text>
          <Text style={styles.muted}>APP 只記錄數字與部位，不判斷要不要就醫。</Text>
          <Pressable onPress={() => router.push({ pathname: '/cards/[id]', params: { id: 'safety.fever' } })} accessibilityRole="link" style={[styles.row, { gap: 4, marginTop: 4 }]}>
            <Text style={[styles.link, { fontSize: 14 }]}>來源與完整說明：安全內容「發燒」</Text>
            <Icon name="chevron-right" size={14} color={palette.accent} />
          </Pressable>
        </SafetyBox>
        {err ? <Text style={[styles.p, styles.danger]}>{err}</Text> : null}
      </Screen>
    </View>
  );
}
