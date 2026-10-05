import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { QUESTIONS, PRESETS, scoreAnswers, nearestPreset } from '../../src/style/questionnaire';
import { saveStyleProfile } from '../../src/db/repo';
import type { StyleProfile } from '../../src/db/types';

export default function StyleQuestionnaire() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const answered = QUESTIONS.filter((q) => typeof answers[q.id] === 'number').length;

  const finish = async (preset?: Exclude<StyleProfile['preset'], 'custom'>) => {
    const axes = preset ? PRESETS[preset].axes : scoreAnswers(answers);
    const resolved = preset ?? nearestPreset(axes);
    if (childId) await saveStyleProfile(childId, resolved, axes);
    router.replace({ pathname: '/onboarding/result', params: { childId, preset: resolved } });
  };

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.intro}>
        12 題，約 90 秒。這決定提醒的預設方式與內容的排序，隨時可以改。安全內容不受影響。
      </Text>

      <Text style={styles.sub}>趕時間？直接選一個預設</Text>
      <View style={styles.presets}>
        {(Object.keys(PRESETS) as (keyof typeof PRESETS)[]).map((k) => (
          <Pressable key={k} style={styles.preset} onPress={() => finish(k)} accessibilityRole="button">
            <Text style={styles.presetName}>{PRESETS[k].name}</Text>
            <Text style={styles.presetAka}>{PRESETS[k].aka}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.sub}>或逐題回答</Text>
      {QUESTIONS.map((q, i) => (
        <View key={q.id} style={styles.q}>
          <Text style={styles.qText}>
            {i + 1}. {q.text}
          </Text>
          <View style={styles.opts}>
            {q.options.map((o) => {
              const active = answers[q.id] === o.value;
              return (
                <Pressable
                  key={o.label}
                  style={[styles.opt, active && styles.optActive]}
                  onPress={() => setAnswers((a) => ({ ...a, [q.id]: o.value }))}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: active }}
                >
                  <Text style={[styles.optText, active && styles.optTextActive]}>{o.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}

      <Pressable
        style={[styles.btn, answered < QUESTIONS.length && styles.btnDisabled]}
        disabled={answered < QUESTIONS.length}
        onPress={() => finish()}
        accessibilityRole="button"
      >
        <Text style={styles.btnText}>
          完成（{answered}/{QUESTIONS.length}）
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, gap: 12, paddingBottom: 48 },
  intro: { fontSize: 16, lineHeight: 24 },
  sub: { fontSize: 14, fontWeight: '700', opacity: 0.7, marginTop: 12, letterSpacing: 1 },
  presets: { gap: 8 },
  preset: { padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#aaa' },
  presetName: { fontSize: 18, fontWeight: '700' },
  presetAka: { fontSize: 13, opacity: 0.7, marginTop: 2 },
  q: { gap: 8, marginTop: 8 },
  qText: { fontSize: 16, fontWeight: '600', lineHeight: 24 },
  opts: { gap: 6 },
  opt: { padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#bbb' },
  optActive: { backgroundColor: '#145a63', borderColor: '#145a63' },
  optText: { fontSize: 16 },
  optTextActive: { color: '#fff' },
  btn: { marginTop: 20, paddingVertical: 16, borderRadius: 12, backgroundColor: '#145a63', alignItems: 'center' },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#fff', fontSize: 18, fontWeight: '600' },
});
