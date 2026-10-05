import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { AXES, PRESETS, RESULT_DISCLAIMER, derivedDefaults } from '../../src/style/questionnaire';
import { getStyleProfile } from '../../src/db/repo';
import type { StyleAxis, StyleProfile } from '../../src/db/types';
import { useTheme } from '../../src/ui/useTheme';
import { Screen, TopBar, Card, Badge, ListCard, ListRow, PrimaryButton, GhostButton } from '../../src/ui/components';
import { SpotSprout } from '../../src/ui/art';

export default function StyleResult() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const { styles, palette } = useTheme();
  const [profile, setProfile] = useState<StyleProfile | null>(null);

  useEffect(() => { if (childId) getStyleProfile(childId).then(setProfile); }, [childId]);

  if (!profile) return <View style={styles.page} />;
  const name = profile.preset === 'custom' ? '自訂' : PRESETS[profile.preset].name;
  const defaults = derivedDefaults(profile.axes);

  return (
    <View style={styles.page}>
      <TopBar title="你的偏好" />
      <Screen footer={<><PrimaryButton label="完成" onPress={() => router.replace('/')} /><GhostButton label="重新作答" onPress={() => router.replace({ pathname: '/onboarding/style', params: { childId } })} /></>}>
        <View style={[styles.row, { gap: 12 }]}>
          <SpotSprout size={56} star />
          <Text style={styles.h1}>{name}</Text>
          <Badge label={profile.preset === 'custom' ? '自訂組合' : '接近預設'} />
        </View>
        <Text style={[styles.body, { color: palette.ink2, fontSize: 15, lineHeight: 24 }]}>{RESULT_DISCLAIMER}</Text>

        <Card style={{ gap: 18, paddingVertical: 16 }}>
          {(Object.keys(AXES) as StyleAxis[]).map((axis) => {
            const v = profile.axes[axis];
            return (
              <View key={axis} style={{ gap: 2 }} accessibilityLabel={`${AXES[axis].left} 到 ${AXES[axis].right}，位置 ${v + 3} 之 5`}>
                <View style={styles.axisEnds}>
                  <Text style={styles.axisEnd}>{AXES[axis].left}</Text>
                  <Text style={styles.axisEnd}>{AXES[axis].right}</Text>
                </View>
                <View style={styles.axisTrack}>
                  <View style={[styles.axisDot, { left: `${((v + 2) / 4) * 100}%` }]} />
                </View>
              </View>
            );
          })}
        </Card>

        <Text style={styles.h2}>目前的預設</Text>
        <ListCard>
          <ListRow first main="餵食提醒" sub="0 到 6 個月一律為安全網，不是時刻表" right={<Badge label={defaults.reminderMode === 'schedule' ? '排程（6 個月後）' : '安全網'} />} />
          <ListRow main="理論層" sub="內容卡第三層是否預設展開" right={<Badge label={defaults.expandTheoryByDefault ? '展開' : '收合'} tone="gray" />} />
          <ListRow main="影響範圍" sub="提醒預設、安撫與睡眠方法排序、副食品取向排序" />
        </ListCard>
      </Screen>
    </View>
  );
}
