import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { AXES, QUESTIONS, PRESETS, scoreAnswers, nearestPreset } from '../../src/style/questionnaire';
import { saveStyleProfile } from '../../src/db/repo';
import type { StyleAxis, StyleProfile } from '../../src/db/types';
import { useTheme } from '../../src/ui/useTheme';
import { Screen, TopBar, Progress, Opt, Badge, SafetyBox, PrimaryButton, GhostButton } from '../../src/ui/components';

const AXIS_NAME: Record<StyleAxis, string> = {
  routine: '作息結構',
  cry_response: '回應方式',
  sleep_arrangement: '睡眠安排',
  feeding_lead: '餵食主導',
  guidance: '引導方式',
  info_depth: '資訊深度',
};

// 問卷：先給三個預設，或逐題回答（一題一頁，可上一題，隨時改用預設）。
export default function StyleQuestionnaire() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const { styles, palette } = useTheme();
  const [phase, setPhase] = useState<'intro' | number>('intro');
  const [answers, setAnswers] = useState<Record<string, number>>({});

  const finish = async (preset?: Exclude<StyleProfile['preset'], 'custom'>) => {
    const axes = preset ? PRESETS[preset].axes : scoreAnswers(answers);
    const resolved = preset ?? nearestPreset(axes);
    if (childId) await saveStyleProfile(childId, resolved, axes);
    router.replace({ pathname: '/onboarding/result', params: { childId, preset: resolved } });
  };

  if (phase === 'intro') {
    return (
      <View style={styles.page}>
        <TopBar title="照顧風格" back />
        <Screen footer={<PrimaryButton label="逐題回答" onPress={() => setPhase(0)} />}>
          <Text style={[styles.body, { color: palette.ink2 }]}>12 題，約 90 秒。決定提醒的預設方式與內容排序，隨時可以改。</Text>
          <SafetyBox sub="安全睡眠、發燒、噎食等安全內容在任何風格下都會顯示，無法關閉。" />
          <Text style={[styles.label, { marginTop: 4 }]}>趕時間？直接選一個</Text>
          <View style={{ gap: 8 }}>
            {(Object.keys(PRESETS) as (keyof typeof PRESETS)[]).map((k) => (
              <Pressable key={k} style={styles.opt} onPress={() => finish(k)} accessibilityRole="button">
                <View style={styles.sp}>
                  <Text style={[styles.optText, { fontWeight: '700', fontSize: 18 }]}>{PRESETS[k].name}</Text>
                  <Text style={styles.muted}>{PRESETS[k].aka}</Text>
                </View>
              </Pressable>
            ))}
          </View>
          <Text style={styles.muted}>預設只是起點，每個向度之後都能微調。</Text>
        </Screen>
      </View>
    );
  }

  const i = phase;
  const q = QUESTIONS[i];
  const answered = typeof answers[q.id] === 'number';
  const last = i === QUESTIONS.length - 1;

  return (
    <View style={styles.page}>
      <TopBar back={() => (i === 0 ? setPhase('intro') : setPhase(i - 1))} right={
        <Pressable onPress={() => setPhase('intro')} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center' }}>
          <Text style={styles.sectionAction}>改用預設</Text>
        </Pressable>
      }>
        <Text style={styles.step}>第 {i + 1} 題，共 {QUESTIONS.length} 題</Text>
      </TopBar>
      <Screen footer={
        <View style={styles.grid}>
          <View style={{ flex: 1 }}><GhostButton label="上一題" onPress={() => (i === 0 ? setPhase('intro') : setPhase(i - 1))} /></View>
          <View style={{ flex: 1 }}><PrimaryButton label={last ? '完成' : '下一題'} disabled={!answered} onPress={() => (last ? finish() : setPhase(i + 1))} /></View>
        </View>
      }>
        <Progress pct={((i + 1) / QUESTIONS.length) * 100} />
        <Badge label={AXIS_NAME[q.axis]} tone="gray" />
        <Text style={[styles.h1, { fontSize: 24, lineHeight: 32 }]}>{q.text}</Text>
        <View style={{ gap: 8 }} accessibilityRole="radiogroup">
          {q.options.map((o) => (
            <Opt key={o.label} label={o.label} on={answers[q.id] === o.value} onPress={() => setAnswers((a) => ({ ...a, [q.id]: o.value }))} />
          ))}
        </View>
        <Text style={styles.muted}>沒有對錯。這題影響{AXES[q.axis].affects}。</Text>
      </Screen>
    </View>
  );
}
