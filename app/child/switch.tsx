import { View, Text } from 'react-native';
import { router } from 'expo-router';
import { useChildren } from '../../src/ui/ChildContext';
import { useTheme } from '../../src/ui/useTheme';
import { ageLabel, daysSince, correctedDays } from '../../src/util/age';
import { Screen, SheetHeader, ListCard, ListRow, Badge } from '../../src/ui/components';
import { Thumb } from '../../src/ui/art';

// 孩子切換單：每個孩子一列，最後一列新增。多胞胎各自獨立紀錄（規劃 5.23），第一版不做同時記錄。
export default function SwitchChild() {
  const { styles, palette } = useTheme();
  const { children, active, setActive } = useChildren();

  const sub = (birthDate: string, dueDate?: string) => {
    const d = daysSince(birthDate);
    const cd = correctedDays(birthDate, dueDate);
    return `${ageLabel(d)}${cd !== null ? ` · 矯正 ${ageLabel(cd)}` : ''}`;
  };

  return (
    <View style={styles.page}>
      <SheetHeader title="切換孩子" subtitle="紀錄、內容與時程都會換成這個孩子" />
      <Screen>
        <ListCard>
          {children.map((c, i) => (
            <ListRow
              key={c.id}
              first={i === 0}
              left={<Thumb art={daysSince(c.birthDate) >= 3 * 365 ? 'sprout' : 'rattle'} size={48} radius={12} />}
              main={c.nickname}
              sub={sub(c.birthDate, c.dueDate)}
              right={active?.id === c.id ? <Badge label="目前" /> : undefined}
              onPress={async () => { await setActive(c.id); router.back(); }}
            />
          ))}
          <ListRow first={children.length === 0} main="新增孩子" mainColor={palette.accent} icon="plus" onPress={() => { router.back(); router.push('/onboarding/child'); }} />
        </ListCard>
        <Text style={styles.muted}>每個孩子的紀錄、照顧風格與時程各自獨立。日夜模式、字級與暫停模式跟手機走。</Text>
      </Screen>
    </View>
  );
}
