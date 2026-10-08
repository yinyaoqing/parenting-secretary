import { useCallback, useState } from 'react';
import { View, Text, Pressable, Share } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { getSetting, setSetting } from '../../src/db/repo';
import { useChildren } from '../../src/ui/ChildContext';
import { newId } from '../../src/db/index';
import { useTheme } from '../../src/ui/useTheme';
import { Screen, TopBar, Card, Input, PrimaryButton, ListCard, ListRow, Icon, GhostButton } from '../../src/ui/components';

interface Q { id: string; text: string; done: boolean; at: string }
const EXAMPLES = ['睡眠時間正常嗎？我們這樣作息可以嗎', '副食品吃很少怎麼辦', '什麼時候可以戒夜奶', '這次要打哪幾劑疫苗', '最近很常哭鬧'];

// 這次想問醫師的事（規劃 4.4 發展篩檢準備工具）：平常想到就記，健檢或回診時打開看。只存在這支手機。
export default function AskDoctor() {
  const { styles, palette } = useTheme();
  const { active } = useChildren();
  const [list, setList] = useState<Q[]>([]);
  const [text, setText] = useState('');
  const key = active ? `askDoctor:${active.id}` : null;

  const load = useCallback(() => {
    if (!key) return;
    getSetting(key).then((v) => { try { setList(v ? JSON.parse(v) : []); } catch { setList([]); } });
  }, [key]);
  useFocusEffect(load);

  const save = async (next: Q[]) => { setList(next); if (key) await setSetting(key, JSON.stringify(next)); };
  const add = async (t: string) => { const s = t.trim(); if (!s) return; await save([{ id: newId(), text: s, done: false, at: new Date().toISOString() }, ...list]); setText(''); };

  if (!active) return <View style={styles.page}><TopBar back title="想問醫師的事" /></View>;
  const open = list.filter((q) => !q.done);
  const done = list.filter((q) => q.done);

  return (
    <View style={styles.page}>
      <TopBar back title="想問醫師的事" subtitle={`${active.nickname} · 健檢或回診時打開`} />
      <Screen>
        <Card style={{ gap: 10 }}>
          <Input value={text} onChangeText={setText} placeholder="想到就記一句" onSubmitEditing={() => add(text)} returnKeyType="done" accessibilityLabel="想問醫師的事" />
          <PrimaryButton label="加進清單" icon="plus" onPress={() => add(text)} disabled={!text.trim()} />
          {list.length === 0 ? <Text style={styles.muted}>例如：{EXAMPLES.join('、')}。</Text> : null}
        </Card>

        <ListCard>
          {open.length === 0 ? <ListRow first main="清單是空的" mainColor={palette.ink3} /> : null}
          {open.map((q, i) => (
            <ListRow key={q.id} first={i === 0} main={q.text}
              left={<Pressable onPress={() => save(list.map((x) => (x.id === q.id ? { ...x, done: true } : x)))} accessibilityRole="checkbox" accessibilityState={{ checked: false }} accessibilityLabel={`問過了：${q.text}`} hitSlop={8}><Icon name="circle" size={22} color={palette.ink3} /></Pressable>}
              right={<Pressable onPress={() => save(list.filter((x) => x.id !== q.id))} accessibilityRole="button" accessibilityLabel={`刪除：${q.text}`} hitSlop={8}><Icon name="x" size={18} color={palette.ink3} /></Pressable>} />
          ))}
        </ListCard>

        {done.length ? (
          <>
            <Text style={styles.label}>問過了</Text>
            <ListCard>
              {done.map((q, i) => (
                <ListRow key={q.id} first={i === 0} main={q.text} mainColor={palette.ink3}
                  left={<Pressable onPress={() => save(list.map((x) => (x.id === q.id ? { ...x, done: false } : x)))} accessibilityRole="checkbox" accessibilityState={{ checked: true }} hitSlop={8}><Icon name="check-circle" size={22} color={palette.accent} /></Pressable>} />
              ))}
            </ListCard>
            <GhostButton small plain label="清掉問過的" onPress={() => save(open)} />
          </>
        ) : null}

        {open.length ? <GhostButton icon="share" label="傳給另一位照顧者" onPress={() => { void Share.share({ message: `${active.nickname} 這次想問醫師：\n${open.map((q) => `・${q.text}`).join('\n')}` }); }} /> : null}
        <Text style={styles.muted}>APP 不會回答這些問題，也不判斷要不要就醫。清單只存在這支手機。</Text>
      </Screen>
    </View>
  );
}
