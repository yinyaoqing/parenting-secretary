// 標題列的孩子名字：多個孩子時可點開切換單；只有一個孩子時點了直接去新增。
import { View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from './useTheme';
import { useChildren } from './ChildContext';
import { Icon } from './components';

export function ChildTitle({ subtitle }: { subtitle?: string }) {
  const { styles, palette } = useTheme();
  const { children, active } = useChildren();
  if (!active) return null;
  const many = children.length > 1;
  return (
    <Pressable onPress={() => router.push(many ? '/child/switch' : '/onboarding/child')} accessibilityRole="button" accessibilityLabel={many ? `目前是 ${active.nickname}，點擊切換孩子` : `${active.nickname}，點擊新增孩子`} hitSlop={6}>
      <View style={[styles.row, { gap: 4 }]}>
        <Text style={styles.topTitle}>{active.nickname}</Text>
        <Icon name={many ? 'chevron-down' : 'plus'} size={many ? 20 : 16} color={many ? palette.ink : palette.ink3} />
      </View>
      {subtitle ? <Text style={styles.muted}>{subtitle}</Text> : null}
    </Pressable>
  );
}
