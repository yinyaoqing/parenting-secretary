import { useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, Linking } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { allCards, GROUP_LABEL } from '../../src/content/loader';
import { search, EMERGENCY_TEXT } from '../../src/search';
import { useChildren } from '../../src/ui/ChildContext';
import { daysSince, correctedDays } from '../../src/util/age';
import { useTheme } from '../../src/ui/useTheme';
import { Screen, TopBar, Card, ListCard, ListRow, Badge, Chip, Icon } from '../../src/ui/components';

const EXAMPLES = ['吐奶', '拉肚子', '睡過夜', '副食品什麼時候', '長牙', '紅屁股', '戒尿布', '打疫苗前', '補助', '很累'];

// 問問看（規劃 4.8）：離線檢索官方內容卡。只回原文與來源，不生成、不判斷。危急字詞固定顯示 119。
export default function Search() {
  const { q: initial } = useLocalSearchParams<{ q?: string }>();
  const { styles, palette } = useTheme();
  const { active } = useChildren();
  const [q, setQ] = useState(initial ?? '');
  const age = active ? (correctedDays(active.birthDate, active.dueDate) ?? daysSince(active.birthDate)) : null;
  const docs = useMemo(() => allCards().map((c) => ({ id: c.id, title: c.title, body: c.body, topicGroup: c.topicGroup, ageMinDays: c.ageMinDays, ageMaxDays: c.ageMaxDays })), []);
  const result = useMemo(() => search(q, docs, age), [q, docs, age]);
  const typed = q.trim().length > 0;

  return (
    <View style={styles.page}>
      <TopBar back title="問問看" subtitle="只找官方內容的原文，不會替你判斷" />
      <Screen>
        <View style={[styles.pickrow, { gap: 8 }]}>
          <Icon name="search" size={20} color={palette.accent} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="例如：吐奶、睡過夜、補助"
            placeholderTextColor={palette.ink3}
            style={[styles.pickText, { paddingVertical: 10 }]}
            autoFocus={!initial}
            returnKeyType="search"
            accessibilityLabel="輸入想查的事"
            clearButtonMode="while-editing"
          />
          {q ? <Pressable onPress={() => setQ('')} accessibilityRole="button" accessibilityLabel="清除" hitSlop={8}><Icon name="x" size={18} color={palette.ink3} /></Pressable> : null}
        </View>

        {!typed ? (
          <>
            <Text style={styles.muted}>常見的問題，點一個開始：</Text>
            <View style={styles.chips}>{EXAMPLES.map((e) => <Chip key={e} sm label={e} onPress={() => setQ(e)} />)}</View>
            <Card><Text style={styles.muted}>這裡找得到 APP 裡全部的官方內容，不限孩子現在的月齡。答案都是國健署等機關的原文改寫，附來源；APP 不會回答「要不要就醫」。</Text></Card>
          </>
        ) : null}

        {typed && result.emergency ? (
          <Card style={{ borderColor: palette.danger, backgroundColor: palette.dangerSoft, gap: 8 }}>
            <View style={[styles.row, { gap: 8 }]}><Icon name="phone-call" size={20} color={palette.danger} /><Text style={[styles.p, { fontWeight: '700', color: palette.danger }]}>119</Text></View>
            <Text style={[styles.p, { fontSize: 15 }]}>{EMERGENCY_TEXT}</Text>
            <Pressable onPress={() => Linking.openURL('tel:119')} accessibilityRole="button" accessibilityLabel="撥打 119" style={[styles.chip, { alignSelf: 'flex-start', borderColor: palette.danger }]}><Text style={[styles.chipText, { color: palette.danger, fontWeight: '700' }]}>撥打 119</Text></Pressable>
          </Card>
        ) : null}

        {typed ? (
          <ListCard>
            {result.hits.length === 0 ? <ListRow first main="沒有找到。換個說法試試，例如用症狀或東西的名字。" mainColor={palette.ink3} /> : null}
            {result.hits.map((h, i) => (
              <ListRow key={h.id} first={i === 0} main={h.title} sub={h.snippet} right={<Badge label={GROUP_LABEL[h.topicGroup as keyof typeof GROUP_LABEL] ?? h.topicGroup} tone={h.inAge ? undefined : 'gray'} />} chevron
                onPress={() => router.push({ pathname: '/cards/[id]', params: { id: h.id } })} />
            ))}
          </ListCard>
        ) : null}
        {typed && result.hits.length ? <Text style={styles.muted}>灰色標籤表示不在孩子現在的月齡範圍。每張卡最下方有原文連結與查核日期。</Text> : null}
      </Screen>
    </View>
  );
}
