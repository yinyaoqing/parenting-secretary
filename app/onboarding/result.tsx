import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { AXES, PRESETS, RESULT_DISCLAIMER, derivedDefaults } from '../../src/style/questionnaire';
import { getStyleProfile } from '../../src/db/repo';
import type { StyleAxis, StyleProfile } from '../../src/db/types';

export default function StyleResult() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const [profile, setProfile] = useState<StyleProfile | null>(null);

  useEffect(() => {
    if (childId) getStyleProfile(childId).then(setProfile);
  }, [childId]);

  if (!profile) return null;
  const name = profile.preset === 'custom' ? '自訂' : PRESETS[profile.preset].name;
  const defaults = derivedDefaults(profile.axes);

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.h1}>偏好：{name}</Text>
      <Text style={styles.p}>{RESULT_DISCLAIMER}</Text>

      <Text style={styles.sub}>六個向度</Text>
      {(Object.keys(AXES) as StyleAxis[]).map((axis) => {
        const v = profile.axes[axis];
        return (
          <View key={axis} style={styles.axis}>
            <View style={styles.axisRow}>
              <Text style={styles.axisEnd}>{AXES[axis].left}</Text>
              <Text style={styles.axisEnd}>{AXES[axis].right}</Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.dot, { left: `${((v + 2) / 4) * 100}%` }]} />
            </View>
            <Text style={styles.affects}>影響：{AXES[axis].affects}</Text>
          </View>
        );
      })}

      <Text style={styles.sub}>目前的預設</Text>
      <Text style={styles.p}>
        餵食提醒：{defaults.reminderMode === 'schedule' ? '排程提醒（0 到 6 個月仍以安全網為預設）' : '安全網提醒'}
      </Text>
      <Text style={styles.p}>理論層：{defaults.expandTheoryByDefault ? '預設展開' : '預設收合'}</Text>

      <Pressable style={styles.btn} onPress={() => router.replace('/')} accessibilityRole="button">
        <Text style={styles.btnText}>完成</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, gap: 12, paddingBottom: 48 },
  h1: { fontSize: 24, fontWeight: '700' },
  p: { fontSize: 16, lineHeight: 24 },
  sub: { fontSize: 14, fontWeight: '700', opacity: 0.7, marginTop: 12, letterSpacing: 1 },
  axis: { gap: 4 },
  axisRow: { flexDirection: 'row', justifyContent: 'space-between' },
  axisEnd: { fontSize: 13, opacity: 0.8 },
  track: { height: 6, borderRadius: 3, backgroundColor: '#ccc', position: 'relative', marginVertical: 4 },
  dot: { position: 'absolute', top: -5, width: 16, height: 16, marginLeft: -8, borderRadius: 8, backgroundColor: '#145a63' },
  affects: { fontSize: 12, opacity: 0.6 },
  btn: { marginTop: 20, paddingVertical: 16, borderRadius: 12, backgroundColor: '#145a63', alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 18, fontWeight: '600' },
});
