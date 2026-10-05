import { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { logTemperature, type TempSite } from '../../src/records/quick';
import { deviceId } from '../../src/db/device';
import { useTheme } from '../../src/ui/useTheme';
import { siteLabel } from '../../src/util/format';

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
  const { styles } = useTheme();
  const [c, setC] = useState('');
  const [site, setSite] = useState<TempSite | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    const n = Number(c);
    if (!site) return setErr('請選擇量測部位');
    if (!childId || !Number.isFinite(n) || n < 30 || n > 45) return setErr('請輸入 30 到 45 之間的度數');
    await logTemperature(childId, n, site, await deviceId());
    router.back();
  };

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.pad}>
      <Text style={styles.h2}>度數</Text>
      <TextInput style={styles.input} value={c} onChangeText={setC} keyboardType="decimal-pad" placeholder="例如 37.2" accessibilityLabel="體溫度數" />

      <Text style={styles.h2}>量測部位（必填）</Text>
      <View style={styles.chipRow}>
        {SITES.map((s) => (
          <Pressable key={s} style={[styles.chip, site === s && styles.chipActive]} onPress={() => setSite(s)} accessibilityRole="button">
            <Text style={[styles.chipText, site === s && styles.chipTextActive]}>{siteLabel(s)}</Text>
          </Pressable>
        ))}
      </View>
      {site && <Text style={styles.muted}>{DEFINITION[site]}</Text>}

      <View style={styles.card}>
        <Text style={styles.p}>3 個月以下的寶寶量到 38°C 以上，請立即就醫。</Text>
        <Text style={styles.muted}>APP 只記錄數字與部位，不判斷要不要就醫。來源與完整說明見「安全內容：發燒」。</Text>
      </View>

      {err && <Text style={[styles.p, styles.danger]}>{err}</Text>}
      <Pressable style={styles.primary} onPress={save} accessibilityRole="button"><Text style={styles.primaryText}>儲存</Text></Pressable>
    </ScrollView>
  );
}
