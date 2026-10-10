import { useState } from 'react';
import { View, Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../src/ui/useTheme';
import { useChildren } from '../../src/ui/ChildContext';
import { Screen, SheetHeader, Field, Input, Card, PrimaryButton, GhostButton, Hint } from '../../src/ui/components';
import { joinGroup } from '../../src/village/store';
import { parseGroupJoin } from '../../src/village/model';

// 掃到小組加入碼後的確認頁：顯示小組名稱，填我們家在小組裡的稱呼，按加入才存。
export default function JoinGroup() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const { styles } = useTheme();
  const { active } = useChildren();
  const parsed = code ? parseGroupJoin(code) : null;
  const [label, setLabel] = useState(active ? `${active.nickname}家` : '');
  const [err, setErr] = useState<string | null>(null);

  if (!parsed) {
    return (
      <View style={styles.page}>
        <SheetHeader title="加入小組" />
        <Screen><Card><Text style={[styles.p, styles.danger]}>這不是育村的小組加入碼。</Text></Card></Screen>
      </View>
    );
  }

  const join = async () => {
    if (!label.trim()) return setErr('請寫你們家在小組裡的稱呼');
    const g = await joinGroup(parsed, label);
    router.replace({ pathname: '/village/group/[id]', params: { id: g.id } });
  };

  return (
    <View style={styles.page}>
      <SheetHeader title="加入鄰里小組" subtitle={parsed.name} />
      <Screen footer={<><PrimaryButton label="加入" onPress={join} /><GhostButton label="不要加入" onPress={() => router.back()} /></>}>
        <Field label="你們家在小組裡的稱呼" hint="其他家庭會看到這個稱呼。">
          <Input value={label} onChangeText={setLabel} placeholder="例如：小米家" accessibilityLabel="我們家的稱呼" />
        </Field>
        <Hint>加入後，請小組裡的其他家庭把最新的小組檔傳給你，行程就會出現。小組只交換行程，不交換孩子的紀錄。</Hint>
        {err ? <Text style={[styles.p, styles.danger]}>{err}</Text> : null}
      </Screen>
    </View>
  );
}
