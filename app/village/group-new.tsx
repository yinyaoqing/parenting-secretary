import { useState } from 'react';
import { View, Text } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../../src/ui/useTheme';
import { useChildren } from '../../src/ui/ChildContext';
import { Screen, SheetHeader, Field, Input, Chip, PrimaryButton, Hint } from '../../src/ui/components';
import { createGroup } from '../../src/village/store';

const EXAMPLES = ['週三森林共學', '上學接送輪值', '三年二班家長', '週末親子共遊'];

// 建立鄰里小組（育村第二層）：小組名稱、我們家在小組裡的稱呼。建立後顯示加入碼給其他家庭掃。
export default function GroupNew() {
  const { styles } = useTheme();
  const { active } = useChildren();
  const [name, setName] = useState('');
  const [label, setLabel] = useState(active ? `${active.nickname}家` : '');
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    if (!name.trim()) return setErr('請寫小組名稱');
    if (!label.trim()) return setErr('請寫你們家在小組裡的稱呼');
    const g = await createGroup(name, label);
    router.replace({ pathname: '/village/group/[id]', params: { id: g.id, showJoin: '1' } });
  };

  return (
    <View style={styles.page}>
      <SheetHeader title="建立鄰里小組" subtitle="幾個家庭共用一張行程表" />
      <Screen footer={<PrimaryButton label="建立" onPress={save} />}>
        <Field label="小組名稱">
          <Input value={name} onChangeText={setName} placeholder="例如：週三森林共學" accessibilityLabel="小組名稱" />
          <View style={styles.chips}>{EXAMPLES.map((e) => <Chip key={e} sm label={e} on={name === e} onPress={() => setName(e)} />)}</View>
        </Field>
        <Field label="你們家在小組裡的稱呼" hint="其他家庭會看到這個稱呼，例如誰負責接送。">
          <Input value={label} onChangeText={setLabel} placeholder="例如：小米家" accessibilityLabel="我們家的稱呼" />
        </Field>
        <Hint>小組只交換行程（日期、時間、內容、誰負責、地點），不交換任何孩子的紀錄。行程用小組專屬的金鑰加密，只有掃過加入碼的家庭打得開。</Hint>
        {err ? <Text style={[styles.p, styles.danger]}>{err}</Text> : null}
      </Screen>
    </View>
  );
}
