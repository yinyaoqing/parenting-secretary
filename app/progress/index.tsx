import { useCallback, useState } from 'react';
import { View, Text, Linking, Pressable } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useChildren } from '../../src/ui/ChildContext';
import { useTheme } from '../../src/ui/useTheme';
import { Screen, TopBar, Card, Chip, ListCard, ListRow, Icon, SwitchRow } from '../../src/ui/components';
import { gradeFor, itemsFor, MARK_LABEL, type Mark } from '../../src/progress/select';
import { PROGRESS, readMarks, writeMark, progressEnabled, setProgressEnabled } from '../../src/progress/store';

const ADL_URL = 'https://adl.edu.tw/';
const MARKS: Mark[] = ['yes', 'not_yet', 'not_taught'];

// 體制內進度對照（規劃 v1.0 第 5.3 節）：教育部基本學習內容，家長自己勾；不計分、不算百分比。
export default function Progress() {
  const { styles, palette } = useTheme();
  const { active: child } = useChildren();
  const [grade, setGrade] = useState(1);
  const [marks, setMarks] = useState<Record<string, Mark>>({});
  const [enabled, setEnabled] = useState(true);

  useFocusEffect(useCallback(() => {
    if (!child) return;
    const g = gradeFor(child.birthDate, new Date());
    setGrade(g >= 1 && g <= 6 ? g : 1);
    readMarks(child.id).then(setMarks);
    progressEnabled().then(setEnabled);
  }, [child]));

  if (!child) return null;
  const groups = itemsFor(PROGRESS, grade);
  const mark = async (id: string, m: Mark) => setMarks(await writeMark(child.id, id, marks[id] === m ? null : m));

  return (
    <View style={styles.page}>
      <TopBar back title="進度對照" subtitle="體制內同年級的進度，供銜接參考" />
      <Screen>
        <Card style={{ gap: 6 }}>
          <Text style={styles.muted}>這是教育部定義的國小各年級「基本學習內容」，也就是體制內學生至少要會的部分，不是常模。你們的進度可以和學校不同；勾選只存在這支手機，不計分。</Text>
          <Pressable onPress={() => Linking.openURL(ADL_URL)} accessibilityRole="link" style={[styles.row, { gap: 6 }]}>
            <Text style={[styles.link, styles.sp]}>想知道實際程度：教育部因材網的免費診斷（自學生可經設籍學校申請帳號）</Text>
            <Icon name="external-link" size={14} color={palette.accent} />
          </Pressable>
        </Card>
        <View style={styles.chips}>{[1, 2, 3, 4, 5, 6].map((g) => <Chip key={g} sm label={`${g} 年級`} on={grade === g} onPress={() => setGrade(g)} />)}</View>
        {Object.keys(groups).length === 0 ? <Text style={styles.muted}>這個年級的內容還沒放進來。</Text> : null}
        {Object.entries(groups).map(([subject, list]) => (
          <View key={subject} style={{ gap: 8 }}>
            <Text style={styles.h2}>{subject}</Text>
            <ListCard>
              {list.map((it, i) => (
                <ListRow key={it.id} first={i === 0} main={it.text} sub={it.ref}>
                  <View style={[styles.chips, { marginTop: 6 }]}>{MARKS.map((m) => <Chip key={m} sm label={MARK_LABEL[m]} on={marks[it.id] === m} onPress={() => mark(it.id, m)} />)}</View>
                </ListRow>
              ))}
            </ListCard>
          </View>
        ))}
        <Card>
          <SwitchRow title="顯示進度對照" sub="關掉後時程分頁不再出現這個入口" value={enabled} onChange={async (v) => { setEnabled(v); await setProgressEnabled(v); if (!v) router.back(); }} />
        </Card>
        <Text style={styles.muted}>來源：{PROGRESS.source.name}（查核 {PROGRESS.checkedAt}）</Text>
      </Screen>
    </View>
  );
}
